/** Coupled GeorgiaTenna explorer: shared physics state, accessible controls and responsive maps. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/georgia-system-browser');
const results=[],errors=[],csp=[],external=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),page=await context.newPage();
await context.route('**/*',r=>{const u=new URL(r.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){external.push(u.href);return r.abort();}return r.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.gsCsp??=[]).push(e.effectiveDirective)));
page.on('pageerror',e=>errors.push(String(e)));
async function check(name,body){try{const detail=await body();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const state=()=>page.evaluate(()=>GeorgiaSystemExplorer.getState());
const reset=async()=>{await page.locator('[data-gs-reset]').click();await page.waitForFunction(()=>document.querySelector('[data-gs-preset]').value==='default');};
const range=async(id,value)=>{await page.locator(id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));};
const canvasHash=()=>page.locator('[data-gs-canvas]').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=29)h=Math.imul(h^d[i],16777619);return h>>>0;});
try{
 await mkdir(output,{recursive:true});
 await page.goto(new URL('/courses/gt/ece6390/project/',base).href);
 await page.waitForFunction(()=>window.GeorgiaSystemExplorer&&document.querySelector('#georgia-system').dataset.ready==='true');
 await check('One shared model initializes the system and respects reduced motion',async()=>{
  assert.equal(await page.locator('[data-gs-preset]').inputValue(),'default');
  assert.equal((await state()).stride,4);
  assert.equal(await page.locator('[data-gs-play]').innerText(),'Play waves');
  assert.equal(await page.locator('[data-gs-installed]').innerText(),'100');
  assert.match(await page.locator('[data-gs-output="powerDBW"]').innerText(),/75/);
  assert.match(await page.locator('.gs-score-model').textContent(),/Receive gain: 10 dBi/);
  assert.equal(await page.locator('figure').count(),8);
 });
 await check('Preset names match their geometry and edits become Custom',async()=>{
  await page.locator('[data-gs-preset]').selectOption('compact');
  await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.stride===1);
  const compact=await page.evaluate(()=>({score:GeorgiaSystemExplorer.result.score,spill:GeorgiaSystemExplorer.result.counts.outsideCovered}));
  await page.locator('[data-gs-preset]').selectOption('wide');
  await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.stride===12);
  const wide=await page.evaluate(()=>({score:GeorgiaSystemExplorer.result.score,spill:GeorgiaSystemExplorer.result.counts.outsideCovered}));
  assert.notEqual(wide.score,compact.score);assert.notEqual(wide.spill,compact.spill);
  await range('#gs-stride',13);await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.stride===13);
  assert.equal(await page.locator('[data-gs-preset]').inputValue(),'custom');
  await reset();return{compact,wide};
 });
 await check('Element phase and installation change the field, diagram and actual N',async()=>{
  const before=await canvasHash(),n=await page.evaluate(()=>GeorgiaSystemExplorer.result.counts.installed);
  await page.locator('[data-gs-element]').selectOption('r4c4');
  await range('#gs-element-phase',90);await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.phaseOffsets.r4c4===90);
  assert.equal(await page.locator('[data-gs-phase-output]').innerText(),'90°');assert.notEqual(await canvasHash(),before);
  await page.locator('[data-gs-remove]').click();await page.waitForFunction(n=>GeorgiaSystemExplorer.result.counts.installed===n-1,n);
  assert.equal(await page.locator('[data-gs-remove]').innerText(),'Install element');
  assert.ok(await page.evaluate(()=>Number.isFinite(GeorgiaSystemExplorer.result.score)&&GeorgiaSystemExplorer.result.W===1&&!GeorgiaSystemExplorer.result.eligibility.meetsBaseline),'99 installed feeds retain W = 1 and a numeric partial-credit score');
  await page.locator('[data-gs-remove]').click();await page.waitForFunction(n=>GeorgiaSystemExplorer.result.counts.installed===n,n);
  await reset();
 });
 await check('View and parameter tabs have keyboard selection and one active panel',async()=>{
  await page.locator('#gs-tab-system').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#gs-tab-array').getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>GeorgiaSystemExplorer.view),'array');
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>GeorgiaSystemExplorer.view),'georgia');
  assert.equal(await page.locator('#gs-visual-panel').getAttribute('aria-labelledby'),'gs-tab-georgia');
  await page.locator('#gs-controls-geometry').focus();await page.keyboard.press('End');
  assert.equal(await page.locator('#gs-panel-beam').isVisible(),true);assert.equal(await page.locator('#gs-panel-geometry').isVisible(),false);
  await page.locator('#gs-tab-system').click();await page.locator('#gs-controls-geometry').click();
 });
 await check('Power, satellite motion and electronic steering update model outputs',async()=>{
  const original=await page.evaluate(()=>GeorgiaSystemExplorer.result.probe.powerDBm);
  await range('#gs-power',80);await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.powerDBW===80);
  const raised=await page.evaluate(()=>GeorgiaSystemExplorer.result.probe.powerDBm);assert.ok(Math.abs(raised-original-5)<1e-8);
  await range('#gs-longitude',-95);await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.longitude===-95);
  assert.notEqual(await page.evaluate(()=>GeorgiaSystemExplorer.result.probe.rangeM),await page.evaluate(()=>GeorgiaSystemModel.evaluateSystem(GeorgiaSystemModel.DEFAULT_STATE).probe.rangeM));
  await page.locator('#gs-controls-beam').click();await page.locator('#gs-auto-steer').uncheck();await page.waitForFunction(()=>!GeorgiaSystemExplorer.result.state.autoSteer);
  await range('#gs-phase-x',60);await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.phaseX===60);
  assert.notEqual(await page.evaluate(()=>GeorgiaSystemExplorer.result.probe.powerDBm),raised);
  await page.locator('#gs-controls-geometry').click();await reset();
 });
 await check('Minimum-power fit covers all Georgia samples and stays consistent with the control',async()=>{
  assert.equal(await page.locator('[data-gs-fit]').isDisabled(),false);
  await page.locator('[data-gs-fit]').click();await page.waitForFunction(()=>document.querySelector('[data-gs-preset]').value==='custom');
  const r=await page.evaluate(()=>({state:GeorgiaSystemExplorer.getState(),counts:GeorgiaSystemExplorer.result.counts,input:Number(document.querySelector('#gs-power').value)}));
  assert.equal(r.counts.coveredGA,r.counts.ga);assert.ok(Math.abs(r.input-r.state.powerDBW)<.051);
  await page.evaluate(()=>GeorgiaSystemExplorer.setState({powerDBW:130}));
  assert.equal((await state()).powerDBW,110);assert.equal(await page.locator('#gs-power').inputValue(),'110');
  await reset();
 });
 await check('Coverage and received-power legends match the selected colors',async()=>{
  const before=await canvasHash();await page.locator('[data-gs-power-colors]').click();
  assert.equal(await page.locator('[data-gs-power-key]').isVisible(),true);
  assert.equal(await page.locator('[data-gs-coverage-key]').first().isVisible(),false);
  assert.notEqual(await canvasHash(),before);await page.locator('[data-gs-power-colors]').click();
 });
 await check('Georgia preserves geographic aspect and the controls fit narrow screens in both themes',async()=>{
  for(const scheme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:1100});
   for(const view of ['system','array','georgia']){
    await page.locator(`[data-gs-view="${view}"]`).click();
    await page.waitForFunction(()=>{const e=document.querySelector('#georgia-system');return Math.abs(Number(e.dataset.mapAspect)-Number(e.dataset.mapRenderedAspect))<1e-10;});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.ok(await page.locator('[data-gs-canvas]').evaluate(c=>c.width>0&&c.height>0));
    if(scheme==='light')await page.locator('#georgia-system').screenshot({path:path.join(output,`georgia-system-${view}-${width}.png`)});
   }
  }
 });
 await check('The coupled explorer retains local assets, CSP and accessible named controls',async()=>{
  assert.deepEqual(await page.locator('#georgia-system [style]').evaluateAll(es=>es.filter(e=>e.getAttribute('style')).map(e=>e.id)),[]);
  for(const input of await page.locator('#georgia-system input,#georgia-system select').all())assert.ok(await input.evaluate(e=>e.labels?.length>0),await input.getAttribute('id'));
  csp.push(...await page.evaluate(()=>window.gsCsp||[]));assert.deepEqual(errors,[]);assert.deepEqual(csp,[]);assert.deepEqual(external,[]);
 });
}finally{
 await browser.close();
 const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,csp,external};
 await writeFile(path.join(output,'georgia-system-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
}
