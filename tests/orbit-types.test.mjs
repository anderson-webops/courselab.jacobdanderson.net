/** Independent two-body, rotation and map-seam invariants; no browser or dependencies. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const context={modules:[]};
vm.runInNewContext(await readFile(new URL('../src/orbit-types.js',import.meta.url),'utf8'),context);
const P=context.OrbitTypesPhysics,{MU,EARTH,DAY}=P;
const close=(a,b,rel=1e-10)=>assert.ok(Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≠ ${b}`);
const norm=a=>Math.hypot(...a),dot=(a,b)=>a.reduce((s,x,j)=>s+x*b[j],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const wrap=x=>((x+180)%360+360)%360-180;
const el=(j,node=-85,apsis=0)=>P.elements({preset:j,node,apsis});
const checks=[];
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);}

check('Preset set contains the ten requested bound Earth-orbit families',()=>{
 assert.equal(P.presets.length,10);assert.equal(context.modules.length,1);assert.equal(context.modules[0].id,'orbit-types');
 for(const p of P.presets){assert.ok(p.e>=0&&p.e<1);assert.ok(p.i>=0&&p.i<=180);assert.ok(p.a*(1-p.e)>EARTH);}
});
check('Kepler solver retains residual accuracy over negative and multiple turns',()=>{
 for(const e of [0,.2,.3,.72,.95])for(const M of [-15,-Math.PI,-.001,0,.2,Math.PI,12,30]){const E=P.eccentricAnomaly(M,e);close(E-e*Math.sin(E),M,2e-12);}
});
check('Every preset conserves specific energy and vector angular momentum',()=>{
 for(let j=0;j<P.presets.length;j++){
  const e=el(j,37,25),expectedEnergy=-MU/(2*e.a),expectedH=Math.sqrt(MU*e.a*(1-e.e*e.e));let h0;
  for(const f of [0,.013,.17,.25,.5,.79,1,1.8]){
   const s=P.state(e,f*e.T),h=cross(s.xyz,s.velocity);close(dot(s.velocity,s.velocity)/2-MU/norm(s.xyz),expectedEnergy);close(norm(h),expectedH);
   if(!h0)h0=h;else h.forEach((x,k)=>close(x,h0[k],2e-10));
   close(norm(s.ecef),norm(s.xyz));close(s.altitude,norm(s.xyz)-EARTH);
  }
 }
});
check('Perigee and apogee obey radius, vis-viva and tangential-speed ratios',()=>{
 const e=el(9),p=P.state(e,0),a=P.state(e,e.T/2);
 close(p.r,e.a*(1-e.e));close(a.r,e.a*(1+e.e));close(p.speed,Math.sqrt(MU*(2/p.r-1/e.a)));close(a.speed/p.speed,p.r/a.r);
 close(dot(p.xyz,p.velocity),0,1e-8);close(dot(a.xyz,a.velocity),0,1e-8);
});
check('GEO holds fixed latitude and longitude through Earth rotation',()=>{
 const e=el(0,-85);
 for(const f of [0,.1,.25,.5,.9,1,1.8]){const q=P.state(e,f*DAY);close(q.latitude,0);close(wrap(q.longitude+85),0,1e-9);close(q.altitude,e.a-EARTH);}
});
check('Circular 500 km LEO has the expected independent period scale',()=>{
 const e=el(4);close(e.a,EARTH+500);assert.ok(e.T/60>94.5&&e.T/60<94.8);close(e.T,2*Math.PI*Math.sqrt((EARTH+500)**3/MU));
});
check('GSO and Tundra repeat after one sidereal day; Molniya after two revolutions',()=>{
 for(const j of [1,2,3,8,9]){
  const e=el(j,12),t=.217*e.T,a=P.state(e,t),b=P.state(e,t+DAY);close(a.latitude,b.latitude,1e-8);close(wrap(a.longitude-b.longitude),0,1e-8);
 }
 const e=el(9),a=P.state(e,e.T/2),b=P.state(e,1.5*e.T);close(Math.abs(wrap(a.longitude-b.longitude)),180,1e-9);
});
check('Inclination controls latitude extrema and prograde/retrograde angular momentum',()=>{
 for(const inclination of [0,30,90,120,180]){
  const e={...el(4),i:inclination,w:0},q=P.state(e,e.T/4),expected=Math.min(inclination,180-inclination);close(q.latitude,expected,1e-8);
  const h=cross(q.xyz,q.velocity);close(h[2]/norm(h),Math.cos(inclination*Math.PI/180));
  if(inclination===90)assert.equal(q.longitudeDefined,false);
 }
});
check('Argument-of-perigee rotation changes hemisphere without changing dwell physics',()=>{
 const n=el(9,0,0),s=el(9,0,180),a=P.state(n,n.T/2),b=P.state(s,s.T/2);close(a.latitude,-b.latitude);assert.ok(a.latitude>63&&b.latitude<-63);close(a.speed,b.speed);close(a.r,b.r);
 const eq=el(9,0,90);close(P.state(eq,eq.T/2).latitude,0,1e-8);
});
check('Earth-fixed longitude uses east-positive longitude minus Earth rotation',()=>{
 const e={...el(4),i:0,node:0,w:0},t=e.T/4,q=P.state(e,t);close(wrap(q.longitude-(90-360*t/DAY)),0,1e-9);
});
check('Map seams split paths instead of drawing an antimeridian jump',()=>{
 const parts=P.splitTrack([[170,10],[179,12],[-179,13],[-170,14]]);assert.equal(parts.length,2);
 for(let j=0;j<10;j++)for(const segment of P.splitTrack(P.track(el(j),0,2*el(j).T)))for(let k=1;k<segment.length;k++)assert.ok(Math.abs(segment[k][0]-segment[k-1][0])<=180);
});
check('Polar crossings split the map instead of suggesting travel along the pole edge',()=>{
 const parts=P.splitTrack([[0,88],[0,89],[0,90],[180,89],[180,88]]);assert.equal(parts.length,2);
 for(const part of parts)assert.ok(part.every(q=>Math.abs(q[1])<90));
});
check('Elapsed polar trails split a pole crossing between samples',()=>{
 for(const progress of [26,74,76,99,126])for(const node of [-180,-85,0,180])for(const apsis of [0,5,90,180,270]){
  const e=el(5,node,apsis),count=Math.max(2,Math.ceil(560*progress/200));
  for(const part of P.splitTrack(P.track(e,0,progress/100*e.T,count)))for(let j=1;j<part.length;j++){
   const a=part[j-1],b=part[j];
   if(a[1]*b[1]>0&&Math.min(Math.abs(a[1]),Math.abs(b[1]))>85)assert.ok(Math.abs(a[0]-b[0])<=90,`${progress}% pole chord: ${a} to ${b}`);
  }
 }
});
check('Smooth high-latitude tracks retain their ordinary map segments',()=>{
 const points=[[0,86],[30,87],[45,88]],parts=P.splitTrack(points);
 assert.equal(parts.length,1);assert.equal(parts[0].length,points.length);
});
check('Uniform elapsed-time sampling yields slower traversal close to apogee',()=>{
 const e=el(9),dt=e.T/1000,p=P.state(e,0),p1=P.state(e,dt),a=P.state(e,e.T/2),a1=P.state(e,e.T/2+dt);
 assert.ok(norm(a1.xyz.map((x,k)=>x-a.xyz[k]))<norm(p1.xyz.map((x,k)=>x-p.xyz[k]))/4);
});
console.log(JSON.stringify({status:'PASS',checks:checks.length,presets:P.presets.length}));
