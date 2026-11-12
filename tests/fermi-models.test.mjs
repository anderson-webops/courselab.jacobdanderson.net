import assert from 'node:assert/strict';
globalThis.window=globalThis;await import('../src/figure-registry.js');await import('../src/fermi-model.js');
const model=CourseFigureRegistry.find(x=>x.id==='fermi-occupation');assert.ok(model);
assert.deepEqual(model.checks().filter(x=>!x.pass),[]);
let series=[];const U={C:{b:'#b99',c:'#999',muted:'#666'},range:(n,fn)=>Array.from({length:n},(_,i)=>fn(i/(n-1))),plot:(s)=>{series=s;return'<svg></svg>';}};
const states=model.controls.flatMap(c=>[c.min,c.max].map(value=>({...Object.fromEntries(model.controls.map(x=>[x.id,x.value])),[c.id]:value})));
for(const v of states){const r=model.render(v,U);assert.equal(series[0].points.length,450);assert.ok(series[0].points.every(([E,f])=>Number.isFinite(E)&&f>=0&&f<=1));assert.ok(r.stats.every(x=>!String(x[1]).includes('NaN')));}
// Independent edge-probability anchor at EF = EC - 3 kBT.
const kB=8.617333262e-5,r=model.render({fermi:-3*kB*300,temperature:300},U);
assert.ok(Math.abs(Number(r.stats[0][1])-1/(1+Math.exp(3)))<.00001);
assert.equal(r.stats[1][1],'0.500');assert.equal(r.stats[2][1],'Bandgap or band edge');
console.log('PASS Fermi occupation: half occupancy, complement symmetry, energy/temperature trends, independent exponential anchor and finite control corners');
