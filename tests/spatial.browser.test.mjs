/** Real spatial geometry remains inspectable, labeled and separate from model controls. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.ORBITALHW_URL||process.env.COURSELAB_URL||'http://127.0.0.1:4178');
const output=path.resolve(process.env.QA_OUTPUT||'.ai-work/runs/spatial-browser');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[],violations=[],external=[],results=[];
await context.route('**/*',route=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==base.origin){external.push(u.href);return route.abort();}return route.continue();});
await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.spatialViolations??=[]).push(e.effectiveDirective)));
page.on('pageerror',e=>errors.push(String(e)));
const ids=['look-triangle','azimuth-components','solar-array','plane-wave','polarization','free-space-flux','dipole-pattern','circular-aperture','dish-gain','array-multiplication','planar-array','array-footprint','array-normalization','solid-angle','doppler-pass','navigation-frames','gnss-dop-3d'];
async function check(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function visit(id){await page.goto(new URL('/courses/gt/ece6390/topics/'+id+'/',base).href);await page.waitForSelector('[data-spatial]');}
async function labels(){return page.locator('[data-spatial]').evaluateAll(svgs=>svgs.flatMap(svg=>{
  const box=svg.viewBox.baseVal;
  return[...svg.querySelectorAll('text')].filter(e=>{const b=e.getBBox(),m=svg.getCTM().inverse().multiply(e.getCTM());return[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return p.x<-.75||p.y<-.75||p.x>box.width+.75||p.y>box.height+.75;});}).map(e=>e.textContent);
}));}
async function view(azimuth,elevation){for(const [id,value]of [['viewAzimuth',azimuth],['viewElevation',elevation]])await page.locator('#input-'+id).evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}
async function drag(surface,dx=75,dy=45){
  await surface.scrollIntoViewIfNeeded();
  const box=await surface.boundingBox();
  const x=box.x+box.width*.42,y=box.y+box.height*.45;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+dx,y+dy,{steps:5});
  await page.mouse.up();
}
try{
  await mkdir(output,{recursive:true});
  await check('Spatial camera controls change geometry while preserving physical readouts and route state',async()=>{
    for(const id of ids){
      await visit(id);const stats=await page.locator('#stats').textContent(),before=await page.locator('[data-spatial]').first().innerHTML();
      await view(-120,75);assert.notEqual(await page.locator('[data-spatial]').first().innerHTML(),before,id);assert.equal(await page.locator('#stats').textContent(),stats,id);
      assert.equal(new URL(page.url()).searchParams.get('c_viewAzimuth'),'-120');await page.reload();await page.waitForSelector('[data-spatial]');assert.equal(await page.locator('#input-viewAzimuth').inputValue(),'-120');
      await page.locator('#reset').click();assert.deepEqual(await labels(),[],id+' default labels');
    }
    return{modules:ids.length};
  });
  await check('Mouse drag rotates the live figure, synchronizes the sliders and saves the viewpoint',async()=>{
    await visit('dipole-pattern');
    const figure=page.locator('#figure svg[data-spatial]');
    const stats=await page.locator('#stats').textContent();
    const azimuth=page.locator('#input-viewAzimuth'),elevation=page.locator('#input-viewElevation');
    const originalAzimuth=await azimuth.inputValue(),originalElevation=await elevation.inputValue();
    const original=await figure.innerHTML();
    await figure.click();
    assert.equal(await azimuth.inputValue(),originalAzimuth,'A click leaves the camera alone');
    await drag(figure);
    assert.notEqual(await figure.innerHTML(),original);
    assert.notEqual(await azimuth.inputValue(),originalAzimuth);
    assert.notEqual(await elevation.inputValue(),originalElevation);
    assert.equal(await page.locator('#stats').textContent(),stats);
    const rotatedAzimuth=await azimuth.inputValue(),rotatedElevation=await elevation.inputValue();
    const url=new URL(page.url());
    assert.equal(url.searchParams.get('c_viewAzimuth'),rotatedAzimuth);
    assert.equal(url.searchParams.get('c_viewElevation'),rotatedElevation);
    await page.reload();
    await figure.waitFor();
    assert.equal(await azimuth.inputValue(),rotatedAzimuth);
    assert.equal(await elevation.inputValue(),rotatedElevation);
    const plot=page.locator('#figure svg[role="img"]:not([data-spatial])').first();
    await drag(plot);
    assert.equal(await azimuth.inputValue(),rotatedAzimuth,'Dragging a 2D companion leaves the camera alone');
    assert.equal(await elevation.inputValue(),rotatedElevation);
  });
  await check('Mouse drag is shared by the lab, project figures and course-specific figures',async()=>{
    const entries=[
      ['courses/gt/ece6390/lab/#plane-wave','#figure svg[data-spatial]','#input-viewAzimuth'],
      ['courses/gt/ece6390/topics/orbit-types/','#figure [data-spatial-hit]','#input-viewAzimuth'],
      ['courses/gt/ece6390/topics/gnss-orbits/','#figure [data-spatial-hit]','#input-viewAzimuth'],
      ['courses/gt/ece6390/project/','[data-project-module="planar-array"] svg[data-spatial]','#project-planar-array-viewAzimuth'],
      ['courses/byu/phscs587/topics/density-of-states-dimensions/','svg[data-spatial]','#device-viewAzimuth'],
      ['courses/gt/ece6390/topics/satellite-scan-angle/','svg[data-spatial]','#device-viewAzimuth'],
    ];
    for(const [route,selector,input] of entries){
      await page.goto(new URL('/'+route,base).href);
      const figure=page.locator(selector).first(),slider=page.locator(input);
      await figure.waitFor();
      const before=await slider.inputValue();
      await drag(figure);
      assert.notEqual(await slider.inputValue(),before,route);
    }
  });
  await check('Spatial labels remain inside their figures at camera corners on phones and desktops',async()=>{
    let states=0;
    for(const theme of ['light','dark'])for(const width of [390,1440]){
      await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:1100});
      for(const id of ids){await visit(id);for(const [az,el]of [[-180,5],[180,80]]){await view(az,el);assert.deepEqual(await labels(),[],id+width+theme+az+el);states++;}
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' page width');
        if(theme==='light'&&width===1440&&['solar-array','plane-wave','dipole-pattern','solid-angle','gnss-dop-3d','look-triangle'].includes(id))await page.locator('[data-spatial]').first().screenshot({path:path.join(output,id+'-spatial.png')});
        violations.push(...await page.evaluate(()=>window.spatialViolations||[]));
      }
    }
    return{states};
  });
  await check('Complex and signal-coordinate plots retain their useful 2D views',async()=>{
    for(const id of ['phasor-interference','iq-constellation','matched-filter','gnss-geometry','helmholtz-curvature']){
      await page.goto(new URL('/courses/gt/ece6390/topics/'+id+'/',base).href);await page.waitForSelector('#figure svg');assert.equal(await page.locator('[data-spatial]').count(),0,id);assert.equal(await page.locator('#input-viewAzimuth').count(),0,id);
    }
  });
  await check('Bulk, sheet and wire geometry accompanies the density-of-states energy graph',async()=>{
    await page.goto(new URL('/courses/byu/phscs587/topics/density-of-states-dimensions/',base).href);await page.waitForSelector('[data-spatial]');
    for(const dimension of [1,2,3]){
      await page.locator('#device-dimension').evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},String(dimension));
      assert.match(await page.locator('[data-spatial]').textContent(),new RegExp(['','Wire','Sheet','Bulk'][dimension]));
      const stats=await page.locator('.topic-demonstration .stats').textContent(),before=await page.locator('[data-spatial]').innerHTML();
      await page.locator('#device-viewAzimuth').evaluate(e=>{e.value=Number(e.value)===100?35:100;e.dispatchEvent(new Event('input',{bubbles:true}));});
      assert.notEqual(await page.locator('[data-spatial]').innerHTML(),before);assert.equal(await page.locator('.topic-demonstration .stats').textContent(),stats);assert.deepEqual(await labels(),[]);
    }
    violations.push(...await page.evaluate(()=>window.spatialViolations||[]));
    assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);assert.deepEqual(external,[]);
  });
}finally{
  await browser.close();const report={passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results,errors,violations,external};
  await writeFile(path.join(output,'spatial-browser-report.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
}
