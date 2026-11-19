import assert from 'node:assert/strict';
globalThis.window=globalThis;
await import('../dist/assets/figure-utils.js');
await import('../src/figure-registry.js');
await import('../src/ece6390-timing-geometry-models.js');
const T=ECE6390TimingGeometry,models=T.models();
assert.equal(models.length,9);
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
    if(control.options)continue;
    const moved={...defaults,[control.id]:control.value===control.max?control.min:control.max};
    assert.notEqual(model.render(moved,CourseFigureU).svg,model.render(defaults,CourseFigureU).svg,model.id+':'+control.id+' changes the figure');
  }
}
// Independent anchors recomputed here rather than read from the model checks.
const scan=T.scan({lat:33.75,dlon:0,aim:0});
assert.ok(Math.abs(Math.asin(6378.137*Math.cos(scan.el*Math.PI/180)/42164.2)*180/Math.PI-scan.scan)<1e-9);
assert.ok(Math.abs(T.dish({fd:.4,q:1}).spill-Math.cos(2*Math.atan(1/1.6))**2)<1e-12);
assert.ok(Math.abs(T.tracking({spacing:1,alpha:.3,delay:.25,phase:0}).bias-.075/1.3)<1e-6);
assert.equal(T.carrier({offset:-1000,phase:0,rate:100,count:100}).first,13);
assert.ok(Math.abs(T.grating({n:8,spacing:.5,steer:60}).peaks[0].theta-60)<1e-9);
console.log(`PASS ECE 6390 timing and geometry: ${models.length} models, ${checks} checks, ${states} finite states, every control changes its figure`);
