/** Standalone topic routes, scientific figures and attempt-first practice. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/topics-browser');
const manifest=JSON.parse(await readFile('dist/assets/topic-manifest.json','utf8'));
const results=[],errors=[],violations=[],requests=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.route('**/*',async route=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){requests.push(u.href);return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.topicViolations??=[]).push(e.effectiveDirective+':'+e.blockedURI)));
const page=await context.newPage();
page.on('pageerror',e=>errors.push(String(e)));
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
try{
 await mkdir(output,{recursive:true});
 await check('Topic index reaches every independent page',async()=>{
  await page.goto(new URL('/courses/gt/ece6390/topics/',base).href);
  assert.equal(await page.locator('.topic-grid a').count(),67);
  assert.equal(await page.locator('h1').count(),1);
  const links=await page.locator('.topic-grid a').evaluateAll(els=>els.map(e=>e.pathname));
  assert.deepEqual([...links].sort(),manifest.map(x=>x.route).sort());
 });
 await check('Every topic loads its own live figure before explanation and practice',async()=>{
  for(const item of manifest){
   const response=await page.goto(new URL(item.route,base).href);
   assert.ok(response.ok(),item.id);
   await page.waitForFunction(id=>window.CourseLab?.modules.length===67&&document.querySelector('#course-lab').dataset.topic===id&&document.querySelector('#figure svg'),item.id);
   assert.equal(await page.locator('h1').textContent(),item.title);
   assert.equal(await page.locator('#figure.error').count(),0,item.id);
   assert.equal(await page.locator('[data-practice]').count(),item.questions);
   assert.equal(await page.locator('#subjects').isVisible(),false);
   const order=await page.evaluate(()=>{
    const f=document.querySelector('#figure').getBoundingClientRect(),e=document.querySelector('.topic-reading').getBoundingClientRect(),p=document.querySelector('.practice').getBoundingClientRect();
    return f.top<e.top&&e.top<p.top;
   });assert.ok(order,item.id);
   assert.ok((await page.locator('#figure').innerHTML()).includes('<svg'),item.id);
   assert.equal(await page.locator('#course-lab [style]').count(),0,item.id);
   violations.push(...await page.evaluate(()=>window.topicViolations||[]));
  }
  return {routes:manifest.length};
 });
 await check('Feedback requires a written attempt, persists locally and returns hidden',async()=>{
  await page.goto(new URL('/courses/gt/ece6390/topics/array-normalization/',base).href);
  const q=page.locator('[data-practice]').first(),compare=q.locator('[data-compare]');
  assert.equal(await compare.isDisabled(),true);
  assert.equal(await q.locator('.practice-answer').isVisible(),false);
  await q.locator('[data-hint]').click();assert.ok(await q.locator('.practice-hint').isVisible());
  await q.locator('textarea').fill('Both numerator and total scale with amplitude squared.');
  await compare.click();assert.ok(await q.locator('.practice-answer').isVisible());
  await page.reload();assert.match(await q.locator('textarea').inputValue(),/numerator/);assert.equal(await q.locator('.practice-answer').isVisible(),false);
  await q.locator('textarea').fill('   ');assert.equal(await compare.isDisabled(),true);
 });
 await check('Topic route stays fixed despite remembered lab selection or URL hash',async()=>{
  await page.goto(new URL('/courses/gt/ece6390/topics/matched-filter/#wrong-topic',base).href);
  await page.waitForFunction(()=>window.CourseLab);
  const title=await page.locator('h1').textContent();
  await page.evaluate(()=>CourseLab.select('kepler-ellipse'));
  assert.equal(await page.locator('h1').textContent(),title);
  assert.equal(await page.locator('#input-delay').count(),1);
 });
 await check('New scientific graphics keep labels inside their SVG at default and endpoint states',async()=>{
  await page.goto(new URL('/courses/gt/ece6390/lab/',base).href);await page.waitForFunction(()=>window.CourseLab?.modules.length===67);
  const newIds=manifest.slice(50).map(x=>x.id),failures=[];
  for(const id of newIds){
   await page.evaluate(id=>CourseLab.select(id),id);
   const controls=await page.evaluate(id=>CourseLab.modules.find(x=>x.id===id).controls,id);
   const cases=[{},...controls.flatMap(c=>[c.min,c.max].map(x=>({[c.id]:x})))];
   for(const values of cases){
    await page.evaluate(({id,values})=>{const m=CourseLab.modules.find(x=>x.id===id);CourseLab.values[id]=Object.fromEntries(m.controls.map(c=>[c.id,c.value]));Object.assign(CourseLab.values[id],values);CourseLab.select(id);},{id,values});
    const outside=await page.locator('#figure svg').evaluateAll(svgs=>svgs.flatMap(svg=>{
     const vb=svg.viewBox.baseVal;
     return [...svg.querySelectorAll('text')].filter(e=>{const b=e.getBBox(),m=svg.getCTM().inverse().multiply(e.getCTM());return [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return p.x<-.5||p.y<-.5||p.x>vb.width+.5||p.y>vb.height+.5;});}).map(e=>e.textContent);
    }));
    if(outside.length)failures.push({id,values,outside});
   }
  }
  assert.deepEqual(failures,[]);return {modules:newIds.length};
 });
 await check('Mobile, desktop and dark themes keep figures scrollable without page overflow',async()=>{
  for(const scheme of ['light','dark'])for(const width of [320,390,1440]){
   await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:1100});
   for(const id of ['array-normalization','solid-angle','rectangular-pulse-spectrum','matched-filter','lfsr-code','gnss-error-budget','ofdm-multipath','beamforming-frontends']){
    await page.goto(new URL('/courses/gt/ece6390/topics/'+id+'/',base).href);await page.waitForSelector('#figure svg');
    const w=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(w.document<=w.viewport+1,JSON.stringify({id,width,scheme,...w}));
    if(scheme==='light'&&[390,1440].includes(width))await page.screenshot({path:path.join(output,`${id}-${width}.png`),fullPage:true});
   }
   await page.goto(new URL('/courses/gt/ece6390/topics/',base).href);
   if(scheme==='light')await page.screenshot({path:path.join(output,`topics-index-${width}.png`),fullPage:true});
  }
 });
 await check('No runtime error, CSP violation or external dependency',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);assert.deepEqual(requests,[]);});
}finally{
 await browser.close();const report={testedAt:new Date().toISOString(),passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,violations,requests};
 await writeFile(path.join(output,'topics-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
}
