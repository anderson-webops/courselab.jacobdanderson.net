/* Project figures share the course models; schematic geometry and masks stay explicit. */
(() => {
  'use strict';
  const {modules,U}=window.CourseLab, $=id=>document.getElementById(id);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
  const state={longitude:-90,normal:'target',phase:0,frequency:30,beamwidth:2,peak:-72};
  const scope='Illustrative model';
  for(const mount of document.querySelectorAll('[data-project-module]')){
    const module=modules.find(m=>m.id===mount.dataset.projectModule),values=Object.fromEntries(module.controls.map(c=>[c.id,c.value]));
    const figure=document.createElement('figure'),workspace=document.createElement('div');workspace.className='workspace';
    const visual=document.createElement('div');visual.className='visual';
    const graphic=document.createElement('div');graphic.className='figure';graphic.tabIndex=0;graphic.setAttribute('role','region');graphic.setAttribute('aria-label',module.heading);
    const stats=document.createElement('div');stats.className='stats';stats.setAttribute('aria-live','polite');visual.append(graphic,stats);
    const controls=document.createElement('div');controls.className='controls';
    const equation=document.createElement('div');equation.className='project-caption-equation';
    const note=document.createElement('p');note.className='model-scope';
    const outputs=new Map();
    const draw=()=>{
      const r=module.render(values,U);graphic.innerHTML=r.svg;
      stats.innerHTML=(r.stats||[]).slice(0,3).map(s=>'<div class="stat"><span>'+U.esc(s[0])+'</span><strong>'+U.esc(s[1])+'</strong></div>').join('');
      equation.innerHTML=r.equation||'';note.textContent=r.note||scope;
      for(const c of module.controls){const out=outputs.get(c.id);out.textContent=U.fmt(values[c.id],3)+(c.unit?' '+c.unit:'');}
    };
    for(const c of module.controls){
      const wrap=document.createElement('div');wrap.className='control';const label=document.createElement('label'),name=document.createElement('span'),out=document.createElement('output');
      name.textContent=c.label;label.append(name,out);const input=document.createElement(c.options?'select':'input');
      input.id='project-'+module.id+'-'+c.id;label.htmlFor=input.id;out.htmlFor=input.id;outputs.set(c.id,out);
      if(c.options)for(const option of c.options){const o=document.createElement('option');o.value=option.value;o.textContent=option.label;input.append(o);}
      else{input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;}
      input.value=values[c.id];input.addEventListener('input',()=>{values[c.id]=Number(input.value);draw();});wrap.append(label,input);controls.append(wrap);
    }
    workspace.append(visual,controls);figure.append(workspace);const caption=document.createElement('figcaption');caption.textContent='Fig. '+mount.dataset.figure+'. '+module.heading+'.';figure.append(caption);mount.append(figure,equation,note);draw();
  }
  function geometry(){
    const R=6400,Rs=42400,L=U.rad(33),lon=U.rad(-84),slon=U.rad(state.longitude);
    const satellite=[Rs*Math.cos(slon),Rs*Math.sin(slon),0],station=[R*Math.cos(L)*Math.cos(lon),R*Math.cos(L)*Math.sin(lon),R*Math.sin(L)];
    const fromSat=unit(sub(station,satellite)),nadir=unit(satellite.map(x=>-x)),normal=state.normal==='target'?fromSat:nadir;
    const towardSat=unit(sub(satellite,station)),elevation=Math.asin(U.clamp(dot(towardSat,unit(station)),-1,1)),scan=state.normal==='target'?0:Math.acos(U.clamp(dot(fromSat,normal),-1,1));
    const project=p=>[300+.006*(.8*p[0]-.6*p[1]),260+.006*(.36*p[0]+.48*p[1]-.8*p[2])],a=project(satellite),b=project(station),norm=project(satellite.map((x,i)=>x+normal[i]*9000));
    const plane=unit([normal[1],-normal[0],0]),p1=project(satellite.map((x,i)=>x+plane[i]*3500)),p2=project(satellite.map((x,i)=>x-plane[i]*3500));
    let s=U.circle(300,260,R*.006,'none',U.C.c)+`<ellipse cx="300" cy="260" rx="${R*.006}" ry="${R*.006*.6}" fill="none" stroke="${U.C.grid}"/>`;
    s+=U.line(...a,300,260,U.C.c,1.5,'5 5')+U.arrow(...a,...b,U.C.a)+U.arrow(...a,...norm,U.C.b)+U.line(...p1,...p2,U.C.d,5)+U.circle(...b,4,U.C.a,U.C.a)+U.circle(...a,5,U.C.d,U.C.d);
    s+=U.text(240,320,'Earth')+U.text(b[0]-15,b[1]+24,'Target','end')+U.text(a[0]+12,a[1]-15,'GEO satellite')+U.text(40,38,'Earth-fixed 3-D geometry, shown in an oblique projection');
    s+=U.text(570,90,'Target: 33°N, 84°W')+U.text(570,130,'Slant range: '+U.fmt(Math.hypot(...sub(satellite,station)),0)+' km')+U.text(570,170,'Ground elevation: '+U.fmt(U.deg(elevation),1)+'°')+U.text(570,210,'Array scan: '+U.fmt(U.deg(scan),2)+'°');
    s+=U.line(70,380,110,380,U.C.a,3)+U.text(125,386,'Target ray')+U.line(330,380,370,380,U.C.b,3)+U.text(385,386,'Array normal')+U.line(580,380,620,380,U.C.c,2,'5 5')+U.text(635,386,'Nadir')+U.text(65,432,'GEO and Earth radii use their physical ratio; the antenna symbol is enlarged.');
    $('project-geometry').innerHTML=U.svg(s,'Satellite-to-target ray, array normal and nadir with ground elevation',800,470);
    $('project-longitude-value').textContent=state.longitude+'°';
    return{scan:U.deg(scan),elevation:U.deg(elevation),range:Math.hypot(...sub(satellite,station))};
  }
  function elements(){
    let s=U.text(60,35,'Local aperture coordinates: z is the outward normal'),totalRe=0,totalIm=0;
    for(let y=0;y<5;y++)for(let x=0;x<5;x++){
      const cx=110+x*62,cy=329-y*56,phase=x*U.rad(state.phase);totalRe+=Math.cos(phase);totalIm+=Math.sin(phase);
      s+=U.circle(cx,cy,6,U.C.a,U.C.a)+U.arrow(cx,cy,cx+22*Math.cos(phase),cy-22*Math.sin(phase),U.C.b);
    }
    s+=U.arrow(100,370,390,370,U.C.muted)+U.text(400,375,'x')+U.arrow(70,350,70,80,U.C.muted)+U.text(57,65,'y')+U.text(480,90,'Position rₙ = (xₙ,yₙ,0)')+U.text(480,140,'Common |aₙ| = 1')+U.text(480,190,'Phase ψₙ = x-index × βx')+U.text(480,240,'Wavelength: '+U.fmt(299.792458/state.frequency,3)+' mm')+U.text(480,285,'λ/2 spacing: '+U.fmt(149.896229/state.frequency,3)+' mm')+U.text(480,340,'Broadside |Σ feed phasors|²:')+U.text(480,380,U.fmt(totalRe**2+totalIm**2,2)+' (relative field²)');
    $('project-elements').innerHTML=U.svg(s,'Five by five equal-amplitude feed lattice with phase arrows');
    $('project-phase-value').textContent=state.phase+'°';$('project-frequency-value').textContent=state.frequency+' GHz';
  }
  // Coarse author-drawn boundary for categorical teaching, independent of the course MAT.
  const boundary=[[-85.6,35],[-83.1,35],[-83.35,34.75],[-83.1,34.6],[-82.9,34.1],[-82.3,33.6],[-81.9,33.3],[-81.8,32.8],[-81.4,32.5],[-81.2,32.1],[-80.85,32],[-81.1,31.5],[-81.35,30.7],[-81.8,30.85],[-82,30.4],[-82.3,30.65],[-84.9,30.75],[-85.1,31.2],[-85,31.8],[-85.25,32.5],[-85.15,32.8]];
  const inside=(x,y)=>{let hit=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){let a=boundary[i],b=boundary[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  function coverage(){
    const nx=42,ny=36,w=420,h=360,X=x=>70+(x+87)/7*w,Y=y=>35+(36-y)/6*h;
    let s='',miss=0,spill=0,covered=0;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const lon=-87+7*(i+.5)/nx,lat=36-6*(j+.5)/ny,inTarget=inside(lon,lat),power=state.peak-12*(((lon+83.6)/state.beamwidth)**2+((lat-32.7)/(1.2*state.beamwidth))**2),on=power>=-80;
      if(inTarget&&!on)miss++;if(!inTarget&&on)spill++;if(inTarget&&on)covered++;
      const color=inTarget?(on?U.C.a:U.C.d):(on?U.C.b:U.C.grid);
      s+=`<rect x="${70+i*w/nx}" y="${35+j*h/ny}" width="${w/nx+.1}" height="${h/ny+.1}" fill="${color}" opacity=".8"/>`;
    }
    s+=U.path(boundary.concat([boundary[0]]).map(([x,y])=>[X(x),Y(y)]),U.C.ink,2);
    for(let lon=-87;lon<=-80;lon++)s+=U.text(X(lon),420,lon,'middle');
    for(let lat=30;lat<=36;lat++)s+=U.text(55,Y(lat)+5,lat,'end');
    s+=U.text(280,455,'Longitude (degrees east)','middle')+U.text(530,65,'Latitude: degrees north')+U.text(530,115,'Threshold: −80 dBm')+U.text(530,180,'Inside covered: '+covered)+U.text(530,225,'Inside missed: '+miss)+U.text(530,270,'Outside at/above threshold: '+spill)+U.text(530,345,'Teal: inside and covered')+U.text(530,380,'Purple: inside and missed')+U.text(530,415,'Orange: outside spillover');
    $('project-coverage').innerHTML=U.svg(s,'Schematic Georgia coverage classification for a Gaussian teaching footprint',800,485);
    $('project-beamwidth-value').textContent=U.fmt(state.beamwidth,1)+'° map scale';$('project-peak-value').textContent=state.peak+' dBm';return{miss,spill,covered};
  }
  function pipeline(){
    const steps=[['Geometry','rES, rSAT, ray, range','Fig. 1'],['Feeds','rₙ, |aₙ|, ψₙ','Fig. 2'],['Complex field','Path + phase → AF','Figs. 3–4'],['Angular power','p = |AF|² Gₑₗ','Fig. 5'],['Absolute gain','Full-pattern ∫p dΩ','Fig. 5'],['Link budget','Pt, Gt, Gr, λ, R','Fig. 6'],['Map decisions','Threshold + target mask','Fig. 7'],['Design comparison','Coverage, Ninstalled','Complete evaluation']];let s='';
    steps.forEach((step,i)=>{const row=i<4?0:1,col=i<4?i:7-i,x=30+col*192,y=45+row*220;
      s+=`<rect x="${x}" y="${y}" width="164" height="145" rx="6" fill="none" stroke="${U.C.grid}"/>`+U.text(x+82,y+35,step[0],'middle')+U.text(x+82,y+75,step[1],'middle')+U.text(x+82,y+115,step[2],'middle',U.C.muted);
      if(i<3)s+=U.arrow(x+166,y+72,x+188,y+72,U.C.a);if(i>=4&&i<7)s+=U.arrow(x-3,y+72,x-25,y+72,U.C.a);if(i===3)s+=U.arrow(x+82,y+148,x+82,y+212,U.C.a);
    });$('project-pipeline').innerHTML=U.svg(s,'Geometry to feeds, complex field, normalized gain, link, map and comparison',800,455);
  }
  for(const key of ['longitude','normal','phase','frequency','beamwidth','peak'])$('project-'+key).addEventListener('input',e=>{state[key]=key==='normal'?e.target.value:Number(e.target.value);draw();});
  function draw(){geometry();elements();coverage();}
  draw();pipeline();window.ProjectFigures={state,draw,geometry,coverage};
})();
