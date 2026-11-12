/* Bound Earth-orbit families: Kepler motion in ECI, then a rotating spherical Earth. */
(() => {
  'use strict';
  const TAU=2*Math.PI, DEG=Math.PI/180, MU=398600.4418, EARTH=6378.137, DAY=86164.0905;
  const rad=x=>x*DEG, deg=x=>x/DEG, wrap=x=>((x+180)%360+360)%360-180;
  const norm=v=>Math.hypot(...v), dot=(a,b)=>a.reduce((s,x,j)=>s+x*b[j],0);
  const fromPeriod=T=>Math.cbrt(MU*(T/TAU)**2), critical=deg(Math.acos(Math.sqrt(1/5)));
  const presets=[
    {name:'GEO',a:fromPeriod(DAY),e:0,i:0,w:0,description:'Circular + equatorial + prograde + sidereal period: one fixed subpoint.'},
    {name:'Inclined geosynchronous',a:fromPeriod(DAY),e:0,i:30,w:0,description:'A sidereal period repeats the track; inclination moves the subpoint north and south.'},
    {name:'Eccentric geosynchronous',a:fromPeriod(DAY),e:.2,i:0,w:0,description:'Uneven orbital speed produces east–west subpoint motion along the equator.'},
    {name:'Inclined, eccentric GSO',a:fromPeriod(DAY),e:.2,i:30,w:0,description:'Inclination and uneven speed combine into a repeating, asymmetric ground track.'},
    {name:'LEO, prograde',a:EARTH+500,e:0,i:51.6,w:0,description:'A low circular orbit moves rapidly while Earth turns beneath its fixed orbital plane.'},
    {name:'Polar LEO',a:EARTH+700,e:0,i:90,w:0,description:'The orbital plane contains the spin axis; successive passes cross different longitudes.'},
    {name:'Retrograde LEO',a:EARTH+700,e:0,i:120,w:0,description:'Inclination above 90° reverses the orbital angular momentum relative to Earth’s spin.'},
    {name:'MEO, navigation-like',a:EARTH+20200,e:0,i:55,w:0,description:'A higher circular orbit has a longer period and a slower angular rate than LEO.'},
    {name:'Tundra-like',a:fromPeriod(DAY),e:.3,i:critical,w:270,description:'A sidereal-day ellipse dwells near apogee; the default apsidal orientation places apogee north.'},
    {name:'Molniya-like',a:fromPeriod(DAY/2),e:.72,i:critical,w:270,description:'A half-sidereal-day ellipse alternates between two apogee longitudes; the default apsidal orientation places apogee north.'},
  ];

  // M = E - e sin(E). Keeping full turns makes the two-orbit time slider continuous.
  function eccentricAnomaly(M,e) {
    const turns=Math.floor((M+Math.PI)/TAU),m=M-turns*TAU;
    let E=e<.8?m:Math.sign(m||1)*Math.PI;
    for(let j=0;j<24;j++) {const d=(E-e*Math.sin(E)-m)/(1-e*Math.cos(E));E-=d;if(Math.abs(d)<1e-13)break;}
    return E+turns*TAU;
  }
  function rotate(v,node,inclination,argument) {
    const c=Math.cos(argument),s=Math.sin(argument),x=c*v[0]-s*v[1],y=s*v[0]+c*v[1];
    const ci=Math.cos(inclination),si=Math.sin(inclination),cn=Math.cos(node),sn=Math.sin(node);
    return [cn*x-sn*ci*y,sn*x+cn*ci*y,si*y];
  }
  function elements(values) {
    const p=presets[values.preset]||presets[0];
    return {...p,node:values.node,w:(p.w+values.apsis)%360,T:TAU*Math.sqrt(p.a**3/MU)};
  }
  function state(el,time) {
    const n=Math.sqrt(MU/el.a**3),M=n*time,E=eccentricAnomaly(M,el.e),b=Math.sqrt(1-el.e**2),den=1-el.e*Math.cos(E);
    const orbital=[el.a*(Math.cos(E)-el.e),el.a*b*Math.sin(E),0];
    const orbitalVelocity=[-el.a*n*Math.sin(E)/den,el.a*n*b*Math.cos(E)/den,0];
    const xyz=rotate(orbital,rad(el.node),rad(el.i),rad(el.w));
    const velocity=rotate(orbitalVelocity,rad(el.node),rad(el.i),rad(el.w));
    const turn=TAU*time/DAY,c=Math.cos(turn),s=Math.sin(turn),ecef=[c*xyz[0]+s*xyz[1],-s*xyz[0]+c*xyz[1],xyz[2]];
    const r=norm(xyz),latitude=deg(Math.asin(Math.max(-1,Math.min(1,xyz[2]/r))));
    const longitude=wrap(deg(Math.atan2(ecef[1],ecef[0]))),longitudeDefined=Math.hypot(ecef[0],ecef[1])>r*1e-10;
    return {time,M,E,nu:Math.atan2(b*Math.sin(E),Math.cos(E)-el.e),orbital,xyz,velocity,ecef,r,altitude:r-EARTH,latitude,longitude,longitudeDefined,speed:norm(velocity)};
  }
  // Break the map at its longitude seam and at poles, where longitude is not unique.
  function splitTrack(points) {
    const parts=[];let part=[];
    for(const p of points) {
      if(Math.abs(p[1])>90-1e-8){if(part.length>1)parts.push(part);part=[];continue;}
      const previous=part.at(-1),jump=previous?Math.abs(p[0]-previous[0]):0;
      // A sample may straddle a pole without landing exactly on it.
      const poleTurn=previous&&p[1]*previous[1]>0&&Math.min(Math.abs(p[1]),Math.abs(previous[1]))>85&&jump>90;
      if(jump>180||poleTurn){if(part.length>1)parts.push(part);part=[];}
      part.push(p);
    }
    if(part.length>1)parts.push(part);return parts;
  }
  function track(el,start,end,count=560) {
    return Array.from({length:count+1},(_,j)=>{const s=state(el,start+(end-start)*j/count);return [s.longitude,s.latitude];});
  }
  const physics={MU,EARTH,DAY,presets,fromPeriod,eccentricAnomaly,rotate,elements,state,splitTrack,track};
  globalThis.OrbitTypesPhysics=physics;

  // Coarse, original coastline sketches provide geographic orientation, not cartography.
  const coasts=[
    [[-168,70],[-140,70],[-126,58],[-124,42],[-114,30],[-102,22],[-97,16],[-83,9],[-80,22],[-66,45],[-55,53],[-62,60],[-85,65],[-100,73],[-130,72],[-168,70]],
    [[-81,12],[-65,10],[-50,0],[-35,-8],[-40,-25],[-53,-35],[-68,-55],[-76,-35],[-81,12]],
    [[-52,60],[-42,62],[-20,76],[-30,83],[-52,80],[-60,70],[-52,60]],
    [[-10,36],[-10,58],[10,72],[35,70],[45,55],[65,55],[90,74],[150,70],[175,60],[145,43],[130,30],[120,20],[110,5],[95,5],[80,22],[70,25],[55,15],[42,12],[34,30],[15,37],[-10,36]],
    [[-17,35],[8,37],[34,31],[43,12],[50,10],[42,-12],[31,-31],[18,-35],[10,-20],[-3,5],[-17,15],[-17,35]],
    [[112,-11],[136,-12],[153,-25],[145,-39],[124,-35],[112,-22],[112,-11]],
    [[-180,-72],[-120,-73],[-60,-69],[0,-73],[60,-68],[120,-73],[180,-72]],
  ];
  const hemi=(x,pos,neg)=>Math.abs(x).toFixed(1)+'°'+(Math.abs(x)<.05?'':x>=0?pos:neg);
  const number=(x,d=0)=>x.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
  const marker=(U,p,label,color,dx=8,dy=-9)=>U.circle(p[0],p[1],4,color,color)+U.text(p[0]+dx,p[1]+dy,label,'start',color);

  function spatialFigure(el,current,U) {
    const C=U.C,scale=150/(el.a*(1+el.e)),center=[228,280],yaw=-.62,pitch=.47;
    const basis=v=>{const x=Math.cos(yaw)*v[0]-Math.sin(yaw)*v[1],d=Math.sin(yaw)*v[0]+Math.cos(yaw)*v[1];return [x,Math.sin(pitch)*d-Math.cos(pitch)*v[2],Math.cos(pitch)*d+Math.sin(pitch)*v[2]];};
    const project=v=>{const q=basis(v);return [center[0]+scale*q[0],center[1]+scale*q[1]];};
    let out=U.text(55,30,el.name+' · '+(el.i>90?'retrograde':Math.abs(el.i-90)<1e-7?'polar':'prograde'));
    out+=U.text(55,58,'e = '+number(el.e,2)+'   i = '+number(el.i,1)+'°   a = '+number(el.a)+' km');
    out+=U.text(55,94,'Space-fixed view: Earth rotates inside the orbital plane');
    const earthRadius=EARTH*scale,axis=EARTH*1.05;
    const equator=Array.from({length:121},(_,j)=>{const a=j*TAU/120;return project([EARTH*Math.cos(a),EARTH*Math.sin(a),0]);});
    const orbit=Array.from({length:241},(_,j)=>project(state(el,el.T*j/240).xyz));
    out+=U.path(orbit,C.a,2.5)+U.path(equator,C.grid,1);
    out+=U.circle(...center,earthRadius,'var(--earth)',C.ink);
    // Near-hemisphere wire lines are visible; the globe masks orbit segments behind it below.
    for(const lat of [-60,-30,0,30,60]) {
      let part=[];
      for(let j=0;j<=120;j++) {const lon=j*TAU/120+TAU*current.time/DAY,v=[EARTH*Math.cos(rad(lat))*Math.cos(lon),EARTH*Math.cos(rad(lat))*Math.sin(lon),EARTH*Math.sin(rad(lat))];if(basis(v)[2]>=0)part.push(project(v));else {if(part.length>1)out+=U.path(part,C.grid,1);part=[];}}
      if(part.length>1)out+=U.path(part,C.grid,1);
    }
    const prime=Array.from({length:61},(_,j)=>{const lat=(-90+j*3)*DEG,lon=TAU*current.time/DAY;return [EARTH*Math.cos(lat)*Math.cos(lon),EARTH*Math.cos(lat)*Math.sin(lon),EARTH*Math.sin(lat)];});
    let part=[];for(const v of prime){if(basis(v)[2]>=0)part.push(project(v));else {if(part.length>1)out+=U.path(part,C.b,1.5);part=[];}}if(part.length>1)out+=U.path(part,C.b,1.5);
    out+=U.arrow(...project([0,0,-axis]),...project([0,0,axis]),C.muted)+U.text(...project([0,0,axis*1.12]),'N','middle');
    // Redraw the front part of the orbit; hide only the portion actually occulted by Earth.
    part=[];for(let j=0;j<=360;j++){const q=state(el,el.T*j/360).xyz,b=basis(q),ok=b[2]>=0||Math.hypot(b[0],b[1])>EARTH;if(ok)part.push(project(q));else {if(part.length>1)out+=U.path(part,C.a,2.5);part=[];}}if(part.length>1)out+=U.path(part,C.a,2.5);
    const sp=project(current.xyz),depth=basis(current.xyz),hidden=depth[2]<0&&Math.hypot(depth[0],depth[1])<EARTH;
    if(!hidden)out+=U.circle(...sp,5.5,C.b,C.b);
    out+=U.text(55,460,'Orange: satellite; orange meridian: 0° longitude');
    out+=U.text(55,486,hidden?'Satellite is behind Earth in this camera view.':'Earth blocks the far side of the orbit in this camera view.');
    out+=U.text(55,542,'Each preset refits the view.');
    out+=U.text(55,568,'One length scale for Earth and orbit.');

    // In-plane coordinates retain the true ellipse, Earth at its focus, and a tangent velocity.
    const c=[615,280],s=147/(el.a*(1+el.e)),projectPlane=q=>[c[0]+q[0]*s,c[1]-q[1]*s];
    out+=U.text(465,94,'Orbit-plane view · Earth at a focus');
    out+=U.path(Array.from({length:241},(_,j)=>projectPlane(state(el,el.T*j/240).orbital)),C.a,2.5)+U.circle(...c,EARTH*s,'var(--earth)',C.ink);
    const q=projectPlane(current.orbital),E=current.E,b=Math.sqrt(1-el.e**2),v=[-Math.sin(E),b*Math.cos(E)],vn=Math.hypot(...v);
    out+=U.line(...c,...q,C.muted,1,'4 4')+U.circle(...q,5.5,C.b,C.b)+U.arrow(...q,q[0]+24*v[0]/vn,q[1]-24*v[1]/vn,C.c);
    if(el.e>1e-8) {
      out+=marker(U,projectPlane([el.a*(1-el.e),0]),'P',C.d,7,19)+marker(U,projectPlane([-el.a*(1+el.e),0]),'A',C.c,7,19);
      out+=U.text(465,460,'P: perigee h = '+number(el.a*(1-el.e)-EARTH)+' km');
      out+=U.text(465,486,'A: apogee h = '+number(el.a*(1+el.e)-EARTH)+' km');
    } else out+=U.text(465,460,'Circle: h = '+number(el.a-EARTH)+' km everywhere');
    out+=U.text(465,516,'Speed now: '+number(current.speed,2)+' km/s');
    out+=U.text(465,542,'Elapsed: '+number(current.time/3600,2)+' h');
    out+=U.text(465,568,el.e>1e-8?'Longer dwell near apogee; faster near perigee.':'A circular orbit has no unique perigee.');
    return U.svg(out,'Orbit family in a fixed spatial view and its orbital plane, with equal length scales within each view',800,600);
  }

  function groundFigure(el,current,U) {
    const C=U.C,L=72,R=772,T=52,B=352,X=x=>L+(x+180)/360*(R-L),Y=x=>B-(x+90)/180*(B-T);
    let out=U.text(L,27,'Ground track · two orbital periods on a rotating spherical Earth');
    out+='<rect x="'+L+'" y="'+T+'" width="'+(R-L)+'" height="'+(B-T)+'" fill="var(--earth)" stroke="'+C.grid+'"/>';
    for(let lon=-180;lon<=180;lon+=60)out+=U.line(X(lon),T,X(lon),B,C.grid,1)+U.text(X(lon),B+24,String(lon)+'°','middle',C.muted);
    for(let lat=-90;lat<=90;lat+=30)out+=U.line(L,Y(lat),R,Y(lat),lat===0?C.muted:C.grid,1)+U.text(L-12,Y(lat)+5,String(lat)+'°','end',C.muted);
    for(const coast of coasts)for(const seg of splitTrack(coast))out+=U.path(seg.map(([x,y])=>[X(x),Y(y)]),C.muted,1);
    const full=track(el,0,2*el.T),done=track(el,0,current.time,Math.max(2,Math.ceil(560*current.time/(2*el.T))));
    for(const seg of splitTrack(full))out+=U.path(seg.map(([x,y])=>[X(x),Y(y)]),C.grid,3);
    for(const seg of splitTrack(done))out+=U.path(seg.map(([x,y])=>[X(x),Y(y)]),C.a,2.5);
    // Dots are equally spaced in time, so a dense cluster indicates greater dwell time.
    for(let j=0;j<=48;j++){const q=state(el,2*el.T*j/48);out+=U.circle(X(q.longitude),Y(q.latitude),1.8,C.a,C.a);}
    out+=U.circle(X(current.longitude),Y(current.latitude),5.5,C.b,C.b);
    out+=U.text(L,405,'Subpoint: '+hemi(current.latitude,'N','S')+'   '+(current.longitudeDefined?hemi(current.longitude,'E','W'):'no unique longitude at pole'));
    out+=U.text(L,434,'Colored line: elapsed track; pale line: two-orbit reference; dots: equal time.');
    out+=U.text(L,462,'Longitude is east-positive. Lines split at ±180°. Coastlines are schematic.');
    return U.svg(out,'Geographic ground track with latitude, longitude, equal-time positions and current satellite subpoint',800,484);
  }

  modules.push({
    id:'orbit-types',group:'Orbits',title:'Orbit types',heading:'Orbit shape, tilt and period determine where a satellite travels',
    intro:'Compare the same satellite state in space, in its orbital plane, and above Earth’s latitude–longitude grid.',
    controls:[
      {id:'preset',label:'Orbit family',value:0,options:presets.map((p,j)=>({value:j,label:p.name}))},
      {id:'progress',label:'Elapsed orbital periods',min:0,max:200,step:1,value:50,unit:'%'},
      {id:'node',label:'Node longitude Ω at epoch',min:-180,max:180,step:5,value:-85,unit:'°'},
      {id:'apsis',label:'Rotate apsides Δω',min:0,max:360,step:5,value:0,unit:'°'},
    ],
    animate:{id:'progress',min:0,max:200,step:.6},
    sources:['Course: circular and elliptical orbits, orbital elements and satellite look angles','Course: NASA Earth Observatory: Catalog of Earth Satellite Orbits, https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits/','Course: NASA: Basics of Space Flight, Chapter 5, https://science.nasa.gov/learn/basics-of-space-flight/chapter5-1/','Course: ESA Space Debris Office: Tundra Disposal Orbit Study, https://conference.sdo.esoc.esa.int/proceedings/sdc7/paper/328'],
    render(values,U) {
      const el=elements(values),q=state(el,values.progress/100*el.T);
      return {svg:spatialFigure(el,q,U)+groundFigure(el,q,U),stats:[['Altitude now',number(q.altitude)+' km'],['Orbital period',number(el.T/3600,3)+' h'],['Subpoint latitude / longitude',hemi(q.latitude,'N','S')+' / '+(q.longitudeDefined?hemi(q.longitude,'E','W'):'no unique longitude at pole')]],
        equation:'T = 2π√(a³/μ); &nbsp; M = nt = E − e sin E; &nbsp; r = a(1 − e cos E); &nbsp; h = r − R<sub>E</sub><br>r<sub>ECI</sub> = Rz(Ω) Rx(i) Rz(ω) r<sub>plane</sub>; &nbsp; r<sub>ECEF</sub> = Rz(−ω<sub>E</sub>t) r<sub>ECI</sub>',
        note:el.description+' Ideal bound two-body ellipses, fixed elements, spherical Earth and uniform sidereal rotation; no J2, atmosphere, eclipses, thrust or precession. The 63.4° critical inclination has a J2 motivation, but that perturbation is not simulated. Epoch Earth angle is 0°. Ω is measured eastward from the fixed epoch x-axis; for an equatorial orbit there is no unique ascending node. The apsis control adds Δω to the preset argument; for a circle it changes the phase reference because perigee is undefined. Dots and trails show positions, not ground-station visibility or coverage. Animation uses the same fraction of an orbit for each family, not the same number of real seconds.',
        question:'Which preset keeps one subpoint fixed? Compare the two geosynchronous variations, then explain why the eccentric-orbit dots cluster near apogee and how the apsis control changes its latitude.'};
    },
    checks:()=>[
      {name:'Every preset has an above-surface perigee',pass:presets.every(p=>p.a*(1-p.e)>EARTH)},
      {name:'GEO ground longitude is fixed for a full sidereal day',pass:Math.abs(wrap(state({...presets[0],node:-85},DAY*.73).longitude+85))<1e-8},
      {name:'Molniya period is half a sidereal day',pass:Math.abs(TAU*Math.sqrt(presets[9].a**3/MU)-DAY/2)<1e-7},
    ],
  });
})();
