/** Orbit-family controls, synchronized figures, geographic readouts and replay. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ORBITALHW_URL||'http://127.0.0.1:4178';
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/orbit-types-browser');
const results=[],errors=[],violations=[],external=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){external.push(route.request().url());return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.orbitCsp??=[]).push(e.effectiveDirective)));
const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
async function visit(){await page.goto(new URL('/courses/gt/ece6390/topics/orbit-types/',base).href);await page.waitForSelector('#input-preset');}
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function set(id,value){await page.locator('#input-'+id).evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function clipped(){return page.locator('#figure svg').evaluateAll(svgs=>svgs.flatMap(svg=>{const vb=svg.viewBox.baseVal;return[...svg.querySelectorAll('text')].filter(e=>{const m=svg.getCTM().inverse().multiply(e.getCTM()),b=e.getBBox();return[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return p.x<-.75||p.y<-.75||p.x>vb.width+.75||p.y>vb.height+.75;});}).map(e=>e.textContent);}));}
try{
 await mkdir(output,{recursive:true});
 await check('Ten orbit families share two synchronized figures and visible characteristics',async()=>{
  await visit();assert.equal(await page.locator('#input-preset option').count(),10);assert.equal(await page.locator('#figure svg').count(),2);
  const labels=await page.locator('#input-preset option').allTextContents();assert.ok(labels.includes('GEO')&&labels.includes('Polar LEO')&&labels.includes('Molniya-like'));
  for(let i=0;i<10;i++){await set('preset',i);assert.equal(await page.locator('#figure.error').count(),0);assert.doesNotMatch(await page.locator('#figure').innerHTML(),/NaN|Infinity|undefined/);assert.match(await page.locator('#figure svg').first().textContent(),/e = .*i = .*a = /);assert.match(await page.locator('#stats').textContent(),/Altitude now.*km.*Orbital period.*h.*Subpoint latitude/);}
 });
 await check('Preset, node, apsis and elapsed time respond, replay in URLs and reset',async()=>{
  await set('preset',9);await set('progress',65);const before=await page.locator('#figure').innerHTML();await set('node',40);assert.notEqual(await page.locator('#figure').innerHTML(),before);await set('apsis',90);
  for(const[id,value]of Object.entries({preset:9,progress:65,node:40,apsis:90}))assert.equal(new URL(page.url()).searchParams.get('c_'+id),String(value));
  await page.reload();await page.waitForSelector('#input-preset');for(const[id,value]of Object.entries({preset:9,progress:65,node:40,apsis:90}))assert.equal(await page.locator('#input-'+id).inputValue(),String(value));
  await page.locator('#reset').click();for(const[id,value]of Object.entries({preset:0,progress:50,node:-85,apsis:0}))assert.equal(await page.locator('#input-'+id).inputValue(),String(value));
  await page.locator('#input-progress').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#input-progress').inputValue(),'51');
 });
 await check('Playback advances the physical state and pause stops it',async()=>{
  const before=await page.locator('#input-progress').inputValue();await page.locator('#play').click();await page.waitForTimeout(350);assert.notEqual(await page.locator('#input-progress').inputValue(),before);await page.locator('#play').click();const value=await page.locator('#input-progress').inputValue();await page.waitForTimeout(220);assert.equal(await page.locator('#input-progress').inputValue(),value);
 });
 await check('Every family and endpoint keeps text inside its figures on desktop and phone',async()=>{
  let states=0;
  for(const width of[320,390,1440])for(const scheme of['light','dark']){await page.setViewportSize({width,height:1100});await page.emulateMedia({colorScheme:scheme});for(let i=0;i<10;i++){await set('preset',i);await set('progress',i===5?25:50);const bad=await clipped();assert.deepEqual(bad,[],`${width}/${scheme}/${i}`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));states++;if([0,5,9].includes(i)&&[390,1440].includes(width))await page.screenshot({path:path.join(output,`orbit-types-${i}-${width}-${scheme}.png`),fullPage:true});}}
  await page.setViewportSize({width:1440,height:1100});for(const[id,values]of Object.entries({progress:[0,200],node:[-180,180],apsis:[0,360]}))for(const value of values){await set(id,value);assert.deepEqual(await clipped(),[],id+':'+value);states++;}return{states};
 });
 await check('Orbit comparison and library navigation have no runtime or CSP errors',async()=>{
  await page.locator('.catalog-header [data-site-view="simulations"]').click();await page.waitForURL('**/courses/gt/ece6390/lab/');await page.waitForSelector('#tab-orbit-types');await page.locator('#tab-orbit-types').click();assert.equal(await page.locator('#figure svg').count(),2);violations.push(...await page.evaluate(()=>window.orbitCsp||[]));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(violations,[]);
 });
}finally{await browser.close();const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,errors,external,violations};await writeFile(path.join(output,'orbit-types-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
