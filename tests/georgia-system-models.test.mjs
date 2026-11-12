/** Independent physical/numerical anchors for the coupled Georgia teaching model. */
import assert from 'node:assert/strict';
await import('../src/georgia-system-model.js');
const M=globalThis.GeorgiaSystemModel;
const near=(a,b,tol=1e-11)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} ~= ${b}`);
const wavelength=.01;
const one=[{x:0,y:0,phase:0,installed:true}];
near(M.normalization(one,wavelength),1);
near(M.directionGain(one,1,.2,-.3,.93,wavelength),2);
assert.equal(M.directionGain(one,1,0,0,-1,wavelength),0);
// Pair separated by λ/2: the angular cross term integrates to zero.
const pair=[{x:0,y:0,phase:0},{x:wavelength/2,y:0,phase:0}];
near(M.normalization(pair,wavelength),2);
near(M.directionGain(pair,2,0,0,1,wavelength),4);
near(M.fieldAt(pair,1,0,wavelength).power,0);
// Compare the analytic full-hemisphere normalization against independent
// equal-solid-angle midpoint integration for a nontrivial phased aperture.
const example=[{x:0,y:0,phase:.3},{x:.5*wavelength,y:0,phase:-.5},
 {x:0,y:wavelength,phase:1.1},{x:wavelength,y:wavelength,phase:2.2}];
let integral=0;
const nMu=100,nPhi=240;
for(let j=0;j<nMu;j++){
 const w=(j+.5)/nMu,s=Math.sqrt(1-w*w);
 for(let i=0;i<nPhi;i++){
  const phi=2*Math.PI*(i+.5)/nPhi;
  integral+=M.fieldAt(example,s*Math.cos(phi),s*Math.sin(phi),wavelength).power;
 }
}
integral*=2*Math.PI/(nMu*nPhi);
near(integral,2*Math.PI*M.normalization(example,wavelength),3e-4);
const translated=example.map(e=>({...e,x:e.x+.071,y:e.y-.024}));
near(M.normalization(translated,wavelength),M.normalization(example,wavelength));
near(M.fieldAt(translated,.12,-.18,wavelength).power,M.fieldAt(example,.12,-.18,wavelength).power);
const wrapped=example.map(e=>({...e,phase:e.phase+12*Math.PI}));
near(M.fieldAt(wrapped,.12,-.18,wavelength).power,M.fieldAt(example,.12,-.18,wavelength).power);
near(M.normalization(wrapped,wavelength),M.normalization(example,wavelength));
const frame=M.buildFrame([-.7,.6,-.2],13,-7,42);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
for(const key of ['x','y','normal'])near(Math.hypot(...frame[key]),1);
near(dot(frame.x,frame.y),0);near(dot(frame.x,frame.normal),0);near(dot(frame.y,frame.normal),0);
assert.equal(M.insideGeorgia(-84,33),true);
assert.equal(M.insideGeorgia(-88,33),false);
const score=M.scoreCounts(100,2,50);
near(score.score,1/(Math.sqrt(200)*250));
near(M.scoreCounts(99,0,1).score,1/Math.sqrt(199));
assert.equal(M.scoreCounts(1,2,50).W,1);
near(M.scoreCounts(1,2,50).score,1/(Math.sqrt(101)*250));
assert.equal(M.EARTH_RADIUS_M,6400000);assert.equal(M.GEO_RADIUS_M,42400000);
assert.equal(M.RECEIVE_GAIN_DBI,10);assert.equal(M.DEFAULT_STATE.powerDBW,75);
assert.equal(M.scoreCounts(100,0,0).scoreStatus,'unbounded-regional');
const compact=M.evaluateSystem(M.preset('compact'));
assert.equal(compact.counts.installed,100);
assert.equal(compact.map.cells.length,48*44);
assert.equal(compact.counts.coveredGA+compact.counts.missedGA,compact.counts.ga);
assert.equal(compact.counts.ga+compact.counts.outside,compact.cells.length);
near(compact.targetResult.field.power,10000);
const outputPower=M.fitPower(compact);
assert.ok(Number.isFinite(outputPower));
const fitted=M.evaluateSystem({...compact.state,powerDBW:outputPower});
assert.equal(fitted.counts.missedGA,0);
near(fitted.minGAPowerDBm,-79.95,1e-11);
const weaker=M.evaluateSystem({...fitted.state,powerDBW:fitted.state.powerDBW-6});
near(fitted.probe.powerDBm-weaker.probe.powerDBm,6);
assert.ok(weaker.counts.coveredGA<=fitted.counts.coveredGA);
assert.ok(weaker.counts.outsideCovered<=fitted.counts.outsideCovered);
const removed=M.evaluateSystem({...compact.state,removed:['r0c0']});
assert.equal(removed.counts.installed,99);assert.equal(removed.W,1);
assert.ok(removed.score>0);assert.equal(removed.eligibility.meetsBaseline,false);
const empty=M.evaluateSystem({...compact.state,removed:compact.elements.map(e=>e.id)});
assert.equal(empty.counts.installed,0);assert.equal(empty.normalizationQ,0);assert.equal(empty.score,0);
assert.equal(M.fitPower(empty),null);
const unfit=M.evaluateSystem({...compact.state,rows:20,columns:10,stride:30,phaseX:90});
assert.equal(M.fitPower(unfit),null);
assert.ok(empty.cells.every(c=>c.powerDBm===-300&&c.gainLinear===0&&!c.covered));
const moved=M.evaluateSystem({...compact.state,longitude:-100});
assert.ok(Math.abs(moved.probe.rangeM-compact.probe.rangeM)>100000);
const tilted=M.evaluateSystem({...compact.state,tiltX:10,steeringLat:32.7,steeringLon:-83.6});
near(tilted.targetResult.field.power,compact.targetResult.field.power);
// Electronic re-steering preserves coherent target addition while the physical
// aperture frame changes. Holding the feeds fixed would be a different case.
const fixedFeeds=M.evaluateSystem({...compact.state,tiltX:10,autoSteer:false});
assert.ok(fixedFeeds.targetResult.field.power<compact.targetResult.field.power/10);
const phase=M.evaluateSystem({...compact.state,phaseOffsets:{r0c0:180}});
near(phase.targetResult.field.power,98**2);
assert.equal(M.preset('thinned').removed.length,49);
assert.equal(M.evaluateSystem(M.preset('thinned')).counts.installed,147);
const invalid=M.evaluateSystem({rows:NaN,columns:Infinity,stride:0,powerDBW:NaN,phaseOffsets:{r0c0:NaN}});
assert.ok(invalid.cells.every(c=>Number.isFinite(c.powerDBm)&&Number.isFinite(c.gainLinear)));
assert.equal(M.evaluateSystem(null).counts.installed,100);
console.log('PASS coupled Georgia model: analytic hemisphere gain, numerical angular integral, geometry, phase invariants, power, eligibility and sampled score');
