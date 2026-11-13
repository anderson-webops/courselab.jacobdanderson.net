/** Automatic feedback keeps its allocated document space across responsive states. */
import assert from 'node:assert/strict';
import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||process.env.COURSELAB_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/status-slots-browser');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[],csp=[],results=[];page.on('pageerror',e=>errors.push(String(e)));
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.statusSlotCsp??=[]).push(e.effectiveDirective)));
const geometry=selectors=>page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return[selector,{top:r.top+scrollY,height:r.height}];})),selectors);
const same=(a,b,label,metrics=['top','height'])=>{for(const key of Object.keys(a))for(const metric of metrics)assert.ok(Math.abs(a[key][metric]-b[key][metric])<.75,`${label}: ${key} ${metric} changed ${a[key][metric]} -> ${b[key][metric]}`);};
async function visit(route){await page.goto(new URL(route,base).href);await page.waitForFunction(()=>window.CourseStatusSlots);}
async function check(name,body){try{const detail=await body();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
try{
 await mkdir(output,{recursive:true});
 await check('Solar import, control and relative-result feedback keeps its reserved space',async()=>{
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});
   await visit('/courses/gt/ece6390/solar/?theta=0&phi=0&from=orbit');
   const selectors=['#solar-acceleration-app','#solar-acceleration-app .views','#solar-acceleration-app .results'];
   const before=await geometry(selectors);await page.locator('#reset').click();same(before,await geometry(selectors),theme+width+' reset');
   await page.locator('#theta-number').fill('');await page.locator('#theta-number').dispatchEvent('change');
   assert.match(await page.locator('#control-feedback').textContent(),/previous value/);same(before,await geometry(selectors),theme+width+' invalid input');
   await page.locator('#theta-number').fill('-180');await page.locator('#theta-number').dispatchEvent('change');
   await page.locator('#phi-number').fill('180');await page.locator('#phi-number').dispatchEvent('change');
   assert.match(await page.locator('#relative-note').textContent(),/360° is equivalent to 0°/);same(before,await geometry(selectors),theme+width+' wrapped angle');
   assert.equal(await page.locator('.course-status-slot [style]').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   csp.push(...await page.evaluate(()=>window.statusSlotCsp||[]));
  }
 });
 await check('Orbit force feedback and the alert frame preserve downstream positions',async()=>{
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});await visit('/courses/gt/ece6390/orbit/');
   await page.locator('#ol-solar').check();await page.waitForFunction(()=>document.querySelector('#sun-force-note').textContent.startsWith('Solar pressure:'));
   const selectors=['#sun-view','#sun-view .sun-caption'];const before=await geometry(selectors);
   await page.locator('#ol-solar').uncheck();assert.match(await page.locator('#sun-force-note').textContent(),/Solar pressure off/);same(before,await geometry(selectors),theme+width+' solar off');
   await page.locator('#ol-solar').check();same(before,await geometry(selectors),theme+width+' solar on');
   const alertFrame=await geometry(['[data-status-slot="orbit-error"]']);
   await page.evaluate(()=>{const e=document.querySelector('#ol-error');e.textContent='Invalid teaching orbit. Choose another setting.';e.hidden=false;});
   assert.equal(await page.locator('#ol-error').isVisible(),true);same(alertFrame,await geometry(['[data-status-slot="orbit-error"]']),theme+width+' alert visible');
   await page.evaluate(()=>{document.querySelector('#ol-error').hidden=true;});same(alertFrame,await geometry(['[data-status-slot="orbit-error"]']),theme+width+' alert hidden');
   assert.equal(await page.locator('#ol-error').getAttribute('role'),'alert');
   csp.push(...await page.evaluate(()=>window.statusSlotCsp||[]));
  }
 });
 await check('Georgia empty and partial-credit messages occupy one stable frame',async()=>{
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});await visit('/courses/gt/ece6390/project/');
   await page.waitForFunction(()=>window.GeorgiaSystemExplorer?.result);await page.locator('[data-gs-reset]').click();
   await page.waitForFunction(()=>GeorgiaSystemExplorer.result.counts.installed===100);
   const following=['.gs-experiment','.gs-element-editor'],before=await geometry(following),frame=await geometry(['[data-status-slot="georgia"]']);await page.locator('[data-gs-remove]').click();
   await page.waitForFunction(()=>GeorgiaSystemExplorer.result.counts.installed===99);assert.match(await page.locator('[data-gs-status]').textContent(),/100-element baseline/);
   same(before,await geometry(following),theme+width+' baseline message',['top']);same(frame,await geometry(['[data-status-slot="georgia"]']),theme+width+' visible status frame');
   await page.locator('[data-gs-reset]').click();await page.waitForFunction(()=>GeorgiaSystemExplorer.result.counts.installed===100);
   same(before,await geometry(following),theme+width+' cleared message',['top']);same(frame,await geometry(['[data-status-slot="georgia"]']),theme+width+' empty status frame');
   assert.equal(await page.locator('[data-gs-status]').getAttribute('role'),'status');
   csp.push(...await page.evaluate(()=>window.statusSlotCsp||[]));
  }
 });
 await check('Progress operation feedback retains space and invisible samples stay out of accessibility',async()=>{
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});await visit('/progress/');
   const before=await geometry(['[data-status-slot="progress"]']);
   await page.locator('#import-progress').setInputFiles({name:'other.json',mimeType:'application/json',buffer:Buffer.from('{"format":"other"}')});
   await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('Choose a Course Lab'));
   same(before,await geometry(['[data-status-slot="progress"]']),theme+width+' import error');
   await page.locator('#import-progress').setInputFiles({name:'empty.json',mimeType:'application/json',buffer:Buffer.from('{"format":"courselab-progress","version":1,"entries":{}}')});
   await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.startsWith('0 entries imported'));
   same(before,await geometry(['[data-status-slot="progress"]']),theme+width+' imported');
   const pending=page.waitForEvent('download');await page.locator('#export-progress').click();const download=await pending;await download.cancel();
   await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('saved entries exported'));
   same(before,await geometry(['[data-status-slot="progress"]']),theme+width+' exported');
   const ghosts=await page.locator('.course-status-slot__measure').evaluateAll(es=>es.every(e=>e.getAttribute('aria-hidden')==='true'&&e.inert&&getComputedStyle(e).visibility==='hidden'));
   assert.equal(ghosts,true);assert.equal(await page.locator('#progress-status').getAttribute('role'),'status');
   csp.push(...await page.evaluate(()=>window.statusSlotCsp||[]));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(csp,[]);
 });
}finally{
 await browser.close();const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,csp};
 await writeFile(path.join(output,'status-slots-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
}
