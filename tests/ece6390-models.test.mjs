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
// Normal-frame lengths from ETSI EN 302 307, tables 5a and 11 and figure 13.
const normalFrames=[
  {mapped:32400,pilots:792,k:16008}, {mapped:32400,pilots:792,k:32208},
  {mapped:32400,pilots:792,k:48408}, {mapped:21600,pilots:504,k:48408},
  {mapped:16200,pilots:396,k:48408}, {mapped:12960,pilots:288,k:48408}
];
for(const [profile,reference] of normalFrames.entries()){
  for(const pilots of [0,1]){
    const result=ECE6390Teaching.frame({profile,bandwidth:6,rolloff:.25,pilots});
    const physicalSymbols=reference.mapped+90+pilots*reference.pilots;
    const framesPerSecond=4800000/physicalSymbols;
    assert.equal(result.full,physicalSymbols);
    assert.ok(Math.abs(result.codedRate-64800*framesPerSecond)<1e-7);
    assert.ok(Math.abs(result.information-(reference.k-80)*framesPerSecond)<1e-7);
    assert.equal(result.raw,4800000*(64800/reference.mapped));
    assert.ok(result.information<result.codedRate && result.codedRate<result.raw);
  }
}
const {syndrome,encode}=ECE6390Teaching;
const sent=encode([1,0,1]);
const applyFlips=positions=>sent.map((bit,index)=>bit^Number(positions.includes(index+1)));
assert.deepEqual(syndrome(applyFlips([6])),[0,0,1]);
assert.deepEqual(syndrome(applyFlips([1,4])),[0,0,1]);
console.log(`PASS ECE 6390 detection/coding: ${models.length} models, ${states} finite states, 12 DVB-S2 frame cases and independent probability, energy and syndrome anchors`);
