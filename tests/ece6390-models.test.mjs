import assert from 'node:assert/strict';
globalThis.window=globalThis;
await import('../dist/assets/figure-utils.js');
await import('../src/figure-registry.js');
await import('../src/ece6390-models.js');
const models=CourseFigureRegistry;
assert.equal(models.length,10);
let states=0;
for(const model of models){
  assert.deepEqual((model.checks?.()||[]).filter(check=>!check.pass),[],model.id);
  const defaults=Object.fromEntries(model.controls.map(control=>[control.id,control.value]));
  const values=[defaults,...model.controls.flatMap(control=>(control.options?control.options.map(option=>option.value):[control.min,control.max]).map(value=>({...defaults,[control.id]:value})))];
  for(const value of values){
    const result=model.render(value,CourseFigureU);states++;
    assert.ok(result.svg.includes('<svg'),model.id);
    assert.ok(!/NaN|Infinity|undefined/.test(result.svg),model.id);
  }
}
const bpsk=models.find(model=>model.id==='ece-bpsk');
const probability=Number(bpsk.render({ebn:0,threshold:0,prior:.5},CourseFigureU).stats[0][1]);
assert.ok(Math.abs(probability-.0786496035251426)<1e-6);
const energy=models.find(model=>model.id==='ece-energy');
const joules=energy.render({power:0,rate:4,codeRate:.5,loading:2,noiseDensity:-200,bandwidth:2},CourseFigureU).stats;
assert.equal(Number(joules[0][1].split(' ')[0]),2.5e-7);
assert.equal(Number(joules[1][1].split(' ')[0]),1.25e-7);
console.log(`PASS ECE 6390 detection/coding: ${models.length} models, ${states} finite states, and independent probability/energy anchors`);
