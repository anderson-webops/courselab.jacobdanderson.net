/** Spatial views retain the numerical model and use an orthonormal camera. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const window={},context={window,document:{querySelector:()=>({})},console,URL,URLSearchParams};
vm.runInNewContext(readFileSync('dist/assets/figure-utils.js','utf8'),context);
vm.runInNewContext(readFileSync('dist/assets/course-lab.js','utf8'),context);
const {modules,U}=window.CourseLab,S=U.spatial;
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
const defaults=m=>Object.fromEntries(m.controls.map(c=>[c.id,c.value]));
const expected=['look-triangle','azimuth-components','solar-array','plane-wave','polarization','free-space-flux','dipole-pattern','circular-aperture','dish-gain','array-multiplication','planar-array','array-footprint','array-normalization','solid-angle','doppler-pass','navigation-frames','gnss-dop-3d'];
assert.deepEqual(Array.from(modules.filter(m=>m.spatial),m=>m.id).sort(),expected.sort());
for(const azimuth of [-180,-45,0,90,180])for(const elevation of [5,25,80]){
  const scene=S.scene(U,{viewAzimuth:azimuth,viewElevation:elevation},{center:[0,0],scale:1});
  for(const point of [[1,0,0],[0,1,0],[0,0,1],[.3,-.4,.7]]){
    const projected=scene.project(point);near(Math.hypot(...projected),Math.hypot(...point));
  }
  const vectors=[[1,0,0],[0,1,0],[0,0,1]].map(p=>scene.project(p));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)near(vectors[i].reduce((sum,x,k)=>sum+x*vectors[j][k],0),0);
}
for(const theta of [0,.5,Math.PI/2,Math.PI])for(const phi of [0,1,3])near(Math.hypot(...S.spherical(theta,phi)),1);
const dipole=modules.find(m=>m.id==='dipole-pattern'),dv=defaults(dipole);
near(dipole.spatialField(0,dv),0);near(dipole.spatialField(Math.PI/2,dv),1);
const circular=modules.find(m=>m.id==='circular-aperture'),cv=defaults(circular);
near(circular.spatialField(0,cv),1);
near(circular.spatialField(Math.asin(3.8317059702/(Math.PI*cv.diameter)),cv),0,1e-7);
const planar=modules.find(m=>m.id==='planar-array'),pv=defaults(planar);
near(planar.spatialPower(pv.u0,pv.v0,pv),1);
near(planar.spatialPower(pv.u0+2/pv.nx,pv.v0,pv),0);
const normalization=modules.find(m=>m.id==='array-normalization'),nv={...defaults(normalization),phase:0};
near(normalization.spatialPower(0,0,nv),1);
const footprint=modules.find(m=>m.id==='array-footprint'),fv=defaults(footprint);
near(footprint.spatialPower(0,0,fv),1);
for(const id of expected){
  const m=modules.find(m=>m.id===id),v=defaults(m),original=m.render(v,U);
  const rotated=m.render({...v,viewAzimuth:-120,viewElevation:75},U);
  assert.equal(JSON.stringify(rotated.stats),JSON.stringify(original.stats),id+' camera leaves numerical readouts unchanged');
  assert.equal(rotated.equation,original.equation,id+' camera leaves equations unchanged');
  assert.notEqual(rotated.svg,original.svg,id+' camera changes the spatial view');
  assert.ok(original.svg.includes('data-spatial="true"'),id+' has a spatial figure');
  assert.ok(!/NaN|undefined/.test(rotated.svg),id+' stays finite');
}
for(const id of ['phasor-interference','iq-constellation','matched-filter','gnss-geometry','helmholtz-curvature']){
  assert.equal(modules.find(m=>m.id===id).spatial,undefined,id+' retains its appropriate quantitative coordinate view');
}
for(const name of ['figure-registry.js','semiconductor-models.js','device-models.js','fermi-model.js','spatial-devices.js'])vm.runInNewContext(readFileSync('dist/assets/'+name,'utf8'),context);
const dos=window.CourseFigureRegistry.find(m=>m.id==='density-of-states');
for(const dimension of [1,2,3]){
  const values={...defaults(dos),dimension},a=dos.render(values,U),b=dos.render({...values,viewAzimuth:110,viewElevation:70},U);
  assert.equal(JSON.stringify(a.stats),JSON.stringify(b.stats));assert.equal(a.equation,b.equation);
  assert.ok(a.svg.includes('data-spatial="true"'));assert.notEqual(a.svg,b.svg);
  assert.ok(a.svg.includes(['','Wire','Sheet','Bulk'][dimension]));
}
console.log('PASS spatial models: orthonormal projection, shared antenna fields, coherent directions, 17 camera-invariant ECE models, physical DOS dimensions and retained abstract 2D views');
