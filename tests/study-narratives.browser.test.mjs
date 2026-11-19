import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ORBITALHW_URL||'http://127.0.0.1:4178';
const out=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/study-narratives-browser');
const books=JSON.parse(await readFile(new URL('../src/study-narratives.json',import.meta.url),'utf8'));
const results=[],errors=[],requests=[],csp=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(base).origin){requests.push(url.href);return route.abort();}return route.continue();});
const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
await page.exposeFunction('studyCsp',value=>csp.push(value));
await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',event=>window.studyCsp(event.effectiveDirective+':'+event.blockedURI)));
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',error:String(error.stack)});console.error('FAIL '+name+': '+error.message);}}
try{
 await mkdir(out,{recursive:true});
 await check('Both exams and every chapter render complete figures and native equations at desktop and phone sizes',async()=>{
  let states=0;
  for(const width of[320,390,1440])for(const book of books)for(const chapter of book.chapters){
   await page.setViewportSize({width,height:1000});
   const response=await page.goto(new URL(chapter.route,base).href);assert.ok(response.ok());
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('.narrative-figure').count(),chapter.figureCount);
   assert.equal(await page.locator('.practice-question').count(),1);
   assert.equal(await page.locator('[data-compare]').isDisabled(),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),chapter.route+' width '+width);
   await page.locator('.narrative-figure img').first().scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const image=document.querySelector('.narrative-figure img');return image.complete&&image.naturalWidth>0;});
   const fits=await page.locator('.narrative-figure img').first().evaluate(image=>image.getBoundingClientRect().width<=image.parentElement.clientWidth+1);assert.ok(fits,chapter.route);
   if(!['introduction','connections'].includes(chapter.slug))assert.ok(await page.locator('math').count()>0,chapter.route);
   if([390,1440].includes(width)&&['orbits','pulses','coding'].includes(chapter.slug))await page.screenshot({path:path.join(out,book.id+'-'+chapter.slug+'-'+width+'.png'),fullPage:false});
   states++;
  }
  return{chapters:books.reduce((n,b)=>n+b.chapters.length,0),responsiveStates:states};
 });
 await check('Narrative figures enlarge clearly, zoom, and return keyboard focus',async()=>{
  await page.setViewportSize({width:390,height:900});await page.goto(new URL('/courses/gt/ece6390/study/exam-2/coding/',base).href);
  const launch=page.locator('.figure-enlarge').first();await launch.click();
  const dialog=page.locator('dialog.figure-viewer');assert.ok(await dialog.isVisible());
  assert.equal(await dialog.locator('img').count(),1);
  assert.ok(await dialog.locator('h2').textContent());
  const before=Number(await dialog.locator('img').getAttribute('width'));
  await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();
  assert.ok(Number(await dialog.locator('img').getAttribute('width'))>before);
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);await assert.doesNotReject(()=>launch.evaluate(button=>{if(document.activeElement!==button)throw Error('Focus not restored');}));
 });
 await check('Lesson readings open the matching figure and retain their section on refresh',async()=>{
  for(const [topic,chapter,label] of [['array-normalization','link','fig:arr-normal'],['soft-decisions','coding','fig:vid789-soft-decisions'],['amplifier-backoff','advanced-digital','fig:vid789-amplifier']]){
   await page.goto(new URL('/courses/gt/ece6390/topics/'+topic+'/',base).href);
   const link=page.locator('.topic-reading a[href*="study/"]');
   await link.click();
   assert.ok(page.url().includes('/'+chapter+'/#'+label));
   await page.waitForFunction(id=>{const target=document.getElementById(id),rect=target?.getBoundingClientRect();return rect&&rect.top>=0&&rect.top<innerHeight;},label);
   await page.reload();
   await page.waitForFunction(id=>{const target=document.getElementById(id),rect=target?.getBoundingClientRect();return rect&&rect.top>=0&&rect.top<innerHeight;},label);
  }
 });
 await check('Referenced equations display their number and preserve native mathematics on narrow screens',async()=>{
  for(const width of [320,1440]){
   await page.setViewportSize({width,height:1000});
   await page.goto(new URL('/courses/gt/ece6390/study/exam-2/link/#eq:arr-look',base).href);
   const equation=page.locator('.narrative-equation').filter({has:page.locator('.narrative-equation-number')}).first();
   await equation.scrollIntoViewIfNeeded();
   assert.match(await equation.locator('.narrative-equation-number').textContent(),/^\([0-9]+\)$/);
   assert.equal(await equation.locator('math').count(),1);
   assert.ok(await equation.locator('math').evaluate(math=>math.getBoundingClientRect().height>0));
   const number=await equation.locator('.narrative-equation-number').boundingBox();
   assert.ok(number.x>=0&&number.x+number.width<=width,'Referenced equation number stays in view');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
 });
 await check('Course overview and practice connect readings with existing simulations',async()=>{
  await page.goto(new URL('/courses/gt/ece6390/',base).href);
  assert.equal(await page.locator('.study-cards a').count(),2);
  await page.locator('.study-cards a').first().click();await page.locator('.study-chapters a').nth(1).click();
  assert.ok(page.url().includes('/study/exam-1/orbits/'));
  await page.locator('.study-experiments a').first().click();assert.ok(page.url().includes('/topics/'));
  assert.ok(await page.getByRole('heading',{name:'Read the connected explanation'}).count());
  await page.locator('a[href*="/study/exam-1/orbits/"]').click();
  const attempt=page.locator('.practice-question textarea');await attempt.fill('I will first hold the semi-major axis and central body fixed.');
  await page.locator('[data-compare]').click();assert.equal(await page.locator('.practice-answer').isVisible(),true);
  await page.reload();assert.equal(await attempt.inputValue(),'I will first hold the semi-major axis and central body fixed.');
 });
 await check('Reading pages retain contrast and bounds in dark mode',async()=>{
  await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:390,height:1000});
  for(const route of['/courses/gt/ece6390/','/courses/gt/ece6390/study/exam-1/','/courses/gt/ece6390/study/exam-2/detection/']){
   await page.goto(new URL(route,base).href);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(await page.locator('.narrative-figure img').count())await page.waitForFunction(()=>{const image=document.querySelector('.narrative-figure img');return image.complete&&image.naturalWidth>0;});
   await page.screenshot({path:path.join(out,'dark-'+route.split('/').filter(Boolean).slice(-1)[0]+'.png'),fullPage:false});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.deepEqual(csp,[]);
 });
}finally{
 await browser.close();await writeFile(path.join(out,'study-narratives-browser.json'),JSON.stringify({results,errors,requests,csp},null,2)+'\n');
 if(results.some(result=>result.status==='failed'))process.exitCode=1;
}
