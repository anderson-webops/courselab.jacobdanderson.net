/** Physical aperture depth, coordinate axes and phase-glyph separation. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||process.env.COURSELAB_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/project-spatial-browser');
const results=[],errors=[],violations=[],external=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),page=await context.newPage();
await context.route('**/*',route=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){external.push(u.href);return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.spatialCsp??=[]).push(e.effectiveDirective)));
page.on('pageerror',e=>errors.push(String(e)));
async function check(name,body){try{const detail=await body();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const capture=()=>page.evaluate(()=>{
 const canvas=document.querySelector('[data-gs-canvas]'),ctx=canvas.getContext('2d'),saved={},polygons=[],circles=[];let points=[];
 for(const name of ['beginPath','moveTo','lineTo','closePath','arc'])saved[name]=ctx[name];
 ctx.beginPath=function(...args){points=[];return saved.beginPath.apply(this,args);};
 for(const name of ['moveTo','lineTo'])ctx[name]=function(x,y){points.push([x,y]);return saved[name].call(this,x,y);};
 ctx.closePath=function(...args){if(points.length===4)polygons.push(points.map(p=>[...p]));return saved.closePath.apply(this,args);};
 ctx.arc=function(x,y,r,...args){circles.push([x,y,r]);return saved.arc.call(this,x,y,r,...args);};
 try{GeorgiaSystemExplorer.draw();}finally{for(const [name,fn]of Object.entries(saved))ctx[name]=fn;}
 return{polygons,circles,width:canvas.clientWidth,height:canvas.clientHeight};
});
try{
 await mkdir(output,{recursive:true});await page.goto(new URL('/courses/gt/ece6390/project/',base).href);await page.waitForFunction(()=>window.ProjectFigures&&window.GeorgiaSystemExplorer?.result);
 await check('Oblique aperture keeps25 physical sites,24 feeds and three labeled physical axes',async()=>{
  assert.equal(await page.locator('#project-elements [data-feed-site]').count(),25);
  assert.equal(await page.locator('#project-elements [data-installed="false"]').count(),1);
  assert.equal(await page.locator('#project-elements [data-phase-glyph="complex-plane"]').count(),24);
  assert.deepEqual(await page.locator('#project-elements [data-spatial-axis]').evaluateAll(es=>es.map(e=>e.dataset.spatialAxis).sort()),['xA','yA','zA']);
  const plane=await page.locator('#project-elements [data-aperture-plane] polygon').first().evaluate(e=>[...e.points].map(p=>[p.x,p.y]));
  const a=plane[1].map((v,i)=>v-plane[0][i]),b=plane[3].map((v,i)=>v-plane[0][i]);
  assert.ok(Math.abs(a[1])>10&&Math.abs(b[0])>10&&Math.abs(a[0]*b[1]-a[1]*b[0])>1000,'Both aperture dimensions have visible depth');
 });
 await check('Feed phase rotates a complex glyph while its physical site remains fixed',async()=>{
  const glyph=page.locator('#project-elements [data-feed-site="1,0"] [data-phase-glyph] line');
  const vector=()=>glyph.evaluate(e=>({start:[e.x1.baseVal.value,e.y1.baseVal.value],delta:[e.x2.baseVal.value-e.x1.baseVal.value,e.y2.baseVal.value-e.y1.baseVal.value]}));
  const initial=await vector();assert.match(await page.locator('#project-elements').textContent(),/576 \(relative field²\)/);
  await page.locator('#project-phase').evaluate(e=>{e.value='180';e.dispatchEvent(new Event('input',{bubbles:true}));});
  const opposite=await vector();assert.deepEqual(opposite.start,initial.start);assert.ok(Math.abs(initial.delta[0]+opposite.delta[0])<1e-4&&Math.abs(initial.delta[1]+opposite.delta[1])<1e-4);
  assert.match(await page.locator('#project-elements').textContent(),/16 \(relative field²\)/);
 });
 await check('Physical roll rotates the projected board and projected feeds remain selectable',async()=>{
  await page.locator('#gs-tab-array').click();const before=await capture();assert.ok(before.polygons.length>=6);
  const normal=await page.evaluate(()=>GeorgiaSystemExplorer.result.basis.normal);
  await page.locator('#gs-roll').evaluate(e=>{e.value='45';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.roll===45);
  const after=await capture();assert.notDeepEqual(after.polygons[0],before.polygons[0]);assert.deepEqual(await page.evaluate(()=>GeorgiaSystemExplorer.result.basis.normal),normal);
  assert.equal(await page.locator('[data-gs-installed]').textContent(),'100');
  const target=after.circles.find(([, ,r])=>r>=2.1&&r<=7),selected=await page.locator('#gs-element').inputValue();assert.ok(target);
  await page.locator('[data-gs-canvas]').click({position:{x:target[0],y:target[1]}});assert.notEqual(await page.locator('#gs-element').inputValue(),selected);
  await page.locator('#gs-preset').selectOption('optimal');await page.waitForFunction(()=>GeorgiaSystemExplorer.result.counts.installed===175);
  const sparse=await capture();assert.ok(sparse.circles.length>=175);assert.equal(await page.locator('#gs-element option').count(),175);
  for(const p of sparse.polygons.flat())assert.ok(p.every(Number.isFinite)&&p[0]>=0&&p[0]<=sparse.width&&p[1]>=0&&p[1]<=sparse.height);
 });
 await check('Spatial apertures stay readable on phones and desktops in both themes',async()=>{
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1100});await page.locator('#gs-tab-array').click();
   const picture=await capture();for(const p of picture.polygons.flat())assert.ok(p.every(Number.isFinite)&&p[0]>=0&&p[0]<=picture.width&&p[1]>=0&&p[1]<=picture.height);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(theme==='light')await page.locator('#georgia-system').screenshot({path:path.join(output,'aperture-'+width+'.png')});
  }
  violations.push(...await page.evaluate(()=>window.spatialCsp||[]));assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);assert.deepEqual(external,[]);
 });
}finally{
 await browser.close();const report={passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results,errors,violations,external};
 await writeFile(path.join(output,'project-spatial-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
}
