/* Coupled teaching view: one array state drives the fields, link and Georgia map. */
(() => {
  'use strict';
  const root=document.getElementById('georgia-system');
  if(!root)return;
  const Model=window.GeorgiaSystemModel;
  if(!Model){root.querySelector('[data-gs-status]').textContent='The array model could not be loaded.';return;}
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const unit=a=>{const m=Math.hypot(...a)||1;return a.map(x=>x/m);};
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const mult=(a,k)=>a.map(x=>x*k);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'—';
  const wrap=x=>((x+180)%360+360)%360-180;
  const hue=phase=>`hsl(${((phase+180)%360+360)%360} 76% 63%)`;
  const canvas=$('canvas'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state=clone(Model.DEFAULT_STATE),result=null,view='system',selected='r4c4',presetName='default';
  let playing=!reduced.matches,showPower=false,time=0,lastTime=0,renderFrame=0,pending=false;
  let elementHits=[],mapHits=[],selectedCell=null;
  const controls=$$('[data-gs-param]');
  const fields={
    longitude:v=>fmt(v,state.aperture==='explicit'?2:1)+'°',tiltX:v=>fmt(v,1)+'°',tiltY:v=>fmt(v,1)+'°',roll:v=>fmt(v,0)+'°',
    phaseX:v=>fmt(v,state.aperture==='explicit'?1:0)+'°',phaseY:v=>fmt(v,state.aperture==='explicit'?1:0)+'°',steeringLat:v=>fmt(Math.abs(v),2)+'° '+(v<0?'S':'N'),
    steeringLon:v=>fmt(Math.abs(v),2)+'° '+(v<0?'W':'E'),rows:v=>String(v),columns:v=>String(v),
    stride:v=>String(v)+' × λ/2',powerDBW:v=>fmt(v,1)+' dBW',normal:v=>v==='target'?'Toward Georgia':'Toward Earth’s center'
  };
  const colors={bg:'#081722',panel:'#102735',line:'#395362',text:'#edf7fb',muted:'#a6c2cf',teal:'#63dfc4',orange:'#ffb477',purple:'#c2a0ef',blue:'#7bb9ff'};

  function syncControls(){
    $('[data-gs-preset]').value=presetName;
    for(const input of controls){const key=input.dataset.gsParam;const locked=state.aperture==='explicit'&&['rows','columns','stride'].includes(key);input.disabled=locked;if(['phaseX','phaseY'].includes(key))input.step=state.aperture==='explicit'?'.1':'2';if(key==='longitude')input.step=state.aperture==='explicit'?'.01':'.5';if(input.type==='checkbox')input.checked=Boolean(state[key]);else input.value=state[key];const out=root.querySelector(`[data-gs-output="${key}"]`);if(out)out.textContent=locked?'Saved':(fields[key]||String)(state[key]);}
    const e=(result?.elements||[]).find(x=>x.id===selected);
    if(!e){selected=result?.elements?.[0]?.id||'r0c0';}
    const select=$('[data-gs-element]'),old=select.value;
    const signature=(result?.elements||[]).map(e=>e.id+(e.installed?'1':'0')).join(',');
    if(select.dataset.signature!==signature){
      select.replaceChildren(...(result?.elements||[]).map(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=(state.aperture==='explicit'?`Feed ${e.id.replace('feed','')*1+1} · (${e.gx}, ${e.gy}) λ/2`:`Row ${e.row+1}, column ${e.col+1}`)+(e.installed?'':' · removed');return o;}));
      select.dataset.signature=signature;
    }
    select.value=selected||old;
    const current=(result?.elements||[]).find(x=>x.id===selected);
    const offset=Number(state.phaseOffsets?.[selected]||0);
    $('[data-gs-element-phase]').value=offset;
    $('[data-gs-phase-output]').textContent=fmt(offset,0)+'°';
    $('[data-gs-feed-phase]').textContent=current&&current.installed?fmt(wrap(current.phaseDeg),1)+'°':'Removed';
    const remove=$('[data-gs-remove]');remove.textContent=current?.installed?'Remove element':'Install element';remove.setAttribute('aria-pressed',String(!current?.installed));
    $('[data-gs-play]').textContent=playing?'Pause waves':'Play waves';
    $('[data-gs-play]').setAttribute('aria-pressed',String(playing));
    $('[data-gs-power-colors]').setAttribute('aria-pressed',String(showPower));
    $('[data-gs-power-colors]').textContent=showPower?'Coverage colors':'Power colors';
    $('.gs-coverage-legend').hidden=showPower;
    $('[data-gs-power-key]').hidden=!showPower;
  }
  function update(){
    pending=false;
    try{
      result=Model.evaluateSystem(state);
      if(selectedCell)selectedCell=result.map.cells.find(c=>c.i===selectedCell.i&&c.j===selectedCell.j)||null;
      if(result.state)state=clone(result.state);
      const counts=result.counts;
      $('[data-gs-fom]').textContent=result.scoreStatus==='unbounded-regional'?'∞':typeof result.score==='number'?result.score.toExponential(3):'—';
      $('[data-gs-fom]').setAttribute('aria-label',result.scoreStatus==='unbounded-regional'?'Unbounded on this sampled regional grid':String(result.score));
      $('[data-gs-covered]').textContent=fmt(counts.ga?100*counts.coveredGA/counts.ga:0,1)+'%';
      $('[data-gs-covered-count]').textContent=fmt(counts.coveredGA,0)+' / '+fmt(counts.ga,0)+' samples';
      $('[data-gs-spill]').textContent=fmt(counts.outsideCovered,0);
      $('[data-gs-installed]').textContent=fmt(counts.installed,0);
      const fit=Model.fitPower(result);
      $('[data-gs-status]').textContent=result.scoreStatus!=='invalid-model'&&!Number.isFinite(fit)?'These settings cannot cover every Georgia sample within the power range.':result.eligibility?.eligible?'':(result.eligibility?.reason||'Install an element to evaluate the array.');
      $('[data-gs-normalization]').textContent=fmt(result.normalizationQ,3);
      $('[data-gs-fit]').disabled=!Number.isFinite(fit);
      root.dataset.ready='true';root.dataset.installed=String(counts.installed);root.dataset.score=String(result.score);
      syncControls();draw();
      root.dispatchEvent(new CustomEvent('georgia-system-update',{detail:{score:result.score,counts}}));
    }catch(error){$('[data-gs-status]').textContent='This parameter combination could not be evaluated.';console.error(error);}
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
  for(const input of controls)input.addEventListener('input',()=>{state[input.dataset.gsParam]=input.type==='checkbox'?input.checked:input.tagName==='SELECT'?input.value:Number(input.value);presetName='custom';schedule();});
  $('[data-gs-element]').addEventListener('change',e=>{selected=e.target.value;syncControls();draw();});
  $('[data-gs-element-phase]').addEventListener('input',e=>{state.phaseOffsets={...state.phaseOffsets,[selected]:Number(e.target.value)};presetName='custom';schedule();});
  $('[data-gs-remove]').addEventListener('click',()=>{const removed=new Set(state.removed||[]);if(removed.has(selected))removed.delete(selected);else removed.add(selected);state.removed=[...removed];presetName='custom';schedule();});
  $('[data-gs-fit]').addEventListener('click',()=>{const value=Model.fitPower(result),input=$('[data-gs-param="powerDBW"]');if(Number.isFinite(value)){if(value>Number(input.max)||value<Number(input.min)){$('[data-gs-status]').textContent=`Georgia needs about ${fmt(value,1)} dBW for this setting, beyond the ${input.min}–${input.max} dBW control range.`;return;}state.powerDBW=value;presetName='custom';schedule();}});
  $('[data-gs-reset]').addEventListener('click',()=>{state=clone(Model.DEFAULT_STATE);presetName='default';selected='r4c4';selectedCell=null;schedule();});
  $('[data-gs-preset]').addEventListener('change',e=>{if(e.target.value==='custom')return;presetName=e.target.value;state=presetName==='default'?clone(Model.DEFAULT_STATE):Model.preset(presetName);selected='r4c4';selectedCell=null;schedule();});
  $('[data-gs-play]').addEventListener('click',()=>{playing=!playing;syncControls();draw();});
  $('[data-gs-power-colors]').addEventListener('click',()=>{showPower=!showPower;syncControls();draw();});
  for(const tab of $$('[data-gs-view]'))tab.addEventListener('click',()=>{
    view=tab.dataset.gsView;
    for(const t of $$('[data-gs-view]')){const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;}
    $('[role="tabpanel"].gs-canvas-panel').setAttribute('aria-labelledby',tab.id);
    canvas.setAttribute('aria-label',view==='array'?'Array element positions and feed phases. Select elements with the element control below.':view==='georgia'?'Georgia received-power map from the current array.':'Satellite, Earth, Georgia, array elements and combined coverage.');
    draw();
  });
  for(const tab of $$('[data-gs-controls]'))tab.addEventListener('click',()=>{
    for(const t of $$('[data-gs-controls]')){const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;}
    for(const panel of $$('[data-gs-control-panel]'))panel.hidden=panel.dataset.gsControlPanel!==tab.dataset.gsControls;
  });
  for(const list of $$('[role="tablist"]'))list.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const tabs=[...list.querySelectorAll('[role="tab"]')],i=tabs.indexOf(document.activeElement);if(i<0)return;
    e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus();
  });
  reduced.addEventListener('change',e=>{if(e.matches){playing=false;syncControls();draw();}});

  function line(a,b,color,width=1,alpha=1){ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.globalAlpha=1;}
  function text(s,x,y,color=colors.text,size=12,align='left'){ctx.fillStyle=color;ctx.font=`${size}px ui-sans-serif,system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);}
  function circle(x,y,r,color,stroke=null,width=1){ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function roundRect(x,y,w,h,r=12,fill=colors.panel,stroke=colors.line){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function arrow(a,b,color,width=1.3){line(a,b,color,width);const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);const len=6;line(b,[b[0]-len*Math.cos(ang-.45),b[1]-len*Math.sin(ang-.45)],color,width);line(b,[b[0]-len*Math.cos(ang+.45),b[1]-len*Math.sin(ang+.45)],color,width);}
  function path(points,color,width=1,fill=null){if(!points.length)return;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}}
  function background(w,h){const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#102b3a');g.addColorStop(1,'#06101b');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(let i=0;i<36;i++)circle((i*137.3+17)%w,(i*83.7+23)%(h*.66),i%4===0?1.1:.6,'#93b1c2');}
  const cameraLon=rad(-60),cameraLat=rad(21);
  const camX=[-Math.sin(cameraLon),Math.cos(cameraLon),0],camY=[-Math.sin(cameraLat)*Math.cos(cameraLon),-Math.sin(cameraLat)*Math.sin(cameraLon),Math.cos(cameraLat)];
  const camZ=[Math.cos(cameraLat)*Math.cos(cameraLon),Math.cos(cameraLat)*Math.sin(cameraLon),Math.sin(cameraLat)];
  function earthPoint(lon,lat){return[Math.cos(rad(lat))*Math.cos(rad(lon)),Math.cos(rad(lat))*Math.sin(rad(lon)),Math.sin(rad(lat))];}
  function globeProject(p,center,radius){return[center[0]+radius*dot(p,camX),center[1]-radius*dot(p,camY)];}
  function boundary(){return Model.boundary||Model.GEORGIA_BOUNDARY||result?.map?.boundary||[[-85.6,35],[-83.1,35],[-82.9,34.1],[-81.2,32.1],[-80.85,32],[-81.35,30.7],[-82.3,30.65],[-84.9,30.75],[-85.25,32.5]];}
  function drawGlobe(cx,cy,r){
    const g=ctx.createRadialGradient(cx-r*.42,cy-r*.35,r*.08,cx,cy,r);g.addColorStop(0,'#246580');g.addColorStop(.75,'#123c57');g.addColorStop(1,'#071e31');circle(cx,cy,r,g,'#527d92');
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);ctx.clip();
    for(let lon=-180;lon<180;lon+=30){let chunk=[];for(let lat=-90;lat<=90;lat+=3){const p=earthPoint(lon,lat);if(dot(p,camZ)>0)chunk.push(globeProject(p,[cx,cy],r));else{path(chunk,'#32617a',.65);chunk=[];}}path(chunk,'#32617a',.65);}
    for(let lat=-60;lat<=60;lat+=30){let chunk=[];for(let lon=-180;lon<=180;lon+=3){const p=earthPoint(lon,lat);if(dot(p,camZ)>0)chunk.push(globeProject(p,[cx,cy],r));else{path(chunk,'#32617a',.65);chunk=[];}}path(chunk,'#32617a',.65);}
    // Low-detail continental outline anchors the Georgia patch on the globe.
    const northAmerica=[[-167,66],[-147,60],[-130,55],[-125,48],[-123,40],[-117,32],[-108,29],[-104,23],[-96,17],[-88,18],[-86,22],[-82,24],[-81,30],[-76,35],[-67,44],[-60,52],[-77,59],[-90,68],[-115,72],[-145,70]];
    path(northAmerica.filter(([lon,lat])=>dot(earthPoint(lon,lat),camZ)>0).map(([lon,lat])=>globeProject(earthPoint(lon,lat),[cx,cy],r)), '#6e9c93',.7,'#234f55');
    for(const cell of result.map.cells){if(!cell.covered)continue;const p=earthPoint(cell.lon,cell.lat);if(dot(p,camZ)>0){const [x,y]=globeProject(p,[cx,cy],r);circle(x,y,Math.max(1,r*.006),cell.inGA||cell.inGeorgia?colors.teal:colors.orange);}}
    const ga=boundary().map(([lon,lat])=>globeProject(earthPoint(lon,lat),[cx,cy],r));path([...ga,ga[0]],'#f6e8a9',1.7,'#e3d478');
    ctx.restore();
    const gaCenter=globeProject(earthPoint(-83.6,32.7),[cx,cy],r);circle(...gaCenter,3.5,colors.teal,'#ffffff',1.2);
    return gaCenter;
  }
  function drawSatellite(x,y,size){
    const wing=size*.95;roundRect(x-wing*2.2,y-size*.4,wing*1.35,size*.8,2,'#194c78','#82b7dd');roundRect(x+wing*.9,y-size*.4,wing*1.35,size*.8,2,'#194c78','#82b7dd');
    for(const sign of[-1,1])for(let j=0;j<3;j++){const px=x+sign*(wing*1.05+j*wing*.38);line([px,y-size*.37],[px,y+size*.37],'#497ca4',.7);}
    roundRect(x-size*.55,y-size*.6,size*1.1,size*1.2,3,'#b5c7d0','#eef7fd');circle(x,y+size*.55,size*.43,'#d6dfdf','#a8c4d2');
    arrow([x,y+size*.75],[x-size*.1,y+size*1.5],colors.orange,1.6);
  }
  function mapColor(cell){
    if(showPower){const t=clamp((cell.powerDBm??cell.receivedDBm??-150)+110,0,50)/50;return`hsl(${225-185*t} ${60+20*t}% ${14+42*t}%)`;}
    if(cell.inGA||cell.inGeorgia)return cell.covered?'#4bc6ab':'#72528a';
    return cell.covered?'#d88e58':'#143244';
  }
  function drawMap(box,detailed=false){
    const {x,y,w,h}=box;roundRect(x,y,w,h,12,'#0a202e','#456170');
    text(w<220?'Georgia':'Georgia coverage',x+15,y+20,colors.text,w<220?11:13);
    const pad=detailed?43:22,top=detailed?53:35,bottom=detailed?40:23;
    const space={x:x+pad,y:y+top,w:w-pad-15,h:h-top-bottom};
    const b=result.map.bounds;
    const loMin=Array.isArray(b)?b[0]:(b.west??b.lonMin??b.minLon??-89),loMax=Array.isArray(b)?b[1]:(b.east??b.lonMax??b.maxLon??-79);
    const laMin=Array.isArray(b)?b[2]:(b.south??b.latMin??b.minLat??28.5),laMax=Array.isArray(b)?b[3]:(b.north??b.latMax??b.maxLat??37);
    // Equal-distance map scale at the regional mid-latitude preserves Georgia's shape.
    const mapAspect=(loMax-loMin)*Math.cos(rad((laMin+laMax)/2))/(laMax-laMin);
    const mapW=Math.min(space.w,space.h*mapAspect),mapH=mapW/mapAspect;
    const area={x:space.x+(space.w-mapW)/2,y:space.y+(space.h-mapH)/2,w:mapW,h:mapH};
    root.dataset.mapAspect=String(mapAspect);root.dataset.mapRenderedAspect=String(area.w/area.h);
    const X=lo=>area.x+(lo-loMin)/(loMax-loMin)*area.w,Y=la=>area.y+(laMax-la)/(laMax-laMin)*area.h;
    const cw=area.w/result.map.nx,ch=area.h/result.map.ny;
    mapHits=[];
    for(const cell of result.map.cells){const px=X(cell.lon)-cw/2,py=Y(cell.lat)-ch/2;ctx.fillStyle=mapColor(cell);ctx.fillRect(px,py,cw+.25,ch+.25);if(detailed)mapHits.push({x:px,y:py,w:cw,h:ch,cell});}
    const ga=boundary().map(([lo,la])=>[X(lo),Y(la)]);path([...ga,ga[0]],'#f5eed6',1.6);
    text('GEORGIA',X(-83.6),Y(32.8),'#ffffff',detailed?15:10,'center');
    if(detailed){
      for(let lo=Math.ceil(loMin);lo<=loMax;lo+=2)text(lo+'°',X(lo),area.y+area.h+15,colors.muted,10,'center');
      for(let la=Math.ceil(laMin);la<=laMax;la+=2)text(la+'°',area.x-9,Y(la),colors.muted,10,'right');
      text('Longitude',area.x+area.w/2,y+h-10,colors.muted,10,'center');
      const marker=selectedCell||result.map.cells.find(c=>(c.inGA||c.inGeorgia)&&c.covered)||result.map.cells.find(c=>c.inGA||c.inGeorgia);
      if(marker){circle(X(marker.lon),Y(marker.lat),5,'transparent','#fff',1.5);const p=marker.powerDBm??marker.receivedDBm;text(`${fmt(marker.lat,2)}° N, ${fmt(Math.abs(marker.lon),2)}° W · ${fmt(p,1)} dBm`,x+15,y+39,colors.muted,w<350?9:11);}
    }else if(w>=270){text('−80 dBm threshold',x+w-14,y+20,colors.muted,10,'right');}
  }
  function drawArray(box,detailed=false){
    const {x,y,w,h}=box;roundRect(x,y,w,h,12,'#0d2130','#4a6476');
    text(w<220?'Array':'Array · enlarged',x+15,y+20,colors.text,w<220?11:13);if(w>=250)text('Feed phase',x+w-14,y+20,colors.muted,10,'right');
    const padding=detailed?53:33,availableH=Math.max(10,h-(detailed?112:75)),availableW=Math.max(10,w-2*padding);
    const sites=result.elements.length?result.elements:[{x:0,y:0}];
    const xmin=Math.min(...sites.map(e=>e.x)),xmax=Math.max(...sites.map(e=>e.x)),ymin=Math.min(...sites.map(e=>e.y)),ymax=Math.max(...sites.map(e=>e.y));
    const scale=Math.min(availableW/Math.max(xmax-xmin,result.wavelengthM/2),availableH/Math.max(ymax-ymin,result.wavelengthM/2));
    const gridW=(xmax-xmin)*scale,gridH=(ymax-ymin)*scale,sx=x+w/2-gridW/2,sy=y+42+(availableH-gridH)/2;
    const cell=state.aperture==='explicit'?Math.min(availableW,availableH)/Math.max(1,Math.sqrt(result.elements.length)):result.spacingM*scale;
    elementHits=[];
    for(const e of result.elements){const px=sx+(e.x-xmin)*scale,py=sy+(ymax-e.y)*scale;const selectedNow=e.id===selected;const radius=clamp(cell*.20,2.1,detailed?9:5.5);
      if(e.installed){
        const phase=e.phase??rad(e.phaseDeg||0),color=hue(e.phaseDeg||0);circle(px,py,radius,color);
        if(cell>9)arrow([px,py],[px+cell*.32*Math.cos(phase),py-cell*.32*Math.sin(phase)],color,.9);
        if(playing&&selectedNow){ctx.strokeStyle=color;ctx.globalAlpha=.5;ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,radius+3+((time*8)%Math.max(6,cell*.7)),0,2*Math.PI);ctx.stroke();ctx.globalAlpha=1;}
      }else{line([px-radius,py-radius],[px+radius,py+radius],colors.line,1);line([px-radius,py+radius],[px+radius,py-radius],colors.line,1);}
      if(selectedNow){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.strokeRect(px-radius-3,py-radius-3,2*radius+6,2*radius+6);}
      elementHits.push({id:e.id,x:px,y:py,r:Math.max(8,cell*.48)});
    }
    const extX=xmax-xmin,extY=ymax-ymin;
    text(`${fmt(extX*1000,1)} × ${fmt(extY*1000,1)} mm`,x+14,y+h-18,colors.muted,w<250?8:10);
    if(w>=290){const legendX=x+w-135,legendY=y+h-20;
    for(let i=0;i<90;i++){ctx.fillStyle=hue(-180+4*i);ctx.fillRect(legendX+i*1.2,legendY-5,1.3,7);}
    text('−180°',legendX,legendY+10,colors.muted,8);text('0°',legendX+54,legendY+10,colors.muted,8,'center');text('+180°',legendX+108,legendY+10,colors.muted,8,'right');
    }
    if(detailed){
      text('x',sx+gridW+17,sy+gridH,colors.muted,12);text('y',sx-16,sy-7,colors.muted,12);
      text('Equal-amplitude installed feeds',x+w/2,y+h-57,colors.muted,w<300?9:11,'center');
    }
    return elementHits.find(e=>e.id===selected)||{x:x+w/2,y:y+h/2};
  }
  function drawPhasors(x,y,r){
    const list=result.contributions||result.target?.contributions||[];
    const on=list.filter(c=>result.elements.find(e=>e.id===c.elementId)?.installed!==false);
    circle(x,y,r,'#102735','#3d5b6b');line([x-r,y],[x+r,y],colors.line,.6);line([x,y-r],[x,y+r],colors.line,.6);
    let re=0,im=0;
    for(const item of on){const pr=item.re??Math.cos(item.phase||0),pi=item.im??Math.sin(item.phase||0);re+=pr;im+=pi;const e=result.elements.find(e=>e.id===item.elementId);line([x,y],[x+r*.8*pr,y-r*.8*pi],item.elementId===selected?colors.orange:'#7cb1c6',item.elementId===selected?1.8:.7,item.elementId===selected?1:.18);}
    const n=on.length,ratio=n?Math.hypot(re,im)/n:null;if(n)arrow([x,y],[x+r*.8*re/n,y-r*.8*im/n],colors.teal,2.2);
    text('At Georgia center',x,y-r-13,colors.text,11,'center');text(n?'|Σ field| / N = '+fmt(ratio,3):'No installed elements',x,y+r+15,colors.muted,10,'center');
  }
  function drawSystem(w,h){
    const mobile=w<570;
    const globe={x:w*(mobile?.35:.29),y:h*(mobile?.25:.32),r:Math.min(w*(mobile?.27:.19),h*.25)};
    const ga=drawGlobe(globe.x,globe.y,globe.r);
    text('Earth',globe.x,globe.y+globe.r+17,colors.muted,12,'center');
    const slon=rad(state.longitude),dir=[Math.cos(slon),Math.sin(slon),0];
    const sx=w*(mobile?.77:.78)+(state.longitude+84)*w*.0014,sy=h*(mobile?.16:.20);
    drawSatellite(sx,sy,mobile?13:18);text('GEO satellite',sx,sy-36,colors.text,mobile?10:13,'center');text(fmt(state.longitude,1)+'° longitude',sx,sy+42,colors.muted,10,'center');
    const total=result.counts.installed;
    const beamVisible=result.probe?.visible!==false&&total>0;
    line([sx,sy],[...ga],beamVisible?colors.teal:colors.line,1.6,.7);
    const normal=result.basis?.normal;
    if(normal){const delta=[dot(normal,camX),-dot(normal,camY)];const u=unit(delta);arrow([sx,sy],[sx+u[0]*53,sy+u[1]*53],colors.orange,1.3);}
    const rayCount=mobile?6:12;
    for(let i=0;i<rayCount;i++){
      const p=(time*.13+i/rayCount)%1,x=sx+(ga[0]-sx)*p,y=sy+(ga[1]-sy)*p;
      if(playing&&beamVisible){const angle=Math.atan2(ga[1]-sy,ga[0]-sx),size=4+8*p;line([x-size*Math.sin(angle),y+size*Math.cos(angle)],[x+size*Math.sin(angle),y-size*Math.cos(angle)],colors.teal,.9,.15+.5*(1-p));}
    }
    text(beamVisible?'Combined field':'Target outside forward beam',sx+(ga[0]-sx)*.5,sy+(ga[1]-sy)*.5-16,beamVisible?colors.teal:colors.muted,mobile?10:12,'center');
    const gap=14,pad=14;
    const insetY=h*(mobile?.49:.59),insetH=h-insetY-15;
    const mapBox={x:pad,y:insetY,w:(w-3*gap)*.48,h:insetH};
    const arrayBox={x:mapBox.x+mapBox.w+gap,y:insetY,w:w-mapBox.w-3*gap,h:insetH};
    drawMap(mapBox,false);const element=drawArray(arrayBox,false);
    line(ga,[mapBox.x+mapBox.w*.55,mapBox.y],colors.muted,.8,.45);
    line([sx,sy+28],[arrayBox.x+arrayBox.w*.5,arrayBox.y],colors.muted,.8,.45);
    if(!mobile){drawPhasors(w*.76,h*.43,33);}
    text('Georgia',ga[0]-12,ga[1]-18,'#fff2b6',11,'right');
    if(beamVisible&&playing){
      const selectedElement=result.elements.find(e=>e.id===selected);
      if(selectedElement?.installed){const phase=rad(selectedElement.phaseDeg||0);for(let i=0;i<3;i++){const a=time*2+phase+i*2.1;const tx=mapBox.x+mapBox.w*(.4+.12*Math.sin(a)),ty=mapBox.y+mapBox.h*.48;ctx.globalAlpha=.14;line([element.x,element.y],[tx,ty],hue(selectedElement.phaseDeg||0),1);ctx.globalAlpha=1;}}
    }
  }
  function draw(){
    if(!result||!ctx)return;
    const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);background(w,h);
    elementHits=[];mapHits=[];
    if(view==='system')drawSystem(w,h);
    else if(view==='array'){
      const mobile=w<570,box={x:14,y:14,w:w-(mobile?28:190),h:h-(mobile?120:35)};drawArray(box,true);
      if(mobile)drawPhasors(w/2,h-64,28);else drawPhasors(w-88,h/2,42);
    }else drawMap({x:14,y:14,w:w-28,h:h-28},true);
  }
  canvas.addEventListener('pointerdown',e=>{
    const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const hit=elementHits.reduce((best,p)=>Math.hypot(p.x-x,p.y-y)<p.r&&(!best||Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y))?p:best,null);
    if(hit){selected=hit.id;syncControls();draw();return;}
    const cell=mapHits.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h);if(cell){selectedCell=cell.cell;draw();}
  });
  new ResizeObserver(draw).observe(canvas);
  const tick=now=>{if(lastTime&&playing)time+=Math.min((now-lastTime)/1000,.1);lastTime=now;if(playing&&!document.hidden)draw();renderFrame=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',()=>{lastTime=0;});
  update();renderFrame=requestAnimationFrame(tick);
  const api={getState:()=>clone(state),setState:patch=>{state={...state,...clone(patch)};presetName='custom';update();},selectElement:id=>{selected=id;syncControls();draw();},get result(){return result;},get view(){return view;},draw,pause:()=>{playing=false;syncControls();draw();}};
  window.GeorgiaSystemUI=api;window.GeorgiaSystemExplorer=api;
})();
