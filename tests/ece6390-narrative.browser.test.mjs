import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.COURSELAB_URL||process.env.ORBITALHW_URL||'http://127.0.0.1:4178').origin;
const out=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/20261119-exam-narratives/new-topic-browser');await mkdir(out,{recursive:true});
const topics=JSON.parse(await readFile('src/course-topics/ece6390-narrative.json','utf8'));
const results=[],runtime=[],csp=[],external=[],bounds=[],layout=[],fitFailures=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base){external.push(u.href);return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.violations??=[]).push(e.effectiveDirective)));
const page=await context.newPage();page.on('pageerror',e=>runtime.push(String(e)));
const route=t=>base+'/courses/gt/ece6390/topics/'+t.id+'/';
async function check(name,fn){try{const data=await fn();results.push({name,status:'passed',data});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',error:error.stack});console.log('FAIL '+name+' '+error.message);}}
async function goto(t,search=''){const r=await page.goto(route(t)+search);assert.ok(r.ok(),t.id);await page.waitForSelector('main svg');if(t.simulation)await page.waitForSelector('.additional-controls');}
async function outside(){return page.locator('main svg').evaluateAll(svgs=>svgs.flatMap(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].flatMap(e=>{const b=e.getBBox(),m=svg.getCTM().inverse().multiply(e.getCTM()),pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));return pts.some(p=>p.x<-.75||p.y<-.75||p.x>v.width+.75||p.y>v.height+.75)?[{text:e.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height},viewbox:{w:v.width,h:v.height}}]:[];});}));}
try{
 await check('All twenty-eight narrative topic pages have original figures, complete explanations, semantic captions and attempt-first practice',async()=>{
  for(const t of topics){await goto(t);assert.equal(await page.locator('h1').textContent(),t.title);assert.equal(await page.locator('[data-practice]').count(),2);assert.equal(await page.locator('.practice-answer:visible').count(),0);assert.equal(await page.locator('[style]').count(),0);
   const q=page.locator('[data-practice]').first();assert.ok(await q.locator('[data-compare]').isDisabled());await q.locator('[data-hint]').click();assert.ok(await q.locator('.practice-hint').isVisible());assert.ok(await q.locator('[data-compare]').isDisabled());await q.locator('textarea').fill('My first reasoning attempt.');await q.locator('[data-compare]').click();assert.ok(await q.locator('.practice-answer').isVisible());
   if(t.id==='soft-decisions'){const overlap=await page.locator('figure').first().locator('svg').evaluate(svg=>{const boxes=[...svg.querySelectorAll('text')].filter(e=>/^bit [01]$/.test(e.textContent)).map(e=>e.getBBox());return boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)));});assert.equal(overlap,false,'soft reference labels remain separated');}
   if(t.simulation){const caption=await page.locator('figure').nth(1).locator('figcaption').textContent();assert.ok(!caption.includes('ece-'),caption);assert.ok(await page.locator('.additional-controls label').count());}
  }return{pages:topics.length,questions:topics.length*2};
 });
 await check('All twenty-seven model controls change, preserve URL state, refresh, reset and support keyboard adjustment',async()=>{
  let controls=0,options=0;
  for(const t of topics.filter(x=>x.simulation)){
   await goto(t);const defs=await page.evaluate(id=>CourseFigureModels.models.find(x=>x.id===id).controls,t.simulation);
   for(const c of defs){const selector='#device-'+c.id,target=c.options?c.options.find(o=>o.value!==c.value).value:c.value===c.max?c.min:c.max;
    const before=await page.locator('figure').nth(1).innerHTML();if(c.options){await page.selectOption(selector,String(target));options++;}else await page.locator(selector).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},target);
    assert.notEqual(await page.locator('figure').nth(1).innerHTML(),before,t.id+':'+c.id);assert.equal(new URL(page.url()).searchParams.get('c_'+c.id),String(target));await page.reload();await page.waitForSelector(selector);assert.equal(await page.locator(selector).inputValue(),String(target),t.id+':replay:'+c.id);
    await page.getByRole('button',{name:'Reset example',exact:true}).click();assert.equal(await page.locator(selector).inputValue(),String(c.value));assert.equal(new URL(page.url()).searchParams.has('c_'+c.id),false);await page.locator(selector).focus();const keyBefore=await page.locator(selector).inputValue();if(c.options)await page.keyboard.type(c.options[0].label[0]);else await page.keyboard.press(c.value===c.max?'ArrowLeft':'ArrowRight');assert.notEqual(await page.locator(selector).inputValue(),keyBefore,t.id+':keyboard:'+c.id);await page.getByRole('button',{name:'Reset example',exact:true}).click();controls++;
   }
  }return{models:topics.filter(t=>t.simulation).length,controls,nativeSelects:options};
 });
 await check('Invalid query values return to defaults and discrete options reject unsupported values',async()=>{
  let cases=0;
  for(const t of topics.filter(x=>x.simulation)){await goto(t);const defs=await page.evaluate(id=>CourseFigureModels.models.find(x=>x.id===id).controls,t.simulation);
   for(const c of defs){const invalid=c.options?[String(c.min-.5),'NaN','1e9999','']: [String(c.max+c.step),'NaN','1e9999',''];
    for(const value of invalid){await goto(t,'?'+new URLSearchParams({['c_'+c.id]:value}));assert.equal(await page.locator('#device-'+c.id).inputValue(),String(c.value),t.id+':'+c.id+':'+value);cases++;}
   }
  }
  const dvb=topics.find(t=>t.id==='dvbs2-chain');await goto(dvb,'?c_rolloff=0.3');assert.equal(await page.locator('#device-rolloff').inputValue(),'0.25');return{cases:cases+1};
 });
 await check('All new model numerical invariants pass in the actual browser',async()=>{
  await goto(topics.find(t=>t.simulation));const checks=await page.evaluate(()=>ECE6390Teaching.models().flatMap(m=>m.checks().map(c=>({model:m.id,...c}))));
  assert.equal(checks.length,94);assert.deepEqual(checks.filter(x=>!x.pass),[]);return{checks:checks.length};
 });
 await check('Detection and coding figures expose the decisions and rates they compare',async()=>{
  const topic=id=>topics.find(t=>t.id===id);
  await goto(topic('qam-error-probability'));
  const reference=page.locator('.course-static > svg');
  for(const label of ['Sent 0101','Right neighbor 1101','Diagonal neighbor 1111','1 symbol error, 1 bit error','1 symbol error, 2 bit errors']){
   assert.equal(await reference.locator('text').filter({hasText:label}).count(),1,label);
  }
  assert.ok((await reference.locator('desc').textContent()).includes('midway'));
  await goto(topic('bpsk-detection'));const legend=page.locator('figure').nth(1).locator('.legend');
  assert.match(await legend.textContent(),/Selected = MAP threshold/);
  await page.locator('#device-prior').focus();await page.keyboard.press('ArrowRight');
  assert.match(await legend.textContent(),/MAP threshold \([−-]/);
  assert.match(await legend.textContent(),/left tail/);assert.match(await legend.textContent(),/right tail/);
  await goto(topic('soft-decisions'));assert.match(await legend.textContent(),/Channel LLR = posterior log odds/);
  await page.locator('#device-prior').focus();await page.keyboard.press('ArrowRight');
  assert.match(await legend.textContent(),/Posterior log odds/);
  await goto(topic('dvbs2-chain'));const stats=page.locator('figure').nth(1).locator('.stat strong');
  assert.deepEqual(await stats.allTextContents(),['9.6 Mbit/s','9.346 Mbit/s','6.97 Mbit/s']);
  await page.locator('#device-pilots').selectOption('0');
  const newRates=(await stats.allTextContents()).map(parseFloat);
  assert.equal(newRates[0],9.6);assert.ok(newRates[1]>9.346 && newRates[2]>6.97);
  await goto(topic('ldpc-constraints'),'?c_mask=63');
  assert.match(await page.locator('figure').nth(1).locator('.figure').textContent(),/Transmit 101010; receive 010101/);
  return{topics:5};
 });
 await check('Scientific references retain zoom while live models stay in the lesson',async()=>{
  for(const t of topics.filter(t=>t.simulation)){
   await goto(t);
   const reference=page.locator('figure.topic-demonstration').first(),live=page.locator('figure.topic-demonstration').nth(1);
   assert.equal(await reference.getByRole('button',{name:'Enlarge figure',exact:true}).count(),1,t.id);
   assert.equal(await live.locator('.figure-enlarge-actions').count(),0,t.id);
  }return{models:topics.filter(t=>t.simulation).length};
 });
 await check('Multi-diagram simulations redraw their geometry without duplicate zoom actions',async()=>{
  await page.goto(base+'/courses/gt/ece6390/topics/look-triangle/');await page.waitForSelector('#figure > svg');
  const figure=page.locator('#figure'),diagrams=figure.locator(':scope > svg:not(.legend-key)'),actions=page.locator('#figure + .figure-enlarge-actions button');
  assert.equal(await diagrams.count(),3);assert.equal(await actions.count(),0);
  const old=await diagrams.first().innerHTML();await page.locator('#input-gamma').evaluate(e=>{e.value='70';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.notEqual(await diagrams.first().innerHTML(),old,'look-triangle redraws in place');
  assert.equal(await diagrams.count(),3);assert.equal(await actions.count(),0);
  return{scientificDiagrams:3,actions:0};
 });
 await check('Dark static references retain their surface and text contrast, and large narrative figures fit mobile',async()=>{
  await page.emulateMedia({colorScheme:'dark'});await goto(topics.find(t=>t.id==='bpsk-detection'));
  const figure=page.locator('figure').first(),source=figure.locator('.course-static > svg'),expected=await source.evaluate(svg=>{let n=svg.parentElement,bg;while(n){bg=getComputedStyle(n).backgroundColor;if(bg!=='transparent'&&bg!=='rgba(0, 0, 0, 0)')break;n=n.parentElement;}return{background:bg,fills:[...svg.querySelectorAll('text')].map(e=>getComputedStyle(e).fill)};});
  await figure.getByRole('button',{name:'Enlarge figure',exact:true}).click();const dialog=page.locator('.figure-viewer');assert.equal(await dialog.locator('[data-viewer-background]').getAttribute('fill'),expected.background);assert.deepEqual(await dialog.locator('.fv-stage > svg text').evaluateAll(es=>es.map(e=>getComputedStyle(e).fill)),expected.fills);
  const contrast=await dialog.evaluate((e,colors)=>{const luminance=s=>{const v=s.match(/[\d.]+/g).slice(0,3).map(x=>{const c=Number(x)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];},a=luminance(colors.background);return Math.min(...colors.fills.map(fill=>{const b=luminance(fill);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}));},expected);assert.ok(contrast>=4.5,'enlarged reference text contrast '+contrast);await page.screenshot({path:out+'/reference-viewer-dark.png'});await page.keyboard.press('Escape');
  await page.setViewportSize({width:320,height:800});await page.goto(base+'/courses/gt/ece6390/study/exam-1/orbits/');await page.locator('.figure-enlarge').first().click();await page.getByRole('button',{name:'Fit the complete figure'}).click();const fitted=await page.locator('.fv-stage').evaluate(stage=>({width:stage.clientWidth,height:stage.clientHeight,imageWidth:stage.firstElementChild.getBoundingClientRect().width,imageHeight:stage.firstElementChild.getBoundingClientRect().height}));assert.ok(fitted.imageWidth<=fitted.width&&fitted.imageHeight<=fitted.height,JSON.stringify(fitted));await page.screenshot({path:out+'/narrative-fit-320.png'});await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1050});await page.emulateMedia({colorScheme:'light'});return{darkContrast:contrast,fitted};
 });
 await check('All default topics remain within desktop/mobile viewports in light and dark themes',async()=>{
  for(const scheme of ['light','dark'])for(const width of [320,390,1440]){await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:1050});
   for(const t of topics){await goto(t);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)layout.push({id:t.id,width,scheme});const bad=await outside();if(bad.length)bounds.push({id:t.id,width,scheme,kind:'default',bad});const clipped=await page.locator('main .figure').evaluateAll(es=>es.flatMap(e=>[...e.querySelectorAll(':scope > svg')].filter(svg=>svg.getBoundingClientRect().width>e.clientWidth+1).map(svg=>({container:e.clientWidth,svgWidth:svg.getBoundingClientRect().width}))));if(clipped.length)fitFailures.push({id:t.id,width,scheme,clipped});
    if((['bpsk-detection','dvbs2-chain','convolutional-code','ldpc-constraints'].includes(t.id)&&width===390&&scheme==='light')||(t.id==='soft-decisions'&&width===1440&&scheme==='dark'))await page.screenshot({path:out+'/'+t.id+'-'+width+'-'+scheme+'.png',fullPage:true});
    csp.push(...await page.evaluate(()=>window.violations||[]));
   }
  }
  assert.deepEqual(layout,[]);assert.deepEqual(bounds,[]);assert.deepEqual(fitFailures,[]);return{pages:topics.length,widths:[320,390,1440],themes:['light','dark']};
 });
 await check('Every model default, numeric endpoint and discrete option keeps SVG labels inside its viewBox',async()=>{
  await page.setViewportSize({width:1440,height:1050});await page.emulateMedia({colorScheme:'light'});let states=0;const failures=[];
  for(const t of topics.filter(t=>t.simulation)){await goto(t);const defs=await page.evaluate(id=>CourseFigureModels.models.find(x=>x.id===id).controls,t.simulation),defaults=Object.fromEntries(defs.map(c=>[c.id,c.value])),cases=[defaults,...defs.flatMap(c=>(c.options?c.options.map(o=>o.value):[c.min,c.max]).map(value=>({...defaults,[c.id]:value})))];
   for(const values of cases){await page.evaluate(({id,values})=>{const m=CourseFigureModels.models.find(x=>x.id===id),r=m.render(values,CourseFigureU);document.querySelector('figure:nth-of-type(2) .figure').innerHTML=r.svg;},{id:t.simulation,values});states++;const bad=await outside();if(bad.length)failures.push({id:t.id,values,bad});}
  }bounds.push(...failures);assert.deepEqual(failures,[]);return{states};
 });
 await check('New pages run with local assets and no browser or CSP errors',async()=>{assert.deepEqual(runtime,[]);assert.deepEqual(csp,[]);assert.deepEqual(external,[]);});
}finally{await browser.close();const report={passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,runtime,csp,external,bounds,layout,fitFailures};await writeFile(out+'/ece6390-narrative-browser-report.json',JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
