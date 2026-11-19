import assert from 'node:assert/strict';
globalThis.window=globalThis;
await import('../dist/assets/figure-utils.js');
await import('../src/figure-registry.js');
await import('../src/ece6390-models.js');
await import('../src/ece6390-timing-geometry-models.js');
await import('../src/ece6390-signal-link-models.js');
const T=ECE6390SignalLink,models=T.models();
assert.equal(models.length,8);
let states=0,checks=0;
for(const model of models){
  const results=model.checks?.()||[];checks+=results.length;
  assert.deepEqual(results.filter(check=>!check.pass),[],model.id);
  const defaults=Object.fromEntries(model.controls.map(control=>[control.id,control.value]));
  const values=[defaults,...model.controls.flatMap(control=>(control.options?control.options.map(option=>option.value):[control.min,control.max]).map(value=>({...defaults,[control.id]:value})))];
  for(const value of values){
    const result=model.render(value,CourseFigureU);states++;
    assert.ok(result.svg.includes('<svg'),model.id);
    assert.ok(!/NaN|Infinity|undefined/.test(result.svg+JSON.stringify(result.stats)),model.id+' '+JSON.stringify(value));
    assert.ok(result.stats.length<=3&&result.equation&&result.note,model.id);
  }
  for(const control of model.controls){
    const target=control.options?control.options.find(option=>option.value!==control.value).value:control.value===control.max?control.min:control.max;
    assert.notEqual(model.render({...defaults,[control.id]:target},CourseFigureU).svg,model.render(defaults,CourseFigureU).svg,model.id+':'+control.id+' changes the figure');
  }
}
// Independent anchors recomputed here rather than read from the model checks.
const link=T.margin({eirp:40,diameter:1,tsys:290,rain:0,rate:4,required:10.5});
assert.ok(Math.abs(link.cn0-(40-20*Math.log10(4*Math.PI*37031e3*10e9/299792458)+10*Math.log10(.6*(Math.PI*1*10e9/299792458)**2)-10*Math.log10(1.380649e-23*290)))<1e-3);
assert.ok(Math.abs(T.codingGain({rate:.5,dmin:10,mult:36,target:6,mistake:0}).u-10.53)<.02);
assert.equal(T.differential({scheme:0,rotation:37,slip:0,count:4}).correct,4);
assert.ok(Math.abs(T.fftGrid({n:64,dt:.05,sigma:.25,pad:1}).df-.3125)<1e-12);
console.log(`PASS ECE 6390 signal and link: ${models.length} models, ${checks} checks, ${states} finite states, every control changes its figure`);
