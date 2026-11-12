/** Replay the same local artifact under both requested origins; live DNS/TLS is separate. */
import assert from 'node:assert/strict';
import{createRequire}from'node:module';
import{mkdir,writeFile,readFile}from'node:fs/promises';
import path from'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const local=process.env.COURSELAB_URL||process.env.ORBITALHW_URL||'http://127.0.0.1:4178';
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/catalog-browser');
const names=['courselab.jacobdanderson.net','learn.jacobdanderson.net'],results=[],errors=[],requests=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.route('**/*',async route=>{const u=new URL(route.request().url());if(names.includes(u.hostname)){const response=await context.request.get(local+u.pathname+u.search,{failOnStatusCode:false});return route.fulfill({response});}requests.push(u.href);return route.abort();});
const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const allFiles=[];
async function visit(host,route){const response=await page.goto('https://'+host+route);assert.ok(response.ok(),host+route);assert.equal(new URL(page.url()).hostname,host);return response;}
try{
 await mkdir(output,{recursive:true});
 await check('Both origins serve the same course index with courselab canonical',async()=>{
  const texts=[];for(const host of names){await visit(host,'/');assert.equal(await page.locator('h1').textContent(),'Course Lab');assert.equal(await page.locator('.course-cards a').count(),3);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://courselab.jacobdanderson.net/');texts.push(await page.locator('main').innerHTML());await page.locator('.course-cards a').first().click();assert.equal(new URL(page.url()).hostname,host);assert.ok(new URL(page.url()).pathname.startsWith('/courses/gt/ece6390/'));await page.reload();assert.equal(new URL(page.url()).hostname,host);}assert.equal(texts[0],texts[1]);
 });
 await check('Courses, search and direct topics retain the selected hostname',async()=>{
  for(const host of names){await visit(host,'/search/?q=Computer%20Network%20Security');assert.match(await page.locator('#search-results a').first().textContent(),/ECE 6612/);await visit(host,'/search/?q=GeorgiaTenna');assert.equal(await page.locator('#search-results a').first().textContent(),'GeorgiaTenna project');await page.locator('#search-results a').first().click();assert.equal(new URL(page.url()).hostname,host);await page.waitForFunction(()=>window.ProjectFigures);await page.locator('.catalog-header a[data-site-view="courses"]').click();await page.locator('.course-cards a').filter({hasText:'ECE 6612'}).click();assert.equal(new URL(page.url()).hostname,host);assert.match(await page.locator('h1').textContent(),/Computer Network Security/);}
 });
 await check('Topics unifies all lessons and former simulation links retain their hostname',async()=>{
  for(const host of names){await visit(host,'/topics/');assert.equal(await page.locator('main a[href*="/topics/"]').count(),141);assert.deepEqual(await page.locator('.catalog-header a').allTextContents(),['Courses','Simulations','Topics','Search']);await page.goto('https://'+host+'/simulations/');await page.waitForURL('https://'+host+'/topics/');assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://courselab.jacobdanderson.net/topics/');}
 });
 await check('Saved legacy entries survive reorganization and topic control URLs replay correctly',async()=>{
  await visit(names[0],'/');await page.evaluate(()=>localStorage.setItem('orbitalhw:orbit:v1',JSON.stringify({modelContent:null,privateContent:{density:4}})));
  await visit(names[0],'/courses/gt/ece6390/topics/array-normalization/?c_n=8&c_phase=30');await page.waitForFunction(()=>window.CourseLab);
  assert.equal(await page.locator('#input-n').inputValue(),'8');assert.equal(await page.locator('#input-phase').inputValue(),'30');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbitalhw:orbit:v1')).privateContent.density),4);
  await page.locator('#input-n').evaluate(e=>{e.value='10';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(new URL(page.url()).searchParams.get('c_n'),'10');await page.reload();await page.waitForSelector('#input-n');assert.equal(await page.locator('#input-n').inputValue(),'10');await page.locator('#reset').click();assert.equal(new URL(page.url()).searchParams.get('c_n'),null);
 });
 await check('Origin-local progress moves through an explicit export/import and preserves conflicts',async()=>{
  await visit(names[0],'/progress/');await page.evaluate(()=>localStorage.setItem('orbitalhw-attempt-transfer-check','A written attempt.'));
  const downloadEvent=page.waitForEvent('download');await page.locator('#export-progress').click();const download=await downloadEvent;const file=path.join(output,'test-progress-export.json');await download.saveAs(file);const data=JSON.parse(await readFile(file,'utf8'));assert.equal(data.entries['orbitalhw-attempt-transfer-check'],'A written attempt.');
  await visit(names[1],'/progress/');assert.equal(await page.evaluate(()=>localStorage.getItem('orbitalhw-attempt-transfer-check')),null);await page.locator('#import-progress').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('imported'));assert.equal(await page.evaluate(()=>localStorage.getItem('orbitalhw-attempt-transfer-check')),'A written attempt.');
  await page.evaluate(()=>localStorage.setItem('orbitalhw-attempt-transfer-check','My newer answer.'));await page.locator('#import-progress').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('kept'));assert.equal(await page.evaluate(()=>localStorage.getItem('orbitalhw-attempt-transfer-check')),'My newer answer.');
 });
 await check('Course pages and figures remain within mobile and desktop viewports',async()=>{
  for(const host of names)for(const width of[320,390,1440])for(const route of['/','/courses/gt/ece6390/','/courses/gt/ece6612/','/courses/byu/phscs587/','/courses/byu/phscs587/topics/carrier-populations/']){
   await page.setViewportSize({width,height:1050});await visit(host,route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),host+route+width);
   const bounds=await page.locator('.catalog-bar').evaluate(nav=>{const box=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,center:(r.left+r.right)/2,top:r.top,bottom:r.bottom};};return{nav:box(nav),primary:box(nav.querySelector('.catalog-primary')),search:box(nav.querySelector('[data-site-view="search"]'))};});assert.ok(Math.abs(bounds.primary.center-bounds.nav.center)<1,'Course/Topics group is centered');assert.ok(Math.abs(bounds.search.right-bounds.nav.right)<1,'Search is at the right edge');assert.ok(bounds.primary.right+8<=bounds.search.left||bounds.primary.bottom+7<=bounds.search.top,'Header links do not overlap');
   if(host===names[0]&&[390,1440].includes(width)&&['/','/courses/byu/phscs587/topics/carrier-populations/'].includes(route))await page.screenshot({path:path.join(output,'catalog-'+(route==='/'?'home':'carriers')+'-'+width+'.png'),fullPage:true});
  }
 });
 await check('Shared device figures pass math anchors and all default/endpoint states',async()=>{
  await visit(names[0],'/courses/byu/phscs587/topics/carrier-populations/');await page.waitForFunction(()=>window.CourseFigureModels);
  const report=await page.evaluate(()=>{let states=0,failures=[];const U=CourseFigureU;for(const m of CourseFigureModels.models){const def=Object.fromEntries(m.controls.map(c=>[c.id,c.value]));for(const values of[def,...m.controls.flatMap(c=>[c.min,c.max].map(v=>({...def,[c.id]:v})))]){const r=m.render(values,U);states++;if(/NaN|Infinity|undefined/.test(r.svg))failures.push(m.id);}}return{models:CourseFigureModels.models.length,checks:CourseFigureModels.checks(),states,failures};});assert.ok(report.models>=4);assert.deepEqual(report.checks.filter(x=>!x.pass),[]);assert.deepEqual(report.failures,[]);return report;
 });
 await check('Both origin replays have no browser errors or external runtime dependencies',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});
}finally{await browser.close();const report={mode:'Local artifact replay under requested HTTPS origins; production DNS, HTTPS and server routing require separate verification',passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,requests};await writeFile(path.join(output,'catalog-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
