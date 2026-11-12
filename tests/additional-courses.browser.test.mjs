/** Integrated reference figures, shared models, practice and all course topic URLs. */
import assert from 'node:assert/strict';
import{createRequire}from'node:module';
import{readFile,mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.COURSELAB_URL||process.env.ORBITALHW_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/additional-courses');
let lessons=[];for(const name of['additional-course-topics.json','byu-topics-part-a.json','byu-topics-part-b.json'])lessons.push(...JSON.parse(await readFile('src/'+name,'utf8')));
const results=[],errors=[],external=[],violations=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){external.push(u.href);return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.extraCsp??=[]).push(e.effectiveDirective)));
const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function outside(){return page.locator('main svg').evaluateAll(svgs=>svgs.flatMap(svg=>{const vb=svg.viewBox.baseVal;return[...svg.querySelectorAll('text')].filter(e=>{const m=svg.getCTM().inverse().multiply(e.getCTM()),b=e.getBBox();return[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return p.x<-.75||p.y<-.75||p.x>vb.width+.75||p.y>vb.height+.75;});}).map(e=>e.textContent);}));}
try{
 await mkdir(output,{recursive:true});
 await check('Every additional course topic has a reference figure, explanation, example and staged practice',async()=>{
  assert.equal(lessons.length,51);assert.equal(lessons.filter(x=>x.course==='byu/phscs587').length,49);const failures=[];
  for(const lesson of lessons){const route='/courses/'+lesson.course+'/topics/'+lesson.id+'/';const response=await page.goto(new URL(route,base).href);assert.ok(response.ok(),route);await page.waitForSelector('main svg');
   assert.equal(await page.locator('h1').textContent(),lesson.title);assert.equal(await page.locator('[data-practice]').count(),lesson.questions.length);
   assert.equal(await page.locator('.practice-answer:visible').count(),0);assert.equal(await page.locator('[style]').count(),0);
   if(lesson.simulation)await page.waitForSelector('.additional-controls input');
   const bad=await outside();if(bad.length)failures.push({id:lesson.id,bad});
   violations.push(...await page.evaluate(()=>window.extraCsp||[]));
  }
  assert.deepEqual(failures,[]);return{lessons:lessons.length};
 });
 await check('Each shared device-model control responds, resets and survives a URL refresh',async()=>{
  const selected=[...new Set(lessons.map(x=>x.simulation).filter(Boolean))];let controls=0;
  for(const id of selected){const lesson=lessons.find(x=>x.simulation===id),route='/courses/'+lesson.course+'/topics/'+lesson.id+'/';await page.goto(new URL(route,base).href);await page.waitForSelector('.additional-controls input');
   const defaults=await page.locator('.additional-controls input').evaluateAll(es=>es.map(e=>({id:e.id,value:e.value,min:e.min,max:e.max})));
   for(const d of defaults){const input=page.locator('#'+d.id),before=await page.locator('figure').last().innerHTML(),target=d.value===d.max?d.min:d.max;
    await input.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},target);assert.notEqual(await page.locator('figure').last().innerHTML(),before,id+':'+d.id);assert.ok(new URL(page.url()).searchParams.has('c_'+d.id.replace('device-','')));
    await page.reload();await page.waitForSelector('#'+d.id);assert.equal(await page.locator('#'+d.id).inputValue(),target);await page.locator('.additional-controls button').click();assert.equal(await page.locator('#'+d.id).inputValue(),d.value);controls++;
   }
  }return{models:selected.length,controls};
 });
 await check('All additional-topic figures remain readable containers in mobile and dark layouts',async()=>{
  for(const scheme of['light','dark'])for(const width of[390,1440]){
   await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:1050});
   for(const lesson of lessons){await page.goto(new URL('/courses/'+lesson.course+'/topics/'+lesson.id+'/',base).href);await page.waitForSelector('main svg');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lesson.id+width+scheme);
    if(['density-of-states-dimensions','mos-capacitance-frequency','short-channel-effects','cmos-inverter','interface-pinning','authenticated-encryption'].includes(lesson.id)&&[390,1440].includes(width))await page.screenshot({path:path.join(output,lesson.id+'-'+width+'-'+scheme+'.png'),fullPage:true});
   }
  }
 });
 await check('Every model default and endpoint SVG keeps its labels inside its viewBox',async()=>{
  await page.goto(new URL('/courses/byu/phscs587/topics/carrier-populations/',base).href);await page.waitForFunction(()=>window.CourseFigureModels);const failure=[];let states=0;
  const models=await page.evaluate(()=>CourseFigureModels.models.map(x=>({id:x.id,controls:x.controls})));
  for(const model of models){for(const values of[{},...model.controls.flatMap(c=>[c.min,c.max].map(v=>({[c.id]:v})))]){
   await page.evaluate(({id,values})=>{const m=CourseFigureModels.models.find(m=>m.id===id),v={...Object.fromEntries(m.controls.map(c=>[c.id,c.value])),...values};document.querySelector('main .figure').innerHTML=m.render(v,CourseFigureU).svg;},{id:model.id,values});const bad=await outside();if(bad.length)failure.push({id:model.id,values,bad});states++;
  }}assert.deepEqual(failure,[]);return{models:models.length,states};
 });
 await check('Integrated courses have no runtime errors, CSP violation or external dependency',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);assert.deepEqual(external,[]);});
}finally{await browser.close();const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,violations,external};await writeFile(path.join(output,'additional-courses-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
