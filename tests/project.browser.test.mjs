/** Project figures: shared course physics plus explicit schematic geometry/masks. */
import assert from 'node:assert/strict';
import{createRequire}from'node:module';
import{mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||'http://127.0.0.1:4178'),output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/project-browser');
const results=[],errors=[],csp=[],external=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
await context.route('**/*',r=>{const u=new URL(r.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){external.push(u.href);return r.abort();}return r.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.projectCsp??=[]).push(e.effectiveDirective)));
page.on('pageerror',e=>errors.push(String(e)));
async function check(name,body){try{const detail=await body();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
try{
 await mkdir(output,{recursive:true});
 await page.goto(new URL('/courses/gt/ece6390/project/',base).href);await page.waitForFunction(()=>window.ProjectFigures);
 await check('Eight project figures connect task, feeds, geometry, normalization, transmission and judging',async()=>{
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('figure').count(),8);
  const captions=await page.locator('figcaption').allTextContents();captions.forEach((c,i)=>assert.ok(c.startsWith('Fig. '+(i+1)+'.')||c.startsWith('Fig. '+(i+1)+' shows'),c));
  assert.ok(await page.locator('#project-overview').innerText().then(t=>t.includes('assignment’s score')));
  assert.equal(await page.locator('[style]').count(),0);assert.equal(await page.locator('[data-project-module]').count(),4);
 });
 await check('Each project control changes its corresponding numerical figure',async()=>{
  let count=0;
  for(const input of await page.locator('#project-overview input[type=range],#project-overview select').all()){
   const before=await page.locator('#project-overview').innerHTML();
   if(await input.evaluate(e=>e.tagName==='SELECT'))await input.selectOption('nadir');
   else await input.evaluate(e=>{e.value=Number(e.value)===Number(e.max)?e.min:e.max;e.dispatchEvent(new Event('input',{bubbles:true}));});
   assert.notEqual(await page.locator('#project-overview').innerHTML(),before,await input.getAttribute('id'));count++;
  }
  return{controls:count};
 });
 await check('Geometry obeys array-normal and ground-look-angle invariants',async()=>{
  const r=await page.evaluate(()=>{ProjectFigures.state.normal='target';const target=ProjectFigures.geometry();ProjectFigures.state.normal='nadir';const nadir=ProjectFigures.geometry();return{target,nadir};});
  assert.ok(Math.abs(r.target.scan)<1e-5);assert.ok(r.nadir.scan>0);assert.ok(Math.abs(r.target.elevation-r.nadir.elevation)<1e-9);assert.equal(r.target.range,r.nadir.range);
  assert.ok(r.target.range>30000&&r.target.range<45000);
 });
 await check('Coverage classifies a separate schematic and preserves the miss-spill tradeoff',async()=>{
  const r=await page.evaluate(()=>{ProjectFigures.state.peak=-72;ProjectFigures.state.beamwidth=.5;const narrow=ProjectFigures.coverage();ProjectFigures.state.beamwidth=4;const wide=ProjectFigures.coverage();return{narrow,wide};});
  assert.ok(r.wide.miss<r.narrow.miss);assert.ok(r.wide.spill>r.narrow.spill);assert.equal(r.wide.covered+r.wide.miss,r.narrow.covered+r.narrow.miss);
 });
 await check('Project diagrams have finite geometry and labels inside their view boxes',async()=>{
  await page.reload();await page.waitForFunction(()=>window.ProjectFigures);
  assert.doesNotMatch(await page.locator('#project-overview').innerHTML(),/NaN|Infinity/);
  const outside=await page.locator('svg').evaluateAll(svgs=>svgs.flatMap(svg=>{const vb=svg.viewBox.baseVal;return[...svg.querySelectorAll('text')].filter(e=>{const b=e.getBBox(),m=svg.getCTM().inverse().multiply(e.getCTM());return[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return p.x<-.5||p.y<-.5||p.x>vb.width+.5||p.y>vb.height+.5;});}).map(e=>e.textContent);}));
  assert.deepEqual(outside,[]);
 });
 await check('Project page remains usable on phones and in both themes',async()=>{
  for(const scheme of['light','dark'])for(const width of[320,390,1440]){
   await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:1100});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(scheme==='light')await page.screenshot({path:path.join(output,`project-${width}.png`),fullPage:true});
  }
 });
 await check('Project practice is attempt-first and no browser dependencies leave the site',async()=>{
  assert.equal(await page.locator('[data-practice]').count(),2);assert.equal(await page.locator('[data-compare]').first().isDisabled(),true);
  await page.locator('textarea').first().fill('The ground ray and range stay fixed; the local array coordinates rotate.');await page.locator('[data-compare]').first().click();assert.ok(await page.locator('.practice-answer').first().isVisible());
  csp.push(...await page.evaluate(()=>window.projectCsp||[]));assert.deepEqual(errors,[]);assert.deepEqual(csp,[]);assert.deepEqual(external,[]);
 });
}finally{await browser.close();const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,csp,external};await writeFile(path.join(output,'project-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
