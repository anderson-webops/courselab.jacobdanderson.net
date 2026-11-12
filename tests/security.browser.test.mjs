/** Security lessons reuse the shared model, state, practice and host contracts. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.COURSELAB_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/ece6612');
const lessons=(await Promise.all(['foundations','protocols','applications'].map(async p=>JSON.parse(await readFile('src/course-topics/ece6612-'+p+'.json','utf8'))))).flat();
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
const results=[],errors=[],external=[],violations=[];
page.on('pageerror',e=>errors.push(String(e)));
await context.route('**/*',r=>{const u=new URL(r.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){external.push(u.href);return r.abort();}return r.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.securityCsp??=[]).push(e.effectiveDirective)));
const visit=id=>page.goto(new URL('/courses/gt/ece6612/topics/'+id+'/',base).href);
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
try{
 await mkdir(output,{recursive:true});
 await check('Security model numerical checks and control corners render finite, bounded figures',async()=>{
  await visit('encryption-modes');await page.waitForFunction(()=>window.CourseFigureModels);
  const checks=await page.evaluate(()=>CourseFigureModels.checks());assert.ok(checks.length>=25);assert.deepEqual(checks.filter(c=>!c.pass),[]);
  const models=await page.evaluate(()=>CourseFigureModels.models.map(m=>({id:m.id,controls:m.controls})));
  let states=0;const failures=[];
  for(const model of models){let configs=[{}];for(const c of model.controls)configs=configs.flatMap(v=>[c.min,c.value,c.max].map(n=>({...v,[c.id]:n})));
   for(const values of configs){const bad=await page.evaluate(({id,values})=>{const m=CourseFigureModels.models.find(m=>m.id===id),r=m.render(values,CourseFigureU),mount=document.querySelector('main .figure');mount.innerHTML=r.svg;
    const problems=[];if(/NaN|Infinity|undefined/.test(r.svg+JSON.stringify(r.stats)+r.equation))problems.push('nonfinite output');
    for(const svg of mount.querySelectorAll('svg')){const vb=svg.viewBox.baseVal;for(const e of svg.querySelectorAll('text')){const matrix=svg.getCTM().inverse().multiply(e.getCTM()),b=e.getBBox();if([[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(matrix);return p.x<-.75||p.y<-.75||p.x>vb.width+.75||p.y>vb.height+.75;}))problems.push(e.textContent);}}
    return problems;},{id:model.id,values});if(bad.length)failures.push({id:model.id,values,bad});states++;
   }
  }assert.deepEqual(failures,[]);return{models:models.length,numericalChecks:checks.length,states};
 });
 await check('Attempt-first feedback and stored attempts remain independent of URL controls',async()=>{
  await visit('tcp-sequence-space');const q=page.locator('[data-practice]').first(),compare=q.locator('[data-compare]');assert.equal(await compare.isDisabled(),true);assert.equal(await q.locator('.practice-answer').isVisible(),false);
  await q.locator('textarea').fill('I trace each direction with its own byte counter.');await compare.click();assert.equal(await q.locator('.practice-answer').isVisible(),true);
  await page.locator('#device-request').fill('100');await page.locator('#device-request').dispatchEvent('input');await page.reload();assert.equal(await q.locator('textarea').inputValue(),'I trace each direction with its own byte counter.');assert.equal(await q.locator('.practice-answer').isVisible(),false);assert.equal(await page.locator('#device-request').inputValue(),'100');assert.ok(!page.url().includes('counter'));
  await q.locator('textarea').fill('   ');assert.equal(await compare.isDisabled(),true);
 });
 await check('Invalid control links restore safe defaults and optional storage stays optional',async()=>{
  await page.goto(new URL('/courses/gt/ece6612/topics/tcp-sequence-space/?c_request=NaN&c_response=99999',base).href);await page.waitForSelector('#device-request');assert.equal(await page.locator('#device-request').inputValue(),'75');assert.equal(await page.locator('#device-response').inputValue(),'30');
  const isolated=await browser.newContext();await isolated.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Unavailable storage');}});});const p=await isolated.newPage();await p.goto(new URL('/courses/gt/ece6612/topics/dns-cache/',base).href);await p.waitForSelector('#device-guesses');await p.locator('[data-practice] textarea').first().fill('Match the full reply tuple.');assert.equal(await p.locator('[data-compare]').first().isDisabled(),false);await p.close();await isolated.close();
 });
 await check('Course order, local search and narrow layouts expose the new lessons',async()=>{
  await page.goto(new URL('/courses/gt/ece6612/',base).href);assert.equal(await page.locator('main .topic-grid a').count(),26);
  await page.goto(new URL('/search/?q=SYN',base).href);await page.waitForSelector('#topic-search');await page.locator('#topic-search').fill('SYN');await page.locator('#topic-search').dispatchEvent('input');assert.equal(await page.locator('#search-results a[href*="dos-defense"]').count(),1);
  for(const width of[320,390,1440]){await page.setViewportSize({width,height:1000});for(const id of['tcp-sequence-space','ipsec-vpns','origins-cookies','email-auth','dos-defense','malware-spread']){await visit(id);await page.waitForSelector('main svg');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+': '+width);await page.screenshot({path:path.join(output,'ece6612-'+id+'-'+width+'.png'),fullPage:true});}}
  return{lessons:lessons.length};
 });
 await check('Security lesson runtime remains local and strict-CSP compatible',async()=>{violations.push(...await page.evaluate(()=>window.securityCsp||[]));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(violations,[]);});
}finally{await browser.close();const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,external,violations};await writeFile(path.join(output,'security-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
