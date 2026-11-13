/* Project figures share the course models; schematic geometry and masks stay explicit. */
(() => {
  'use strict';
  const {modules,U}=window.CourseLab, $=id=>document.getElementById(id);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const state={longitude:-90,normal:'target',rays:'both',axes:true,steer:true,phase:0,frequency:30,beamwidth:2,peak:-72};
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
    // Subtract in one Earth-fixed frame before projecting onto either local frame.
    const transmitVector=sub(station,satellite),lookVector=sub(satellite,station),range=Math.hypot(...lookVector),fromSat=unit(transmitVector);
    const nadir=unit(satellite.map(x=>-x)),normal=state.normal==='target'?fromSat:nadir;
    const east=[-Math.sin(lon),Math.cos(lon),0],north=[-Math.sin(L)*Math.cos(lon),-Math.sin(L)*Math.sin(lon),Math.cos(L)],up=unit(station);
    const stationComponents=[east,north,up].map(axis=>dot(lookVector,axis));
    const elevation=Math.atan2(stationComponents[2],Math.hypot(...stationComponents.slice(0,2))),azimuth=(U.deg(Math.atan2(stationComponents[0],stationComponents[1]))+360)%360;
    // xA lies in the equatorial plane; yA = zA cross xA keeps the aperture frame right-handed.
    const xA=unit([normal[1],-normal[0],0]),yA=cross(normal,xA),arrayComponents=[xA,yA,normal].map(axis=>dot(fromSat,axis));
    const scan=Math.acos(U.clamp(arrayComponents[2],-1,1)),beam=state.steer?fromSat:normal;
    const beamScan=Math.acos(U.clamp(dot(beam,normal),-1,1)),beamError=Math.acos(U.clamp(dot(beam,fromSat),-1,1));
    const project=p=>[250+.005*(.8*p[0]-.6*p[1]),235+.005*(.36*p[0]+.48*p[1]-.8*p[2])],a=project(satellite),b=project(station);
    const offset=(p,v,length)=>p.map((x,i)=>x+v[i]*length),end=v=>project(offset(satellite,v,10000));
    const p1=project(offset(satellite,xA,3500)),p2=project(offset(satellite,xA,-3500));
    let s=U.text(40,30,'Same Earth-fixed XYZ frame: subtract first, then use the observer’s axes');
    s+=U.circle(250,235,R*.005,'var(--earth)',U.C.c)+`<ellipse cx="250" cy="235" rx="${R*.005}" ry="${R*.005*.6}" fill="none" stroke="${U.C.grid}"/>`;
    s+=U.line(...a,250,235,U.C.muted,1.5,'5 5')+U.line(...a,...b,U.C.grid,1.5);
    if(state.rays!=='look')s+='<g data-ray="transmit">'+U.arrow(...a,...project(offset(satellite,fromSat,range*.58)),U.C.a)+'</g>';
    if(state.rays!=='transmit')s+='<g data-ray="look">'+U.arrow(...b,...project(offset(station,unit(lookVector),range*.25)),U.C.c)+'</g>';
    s+=U.arrow(...a,...end(normal),U.C.b)+U.line(...p1,...p2,U.C.d,5);
    s+='<g data-beam="'+(state.steer?'target':'broadside')+'">'+U.arrow(...a,...project(offset(satellite,beam,14500)),U.C.a)+'</g>';
    s+=U.circle(...b,4,U.C.a,U.C.a)+U.circle(...a,5,U.C.d,U.C.d)+U.text(210,292,'Earth')+U.text(b[0]-10,b[1]+23,'Station / target','end')+U.text(a[0]-10,a[1]-15,'Satellite','end');
    s+=U.text(500,74,'Target: 33°N, 84°W')+U.text(500,108,'Slant range: '+U.fmt(range,0)+' km')+U.text(500,142,'Az '+U.fmt(azimuth,1)+'°   El '+U.fmt(U.deg(elevation),1)+'°');
    s+=U.text(500,184,'Required target scan: '+U.fmt(U.deg(scan),2)+'°')+U.text(500,216,'Actual beam scan: '+U.fmt(U.deg(beamScan),2)+'°')+U.text(500,248,state.steer?'Beam commanded toward target':'Beam stays broadside to the array');
    s+=U.text(500,282,'dTX = rTarget − rSat')+U.text(500,310,'dlook = rSat − rTarget = −dTX');
    s+=U.line(55,340,85,340,U.C.a,3)+U.text(95,346,'Downlink / beam')+U.line(285,340,315,340,U.C.c,3)+U.text(325,346,'Look ray')+U.line(455,340,485,340,U.C.b,3)+U.text(495,346,'Normal zA')+U.line(645,340,675,340,U.C.muted,2,'5 5')+U.text(685,346,'Nadir');

    // Enlarged local insets share the oblique projection, but their arrows show unit directions.
    const local=(origin,v,len=70)=>[origin[0]+len*(.8*v[0]-.6*v[1]),origin[1]+len*(.36*v[0]+.48*v[1]-.8*v[2])];
    const ground=[215,475],array=[600,475];
    s+=U.text(55,390,'Station frame: project dlook onto E, N, U')+U.text(430,390,'Aperture frame: project the unit downlink');
    s+=U.circle(...ground,4,U.C.c,U.C.c)+U.circle(...array,4,U.C.d,U.C.d);
    if(state.axes){
      s+='<g data-local-axes="station">';
      for(const [v,label,dx,dy]of[[east,'E',8,6],[north,'N',-12,-7],[up,'U',8,-7]]){const p=local(ground,v);s+=U.arrow(...ground,...p,U.C.muted)+U.text(p[0]+dx,p[1]+dy,label);}
      s+='</g><g data-local-axes="aperture">';
      for(const [v,label,dx,dy]of[[xA,'xA',8,6],[yA,'yA',7,12],[normal,'zA',-30,-12]]){const p=local(array,v);s+=U.arrow(...array,...p,U.C.muted)+U.text(p[0]+dx,p[1]+dy,label);}
      s+='</g>';
    }
    if(state.rays!=='transmit')s+=U.arrow(...ground,...local(ground,unit(lookVector),105),U.C.c);
    s+=U.arrow(...array,...local(array,normal,90),U.C.b)+U.arrow(...array,...local(array,beam,110),U.C.a);
    s+=U.text(55,568,'E = '+U.fmt(stationComponents[0],0)+'; N = '+U.fmt(stationComponents[1],0)+' km')+U.text(55,594,'U = '+U.fmt(stationComponents[2],0)+' km; El = '+U.fmt(U.deg(elevation),1)+'°');
    s+=U.text(430,568,'u = '+U.fmt(arrayComponents[0],3)+'; v = '+U.fmt(arrayComponents[1],3)) +U.text(430,594,'w = '+U.fmt(arrayComponents[2],3)+'; target offset = '+U.deg(beamError).toFixed(2)+'°');
    s+=U.text(55,635,'Local arrows and antenna symbols are enlarged. Earth and GEO radii share one scale.');
    $('project-geometry').innerHTML=U.svg(s,'Forward and reverse rays, station ENU and aperture frames, physical normal and electronically steered beam',800,665);
    $('project-longitude-value').textContent=state.longitude+'°';
    return{scan:U.deg(scan),beamScan:U.deg(beamScan),beamError:U.deg(beamError),elevation:U.deg(elevation),azimuth,range,satellite,station,transmitVector,lookVector,arrayNormal:normal,arrayAxes:[xA,yA,normal],stationAxes:[east,north,up],arrayComponents,stationComponents,beamVector:beam};
  }
  function elements(){
    const yaw=U.rad(35),elevation=U.rad(27),scale=48;
    const project=([x,y,z])=>[230+scale*(Math.cos(yaw)*x-Math.sin(yaw)*y),235+scale*(Math.sin(elevation)*(Math.sin(yaw)*x+Math.cos(yaw)*y)-Math.cos(elevation)*z)];
    const corners=[[-2.55,-2.55,0],[2.55,-2.55,0],[2.55,2.55,0],[-2.55,2.55,0]];
    const polygon=(points,color,opacity)=>`<polygon points="${points.map(p=>project(p).join(',')).join(' ')}" fill="${color}" fill-opacity="${opacity}" stroke="${U.C.grid}"/>`;
    let s=U.text(60,35,'Physical aperture: xA–yA plane, with outward normal zA'),totalRe=0,totalIm=0;
    s+='<g data-aperture-plane="oblique-3d">'+polygon(corners.map(([x,y])=>[x,y,-.18]),U.C.muted,.1);
    for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];s+=polygon([a,b,[b[0],b[1],-.18],[a[0],a[1],-.18]],U.C.muted,.12);}
    s+=polygon(corners,U.C.c,.09);
    for(let i=-2;i<=2;i++)s+=U.line(...project([i,-2.45,0]),...project([i,2.45,0]),U.C.grid)+U.line(...project([-2.45,i,0]),...project([2.45,i,0]),U.C.grid);
    s+='</g>';
    const axisOrigin=project([-2.8,-2.8,0]);
    for(const [vector,label,dx,dy]of[[[3,-2.8,0],'xA',9,6],[[-2.8,3,0],'yA',-20,6]]){const p=project(vector);s+='<g data-spatial-axis="'+label+'">'+U.arrow(...axisOrigin,...p,U.C.muted)+U.text(p[0]+dx,p[1]+dy,label)+'</g>';}
    const normal=project([0,0,2.45]);s+='<g data-spatial-axis="zA">'+U.arrow(...project([0,0,0]),...normal,U.C.d)+U.text(normal[0]+10,normal[1]-6,'zA / normal')+'</g>';
    const sites=[];for(let y=0;y<5;y++)for(let x=0;x<5;x++)sites.push({x,y,depth:(x-2)*Math.sin(yaw)+(y-2)*Math.cos(yaw)});
    for(const {x,y}of sites.sort((a,b)=>a.depth-b.depth)){
      const base=project([x-2,y-2,0]),tip=project([x-2,y-2,.24]),phase=x*U.rad(state.phase),installed=x!==2||y!==2;
      s+='<g data-feed-site="'+x+','+y+'" data-installed="'+installed+'">';
      if(!installed){s+=U.circle(...base,6,'none',U.C.muted)+'</g>';continue;}
      totalRe+=Math.cos(phase);totalIm+=Math.sin(phase);
      s+=U.line(...base,...tip,U.C.muted,2)+U.circle(...base,3,U.C.a,U.C.a);
      // Phase is a complex-plane glyph, independent of the physical aperture axes.
      s+='<g data-phase-glyph="complex-plane">'+U.circle(...tip,8,'var(--surface)',U.C.a)+U.arrow(...tip,tip[0]+14*Math.cos(phase),tip[1]-14*Math.sin(phase),U.C.b)+'</g></g>';
    }
    s+=U.text(60,397,'Oblique view; component heights are enlarged')+U.text(480,80,'Position rₙ = (xₙ,yₙ,0)')+U.text(480,120,'24 feeds: common |aₙ| = 1')+U.text(480,160,'Hollow marker: one empty site')+U.text(480,200,'Phase ψₙ = x-index × βx')+U.text(480,245,'Wavelength: '+U.fmt(299.792458/state.frequency,3)+' mm')+U.text(480,285,'λ/2 spacing: '+U.fmt(149.896229/state.frequency,3)+' mm')+U.text(480,325,'Screen-facing arrows: feed phase')+U.text(480,360,'Broadside |Σ feed phasors|²:')+U.text(480,397,U.fmt(totalRe**2+totalIm**2,2)+' (relative field²)');
    $('project-elements').innerHTML=U.svg(s,'Oblique five by five physical aperture, outward normal and screen-facing complex feed-phase glyphs');
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
    const area=lat=>6400**2*U.rad(7/nx)*(Math.sin(U.rad(lat+3/ny))-Math.sin(U.rad(lat-3/ny)));
    s+=U.text(70,505,'Same angular cell: '+U.fmt(area(31),1)+' km² at 31°N; '+U.fmt(area(35),1)+' km² at 35°N.');
    s+=U.text(70,534,'Counts use cells; this area example uses a spherical Earth of radius 6,400 km.');
    $('project-coverage').innerHTML=U.svg(s,'Schematic Georgia coverage classification and latitude-dependent physical cell areas',800,555);
    $('project-beamwidth-value').textContent=U.fmt(state.beamwidth,1)+'° map scale';$('project-peak-value').textContent=state.peak+' dBm';return{miss,spill,covered};
  }
  function pipeline(){
    const steps=[['Geometry','Subtract → local axes','Fig. 1'],['Feeds','rₙ, |aₙ|, ψₙ','Fig. 2'],['Complex field','Path + phase → AF','Figs. 3–4'],['Angular power','p = |AF|² Gₑₗ','Fig. 5'],['Absolute gain','Full-pattern ∫p dΩ','Fig. 5'],['Link budget','Pt, Gt, Gr, λ, R','Fig. 6'],['Map decisions','Threshold + target mask','Fig. 7'],['Design comparison','Coverage, Ninstalled','Complete evaluation']];let s='';
    steps.forEach((step,i)=>{const row=i<4?0:1,col=i<4?i:7-i,x=30+col*192,y=45+row*220;
      s+=`<rect x="${x}" y="${y}" width="164" height="145" rx="6" fill="none" stroke="${U.C.grid}"/>`+U.text(x+82,y+35,step[0],'middle')+U.text(x+82,y+75,step[1],'middle')+U.text(x+82,y+115,step[2],'middle',U.C.muted);
      if(i<3)s+=U.arrow(x+166,y+72,x+188,y+72,U.C.a);if(i>=4&&i<7)s+=U.arrow(x-3,y+72,x-25,y+72,U.C.a);if(i===3)s+=U.arrow(x+82,y+148,x+82,y+212,U.C.a);
    });$('project-pipeline').innerHTML=U.svg(s,'Geometry to feeds, complex field, normalized gain, link, map and comparison',800,455);
  }
  for(const key of ['longitude','normal','rays','axes','steer','phase','frequency','beamwidth','peak'])$('project-'+key).addEventListener('input',e=>{state[key]=['normal','rays'].includes(key)?e.target.value:['axes','steer'].includes(key)?e.target.checked:Number(e.target.value);draw();});
  function draw(){geometry();elements();coverage();}
  draw();pipeline();window.ProjectFigures={state,draw,geometry,coverage};
})();
