import assert from 'node:assert/strict';
import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||'http://127.0.0.1:4178'),out=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/figure-viewer');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const page=await browser.newPage({viewport:{width:390,height:900},colorScheme:'dark'});const errors=[],violations=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.viewerCsp??=[]).push(e.effectiveDirective)));
try{
 await mkdir(out,{recursive:true});
 for(const theme of ['light','dark'])for(const width of [320,1440]){
  await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1000});
  await page.goto(new URL('/courses/byu/phscs587/topics/band-states-holes/',base).href);await page.waitForSelector('.figure-enlarge');
  const opener=page.getByRole('button',{name:'Enlarge figure',exact:true});await opener.click();
  const dialog=page.getByRole('dialog');assert.equal(await dialog.isVisible(),true);
  assert.equal(await page.locator('.fv-toolbar output').textContent(),'100%');
  const svg=page.locator('.fv-stage > svg');const natural=await svg.boundingBox();assert.equal(natural.width,900);
  const text=await page.locator('.fv-stage text').first().evaluate(e=>({fill:getComputedStyle(e).fill,font:parseFloat(getComputedStyle(e).fontSize),pixels:e.getBoundingClientRect().height}));
  assert.notEqual(text.fill,'rgb(234, 239, 247)');assert.ok(text.font>=18);assert.ok(text.pixels>=18);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert.equal(await page.locator('.fv-toolbar output').textContent(),'125%');assert.equal((await svg.boundingBox()).width,1125);
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();assert.equal((await svg.boundingBox()).width,900);
  await page.locator('.fv-stage').evaluate(e=>{e.scrollLeft=300;});
  if(width===320)assert.ok(await page.locator('.fv-stage').evaluate(e=>e.scrollLeft>0));
  const duplicateIds=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});assert.deepEqual(duplicateIds,[]);
  const marker=await page.locator('.fv-stage line[marker-end]').first().getAttribute('marker-end');assert.match(marker,/url\(#fv-/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('[style]').count(),0);
  await dialog.screenshot({path:path.join(out,`figure-viewer-${theme}-${width}.png`)});
  await page.getByRole('button',{name:'Fit the complete figure'}).click();assert.ok((await svg.boundingBox()).width<=width);
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await opener.evaluate(e=>document.activeElement===e),true);
  violations.push(...await page.evaluate(()=>window.viewerCsp||[]));
 }
 assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
 await writeFile(path.join(out,'figure-viewer-report.json'),JSON.stringify({status:'passed',themes:2,widths:[320,1440],naturalFontMinimum:18,zoomPanKeyboardAndFocus:true,errors,violations},null,2));
 console.log('PASS reference figure enlargement preserves readable labels, vector zoom, pan, unique IDs, keyboard focus and CSP across themes and viewport sizes');
}finally{await browser.close();}
