/** Contextual project explanations, saved reference controls and stable feedback geometry. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||process.env.COURSELAB_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/project-help-browser');
const results=[],errors=[],csp=[],external=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
page.setDefaultTimeout(4000);
await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==base.origin){external.push(url.href);return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',event=>(window.projectHelpCsp??=[]).push(event.effectiveDirective)));
page.on('pageerror',error=>errors.push(String(error)));
const panel=page.locator('#project-help-panel');
const help=key=>page.locator(`.project-help-button[data-help-key=${JSON.stringify(key)}]`).first();
const settings=()=>page.evaluate(()=>({model:GeorgiaSystemExplorer.getState(),controls:[...document.querySelectorAll('#project-overview input,#project-overview select')].map(e=>({id:e.id,value:e.value,checked:e.checked,disabled:e.disabled}))}));
const geometry=selectors=>page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return[selector,{top:r.top+scrollY,height:r.height}];})),selectors);
const sameGeometry=(before,after,label)=>{for(const selector of Object.keys(before))for(const metric of ['top','height'])assert.ok(Math.abs(before[selector][metric]-after[selector][metric])<.75,`${label}: ${selector} ${metric} changed ${before[selector][metric]} -> ${after[selector][metric]}`);};
const stableSelectors=['#georgia-system','.gs-experiment','.gs-element-editor','#mission','#phase'];
async function visit(){await page.goto(new URL('/courses/gt/ece6390/project/',base).href);await page.waitForFunction(()=>window.ProjectControlHelp&&window.GeorgiaSystemExplorer?.result&&document.querySelector('#project-overview').dataset.helpReady==='true');}
async function opened(){await panel.waitFor({state:'visible'});}
async function closed(){await panel.waitFor({state:'hidden'});}
async function check(name,body){try{const detail=await body();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function fits(label){const box=await panel.boundingBox(),viewport=page.viewportSize();assert.ok(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,`${label}: explanation outside viewport ${JSON.stringify({box,viewport})}`);assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),label+': explanation text overflows horizontally');}
try{
 await mkdir(output,{recursive:true});await visit();
 await check('Technical controls retain contextual help while routine actions stay uncluttered',async()=>{
  const audit=await page.evaluate(()=>{
   const buttons=[...document.querySelectorAll('#project-overview .project-help-button')];
   const selectors=Object.keys(GeorgiaHelp).filter(key=>key.startsWith('['));
   const controls=[...document.querySelectorAll('#project-overview input,#project-overview select,#project-overview button:not(.project-help-button)')].filter(control=>GeorgiaHelp[control.id]||selectors.some(selector=>control.matches(selector)));
   const missing=controls.filter(control=>{
    const wrapper=control.closest('.project-help-control,.project-help-action')||control.labels?.[0]?.closest('.project-help-label-row');
    return !wrapper||![...wrapper.querySelectorAll('.project-help-button')].some(button=>button.dataset.helpKey===control.id||(button.dataset.helpKey.startsWith('[')&&control.matches(button.dataset.helpKey)));
   }).map(control=>control.id||control.outerHTML.slice(0,100));
   return{count:buttons.length,reported:ProjectControlHelp.count,missing,invalid:buttons.filter(button=>button.type!=='button'||!button.getAttribute('aria-label')?.startsWith('About ')||button.getAttribute('aria-controls')!=='project-help-panel'||button.getAttribute('aria-haspopup')!=='dialog'||!GeorgiaHelp[button.dataset.helpKey]).map(button=>button.dataset.helpKey),readouts:['phasor','feed-phase','fom','spill'].filter(key=>!buttons.some(button=>button.dataset.helpKey===key))};
  });
  assert.ok(audit.count>25&&audit.count<50);assert.equal(audit.reported,audit.count);assert.deepEqual(audit.missing,[]);assert.deepEqual(audit.invalid,[]);assert.deepEqual(audit.readouts,[]);
  for(const key of ['gs-phase-x','gs-phase-y','gs-stride','gs-normal','gs-auto-steer','gs-steer-lat','gs-steer-lon','gs-power','project-planar-array-u0','project-link-budget-gt'])assert.equal(await help(key).count(),1,key+' retains its explanation');
  for(const key of ['[data-hint]','[data-compare]','[data-gs-play]','[data-gs-reset]','[data-gs-power-colors]','[data-gs-remove]','gs-tab-system','gs-tab-array','gs-tab-georgia','gs-controls-geometry','gs-controls-aperture','gs-controls-beam','gs-element','gs-rows','gs-columns','project-rays','project-axes','coverage','installed'])assert.equal(await help(key).count(),0,key+' needs no information button');
  assert.equal(await panel.getAttribute('role'),'dialog');assert.equal(await panel.getAttribute('aria-modal'),'false');assert.equal(await panel.getAttribute('aria-labelledby'),'project-help-title');assert.equal(await page.locator('#project-help-body').count(),1);
  return{explanations:audit.count};
 });
 await check('Hover, focus and pinned click help preserve controls and document positions',async()=>{
  await page.locator('#gs-controls-beam').click();const target=help('gs-phase-x');await target.scrollIntoViewIfNeeded();
  const before=await settings(),positions=await geometry(stableSelectors);
  await target.hover();await opened();assert.equal(await page.locator('#project-help-title').textContent(),'Extra phase step X');assert.match(await panel.textContent(),/−60°.*−30°.*0°.*30°.*60°/);sameGeometry(positions,await geometry(stableSelectors),'hover');
  await page.mouse.move(0,0);await closed();
  await target.focus();await opened();assert.equal(await target.getAttribute('aria-expanded'),'true');assert.equal(await target.getAttribute('aria-describedby'),'project-help-body');
  await page.keyboard.press('Escape');await closed();assert.equal(await target.getAttribute('aria-expanded'),'false');assert.equal(await target.getAttribute('aria-describedby'),null);
  await target.click();await opened();assert.equal(await page.locator('.project-help-close').evaluate(e=>document.activeElement===e),true);await page.mouse.move(0,0);
  // The delayed pointer-leave handler must keep a clicked explanation pinned.
  await page.waitForTimeout(240);assert.equal(await panel.isVisible(),true);
  await page.locator('#gs-phase-x').focus();await closed();
  await target.click();await opened();await page.locator('.project-help-close').click();await closed();assert.equal(await target.evaluate(e=>document.activeElement===e),true);
  await target.click();await opened();await target.click();await closed();
  await target.click();await opened();await page.locator('h1').click();await closed();
  assert.deepEqual(await settings(),before);sameGeometry(positions,await geometry(stableSelectors),'click and close');
 });
 await check('Keyboard opens, explores and closes help without changing its associated setting',async()=>{
  const target=help('gs-phase-y');await target.scrollIntoViewIfNeeded();const before=await settings(),positions=await geometry(stableSelectors);
  await target.focus();await opened();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('.project-help-close').evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Escape');await closed();assert.equal(await target.evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Enter');await opened();assert.equal(await page.locator('.project-help-close').evaluate(e=>document.activeElement===e),true);await page.keyboard.press('Escape');await closed();
  await page.keyboard.press('Space');await opened();assert.equal(await page.locator('.project-help-close').evaluate(e=>document.activeElement===e),true);await page.keyboard.press('Enter');await closed();
  assert.equal(await target.evaluate(e=>document.activeElement===e),true);assert.deepEqual(await settings(),before);sameGeometry(positions,await geometry(stableSelectors),'keyboard');
 });
 await check('All explanations fit phones and desktops in both themes while page geometry remains fixed',async()=>{
  let inspected=0;
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});await visit();
   const before=await settings(),buttons=page.locator('#project-overview .project-help-button'),count=await buttons.count();
   for(let index=0;index<count;index++){
    const target=buttons.nth(index),key=await target.getAttribute('data-help-key'),group=await target.evaluate(e=>e.closest('[data-gs-control-panel]')?.dataset.gsControlPanel);
    if(group)await page.locator(`[data-gs-controls="${group}"]`).click();
    await target.evaluate(e=>e.scrollIntoView({block:'center'}));const positions=await geometry(stableSelectors);
    await target.focus();await opened();await fits(theme+width+' '+key);sameGeometry(positions,await geometry(stableSelectors),theme+width+' '+key+' opened');
    assert.equal(await target.getAttribute('aria-expanded'),'true');assert.ok((await page.locator('#project-help-title').textContent()).trim());assert.ok((await page.locator('#project-help-body').textContent()).trim());
    if(theme==='light'&&key==='phasor')await page.screenshot({path:path.join(output,`project-help-phasor-${width}.png`)});
    await page.keyboard.press('Escape');await closed();sameGeometry(positions,await geometry(stableSelectors),theme+width+' '+key+' closed');inspected++;
   }
   const clicked=help('gs-preset');await clicked.evaluate(e=>e.scrollIntoView({block:'start'}));await clicked.click();await opened();await fits(theme+width+' clicked help');
   assert.equal(await page.locator('.project-help-close').evaluate(e=>document.activeElement===e),true);await page.mouse.move(0,0);await page.waitForTimeout(240);assert.equal(await panel.isVisible(),true);await page.locator('.project-help-close').click();await closed();
   assert.deepEqual(await settings(),before);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   csp.push(...await page.evaluate(()=>window.projectHelpCsp||[]));
  }
  return{inspected};
 });
 await check('Optimal restores all175 source feeds, saved geometry and exact longitude before regular presets unlock layout',async()=>{
  await page.setViewportSize({width:1440,height:1000});await visit();await page.locator('[data-gs-preset]').selectOption('optimal');await page.waitForFunction(()=>GeorgiaSystemExplorer.result.counts.installed===175);
  const reference=await page.evaluate(()=>({saved:GeorgiaOptimalPreset,state:GeorgiaSystemExplorer.getState(),count:GeorgiaSystemExplorer.result.elements.length}));
  assert.equal(reference.state.aperture,'explicit');assert.equal(reference.count,175);assert.deepEqual(reference.state.steeringReference,reference.saved.steeringReference);
  assert.deepEqual(reference.state.explicitFeeds.map(({id,gx,gy})=>({id,gx,gy})),reference.saved.feeds.map(({id,gx,gy})=>({id,gx,gy})));
  reference.state.explicitFeeds.forEach((feed,index)=>{const saved=reference.saved.feeds[index];assert.ok(Math.abs(Math.sin(feed.phaseRad)-Math.sin(saved.phaseRad))<1e-12&&Math.abs(Math.cos(feed.phaseRad)-Math.cos(saved.phaseRad))<1e-12,'Saved phase for '+feed.id);});
  for(const[key,value]of Object.entries(reference.saved.settings))assert.equal(reference.state[key],value,'Saved '+key);
  assert.equal(await page.locator('[data-gs-installed]').textContent(),'175');assert.equal(Number(await page.locator('#gs-longitude').inputValue()),reference.state.longitude);assert.equal(await page.locator('#gs-longitude').getAttribute('step'),'.01');
  assert.match(await page.locator('[data-gs-output="longitude"]').textContent(),/83\.56/);
  for(const id of ['rows','columns','stride']){assert.equal(await page.locator('#gs-'+id).isDisabled(),true);assert.equal(await page.locator(`[data-gs-output="${id}"]`).textContent(),'Saved');}
  assert.equal(await page.locator('#gs-auto-steer').isChecked(),false);assert.equal(await page.locator('#gs-phase-x').getAttribute('step'),'.1');
  await help('gs-preset').focus();await opened();assert.match(await panel.textContent(),/Saved best-found reference/);assert.match(await panel.textContent(),/175-element/);assert.match(await panel.textContent(),/global optimality remains unproven/);await page.keyboard.press('Escape');
  await page.locator('#gs-controls-beam').click();await page.locator('#gs-phase-x').evaluate(e=>{e.value='0.2';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.phaseX===.2&&document.querySelector('[data-gs-preset]').value==='custom');
  assert.equal(await page.locator('[data-gs-preset]').inputValue(),'custom');assert.equal((await settings()).model.aperture,'explicit');assert.equal(await page.locator('#gs-rows').isDisabled(),true);
  await page.locator('[data-gs-preset]').selectOption('compact');await page.waitForFunction(()=>GeorgiaSystemExplorer.result.state.aperture==='regular'&&!document.querySelector('#gs-rows').disabled);
  for(const id of ['rows','columns','stride'])assert.equal(await page.locator('#gs-'+id).isDisabled(),false);
  assert.equal(await page.locator('#gs-longitude').getAttribute('step'),'.5');assert.equal(await page.locator('#gs-phase-x').getAttribute('step'),'2');
  await page.locator('[data-gs-reset]').click();await page.waitForFunction(()=>GeorgiaSystemExplorer.result.counts.installed===100&&document.querySelector('[data-gs-preset]').value==='default');
 });
 await check('Coverage and power legend modes preserve their space across widths and themes',async()=>{
  for(const theme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});await visit();
   const selectors=['.gs-map-legend','.gs-element-editor','#mission'],positions=await geometry(selectors),before=await settings();
   await page.locator('[data-gs-power-colors]').click();assert.equal(await page.locator('[data-gs-power-key]').isVisible(),true);assert.equal(await page.locator('.gs-coverage-legend').isVisible(),false);sameGeometry(positions,await geometry(selectors),theme+width+' power colors');
   await page.locator('[data-gs-power-colors]').click();assert.equal(await page.locator('[data-gs-power-key]').isVisible(),false);assert.equal(await page.locator('.gs-coverage-legend').isVisible(),true);sameGeometry(positions,await geometry(selectors),theme+width+' coverage colors');
   assert.deepEqual(await settings(),before);csp.push(...await page.evaluate(()=>window.projectHelpCsp||[]));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(csp,[]);assert.deepEqual(external,[]);assert.equal(await page.locator('#project-overview [style],#project-help-panel[style]').count(),0);
 });
}finally{
 await browser.close();const report={passed:results.filter(result=>result.status==='passed').length,failed:results.filter(result=>result.status==='failed').length,results,errors,csp,external};
 await writeFile(path.join(output,'project-help-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
}
