(()=>{'use strict';
const modules=[];
const U=window.CourseFigureU;
const {C,esc,fmt,text,line,path,circle,arrow,svg,range,legend,wheel,plot}=U;
const Orb = (() => {
  const mu=398600.4418, R=6378, TE=86164.0905, tau=2*Math.PI;
  const solveE=(M,e)=>{let E=M;for(let i=0;i<14;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E;};
  const point=(M,e)=>{const E=solveE(M,e);return [Math.cos(E)-e,Math.sqrt(1-e*e)*Math.sin(E)];};
  const elev=(g,r)=>Math.atan2(Math.cos(g)-R/r,Math.sin(g));
  const en=(Ls,Le,dl)=>[Math.cos(Ls)*Math.sin(dl),Math.sin(Ls)*Math.cos(Le)-Math.cos(Ls)*Math.sin(Le)*Math.cos(dl)];
  const deriv=y=>{const r=Math.hypot(y[0],y[1]);return [y[2],y[3],-y[0]/r**3,-y[1]/r**3];};
  function step(y,h,rk){const k1=deriv(y);if(!rk)return y.map((x,i)=>x+h*k1[i]);const k2=deriv(y.map((x,i)=>x+h*k1[i]/2)),k3=deriv(y.map((x,i)=>x+h*k2[i]/2)),k4=deriv(y.map((x,i)=>x+h*k3[i]));return y.map((x,i)=>x+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
  function integrate(steps,periods,rk){let y=[1,0,0,1],traj=[[1,0]],errors=[[0,0]],h=tau/steps;for(let i=1;i<=steps*periods;i++){y=step(y,h,rk);if(i%Math.max(1,Math.floor(steps*periods/600))===0||i===steps*periods){traj.push([y[0],y[1]]);const energy=(y[2]**2+y[3]**2)/2-1/Math.hypot(y[0],y[1]);errors.push([i/steps,100*(energy+.5)/.5]);}}return{y,traj,errors};}
  return {mu,R,TE,tau,solveE,point,elev,en,integrate};
})();

modules.push({
 id:'kepler-ellipse',group:'Orbits',title:'Kepler ellipse',heading:'An ellipse sweeps equal areas in equal times',
 intro:'Move through equal intervals of time and watch the satellite speed up near perigee.',
 controls:[{id:'a',label:'Semi-major axis a',min:20000,max:42000,step:1000,value:28000,unit:'km'},{id:'e',label:'Eccentricity e',min:0,max:.65,step:.01,value:.4},{id:'M',label:'Elapsed fraction of orbital period',min:0,max:100,step:1,value:14,unit:'%'}],animate:{id:'M',min:0,max:100,step:.4},
 sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json'],
 render(v,U){const {a,e}=v,M=v.M/100*Orb.tau,E=Orb.solveE(M,e),r=a*(1-e*Math.cos(E)),speed=Math.sqrt(Orb.mu*(2/r-1/a)),period=Orb.tau*Math.sqrt(a**3/Orb.mu),C=U.C,cx=340,cy=225,s=185,p=Orb.point(M,e),px=cx+s*p[0],py=cy-s*p[1];let q=U.line(35,cy,690,cy,C.grid)+U.path(U.range(200,t=>{const p=Orb.point(t*Orb.tau,e);return[cx+s*p[0],cy-s*p[1]];}),C.a,2.5);
 for(const [m,c]of[[0,C.b],[Math.PI,C.c]]){const pts=[[cx,cy],...U.range(40,t=>{let p=Orb.point(m+t*.42,e);return[cx+s*p[0],cy-s*p[1]];}),[cx,cy]];q+=`<polygon points="${pts.map(x=>x.join(',')).join(' ')}" fill="${c}" opacity=".18"/>`;}
 q+=U.circle(cx,cy,Orb.R/a*s,'var(--earth)',C.ink)+U.text(cx,cy+4,'Earth','middle')+U.line(cx,cy,px,py,C.muted,1,'5 4')+U.circle(px,py,6,C.a,C.a);
 const vx=-Math.sin(E)/(1-e*Math.cos(E)),vy=Math.sqrt(1-e*e)*Math.cos(E)/(1-e*Math.cos(E));q+=U.arrow(px,py,px+vx*31,py-vy*31,C.b)+U.text(535,64,'Velocity tangent to the orbit')+U.text(535,90,'Radius points from the focus')+U.text(545,140,'Equal-time sectors')+U.text(545,168,'Δt = 6.7% of a period')+U.text(545,198,'Equal areas, unequal arcs')+U.text(cx+s*(1-e),cy+28,'Perigee','middle')+U.text(cx-s*(1+e),cy+28,'Apogee','middle');
 return{svg:U.svg(q,'Elliptical orbit with equal-time swept sectors and velocity arrow'),stats:[['Radius',`${U.fmt(r,0)} km`],['Speed',`${U.fmt(speed,3)} km/s`],['Period',`${U.fmt(period/3600,2)} h`]],equation:'M = nt = E − e sin E &nbsp; · &nbsp; r = a(1 − e cos E) &nbsp; · &nbsp; v² = μ(2/r − 1/a)',note:'Ideal two-body orbit, with Earth at a focus. Time advances uniformly in mean anomaly M, rather than in the geometric angle around the ellipse. The orbital size stays fixed on screen so changes in shape remain easy to compare.',question:'For the same a, does increasing e change the period? Explain why the near-perigee sector has a longer arc.'};},
 checks:()=>[{name:'Kepler equation residual',pass:Math.abs(Orb.solveE(1.2,.6)-.6*Math.sin(Orb.solveE(1.2,.6))-1.2)<1e-12},{name:'Circular ellipse at a gives circular speed',pass:Math.abs(Math.sqrt(Orb.mu*(2/28000-1/28000))-Math.sqrt(Orb.mu/28000))<1e-12}]
});

modules.push({
 id:'geo-frames',group:'Orbits',title:'GEO & rotating Earth',heading:'A stationary point in the sky is moving in space',
 intro:'Compare the same circular equatorial orbit in inertial and Earth-fixed frames.',
 controls:[{id:'ratio',label:'Orbit period / sidereal day',min:.7,max:1.3,step:.01,value:1},{id:'time',label:'Elapsed time',min:0,max:48,step:.1,value:10,unit:'h'}],animate:{id:'time',min:0,max:48,step:.05},sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json'],
 render(v,U){const T=v.ratio*Orb.TE,t=v.time*3600,n=Orb.tau/T,w=Orb.tau/Orb.TE,theta=n*t,earth=w*t,d=(n-w)*t,r=(Orb.mu/(n*n))**(1/3),C=U.C;let q='';for(const [cx,fixed]of[[200,false],[600,true]]){const a=fixed?d:theta,ea=fixed?0:earth; q+=U.circle(cx,230,133,'none',C.grid)+U.circle(cx,230,47,'var(--earth)',C.ink)+U.arrow(cx,230,cx+44*Math.cos(ea),230-44*Math.sin(ea),C.b)+U.circle(cx+133*Math.cos(a),230-133*Math.sin(a),6,C.a,C.a)+U.line(cx,230,cx+133*Math.cos(a),230-133*Math.sin(a),C.a,1,'5 4')+U.text(cx,46,fixed?'Earth-fixed frame':'Inertial frame','middle')+U.text(cx,395,fixed?'Subtract Earth’s rotation':'Both Earth and satellite rotate','middle');}
 const drift=((d*180/Math.PI+180)%360+360)%360-180;q+=U.text(400,430,'Equatorial, circular and prograde; orbit drawing is schematic.','middle');return{svg:U.svg(q,'Inertial and Earth-fixed views of a circular equatorial satellite'),stats:[['Circular radius',`${U.fmt(r,0)} km`],['Circular speed',`${U.fmt(Math.sqrt(Orb.mu/r),3)} km/s`],['Longitude offset',`${U.fmt(drift,2)}°`]],equation:'T = 2π√(r³/μ) &nbsp; · &nbsp; λ(t) − λ(0) = (n − ω<sub>E</sub>)t',note:'The reference day is sidereal: 86,164.0905 s. Matching this period gives geosynchronous motion; the circular, equatorial, prograde assumptions here make it geostationary. Frame changes do not add a force.',question:'Set the period ratio above 1. Will the satellite drift east or west relative to the ground?'};},
 checks:()=>[{name:'GEO radius reference',pass:Math.abs((Orb.mu/(Orb.tau/Orb.TE)**2)**(1/3)-42164.17)<.1},{name:'Matched rotation has zero longitude drift',pass:((Orb.tau/Orb.TE)-(Orb.tau/Orb.TE))*172800===0}]
});

modules.push({
 id:'look-triangle',group:'Orbits',title:'Elevation & horizon',heading:'Elevation is an angle at the station, not Earth’s center',intro:'Slide the satellite past the horizon and compare signed elevation with the inverse-cosine magnitude.',
 controls:[{id:'r',label:'Geocentric satellite radius rₛ',min:8000,max:60000,step:500,value:24000,unit:'km'},{id:'gamma',label:'Central angle γ',min:0,max:150,step:1,value:40,unit:'°'}],sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json','Work/HW/HW 1/orbit_sim_math_final.py'],
 render(v,U){const g=U.rad(v.gamma),e=Orb.elev(g,v.r),h=Math.acos(Orb.R/v.r),d=Math.sqrt(v.r*v.r+Orb.R*Orb.R-2*v.r*Orb.R*Math.cos(g)),ratio=v.r/Orb.R,R=Math.min(90,200/ratio),cx=250,cy=285,sx=cx+R,sy=cy,px=cx+R*ratio*Math.cos(g),py=cy-R*ratio*Math.sin(g),C=U.C,up=v.r*Math.cos(g)-Orb.R,horiz=v.r*Math.sin(g);let q=U.circle(cx,cy,R,'var(--earth)',C.ink)+U.line(cx,cy,sx,sy,C.muted)+U.line(cx,cy,px,py,C.muted,1,'4 4')+U.line(sx,sy,px,py,e>=0?C.a:C.d,2,e>=0?'':'7 4')+U.line(sx,40,sx,415,C.b,1,'4 4')+U.circle(sx,sy,5,C.b,C.b)+U.circle(px,py,6,C.a,C.a)+U.arrow(sx,sy,sx+55,sy,C.c)+U.text(cx,cy+5,'Earth','middle')+U.text(sx+13,405,'Local horizon')+U.text(sx+10,sy+27,'Station')+U.text(px+10,Math.max(24,py-12),'Satellite')+U.text(545,82,`γ = ${U.fmt(v.gamma,0)}° at Earth’s center`)+U.text(545,112,`Elevation = ${U.fmt(U.deg(e),2)}°`)+U.text(545,142,e>=-1e-12?'Above the ideal horizon':'Line of sight blocked by Earth')+U.text(545,203,`Upward component: ${U.fmt(up,0)} km`)+U.text(545,233,`Horizontal: ${U.fmt(horiz,0)} km`)+U.text(545,290,'Local up points away from Earth.')+U.text(545,320,'Dashed line: station’s horizon.')+U.text(35,430,'The triangle is drawn to scale; axes rotate with the station.');q+=U.arrow(sx,sy,px,sy,C.c)+U.arrow(px,sy,px,py,C.b)+U.path(U.range(35,t=>[sx+29*Math.cos(-Math.PI/2+t*e),sy+29*Math.sin(-Math.PI/2+t*e)]),C.a,2)+U.path(U.range(35,t=>[cx+27*Math.cos(-t*g),cy+27*Math.sin(-t*g)]),C.muted,1)+U.text(cx+40*Math.cos(g/2),cy-40*Math.sin(g/2),'γ','middle')+U.text(sx+38*Math.cos(-Math.PI/2+e/2),sy+38*Math.sin(-Math.PI/2+e/2),'Eₗ','middle');
 const pts=U.range(180,t=>{const G=t*Math.PI;return[t*180,U.deg(Orb.elev(G,v.r))];}),mag=pts.map(([x,y])=>[x,Math.abs(y)]);return{svg:U.legend([{name:'Line of sight',color:C.a},{name:'Upward component',color:C.c},{name:'Horizontal component',color:C.b}])+U.svg(q,'To-scale look-angle triangle, local horizon and satellite line of sight')+U.legend([{name:'Signed atan2 elevation',color:C.a},{name:'acos magnitude',color:C.b}])+U.plot([{name:'Signed atan2 elevation',color:C.a,points:pts},{name:'acos magnitude',color:C.b,points:mag,dash:'6 4'}],{xmin:0,xmax:180,ymin:-90,ymax:90,xlabel:'Central angle γ (degrees)',ylabel:'Elevation (degrees)',title:'The magnitude loses the below-horizon sign'}),stats:[['Signed elevation',`${U.fmt(U.deg(e),2)}°`],['Horizon at γ',`${U.fmt(U.deg(h),2)}°`],['Slant range',`${U.fmt(d,0)} km`]],equation:'E<sub>l</sub> = atan2(r<sub>s</sub> cos γ − R<sub>E</sub>, r<sub>s</sub> sin γ) &nbsp; · &nbsp; γ<sub>h</sub> = acos(R<sub>E</sub>/r<sub>s</sub>)',note:'Spherical Earth, no terrain or atmospheric refraction. The lecture’s acos formula yields the same above-horizon elevation and the absolute value below it; combine it with isVisible to restore the sign. Slant range is a straight line, not the surface arc.',question:'At the horizon, which component becomes zero? Why can a positive acos result still describe a blocked satellite?'};},
 checks:()=>[{name:'Overhead elevation is 90 degrees',pass:Math.abs(Orb.elev(0,24000)-Math.PI/2)<1e-12},{name:'Analytic horizon gives zero elevation',pass:Math.abs(Orb.elev(Math.acos(Orb.R/24000),24000))<1e-12},{name:'Antipodal direction below horizon',pass:Orb.elev(Math.PI,24000)<0}]
});

modules.push({
 id:'azimuth-components',group:'Orbits',title:'Azimuth quadrants',heading:'East and north components determine the bearing',intro:'Move the station and subpoint to see why the azimuth calculation needs both component signs.',
 controls:[{id:'Le',label:'Station latitude Lₑ',min:-85,max:85,step:1,value:34,unit:'°'},{id:'Ls',label:'Satellite subpoint latitude Lₛ',min:-85,max:85,step:1,value:0,unit:'°'},{id:'dl',label:'SSP longitude − station longitude',min:-180,max:180,step:1,value:-25,unit:'°'}],sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json','Work/HW/HW 1/orbit_sim_math_final.py'],
 render(v,U){const Le=U.rad(v.Le),Ls=U.rad(v.Ls),dl=U.rad(v.dl),[E,N]=Orb.en(Ls,Le,dl),q=Math.hypot(E,N),az=q<1e-10?null:((U.deg(Math.atan2(E,N))%360)+360)%360,C=U.C,cx=265,cy=235,s=165;let a=U.circle(cx,cy,s,'none',C.grid)+U.line(cx-s-15,cy,cx+s+15,cy,C.grid)+U.line(cx,cy-s-15,cx,cy+s+15,C.grid)+U.text(cx,cy-s-27,'N = 0°','middle')+U.text(cx+s+26,cy+5,'E = 90°')+U.text(cx,cy+s+28,'S = 180°','middle')+U.text(cx-s-25,cy+5,'W','end')+U.line(cx,cy,cx+s*E,cy,C.b,2)+U.line(cx+s*E,cy,cx+s*E,cy-s*N,C.c,2)+U.arrow(cx,cy,cx+s*E,cy-s*N,C.a)+U.circle(cx+s*E,cy-s*N,5,C.a,C.a)+U.text(505,90,`East component E = ${U.fmt(E,3)}`)+U.text(505,124,`North component N = ${U.fmt(N,3)}`)+U.text(505,174,az===null?'Bearing is undefined':`Bearing clockwise from N: ${U.fmt(az,1)}°`)+U.text(505,225,'View: local east–north horizon plane')+U.text(505,259,'Direction projections are dimensionless.')+U.text(505,293,'Multiply by rₛ for horizontal distances.')+U.text(505,348,'North is a signed component,')+U.text(505,377,'not an inverse-tangent shortcut.');
 return{svg:U.svg(a,'Local east-north horizon diagram showing bearing quadrant'),stats:[['East projection',U.fmt(E,3)],['North projection',U.fmt(N,3)],['Azimuth',az===null?'Undefined':`${U.fmt(az,1)}°`]],equation:'E = cos L<sub>s</sub> sin Δλ &nbsp; · &nbsp; N = sin L<sub>s</sub> cos L<sub>e</sub> − cos L<sub>s</sub> sin L<sub>e</sub> cos Δλ<br>Az = atan2(E, N), wrapped to [0°, 360°)',note:'This is the horizontal projection of the line of sight, so Earth radius cancels from azimuth. It does not establish visibility. When both components vanish, the direction is purely radial and its azimuth is undefined; near that condition, tiny position changes can cause large bearing changes.',question:'Why does an equatorial SSP west of a northern station usually have a southwest bearing? Find a setting where azimuth becomes undefined.'};},
 checks:()=>{let a=Orb.en(0,0,Math.PI/2),b=Orb.en(0,Math.PI/6,0);return[{name:'Equatorial eastward separation points east',pass:Math.abs(a[0]-1)<1e-12&&Math.abs(a[1])<1e-12},{name:'Same-longitude equatorial SSP south of northern station',pass:Math.abs(b[0])<1e-12&&Math.abs(b[1]+.5)<1e-12}];}
});

modules.push({
 id:'solar-pressure-components',group:'Orbits',title:'Solar push',heading:'Project one sunlight push onto rotating orbital axes',intro:'The force direction changes slowly in inertial space while the satellite’s local axes turn around Earth.',
 controls:[{id:'theta',label:'Satellite inertial angle θ',min:0,max:360,step:1,value:40,unit:'°'},{id:'beta',label:'Inertial push direction β',min:0,max:360,step:1,value:110,unit:'°'},{id:'rho',label:'Area density m/A',min:.5,max:20,step:.1,value:4,unit:'kg/m²'},{id:'alpha',label:'Prescribed reflectivity αᵣ',min:0,max:1,step:.05,value:.5}],animate:{id:'theta',min:0,max:360,step:1},sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json','Work/HW/HW 1/orbit_sim_math_final.py'],
 render(v,U){const th=U.rad(v.theta),be=U.rad(v.beta),rel=be-th,acc=9.08e-6*v.alpha/v.rho,ar=acc*Math.cos(rel),at=acc*Math.sin(rel),C=U.C,cx=260,cy=225,x=cx+130*Math.cos(th),y=cy-130*Math.sin(th),len=100,rx=x+len*Math.cos(rel)*Math.cos(th),ry=y-len*Math.cos(rel)*Math.sin(th),tx=rx-len*Math.sin(rel)*Math.sin(th),ty=ry-len*Math.sin(rel)*Math.cos(th);let q=U.circle(cx,cy,130,'none',C.grid)+U.circle(cx,cy,35,'var(--earth)',C.ink)+U.text(cx,cy+4,'Earth','middle')+U.circle(x,y,6,C.a,C.a)+U.arrow(x,y,x+72*Math.cos(th),y-72*Math.sin(th),C.muted)+U.arrow(x,y,x-72*Math.sin(th),y-72*Math.cos(th),C.muted)+U.arrow(x,y,rx,ry,C.b)+U.arrow(rx,ry,tx,ty,C.c)+U.arrow(x,y,tx,ty,C.a)+U.text(500,75,'Solid: total push aₛ')+U.text(500,110,'Radial component aᵣ: first segment')+U.text(500,145,'Tangential aθ: second segment')+U.text(500,200,`relative = β − θ = ${U.fmt(v.beta-v.theta,0)}°`)+U.text(500,254,'Gray arrows: local r and θ axes')+U.text(500,291,'Vector lengths show direction ratios,')+U.text(500,320,'not acceleration relative to gravity.')+U.text(40,414,'β points away from the Sun: photon momentum pushes along this direction.');
 return{svg:U.svg(q,'Solar-pressure vector and its radial and tangential components'),stats:[['Total push acceleration',`${U.fmt(acc*1e6,3)} μm/s²`],['Radial aᵣ',`${U.fmt(ar*1e6,3)} μm/s²`],['Tangential aθ',`${U.fmt(at*1e6,3)} μm/s²`]],equation:'a<sub>S</sub> = 9.08 × 10<sup>−6</sup> α<sub>r</sub>/ρ<sub>A</sub> &nbsp; · &nbsp; a<sub>r</sub> = a<sub>S</sub> cos(β − θ) &nbsp; · &nbsp; a<sub>θ</sub> = a<sub>S</sub> sin(β − θ)',note:'The acceleration follows the course’s prescribed pressure convention and omits eclipses. Changing m/A scales the numerical acceleration; the vector drawing is normalized to emphasize projection geometry. With αᵣ = 0 the numerical force vanishes, and the diagram shows its otherwise possible direction.',question:'Set β = θ + 90°. Which component vanishes, and does the remaining component add or remove angular momentum?'};},
 checks:()=>[{name:'Orthogonal projections preserve magnitude',pass:Math.abs(Math.cos(1.1)**2+Math.sin(1.1)**2-1)<1e-12},{name:'Doubling area density halves acceleration',pass:Math.abs((9.08e-6*.5/8)/(9.08e-6*.5/4)-.5)<1e-12}]
});

modules.push({
 id:'numerical-orbits',group:'Orbits',title:'Integration drift',heading:'The same physics can produce different numerical drift',intro:'Compare forward Euler and RK4 against the exact unforced circle as you change the timestep.',
 controls:[{id:'steps',label:'Integration steps per exact orbit',min:32,max:320,step:16,value:96},{id:'periods',label:'Exact orbital periods simulated',min:1,max:10,step:1,value:4}],sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json','Work/HW/HW 1/orbit_sim_math_final.py'],
 render(v,U){const eu=Orb.integrate(v.steps,v.periods,false),rk=Orb.integrate(v.steps,v.periods,true),C=U.C,maxR=Math.max(1,...eu.traj.map(x=>Math.hypot(...x)),...rk.traj.map(x=>Math.hypot(...x))),s=155/maxR,cx=260,cy=225;let q=U.circle(cx,cy,s,'none',C.muted)+U.path(eu.traj.map(([x,y])=>[cx+s*x,cy-s*y]),C.b,2)+U.path(rk.traj.map(([x,y])=>[cx+s*x,cy-s*y]),C.a,2)+U.circle(cx,cy,4,C.ink,C.ink)+U.text(485,85,'Exact circle: neutral reference')+U.text(485,122,'Forward Euler: dashed reference below')+U.text(485,159,'RK4: four derivative evaluations / step')+U.text(485,218,`Δt / T = 1 / ${v.steps}`)+U.text(485,255,`Simulated duration = ${v.periods} T`)+U.text(485,314,'The force law is identical in both runs.')+U.text(485,350,'Only the stepping approximation changes.')+U.text(40,420,'Spatial scale automatically fits both computed trajectories. Earth shown as a point.');
 const ee=eu.errors.at(-1)[1],re=rk.errors.at(-1)[1],ys=[...eu.errors,...rk.errors].map(x=>x[1]),ylo=Math.min(-.001,...ys),yhi=Math.max(.001,...ys);return{svg:U.svg(q,'Exact circular orbit compared with Euler and RK4 numerical trajectories')+U.legend([{name:'Forward Euler',color:C.b},{name:'RK4',color:C.a}])+U.plot([{name:'Forward Euler',color:C.b,points:eu.errors,dash:'6 4'},{name:'RK4',color:C.a,points:rk.errors}],{xmin:0,xmax:v.periods,ymin:ylo,ymax:yhi,xlabel:'Elapsed time / exact period T',ylabel:'Signed energy change / |ε₀| (%)',title:'Energy should stay constant in this unforced model'}),stats:[['Euler final energy change',`${U.fmt(ee,4)}%`],['RK4 final energy change',`${re.toExponential(2)}%`],['Final RK4 radius / r₀',U.fmt(Math.hypot(...rk.y.slice(0,2)),6)]],equation:'d(x,y,v<sub>x</sub>,v<sub>y</sub>)/dt = (v<sub>x</sub>,v<sub>y</sub>, −μx/r³, −μy/r³) &nbsp; · &nbsp; ε = v²/2 − μ/r',note:'This demonstration uses dimensionless Cartesian two-body equations with μ = r₀ = v₀ = 1, equivalent physics to the unforced polar model. It compares forward Euler, not your original modified polar recurrence. RK4 improves timestep accuracy but is not an exact energy-conserving method; compare progressively smaller steps.',question:'If a drift decreases strongly when you double the number of steps, should you attribute it to sunlight or to the numerical approximation?'};},
 checks:()=>{let a=Orb.integrate(32,2,true),b=Orb.integrate(64,2,true),c=Orb.integrate(64,2,false);return[{name:'RK4 convergence reduces energy error',pass:Math.abs(b.errors.at(-1)[1])<Math.abs(a.errors.at(-1)[1])/8},{name:'RK4 beats forward Euler at equal timestep',pass:Math.abs(b.errors.at(-1)[1])<Math.abs(c.errors.at(-1)[1])}];}
});

modules.push({
 id:'hohmann-transfer',group:'Orbits',title:'Two-burn transfer',heading:'One burn raises apogee; the next circularizes',intro:'Build an outward Hohmann transfer and compare the speeds immediately before and after each impulse.',
 controls:[{id:'r1',label:'Inner circular radius r₁',min:7000,max:14000,step:500,value:9000,unit:'km'},{id:'r2',label:'Outer circular radius r₂',min:18000,max:48000,step:1000,value:30000,unit:'km'},{id:'progress',label:'Coast progress',min:0,max:100,step:1,value:35,unit:'%'}],animate:{id:'progress',min:0,max:100,step:.35},sources:['_System/Generated Files/Guided Reading 2026-10-14/orbits.json'],
 render(v,U){const a=(v.r1+v.r2)/2,e=(v.r2-v.r1)/(v.r2+v.r1),dv1=Math.sqrt(Orb.mu*(2/v.r1-1/a))-Math.sqrt(Orb.mu/v.r1),dv2=Math.sqrt(Orb.mu/v.r2)-Math.sqrt(Orb.mu*(2/v.r2-1/a)),t=Math.PI*Math.sqrt(a**3/Orb.mu),p=Orb.point(Math.PI*v.progress/100,e),s=180/v.r2,cx=300,cy=245,C=U.C;let q=U.circle(cx,cy,v.r1*s,'none',C.grid)+U.circle(cx,cy,v.r2*s,'none',C.grid)+U.circle(cx,cy,Orb.R*s,'var(--earth)',C.ink)+U.path(U.range(140,t=>{const p=Orb.point(Math.PI*t,e);return[cx+p[0]*a*s,cy-p[1]*a*s];}),C.a,3)+U.circle(cx+p[0]*a*s,cy-p[1]*a*s,6,C.a,C.a)+U.arrow(cx+v.r1*s,cy,cx+v.r1*s,cy-50,C.b)+U.arrow(cx-v.r2*s,cy,cx-v.r2*s,cy+50,C.b)+U.text(cx+v.r1*s+12,cy+28,'Burn 1')+U.text(cx-v.r2*s,cy+79,'Burn 2','middle')+U.text(535,90,'Burn 1: circular → transfer ellipse')+U.text(535,128,'Burn 2: transfer ellipse → circular')+U.text(535,190,`r₁ = ${U.fmt(v.r1,0)} km`)+U.text(535,225,`r₂ = ${U.fmt(v.r2,0)} km`)+U.text(535,285,'Both burns are prograde')+U.text(535,322,'for this outward transfer.')+U.text(535,374,'Transfer: half of an ellipse.')+U.text(535,404,'Earth remains at one focus.');
 return{svg:U.svg(q,'To-scale outward Hohmann transfer with two prograde burns'),stats:[['First Δv',`${U.fmt(dv1,3)} km/s`],['Second Δv',`${U.fmt(dv2,3)} km/s`],['Coast time',`${U.fmt(t/3600,2)} h`]],equation:'a<sub>t</sub> = (r₁ + r₂)/2 &nbsp; · &nbsp; v<sub>t</sub> = √[μ(2/r − 1/a<sub>t</sub>)] &nbsp; · &nbsp; t<sub>coast</sub> = π√(a<sub>t</sub>³/μ)',note:'Coplanar circular starting and ending orbits, impulsive burns, and no plane change. Progress advances uniformly in time, not true anomaly. The displayed arrows show each burn’s direction rather than the complete spacecraft velocity.',question:'If you omit burn 2, what path does the satellite take after reaching apogee? Why must the second burn also be prograde?'};},
 checks:()=>{const r1=9000,r2=30000,a=(r1+r2)/2,vp=Math.sqrt(Orb.mu*(2/r1-1/a)),va=Math.sqrt(Orb.mu*(2/r2-1/a));return[{name:'Transfer angular momentum agrees at both apsides',pass:Math.abs(r1*vp-r2*va)<1e-8},{name:'Both outward transfer burns are positive',pass:vp>Math.sqrt(Orb.mu/r1)&&Math.sqrt(Orb.mu/r2)>va}];}
});

{
const SR_SYS='_System/Generated Files/Guided Reading 2026-10-14/subsystems.json';
const SR_RF='_System/Generated Files/Guided Reading 2026-10-14/radio.json';
const db=x=>10*Math.log10(x),lin=x=>10**(x/10),g0=9.80665,c0=299792458,kb=1.380649e-23;
const close=(a,b,t=1e-8)=>Math.abs(a-b)<t;
const control=(id,label,min,max,step,value,unit='')=>({id,label,min,max,step,value,unit});
const select=(id,label,value,options)=>({id,label,value,options:options.map(([value,label])=>({value,label}))});
const batteryEnergy=(load,eclipse,eta)=>load*eclipse/60/eta;
const pvPower=(area,eta,angle,temp,years)=>1361*area*eta*Math.max(0,Math.cos(angle*Math.PI/180))*(1-.0035*(temp-28))*.98**years*.92;
const fspl=(r,f)=>20*Math.log10(4*Math.PI*r*f/c0);
const cascade=(stages)=>{let G=1,F=1;for(const s of stages){F+=(s.F-1)/G;G*=s.G;}return {F,G};};

modules.push({id:'eclipse-battery',group:'Systems',title:'Eclipse & battery',heading:'One eclipse is an energy bill; every orbit must repay it',intro:'Follow stored energy through three eclipse–sunlight cycles and distinguish capacity from recharge capability.',sources:[SR_SYS],
controls:[control('load','Bus load',40,250,5,120,'W'),control('eclipse','Eclipse',10,60,1,35,'min'),control('sun','Sunlight',30,100,1,60,'min'),control('array','Array bus output',80,600,10,250,'W'),control('capacity','Battery capacity',70,600,10,200,'Wh'),control('dod','Allowed depth of discharge',20,90,5,60,'%')],
render(v,U){const etaD=.92,etaC=.9,spent=batteryEnergy(v.load,v.eclipse,etaD),charge=(v.array-v.load)*(v.array>=v.load?etaC:1/etaD),restore=charge*v.sun/60,period=v.eclipse+v.sun,floor=v.capacity*(1-v.dod/100);let E=v.capacity;const p=[[0,E]],sh=[];for(let n=0;n<3;n++){E-=spent;p.push([n*period+v.eclipse,E]);sh.push([n*period+v.eclipse,E]);if(charge>0&&E+restore>v.capacity){const fullAt=n*period+v.eclipse+(v.capacity-E)/charge*60;p.push([fullAt,v.capacity]);}E=Math.min(v.capacity,E+restore);p.push([(n+1)*period,E]);}const ymin=Math.min(0,...p.map(x=>x[1]))-10;return {svg:U.plot([{name:'Stored-energy demand',color:U.C.a,points:p},{name:'Permitted minimum',color:U.C.b,dash:'6 4',points:[[0,floor],[3*period,floor]]}],{xmin:0,xmax:3*period,ymin,ymax:v.capacity*1.08,xlabel:'Elapsed time (min)',ylabel:'Stored energy (Wh)',title:'Eclipse first, then sunlight; repeated three times'}),stats:[['Eclipse storage withdrawal',U.fmt(spent,1)+' Wh'],['Sunlight storage change',U.fmt(restore,1)+' Wh'],['Repeated-cycle result',spent<=v.capacity-floor&&restore>=spent?'Energy-feasible':'Fails capacity or recharge']],equation:'ΔE<sub>eclipse</sub> = P<sub>load</sub>t<sub>eclipse</sub>/η<sub>d</sub>;  ΔE<sub>sun</sub> = η<sub>c</sub>(P<sub>array</sub> − P<sub>load</sub>)t<sub>sun</sub>',note:'Constant load, fixed bus output, ηd = 0.92 and ηc = 0.90; surplus charging is curtailed at full capacity. A sunlight power deficit is drawn through the discharge converter. A curve below zero means unmet demand, not physically negative battery energy; current and temperature limits still need separate checks.',question:'Can you find a battery that survives the first eclipse but fails after several orbits? Which control repairs the recharge deficit?'};},checks:()=>[{name:'120 W for 30 min at unity efficiency consumes 60 Wh',pass:close(batteryEnergy(120,30,1),60)},{name:'Discharge inefficiency increases required storage',pass:batteryEnergy(120,30,.9)>60}]});

modules.push({id:'solar-array',group:'Systems',title:'Solar array',heading:'Sun-facing area and cell performance set useful power',intro:'Rotate a panel and vary its size, temperature and age to see why nameplate efficiency alone is insufficient.',sources:[SR_SYS],
controls:[control('area','Panel area',.5,8,.1,2,'m²'),control('eta','Reference cell efficiency',15,35,1,28,'%'),control('angle','Incidence from panel normal',0,110,1,25,'°'),control('temp','Cell temperature',-30,100,1,45,'°C'),control('years','Service time',0,15,.5,5,'years')],
render(v,U){const a=U.rad(v.angle),p=pvPower(v.area,v.eta/100,v.angle,v.temp,v.years),cx=475,cy=220,normal=[Math.cos(a),-Math.sin(a)],tangent=[Math.sin(a),Math.cos(a)];let s='';for(let y=120;y<=320;y+=50)s+=U.arrow(70,y,330,y,U.C.b);s+=U.line(cx-110*tangent[0],cy-110*tangent[1],cx+110*tangent[0],cy+110*tangent[1],U.C.a,12);s+=U.arrow(cx,cy,cx-100*normal[0],cy+100*normal[1],U.C.c);s+=U.line(cx,cy,cx-120,cy,U.C.grid,1,'4 4');s+=U.text(75,85,'Sunlight travels →');s+=U.text(590,100,'Panel edge view','middle');s+=U.text(585,345,'α = '+v.angle+'°','middle');s+=U.text(490,385,'Projected area = A max(0, cos α)','middle');const curve=U.range(90,t=>[t*90,pvPower(v.area,v.eta/100,t*90,v.temp,v.years)]);return {svg:U.svg(s,'Panel incidence angle and projected sunlight collecting area')+U.plot([{name:'Bus power',color:U.C.a,points:curve}],{xmin:0,xmax:90,ymin:0,ymax:Math.max(1,curve[0][1]*1.1),xlabel:'Incidence from panel normal (°)',ylabel:'Bus power (W)',title:'The cosine loss'}),stats:[['Delivered bus power',U.fmt(p,1)+' W'],['Temperature factor',U.fmt(1-.0035*(v.temp-28),3)],['End-of-life factor',U.fmt(.98**v.years,3)]],equation:'P = S A η<sub>ref</sub> max(0, cos α) [1 + a<sub>T</sub>(T − T<sub>ref</sub>)] f<sub>EOL</sub> f<sub>bus</sub>',note:'Illustrative model at 1 AU: S = 1361 W/m², aT = −0.0035 K⁻¹, Tref = 28 °C, 2% compounded annual degradation and 0.92 bus efficiency. These supplied teaching coefficients are not a specification for a particular cell; backside collection is excluded.',question:'At the same temperature and age, how much extra area compensates for changing incidence from 0° to 60°?'};},checks:()=>[{name:'60° incidence halves front-side output',pass:close(pvPower(1,.3,60,28,0)/pvPower(1,.3,0,28,0),.5)},{name:'Backside incidence produces zero in this model',pass:pvPower(1,.3,100,28,0)===0}]});

modules.push({id:'rocket-mass',group:'Systems',title:'Rocket equation',heading:'A later burn’s fuel must ride through every earlier burn',intro:'Build a two-burn ideal mass budget backward from the final spacecraft.',sources:[SR_SYS],
controls:[control('dry','Final retained mass',100,2000,25,600,'kg'),control('dv1','First maneuver Δv',0,4000,50,1200,'m/s'),control('dv2','Later maneuver Δv',0,2500,50,600,'m/s'),control('isp','Specific impulse',180,900,10,320,'s')],
render(v,U){const ve=v.isp*g0,m1=v.dry*Math.exp(v.dv2/ve),m0=m1*Math.exp(v.dv1/ve),p1=m0-m1,p2=m1-v.dry,scale=580/m0;let s=U.text(70,55,'Mass carried before and after ideal burns');const masses=[['Before burn 1',m0,p1+p2],['Before burn 2',m1,p2],['After burn 2',v.dry,0]];masses.forEach(([label,m,p],i)=>{let y=100+i*90;s+=U.text(70,y,label);s+=`<rect x="70" y="${y+14}" width="${v.dry*scale}" height="26" fill="${U.C.a}"/>`;if(p>0)s+=`<rect x="${70+v.dry*scale}" y="${y+14}" width="${p*scale}" height="26" fill="${U.C.b}"/>`;s+=U.text(75+m*scale,y+62,U.fmt(m,1)+' kg','end');});s+=U.text(70,409,'Retained spacecraft: solid first segment; remaining propellant: second segment');return {svg:U.svg(s,'Backward mass accounting for two ideal rocket burns'),stats:[['Initial wet mass',U.fmt(m0,1)+' kg'],['Burn 1 propellant',U.fmt(p1,1)+' kg'],['Burn 2 propellant',U.fmt(p2,1)+' kg']],equation:'v<sub>e</sub> = g<sub>0</sub>I<sub>sp</sub>; m<sub>before 2</sub> = m<sub>final</sub>e<sup>Δv₂/vₑ</sup>; m<sub>initial</sub> = m<sub>before 2</sub>e<sup>Δv₁/vₑ</sup>',note:'Ideal impulsive burns, common effective exhaust speed, no staging, and no launch gravity or drag losses. The Δv values are magnitudes of propulsive changes, not the difference between initial and final speed. Final retained mass includes everything still needed after both burns.',question:'Why is calculating each burn’s propellant using only the final retained mass an underestimate?'};},checks:()=>[{name:'Zero total Δv has unit mass ratio',pass:Math.exp(0/(320*g0))===1},{name:'Successive equal-Isp ratios multiply into the total Δv ratio',pass:close(Math.exp(1200/(320*g0))*Math.exp(600/(320*g0)),Math.exp(1800/(320*g0)))}]});

modules.push({id:'electric-propulsion',group:'Systems',title:'Electric thrust',heading:'High exhaust speed saves propellant but costs thrust at fixed power',intro:'Trade electrical power and specific impulse against thrust, mass flow and an approximate maneuver time.',sources:[SR_SYS],
controls:[control('power','Electrical input',200,12000,100,2500,'W'),control('eta','Jet efficiency',30,85,1,60,'%'),control('isp','Specific impulse',500,5000,50,2000,'s'),control('mass','Vehicle mass',100,1500,25,500,'kg'),control('dv','Small maneuver Δv',10,250,5,100,'m/s')],
render(v,U){const ve=g0*v.isp,eta=v.eta/100,F=2*eta*v.power/ve,md=F/ve,t=v.mass*v.dv/F/86400,points=U.range(150,t=>{let I=500+4500*t;return[I,2*eta*v.power/(g0*I)*1000];});let s=U.arrow(240,220,100,220,U.C.b,'Exhaust');s+=U.arrow(450,220,620,220,U.C.a,'Thrust');s+=`<rect x="260" y="160" width="170" height="120" rx="8" fill="none" stroke="${U.C.ink}" stroke-width="2"/>`;s+=U.text(345,205,'Electrical power','middle');s+=U.text(345,235,U.fmt(v.power/1000,2)+' kW','middle');s+=U.text(400,340,'Momentum: F = ṁvₑ; kinetic jet power: ½ṁvₑ² = ηP','middle');return {svg:U.svg(s,'Electric thruster momentum and kinetic energy flow')+U.plot([{name:'Thrust at fixed input power',color:U.C.a,points},{name:'Selected Isp',color:U.C.c,dash:'4 4',points:[[v.isp,0],[v.isp,points[0][1]*1.1]]}],{xmin:500,xmax:5000,ymin:0,ymax:points[0][1]*1.1,xlabel:'Specific impulse (s)',ylabel:'Thrust (mN)',title:'The fixed-power tradeoff'}),stats:[['Thrust',U.fmt(F*1000,1)+' mN'],['Propellant flow',U.fmt(md*86400,3)+' kg/day'],['Approximate maneuver time',U.fmt(t,2)+' days']],equation:'F = ṁv<sub>e</sub>,  ηP = ½ṁv<sub>e</sub>²  ⇒  F = 2ηP/v<sub>e</sub>,  ṁ = 2ηP/v<sub>e</sub>²',note:'Illustrative steady kinetic-jet model; η describes the fraction of electrical input converted into directed exhaust kinetic power. Maneuver time uses Δv ≈ Ft/m with nearly constant mass and excludes steering/orbital effects. It is not an impulsive-transfer duration prediction.',question:'At fixed electrical power and efficiency, what happens to thrust and propellant flow when specific impulse doubles?'};},checks:()=>[{name:'Doubling exhaust speed halves fixed-power thrust',pass:close((2*.6*2000/(2*20000))/(2*.6*2000/20000),.5)},{name:'Thrust and mass flow recover the kinetic power',pass:close(.5*(2*.6*2000/20000**2)*20000**2,.6*2000)}]});

modules.push({id:'thermal-balance',group:'Systems',title:'Heat & radiator',heading:'RF power, waste heat and radiator temperature are connected',intro:'Increase transmitter output or amplifier efficiency and follow the change in DC demand and equilibrium temperature.',sources:[SR_SYS],
controls:[control('rf','RF output power',10,500,10,100,'W'),control('eta','Amplifier efficiency',15,80,1,40,'%'),control('area','Radiating area',.2,5,.1,1,'m²'),control('emiss','Radiator emissivity',20,95,1,80,'%'),control('absorbed','Other absorbed heat',0,500,10,80,'W')],
render(v,U){const sigma=5.670374419e-8,env=200,dc=v.rf/(v.eta/100),heat=dc-v.rf,q=heat+v.absorbed,T=(q/(v.emiss/100*sigma*v.area)+env**4)**.25;const Tmax=Math.max(550,T*1.15),pts=U.range(160,t=>{let K=200+(Tmax-200)*t;return[K,v.emiss/100*sigma*v.area*(K**4-env**4)];});return {svg:U.plot([{name:'Net radiative cooling',color:U.C.a,points:pts},{name:'Heat to reject',color:U.C.b,dash:'6 4',points:[[200,q],[Tmax,q]]}],{xmin:200,xmax:Tmax,ymin:0,ymax:Math.max(q,pts.at(-1)[1])*1.05,xlabel:'Radiator temperature (K)',ylabel:'Heat flow (W)',title:'The intersection is the lumped equilibrium'}),stats:[['Amplifier DC demand',U.fmt(dc,1)+' W'],['Amplifier waste heat',U.fmt(heat,1)+' W'],['Equilibrium temperature',U.fmt(T,1)+' K ('+U.fmt(T-273.15,1)+' °C)']],equation:'P<sub>heat</sub> = P<sub>RF</sub>(1/η<sub>PA</sub> − 1);  Q = εσA(T⁴ − T<sub>env</sub>⁴)',note:'Lumped steady-state teaching model with a uniform effective 200 K radiative environment, no transient heat capacity and no view-factor detail. Other absorbed heat excludes radiation already represented by Tenv. Use kelvin in the fourth-power relation; real spacecraft need separate surfaces and illumination geometry.',question:'Why does doubling heat to reject fail to double the radiator’s kelvin temperature?'};},checks:()=>[{name:'40% efficiency and 100 W RF imply 150 W waste heat',pass:close(100/.4-100,150)},{name:'Net radiative exchange vanishes at equal temperatures',pass:5.670374419e-8*(300**4-300**4)===0}]});

modules.push({id:'db-distance',group:'RF',title:'dB & distance',heading:'Logarithms turn power ratios into distances you can compare',intro:'Compare a power ratio in watts and decibels while watching free-space spreading reduce received power.',sources:[SR_RF],
controls:[control('pt','Transmitted power',1,100,1,20,'W'),control('range','Reference range',100,40000,100,10000,'km'),control('mult','Range multiplier',.5,4,.1,2,'×'),control('gain','Net antenna gains',0,70,1,40,'dB'),control('freq','Carrier frequency',.5,30,.5,8,'GHz')],
render(v,U){const r=v.range*1000,f=v.freq*1e9,L=fspl(r,f),Pr=db(v.pt)+v.gain-L,p2=Pr-20*Math.log10(v.mult),pts=U.range(160,t=>{let mult=.5+3.5*t;return[mult,Pr-20*Math.log10(mult)];});return {svg:U.plot([{name:'Received power',color:U.C.a,points:pts},{name:'Selected range multiplier',color:U.C.c,dash:'4 4',points:[[v.mult,Pr-14],[v.mult,Pr+8]]}],{xmin:.5,xmax:4,ymin:Pr-14,ymax:Pr+8,xlabel:'Range / reference range (dimensionless)',ylabel:'Received power (dBW)',title:'Fixed frequency, fixed antenna gains, no excess loss'}),stats:[['Transmit power',U.fmt(db(v.pt),2)+' dBW / '+U.fmt(db(v.pt)+30,2)+' dBm'],['At reference range',U.fmt(Pr,2)+' dBW'],['At selected multiplier',U.fmt(p2,2)+' dBW ('+U.fmt(p2-Pr,2)+' dB change)']],equation:'P<sub>dBW</sub> = 10 log₁₀(P/1 W);  P<sub>dBm</sub> = P<sub>dBW</sub> + 30;  ΔP<sub>r,dB</sub> = −20 log₁₀(d₂/d₁)',note:'The free-space far-field comparison holds antenna gains fixed when frequency changes; fixed physical dishes are a different comparison. A negative dBW value is a positive physical power below one watt, not negative energy. Power ratios use 10 log; equal-impedance field-amplitude ratios use 20 log.',question:'How many decibels are lost by doubling distance, and how much transmitter power would recover that loss?'};},checks:()=>[{name:'One watt is zero dBW and 30 dBm',pass:db(1)===0&&db(1)+30===30},{name:'Doubling range loses 6.0206 dB',pass:close(20*Math.log10(2),6.020599913279624)}]});

modules.push({id:'link-budget',group:'RF',title:'Link budget',heading:'Follow carrier power to the receiver, then compare it with noise',intro:'Adjust the path and hardware and see a step-by-step power budget alongside noise and bit-energy metrics.',sources:[SR_RF],
controls:[control('pt','Transmitter power',0,30,1,12,'dBW'),control('gt','Transmit gain',0,45,1,25,'dBi'),control('gr','Receive gain',0,55,1,35,'dBi'),control('range','Slant range',500,42000,500,36000,'km'),control('freq','Frequency',1,30,.5,12,'GHz'),control('loss','Other losses',0,20,.5,3,'dB'),control('temp','System noise temperature',50,1000,10,300,'K'),control('rate','Information bit rate',.1,50,.1,5,'Mbit/s')],
render(v,U){const L=fspl(v.range*1000,v.freq*1e9),eirp=v.pt+v.gt,Pr=eirp-L-v.loss+v.gr,N0=db(kb*v.temp),cn0=Pr-N0,eb=cn0-db(v.rate*1e6),vals=[v.pt,eirp,eirp-L,eirp-L-v.loss,Pr],labels=['Transmitter','+ TX gain','− Free-space','− Other loss','+ RX gain'];let s='';const ymin=Math.min(...vals)-12,ymax=Math.max(...vals)+12,Y=y=>365-(y-ymin)/(ymax-ymin)*290;for(let i=0;i<5;i++){let x=100+i*145;s+=U.line(x-45,Y(vals[i]),x+45,Y(vals[i]),i===4?U.C.a:U.C.b,5);if(i<4)s+=U.line(x+45,Y(vals[i]),x+100,Y(vals[i+1]),U.C.grid,1,'4 3');s+=U.text(x,Y(vals[i])-12,U.fmt(vals[i],1),'middle');s+=U.text(x,405,labels[i],'middle');}s+=U.text(45,40,'Carrier power at each budget step (dBW)');return {svg:U.svg(s,'Link-budget waterfall from transmitter to received carrier power'),stats:[['Received carrier',U.fmt(Pr,2)+' dBW'],['C/N₀',U.fmt(cn0,2)+' dB·Hz'],['Eb/N₀ at selected rate',U.fmt(eb,2)+' dB']],equation:'C = EIRP − L<sub>FS</sub> − L<sub>other</sub> + G<sub>r</sub>; C/N₀ = C − 10 log₁₀(k<sub>B</sub>T<sub>sys</sub>); E<sub>b</sub>/N₀ = C/N₀ − 10 log₁₀R<sub>b</sub>',note:'Matched, correctly pointed far-field free-space link. Other losses are included once, and Tsys is referred to the same receiver-input plane as C; N₀ = kBTsys is noise power per hertz. Eb/N₀ is a derived energy-per-information-bit ratio, not a promise of a particular error rate or coding performance.',question:'Why does doubling bit rate lower Eb/N₀ even when the received carrier power stays unchanged?'};},checks:()=>[{name:'1 GHz at 1 km has 92.4478 dB free-space path loss',pass:close(fspl(1000,1e9),92.44778322188338,1e-6)},{name:'Doubling noise temperature lowers C/N0 by 3.0103 dB',pass:close(db(2),3.010299956639812)}]});

modules.push({id:'receiver-noise',group:'RF',title:'Noise cascade',heading:'A lossy first stage makes later low-noise gain less useful',intro:'Swap the same filter and low-noise amplifier and compare their input-referred noise contributions.',sources:[SR_RF],
controls:[control('loss','Filter insertion loss',0,8,.2,2,'dB'),control('gain','LNA power gain',5,40,1,25,'dB'),control('nf','LNA noise figure',.2,5,.1,1,'dB'),control('nf2','Later receiver noise figure',3,20,.5,10,'dB'),select('order','Input-stage order',0,[[0,'Filter → LNA → receiver'],[1,'LNA → filter → receiver']])],
render(v,U){const L=lin(v.loss),g=lin(v.gain),F=lin(v.nf),F2=lin(v.nf2),filter={name:'Filter',F:L,G:1/L},lna={name:'LNA',F,G:g},rx={name:'Receiver',F:F2,G:1},s0=[filter,lna,rx],s1=[lna,filter,rx],seq=v.order?s1:s0,all=cascade(seq),alt=cascade(v.order?s0:s1);let s='',G=1;const terms=seq.map(z=>{const n=(z.F-1)/G;G*=z.G;return n;});const max=Math.max(...terms,.01);seq.forEach((z,i)=>{let x=70+i*250;s+=`<rect x="${x}" y="95" width="160" height="60" fill="none" stroke="${U.C.ink}"/>`;s+=U.text(x+80,130,z.name,'middle');if(i<2)s+=U.arrow(x+165,125,x+235,125,U.C.a);let h=150*terms[i]/max;s+=`<rect x="${x+40}" y="${340-h}" width="80" height="${h}" fill="${U.C.a}"/>`;s+=U.text(x+80,370,U.fmt(terms[i],3),'middle');s+=U.text(x+80,397,'Input-referred F − 1','middle');});return {svg:U.svg(s,'Filter and amplifier order with linear noise-factor contributions'),stats:[['Selected total noise figure',U.fmt(db(all.F),2)+' dB'],['Equivalent input temperature',U.fmt((all.F-1)*290,1)+' K'],['Opposite order noise figure',U.fmt(db(alt.F),2)+' dB']],equation:'F<sub>total</sub> = F₁ + (F₂ − 1)/G₁ + (F₃ − 1)/(G₁G₂); T<sub>e</sub> = (F<sub>total</sub> − 1)T₀',note:'Matched stages at the common reference temperature T₀ = 290 K. Gains and noise factors in the sum are linear, not dB; a passive loss L has gain 1/L and noise factor L. A front filter can still be needed to prevent overload, which this small-signal noise model does not predict.',question:'Make LNA gain very large. Why does a filter placed before it still hurt, while a filter after it becomes less important?'};},checks:()=>[{name:'A passive 2 dB filter alone has 2 dB noise figure at T0',pass:close(db(cascade([{F:lin(2),G:1/lin(2)}]).F),2)},{name:'Noiseless gain reduces later input-referred added noise',pass:cascade([{F:1,G:100},{F:10,G:1}]).F<cascade([{F:1,G:1},{F:10,G:1}]).F}]});

modules.push({id:'doppler-shift',group:'RF',title:'Doppler',heading:'Only the line-of-sight velocity changes range instantaneously',intro:'Turn a velocity vector while keeping its magnitude fixed and watch the Doppler shift change sign.',sources:[SR_RF],
controls:[control('freq','Carrier frequency',.1,30,.1,8,'GHz'),control('speed','Relative speed',0,8,.1,4,'km/s'),control('angle','Velocity from outward line of sight',0,360,1,45,'°')],
render(v,U){const a=U.rad(v.angle),rate=v.speed*1000*Math.cos(a),df=-v.freq*1e9/c0*rate,speedLength=v.speed*16;let s=U.circle(140,220,28,'none',U.C.ink)+U.circle(615,220,18,'none',U.C.a);s+=U.arrow(185,220,570,220,U.C.grid);s+=U.text(365,192,'Outward line of sight','middle');if(v.speed>0)s+=U.arrow(615,220,615+speedLength*Math.cos(a),220-speedLength*Math.sin(a),U.C.a);if(Math.abs(rate)>1e-8)s+=U.arrow(615,240,615+speedLength*Math.cos(a),240,U.C.b);s+=U.text(140,275,'Receiver','middle');s+=U.text(615,285,'Transmitter','middle');s+=U.text(400,365,rate>1e-8?'Receding: observed frequency is lower':rate< -1e-8?'Approaching: observed frequency is higher':'Transverse: zero first-order instantaneous shift','middle');const pts=U.range(180,t=>[t*360,-v.freq*1e9/c0*(v.speed*1000)*Math.cos(t*2*Math.PI)/1000]);return {svg:U.legend([{name:'Relative velocity',color:U.C.a},{name:'Radial component',color:U.C.b}])+U.svg(s,'Range-rate projection of relative transmitter velocity')+U.plot([{name:'Frequency shift',color:U.C.a,points:pts}],{xmin:0,xmax:360,ymin:-Math.max(1,v.freq*1e9/c0*v.speed),ymax:Math.max(1,v.freq*1e9/c0*v.speed),xlabel:'Velocity angle from outward line of sight (°)',ylabel:'Frequency shift (kHz)',title:'Same speed, different radial component'}),stats:[['Range rate ḋ',U.fmt(rate,1)+' m/s'],['Frequency shift Δf',U.fmt(df/1000,3)+' kHz'],['Observed carrier',U.fmt(v.freq+df/1e9,7)+' GHz']],equation:'ḋ = |v<sub>relative</sub>| cos ψ; Δf ≈ −(f<sub>c</sub>/c)ḋ',note:'The drawn velocity is transmitter velocity relative to a stationary receiver, projected onto the direction from receiver to transmitter; positive range rate means recession. This first-order model assumes speed ≪ c and omits higher-order relativistic shifts. A GEO satellite can move inertially while having nearly zero range rate to an Earth-fixed station.',question:'At which two velocity angles is the instantaneous Doppler shift zero despite nonzero speed?'};},checks:()=>[{name:'Recession has negative shift',pass:-8e9/c0*1000<0},{name:'Exactly transverse motion has zero first-order shift',pass:Math.abs(Math.cos(Math.PI/2))<1e-15}]});

modules.push({id:'rain-path',group:'RF',title:'Rain & elevation',heading:'A low look angle takes a longer path through the rain',intro:'Join station elevation geometry to an empirical attenuation model with explicitly supplied coefficients.',sources:[SR_RF],
controls:[control('el','Antenna elevation',5,90,1,35,'°'),control('height','Rain-layer height above station',.5,5,.1,2,'km'),control('rain','Rain rate',0,100,1,25,'mm/h'),control('k','Empirical coefficient k',.005,.1,.005,.03,''),control('alpha','Empirical exponent α',.7,1.5,.05,1.1,'')],
render(v,U){const el=U.rad(v.el),gamma=v.k*v.rain**v.alpha,L=v.height/Math.sin(el),A=gamma*L,pts=U.range(100,t=>{let E=5+85*t;return[E,gamma*v.height/Math.sin(U.rad(E))];});const sx=100,sy=355,h=175,dx=h/Math.tan(el),end=Math.min(730,sx+dx),lineH=(end-sx)*Math.tan(el);let s=`<rect x="65" y="${sy-h}" width="670" height="${h}" fill="${U.C.b}" opacity="0.08"/>`;s+=U.line(65,sy,735,sy,U.C.ink,2);s+=U.line(65,sy-h,735,sy-h,U.C.grid,1,'5 4');s+=U.arrow(sx,sy,end,sy-lineH,U.C.a);s+=U.text(70,sy-h-20,'Top of uniform rain layer');s+=U.text(105,390,'Earth station');s+=U.text(500,320,'Elevation = '+v.el+'°','middle');if(sx+dx>730)s+=U.text(470,130,'Slant ray continues beyond this schematic','middle');return {svg:U.svg(s,'Slant ray through a flat uniform rain layer')+U.plot([{name:'Rain attenuation',color:U.C.a,points:pts}],{xmin:5,xmax:90,ymin:0,ymax:Math.max(1,pts[0][1]*1.1),xlabel:'Elevation angle (°)',ylabel:'Rain attenuation (dB)',title:'Same rain, different path length'}),stats:[['Specific attenuation',U.fmt(gamma,3)+' dB/km'],['Rain path length',U.fmt(L,2)+' km'],['Rain attenuation',U.fmt(A,2)+' dB']],equation:'γ<sub>R</sub> = kR<sup>α</sup>; L<sub>rain</sub> = (h<sub>R</sub> − h<sub>s</sub>)/sin E; A<sub>R</sub> = γ<sub>R</sub>L<sub>rain</sub>',note:'Flat, uniform finite-height layer; the sliders supply illustrative empirical coefficients, not frequency-calibrated predictions. Earth curvature and the finite horizontal extent of rain matter near the horizon, so the slider stops at 5°. No outage probability is inferred from a single rain-rate setting.',question:'With the same layer and rain rate, why is attenuation at 30° twice the zenith attenuation?'};},checks:()=>[{name:'30 degree elevation doubles zenith path length',pass:close(1/Math.sin(Math.PI/6),2)},{name:'Zero rain has zero attenuation for positive exponent',pass:.03*0**1.1===0}]});

modules.push({id:'bandwidth-noise',group:'RF',title:'Bandwidth & noise',heading:'More bandwidth admits more noise but may carry more information',intro:'Keep total received carrier power fixed while changing the receiver’s equivalent noise bandwidth.',sources:[SR_RF],
controls:[control('carrier','Received carrier',-155,-100,1,-130,'dBW'),control('temp','System noise temperature',50,1500,10,300,'K'),control('band','Noise bandwidth',.01,30,.01,1,'MHz')],
render(v,U){const B=v.band*1e6,C=lin(v.carrier),N=kb*v.temp*B,snr=C/N,cap=B*Math.log2(1+snr),pts=U.range(160,t=>{let b=10**(4+Math.log10(3000)*t);return[b/1e6,b*Math.log2(1+C/(kb*v.temp*b))/1e6];}),noise=U.range(160,t=>{let b=.01+29.99*t;return[b,db(kb*v.temp*b*1e6)];});return {svg:U.plot([{name:'Noise power',color:U.C.b,points:noise},{name:'Fixed carrier power',color:U.C.a,dash:'6 4',points:[[.01,v.carrier],[30,v.carrier]]},{name:'Selected bandwidth',color:U.C.c,dash:'4 4',points:[[v.band,Math.min(noise[0][1],v.carrier)-5],[v.band,Math.max(noise.at(-1)[1],v.carrier)+5]]}],{xmin:.01,xmax:30,ymin:Math.min(noise[0][1],v.carrier)-5,ymax:Math.max(noise.at(-1)[1],v.carrier)+5,xlabel:'Equivalent noise bandwidth (MHz)',ylabel:'Input power (dBW)',title:'Carrier fixed; noise grows with bandwidth'})+U.plot([{name:'Ideal AWGN capacity',color:U.C.a,points:pts},{name:'Selected bandwidth',color:U.C.c,dash:'4 4',points:[[v.band,0],[v.band,Math.max(1,pts.at(-1)[1]*1.1)]]}],{xmin:.01,xmax:30,ymin:0,ymax:Math.max(1,pts.at(-1)[1]*1.1),xlabel:'Bandwidth (MHz)',ylabel:'Ideal capacity (Mbit/s)',title:'Shannon’s bound, not a modem performance claim'}),stats:[['Noise power',U.fmt(db(N),2)+' dBW'],['C/N',U.fmt(db(snr),2)+' dB'],['Ideal capacity bound',U.fmt(cap/1e6,3)+' Mbit/s']],equation:'N = k<sub>B</sub>T<sub>sys</sub>B; SNR = C/N; 𝒞 = B log₂(1 + SNR)',note:'Ideal additive white Gaussian noise with fixed total carrier power, flat noise density and signal-compatible bandwidth. A narrower real filter can cut off wanted signal, so it cannot be assumed to reduce noise without consequences. Capacity is an ideal upper bound, not an achievable promise for a given coding scheme.',question:'Why can the ideal capacity rise while the carrier-to-noise ratio falls?'};},checks:()=>[{name:'At 290 K, 1 MHz noise is kTB',pass:close(db(kb*290*1e6),-143.97518719422808,1e-6)},{name:'Doubling bandwidth doubles thermal noise',pass:close((kb*300*2e6)/(kb*300*1e6),2)}]});
modules.push({id:'radiation-redundancy',group:'Systems',title:'Radiation & voting',heading:'Three copies mask one bad bit; shared failures can defeat the vote',intro:'Inject channel faults into a majority voter and compare independent errors with a common-cause event.',sources:[SR_SYS],
controls:[select('bit','Correct input bit',1,[[0,'0'],[1,'1']]),select('fault','Illustrated fault scenario',1,[[0,'No channel fault'],[1,'One channel flips'],[2,'Two channels flip'],[3,'Common cause flips all three'],[4,'Voter flips its output']]),control('p','Independent error probability per channel',0,40,.5,5,'%'),control('q','All-channel common-cause flip probability',0,20,.5,0,'%')],
render(v,U){const p=v.p/100,q=v.q/100,ind=3*p*p-2*p*p*p,mix=q+(1-q)*ind,bits=[v.bit,v.bit,v.bit];if(v.fault===1)bits[0]=1-bits[0];if(v.fault===2){bits[0]=1-bits[0];bits[1]=1-bits[1];}if(v.fault===3)bits.fill(1-v.bit);let output=bits.reduce((a,b)=>a+b,0)>=2?1:0;if(v.fault===4)output=1-output;let s='';bits.forEach((b,i)=>{const y=90+i*115;s+=U.text(75,y+10,'Channel '+(i+1));s+=`<rect x="190" y="${y-25}" width="90" height="60" fill="none" stroke="${b===v.bit?U.C.a:U.C.b}" stroke-width="3"/>`;s+=U.text(235,y+11,String(b),'middle');s+=U.arrow(290,y+5,455,205,U.C.grid);});s+=`<rect x="465" y="165" width="155" height="90" fill="none" stroke="${U.C.ink}" stroke-width="2"/>`;s+=U.text(542,202,'Majority voter','middle');s+=U.text(542,230,v.fault===4?'Voter fault injected':'2 of 3 agree','middle');s+=U.arrow(630,210,715,210,output===v.bit?U.C.a:U.C.b);s+=U.text(735,218,String(output),'middle');s+=U.text(400,410,'Selected scenario: '+(output===v.bit?'correct output':'incorrect output'),'middle');const probabilityCurves=[{name:'Single channel, independent',color:U.C.a,points:U.range(160,t=>[t*40,t*40])},{name:'TMR, independent channels',color:U.C.b,dash:'6 4',points:U.range(160,t=>{const z=t*.4;return[t*40,(3*z*z-2*z*z*z)*100];})},{name:'TMR with common cause',color:U.C.c,points:U.range(160,t=>{const z=t*.4;return[t*40,(q+(1-q)*(3*z*z-2*z*z*z))*100];})},{name:'Selected channel error p',color:U.C.ink,dash:'3 4',points:[[v.p,0],[v.p,55]]}];return {svg:U.svg(s,'Triple modular redundancy, fault injection and majority voting')+U.plot(probabilityCurves,{xmin:0,xmax:40,ymin:0,ymax:55,xlabel:'Independent channel error probability p (%)',ylabel:'Output error probability (%)',title:'Supplied probability model; common-cause curve uses current q'}),stats:[['Single-channel independent error',U.fmt(v.p,2)+'%'],['TMR, independent channels',U.fmt(ind*100,3)+'%'],['TMR with common-cause event',U.fmt(mix*100,3)+'%']],equation:'P<sub>TMR,ind</sub> = 3p²(1 − p) + p³ = 3p² − 2p³; P<sub>with common cause</sub> = q + (1 − q)P<sub>TMR,ind</sub>',note:'The probability comparison is a supplied Bernoulli teaching model with independent channel flips outside an all-channel-flip event of probability q and a perfect voter. The illustrated voter-fault scenario is separate from that calculation. Voting may mask a bit upset; it does not reverse accumulated ionizing-dose damage, displacement damage, latch-up or shared hardware failure.',question:'Set independent error probability to zero but keep a nonzero common-cause probability. Why does the three-channel system still fail?'};},checks:()=>[{name:'One wrong bit cannot change a perfect majority voter',pass:([1,1,0].reduce((a,b)=>a+b,0)>=2)},{name:'At p=0.1, independent TMR error is 0.028',pass:close(3*.1**2-2*.1**3,.028)},{name:'At p=0, common-cause events remain a failure floor',pass:close(.02+(1-.02)*(3*0**2-2*0**3),.02)}]});
}

const waveSources=['_System/Generated Files/Guided Reading 2026-10-14/waves_antennas.json: Electromagnetic waves chapter','Reference/Course Information/Video Transcripts/Yn-MEMaiA0Y.transcript.txt','Reference/Course Information/Video Transcripts/R3KHaRWzpFM.transcript.txt','Reference/Course Information/Video Transcripts/1V26Yr5KzW8.transcript.txt'];
const c0=299792458,eta0=376.730313668,eps0=8.8541878128e-12,mu0=4*Math.PI*1e-7;
modules.push({id:'divergence-curl',group:'Waves',title:'Divergence & curl',heading:'Outward flow and local circulation measure different things',intro:'Mix a radial field with a rotating field to separate net outward flux from local swirl.',sources:waveSources,controls:[{id:'a',label:'Radial coefficient a',min:-1,max:1,step:.1,value:.6},{id:'b',label:'Swirl coefficient b',min:-1,max:1,step:.1,value:.5},{id:'phase',label:'Wheel animation phase',min:0,max:360,step:3,value:20,unit:'°'}],animate:{id:'phase',min:0,max:360,step:4},render(v,U){const {C}=U,cx=300,cy=225,scale=65;let z=U.text(65,28,'A local x–y slice of a 3D field; no z dependence');for(let i=-3;i<=3;i++)for(let j=-2;j<=2;j++){const x=cx+i*scale,y=cy-j*scale,fx=v.a*i-v.b*j,fy=v.a*j+v.b*i;z+=U.arrow(x,y,x+12*fx,y-12*fy,C.a)}z+=U.line(cx-225,cy,cx+225,cy,C.grid)+U.line(cx,cy+170,cx,cy-170,C.grid)+U.text(cx+235,cy+5,'x')+U.text(cx+10,cy-175,'y');z+=`<rect x="${cx-32}" y="${cy-32}" width="64" height="64" fill="none" stroke="${C.b}" stroke-dasharray="5 4"/>`+U.wheel(cx,cy,24,-U.rad(v.phase)*v.b,C.c);z+=U.text(565,122,'Dashed box: flux test')+U.text(565,160,'Wheel: circulation test')+U.text(565,223,'a > 0: net outward flux')+U.text(565,259,'a < 0: net inward flux')+U.text(565,317,'b > 0: counterclockwise')+U.text(565,352,'b < 0: clockwise');return{svg:U.svg(z,'Radial plus rotating vector field with a local flux box and pinwheel')+U.legend([{name:'F vectors',color:C.a},{name:'Flux contour',color:C.b,dash:true},{name:'Curl sensor',color:C.c}]),stats:[['Divergence ∇ · F',U.fmt(2*v.a)],['Curl z component',U.fmt(2*v.b)],['Local measures',v.a===0&&v.b!==0?'Zero divergence, nonzero curl':v.b===0&&v.a!==0?'Zero curl, nonzero divergence':v.a===0&&v.b===0?'Zero field':'Both are present']],equation:'F = (ax − by, ay + bx, 0)<br>∇ · F = 2a; &nbsp; ∇ × F = (0, 0, 2b)',note:'Coordinates and coefficients are normalized teaching quantities, not a complete electromagnetic wave solution. Divergence concerns net flux through a closed surface; the box represents its x–y slice here. Curl concerns circulation per unit area and points along the wheel axle by the right-hand rule.',question:'Can you make the wheel spin while the net outward flux is zero, then reverse those roles?'}},checks:()=>[{name:'Pure radial field has no curl',pass:(0-0)===0},{name:'Solid-body rotation curl is twice angular coefficient',pass:(.7-(-.7))===1.4}]});
modules.push({id:'standing-wave',group:'Waves',title:'Standing waves',heading:'Counter-propagating waves can leave fixed nodes',intro:'Add a reflected wave to the forward wave and compare moving crests with a stationary amplitude envelope.',sources:waveSources.concat(['_System/Generated Files/Guided Reading 2026-10-14/waves_antennas.json: wire standing-current discussion']),controls:[{id:'gamma',label:'Reflection magnitude |Γ|',min:0,max:1,step:.05,value:1},{id:'delta',label:'Reflection phase δ',min:0,max:360,step:5,value:180,unit:'°'},{id:'phase',label:'Time phase',min:0,max:360,step:3,value:30,unit:'°'}],animate:{id:'phase',min:0,max:360,step:4},render(v,U){const {C}=U,t=U.rad(v.phase),d=U.rad(v.delta),f=x=>Math.cos(t-2*Math.PI*x),b=x=>v.gamma*Math.cos(t+2*Math.PI*x+d),env=x=>Math.sqrt(Math.max(0,1+v.gamma*v.gamma+2*v.gamma*Math.cos(4*Math.PI*x+d)));const mk=(name,color,fn,dash)=>({name,color,dash,points:U.range(250,q=>[2*q,fn(2*q)])});return{svg:U.plot([mk('Forward (+z)',C.a,f,'5 4'),mk('Reflected (−z)',C.b,b,'3 4'),mk('Total instantaneous field',C.c,x=>f(x)+b(x)),mk('Fixed upper envelope',C.muted,env,'7 5'),mk('Fixed lower envelope',C.muted,x=>-env(x),'7 5')],{xmin:0,xmax:2,ymin:-2.2,ymax:2.2,xlabel:'Position z/λ (wavelengths)',ylabel:'Field / forward peak',title:'The total field changes; its envelope stays fixed',height:430}),stats:[['Maximum envelope',U.fmt(1+v.gamma,2)],['Minimum envelope',U.fmt(1-v.gamma,2)],['Standing-wave ratio',v.gamma===1?'∞ (exact nulls)':U.fmt((1+v.gamma)/(1-v.gamma),2)]],equation:'E = cos(ωt − kz) + |Γ| cos(ωt + kz + δ)<br>|Ẽ(z)| = √[1 + |Γ|² + 2|Γ| cos(2kz + δ)]',note:'This displays one transverse electric-field component for a monochromatic incident/reflected pair in a lossless medium. It is not the full near-field model of a wire antenna. Exact stationary nodes occur only when the amplitudes are equal; partial reflection leaves nonzero minima, spaced by λ/2.',question:'At full reflection, why does changing time move the field up and down without moving the node positions?'}},checks:()=>[{name:'Equal opposite phasors at z=0 give a node',pass:Math.abs(2+2*Math.cos(Math.PI))<1e-12},{name:'No reflection gives unit constant envelope',pass:Math.sqrt(1+0+0)===1}]});
modules.push({id:'plane-wave',group:'Waves',title:'E, H & energy',heading:'A plane wave carries perpendicular fields together',intro:'Follow a linearly polarized wave: E and H rise together, while energy travels along their cross product.',sources:waveSources,controls:[{id:'frequency',label:'Frequency',min:.3,max:3,step:.1,value:1,unit:'GHz'},{id:'eps',label:'Relative permittivity',min:1,max:9,step:.5,value:1},{id:'amplitude',label:'Peak E field',min:1,max:30,step:1,value:10,unit:'V/m'},{id:'phase',label:'Time phase',min:0,max:360,step:2,value:40,unit:'°'}],animate:{id:'phase',min:0,max:360,step:3},render(v,U){const {C}=U,lambda=c0/(v.frequency*1e9*Math.sqrt(v.eps)),eta=eta0/Math.sqrt(v.eps),phase=U.rad(v.phase);const p=(x,y,z)=>[95+x*575+z*28,260-y*85-z*43];let s='';s+=U.arrow(...p(0,0,0),...p(1.08,0,0),C.ink)+U.text(700,278,'+x propagation');s+=U.arrow(...p(0,0,0),...p(0,1.1,0),C.a)+U.text(68,158,'+y, E');s+=U.arrow(...p(0,0,0),...p(0,0,1.4),C.b)+U.text(130,188,'+z, H');let pe=[],ph=[];for(let i=0;i<=100;i++){let x=i/100,a=Math.cos(phase-4*Math.PI*x);pe.push(p(x,a,0));ph.push(p(x,0,a))}s+=U.path(pe,C.a,3)+U.path(ph,C.b,3,'6 3');for(let i=3;i<100;i+=8){let x=i/100,a=Math.cos(phase-4*Math.PI*x);s+=U.arrow(...p(x,0,0),...p(x,a,0),C.a)+U.arrow(...p(x,0,0),...p(x,0,a),C.b)}s+=U.text(85,35,'Lossless, nonmagnetic medium; orthographic view')+U.text(85,63,'Field heights normalized separately: H is not numerically equal to E')+U.line(95,360,670,360,C.grid)+U.line(95,354,95,366,C.grid)+U.line(382.5,354,382.5,366,C.grid)+U.line(670,354,670,366,C.grid)+U.text(95,389,'0 m','middle')+U.text(382.5,389,U.fmt(lambda,3)+' m = λ','middle')+U.text(670,389,U.fmt(2*lambda,3)+' m','middle');return{svg:U.svg(s,'Three-dimensional schematic of E and H along a travelling plane wave')+U.legend([{name:'Electric field E (y)',color:C.a},{name:'Magnetic field H (z)',color:C.b,dash:true}]),stats:[['Wavelength',U.fmt(lambda,3)+' m'],['Peak H',U.fmt(v.amplitude/eta,4)+' A/m'],['Average power flux',U.fmt(v.amplitude**2/(2*eta),4)+' W/m²']],equation:'E = ŷ E₀ cos(ωt − kx) &nbsp; H = ẑ (E₀/η) cos(ωt − kx)<br>η = √(μ/ε), &nbsp; ⟨S⟩ = E₀²/(2η) x̂',note:'The axes show a schematic 3D projection. The two field amplitudes use separate visual scales. E × H points along +x even during the half-cycle when both fields reverse; the factor ½ uses peak phasors.',question:'If both E and H reverse together, does the direction of energy flow reverse?'}},checks:()=>[{name:'Free-space 1 GHz wavelength',pass:Math.abs(c0/1e9-.299792458)<1e-10},{name:'E=10 V/m gives H=E/eta',pass:Math.abs(10/eta0-.0265441873)<1e-8}]});
modules.push({id:'polarization',group:'Waves',title:'Polarization',heading:'Watch the electric-field tip trace its polarization',intro:'Change the relative amplitude and phase of two transverse components, at one fixed point in space.',sources:waveSources,controls:[{id:'ratio',label:'z/y amplitude ratio',min:0,max:2,step:.05,value:1},{id:'delta',label:'Relative phase δ',min:-180,max:180,step:5,value:90,unit:'°'},{id:'phase',label:'Time phase',min:0,max:360,step:2,value:30,unit:'°'},{id:'receiver',label:'Linear receive axis',min:0,max:180,step:2,value:0,unit:'°'}],animate:{id:'phase',min:0,max:360,step:3},render(v,U){const {C}=U,d=U.rad(v.delta),t=U.rad(v.phase),a=U.rad(v.receiver),scale=75,px=360,py=235;const p=(q)=>[px+scale*Math.cos(q),py-scale*v.ratio*Math.cos(q+d)];let z=U.arrow(140,235,595,235,C.grid)+U.arrow(360,410,360,55,C.grid)+U.text(615,240,'+y')+U.text(370,56,'+z')+U.text(80,30,'Transverse y–z plane; phase increases with time');z+=U.path(U.range(180,q=>p(q*2*Math.PI)),C.c,2)+U.line(px-175*Math.cos(a),py+175*Math.sin(a),px+175*Math.cos(a),py-175*Math.sin(a),C.b,2,'6 4')+U.arrow(px,py,...p(t),C.a)+U.circle(...p(t),5,C.a,C.a);const energy=1+v.ratio**2,coupled=(Math.cos(a)**2+v.ratio**2*Math.sin(a)**2+2*v.ratio*Math.cos(a)*Math.sin(a)*Math.cos(d))/energy;const linear=v.ratio<1e-9||Math.abs(Math.sin(d))<1e-9,circular=Math.abs(v.ratio-1)<1e-9&&Math.abs(Math.abs(v.delta)-90)<1e-9;return{svg:U.svg(z,'Polarization ellipse and receive-axis projection')+U.legend([{name:'E tip locus',color:C.c},{name:'Instantaneous E',color:C.a},{name:'Linear receive axis',color:C.b,dash:true}]),stats:[['Polarization',linear?'Linear':circular?'Circular':'Elliptical'],['Average coupled power',U.fmt(100*coupled,1)+'%'],['Orthogonal components','Eᵧ₀ = 1, E_z₀ = '+U.fmt(v.ratio)]],equation:'Eᵧ = cos(ωt), &nbsp; E_z = a cos(ωt + δ)<br>PLF = |êᵣ* · Ẽ|² / (Ẽ · Ẽ*)',note:'Power coupling is the time-average fraction available to an ideal linear receiving antenna, with an otherwise matched system. Equal components in quadrature give 50% coupling to every linear orientation. A common phase shift moves the tip along the same locus.',question:'Which changes alter the ellipse itself, and which merely move the tip around it?'}},checks:()=>[{name:'Circular polarization couples half to linear',pass:Math.abs((.5+.5)/(1+1)-.5)<1e-12},{name:'Aligned linear receiver collects all',pass:Math.cos(0)**2===1}]});
modules.push({id:'phasor-interference',group:'Waves',title:'Interference & phasors',heading:'Add fields before squaring to find power',intro:'Two coherent waves can reinforce or cancel at the observer because their field phases differ.',sources:waveSources,controls:[{id:'ratio',label:'Second field amplitude',min:0,max:2,step:.05,value:1,unit:'× first'},{id:'delta',label:'Phase difference',min:-180,max:180,step:3,value:90,unit:'°'},{id:'phase',label:'Time phase',min:0,max:360,step:3,value:40,unit:'°'}],animate:{id:'phase',min:0,max:360,step:3},render(v,U){const {C}=U,d=U.rad(v.delta),t=U.rad(v.phase),R=45,cx=340,cy=180,re=1+v.ratio*Math.cos(d),im=v.ratio*Math.sin(d);let z=U.line(65,cy,730,cy,C.grid)+U.line(cx,55,cx,310,C.grid);const xx=R*(re*Math.cos(t)-im*Math.sin(t)),yy=-R*(re*Math.sin(t)+im*Math.cos(t)),x1=R*Math.cos(t),y1=-R*Math.sin(t);z+=U.arrow(cx,cy,cx+x1,cy+y1,C.a)+U.arrow(cx+x1,cy+y1,cx+xx,cy+yy,C.b)+U.arrow(cx,cy,cx+xx,cy+yy,C.c)+U.text(45,28,'Rotating phasors: common time phase restored')+U.text(65,342,'Real axis →; imaginary axis ↑');const power=re*re+im*im;let f1=U.range(160,q=>[q*360,Math.cos(2*Math.PI*q)]),f2=U.range(160,q=>[q*360,v.ratio*Math.cos(2*Math.PI*q+d)]),sum=U.range(160,q=>[q*360,Math.cos(2*Math.PI*q)+v.ratio*Math.cos(2*Math.PI*q+d)]);const bound=Math.max(1,v.ratio,Math.sqrt(power))*1.1;return{svg:U.svg(z,'Head to tail rotating phasor addition',800,360)+U.plot([{name:'First field',color:C.a,points:f1},{name:'Second field',color:C.b,points:f2,dash:'6 4'},{name:'Sum',color:C.c,points:sum}],{xmin:0,xmax:360,ymin:-bound,ymax:bound,xlabel:'Time phase (°)',ylabel:'Field / first peak',title:'One cycle at the observer'})+`<p class="note">At ${U.fmt(v.phase)}°: E₁ + E₂ = ${U.fmt(Math.cos(t)+v.ratio*Math.cos(t+d),3)}.</p>`,stats:[['Resultant field amplitude',U.fmt(Math.sqrt(power),3)+' × first'],['Resultant phase',power<1e-20?'Undefined at exact cancellation':U.fmt(U.deg(Math.atan2(im,re)),1)+'°'],['Power / first alone',U.fmt(power,3)]],equation:'Ẽ_total = 1 + a eʲᵟ, &nbsp; |Ẽ_total|² = 1 + a² + 2a cos δ',note:'This is coherent superposition at one point, with equal polarization and impedance. For equal fields in phase the local power is four times one wave alone; spatial redistribution and source power references still matter. Opposite phasors have no defined resultant phase at exact cancellation.',question:'Why does adding the two individual powers miss the cancellation at δ = 180°?'}},checks:()=>[{name:'Equal in-phase fields: fourfold local power',pass:1+1+2*Math.cos(0)===4},{name:'Equal opposed fields cancel',pass:Math.abs(2+2*Math.cos(Math.PI))<1e-12}]});
const curlPoint=(x,y,z,view)=>{const a=view*Math.PI/180;return[x*.9+z*.38*Math.cos(a),-y*.8+z*.38*Math.sin(a)]};
function axleWheel(U,cx,cy,axis,spin,spinRate,color,view){const n=axis==='z'?[0,0,1]:[0,1,0],e1=[1,0,0],e2=axis==='z'?[0,1,0]:[0,0,-1],p=q=>{const z=curlPoint(q[0],q[1],q[2],view);return[cx+z[0],cy+z[1]]};let s='';for(let i=0;i<4;i++){const a=spin+i*Math.PI/2,vec=e1.map((e,j)=>20*(e*Math.cos(a)+e2[j]*Math.sin(a)));s+=U.line(cx,cy,...p(vec),color,3)}const ring=U.range(48,q=>p(e1.map((e,j)=>22*(e*Math.cos(q*2*Math.PI)+e2[j]*Math.sin(q*2*Math.PI)))));s+=U.path(ring,color,1);const sign=Math.abs(spinRate)<1e-10?0:Math.sign(spinRate);if(sign)s+=U.arrow(...p(n.map(x=>-26*x*sign)),...p(n.map(x=>26*x*sign)),color);s+=U.circle(cx,cy,2,color,color);return s}
modules.push({id:'double-curl',group:'Waves',title:'Double curl pinwheels',heading:'Pinwheels measure the swirl of the axle field',intro:'Use the same sinusoidal input through both curls. The second curl is nonzero, and its result stays visible as wheels and axle vectors.',sources:waveSources.concat(['Work/Practice/Concept Animations/Double Curl: prior user-requested wheel convention; analytic example derived here']),controls:[{id:'k',label:'Spatial wavenumber k',min:.5,max:2,step:.25,value:1,unit:'rad/unit'},{id:'amplitude',label:'Input amplitude A',min:.5,max:2,step:.25,value:1},{id:'phase',label:'Wheel animation phase',min:0,max:360,step:3,value:30,unit:'°'},{id:'view',label:'3D viewing angle',min:20,max:140,step:5,value:65,unit:'°'}],animate:{id:'phase',min:0,max:360,step:4},render(v,U){const {C}=U;let z='';const titles=['F = ŷ A sin(kx)','curl F = ẑ Ak cos(kx)','curl curl F = ŷ Ak² sin(kx)'];for(let col=0;col<3;col++){let x0=35+col*260;z+=U.text(x0,31,titles[col])+U.text(x0,57,['Arrows: input field','Arrows: first axle field','Same second-stage sensors'][col]);for(let row=0;row<4;row++){const x=(row+.4)*Math.PI/2-v.k*.2,phase=v.k*x,f=v.amplitude*Math.sin(phase),c1=v.amplitude*v.k*Math.cos(phase),c2=v.amplitude*v.k*v.k*Math.sin(phase),cy=125+row*72,cx=x0+70;const norm=2.2,aa=col===0?f:col===1?c1:c2;const vec=col===1?[0,0,aa*34/Math.max(v.amplitude,v.amplitude*v.k,v.amplitude*v.k*v.k)]:[0,aa*34/Math.max(v.amplitude,v.amplitude*v.k,v.amplitude*v.k*v.k),0];const tip=curlPoint(...vec,v.view);z+=U.arrow(cx,cy,cx+tip[0],cy+tip[1],C.a);let axis=col===0?'z':'y',spinRate=col===0?c1:c2;z+=axleWheel(U,cx+95,cy,axis,U.rad(v.phase)*spinRate,spinRate,C.b,v.view);z+=U.text(cx-46,cy+29,'x='+U.fmt(x,2));}if(col<2)z+=U.arrow(x0+218,222,x0+248,222,C.ink)}z+=U.text(35,436,'Wheel axle direction is the curl output; spin reverses when that component changes sign.');return{svg:U.svg(z,'Same nonzero sinusoidal vector field through first and second curl with 3D pinwheels',820,460)+U.legend([{name:'Field arrows (one shared scale per view)',color:C.a},{name:'Measuring pinwheels and axles',color:C.b}]),stats:[['Input peak',U.fmt(v.amplitude)],['First curl peak',U.fmt(v.amplitude*v.k)],['Second curl peak',U.fmt(v.amplitude*v.k*v.k)]],equation:'F = (0, A sin kx, 0)<br>∇×F = (0, 0, Ak cos kx) &nbsp; → &nbsp; ∇×(∇×F) = (0, Ak² sin kx, 0)',note:'Rows sample different x locations; all field arrows share one scale, fitted to the largest displayed field peak. The last panel repeats the second-stage sensors and shows their axle output, so it does not apply a third curl. Wheel animation is a teaching convention for local rotation; it is not a rigid wheel physically tumbling about two axes, and changing animation phase does not change the static field.',question:'When k doubles, why does the second curl grow by a factor of four rather than two?'}},checks:()=>[{name:'Nonzero double curl at x=pi/2, A=k=1',pass:Math.abs(Math.sin(Math.PI/2)-1)<1e-12},{name:'Analytic double curl equals minus Laplacian (zero divergence)',pass:Math.abs(4*Math.sin(.7)-(-(-4*Math.sin(.7))))<1e-12}]});
modules.push({id:'displacement-current',group:'Waves',title:'Displacement current',heading:'A charging capacitor keeps magnetic circulation continuous',intro:'Compare conduction current in the wire with changing electric flux across the gap.',sources:waveSources,controls:[{id:'current',label:'Charging current',min:1,max:100,step:1,value:20,unit:'mA'},{id:'radius',label:'Plate radius',min:2,max:10,step:.5,value:5,unit:'cm'},{id:'loop',label:'Loop radius',min:1,max:15,step:.5,value:7,unit:'cm'},{id:'time',label:'Charging time',min:0,max:100,step:1,value:40,unit:'ns'}],animate:{id:'time',min:0,max:100,step:1},render(v,U){const {C}=U,I=v.current/1000,R=v.radius/100,r=v.loop/100,t=v.time*1e-9,area=Math.PI*R*R,frac=Math.min(1,r*r/(R*R)),Id=I*frac,H=Id/(2*Math.PI*r),E=I*t/(eps0*area),scl=15;let z='';z+=U.text(50,30,'Ideal parallel plates; gap viewed from the side')+U.line(230,55,230,135,C.ink,3)+U.line(230,290,230,380,C.ink,3);z+=`<ellipse cx="230" cy="145" rx="${v.radius*scl}" ry="${v.radius*3}" fill="var(--soft)" stroke="${C.a}"/><ellipse cx="230" cy="285" rx="${v.radius*scl}" ry="${v.radius*3}" fill="var(--soft)" stroke="${C.a}"/>`;for(let i=-2;i<=2;i++)z+=U.arrow(230+i*v.radius*2.5,173,230+i*v.radius*2.5,173+85*v.time/100,C.b);z+=U.arrow(230,60,230,115,C.a)+U.text(250,91,'I wire')+U.text(350,204,'E changes with time')+U.text(350,235,'No conduction across gap');z+=`<ellipse cx="230" cy="215" rx="${v.loop*15}" ry="${v.loop*3}" fill="none" stroke="${C.c}" stroke-width="2" stroke-dasharray="7 4"/>`;z+=U.text(80,420,'Dashed contour: Ampère loop around plate axis');const points=U.range(150,q=>{let rr=q*.15;return[rr*100,rr===0?0:I*Math.min(1,rr*rr/(R*R))/(2*Math.PI*rr)*1000]});return{svg:U.svg(z,'Capacitor current and changing electric field')+U.plot([{name:'H around plate axis',color:C.c,points}],{xmin:0,xmax:15,ymin:0,ymax:Math.max(...points.map(p=>p[1]))*1.1,xlabel:'Loop radius (cm)',ylabel:'H (mA/m)',title:'Circulation depends on enclosed changing flux'}),stats:[['Electric field at this time',U.fmt(E,1)+' V/m'],['Enclosed displacement current',U.fmt(Id*1000,2)+' mA'],['H at selected loop',U.fmt(H*1000,3)+' mA/m']],equation:'ε₀ dΦ_E/dt = I_enclosed, &nbsp; H(2πr) = I_enclosed<br>I_enclosed = I min[1, r²/R²]',note:'The gap has uniform changing E inside the plate radius, with fringing and transients neglected. A loop enclosing the whole plate sees displacement current equal to the wire current; a smaller loop encloses only part of the flux. E arrow lengths show normalized charging time; the plot describes H at the gap midplane in this ideal model.',question:'For a loop larger than the plates, why can its spanning surface cross the empty gap and still give the same magnetic circulation?'}},checks:()=>[{name:'Outside plates all displacement current enclosed',pass:Math.min(1,.07**2/.05**2)===1},{name:'Half-radius loop encloses quarter current',pass:Math.abs((.025/.05)**2-.25)<1e-12}]});
modules.push({id:'helmholtz-curvature',group:'Waves',title:'Helmholtz curvature',heading:'The wave equation ties spatial curvature to the field',intro:'A sinusoidal transverse field satisfies the source-free Helmholtz equation point by point.',sources:waveSources,controls:[{id:'k',label:'Wavenumber k',min:.5,max:5,step:.25,value:2,unit:'rad/m'},{id:'amplitude',label:'Peak field A',min:.5,max:3,step:.25,value:1,unit:'V/m'},{id:'phase',label:'Spatial phase φ',min:0,max:360,step:5,value:0,unit:'°'},{id:'sample',label:'Inspect x',min:0,max:6,step:.05,value:1,unit:'m'}],render(v,U){const {C}=U,ph=U.rad(v.phase),E=x=>v.amplitude*Math.cos(v.k*x+ph),curv=x=>-v.k*v.k*E(x);const a=U.range(220,q=>[q*6,E(q*6)]),b=U.range(220,q=>[q*6,curv(q*6)]);return{svg:U.plot([{name:'Eᵧ(x)',color:C.a,points:a},{name:'Selected position',color:C.c,points:[[v.sample,-v.amplitude],[v.sample,v.amplitude]],dash:'4 4'}],{xmin:0,xmax:6,ymin:-v.amplitude*1.15,ymax:v.amplitude*1.15,xlabel:'x (m)',ylabel:'Eᵧ (V/m)',title:'Field profile at a fixed phase',height:300})+U.plot([{name:'d²Eᵧ/dx²',color:C.b,points:b},{name:'Selected position',color:C.c,points:[[v.sample,-v.k*v.k*v.amplitude],[v.sample,v.k*v.k*v.amplitude]],dash:'4 4'}],{xmin:0,xmax:6,ymin:-v.k*v.k*v.amplitude*1.15,ymax:v.k*v.k*v.amplitude*1.15,xlabel:'x (m)',ylabel:'Curvature (V/m³)',title:'The curvature has the opposite sign',height:300}),stats:[['E at x',U.fmt(E(v.sample),3)+' V/m'],['Curvature at x',U.fmt(curv(v.sample),3)+' V/m³'],['Wavelength',U.fmt(2*Math.PI/v.k,3)+' m']],equation:'Eᵧ = A cos(kx + φ), &nbsp; d²Eᵧ/dx² = −k²Eᵧ<br>∇²Ẽ + k²Ẽ = 0 &nbsp; (homogeneous, source-free, lossless medium)',note:'The field is transverse: E points along y and varies along x, so its divergence vanishes. At a positive crest its curvature is negative. Each plot has its own labeled vertical scale; the second derivative carries two additional inverse metres.',question:'If wavelength is halved while the peak field stays fixed, what happens to the maximum curvature?'}},checks:()=>{const k=2,x=.7,h=1e-4,f=x=>Math.cos(k*x),dd=(f(x+h)-2*f(x)+f(x-h))/(h*h);return[{name:'Independent finite-difference Helmholtz residual',pass:Math.abs(dd+k*k*f(x))<1e-6,actual:dd+k*k*f(x)},{name:'Double frequency gives fourfold curvature',pass:(4**2)/(2**2)===4}]}});

// Independent illustrative antenna experiments. No assignment data or answers.
(() => {
  const TAU=2*Math.PI, C0=299792458;
  const sourceGuide='_System/Generated Files/Test 2 Update 2026-10-27/guide-body.tex';
  const sourceEarlier='_System/Generated Files/Guided Reading 2026-10-14/waves_antennas.json';
  const sourceScope='_System/Generated Files/Test 2 Update 2026-10-27/oct27-outline.json';
  const deg=x=>x*180/Math.PI, rad=x=>x*Math.PI/180;
  const sinc=x=>Math.abs(x)<1e-8?1:Math.sin(x)/x;
  const dipole=(theta,half)=>Math.abs(Math.sin(theta))<1e-9?0:(half?Math.cos(Math.PI/2*Math.cos(theta))/Math.sin(theta):Math.sin(theta));
  const bessel1=x=>{let s=0;const n=256;for(let i=0;i<n;i++){let t=Math.PI*(i+.5)/n;s+=Math.cos(t-x*Math.sin(t));}return s/n;};
  const diskField=(theta,dl,oblique)=>{let u=Math.PI*dl*Math.sin(theta);return (oblique?Math.cos(theta):1)*(Math.abs(u)<1e-6?1-u*u/8:2*bessel1(u)/u);};
  const diskHP=(dl,oblique)=>{let lo=0,hi=Math.asin(Math.min(1,3.8317059702/(Math.PI*dl)));for(let i=0;i<35;i++){let m=(lo+hi)/2;if(diskField(m,dl,oblique)**2>.5)lo=m;else hi=m;}return 2*deg((lo+hi)/2);};
  const db=x=>10*Math.log10(Math.max(x,1e-6));
  const samples=(n,a,b,fn)=>Array.from({length:n+1},(_,i)=>{let x=a+(b-a)*i/n;return[x,fn(x)];});
  function polar(U,fn,theta,labels){
    let s='';for(let p of[.25,.5,.75,1]){s+=U.circle(255,220,155*p,'none',U.C.grid);s+=U.text(263,220-155*p+15,String(p));}
    s+=U.line(75,220,435,220,U.C.grid)+U.line(255,40,255,400,U.C.grid);
    s+=U.text(255,26,'+z · θ = 0°','middle')+U.text(444,225,'90°')+U.text(255,427,'180°','middle');
    s+=U.path(samples(360,0,360,a=>a).map(([a])=>{let t=rad(a),p=fn(t);return[255+155*p*Math.sin(t),220-155*p*Math.cos(t)];}),U.C.a,3);
    let p=fn(theta),x=255+155*p*Math.sin(theta),y=220-155*p*Math.cos(theta);
    s+=U.arrow(255,220,255+175*Math.sin(theta),220-175*Math.cos(theta),U.C.b)+U.circle(x,y,6,U.C.b,U.C.b);
    s+=U.text(545,74,labels[0])+U.line(580,125,580,315,U.C.ink,5)+U.text(600,220,'Wire axis z');
    s+=U.text(545,365,labels[1])+U.text(545,392,'Azimuth symmetry: rotate this');
    s+=U.text(545,413,'cut around the wire axis.');
    return U.svg(s,'Polar cut of normalized dipole radiation and observer direction');
  }
  modules.push({
    id:'dipole-pattern',group:'Antennas',title:'Dipole patterns',heading:'A doughnut-shaped beam has an axial null',
    intro:'Move the observer around a wire and compare electric-field amplitude with received power.',
    controls:[{id:'kind',label:'Wire model',value:1,options:[{value:0,label:'Electrically short dipole'},{value:1,label:'Thin half-wave dipole'}]},{id:'theta',label:'Angle from wire axis θ',min:0,max:180,step:1,value:55,unit:'°'},{id:'quantity',label:'Radial plot',value:1,options:[{value:0,label:'Normalized field magnitude |F|'}, {value:1,label:'Normalized power |F|²'}]}],
    render(v,U){let t=rad(v.theta),f=dipole(t,v.kind),p=f*f;return{
      svg:polar(U,a=>{let q=Math.abs(dipole(a,v.kind));return v.quantity?q*q:q;},t,[v.kind?'Half-wave sinusoidal current':'Short-wire uniform-current model',v.quantity?'Radius = normalized power':'Radius = normalized field magnitude']),
      stats:[['Field magnitude',U.fmt(Math.abs(f),3)+' × peak'],['Power',U.fmt(p*100,1)+'% of peak'],['Relative power',p<1e-10?'Axial null':U.fmt(db(p),2)+' dB']],
      equation:v.kind?'F(θ) = cos[(π/2) cos θ] / sin θ; &nbsp; p<sub>n</sub> = |F|²':'F(θ) = sin θ; &nbsp; p<sub>n</sub> = sin² θ',
      note:'This is a far-field cut, with θ measured from the wire axis. The radius is normalized to the broadside maximum; a peak of 1 is not a gain of 1 dBi. Axial limits are evaluated explicitly.',
      question:'At half power, should the field magnitude read 0.5 or about 0.707?',
    };}, sources:[sourceEarlier],checks:()=>[{name:'Half-wave broadside normalized field',pass:Math.abs(dipole(Math.PI/2,1)-1)<1e-12},{name:'Half-wave axial null finite',pass:dipole(0,1)===0},{name:'Short dipole half power at45deg',pass:Math.abs(dipole(Math.PI/4,0)**2-.5)<1e-12}]
  });

  function apertureSum(width,theta,taper,n=81){let re=0,im=0,wt=0;for(let i=0;i<n;i++){let x=-.5+(i+.5)/n,w=(1-taper)+taper*Math.cos(Math.PI*x),ph=TAU*width*x*Math.sin(theta);re+=w*Math.cos(ph);im+=w*Math.sin(ph);wt+=w;}return{re:re/wt,im:im/wt,p:(re*re+im*im)/(wt*wt)};}
  modules.push({
    id:'aperture-phasors',group:'Antennas',title:'Aperture addition',heading:'A pattern comes from adding fields with phase',
    intro:'Change viewing direction, aperture width, or edge illumination and watch the field contributions add.',
    controls:[{id:'width',label:'Aperture width a/λ',min:1,max:12,step:.25,value:5,unit:'wavelengths'},{id:'theta',label:'Observation angle from boresight',min:-45,max:45,step:.5,value:8,unit:'°'},{id:'taper',label:'Cosine amplitude taper',min:0,max:1,step:.05,value:0,unit:'0 = uniform, 1 = cosine'}],
    render(v,U){const t=rad(v.theta),r=apertureSum(v.width,t,v.taper),N=17;let s=U.text(62,27,'Aperture samples')+U.text(365,27,'Complex field sum')+U.text(520,410,'Real field component →');
      s+=U.line(120,62,120,365,U.C.ink,2)+U.arrow(155,212,300,212,U.C.grid)+U.text(160,235,'Boresight');
      s+=U.arrow(150,212,290,212-140*Math.sin(t),U.C.b)+U.text(170,325,'θ = '+v.theta+'°');
      let vectors=[],tot=0;for(let i=0;i<N;i++){let x=-.5+(i+.5)/N,w=1-v.taper+v.taper*Math.cos(Math.PI*x);tot+=w;vectors.push([w,TAU*v.width*x*Math.sin(t)]);s+=U.circle(120,212+280*x,3+4*w,U.C.a,U.C.a);}
      let pts=[[0,0]],x=0,y=0;for(const[w,ph]of vectors){x+=w*Math.cos(ph);y+=w*Math.sin(ph);pts.push([x,y]);}let xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),extent=Math.max(tot,1);let scale=265/extent,ox=405,oy=225;
      s+=U.line(365,oy,745,oy,U.C.grid)+U.line(ox,55,ox,365,U.C.grid)+U.text(ox-8,55,'Im','end');
      for(let i=0;i<N;i++)s+=U.arrow(ox+pts[i][0]*scale,oy-pts[i][1]*scale,ox+pts[i+1][0]*scale,oy-pts[i+1][1]*scale,U.C.a);
      s+=U.arrow(ox,oy,ox+x*scale,oy-y*scale,U.C.b)+U.text(440,365,'Fine arrows: sampled contributions')+U.text(440,387,'Strong arrow: their vector sum');
      const series=[{name:'Current taper',color:U.C.a,points:samples(240,-45,45,a=>db(apertureSum(v.width,rad(a),v.taper).p))},{name:'Uniform reference',color:U.C.b,dash:'6 4',points:samples(240,-45,45,a=>db(apertureSum(v.width,rad(a),0).p))}];
      return{svg:U.svg(s,'Aperture source samples and head-to-tail complex phasor addition')+U.plot(series,{xmin:-45,xmax:45,ymin:-50,ymax:0,xlabel:'Angle from boresight θ (degrees)',ylabel:'Normalized power (dB)',title:'Current aperture versus uniform illumination'}),stats:[['Normalized field |F|',U.fmt(Math.sqrt(r.p),3)],['Normalized power',U.fmt(100*r.p,2)+'%'],['Uniform first-null angle',U.fmt(deg(Math.asin(1/v.width)),2)+'°']],equation:'F(θ) ∝ ∫ E<sub>a</sub>(x′) e<sup>jkx′sin θ</sup> dx′; &nbsp; p<sub>n</sub> = |F/F(0)|²',note:'A one-dimensional aperture cut is sampled numerically; the phasor sketch uses 17 contributions while the pattern uses 81. Both curves are normalized separately to boresight, so this comparison shows sidelobe/width changes rather than absolute gain. The obliquity factor is omitted from this scalar interference demonstration.',question:'Why does widening the aperture move its first cancellation closer to boresight?',};},sources:[sourceGuide,sourceEarlier],checks:()=>[{name:'Aperture boresight coherent addition for uniform field',pass:Math.abs(apertureSum(4,0,0).p-1)<1e-12},{name:'Symmetric taper cancels imaginary component',pass:Math.abs(apertureSum(4,.15,.7).im)<1e-12},{name:'Dense uniform integral approaches first sinc zero',pass:apertureSum(5,Math.asin(1/5),0,2001).p<1e-6}]
  });

  modules.push({
    id:'circular-aperture',group:'Antennas',title:'Circular aperture',heading:'A circular opening produces a Bessel beam',
    intro:'Compare the finite boresight field, half-power width, and first null as electrical diameter changes.',
    controls:[{id:'diameter',label:'Aperture diameter D/λ',min:3,max:25,step:.5,value:8,unit:'wavelengths'},{id:'theta',label:'Probe angle from boresight',min:0,max:40,step:.1,value:4,unit:'°'},{id:'model',label:'Scalar model',value:1,options:[{value:1,label:'Class model with cos θ obliquity'},{value:0,label:'Disk factor only (near boresight)'}]}],
    render(v,U){let fn=diskField(rad(v.theta),v.diameter,v.model),half=diskHP(v.diameter,v.model),nullAngle=deg(Math.asin(3.8317059702/(Math.PI*v.diameter))),bound=Math.min(90,Math.max(14,3*nullAngle,1.15*v.theta));let curve=samples(320,-bound,bound,a=>db(diskField(rad(a),v.diameter,v.model)**2));
      let s=U.circle(174,206,115,'none',U.C.a)+U.line(59,206,289,206,U.C.grid)+U.line(174,91,174,321,U.C.grid)+U.text(174,55,'Uniform circular opening','middle')+U.text(174,354,'D = '+v.diameter+'λ','middle');
      for(let rr of[.25,.5,.75])s+=U.circle(174,206,115*rr,'none',U.C.grid);
      s+=U.text(397,70,'Field at boresight is finite')+U.text(397,108,'J₁(u) ≈ u/2 as u → 0')+U.text(397,146,'2J₁(u)/u → 1')+U.text(397,222,'Full HPBW: '+U.fmt(half,2)+'°')+U.text(397,258,'First null: ±'+U.fmt(nullAngle,2)+'°')+U.text(397,294,'Null-to-null: '+U.fmt(2*nullAngle,2)+'°');
      return{svg:U.svg(s,'Uniform circular aperture and beam feature definitions')+U.plot([{name:'Circular-aperture power',color:U.C.a,points:curve},{name:'Half-power level',color:U.C.b,dash:'5 4',points:[[-bound,db(.5)],[bound,db(.5)]]},{name:'Probe θ = '+U.fmt(v.theta,1)+'°',color:U.C.d,dash:'3 4',points:[[v.theta,-50],[v.theta,0]]}],{xmin:-bound,xmax:bound,ymin:-50,ymax:0,xlabel:'Off-axis angle θ (degrees)',ylabel:'Peak-normalized power (dB)',title:'Main beam, nulls, and sidelobes'}),stats:[['Probe field F',U.fmt(fn,3)],['Probe power',U.fmt(db(fn*fn),2)+' dB'],['Full half-power width',U.fmt(half,2)+'°']],equation:'u = π(D/λ) sin θ; &nbsp; F<sub>n</sub> = '+(v.model?'cos θ · ':'')+'2J₁(u)/u; &nbsp; F<sub>n</sub>(0) = 1',note:'Power is the square of the field magnitude; a negative field signifies a phase reversal. The displayed first null uses the first positive zero of J₁, 3.831706. HPBW is found from the selected model and is the full width between its half-power crossings.',question:'If diameter doubles at fixed wavelength, what happens to the angular spacing between the main-beam nulls?',};},sources:[sourceGuide,sourceScope],checks:()=>[{name:'Bessel removable boresight singularity',pass:diskField(0,8,1)===1},{name:'J1 first root by quadrature',pass:Math.abs(bessel1(3.8317059702))<1e-9},{name:'Bessel small argument',pass:Math.abs(bessel1(.001)-.0005)<1e-9},{name:'Disk-only HPBW agrees known Airy argument',pass:Math.abs(diskHP(8,0)-2*deg(Math.asin(1.61633995/(8*Math.PI))))<1e-6}]
  });

  modules.push({
    id:'dish-gain',group:'Antennas',title:'Dish and pointing',heading:'A larger dish collects more power and needs better pointing',
    intro:'Keep physical aperture, effective aperture, gain, and beamwidth connected as you change the dish.',
    controls:[{id:'diameter',label:'Dish diameter D',min:.5,max:8,step:.1,value:2.5,unit:'m'},{id:'freq',label:'Frequency f',min:2,max:30,step:.5,value:12,unit:'GHz'},{id:'eta',label:'Overall aperture efficiency ηₐ',min:.2,max:.85,step:.01,value:.6,unit:'linear'},{id:'error',label:'Pointing error δ',min:0,max:5,step:.05,value:.4,unit:'°'}],
    render(v,U){let lam=C0/(v.freq*1e9),area=Math.PI*v.diameter*v.diameter/4,ae=v.eta*area,g=v.eta*(Math.PI*v.diameter/lam)**2,bw=Math.sqrt(33000/g),loss=12*(v.error/bw)**2,span=Math.max(3*bw,v.error*1.3,.2);let curve=samples(200,-span,span,a=>-12*(a/bw)**2);const clipping=Math.max(-60,-loss);
      let s=U.text(85,38,'Projected collecting aperture')+U.circle(200,214,120,'none',U.C.ink)+U.circle(200,214,120*Math.sqrt(v.eta),U.C.a,U.C.a)+U.text(200,373,'Physical area: '+U.fmt(area,2)+' m²','middle')+U.text(200,400,'Effective area: '+U.fmt(ae,2)+' m²','middle');
      s+=U.arrow(400,214,700,214,U.C.grid)+U.text(700,240,'Boresight','end')+U.arrow(400,214,690,214-120*Math.sin(rad(v.error*12)),U.C.b)+U.text(440,320,'Pointing separation δ = '+v.error+'°')+U.text(440,350,'Arrow separation exaggerated');
      return{svg:U.svg(s,'Physical and effective collecting areas with offset pointing')+U.plot([{name:'Main-beam approximation',color:U.C.a,points:curve},{name:'Pointing error',color:U.C.b,dash:'5 4',points:[[v.error,-60],[v.error,0]]}],{xmin:-span,xmax:span,ymin:-60,ymax:0,xlabel:'Angle from boresight (degrees)',ylabel:'Relative main-beam gain (dB)',title:'Sensitivity to pointing error'}),stats:[['Peak gain',U.fmt(10*Math.log10(g),2)+' dBi'],['Empirical full HPBW',U.fmt(bw,3)+'°'],['Main-beam loss estimate',loss>60?'>60 dB (outside useful approximation)':U.fmt(loss,2)+' dB']],equation:'A<sub>e</sub> = η<sub>a</sub>πD²/4; &nbsp; G = η<sub>a</sub>(πD/λ)²; &nbsp; Θ<sub>HP</sub> ≈ √(33000/G) degrees',note:'The gain–beamwidth coefficient 33000 is the current class estimate, with gain linear and full widths in degrees. The illustrative Gaussian main-beam model L≈12(δ/ΘHP)² dB is an approximation near the main beam, not a sidelobe/null model. Overall aperture efficiency is applied once.',question:'Can increasing dish diameter reduce received power if the pointing error stays fixed?',};},sources:[sourceGuide],checks:()=>[{name:'Doubling diameter adds6.0206dB',pass:Math.abs(10*Math.log10(4)-6.020599913)<1e-8},{name:'Half-power offset is half full HPBW',pass:Math.abs(12*.5*.5-3)<1e-12},{name:'Gain units conversion',pass:Math.abs(10*Math.log10(100)-20)<1e-12}]
  });

  modules.push({
    id:'reflector-screens',group:'Antennas',title:'Usable band',heading:'Electrical size, surface precision, and range set different screens',
    intro:'Move frequency and see which separate conditions support the large-aperture far-field model.',
    controls:[{id:'diameter',label:'Largest aperture dimension D',min:.5,max:10,step:.1,value:3,unit:'m'},{id:'rough',label:'RMS residual surface error σₕ',min:.1,max:10,step:.1,value:2,unit:'mm'},{id:'mesh',label:'Mesh opening width',min:.1,max:10,step:.1,value:1,unit:'mm'},{id:'freq',label:'Operating frequency',min:1,max:40,step:.5,value:14,unit:'GHz'},{id:'range',label:'Measurement range r',min:10,max:10000,step:10,value:500,unit:'m'}],
    render(v,U){let lam=C0/(v.freq*1e9),fl=5*C0/v.diameter/1e9,fr=C0/(8*v.rough*.001)/1e9,fm=C0/(8*v.mesh*.001)/1e9,upper=Math.min(fr,fm),far=2*v.diameter*v.diameter/lam;let s=U.text(70,32,'Separate engineering screens (gradual physical transitions)');const x=f=>90+Math.min(50,Math.max(0,f))/50*620;
      s+=U.line(90,380,710,380,U.C.ink);for(let f of[0,10,20,30,40,50])s+=U.line(x(f),375,x(f),385,U.C.ink)+U.text(x(f),407,String(f),'middle');s+=U.text(730,407,'GHz');
      const rows=[['D ≥ 5λ',fl,50,v.freq>=fl],['σₕ < λ/8',0,fr,v.freq<fr],['Mesh width < λ/8',0,fm,v.freq<fm],['Intersection',fl,upper,v.freq>=fl&&v.freq<upper]];
      rows.forEach((r,i)=>{let y=90+i*78;let low=Math.min(r[1],50),high=Math.min(r[2],50);s+=U.text(90,y-18,r[0]);s+=U.line(90,y,710,y,U.C.grid,8);if(high>low)s+=U.line(x(low),y,x(high),y,i===3?U.C.a:U.C.c,8);s+=U.circle(x(v.freq),y,7,r[3]?U.C.a:U.C.b,U.C.ink);s+=U.text(730,y+5,r[3]?'Pass':'Outside');});
      return{svg:U.svg(s,'Frequency screens for electrical size, surface residual error, and mesh opening'),stats:[['Wavelength',U.fmt(lam*1000,2)+' mm'],['2D²/λ far-field screen',U.fmt(far,1)+' m'],['Range comparison',v.range>=far?'r meets stated screen':'r below stated screen']],equation:'f ≳ 5c/D; &nbsp; f &lt; c/(8σ<sub>h</sub>); &nbsp; r<sub>F</sub> = 2D²/λ (chosen convention)',note:'The λ/8 surface rule concerns residual error from the intended reflector, not its designed curvature. Mesh opening and RMS roughness are different quantities; these screening rules are not sharp cutoffs or efficiency formulas. The explicitly chosen 2D²/λ convention is one common far-field screen; feed/electronics band limits are not modeled.',question:'Would increasing diameter fix the same roughness problem at high frequency, or does it change a different screen?',};},sources:[sourceGuide,sourceScope],checks:()=>[{name:'3m diameter lower electrical-size screen near0.5GHz',pass:Math.abs(5*C0/3/1e9-.4996540967)<1e-9},{name:'Farfield distance grows quadratically with diameter',pass:(2*6*6/.03)/(2*3*3/.03)===4},{name:'2mm roughness screen near18.74GHz',pass:Math.abs(C0/(8*.002)/1e9-18.737028625)<1e-10}]
  });

  function arrayField(theta,n,d,beta){let re=0,im=0;for(let i=0;i<n;i++){let ph=i*(TAU*d*Math.cos(theta)+beta);re+=Math.cos(ph);im+=Math.sin(ph);}return{re:re/n,im:im/n,p:(re*re+im*im)/(n*n)};}
  modules.push({
    id:'array-multiplication',group:'Antennas',title:'Arrays',heading:'The array factor multiplies the element pattern',
    intro:'Change spacing and feed phase to separate coherent addition from what each element can radiate.',
    controls:[{id:'n',label:'Number of identical elements N',min:2,max:10,step:1,value:4,unit:'elements'},{id:'spacing',label:'Element spacing d/λ',min:.1,max:1.5,step:.05,value:.5,unit:'wavelengths'},{id:'phase',label:'Progressive feed phase β',min:-180,max:180,step:5,value:0,unit:'°'},{id:'theta',label:'Probe angle from array axis θ',min:0,max:180,step:1,value:65,unit:'°'},{id:'element',label:'Element field',value:1,options:[{value:0,label:'Isotropic mathematical reference'},{value:1,label:'Half-wave dipole along array axis'}]}],
    render(v,U){let beta=rad(v.phase),t=rad(v.theta),af=arrayField(t,v.n,v.spacing,beta),ep=v.element?dipole(t,1)**2:1;const mk=(name,color,dash,fn)=>({name,color,dash,points:samples(360,0,180,a=>db(fn(rad(a))))});let curve=[mk('Array factor |AF/N|²',U.C.a,'',a=>arrayField(a,v.n,v.spacing,beta).p),mk('Element power',U.C.b,'6 4',a=>v.element?dipole(a,1)**2:1),mk('Product pattern',U.C.c,'',a=>arrayField(a,v.n,v.spacing,beta).p*(v.element?dipole(a,1)**2:1))];
      let s=U.text(70,27,'Identical elements along z')+U.text(435,27,'Feed phasors at each element');
      let count=v.n,dy=275/Math.max(count-1,1),phasorRadius=Math.min(45,.4*dy);for(let i=0;i<count;i++){let y=355-i*dy;s+=U.line(140,y-9,140,y+9,U.C.ink,4)+U.text(95,y+5,String(i),'end');let ph=i*beta;s+=U.arrow(455,y,455+phasorRadius*Math.cos(ph),y-phasorRadius*Math.sin(ph),U.C.a)+U.text(575,y+5,((i*v.phase)%360)+'°');}
      s+=U.line(165,213,165,48,U.C.grid)+U.text(177,54,'+z')+U.arrow(165,213,165+155*Math.sin(t),213-155*Math.cos(t),U.C.c)+U.text(205,350,'θ measured from +z')+U.text(205,375,'+z is upward in this sketch');
      curve.push({name:'Probe θ = '+v.theta+'°',color:U.C.d,dash:'3 4',points:[[v.theta,-50],[v.theta,0]]});
      return{svg:U.svg(s,'Identical-element array geometry and progressive feed-phase phasors')+U.plot(curve,{xmin:0,xmax:180,ymin:-50,ymax:0,xlabel:'Angle from array axis θ (degrees)',ylabel:'Power relative to N² element peak (dB)',title:'Array factor × element pattern'}),stats:[['Probe array-factor power',U.fmt(af.p,3)],['Probe element power',U.fmt(ep,3)],['Probe product power',U.fmt(af.p*ep,3)]],equation:'AF = Σ<sub>n=0…N−1</sub> e<sup>jn(kd cos θ + β)</sup>; &nbsp; E<sub>total</sub> = E<sub>element</sub> AF',note:'This uniform identical-element model illustrates the general array factor defined in the October 29 lecture. Powers use |AF/N|², so they are relative patterns, not gain at fixed total input power. A common dipole axial null remains zero even when the array factor has a maximum there.',question:'Can feed phase make this aligned-dipole array radiate on its wire axis if every element has a null there?',};},sources:[sourceGuide,sourceScope],checks:()=>[{name:'Broadside unphased array coherent normalized power1',pass:Math.abs(arrayField(Math.PI/2,4,.5,0).p-1)<1e-12},{name:'Two-element halfwave spacing axial cancellation',pass:arrayField(0,2,.5,0).p<1e-20},{name:'Phase steering coherence condition',pass:Math.abs(arrayField(Math.PI/3,4,.5,-Math.PI/2).p-1)<1e-12},{name:'Element null survives finite array multiplier',pass:dipole(0,1)**2*arrayField(0,4,.5,Math.PI).p===0}]
  });

  modules.push({
    id:'gain-references',group:'Antennas',title:'Gain and matching',heading:'Accepted, radiated, and incident power use different references',
    intro:'Trace input power through reflection and heating before interpreting normalized patterns or gain.',
    controls:[{id:'resistance',label:'Antenna input resistance Rₐ',min:5,max:250,step:5,value:75,unit:'Ω'},{id:'reactance',label:'Antenna reactance Xₐ',min:-150,max:150,step:5,value:0,unit:'Ω'},{id:'eta',label:'Radiation efficiency ηᵣ',min:.1,max:1,step:.05,value:.8,unit:'linear'},{id:'directivity',label:'Peak directivity D',min:1,max:30,step:.5,value:8,unit:'linear'},{id:'pattern',label:'Directional normalized power pₙ',min:.01,max:1,step:.01,value:.5,unit:'relative to peak'}],
    render(v,U){let z=50,den=(v.resistance+z)**2+v.reactance**2,refl=((v.resistance-z)**2+v.reactance**2)/den,acc=1-refl,radp=acc*v.eta,heat=acc*(1-v.eta),g=v.directivity*v.eta,real=g*acc;let s=U.text(70,38,'100 W incident at a 50 Ω reference port');
      const bar=(y,label,parts)=>{s+=U.text(70,y-16,label);let x=70;for(let p of parts){s+='<rect x="'+x+'" y="'+y+'" width="'+(660*p[1])+'" height="38" fill="'+p[2]+'"/>';x+=660*p[1];}};
      bar(85,'Incident power split',[[refl?'':'',refl,U.C.b],['',acc,U.C.a]]);s+=U.text(70,150,'Reflected: '+U.fmt(100*refl,1)+' W')+U.text(420,150,'Accepted: '+U.fmt(100*acc,1)+' W');
      bar(215,'Same incident-power scale, after radiation loss',[['',refl,U.C.b],['',heat,U.C.d],['',radp,U.C.c]]);
      s+=U.text(70,282,'Reflected')+U.text(310,282,'Heat: '+U.fmt(100*heat,1)+' W')+U.text(525,282,'Radiated: '+U.fmt(100*radp,1)+' W');
      s+=U.text(70,345,'D compares directionality with radiated power.')+U.text(70,374,'G includes radiation efficiency; realized G also includes mismatch.')+U.text(70,403,'A relative pattern adds 10 log₁₀(pₙ) to the chosen peak reference.');
      return{svg:U.svg(s,'Power accounting through impedance reflection and radiation efficiency'),stats:[['Absolute gain',U.fmt(10*Math.log10(g),2)+' dBi'],['Realized peak gain',U.fmt(10*Math.log10(real),2)+' dBi'],['Directional realized gain',U.fmt(10*Math.log10(real*v.pattern),2)+' dBi']],equation:'|Γ|² = |(Z<sub>A</sub> − 50)/(Z<sub>A</sub> + 50)|²; &nbsp; G = η<sub>r</sub>D; &nbsp; G<sub>realized</sub> = (1 − |Γ|²)η<sub>r</sub>D',note:'The 100 W input is an illustrative reference, and the line impedance is real 50 Ω. Mismatch, radiation efficiency, directivity, and polarization are separate effects; this power accounting does not add a polarization loss. Applying a loss already included in quoted gain would count it twice.',question:'Could an antenna accept nearly all the incident power while radiating only a small fraction of it?',};},sources:[sourceEarlier,sourceGuide],checks:()=>[{name:'Matched50ohm port haszero reflection',pass:((50-50)**2)/(100**2)===0},{name:'Purely reactive impedance has unit reflection',pass:((0-50)**2+75**2)/((0+50)**2+75**2)===1},{name:'Halving normalized power subtracts3.0103dB',pass:Math.abs(10*Math.log10(.5)+3.0102999566)<1e-9}]
  });
modules.find(m=>m.id==='dipole-pattern').spatialField=(theta,v)=>dipole(theta,v.kind);
modules.find(m=>m.id==='circular-aperture').spatialField=(theta,v)=>diskField(theta,v.diameter,v.model);
modules.find(m=>m.id==='array-multiplication').spatialPower=(theta,v)=>arrayField(theta,v.n,v.spacing,rad(v.phase)).p*(v.element?dipole(theta,1)**2:1);
})();

function sourceLabel(source) {
  if (source.startsWith('Course: ')) return source.slice(8);
  if (source.includes('Yn-MEMaiA0Y')) return 'WAV01: Maxwell’s equations';
  if (source.includes('R3KHaRWzpFM')) return 'WAV02: Helmholtz wave equation';
  if (source.includes('1V26Yr5KzW8')) return 'WAV03: Plane waves';
  if (source.includes('orbits.json')) return 'Course guided reading: astrodynamics and look angles';
  if (source.includes('subsystems.json')) return 'Course guided reading: spacecraft subsystems';
  if (source.includes('radio.json')) return 'Course guided reading: RF systems and propagation';
  if (source.includes('waves_antennas.json')) return 'Course guided reading: waves and wire antennas';
  if (source.includes('orbit_sim_math_final.py')) return 'Polar orbit model: derivatives, RK4 and observer geometry';
  if (source.includes('Double Curl')) return 'Analytic sinusoidal double-curl example';
  if (source.includes('2026-10-27')) return 'October 22 and 27 course notes: apertures and introductory arrays';
  return 'Supplied course notes and guided reading';
}
// New illustrative experiments from the October 29 lecture and assigned VID03-06 review.
// Actual assignment data, optimized weights, personal grades and submissions stay private.
(() => {
const tau=2*Math.PI,c=299792458;
const ctl=(id,label,min,max,step,value,unit='')=>({id,label,min,max,step,value,unit});
const pick=(id,label,value,options)=>({id,label,value,options:options.map(([value,label])=>({value,label}))});
const src=topic=>['Course: '+topic];
const sinc=x=>Math.abs(x)<1e-10?1:Math.sin(Math.PI*x)/(Math.PI*x);
function af(n,q){let re=0,im=0;for(let i=0;i<n;i++){re+=Math.cos(i*q);im+=Math.sin(i*q);}return(re*re+im*im)/(n*n);}
function dots(U,html,points,o,color=U.C.d){const L=88,R=28,T=o.title?48:24,B=65,H=o.height||340,W=o.width||800;let out='';for(const [x,y]of points)out+=U.circle(L+(x-o.xmin)/(o.xmax-o.xmin)*(W-L-R),H-B-(y-o.ymin)/(o.ymax-o.ymin)*(H-B-T),4,color,color);return html.replace('</svg>',out+'</svg>');}
function heat(U,fn,limit,label,threshold=null){
 const n=39,x0=110,y0=45,size=335,step=size/n,values=Array.from({length:n},(_,iy)=>Array.from({length:n},(_,ix)=>fn(-limit+2*limit*(ix+.5)/n,limit-2*limit*(iy+.5)/n)));let s='';
 for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){const p=values[iy][ix],level=Math.max(0,Math.min(1,(10*Math.log10(Math.max(p,1e-8))+40)/40));s+=`<rect x="${x0+ix*step}" y="${y0+iy*step}" width="${step+.15}" height="${step+.15}" fill="${U.C.a}" opacity="${.04+.96*level}"/>`;}
 if(threshold!==null)for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++)if(values[iy][ix]>=threshold){const x=x0+ix*step,y=y0+iy*step;if(iy===0||values[iy-1][ix]<threshold)s+=U.line(x,y,x+step,y,U.C.b,1.5);if(iy===n-1||values[iy+1][ix]<threshold)s+=U.line(x,y+step,x+step,y+step,U.C.b,1.5);if(ix===0||values[iy][ix-1]<threshold)s+=U.line(x,y,x,y+step,U.C.b,1.5);if(ix===n-1||values[iy][ix+1]<threshold)s+=U.line(x+step,y,x+step,y+step,U.C.b,1.5);}
 for(let i=0;i<=4;i++){let q=-limit+2*limit*i/4;s+=U.text(x0+i*size/4,y0+size+25,U.fmt(q,2),'middle')+U.text(x0-12,y0+size-i*size/4+5,U.fmt(q,2),'end');}s+=U.text(x0+size/2,430,label[0],'middle')+`<text transform="translate(28,${y0+size/2}) rotate(-90)" text-anchor="middle">${U.esc(label[1])}</text>`;s+=U.text(505,80,'Peak-normalized power')+U.text(505,116,'Strong color: near 0 dB')+U.text(505,150,'Faint color: −40 dB or below');return s;}


modules.push({id:'array-path-phase',group:'Antennas',title:'Path + feed phase',heading:'Why broadside adds while another direction cancels',intro:'For two identical elements, feed phase and the projected path difference both enter the same complex sum.',sources:src('October 29 notes, pages 1–4: general and uniform linear array factor'),controls:[ctl('spacing','Spacing d/λ',.1,1.5,.05,.5),ctl('theta','Angle from array axis θ',0,180,1,90,'°'),ctl('beta','Second-element feed phase β',-180,180,5,0,'°')],render(v,U){const phase=tau*v.spacing*Math.cos(U.rad(v.theta))+U.rad(v.beta),power=af(2,phase);let s=U.line(160,340,160,65,U.C.grid)+U.text(175,62,'+z: array axis')+U.circle(160,280,7,U.C.a,U.C.a)+U.circle(160,160,7,U.C.a,U.C.a)+U.text(120,285,'0','end')+U.text(120,165,'1','end')+U.line(120,160,120,280,U.C.grid)+U.text(105,225,'d','end');const th=U.rad(v.theta);s+=U.arrow(190,220,190+140*Math.sin(th),220-140*Math.cos(th),U.C.b)+U.text(65,395,'Broadside means θ = 90°, perpendicular to the element stack.');s+=U.line(490,240,720,240,U.C.grid)+U.line(550,95,550,350,U.C.grid)+U.arrow(550,240,620,240,U.C.a)+U.arrow(620,240,620+70*Math.cos(phase),240-70*Math.sin(phase),U.C.b)+U.arrow(550,240,620+70*Math.cos(phase),240-70*Math.sin(phase),U.C.c)+U.text(490,56,'Add the two field phasors');return{svg:U.svg(s,'Two-element path geometry and coherent phasor sum')+U.plot([{name:'Two-element relative power',color:U.C.a,points:U.range(180,q=>[q*180,af(2,tau*v.spacing*Math.cos(q*Math.PI)+U.rad(v.beta))])},{name:'Probe angle',color:U.C.b,dash:'5 4',points:[[v.theta,0],[v.theta,1]]}],{xmin:0,xmax:180,ymin:0,ymax:1.05,xlabel:'Angle θ from array axis (°)',ylabel:'Power / coherent peak',title:'A feed phase can move constructive addition'}),stats:[['Projected path difference',U.fmt(v.spacing*Math.cos(th),3)+' λ'],['Total relative phase',U.fmt(U.deg(phase),1)+'°'],['Relative power',U.fmt(power,3)]],equation:'ψ = kd cos θ + β; &nbsp; AF = 1 + e<sup>jψ</sup>; &nbsp; |AF/2|² = (1 + cos ψ)/2',note:'With d = λ/2 and β = 0, broadside has zero path difference and adds; the two axial directions have a half-wavelength difference and cancel. For a two-element true endfire example, try d = λ/4 and β = −90°: +z adds and −z cancels. Angles are from the array axis, not the station horizon.',question:'Why does β = 180° exchange the maxima and nulls without moving either element?'};},checks:()=>[{name:'Two half-wave-spaced elements add at broadside',pass:Math.abs(af(2,Math.PI*Math.cos(Math.PI/2))-1)<1e-12},{name:'Quarter-wave true endfire cancels the opposite axis',pass:af(2,-Math.PI/2-Math.PI/2)<1e-20}]});

modules.push({id:'planar-array',group:'Antennas',title:'Planar steering',heading:'A plane of elements controls two directional coordinates',intro:'Steer a rectangular half-wavelength grid using a linear phase ramp along each aperture axis.',sources:src('October 29 general array factor and planar-grid assignment assumptions'),controls:[ctl('nx','Elements along x',2,24,1,10),ctl('ny','Elements along y',2,24,1,8),ctl('u0','Steering direction cosine u₀',-.6,.6,.05,.15),ctl('v0','Steering direction cosine v₀',-.6,.6,.05,.1)],render(v,U){let s=heat(U,(u,w)=>u*u+w*w<=1?af(v.nx,Math.PI*(u-v.u0))*af(v.ny,Math.PI*(w-v.v0)):0,1,['Direction cosine u','Direction cosine v']);s+=U.circle(277.5,212.5,167.5,'none',U.C.muted)+U.circle(110+(v.u0+1)*335/2,45+(1-v.v0)*335/2,6,'none',U.C.b)+U.text(505,220,'The ring marks the steering direction.')+U.text(505,270,'u² + v² ≤ 1: visible hemisphere')+U.text(505,315,'This is angular space, not ground area.');return{svg:U.svg(s,'Two-dimensional normalized planar-array power versus direction cosines'),stats:[['Active elements',String(v.nx*v.ny)],['Phase step along x',U.fmt(-180*v.u0,1)+'°'],['Phase step along y',U.fmt(-180*v.v0,1)+'°']],equation:'AF = ΣₘΣₙ eʲ⁽ᵐπ⁽ᵘ⁻ᵘ⁰⁾⁺ⁿπ⁽ᵛ⁻ᵛ⁰⁾⁾; &nbsp; u = sin θ cos φ, v = sin θ sin φ',note:'Uniform amplitudes, λ/2 spacing, identical elements and neglected mutual coupling. The displayed power is |AF/(NₓNᵧ)|², not absolute gain. Physical λ/2 spacing does not itself remove coupling; neglecting it is a supplied homework assumption.',question:'Which dimension should you enlarge to make the beam narrower in u while leaving its v width similar?'};},checks:()=>[{name:'Separable planar array coherent steering peak',pass:af(10,0)*af(8,0)===1},{name:'Normalized field power never exceeds coherent sum',pass:af(8,.31)<=1&&af(8,.31)>=0}]});

modules.push({id:'array-footprint',group:'Antennas',title:'Beam to footprint',heading:'An angular beam becomes a patch of ground through geometry',intro:'Change aperture dimensions and slant distance to see a simplified ground footprint stretch.',sources:src('Array-factor, look-angle and free-space link-budget prerequisites'),controls:[ctl('nx','Elements along x',10,160,10,80),ctl('ny','Elements along y',10,160,10,100),ctl('range','Range to flat target plane',20000,45000,1000,36000,'km'),ctl('level','Coverage contour',-20,-1,1,-3,'dB from peak')],render(v,U){const p=(x,y)=>{const r=Math.hypot(v.range,x,y);return af(v.nx,Math.PI*x/r)*af(v.ny,Math.PI*y/r);};let s=heat(U,p,1500,['Cross-range x (km)','Along-range y (km)'],10**(v.level/10));let count=0,total=0;for(let iy=0;iy<80;iy++)for(let ix=0;ix<80;ix++){let x=-1500+3000*(ix+.5)/80,y=-1500+3000*(iy+.5)/80;total++;if(10*Math.log10(Math.max(p(x,y),1e-30))>=v.level)count++;}s+=U.text(505,220,'Flat plane normal to boresight')+U.text(505,310,'Angular width × distance sets size.');return{svg:U.svg(s,'Illustrative array power projected onto a flat ground plane'),stats:[['Relative contour',v.level+' dB'],['Area above contour in shown window',U.fmt(count/total*3000*3000,0)+' km²'],['Active elements',String(v.nx*v.ny)]],equation:'u = x/√(r₀²+x²+y²), &nbsp; v = y/√(r₀²+x²+y²); &nbsp; Pₙ(x,y) = |AF(u,v)/N|²',note:'This is a flat-plane geometric preview using relative power, not an absolute −80 dBm coverage claim. The outlined contour and sampled area cover only the shown ±1500 km window; coverage can extend beyond it. The area uses an illustrative 80×80 sample. The actual homework instead needs spherical georeferenced geometry, absolute gain normalization, slant-range loss and every supplied raster location.',question:'If range doubles and the angular pattern stays fixed, how should footprint width and area scale?'};},checks:()=>[{name:'Boresight on flat plane has normalized unit power',pass:af(80,0)*af(100,0)===1},{name:'Area scales as distance squared for a fixed angular contour',pass:(2*2)===4}]});

function inv3(a){const m=a.map((r,i)=>r.concat([0,0,0].map((_,j)=>+(i===j))));for(let j=0;j<3;j++){let p=j;for(let k=j+1;k<3;k++)if(Math.abs(m[k][j])>Math.abs(m[p][j]))p=k;[m[p],m[j]]=[m[j],m[p]];let q=m[j][j];if(Math.abs(q)<1e-12)return null;for(let k=0;k<6;k++)m[j][k]/=q;for(let i=0;i<3;i++)if(i!==j){let q=m[i][j];for(let k=0;k<6;k++)m[i][k]-=q*m[j][k];}}return m.map(r=>r.slice(3));}
modules.push({id:'gnss-orbits',group:'Navigation',title:'GPS orbit geometry',heading:'Inclined MEO planes spread satellites across the sky',intro:'Compare a simple six-plane constellation as Earth rotates beneath its orbiting satellites.',sources:src('October 29 GPS introduction, note page 6; GPS.gov space segment'),controls:[ctl('inclination','Inclination',0,90,1,55,'°'),ctl('latitude','Observer latitude',-80,80,2,34,'°'),ctl('time','Elapsed time',0,24,.25,0,'h')],animate:{id:'time',min:0,max:24,step:.08},render(v,U){const R=6378,r=26560,w=tau/86164.0905,n=tau/(86164.0905/2),t=v.time*3600,i=U.rad(v.inclination),la=U.rad(v.latitude),lo=U.rad(-84)+w*t,obs=[R*Math.cos(la)*Math.cos(lo),R*Math.cos(la)*Math.sin(lo),R*Math.sin(la)],dot=(a,b)=>a.reduce((s,x,j)=>s+x*b[j],0),az=-Math.atan(.3),el=.24,p=a=>[300+175*(Math.cos(az)*a[0]-Math.sin(az)*a[1])/r,220+175*(Math.sin(el)*(Math.sin(az)*a[0]+Math.cos(az)*a[1])-Math.cos(el)*a[2])/r];let s=U.circle(300,220,175*R/r,'var(--earth)',U.C.ink),visible=0;for(let plane=0;plane<6;plane++){const a=plane*tau/6,pos=q=>[r*(Math.cos(a)*Math.cos(q)-Math.sin(a)*Math.cos(i)*Math.sin(q)),r*(Math.sin(a)*Math.cos(q)+Math.cos(a)*Math.cos(i)*Math.sin(q)),r*Math.sin(i)*Math.sin(q)];s+=U.path(U.range(90,q=>p(pos(q*tau))),U.C.grid,1);for(let j=0;j<4;j++){const q=n*t+j*tau/4+plane*tau/24,ss=pos(q),ok=dot(ss.map((x,k)=>x-obs[k]),obs)>0;if(ok){visible++;s+=U.line(...p(obs),...p(ss),U.C.a,1,'3 4');}s+=U.circle(...p(ss),ok?4:2.5,ok?U.C.a:U.C.muted,ok?U.C.a:U.C.muted);}}s+=U.circle(...p(obs),5,U.C.b,U.C.b)+U.text(520,70,'Six planes; four satellites per plane')+U.text(520,108,'Illustrative phasing, not live GPS slots')+U.text(520,175,'Orange point: rotating Earth station')+U.text(520,216,'Dashed rays: ideal above-horizon links')+U.text(520,290,'GNSS benefits from varied directions,')+U.text(520,321,'not simply a large satellite count.');return{svg:U.svg(s,'Idealized 24-satellite inclined MEO constellation and visibility'),stats:[['Toy satellites above horizon',String(visible)],['Nominal orbital altitude',U.fmt(r-R,0)+' km'],['Idealized period',U.fmt(86164.0905/7200,3)+' h']],equation:'T ≈ ½ sidereal day; &nbsp; h ≈ 20,200 km; &nbsp; i ≈ 55°',note:'The orbit radius and half-sidereal-day period are rounded GPS teaching values. Earth and orbit share one spatial scale, with an orthographic projection. This idealized 24-satellite phasing does not guarantee a particular visibility count or represent the current operational constellation; terrain and elevation masks are omitted.',question:'Why can satellites clustered in one part of the sky give worse positioning than the same count spread widely?'};},checks:()=>[{name:'Half sidereal period about11.97 hours',pass:Math.abs(86164.0905/7200-11.9672348)<1e-6},{name:'GPS nominal altitude is MEO not GEO',pass:26560-6378>20000&&26560-6378<21000}]});

modules.push({id:'doppler-pass',group:'Navigation',title:'Doppler pass',heading:'A nearer pass changes its range rate more sharply',intro:'Use a straight satellite pass to connect closest approach, frequency shift and cross-track distance.',sources:src('October 29 Doppler localization discussion; NOAA SARSAT'),controls:[ctl('cross','Cross-track distance',0,1800,50,400,'km'),ctl('speed','Along-track speed',5,8,.1,7.4,'km/s'),ctl('time','Time from closest approach',-500,500,10,0,'s')],animate:{id:'time',min:-500,max:500,step:5},render(v,U){const h=850,f=406e6,df=t=>-f/c*(1000*v.speed*v.speed*t/Math.hypot(h,v.cross,v.speed*t)),series=[{name:'Selected cross-track distance',color:U.C.a,points:U.range(200,q=>{const t=-500+1000*q;return[t,df(t)/1000];})},{name:'Closest approach',color:U.C.b,dash:'5 4',points:[[0,-11],[0,11]]}];let s=U.line(80,150,700,150,U.C.grid)+U.circle(390,315,7,U.C.b,U.C.b)+U.text(400,342,'Beacon')+U.circle(390+v.speed*v.time*.06,150,6,U.C.a,U.C.a)+U.arrow(335,150,450,150,U.C.a)+U.line(390,315,390+v.speed*v.time*.06,150,U.C.c,1,'4 4')+U.text(65,45,'Along-track pass: geometric distances shown schematically')+U.text(70,390,'The two sides of the ground track have the same ideal Doppler history.');return{svg:U.svg(s,'Straight satellite pass and beacon range geometry')+U.plot(series,{xmin:-500,xmax:500,ymin:-11,ymax:11,xlabel:'Time from closest approach (s)',ylabel:'Doppler shift (kHz)',title:'A 406 MHz beacon in a simplified pass model'}),stats:[['Current shift',U.fmt(df(v.time)/1000,3)+' kHz'],['Closest slant distance',U.fmt(Math.hypot(h,v.cross),0)+' km'],['Slope at zero crossing',U.fmt(-f/c*1000*v.speed*v.speed/Math.hypot(h,v.cross),2)+' Hz/s']],equation:'r(t) = √[h²+b²+(vt)²]; &nbsp; Δf ≈ −(f/c) v²t/r(t)',note:'Straight constant-speed pass over a stationary beacon; h = 850 km and frequency = 406 MHz are supplied here. Zero shift marks closest approach in this model, not universally an exact beacon latitude. A single pass can leave a left/right ambiguity; actual orbit motion, Earth rotation and oscillator offsets need a fuller solution.',question:'Why can a gentler zero-crossing slope indicate a more distant track without identifying which side of the track the beacon lies on?'};},checks:()=>[{name:'Closest approach has zero geometric range rate',pass:7.4*7.4*0/Math.hypot(850,400,0)===0},{name:'Greater cross track reduces zero-crossing slope magnitude',pass:1/Math.hypot(850,1000)<1/850}]});

modules.push({id:'pseudorange-clock',group:'Navigation',title:'Range & clock',heading:'One clock offset adds the same distance error to every pseudorange',intro:'Correct the shared clock term and watch the range-circle arcs approach the receiver.',sources:src('GPS prerequisite preview: time of flight and receiver clock bias'),controls:[ctl('x','Receiver east position',-2,2,.25,.5,'km'),ctl('y','Receiver north position',-2,2,.25,-.5,'km'),ctl('guess','Assumed clock correction',0,4,.1,0,'μs')],render(v,U){const truth=2,scale=23,px=330,py=230,sats=[[-6,5],[6,5],[0,-7]],col=[U.C.a,U.C.b,U.C.c];let z='<defs><clipPath id="range-clip"><rect x="55" y="45" width="620" height="350"/></clipPath></defs><g clip-path="url(#range-clip)">';for(let j=0;j<3;j++){const [x,y]=sats[j],r=Math.hypot(x-v.x,y-v.y)+(truth-v.guess)*c*1e-9;z+=U.circle(px+x*scale,py-y*scale,r*scale,'none',col[j])+U.circle(px+x*scale,py-y*scale,5,col[j],col[j]);}z+='</g>';z+=U.circle(px+v.x*scale,py-v.y*scale,5,U.C.ink,U.C.ink)+U.text(55,28,'2D toy geometry: three sources, two position coordinates, one clock offset')+U.text(690,150,'Dark point:')+U.text(690,178,'receiver')+U.text(55,429,'The circle arcs use pseudorange minus the selected common clock correction.');return{svg:U.svg(z,'Pseudorange circle arcs under a common receiver-clock correction'),stats:[['Remaining common range error',U.fmt((truth-v.guess)*c*1e-6,1)+' m'],['Actual clock offset in this demo','2 μs'],['Unknowns in full 3D GPS','x, y, z and receiver clock bias']],equation:'ρᵢ = ‖r − rᵢ‖ + c b + error; &nbsp; range = c × travel time',note:'This is a planar prerequisite preview with known source positions and a shared clock bias; it is not a full GPS orbit/clock solution. In 3D, four independent measurements are needed for three position coordinates and one receiver-clock unknown. Real pseudorange models also contain satellite clocks and propagation corrections.',question:'Why does an inaccurate receiver clock make three-dimensional GPS positioning need at least four independent satellite measurements?'};},checks:()=>[{name:'One microsecond corresponds to299.792458 metres',pass:Math.abs(c*1e-6-299.792458)<1e-9},{name:'Common bias cancels in a range difference',pass:(8000+300)-(7000+300)===1000}]});

modules.push({id:'gnss-geometry',group:'Navigation',title:'Geometry & precision',heading:'Similar range errors can produce very different position uncertainty',intro:'Spread four source directions around a receiver while estimating an unknown clock term.',sources:src('GPS prerequisite preview: measurement geometry and dilution of precision'),controls:[ctl('spread','Angular spread of four sources',20,360,10,300,'°'),ctl('sigma','Independent range error σ',1,10,1,3,'m')],render(v,U){const angles=Array.from({length:4},(_,i)=>U.rad(-v.spread/2+(i+.5)*v.spread/4)),H=angles.map(a=>[-Math.cos(a),-Math.sin(a),1]),A=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>H.reduce((s,r)=>s+r[i]*r[j],0))),Q=inv3(A),xx=Q[0][0],yy=Q[1][1],xy=Q[0][1],phi=.5*Math.atan2(2*xy,xx-yy),delta=Math.hypot(xx-yy,2*xy),l1=(xx+yy+delta)/2,l2=(xx+yy-delta)/2,k=2.44774683*v.sigma,major=k*Math.sqrt(l1),minor=k*Math.sqrt(Math.max(0,l2));let s=U.circle(300,230,5,U.C.b,U.C.b);for(let i=0;i<4;i++){let a=angles[i],x=300+145*Math.cos(a),y=230-145*Math.sin(a);s+=U.arrow(300,230,x,y,U.C.a)+U.circle(x,y,6,U.C.a,U.C.a)+U.text(x+10,y-10,String(i+1));}s+=U.text(70,30,'Unit line-of-sight directions; equal independent range-error variance')+U.text(520,150,'2D position + one clock unknown')+U.text(520,200,'Nearby directions give similar equations.')+U.text(520,250,'A wider spread helps separate x, y and b.');const points=U.range(100,q=>{let a=q*tau;return[major*Math.cos(a)*Math.cos(phi)-minor*Math.sin(a)*Math.sin(phi),major*Math.cos(a)*Math.sin(phi)+minor*Math.sin(a)*Math.cos(phi)];}),extentX=Math.max(...points.map(p=>Math.abs(p[0]))),extentY=Math.max(...points.map(p=>Math.abs(p[1]))),xlim=Math.max(extentX,extentY*684/337)*1.15,ylim=xlim*337/684;return{svg:U.svg(s,'Source direction geometry for a two-dimensional clock-biased receiver')+U.plot([{name:'95% Gaussian position-error ellipse',color:U.C.c,points}],{xmin:-xlim,xmax:xlim,ymin:-ylim,ymax:ylim,xlabel:'East position error (m)',ylabel:'North position error (m)',title:'Linearized covariance; equal horizontal and vertical scales',height:450}),stats:[['2D position dilution factor',U.fmt(Math.sqrt(xx+yy),2)],['95% ellipse major semiaxis',U.fmt(major,1)+' m'],['95% ellipse minor semiaxis',U.fmt(minor,1)+' m']],equation:'Cov(δx,δy,cδb) = σ²(HᵀH)⁻¹; &nbsp; Hᵢ = (−cos αᵢ, −sin αᵢ, 1)',note:'A linearized 2D preview with equal independent Gaussian range errors and an unknown clock term. The 95% ellipse uses √5.991 for two position dimensions. Axes zoom automatically with equal metres per pixel; this is not a live GPS accuracy forecast or a 3D GDOP calculation.',question:'Why does improving each range measurement help, but fail to remove the penalty from a nearly one-sided geometry?'};},checks:()=>{const q=inv3([[2,0,0],[0,2,0],[0,0,4]]);return[{name:'Symmetric four-source 2D position dilution equals1',pass:Math.abs(Math.sqrt(q[0][0]+q[1][1])-1)<1e-12},{name:'Doubling range sigma doubles positional standard errors',pass:2*Math.sqrt(.5)===Math.sqrt(4*.5)}];}});

const pn=[1,1,1,1,-1,-1,-1,1,-1,-1,1,1,-1,1,-1];
modules.push({id:'pn-correlation',group:'Navigation',title:'Code correlation',heading:'A delayed code is found by testing many alignments',intro:'Slide a local replica across a noisy received sequence and look for the correlation peak.',sources:src('GPS spread-spectrum prerequisite preview; assigned digital-signal review'),controls:[ctl('delay','True cyclic delay',0,14,1,4,'chips'),ctl('trial','Local trial delay',0,14,1,0,'chips'),ctl('noise','Deterministic noise amplitude',0,2,.1,.5),ctl('rate','Chip rate',.5,5,.1,1,'Mchip/s')],render(v,U){const N=pn.length,rx=pn.map((_,i)=>pn[(i-v.delay+N)%N]+v.noise*Math.sin(i*9.31+1.7)),corr=d=>rx.reduce((s,r,i)=>s+r*pn[(i-d+N)%N],0)/N,points=Array.from({length:N},(_,d)=>[d,corr(d)]),best=points.reduce((a,b)=>b[1]>a[1]?b:a)[0],ymin=Math.min(-.15,...points.map(p=>p[1]))-.15,ymax=Math.max(1.05,...points.map(p=>p[1]))+.15;let z='';for(let i=0;i<N;i++){let x=68+i*44;z+=U.text(x,100,pn[(i-v.delay+N)%N]>0?'+':'−','middle',U.C.a)+U.text(x,200,pn[(i-v.trial+N)%N]>0?'+':'−','middle',U.C.b)+U.line(x,125,x,175,U.C.grid);}z+=U.text(65,40,'Received code signs (before noise): cyclically shifted')+U.text(65,245,'Local trial code signs')+U.text(65,330,'Multiplication and summation reward matching chips.');return{svg:U.svg(z,'Cyclic received and local PN code alignment',800,370)+U.plot([{name:'Normalized code correlation',color:U.C.a,points},{name:'Trial delay',color:U.C.b,dash:'4 4',points:[[v.trial,ymin],[v.trial,ymax]]}],{xmin:0,xmax:14,ymin,ymax,xlabel:'Trial cyclic delay (chips)',ylabel:'Normalized correlation',title:'One code-period search'}),stats:[['Largest correlation at delay',best+' chips'],['Correlation at trial',U.fmt(corr(v.trial),3)],['Distance for one chip',U.fmt(c/(v.rate*1e6),1)+' m']],equation:'R(d) = (1/N) Σᵢ rᵢ cᵢ₋d; &nbsp; Δrange = c/R<sub>chip</sub>',note:'A 15-chip teaching sequence, not an actual GPS C/A PRN code or navigation message. Noise is a reproducible sine sequence rather than a random-channel performance model. Correlation estimates delay modulo this code period; absolute timing and the receiver clock still require additional information.',question:'Why can the correlation peak reveal a delay even when individual received chip values are noisy?'};},checks:()=>[{name:'PN zero-delay autocorrelation is1',pass:pn.reduce((s,a)=>s+a*a,0)/15===1},{name:'Fifteen-chip m-sequence off-peak autocorrelation is−1/15',pass:Array.from({length:14},(_,d)=>pn.reduce((s,a,i)=>s+a*pn[(i-d-1+15)%15],0)).every(x=>x===-1)}]});

modules.push({id:'sampling-alias',group:'Digital',title:'Sampling & aliasing',heading:'Different continuous waves can give exactly the same samples',intro:'Change the sample rate relative to a sinusoid and compare its samples with a lower-frequency alias.',sources:src('VID03 pages2–4: sampling theorem and pulse amplitude modulation'),controls:[ctl('frequency','Signal frequency',2,40,1,18,'Hz'),ctl('sample','Sample rate',8,100,2,24,'sample/s')],render(v,U){const fa=Math.abs(((v.frequency+v.sample/2)%v.sample+v.sample)%v.sample-v.sample/2),points=Array.from({length:Math.floor(v.sample*.5)+1},(_,i)=>[i/v.sample,Math.cos(tau*v.frequency*i/v.sample)]),o={xmin:0,xmax:.5,ymin:-1.2,ymax:1.2,xlabel:'Time (s)',ylabel:'Signal amplitude (normalized)',title:'Dots are the samples, not a continuous reconstruction',height:390};let svg=U.plot([{name:'Original cosine',color:U.C.a,points:U.range(400,q=>[q*.5,Math.cos(tau*v.frequency*q*.5)])},{name:'Baseband alias cosine',color:U.C.b,dash:'6 4',points:U.range(400,q=>[q*.5,Math.cos(tau*fa*q*.5)])}],o);svg=dots(U,svg,points,o);return{svg,stats:[['Original frequency',v.frequency+' Hz'],['Folded baseband alias',U.fmt(fa,2)+' Hz'],['Sample-rate condition',v.sample>2*v.frequency?'Above2f for this single tone':'At/below2f: no robust reconstruction guarantee']],equation:'f<sub>s</sub> &gt; 2B for a bandlimited baseband signal; &nbsp; f and f ± m f<sub>s</sub> can share samples',note:'A pure cosine is sampled ideally; no anti-alias filter or finite converter aperture is modeled. The strict inequality avoids the pathological exactly-Nyquist case, where phase matters. For general signals, B is the highest baseband frequency, and unwanted energy above fs/2 must be filtered before sampling.',question:'Keep f =18Hz. Why can24samples/s make it indistinguishable from6Hz?'};},checks:()=>[{name:'18Hz and6Hz have equal samples at24sample/s',pass:Array.from({length:13},(_,i)=>Math.abs(Math.cos(tau*18*i/24)-Math.cos(tau*6*i/24))).every(x=>x<1e-12)},{name:'Higher fs folds a resolved tone to itself',pass:Math.abs(((18+50)%100)-50)===18}]});

function quant(x,b,endpoint){const L=2**b;if(endpoint){const d=2/(L-1);return-1+Math.round(Math.max(0,Math.min(L-1,(x+1)/d)))*d;}const d=2/L;return-1+(Math.max(0,Math.min(L-1,Math.floor((x+1)/d)))+.5)*d;}
modules.push({id:'quantization-pcm',group:'Digital',title:'Quantization & PCM',heading:'Sampling fixes when; quantization fixes which amplitude level',intro:'Compare finite amplitude levels with the original waveform and connect bits per sample to raw PCM rate.',sources:src('VID03 pages5–8: quantization and PCM; endpoint-level spacing'),controls:[ctl('bits','Bits per sample',1,10,1,3),ctl('sample','Sample rate',8,96,4,48,'ksample/s'),pick('model','Quantizer convention',1,[[1,'Endpoint levels: Δ = range/(2ᵇ−1)'],[0,'Equal bins: Δ = range/2ᵇ']])],render(v,U){const d=2/(2**v.bits-(v.model?1:0)),signal=x=>.9*Math.cos(tau*x),pts=U.range(600,q=>[q,quant(signal(q),v.bits,v.model)]),err=U.range(3000,q=>(quant(signal(q),v.bits,v.model)-signal(q))**2).reduce((s,x)=>s+x,0)/3001;return{svg:U.plot([{name:'Original waveform',color:U.C.a,points:U.range(600,q=>[q,signal(q)])},{name:'Quantized levels',color:U.C.b,points:pts}],{xmin:0,xmax:1,ymin:-1.15,ymax:1.15,xlabel:'Time / signal period',ylabel:'Amplitude in ±1 input range',title:'Uniform quantization at0.9full-scale peak',height:410}),stats:[['Available levels',String(2**v.bits)],['Step size Δ',U.fmt(d,5)],['Raw PCM rate',U.fmt(v.sample*v.bits,0)+' kbit/s']],equation:'L = 2ᵇ; &nbsp; R<sub>PCM</sub> = f<sub>s</sub>b; &nbsp; SQNR ≈6.02b+1.76dB under the usual high-resolution full-scale-sine model',note:'The selected endpoint-level model matches the VID03 level-spacing convention. Equal-width bins use a different denominator, so name the model before calculating Δ. For the displayed0.9-full-scale sine, the numerically measured signal/quantization-error ratio is '+U.fmt(10*Math.log10(.9*.9/2/err),2)+'dB; the familiar SQNR rule is an approximation, not an exact low-bit identity.',question:'If sample rate doubles while resolution increases from3 to6bits, by what factor does raw PCM rate grow?'};},checks:()=>[{name:'Two-bit endpoint quantizer has fourlevels including±1',pass:quant(-1,2,1)===-1&&quant(1,2,1)===1},{name:'48ksample/s16bit mono PCM is768kbit/s',pass:48000*16===768000}]});

function huffman(p){const q=p.map((w,i)=>({w,ids:[i]})),lengths=p.map(()=>0);while(q.length>1){q.sort((a,b)=>a.w-b.w);const a=q.shift(),b=q.shift(),ids=a.ids.concat(b.ids);for(const i of ids)lengths[i]++;q.push({w:a.w+b.w,ids});}return lengths;}
modules.push({id:'source-compression',group:'Digital',title:'Compression vs coding',heading:'Compression removes redundancy; error correction deliberately adds it',intro:'Use a four-symbol source to separate fixed-length bits, lossless compression, and channel-code overhead.',sources:src('VID04: source compression; VID06: error correction and adaptive coding'),controls:[ctl('p','Probability of the most common symbol',.25,.94,.01,.7),ctl('rate','Source symbol rate',1,100,1,20,'ksymbol/s'),ctl('rc','Channel code rate Rᶜ',.5,1,.05,.75)],render(v,U){const p=[v.p,...Array(3).fill((1-v.p)/3)],lens=huffman(p),avg=p.reduce((s,x,i)=>s+x*lens[i],0),entropy=-p.reduce((s,x)=>s+x*Math.log2(x),0);let z=U.text(65,35,'Four symbols, exact Huffman code lengths');p.forEach((x,i)=>{const y=95+i*72;z+=U.text(65,y,'Symbol '+String.fromCharCode(65+i))+`<rect x="175" y="${y-20}" width="${x*365}" height="25" fill="${U.C.a}"/>`+U.text(565,y,U.fmt(x,3)+' probability')+U.text(565,y+23,lens[i]+' code bits');});return{svg:U.svg(z,'Source probabilities and lossless Huffman code lengths'),stats:[['Source entropy',U.fmt(entropy,3)+' bit/symbol'],['Average Huffman length',U.fmt(avg,3)+' bit/symbol'],['After compression + channel coding',U.fmt(v.rate*avg/v.rc,2)+' kbit/s']],equation:'H = −Σpᵢlog₂pᵢ; &nbsp; L̄ = Σpᵢlᵢ; &nbsp; R<sub>coded</sub> = R<sub>symbols</sub>L̄/R<sub>c</sub>',note:'Fixed-length coding needs2bits per source symbol here. Huffman is lossless for this supplied probability model; real streams also need codebook/framing overhead. JPEG/MPEG may discard information, while channel error-correcting codes add structured redundancy to resist transmission errors; neither operation is interchangeable with modulation.',question:'Can a final transmitted stream be larger than the compressed source while still smaller than the original fixed-length stream?'};},checks:()=>[{name:'Uniform four-symbol Huffman length equals2',pass:huffman([.25,.25,.25,.25]).every(x=>x===2)},{name:'Rate1/2 channel coding doubles coded bit count',pass:1/.5===2}]});

function raised(x,a){if(Math.abs(x)<1e-10)return 1;if(a&&Math.abs(Math.abs(2*a*x)-1)<1e-7)return Math.PI/4*sinc(1/(2*a));return sinc(x)*Math.cos(Math.PI*a*x)/(1-(2*a*x)**2);}
modules.push({id:'nyquist-pulse',group:'Digital',title:'Pulses & ISI',heading:'A pulse can overlap its neighbors while giving zero interference at the right sampling instants',intro:'Change raised-cosine rolloff and the receiver timing offset for a short symbol sequence.',sources:src('VID05 pages1–7: Nyquist pulses, raised cosine and matched filtering'),controls:[ctl('rolloff','Raised-cosine rolloff α',0,1,.05,.35),ctl('offset','Receiver timing offset',0,.5,.025,0,'symbol periods')],render(v,U){const syms=[1,-1,1,1,-1],wave=x=>syms.reduce((s,a,i)=>s+a*raised(x-(i-2),v.rolloff),0),series=[{name:'Combined received waveform',color:U.C.a,points:U.range(700,q=>{let x=-4+q*8;return[x,wave(x)];})},{name:'One central pulse',color:U.C.b,dash:'5 4',points:U.range(700,q=>{let x=-4+q*8;return[x,raised(x,v.rolloff)];})}],samplePoints=syms.map((_,i)=>[i-2+v.offset,wave(i-2+v.offset)]),ylim=Math.max(1.1,...series.flatMap(s=>s.points.map(p=>Math.abs(p[1]))),...samplePoints.map(p=>Math.abs(p[1])))*1.1,o={xmin:-4,xmax:4,ymin:-ylim,ymax:ylim,xlabel:'Time / symbol period T',ylabel:'Amplitude (normalized)',title:'The useful values are the sample values, not isolated-looking pulses',height:410};let html=U.plot(series,o);html=dots(U,html,samplePoints,o);return{svg:html,stats:[['Center desired symbol','+1'],['Center observed sample',U.fmt(wave(v.offset),4)],['Passband occupied width',(1+v.rolloff).toFixed(2)+' × symbol rate']],equation:'h(t) = sinc(t/T) cos(παt/T) / [1−(2αt/T)²]; &nbsp; h(nT) =0 for integer n ≠0',note:'The raised-cosine pulse is the combined ideal transmit/channel/receive response here. Timing error creates ISI even when that combined response has exact Nyquist zeros. A root-raised-cosine transmitter and matched receiver are one common implementation; two arbitrary raised-cosine filters do not automatically reproduce this model.',question:'Why can increasing rolloff shorten ringing but still leave zero-ISI samples at the ideal symbol times?'};},checks:()=>[{name:'Raised-cosine samples at nonzero integers vanish',pass:[-.35,0,.35,1].every(a=>[1,2,3].every(n=>Math.abs(raised(n,a))<1e-10))},{name:'Rolloff1 removable singularity at half a symbol equals0.5',pass:Math.abs(raised(.5,1)-.5)<1e-12}]});

function constellation(m){if(m===4)return[[-1,-1],[-1,1],[1,-1],[1,1]].map(x=>x.map(y=>y/Math.SQRT2));if(m===8)return Array.from({length:8},(_,i)=>[Math.cos(tau*i/8),Math.sin(tau*i/8)]);const q=Math.sqrt(m),a=[];for(let j=0;j<q;j++)for(let i=0;i<q;i++)a.push([2*i-q+1,2*j-q+1]);const e=Math.sqrt(a.reduce((s,p)=>s+p[0]**2+p[1]**2,0)/m);return a.map(p=>p.map(x=>x/e));}
modules.push({id:'iq-constellation',group:'Digital',title:'I/Q & decisions',heading:'A modulation symbol chooses one point in the I/Q plane',intro:'Keep average symbol energy fixed while increasing the number of constellation points or the noise.',sources:src('VID05 I/Q and QPSK; VID06 M-ary QAM and PSK'),controls:[pick('m','Constellation',4,[[4,'QPSK (4 points)'],[8,'8-PSK'],[16,'16-QAM'],[64,'64-QAM']]),ctl('noise','Noise standard deviation per I/Q',0,.5,.025,.15)],render(v,U){const pts=constellation(v.m),samples=Array.from({length:48},(_,j)=>{const k=j%pts.length,p=pts[k],r=[p[0]+v.noise*Math.sqrt(-2*Math.log((j+.7)/49))*Math.cos(j*6.82),p[1]+v.noise*Math.sqrt(-2*Math.log((j+.7)/49))*Math.sin(j*6.82)],nearest=pts.reduce((a,p,i)=>Math.hypot(p[0]-r[0],p[1]-r[1])<Math.hypot(pts[a][0]-r[0],pts[a][1]-r[1])?i:a,0);return{r,wrong:nearest!==k};}),limit=Math.ceil(Math.max(1,...pts.flat().map(Math.abs),...samples.flatMap(s=>s.r.map(Math.abs)))*1.08*4)/4,scale=150/limit,cx=310,cy=225;let z=U.line(cx-170,cy,cx+170,cy,U.C.grid)+U.line(cx,cy-170,cx,cy+170,U.C.grid)+U.text(cx+185,cy+5,'I')+U.text(cx+10,cy-173,'Q');for(const q of[-limit,limit])z+=U.text(cx+scale*q,cy+24,U.fmt(q,2),'middle')+U.text(cx-10,cy-scale*q+5,U.fmt(q,2),'end');for(const s of samples)z+=U.circle(cx+scale*s.r[0],cy-scale*s.r[1],2,s.wrong?U.C.d:U.C.b,s.wrong?U.C.d:U.C.b);for(const p of pts)z+=U.circle(cx+scale*p[0],cy-scale*p[1],4,'none',U.C.a);z+=U.text(535,95,'All 48 received points are visible.')+U.text(535,140,'Equal I/Q scale; axes zoom with noise.')+U.text(535,185,'Rings: transmitted alphabet')+U.text(535,230,'Correct symbol decision','start',U.C.b)+U.text(535,275,'Wrong symbol decision','start',U.C.d)+U.text(65,430,'Average symbol energy is fixed; numerical decisions are made before plotting.');return{svg:U.svg(z,'Auto-scaled normalized I/Q constellation with all48 reproducible received samples'),stats:[['Coded bits per symbol',String(Math.log2(v.m))],['Average symbol energy','1 (normalized)'],['Nearest-symbol errors in48 examples',String(samples.filter(s=>s.wrong).length)]],equation:'s(t) = I cos ω<sub>c</sub>t − Q sin ω<sub>c</sub>t; &nbsp; m = log₂M coded bits/symbol',note:'Noise samples are a fixed teaching realization; the displayed error count is not a BER or SER prediction. All constellations are normalized to the same average symbol energy. Axes autozoom equally in I and Q so no received points are hidden. Higher-order constellations carry more bits per symbol but generally need more separation relative to noise; bit error rate also depends on labeling and coding.',question:'Why is counting wrong symbols insufficient to determine the bit error rate without knowing the bit labeling?'};},checks:()=>[{name:'16QAM normalized average energy is1',pass:Math.abs(constellation(16).reduce((s,p)=>s+p[0]**2+p[1]**2,0)/16-1)<1e-12},{name:'64QAM carries6coded bits per symbol',pass:Math.log2(64)===6}]});

modules.push({id:'rate-bandwidth',group:'Digital',title:'Bits, baud & bandwidth',heading:'Keep information bits, coded bits and modulation symbols separate',intro:'Move through the rate budget in the same order as the transmitter chain.',sources:src('VID05 Nyquist bandwidth; VID06 constellation size and channel coding'),controls:[ctl('rate','Information rate',1,20,1,6,'Mbit/s'),pick('rc','Channel code rate',.75,[[.5,'1/2'],[.75,'3/4'],[1,'1 (uncoded)']]),pick('m','Constellation size M',16,[[4,'4'],[16,'16'],[64,'64']]),ctl('alpha','Rolloff α',0,1,.05,.25)],render(v,U){const coded=v.rate/v.rc,sym=coded/Math.log2(v.m),B=sym*(1+v.alpha),labels=[['Information',v.rate+' Mbit/s'],['After channel code',U.fmt(coded,3)+' Mbit/s'],['Mapped symbols',U.fmt(sym,3)+' Mbaud'],['RF occupied width',U.fmt(B,3)+' MHz']];let z=U.text(55,35,'A rate is attached to a specific point in the chain.');labels.forEach((a,i)=>{const y=85+i*87;z+=`<rect x="145" y="${y-24}" width="490" height="56" fill="none" stroke="${U.C.grid}"/>`+U.text(170,y,a[0])+U.text(610,y,a[1],'end');if(i<3)z+=U.arrow(390,y+37,390,y+56,U.C.a);});return{svg:U.svg(z,'Information, channel-coded bit, symbol and occupied-bandwidth rate chain'),stats:[['Coded bit rate',U.fmt(coded,3)+' Mbit/s'],['Symbol rate',U.fmt(sym,3)+' Mbaud'],['Occupied RF bandwidth',U.fmt(B,3)+' MHz']],equation:'R<sub>coded</sub>=R<sub>info</sub>/R<sub>c</sub>; &nbsp; R<sub>s</sub>=R<sub>coded</sub>/log₂M; &nbsp; B<sub>RF</sub>≈(1+α)R<sub>s</sub>',note:'The information input is already source-compressed; framing, pilots and other overhead are excluded. The last formula is the total passband raised-cosine width around the carrier. The one-sided low-pass baseband bandwidth is half that value, so state the bandwidth convention before calculating.',question:'If M increases while information rate and code rate stay fixed, what changes in baud and occupied bandwidth?'};},checks:()=>[{name:'6Mbps rate3/4 16QAM alpha0.25 needs2.5MHz',pass:(6/.75/4)*1.25===2.5},{name:'Uncoded QPSK has two information bits per symbol',pass:Math.log2(4)*1===2}]});

const modes=[{name:'QPSK1/2',m:4,r:.5,th:2},{name:'QPSK3/4',m:4,r:.75,th:5},{name:'16QAM1/2',m:16,r:.5,th:8},{name:'16QAM3/4',m:16,r:.75,th:12},{name:'64QAM3/4',m:64,r:.75,th:18}];
const modeFor=snr=>modes.filter(m=>snr>=m.th).at(-1);
modules.push({id:'adaptive-modcod',group:'Digital',title:'Adaptive MODCOD',heading:'Use a robust mode in a fade and a faster mode when margin returns',intro:'Follow a fading channel through an explicitly supplied teaching table of modulation and coding thresholds.',sources:src('VID06: adaptive digital modulation and coding'),controls:[ctl('clear','Clear-sky C/N',8,30,1,23,'dB'),ctl('fade','Maximum fade depth',0,24,1,16,'dB'),ctl('time','Time through fade',0,100,1,50,'%')],animate:{id:'time',min:0,max:100,step:1},render(v,U){const snr=t=>v.clear-v.fade*(1-Math.cos(t*tau))/2,current=snr(v.time/100),m=modeFor(current),rate=m?Math.log2(m.m)*m.r:0,pts=U.range(160,q=>[q*100,snr(q)]),rates=[],cuts=[0,1];if(v.fade>0)for(const mode of modes){const z=1-2*(v.clear-mode.th)/v.fade;if(z>-1&&z<1){const t=Math.acos(z)/tau;cuts.push(t,1-t);}}cuts.sort((a,b)=>a-b);for(let j=0;j<cuts.length-1;j++){const m=modeFor(snr((cuts[j]+cuts[j+1])/2)),r=m?Math.log2(m.m)*m.r:0;rates.push([cuts[j]*100,r],[cuts[j+1]*100,r]);}return{svg:U.plot([{name:'Received C/N',color:U.C.a,points:pts},{name:'Selected time',color:U.C.b,dash:'4 4',points:[[v.time,-16],[v.time,32]]}],{xmin:0,xmax:100,ymin:-16,ymax:32,xlabel:'Progress through fade (%)',ylabel:'C/N (dB)',title:'A channel-quality trace, not an outage forecast',height:300})+U.plot([{name:'Selected information per symbol',color:U.C.c,points:rates},{name:'Selected time',color:U.C.b,dash:'4 4',points:[[v.time,0],[v.time,5]]}],{xmin:0,xmax:100,ymin:0,ymax:5,xlabel:'Progress through fade (%)',ylabel:'Information bits/symbol',title:'At a fixed1Mbaud, this is numerically Mbit/s',height:300}),stats:[['Current C/N',U.fmt(current,1)+' dB'],['Selected mode',m?m.name:'No supplied mode meets threshold'],['Information rate at1Mbaud',U.fmt(rate,2)+' Mbit/s']],equation:'R<sub>info</sub> = R<sub>s</sub> log₂M R<sub>c</sub>; choose a mode whose required quality is met',note:'Supplied toy C/N thresholds in dB: QPSK1/2:2, QPSK3/4:5,16QAM1/2:8,16QAM3/4:12,64QAM3/4:18. These are illustrative, not DVB or hardware performance specifications. Feedback delay, hysteresis, pilots and error-rate targets are omitted.',question:'Why should a real adaptive transmitter use an error-rate target and switching margin instead of always selecting the largest M?'};},checks:()=>[{name:'Quality below all table thresholds selects no mode',pass:modeFor(1)===undefined},{name:'At12dB the supplied table selects16QAM3/4',pass:modeFor(12).name==='16QAM3/4'}]});

function apsk16(){const ratio=2.8,inner=1/Math.sqrt((4+12*ratio**2)/16),out=[];for(let j=0;j<4;j++){const a=Math.PI/4+j*tau/4;out.push([inner*Math.cos(a),inner*Math.sin(a)]);}for(let j=0;j<12;j++){const a=Math.PI/12+j*tau/12;out.push([inner*ratio*Math.cos(a),inner*ratio*Math.sin(a)]);}return out;}
function amplifier(kind,ibo){const alphabet=kind===0?constellation(4):kind===1?constellation(16):apsk16(),gain=10**(-ibo/20),input=alphabet.map(p=>p.map(x=>x*gain)),output=input.map(p=>{const r=Math.hypot(...p);return p.map(x=>x/Math.max(1,r));}),pin=input.reduce((s,p)=>s+p[0]**2+p[1]**2,0)/input.length,pout=output.reduce((s,p)=>s+p[0]**2+p[1]**2,0)/output.length,error=input.reduce((s,p,i)=>s+(p[0]-output[i][0])**2+(p[1]-output[i][1])**2,0)/input.length;return{input,output,pin,pout,obo:-10*Math.log10(pout),rms:100*Math.sqrt(error/pin),clipped:input.filter(p=>Math.hypot(...p)>1+1e-12).length};}
modules.push({id:'amplifier-backoff',group:'Digital',title:'Amplifier & backoff',heading:'Constellation geometry changes what a nonlinear amplifier distorts',intro:'Apply a toy radial amplitude limiter to equally normalized QPSK, square 16-QAM and a two-ring 16-APSK alphabet.',sources:src('VID06: APSK rings, nonlinear amplification and power backoff'),controls:[pick('kind','Constellation',1,[[0,'QPSK'],[1,'16-QAM'],[2,'Toy 16-APSK: ring ratio 2.8']]),ctl('ibo','Input power backoff',0,10,.5,0,'dB')],render(v,U){const a=amplifier(v.kind,v.ibo),cx=310,cy=225,scale=125;let z=U.line(120,cy,500,cy,U.C.grid)+U.line(cx,40,cx,410,U.C.grid)+U.circle(cx,cy,scale,'none',U.C.muted)+U.text(512,cy+5,'I')+U.text(cx+10,42,'Q');a.input.forEach((p,i)=>{const q=a.output[i],clipped=Math.hypot(...p)>1+1e-12;z+=U.line(cx+scale*p[0],cy-scale*p[1],cx+scale*q[0],cy-scale*q[1],U.C.d,2)+U.circle(cx+scale*p[0],cy-scale*p[1],5,'none',U.C.a)+U.circle(cx+scale*q[0],cy-scale*q[1],2.5,clipped?U.C.d:U.C.b,clipped?U.C.d:U.C.b);});z+=U.text(535,85,'Unit circle: saturation amplitude')+U.text(535,130,'Hollow rings: linear input points')+U.text(535,175,'Small dots: limited output points')+U.text(535,220,a.clipped+' of '+a.input.length+' symbol points clipped')+U.text(535,285,'Equal I/Q spatial scales')+U.text(535,330,'Symbol instants only; no pulse filter');const series=[0,1,2].map((kind,i)=>({name:['QPSK','16-QAM','Toy 16-APSK'][i],color:[U.C.a,U.C.b,U.C.c][i],points:U.range(100,q=>[q*10,amplifier(kind,q*10).rms])}));series.push({name:'Selected input backoff',color:U.C.d,dash:'4 4',points:[[v.ibo,0],[v.ibo,20]]});return{svg:U.svg(z,'Toy hard amplitude limiting of normalized constellation points')+U.plot(series,{xmin:0,xmax:10,ymin:0,ymax:20,xlabel:'Input power backoff (dB)',ylabel:'RMS point error (%)',title:'Error relative to an ideal linear output at the same input level',height:320}),stats:[['Output power / saturation power',U.fmt(a.pout,3)],['Output power backoff',U.fmt(a.obo,2)+' dB'],['RMS point error',U.fmt(a.rms,2)+'%']],equation:'z<sub>in</sub>=10<sup>−IBO/20</sup>z; &nbsp; z<sub>out</sub>=z<sub>in</sub>/max(1,|z<sub>in</sub>|); &nbsp; OBO=−10log₁₀⟨|z<sub>out</sub>|²⟩',note:'This memoryless hard AM limiter preserves phase and clips only amplitudes above 1; saturation power is 1. Each alphabet starts with average symbol energy 1, so IBO is 10log₁₀(Psat/Pin). The 16-APSK ring ratio 2.8 is illustrative and is not a DVB requirement. Lower peak radius can reduce symbol-point clipping, but clipped-point count alone does not measure error severity. Real pulse-shaped waveforms have between-symbol peaks, AM/PM distortion and amplifier memory; this plot does not predict BER, DC efficiency or a required hardware backoff. QPSK having zero point error at 0 dB does not imply a filtered QPSK waveform has no peaks.',question:'Why can backing off reduce distortion while also reducing output power, and why does a constellation-only picture miss between-symbol peaks?'};},checks:()=>{const q=amplifier(0,0),a=amplifier(1,0),b=amplifier(1,3),p=apsk16();return[{name:'Toy16APSK has unit average symbol energy',pass:Math.abs(p.reduce((s,p)=>s+p[0]**2+p[1]**2,0)/16-1)<1e-12},{name:'Hard limiter bounds every output amplitude by1',pass:a.output.every(p=>Math.hypot(...p)<=1+1e-12)},{name:'Unit-radius QPSK at0dB has zero symbol-point distortion',pass:q.rms<1e-10},{name:'16QAM at3dB input backoff has no clipped symbol points',pass:b.clipped===0&&b.rms<1e-10},{name:'Passive radial limiter never increases mean signal power',pass:a.pout<=a.pin&&b.pout<=b.pin}]}});
modules.find(m=>m.id==='planar-array').spatialPower=(u,w,v)=>af(v.nx,Math.PI*(u-v.u0))*af(v.ny,Math.PI*(w-v.v0));
modules.find(m=>m.id==='array-footprint').spatialPower=(x,y,v)=>{const r=Math.hypot(v.range,x,y);return af(v.nx,Math.PI*x/r)*af(v.ny,Math.PI*y/r);};
})();

/* November topics. All examples are generic and independent of submitted designs. */
(() => {
  const tau=2*Math.PI, sinc=x=>Math.abs(x)<1e-10?1:Math.sin(Math.PI*x)/(Math.PI*x);
  const close=(a,b,tol=1e-8)=>Math.abs(a-b)<tol;
  const sources=['Course: November 10 and 12 notes and lecture transcripts'];
  const controls=(items)=>items.map(([id,label,min,max,step,value,unit])=>({id,label,min,max,step,value,unit}));
  const arrayPattern=(theta,phi,n,d,beta)=>{
    let re=0,im=0;
    for(let i=0;i<n;i++){const phase=i*(tau*d*Math.sin(theta)*Math.cos(phi)+beta);re+=Math.cos(phase);im+=Math.sin(phase);}
    return 2*(re*re+im*im); // Ideal element power: 2 forward, 0 rear.
  };
  const patternIntegral=(n,d,beta)=>{
    let total=0;
    const nt=48,np=96,dt=Math.PI/2/nt,dp=tau/np;
    for(let j=0;j<nt;j++)for(let l=0;l<np;l++){
      const theta=(j+.5)*dt;
      total+=arrayPattern(theta,(l+.5)*dp,n,d,beta)*Math.sin(theta)*dt*dp;
    }
    return total;
  };
  modules.push({id:'array-normalization',group:'Antennas',title:'Pattern to absolute gain',heading:'A relative pattern becomes directivity only after angular integration',intro:'Follow phasor addition through intensity, radiated power, directivity and gain.',sources,
    controls:controls([['n','Equal-amplitude elements N',2,12,1,4,''],['spacing','Spacing d/λ',.25,1,.05,.5,''],['phase','Progressive feed phase β',-180,180,5,0,'°'],['eta','Radiation efficiency η',.1,1,.05,.8,''],['watts','Accepted power',1,100,1,10,'W']]),
    render(v,U){
      const beta=U.rad(v.phase),I=patternIntegral(v.n,v.spacing,beta),sample=U.range(360,t=>{const deg=-90+180*t,p=arrayPattern(U.rad(deg),0,v.n,v.spacing,beta),D=4*Math.PI*p/I;return{deg,p,D};}),peak=Math.max(...sample.map(p=>p.D));
      const cut=sample.map(p=>[p.deg,10*Math.log10(Math.max(1e-6,p.D))]);
      let diagram=U.text(65,35,'Feed voltage → complex sum → relative power → total-power normalization');
      for(let i=0;i<v.n;i++)diagram+=U.circle(80+i*48,88,6,U.C.a,U.C.a)+U.arrow(80+i*48,90,80+i*48+25*Math.cos(i*beta),90-25*Math.sin(i*beta),U.C.b);
      diagram+=U.text(65,140,'p(θ,φ) = |AF|² Gₑₗ;  I = ∫ p dΩ over the radiating hemisphere')+U.text(65,176,'U = η Paccepted p / I   [W/sr];   D = 4πp/I;   G = ηD');
      return{svg:U.svg(diagram,'Equal-amplitude feed phasors and the normalization chain',800,210)+U.plot([{name:'Absolute directivity cut',points:cut,color:U.C.a}],{xmin:-90,xmax:90,ymin:-40,ymax:Math.ceil(10*Math.log10(peak))+1,xlabel:'Signed angle from normal in φ = 0 plane (°)',ylabel:'D (dBi)',title:'The whole pattern sets the normalization'}),stats:[['Radiated power',U.fmt(v.eta*v.watts,2)+' W'],['Peak in this cut',U.fmt(10*Math.log10(peak),2)+' dBi'],['Gain at normal',U.fmt(10*Math.log10(v.eta*arrayPattern(0,0,v.n,v.spacing,beta)/I*4*Math.PI),2)+' dBi']],equation:'AF = Σ aₙ exp[j(k rₙ·r̂ + ψₙ)]; &nbsp; dΩ = sinθ dθ dφ; &nbsp; D = 4πp / ∫p dΩ; &nbsp; G = ηD',note:'Equal active amplitudes; ideal uncoupled elements. Midpoint quadrature covers the entire forward hemisphere, with zero radiation in the rear. The displayed peak is a cut peak, not a 3-D peak search. Changing accepted power scales intensity, not directivity.',question:'If every field amplitude doubles, why does directivity stay the same?'};
    },checks:()=>[{name:'Isolated halfspace element has D=2',pass:close(4*Math.PI*2/patternIntegral(1,.5,0),2,.001)},{name:'Two λ/2 broadside elements give D≈4',pass:close(4*Math.PI*8/patternIntegral(2,.5,0),4,.002)}]});

  modules.push({id:'solid-angle',group:'Antennas',title:'Solid angle and power',heading:'Equal angular rectangles cover different areas on a sphere',intro:'A latitude-like polar strip shrinks toward the pole; sinθ accounts for its area.',sources,
    controls:controls([['theta','Patch center θ',10,170,5,60,'°'],['width','Polar width Δθ',2,20,2,10,'°'],['azimuth','Azimuth width Δφ',5,90,5,30,'°'],['intensity','Uniform intensity U',1,10,.5,2,'W/sr']]),
    render(v,U){const t=U.rad(v.theta),h=U.rad(v.width)/2,dp=U.rad(v.azimuth),omega=dp*(Math.cos(t-h)-Math.cos(t+h));let s=U.circle(250,210,150,'none',U.C.muted)+U.line(250,40,250,390,U.C.muted,1,'4 5');
      for(let deg=20;deg<180;deg+=20){const th=U.rad(deg),y=210-150*Math.cos(th),a=150*Math.sin(th);s+=`<ellipse cx="250" cy="${y}" rx="${a}" ry="${a*.15}" fill="none" stroke="${U.C.grid}"/>`;}
      const y=210-150*Math.cos(t),rx=150*Math.sin(t);s+=`<ellipse cx="250" cy="${y}" rx="${rx}" ry="${rx*.15}" fill="none" stroke="${U.C.a}" stroke-width="5"/>`+U.arrow(250,210,250+rx, y,U.C.b)+U.text(450,90,'θ measured from the pole')+U.text(450,140,'Ring radius: R sinθ')+U.text(450,190,'Area: R² sinθ dθ dφ')+U.text(450,240,'Solid angle: dA / R²')+U.text(450,300,'Whole sphere: 4π sr')+U.text(450,340,'Hemisphere: 2π sr');
      return{svg:U.svg(s,'Sphere with polar angle, shrinking rings and solid-angle area'),stats:[['Patch solid angle',U.fmt(omega,4)+' sr'],['Patch power',U.fmt(v.intensity*omega,4)+' W'],['Uniform sphere power',U.fmt(4*Math.PI*v.intensity,2)+' W']],equation:'ΔΩ = Δφ[cos(θ₁) − cos(θ₂)]; &nbsp; Ppatch = U ΔΩ; &nbsp; ∫sphere dΩ = 4π',note:'The highlighted ellipse is the latitude ring containing the patch center. The finite-patch calculation uses exact polar bounds. Uniform U is an isotropic teaching case.'};},checks:()=>[{name:'Sphere solid angle is 4π',pass:close(tau*(Math.cos(0)-Math.cos(Math.PI)),4*Math.PI)},{name:'Hemisphere solid angle is 2π',pass:close(tau*(1-Math.cos(Math.PI/2)),tau)}]});

  modules.push({id:'free-space-flux',group:'RF',title:'Spreading and capture',heading:'A receiver captures a small part of an expanding power flow',intro:'Geometric spreading connects intensity, effective aperture and Friis transmission.',sources,
    controls:controls([['range','Range R',100,40000,100,10000,'km'],['freq','Frequency',1,40,1,10,'GHz'],['eirp','EIRP',10,80,1,50,'dBW'],['gain','Receiver gain',0,40,1,20,'dBi']]),
    render(v,U){const R=v.range*1000,lambda=299792458/(v.freq*1e9),eirp=10**(v.eirp/10),flux=eirp/(4*Math.PI*R*R),area=10**(v.gain/10)*lambda*lambda/(4*Math.PI),pr=flux*area;let s='';
      for(let r of [55,100,150])s+=U.circle(200,220,r,'none',U.C.grid);s+=U.circle(200,220,9,U.C.b,U.C.b)+U.arrow(220,220,610,220,U.C.a)+U.text(430,198,'R','middle')+`<rect x="610" y="180" width="10" height="80" fill="${U.C.c}"/>`+U.text(70,40,'Same radiated power crosses each enclosing sphere')+U.text(395,300,'Flux S = EIRP / (4πR²)')+U.text(395,335,'Receiver: Pr = S Ae')+U.text(395,370,'Ae = Gr λ² / (4π)');
      return{svg:U.svg(s,'Expanding spherical power flow and a receiver effective aperture'),stats:[['Power flux density',flux.toExponential(3)+' W/m²'],['Effective aperture',U.fmt(area,4)+' m²'],['Received power',U.fmt(10*Math.log10(pr)+30,2)+' dBm']],equation:'Pr = Pt Gt Gr (λ / 4πR)²; &nbsp; LFS = 20 log₁₀(4πR/λ)',note:'Far-field, free-space, matched polarization and receiver port; no atmospheric, pointing or mismatch losses. Free-space loss describes spreading plus the receiver gain/aperture convention, with no absorption required. Gain is held fixed as frequency changes.'};},checks:()=>[{name:'Doubling range reduces flux by four',pass:close((1/2**2)/(1/1**2),.25)},{name:'Effective aperture has λ² scaling at fixed gain',pass:close((.5**2)/(1**2),.25)}]});

  modules.push({id:'rectangular-pulse-spectrum',group:'Digital',title:'Pulse width and spectrum',heading:'A short rectangular pulse spreads across a wide range of frequencies',intro:'Time concentration and spectral spread constrain a transmitted waveform.',sources,
    controls:controls([['width','Pulse duration T',.2,2,.1,1,'ms'],['amplitude','Pulse amplitude A',.5,2,.1,1,'V']]),
    render(v,U){const T=v.width;const time=[[-3,0],[-T/2,0],[-T/2,v.amplitude],[T/2,v.amplitude],[T/2,0],[3,0]],spectrum=U.range(500,t=>{let f=-10+20*t;return[f,v.amplitude*T*sinc(f*T)]});return{svg:U.plot([{name:'Rectangular voltage pulse',points:time}],{xmin:-3,xmax:3,ymin:-.2,ymax:2.2,xlabel:'Time (ms)',ylabel:'Voltage (V)',title:'A rect(t/T)'})+U.plot([{name:'Fourier amplitude',points:spectrum,color:U.C.b}],{xmin:-10,xmax:10,ymin:-1,ymax:4,xlabel:'Frequency (kHz)',ylabel:'Spectrum (V·ms)',title:'AT sinc(fT): an ideal pulse has infinite spectral support'}),stats:[['First spectral zero',U.fmt(1/T,2)+' kHz'],['DC amplitude',U.fmt(v.amplitude*T,2)+' V·ms'],['Voltage-squared integral',U.fmt(v.amplitude**2*T,2)+' V²·ms']],equation:'X(f) = AT sinc(fT); &nbsp; sinc(x) = sin(πx)/(πx); &nbsp; first zeros f = ±1/T',note:'Continuous-time Fourier transform with frequency in cycles per unit time. V²·ms is proportional to energy for a specified resistive load; it is not joules by itself.'};},checks:()=>[{name:'sinc(0)=1',pass:sinc(0)===1},{name:'Pulse first spectral zero at 1/T',pass:Math.abs(sinc(1))<1e-12}]});

  const pulse=[.2,.5,1,.5,.2];
  const overlap=lag=>pulse.reduce((sum,x,i)=>sum+x*(pulse[i-lag]||0),0);
  modules.push({id:'matched-filter',group:'Digital',title:'Matched filter and timing',heading:'A time-reversed pulse collects a known waveform into a decision sample',intro:'A receiver must identify the pulse and its arrival time while reducing noise effects.',sources,
    controls:controls([['delay','Pulse arrival index',5,18,1,10,'samples'],['trial','Template start index',0,26,1,10,'samples'],['noise','Illustrative noise amplitude',0,1.5,.1,.3,'V']]),
    render(v,U){const r=Array.from({length:32},(_,i)=>(pulse[i-v.delay]||0)+v.noise*(.5*Math.sin(i*2.3)+.3*Math.cos(i*1.37))),corr=Array.from({length:28},(_,k)=>pulse.reduce((sum,x,i)=>sum+x*r[k+i],0)),best=corr.indexOf(Math.max(...corr)),trial=Math.round(v.trial);return{svg:U.plot([{name:'Received samples',points:r.map((x,i)=>[i,x])},{name:'Shifted template',color:U.C.b,points:Array.from({length:32},(_,i)=>[i,pulse[i-trial]||0])}],{xmin:0,xmax:31,ymin:-1.4,ymax:2.4,xlabel:'Sample index n',ylabel:'Voltage (V)',title:'Known pulse in one fixed illustrative noise realization'})+U.plot([{name:'Correlation versus template start',color:U.C.c,points:corr.map((x,i)=>[i,x])},{name:'Trial delay',color:U.C.d,points:[[trial,-1],[trial,3]]}],{xmin:0,xmax:27,ymin:-1,ymax:3,xlabel:'Template start index k',ylabel:'Correlation (V²)',title:'Matched filtering is correlation with the expected pulse'}),stats:[['True start',v.delay+' samples'],['Largest correlation',best+' samples'],['Trial correlation',U.fmt(corr[trial],3)+' V²']],equation:'h[n] = s*[N − 1 − n]; &nbsp; c[k] = Σ r[k+i] s*[i]',note:'Real-valued five-sample pulse and fixed deterministic noise for repeatable exploration. A matched filter maximizes sample SNR for known pulse shape in white noise; it does not guarantee correct timing in every noisy realization.'};},checks:()=>[{name:'Aligned correlation equals pulse energy',pass:close(overlap(0),1.58)},{name:'Aligned autocorrelation exceeds shifted overlap',pass:overlap(0)>overlap(1)}]});

  const code31=()=>{const a=[1,1,1,1,1];for(let i=0;i<31;i++)a.push(a[i]^a[i+2]);return a.slice(0,31);};
  modules.push({id:'lfsr-code',group:'Navigation',title:'Shift register and PN code',heading:'A short binary recurrence creates a long recognizable chip sequence',intro:'A navigation receiver can correlate a known sequence instead of relying on an isolated pulse.',sources,
    controls:controls([['clock','Register clock',0,30,1,0,'chips'],['shift','Correlation shift',0,30,1,0,'chips']]),animate:{id:'clock',min:0,max:30,step:1},
    render(v,U){const bits=code31(),bipolar=bits.map(x=>2*x-1),corr=k=>bipolar.reduce((s,x,i)=>s+x*bipolar[(i+k)%31],0),k=Math.round(v.clock);let s=U.text(65,36,'c[n+5] = c[n+2] XOR c[n]   ·   nonzero initial state 11111');
      for(let i=0;i<5;i++){let x=70+i*115;s+=`<rect x="${x}" y="90" width="70" height="65" rx="6" fill="${U.C.grid}"/>`+U.text(x+35,132,bits[(k+i)%31],'middle');if(i<4)s+=U.arrow(x+108,122,x+75,122,U.C.a);}
      s+=U.text(65,205,'Five register bits; 31 chip phases before repeating');return{svg:U.svg(s,'Five-bit shift register generating a length-31 maximal sequence',800,240)+U.plot([{name:'Periodic bipolar autocorrelation',points:bits.map((_,i)=>[i,corr(i)])},{name:'Selected shift',color:U.C.b,points:[[v.shift,-3],[v.shift,32]]}],{xmin:0,xmax:30,ymin:-3,ymax:32,xlabel:'Cyclic chip shift',ylabel:'Correlation sum',title:'Aligned code has a narrow correlation peak'}),stats:[['Aligned sum',corr(0)],['Selected sum',corr(v.shift)],['Sequence period','31 chips']],equation:'c[n+5] = c[n+2] ⊕ c[n]; &nbsp; b[n] = 2c[n] − 1; &nbsp; R[k] = Σ b[n]b[n+k]',note:'A teaching m-sequence, not the complete GPS C/A Gold-code generator. XOR operates on binary bits; correlation uses ±1 values. Actual GPS C/A combines two ten-stage registers.'};},checks:()=>{const b=code31().map(x=>2*x-1);return[{name:'m-sequence has 31 distinct cyclic phases',pass:new Set(b.map((_,i)=>b.slice(i).concat(b.slice(0,i)).join(','))).size===31},{name:'Every nonzero cyclic autocorrelation is −1',pass:b.slice(1).every((_,j)=>b.reduce((s,x,i)=>s+x*b[(i+j+1)%31],0)===-1)}];}});

  modules.push({id:'processing-gain',group:'Navigation',title:'Spreading and processing gain',heading:'A known fast code lets the receiver collect a slow data bit coherently',intro:'Spread-spectrum reception trades bandwidth for recognizable correlation structure.',sources,
    controls:controls([['chips','Chips per data bit',8,256,8,64,''],['snr','Input SNR over chip-rate bandwidth',-30,0,1,-20,'dB']]),
    render(v,U){const gp=10*Math.log10(v.chips),out=v.snr+gp,s=U.text(60,40,'One data-bit interval Tb contains N known ±1 chips')+U.path(U.range(128,t=>[70+660*t,150+35*(Math.floor(t*v.chips)%2?1:-1)]),U.C.a)+U.text(70,225,'Multiply by the local code → align the desired chips')+U.path([[70,310],[730,310]],U.C.b,4)+U.text(70,370,'Integrate over Tb: signal adds coherently; independent noise adds in variance');return{svg:U.svg(s,'Fast code chips become a coherent data-bit estimate after despreading'),stats:[['Ideal processing gain',U.fmt(gp,2)+' dB'],['Approximate output SNR',U.fmt(out,2)+' dB'],['Rate ratio Rc/Rb',v.chips]],equation:'Gp = Rc/Rb = N; &nbsp; Gp,dB = 10 log₁₀ N; &nbsp; SNRout ≈ SNRin + Gp,dB',note:'Ideal synchronization and independent white-noise chips; input noise bandwidth is approximated by Rc. Receiver filtering and bandwidth conventions can add order-one factors. Spreading redistributes spectrum and creates a correlation handle; energy is supplied by integration time.'};},checks:()=>[{name:'100 chips yield 20 dB processing gain',pass:close(10*Math.log10(100),20)}]});

  modules.push({id:'gnss-error-budget',group:'Navigation',title:'Range-error budget',heading:'Independent range uncertainties add through their variances',intro:'Separate measurement errors before using satellite geometry to estimate position uncertainty.',sources,
    controls:controls([['clock','Residual satellite clock σ',0,10,.5,1,'m'],['iono','Residual ionosphere σ',0,20,.5,4,'m'],['tropo','Residual troposphere σ',0,5,.1,.5,'m'],['receiver','Receiver and multipath σ',0,10,.5,2,'m'],['dop','Illustrative position DOP',1,8,.5,2,'']]),
    render(v,U){const terms=[['Clock',v.clock],['Ionosphere',v.iono],['Troposphere',v.tropo],['Receiver / multipath',v.receiver]],variance=terms.reduce((s,[,x])=>s+x*x,0),sigma=Math.sqrt(variance);let s=U.text(60,35,'Range variance contributions (m²)');terms.forEach(([name,x],i)=>{const y=90+i*72;s+=U.text(60,y,name)+`<rect x="255" y="${y-22}" width="${Math.min(430,x*x/400*430)}" height="27" fill="${[U.C.a,U.C.b,U.C.c,U.C.d][i]}"/>`+U.text(705,y,U.fmt(x*x,2),'end');});s+=U.text(60,405,'Range uncertainty × geometry factor → approximate position uncertainty');return{svg:U.svg(s,'Independent range error variances and the geometry factor'),stats:[['Range standard deviation',U.fmt(sigma,3)+' m'],['Position scale σ × DOP',U.fmt(sigma*v.dop,3)+' m'],['Total range variance',U.fmt(variance,3)+' m²']],equation:'σrange² = Σ σᵢ² (independent zero-mean errors); &nbsp; σposition ≈ DOP · σrange',note:'RSS assumes uncorrelated, zero-mean residual errors. Persistent biases and correlated atmospheric/multipath errors require a covariance or bias model. DOP must match the reported coordinate/error metric; this is a scalar teaching approximation.'};},checks:()=>[{name:'3 m and 4 m independent errors give 5 m RSS',pass:close(Math.hypot(3,4),5)}]});

  modules.push({id:'navigation-frames',group:'Navigation',title:'Earth-fixed coordinates',heading:'Earth-fixed coordinates turn latitude and longitude into Cartesian positions',intro:'Satellite and receiver coordinates must share a frame and observation epoch before ranges are calculated.',sources,
    controls:controls([['latitude','Geocentric latitude',-80,80,5,35,'°'],['longitude','Earth-fixed longitude',-180,180,5,-85,'°'],['rotation','Earth rotation angle',0,360,5,0,'°'],['altitude','Height above spherical Earth',0,20200,100,0,'km']]),
    render(v,U){const lat=U.rad(v.latitude),lon=U.rad(v.longitude),rot=U.rad(v.rotation),r=6378+v.altitude,x=r*Math.cos(lat)*Math.cos(lon),y=r*Math.cos(lat)*Math.sin(lon),z=r*Math.sin(lat);const X=x*Math.cos(rot)-y*Math.sin(rot),Y=x*Math.sin(rot)+y*Math.cos(rot),scale=145/(6378+20200);let s=U.circle(235,230,6378*scale,'none',U.C.c)+U.line(60,230,420,230)+U.line(235,405,235,55)+U.arrow(235,230,235+X*scale,230-Y*scale,U.C.a)+U.text(60,36,'Equatorial projection: inertial x-y axes')+U.text(440,100,'ECEF x: '+U.fmt(x,1)+' km')+U.text(440,145,'ECEF y: '+U.fmt(y,1)+' km')+U.text(440,190,'ECEF z: '+U.fmt(z,1)+' km')+U.text(440,260,'Rotate ECEF x,y by Earth angle')+U.text(440,310,'Inertial x: '+U.fmt(X,1)+' km')+U.text(440,350,'Inertial y: '+U.fmt(Y,1)+' km');return{svg:U.svg(s,'Spherical Earth-fixed coordinates and rotating equatorial projection'),stats:[['Radius',U.fmt(r,1)+' km'],['Latitude',v.latitude+'°'],['Inertial longitude',U.fmt(v.longitude+v.rotation,1)+'°']],equation:'rECEF = (R+h)[cosL cosλ, cosL sinλ, sinL]; &nbsp; rECI = Rz(θEarth) rECEF',note:'Spherical Earth and geocentric latitude. Real GNSS uses an ellipsoid, geodetic latitude, reference epochs and Earth-rotation corrections during signal flight. Only x-y is drawn; z is listed numerically.'};},checks:()=>[{name:'Rotation preserves equatorial distance',pass:close(Math.hypot(Math.cos(.7),Math.sin(.7)),1)}]});

  modules.push({id:'near-far',group:'Navigation',title:'CDMA near–far effect',heading:'A strong unwanted code can overwhelm a weaker desired correlation',intro:'Code separation depends on both cross-correlation and received power.',sources,
    controls:controls([['ratio','Interferer / desired power',0,60,2,30,'dB'],['rho','Normalized cross-correlation magnitude',.01,.5,.01,.1,'']]),
    render(v,U){const amplitude=10**(v.ratio/20),leak=amplitude*v.rho,sir=1/(leak*leak),s=U.text(60,42,'Desired code after matching: amplitude = 1')+U.line(60,130,710,130,U.C.grid)+`<rect x="80" y="100" width="80" height="30" fill="${U.C.a}"/>`+U.text(60,205,'Interferer residual amplitude = √(Pi/Ps) × |ρ|')+`<rect x="80" y="245" width="${Math.min(620,80*leak)}" height="30" fill="${U.C.b}"/>`+U.text(60,340,'Residual: '+U.fmt(leak,3)+' × desired amplitude')+U.text(60,385,'A small code cross-correlation can multiply a large input imbalance.');return{svg:U.svg(s,'Desired correlation versus leaked interfering code amplitude'),stats:[['Input imbalance',v.ratio+' dB'],['Output SIR',U.fmt(10*Math.log10(sir),2)+' dB'],['Interference amplitude',U.fmt(leak,3)]],equation:'SIRout = Ps / (Pi |ρ|²); &nbsp; ΔdB,out = −ΔdB,in − 20 log₁₀|ρ|',note:'Single-interferer, real aligned leakage magnitude; timing, data transitions, multiple access interference and noise are omitted. Bar length is capped; the numeric residual remains exact. Power control is especially important in terrestrial CDMA; navigation signals also face interference and receiver dynamic-range limits.'};},checks:()=>[{name:'20 dB excess power with ρ=.1 gives 0 dB SIR',pass:close(10*Math.log10(1/(100*.1**2)),0)}]});

  modules.push({id:'ofdm-multipath',group:'Digital',title:'Multipath and OFDM',heading:'A delayed echo makes channel gain vary across frequency',intro:'Narrow subcarriers can make equalization simpler when the guard interval covers the channel memory.',sources,
    controls:controls([['echo','Echo voltage ratio',0,.9,.1,.5,''],['delay','Echo delay τ',.2,4,.2,1,'µs'],['spacing','Subcarrier spacing',10,500,10,100,'kHz'],['prefix','Cyclic prefix',0,5,.2,1.2,'µs']]),
    render(v,U){const H=f=>Math.hypot(1+v.echo*Math.cos(tau*f*v.delay),-v.echo*Math.sin(tau*f*v.delay)),points=U.range(600,t=>{let f=-2+4*t;return[f,20*Math.log10(Math.max(1e-9,H(f)))];}),spacing=v.spacing/1000,Tu=1000/v.spacing,cp=v.prefix,adequate=cp>=v.delay;return{svg:U.plot([{name:'Direct path + delayed echo',points}],{xmin:-2,xmax:2,ymin:-22,ymax:7,xlabel:'Baseband frequency (MHz)',ylabel:'Channel magnitude (dB)',title:'H(f) = 1 + a exp(−j2πfτ)'})+U.svg(U.text(65,45,'Useful symbol Tu = '+U.fmt(Tu,2)+' µs; prefix = '+U.fmt(cp,2)+' µs')+`<rect x="65" y="85" width="${Math.max(1,650*cp/(cp+Tu))}" height="50" fill="${U.C.b}"/><rect x="${65+650*cp/(cp+Tu)}" y="85" width="${650*Tu/(cp+Tu)}" height="50" fill="${U.C.a}"/>`+U.text(65,180,adequate?'Prefix covers this two-path delay.':'Echo exceeds the prefix: intersymbol interference can remain.'), 'OFDM symbol useful time and cyclic-prefix overhead',800,220),stats:[['Subcarrier spacing',v.spacing+' kHz'],['Useful symbol time',U.fmt(Tu,2)+' µs'],['Prefix overhead',U.fmt(100*cp/(Tu+cp),1)+'%']],equation:'H(f) = 1 + a e<sup>−j2πfτ</sup>; &nbsp; Δf = 1/Tu; &nbsp; Tcp ≥ τmax (ideal timing)',note:'Two static paths with an in-phase direct path, ideal synchronization and a rectangular OFDM useful interval. A sufficient prefix enables circular convolution and per-subcarrier equalization; deep fades still amplify noise. Smaller spacing also increases sensitivity to frequency offset and time variation.'};},checks:()=>[{name:'Equal paths have a null at fτ=.5',pass:Math.hypot(1+Math.cos(Math.PI),Math.sin(Math.PI))<1e-10},{name:'100 kHz spacing corresponds to 10 µs',pass:1000/100===10}]});

  modules.push({id:'beamforming-frontends',group:'Antennas',title:'Analog and digital combining',heading:'The location of beamforming changes which hardware sees interference',intro:'Digital beamforming can suppress an interferer only after the front end has measured it without clipping.',sources,
    controls:controls([['wanted','Wanted input',-90,-30,5,-70,'dBm'],['jammer','Interferer input',-70,10,5,-10,'dBm'],['null','Ideal spatial suppression',0,60,5,40,'dB'],['limit','Front-end linear-power limit',-40,10,5,-5,'dBm']]),
    render(v,U){const dbsum=(a,b)=>10*Math.log10(10**(a/10)+10**(b/10)),raw=dbsum(v.wanted,v.jammer),after=dbsum(v.wanted,v.jammer-v.null),clip=raw>v.limit;let s=U.text(55,35,'Same spatial suppression, different place in the receiver chain');
      const box=(x,y,w,label,color)=>`<rect x="${x}" y="${y}" width="${w}" height="55" rx="6" fill="none" stroke="${color}"/>`+U.text(x+w/2,y+33,label,'middle');
      s+=U.text(55,90,'Analog combining')+box(55,115,180,'Spatial combiner',U.C.a)+U.arrow(240,143,290,143)+box(300,115,180,'Front end',U.C.b)+U.arrow(485,143,535,143)+box(545,115,180,'ADC',U.C.c)+U.text(55,225,'Digital combining')+box(55,250,180,'Front ends',U.C.b)+U.arrow(240,278,290,278)+box(300,250,180,'ADCs',U.C.c)+U.arrow(485,278,535,278)+box(545,250,180,'Digital weights',U.C.a)+U.text(55,360,'Before digital weights: '+U.fmt(raw,1)+' dBm; linear limit '+v.limit+' dBm')+U.text(55,400,clip?'Front-end limit exceeded: downstream null cannot recover clipped samples.':'Front-end power stays within this simplified linear limit.');return{svg:U.svg(s,'Analog suppression before the front end versus digital suppression after ADCs'),stats:[['Raw total input',U.fmt(raw,2)+' dBm'],['After ideal null',U.fmt(after,2)+' dBm'],['Front-end margin',U.fmt(v.limit-raw,2)+' dB']],equation:'y = wᴴx; &nbsp; Ptotal,dBm = 10 log₁₀(Σ 10<sup>Pi,dBm/10</sup>)',note:'Illustrative power-headroom model; no real ADC quantization, per-element phase solve, noise figure or automatic gain control is simulated. Analog combining and hybrid architectures have their own losses and flexibility tradeoffs.'};},checks:()=>[{name:'Two 0 dBm inputs sum to 3.0103 dBm',pass:close(10*Math.log10(2),3.01029995664,1e-9)}]});
modules.find(m=>m.id==='array-normalization').spatialPower=(theta,phi,v)=>arrayPattern(theta,phi,v.n,v.spacing,v.phase*Math.PI/180)/(2*v.n*v.n);
})();

/* Generic navigation and modem examples; no assignment solution data. */
(() => {
  const c = 299792458, tau = 2 * Math.PI;
  const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;
  const ctl = (id, label, min, max, step, value, unit = '') => ({id, label, min, max, step, value, unit});
  const pick = (id, label, value, choices) => ({id, label, value, options: choices.map(([value, label]) => ({value, label}))});
  const sources = ['Course: November navigation and digital-modulation topics; generic mathematical examples'];
  const sinc = x => Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);

  const f1 = 1575.42, f2 = 1227.60; // MHz; ratios and combination coefficients are dimensionless.
  const alpha = f1 * f1 / (f1 * f1 - f2 * f2);
  const beta = -f2 * f2 / (f1 * f1 - f2 * f2);
  const ionoRatio = (f1 / f2) ** 2;
  const noiseGain = Math.hypot(alpha, beta);
  modules.push({
    id: 'dual-frequency', group: 'Navigation', title: 'Dual-frequency ranging',
    heading: 'Two frequencies separate the leading ionospheric delay from common range',
    intro: 'Cancel a 1/f² code-delay term while tracking the noise and common biases that remain.', sources,
    controls: [ctl('iono', 'L1 ionospheric code delay', 0, 30, 1, 5, 'm'), ctl('common', 'Common residual bias', 0, 20, 1, 3, 'm'), ctl('sigma', 'Independent noise σ per frequency', .1, 3, .1, .5, 'm')],
    render(v, U) {
      const i1 = v.iono, i2 = v.iono * ionoRatio, residual = alpha * i1 + beta * i2;
      const bars = [{name: 'L1 code', iono: i1}, {name: 'L2 code', iono: i2}, {name: 'Ionosphere-free', iono: 0}];
      const ymax = Math.max(1, i2 + v.common), scale = 175 / ymax, baseline = 320;
      let s = U.text(60, 35, 'L1: 1575.42 MHz; L2: 1227.60 MHz') + U.text(60, 75, 'First-order code delay grows as 1/f²');
      bars.forEach((b, i) => {
        const x = 110 + i * 225, hc = v.common * scale, hi = b.iono * scale;
        s += `<rect x="${x}" y="${baseline - hc}" width="90" height="${hc}" fill="${U.C.b}"/>`;
        s += `<rect x="${x}" y="${baseline - hc - hi}" width="90" height="${hi}" fill="${U.C.a}"/>`;
        s += U.text(x + 45, 350, b.name, 'middle') + U.text(x + 45, 378, U.fmt(b.iono + v.common, 3) + ' m', 'middle');
      });
      s += U.line(70, baseline, 740, baseline, U.C.grid) + U.text(60, 420, 'Teal: first-order ionosphere; orange: common residual bias');
      s += U.text(60, 460, 'α = ' + U.fmt(alpha, 5) + '; β = ' + U.fmt(beta, 5) + '; independent-noise gain = ' + U.fmt(noiseGain, 3));
      return {svg: U.svg(s, 'L1 and L2 ionospheric delay and the retained common bias after combination', 800, 490),
        stats: [['First-order residual', U.fmt(residual, 6) + ' m'], ['Retained common bias', U.fmt((alpha + beta) * v.common, 3) + ' m'], ['Combined noise σ', U.fmt(v.sigma * noiseGain, 3) + ' m']],
        equation: 'P<sub>IF</sub> = αP₁ + βP₂; &nbsp; α = f₁²/(f₁²−f₂²); &nbsp; β = −f₂²/(f₁²−f₂²); &nbsp; σ<sub>IF</sub> = σ√(α²+β²)',
        note: 'Code pseudoranges with a common geometric/clock term and a first-order 1/f² ionospheric delay. Equal independent per-frequency noise is assumed; the plotted bars omit random realizations. Higher-order ionosphere, hardware biases and other residuals remain outside this model.',
        question: 'Why can removing the leading ionospheric term increase the measurement noise standard deviation?'};
    },
    checks: () => [
      {name: 'Ionosphere-free coefficients preserve a common range term', pass: close(alpha + beta, 1)},
      {name: 'L1/L2 first-order ionospheric term cancels', pass: Math.abs(alpha + beta * ionoRatio) < 1e-12},
      {name: 'L1/L2 independent equal-noise gain is approximately 2.978', pass: close(noiseGain, 2.978255244444737, 1e-9)}
    ]
  });

  const code31 = () => {
    const bits = [1, 1, 1, 1, 1];
    for (let i = 0; i < 31; i++) bits.push(bits[i] ^ bits[i + 2]);
    return bits.slice(0, 31).map(x => 2 * x - 1);
  };
  const code = code31();
  const codeCorrelation = shift => code.reduce((sum, x, i) => sum + x * code[(i + ((shift % 31) + 31) % 31) % 31], 0) / 31;
  const acquisitionScore = (delayError, frequencyError, seconds) => codeCorrelation(delayError) ** 2 * sinc(frequencyError * seconds) ** 2;
  const scoreDb = score => 10 * Math.log10(Math.max(1e-12, score));
  modules.push({
    id: 'gnss-acquisition', group: 'Navigation', title: 'Code-delay and Doppler search',
    heading: 'A receiver searches code alignment and carrier frequency together',
    intro: 'Inspect a sampled acquisition surface and the coherent loss from a wrong frequency hypothesis.', sources,
    controls: [ctl('delay', 'True code delay', 0, 30, 1, 9, 'chips'), ctl('doppler', 'True carrier offset', -1000, 1000, 25, 375, 'Hz'), ctl('time', 'Coherent integration T', 1, 20, 1, 5, 'ms'), ctl('trialDelay', 'Trial code delay', 0, 30, 1, 9, 'chips'), ctl('trialDoppler', 'Trial carrier offset', -1000, 1000, 100, 300, 'Hz')],
    render(v, U) {
      const T = v.time / 1000, x0 = 80, y0 = 60, dx = 15, dy = 12;
      let s = U.text(60, 28, 'Fixed 100 Hz frequency grid; color is power relative to exact alignment');
      let best = {score: -1, delay: 0, frequency: 0};
      for (let row = 0; row < 21; row++) {
        const frequency = 1000 - row * 100;
        for (let delay = 0; delay < 31; delay++) {
          const score = acquisitionScore(delay - v.delay, frequency - v.doppler, T);
          if (score > best.score) best = {score, delay, frequency};
          const level = Math.max(0, Math.min(1, (scoreDb(score) + 40) / 40));
          s += `<rect x="${x0 + delay * dx}" y="${y0 + row * dy}" width="${dx}" height="${dy}" fill="${U.C.a}" opacity="${.08 + .92 * level}"/>`;
        }
      }
      const row = (1000 - v.trialDoppler) / 100;
      s += `<rect x="${x0 + v.trialDelay * dx}" y="${y0 + row * dy}" width="${dx}" height="${dy}" fill="none" stroke="${U.C.b}" stroke-width="2"/>`;
      for (const delay of [0, 5, 10, 15, 20, 25, 30]) s += U.text(x0 + (delay + .5) * dx, 340, delay, 'middle');
      for (const frequency of [-1000, 0, 1000]) s += U.text(70, y0 + (1000 - frequency) / 100 * dy + 10, frequency, 'end');
      s += U.text(310, 380, 'Code-delay hypothesis (chips)', 'middle') + U.text(60, 420, 'Rows: frequency hypothesis in Hz; dark color: 0 dB; faint color: −40 dB or below');
      s += U.text(575, 90, 'Best sampled cell') + U.text(575, 125, best.delay + ' chips') + U.text(575, 160, best.frequency + ' Hz');
      s += U.text(575, 215, 'First frequency null') + U.text(575, 250, U.fmt(1 / T, 1) + ' Hz from truth');
      if (best.score < 1e-12) s += U.text(575, 300, 'Grid misses the narrow peak');
      const codePower = codeCorrelation(v.trialDelay - v.delay) ** 2;
      const dopplerPower = sinc((v.trialDoppler - v.doppler) * T) ** 2;
      return {svg: U.svg(s, 'Code delay and carrier-offset acquisition grid with a selected trial cell', 800, 450),
        stats: [['Trial code factor', U.fmt(codePower, 4)], ['Trial Doppler factor', U.fmt(dopplerPower, 4)], ['Trial score, −120 dB floor', U.fmt(scoreDb(codePower * dopplerPower), 2) + ' dB']],
        equation: 'A(Δd,Δf) = |R<sub>code</sub>(Δd)|² |sinc(ΔfT)|²; &nbsp; sinc(x) = sin(πx)/(πx)',
        note: 'A separable teaching acquisition surface using a periodic 31-chip code, ideal code timing and a constant data sign. It omits noise and actual code/Doppler coupling. Longer integration narrows the frequency response, so a fixed grid can miss a between-bin peak. Code delay is modulo the code period.',
        question: 'If integration time doubles, how should the frequency grid change to keep a similar worst-case coherent loss?'};
    },
    checks: () => [
      {name: 'Acquisition code factor has unit aligned and 1/961 off-peak power', pass: close(codeCorrelation(0), 1) && close(codeCorrelation(1) ** 2, 1 / 961)},
      {name: 'Exact code and frequency alignment has unit acquisition score', pass: close(acquisitionScore(0, 0, .005), 1)},
      {name: 'Residual frequency 1/T gives the first coherent null', pass: acquisitionScore(0, 200, .005) < 1e-25},
      {name: 'Half-cycle coherent mismatch has power 4/pi squared', pass: close(acquisitionScore(0, 100, .005), 4 / Math.PI ** 2)}
    ]
  });

  const raised = (t, a) => {
    if (a === 0) return sinc(t);
    if (Math.abs(1 - (2 * a * t) ** 2) < 1e-9) return Math.PI / 4 * sinc(1 / (2 * a));
    return sinc(t) * Math.cos(Math.PI * a * t) / (1 - (2 * a * t) ** 2);
  };
  const alphabet = M => {
    if (M === 2) return [[-1, 0], [1, 0]];
    const q = Math.sqrt(M), scale = Math.sqrt(2 * (M - 1) / 3), result = [];
    for (let y = 0; y < q; y++) for (let x = 0; x < q; x++) result.push([(2 * x - q + 1) / scale, (2 * y - q + 1) / scale]);
    return result;
  };
  modules.push({
    id: 'modem-chain', group: 'Digital', title: 'The modem signal chain',
    heading: 'Rates and waveform choices belong to specific stages of the modem',
    intro: 'Connect information bits, channel coding, constellation symbols and the combined pulse response.', sources,
    controls: [ctl('rate', 'Information bit rate', 1, 12, 1, 6, 'Mbit/s'), pick('codeRate', 'Channel code rate', .75, [[.5, '1/2'], [.75, '3/4'], [1, '1 (uncoded)']]), pick('M', 'Modulation alphabet', 16, [[2, 'BPSK'], [4, 'QPSK'], [16, '16-QAM'], [64, '64-QAM']]), ctl('rolloff', 'Combined raised-cosine rolloff', 0, 1, .05, .25, '')],
    render(v, U) {
      const coded = v.rate / v.codeRate, symbols = coded / Math.log2(v.M), bandwidth = (1 + v.rolloff) * symbols;
      const labels = [['Information bits', v.rate + ' Mbit/s'], ['Channel encoder', U.fmt(coded, 3) + ' Mbit/s'], ['Symbol mapper', U.fmt(symbols, 3) + ' Mbaud'], ['Pulse / channel', U.fmt(bandwidth, 3) + ' MHz RF']];
      let s = U.text(45, 32, 'Information → coded bits → I/Q symbols → occupied passband');
      labels.forEach(([name, rate], i) => {
        const x = 40 + 190 * i;
        s += `<rect x="${x}" y="65" width="150" height="85" rx="5" fill="none" stroke="${U.C.grid}"/>` + U.text(x + 75, 95, name, 'middle') + U.text(x + 75, 126, rate, 'middle');
        if (i < 3) s += U.arrow(x + 155, 106, x + 180, 106, U.C.a);
      });
      s += U.text(60, 215, 'Combined Nyquist pulse h(t)') + U.line(70, 350, 450, 350, U.C.grid) + U.line(260, 255, 260, 425, U.C.grid);
      s += U.path(Array.from({length: 361}, (_, i) => {const t = -3 + i / 60; return [70 + (t + 3) / 6 * 380, 350 - 70 * raised(t, v.rolloff)];}), U.C.a, 2);
      for (const t of [-3, 0, 3]) s += U.text(70 + (t + 3) / 6 * 380, 380, t, 'middle');
      s += U.text(260, 430, 't / T (symbol periods)', 'middle') + U.text(515, 215, 'Unit-average-energy I/Q');
      s += U.line(530, 330, 750, 330, U.C.grid) + U.line(640, 235, 640, 425, U.C.grid) + U.text(760, 336, 'I') + U.text(648, 238, 'Q');
      for (const point of alphabet(v.M)) s += U.circle(640 + point[0] * 70, 330 - point[1] * 70, 3.5, U.C.b, U.C.b);
      s += U.text(60, 480, 'The plotted pulse is the combined transmit/channel/receive reference response.');
      return {svg: U.svg(s, 'Modem rate chain with a raised-cosine pulse and normalized modulation alphabet', 800, 510),
        stats: [['Coded rate', U.fmt(coded, 3) + ' Mbit/s'], ['Symbol rate', U.fmt(symbols, 3) + ' Mbaud'], ['Occupied RF width', U.fmt(bandwidth, 3) + ' MHz']],
        equation: 'R<sub>coded</sub> = Rb/Rc; &nbsp; Rs = Rb/(Rc log₂M); &nbsp; B<sub>RF</sub> ≈ (1+α)Rs',
        note: 'Source compression is already included in the information input. Framing, pilots, synchronization overhead and channel errors are omitted. The pulse is a combined raised-cosine reference, which can be implemented with suitable root-raised-cosine transmit and matched-receive filters. The I/Q alphabet is energy normalized; no BER is predicted.',
        question: 'If code rate falls while information rate and modulation stay fixed, which downstream rates must rise?'};
    },
    checks: () => [
      {name: '6 Mbps, rate 3/4, 16-QAM, rolloff .25 gives 2.5 MHz RF', pass: close((6 / .75 / 4) * 1.25, 2.5)},
      {name: 'Every modem alphabet has unit average symbol energy', pass: [2, 4, 16, 64].every(M => close(alphabet(M).reduce((s, p) => s + p[0] ** 2 + p[1] ** 2, 0) / M, 1))},
      {name: 'Combined raised-cosine pulse has integer Nyquist zeros', pass: [0, .25, .5, 1].every(a => [1, 2, 3].every(n => Math.abs(raised(n, a)) < 1e-10))},
      {name: 'Raised-cosine removable singularity is evaluated', pass: close(raised(.5, 1), .5)}
    ]
  });

  const inverse4 = matrix => {
    const a = matrix.map((row, i) => row.concat([0, 1, 2, 3].map(j => +(i === j))));
    const norm = Math.max(...matrix.map(row => row.reduce((s, x) => s + Math.abs(x), 0)));
    for (let j = 0; j < 4; j++) {
      let pivot = j;
      for (let i = j + 1; i < 4; i++) if (Math.abs(a[i][j]) > Math.abs(a[pivot][j])) pivot = i;
      if (Math.abs(a[pivot][j]) < 1e-11 * Math.max(1, norm)) return null;
      [a[j], a[pivot]] = [a[pivot], a[j]];
      const divisor = a[j][j];
      for (let k = 0; k < 8; k++) a[j][k] /= divisor;
      for (let i = 0; i < 4; i++) if (i !== j) {
        const factor = a[i][j];
        for (let k = 0; k < 8; k++) a[i][k] -= factor * a[j][k];
      }
    }
    const result = a.map(row => row.slice(4));
    const inverseNorm = Math.max(...result.map(row => row.reduce((s, x) => s + Math.abs(x), 0)));
    if (!result.flat().every(Number.isFinite) || norm * inverseNorm > 1e12) return null;
    return result.map((row, i) => row.map((x, j) => (x + result[j][i]) / 2));
  };
  const skyFor = v => Array.from({length: 6}, (_, i) => ({az: (-v.spread / 2 + v.spread * i / 5) * Math.PI / 180, el: (i % 2 ? Math.min(85, v.low + v.separation) : v.low) * Math.PI / 180}));
  const dopFor = sky => {
    const H = sky.map(({az, el}) => [-Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), -Math.sin(el), 1]);
    const normal = Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j) => H.reduce((s, row) => s + row[i] * row[j], 0)));
    const Q = inverse4(normal);
    if (!Q || [0, 1, 2, 3].some(i => Q[i][i] < 0)) return {ok: false};
    return {ok: true, Q, HDOP: Math.sqrt(Q[0][0] + Q[1][1]), VDOP: Math.sqrt(Q[2][2]), TDOP: Math.sqrt(Q[3][3]), PDOP: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2]), GDOP: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2] + Q[3][3])};
  };
  modules.push({
    id: 'gnss-dop-3d', group: 'Navigation', title: 'Three-dimensional DOP',
    heading: 'Six sky directions constrain east, north, up and receiver clock together',
    intro: 'Calculate the actual ENU-and-clock normal matrix and see when sky geometry loses a dimension.', sources,
    controls: [ctl('spread', 'Azimuth spread', 30, 360, 15, 300, '°'), ctl('low', 'Lower elevation group', 5, 60, 5, 20, '°'), ctl('separation', 'Elevation-group separation', 0, 60, 5, 35, '°'), ctl('sigma', 'Independent range-error σ', .5, 10, .5, 2, 'm')],
    render(v, U) {
      const sky = skyFor(v), result = dopFor(sky), cx = 225, cy = 255, R = 145;
      let s = U.text(55, 30, 'Generic six-source sky: north up, east right') + U.circle(cx, cy, R, 'none', U.C.muted) + U.circle(cx, cy, R / 2, 'none', U.C.grid);
      s += U.line(cx - R, cy, cx + R, cy, U.C.grid) + U.line(cx, cy - R, cx, cy + R, U.C.grid);
      s += U.text(cx, 90, 'N', 'middle') + U.text(390, cy + 5, 'E') + U.text(45, cy + 5, 'W') + U.text(cx, 430, 'S', 'middle');
      sky.forEach(({az, el}, i) => {
        const x = cx + R * Math.cos(el) * Math.sin(az), y = cy - R * Math.cos(el) * Math.cos(az);
        s += U.line(cx, cy, x, y, U.C.grid) + U.circle(x, y, 6, i % 2 ? U.C.b : U.C.a, i % 2 ? U.C.b : U.C.a);
      });
      s += U.text(55, 475, 'Sky radius = cos(elevation); the center is zenith.');
      if (result.ok) {
        [['HDOP', result.HDOP], ['VDOP', result.VDOP], ['PDOP', result.PDOP], ['TDOP', result.TDOP], ['GDOP', result.GDOP]].forEach(([name, value], i) => {s += U.text(440, 110 + i * 43, name + ' = ' + U.fmt(value, 3));});
        s += U.text(440, 365, '3-D position RMS scale:') + U.text(440, 398, U.fmt(v.sigma * result.PDOP, 3) + ' m');
        s += U.text(440, 443, 'Clock-time σ: ' + U.fmt(v.sigma * result.TDOP / c * 1e9, 2) + ' ns');
      } else {
        s += U.text(440, 140, 'Rank-deficient geometry') + U.text(440, 190, 'Equal elevations confound') + U.text(440, 225, 'height and clock distance.') + U.text(440, 290, 'Separate elevation groups') + U.text(440, 325, 'to recover this dimension.');
      }
      return {svg: U.svg(s, 'Six generic sky directions and a full ENU-plus-clock DOP calculation', 800, 505),
        stats: result.ok ? [['HDOP', U.fmt(result.HDOP, 3)], ['VDOP', U.fmt(result.VDOP, 3)], ['GDOP', U.fmt(result.GDOP, 3)]] : [['Matrix rank', 'Deficient'], ['Position DOP', 'Unavailable'], ['Clock DOP', 'Unavailable']],
        equation: 'Hᵢ = [−cosEᵢ sinAᵢ, −cosEᵢ cosAᵢ, −sinEᵢ, 1]; &nbsp; Q = (HᵀH)⁻¹; &nbsp; Cov = σ²Q<br>HDOP²=Qee+Qnn; VDOP²=Quu; TDOP²=Qbb; PDOP²=HDOP²+VDOP²; GDOP²=PDOP²+TDOP²',
        note: 'A local linearized 3-D model with six generic directions, equal independent range errors, and receiver clock expressed as distance cb. DOP is dimensionless; σPDOP is a three-coordinate RMS scale, not a confidence radius. Elevations cap at 85°. Rank-deficient or severely ill-conditioned matrices are reported rather than regularized into a false solution.',
        question: 'Why do six measurements at the same elevation still fail to separate height from clock bias?'};
    },
    checks: () => {
      const sky = skyFor({spread: 300, low: 20, separation: 35}), d = dopFor(sky), rotated = dopFor(sky.map(x => ({az: x.az + Math.PI / 2, el: x.el})));
      return [
        {name: 'Six mixed-elevation directions give finite positive 3-D DOP', pass: d.ok && [d.HDOP, d.VDOP, d.TDOP, d.PDOP, d.GDOP].every(x => Number.isFinite(x) && x > 0)},
        {name: 'Equal-elevation geometry exposes height/clock rank loss', pass: !dopFor(skyFor({spread: 300, low: 20, separation: 0})).ok},
        {name: 'Standard position/time/geometric DOP trace identities hold', pass: d.ok && close(d.PDOP ** 2, d.HDOP ** 2 + d.VDOP ** 2) && close(d.GDOP ** 2, d.PDOP ** 2 + d.TDOP ** 2)},
        {name: 'Rotating sky azimuth preserves horizontal and vertical DOP', pass: d.ok && rotated.ok && close(d.HDOP, rotated.HDOP) && close(d.VDOP, rotated.VDOP)}
      ];
    }
  });
})();

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

const Spatial=U.spatial;
/* Spatial companions share the existing wave and antenna models and quantitative cuts. */
(() => {
  'use strict';
  const tau=2*Math.PI,rad=degrees=>degrees*Math.PI/180;
  const sequence=(count,fn)=>Array.from({length:count+1},(_,i)=>fn(i/count));
  const ray=theta=>[Math.sin(theta),0,Math.cos(theta)];
  const scaled=(p,k)=>p.map(x=>x*k);
  const at=(moduleId,scope,draw,{replace=false,defaults={azimuth:35,elevation:25},note=''}={})=>{
    const module=modules.find(item=>item.id===moduleId);if(!module)return;
    const original=module.render;
    Spatial.controls(module,defaults);module.spatial=scope;
    module.render=(v,U)=>{
      const result=original(v,U),spatial=draw(v,U,module);
      return{...result,svg:replace?spatial:spatial+result.svg,note:result.note+(note?' '+note:'')};
    };
  };

  at('plane-wave','Transverse electric and magnetic vectors along the propagation axis',(v,U)=>{
    const phase=rad(v.phase),lambda=299792458/(v.frequency*1e9*Math.sqrt(v.eps));
    const field=u=>Math.cos(phase-2*tau*u),position=u=>2*u-1;
    return Spatial.figure(U,v,{height:440,center:[400,235],scale:135,
      title:'Electric and magnetic fields along +x',label:'Spatial plane wave with perpendicular E and H vectors and forward energy flow'},scene=>{
      const origin=[-1.2,0,0];
      let s=scene.arrow(origin,[1.25,0,0],U.C.ink)+scene.label([1.25,0,0],'+x propagation',U.C.ink,28,25);
      s+=scene.arrow(origin,[-1.2,.85,0],U.C.a)+scene.label([-1.2,.85,0],'E · +y',U.C.a,-16,20);
      s+=scene.arrow(origin,[-1.2,0,.85],U.C.b)+scene.label([-1.2,0,.85],'H · +z',U.C.b,0,-16);
      for(let i=0;i<=12;i++){
        const u=i/12,x=position(u),amplitude=.55*field(u);
        s+=scene.arrow([x,0,0],[x,amplitude,0],U.C.a)+scene.arrow([x,0,0],[x,0,amplitude],U.C.b);
      }
      s+=scene.path(sequence(144,u=>[position(u),.55*field(u),0]),U.C.a,3);
      s+=scene.path(sequence(144,u=>[position(u),0,.55*field(u)]),U.C.b,3,'6 3');
      for(const u of[0,.5,1])s+=scene.point([position(u),0,0],U.C.ink,2);
      return s+U.text(400,385,'Energy flow E × H: +x · drawn field length = 2λ · λ = '+U.fmt(lambda,3)+' m.','middle')+U.text(400,420,'E/E₀ and H/H₀ use separate normalized transverse scales.','middle');
    })+U.legend([{name:'Electric field E (y)',color:U.C.a},{name:'Magnetic field H (z)',color:U.C.b,dash:true}]);
  },{replace:true,defaults:{azimuth:32,elevation:23}});

  at('polarization','Spatial wave-tip curve and its transverse polarization ellipse',(v,U)=>{
    const phase=rad(v.phase),delta=rad(v.delta),receive=rad(v.receiver);
    const point=u=>[2*u-1,.45*Math.cos(phase-2*tau*u),.45*v.ratio*Math.cos(phase-2*tau*u+delta)];
    return Spatial.figure(U,v,{height:460,center:[400,245],scale:115,
      title:'One instant of the polarized wave along +x',label:'Spatial polarized electric field and a fixed transverse receiving plane'},scene=>{
      let s=scene.arrow([-1.2,0,0],[1.25,0,0],U.C.ink)+scene.label([1.25,0,0],'+x propagation',U.C.ink,25,28);
      s+=scene.arrow([-1,0,0],[-1,.75,0],U.C.ink)+scene.label([-1,.75,0],'+y',U.C.ink,-14,20);
      s+=scene.arrow([-1,0,0],[-1,0,.95],U.C.ink)+scene.label([-1,0,.95],'+z',U.C.ink,0,-14);
      const plane=[[-1,-.65,-.95],[-1,.65,-.95],[-1,.65,.95],[-1,-.65,.95]];
      s+=scene.polygon(plane,U.C.grid,.08,U.C.grid);
      s+=scene.path(sequence(180,u=>[-1,.45*Math.cos(tau*u),.45*v.ratio*Math.cos(tau*u+delta)]),U.C.c,2);
      s+=scene.line([-1,-.9*Math.cos(receive),-.9*Math.sin(receive)],[-1,.9*Math.cos(receive),.9*Math.sin(receive)],U.C.b,2,'6 4');
      s+=scene.path(sequence(180,point),U.C.a,3);
      for(let i=0;i<=16;i++){const u=i/16,p=point(u);s+=scene.arrow([p[0],0,0],p,U.C.a);}
      s+=scene.point(point(0),U.C.b,5);
      return s+U.text(400,440,'The transverse ellipse below shows this same field at one fixed location.','middle');
    });
  },{note:'The spatial curve joins electric-vector tips at one instant. Every electric vector lies transverse to +x; the lower y–z view retains the receive-axis and power-coupling calculation.'});

  at('dipole-pattern','Full axisymmetric dipole radiation surface beside its quantitative polar cut',(v,U,module)=>{
    const theta=rad(v.theta),field=angle=>Math.abs(module.spatialField(angle,v));
    const radius=angle=>v.quantity?field(angle)**2:field(angle);
    return Spatial.figure(U,v,{height:460,center:[400,235],scale:135,
      title:'The polar cut rotated around the wire',label:'Three dimensional normalized dipole radiation with a wire-axis null'},scene=>{
      let s=scene.surface(radius,{thetaSteps:36,phiSteps:40,color:U.C.a});
      s+=scene.axes([0,0,0],1.15,['x','y','wire +z']);
      s+=scene.line([0,0,-1.18],[0,0,1.18],U.C.ink,3);
      s+=scene.arrow([0,0,0],scaled(ray(theta),1.18),U.C.b)+scene.label(scaled(ray(theta),1.18),'θ = '+v.theta+'°',U.C.b,8,24);
      s+=scene.point(scaled(ray(theta),radius(theta)),U.C.b,5);
      return s+U.text(400,440,v.quantity?'Surface radius = peak-normalized power |F|².':'Surface radius = peak-normalized field magnitude |F|.','middle');
    });
  },{note:'Azimuthal symmetry turns the same polar cut into this 3D surface; the wire axis passes through both radiation nulls.'});

  at('circular-aperture','Forward circular-aperture field surface and aperture-normal geometry',(v,U,module)=>{
    const cache=new Map(),field=theta=>{
      const key=theta.toPrecision(14);if(!cache.has(key))cache.set(key,Math.abs(module.spatialField(theta,v)));
      return cache.get(key);
    };
    const theta=rad(v.theta),thetas=sequence(72,u=>Math.PI/2*u*u);
    return Spatial.figure(U,v,{height:460,center:[400,250],scale:140,
      title:'Circular opening and forward radiation',label:'Circular aperture plane, boresight and forward normalized radiation surface'},scene=>{
      let s=scene.polygon(sequence(64,u=>[.52*Math.cos(tau*u),.52*Math.sin(tau*u),0]),U.C.grid,.12,U.C.ink);
      for(const r of [.18,.35,.52])s+=scene.path(sequence(64,u=>[r*Math.cos(tau*u),r*Math.sin(tau*u),0]),U.C.grid,1);
      s+=scene.surface(field,{thetaSamples:thetas,phiSteps:32,color:U.C.a});
      s+=scene.axes([0,0,0],1.12,['aperture x','aperture y','boresight +z']);
      s+=scene.arrow([0,0,0],scaled(ray(theta),1.13),U.C.b)+scene.label(scaled(ray(theta),1.13),'Probe θ',U.C.b,8,24);
      s+=scene.point(scaled(ray(theta),field(theta)),U.C.b,5);
      return s+U.text(400,440,'Forward hemisphere · radius = |F| · aperture sketch enlarged.','middle');
    });
  },{note:'The 3D surface uses the same scalar field as the angular cut, including the selected obliquity factor. It shows the modeled forward hemisphere and the aperture normal.'});

  at('dish-gain','Reflector, collecting aperture and pointing geometry',(v,U)=>{
    const radius=.9,focus=.62,rim=radius*radius/(4*focus),error=rad(10*v.error);
    const surface=(r,phi)=>[r*Math.cos(phi),r*Math.sin(phi),r*r/(4*focus)];
    return Spatial.figure(U,v,{height:450,center:[400,270],scale:135,
      title:'Reflector, feed and boresight',label:'Spatial parabolic reflector with collecting aperture, feed and offset source direction'},scene=>{
      const faces=[];
      for(let j=0;j<12;j++)for(let i=0;i<32;i++){
        const a=radius*j/12,b=radius*(j+1)/12,p=tau*i/32,q=tau*(i+1)/32,points=[surface(a,p),surface(b,p),surface(b,q),surface(a,q)];
        faces.push({points,depth:points.reduce((sum,point)=>sum+scene.project(point)[2],0)/4});
      }
      faces.sort((a,b)=>a.depth-b.depth);
      let s=faces.map(face=>scene.polygon(face.points,U.C.a,.17,U.C.grid)).join('');
      s+=scene.path(sequence(80,u=>surface(radius,tau*u)),U.C.ink,2);
      s+=scene.line([0,0,0],[0,0,1.4],U.C.grid,1,'5 4')+scene.label([0,0,1.4],'Boresight +z',U.C.ink,-8,-22);
      for(const [r,phi]of [[.3,0],[.65,tau/3],[.83,2*tau/3]]){
        const p=surface(r,phi);s+=scene.arrow([p[0],p[1],1.15],p,U.C.c)+scene.arrow(p,[0,0,focus],U.C.c);
      }
      s+=scene.point([0,0,focus],U.C.b,5)+scene.label([0,0,focus],'Feed at focus',U.C.b);
      s+=scene.arrow([1.4*Math.sin(error),0,1.4*Math.cos(error)],[0,0,0],U.C.b);
      s+=scene.label([1.4*Math.sin(error),0,1.4*Math.cos(error)],'Source δ = '+v.error+'°',U.C.b,8,24);
      s+=scene.line([-.9,0,rim],[.9,0,rim],U.C.ink,1,'5 4');
      s+=scene.label([-.9,0,rim],'D = '+U.fmt(v.diameter,1)+' m',U.C.ink,-8,22);
      return s+U.text(400,430,'Boresight reference rays · pointing separation enlarged ×10.','middle');
    });
  },{defaults:{azimuth:35,elevation:20},note:'The reflector shape is illustrative. Rays show the boresight reference, while the orange source direction marks the selected pointing separation enlarged tenfold. The main-beam gain and loss model below retains its stated approximation.'});

  at('array-multiplication','Full three-dimensional linear-array pattern and array-axis reference',(v,U,module)=>{
    const theta=rad(v.theta),count=Math.max(72,Math.ceil(12*v.n*v.spacing));
    const thetas=sequence(count,u=>Math.acos(1-2*u)),power=angle=>module.spatialPower(angle,v);
    return Spatial.figure(U,v,{height:460,center:[400,235],scale:135,
      title:'Element pattern × array factor in space',label:'Axisymmetric three dimensional linear-array power pattern and probe direction'},scene=>{
      let s=scene.surface(power,{thetaSamples:thetas,phiSteps:28,color:U.C.a});
      s+=scene.axes([0,0,0],1.15,['x','y','array +z']);
      s+=scene.line([0,0,-.8],[0,0,.8],U.C.ink,2);
      for(let i=0;i<v.n;i++)s+=scene.point([0,0,-.8+1.6*i/Math.max(1,v.n-1)],U.C.ink,3);
      s+=scene.arrow([0,0,0],scaled(ray(theta),1.18),U.C.b)+scene.label(scaled(ray(theta),1.18),'θ = '+v.theta+'°',U.C.b,8,24);
      s+=scene.point(scaled(ray(theta),power(theta)),U.C.b,5);
      return s+U.text(400,440,'Surface radius = power / (N² × element peak); array geometry enlarged.','middle');
    });
  },{note:'The 3D surface revolves the same θ-dependent power cut around the z array axis. Its radius retains the existing N² element-peak reference, including any selected dipole element factor.'});
})();

/* Spatial companions use the existing navigation models and preserve their readouts. */
(() => {
  'use strict';
  const rad = degrees => degrees * Math.PI / 180;
  const range = (steps, fn) => Array.from({length: steps + 1}, (_, i) => fn(i / steps));
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const moduleFor = id => modules.find(module => module.id === id);
  const componentLabel = (scene, a, b, text, color, offset = 18) => {
    const p = scene.project(a), q = scene.project(b), dx = q[0] - p[0], dy = q[1] - p[1];
    const length = Math.hypot(dx, dy);
    if (length < 18) return '';
    let nx = -dy / length, ny = dx / length;
    if (ny < 0) {nx = -nx; ny = -ny;}
    return scene.label(a.map((value, i) => (value + b[i]) / 2), text, color, nx * offset, ny * offset + 5);
  };
  const extendChecks = (module, checks) => {
    const previous = module.checks;
    module.checks = () => [...(previous ? previous() : []), ...checks()];
  };

  const framePosition = v => {
    const latitude = rad(v.latitude), longitude = rad(v.longitude), rotation = rad(v.rotation);
    const radius = 6378 + v.altitude;
    const fixed = [radius * Math.cos(latitude) * Math.cos(longitude),
      radius * Math.cos(latitude) * Math.sin(longitude), radius * Math.sin(latitude)];
    const inertial = [fixed[0] * Math.cos(rotation) - fixed[1] * Math.sin(rotation),
      fixed[0] * Math.sin(rotation) + fixed[1] * Math.cos(rotation), fixed[2]];
    return {fixed, inertial, radius, latitude, longitude, rotation};
  };
  const frames = moduleFor('navigation-frames');
  if (frames) {
    const original = frames.render;
    Spatial.controls(frames, {azimuth: 35, elevation: 25});
    frames.spatial = 'Geocentric XYZ and rotating Earth-fixed axes';
    frames.render = (v, U) => {
      const result = original(v, U), g = framePosition(v), earth = 6378 / g.radius;
      const position = g.inertial.map(value => value / g.radius);
      const figure = Spatial.figure(U, v, {width: 800, height: 460, center: [280, 250], scale: 142,
        title: 'One position in two three-dimensional coordinate frames',
        label: 'Spherical Earth, inertial XYZ axes, rotating Earth-fixed axes and the position vector'}, scene => {
        let s = scene.sphere(earth) + scene.axes([0, 0, 0], 1.12, ['X', 'Y', 'Z = ZF']);
        const fixedX = [1.08 * Math.cos(g.rotation), 1.08 * Math.sin(g.rotation), 0];
        const fixedY = [-1.08 * Math.sin(g.rotation), 1.08 * Math.cos(g.rotation), 0];
        s += scene.arrow([0, 0, 0], fixedX, U.C.b) + scene.label(fixedX, 'XF', U.C.b, 9, 14);
        s += scene.arrow([0, 0, 0], fixedY, U.C.b) + scene.label(fixedY, 'YF', U.C.b, 9, 14);
        const surface = (latitude, longitude) => [earth * Math.cos(latitude) * Math.cos(longitude),
          earth * Math.cos(latitude) * Math.sin(longitude), earth * Math.sin(latitude)];
        s += scene.path(range(60, t => surface(-Math.PI / 2 + Math.PI * t, g.rotation)), U.C.b, 2);
        s += scene.path(range(60, t => surface(0, g.rotation + g.longitude * t)), U.C.c, 2);
        s += scene.path(range(45, t => surface(g.latitude * t, g.rotation + g.longitude)), U.C.d, 2);
        s += scene.arrow([0, 0, 0], position, U.C.a) + scene.point(position, U.C.a, 5);
        s += scene.line(position, [position[0], position[1], 0], U.C.a, 1, '5 4');
        s += scene.label(position, 'Position', U.C.a, 8, -10);
        s += U.text(515, 93, 'Earth-fixed position (km)');
        g.fixed.forEach((value, i) => {s += U.text(515, 125 + i * 30, ['xF', 'yF', 'zF'][i] + ' = ' + U.fmt(value, 1));});
        s += U.text(515, 245, 'Inertial position (km)');
        g.inertial.forEach((value, i) => {s += U.text(515, 277 + i * 30, ['X', 'Y', 'Z'][i] + ' = ' + U.fmt(value, 1));});
        s += U.text(45, 426, 'Orange axes and prime meridian turn about the shared Z axis.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(frames, () => {
      const p = framePosition({latitude: 30, longitude: 0, rotation: 90, altitude: 0});
      return [
        {name: 'Spatial ECEF quarter-turn sends fixed x to inertial Y and preserves Z',
          pass: Math.abs(p.inertial[0]) < 1e-9 && near(p.inertial[1], 6378 * Math.cos(Math.PI / 6)) && near(p.inertial[2], 3189)},
        {name: 'Spatial frame rotation preserves the full geocentric radius',
          pass: near(Math.hypot(...p.inertial), 6378)}
      ];
    });
  }

  const elevationGeometry = v => {
    const ratio = 6378 / v.r, gamma = rad(v.gamma);
    const station = [ratio, 0, 0], satellite = [Math.cos(gamma), Math.sin(gamma), 0];
    const horizontal = satellite[1], up = satellite[0] - ratio;
    return {ratio, gamma, station, satellite, horizontal, up,
      elevation: Math.atan2(up, horizontal)};
  };
  const look = moduleFor('look-triangle');
  if (look) {
    const original = look.render;
    Spatial.controls(look, {azimuth: -35, elevation: 25});
    look.spatial = 'Spherical Earth, station tangent plane and the elevation cross-section';
    look.render = (v, U) => {
      const result = original(v, U), g = elevationGeometry(v), p = g.station;
      const figure = Spatial.figure(U, v, {width: 800, height: 465, center: [285, 250], scale: 150,
        title: 'The station’s horizon is a plane tangent to spherical Earth',
        label: 'Earth and satellite in three-dimensional context with a local horizon plane, Up normal and line-of-sight components'}, scene => {
        let s = scene.sphere(g.ratio);
        s += scene.polygon([[p[0], -.55, -.4], [p[0], .95, -.4], [p[0], .95, .4], [p[0], -.55, .4]], U.C.b, .08, U.C.b);
        s += scene.line([0, 0, 0], g.satellite, U.C.muted, 1, '5 4');
        s += scene.line([0, 0, 0], p, U.C.muted, 1);
        s += scene.path(range(50, t => [g.ratio * .7 * Math.cos(g.gamma * t),
          g.ratio * .7 * Math.sin(g.gamma * t), 0]), U.C.muted, 1.5);
        s += scene.label([g.ratio * .83 * Math.cos(g.gamma / 2), g.ratio * .83 * Math.sin(g.gamma / 2), 0], 'γ', U.C.muted, -8, -10);
        const projection = [p[0], g.horizontal, 0];
        s += scene.line(p, projection, U.C.b, 2, '5 4');
        s += scene.line(projection, g.satellite, U.C.c, 2, '5 4');
        s += scene.line(p, g.satellite, g.elevation >= 0 ? U.C.a : U.C.d, 2, g.elevation >= 0 ? '' : '7 4');
        s += scene.arrow(p, [p[0] + .4, 0, 0], U.C.c);
        s += scene.label([p[0] + .4, 0, 0], 'Up', U.C.c, 10, -10);
        s += scene.arrow(p, [p[0], .48, 0], U.C.b);
        s += scene.label([p[0], .48, 0], 'Horizontal', U.C.b, -14, 18);
        s += scene.point(p, U.C.b, 5) + scene.label(p, 'Station', U.C.b, -22, 21);
        s += scene.point(g.satellite, U.C.a, 5) + scene.label(g.satellite, 'Satellite', U.C.a, 10, -12);
        s += U.text(505, 95, 'Earth center → station: RE');
        s += U.text(505, 131, 'Earth center → satellite: rs');
        s += U.text(505, 189, 'Ray = horizontal part + Up part');
        s += U.text(505, 225, 'Elevation = ' + U.fmt(U.deg(g.elevation), 2) + '°');
        s += U.text(505, 279, g.elevation >= 0 ? 'Ray clears the ideal spherical horizon.' : 'Dashed ray is blocked by Earth.');
        s += U.text(45, 430, 'The central angle fixes an elevation cross-section; azimuth is free in this model.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(look, () => {
      const horizon = elevationGeometry({r: 24000, gamma: Math.acos(6378 / 24000) * 180 / Math.PI});
      const overhead = elevationGeometry({r: 24000, gamma: 0});
      return [
        {name: 'Spatial look-angle horizon has zero Up component', pass: Math.abs(horizon.up) < 1e-12 && Math.abs(horizon.elevation) < 1e-12},
        {name: 'Spatial overhead ray is radial with90-degree elevation', pass: near(overhead.elevation, Math.PI / 2) && near(overhead.horizontal, 0)}
      ];
    });
  }

  const bearingGeometry = v => {
    const latitude = rad(v.Le), subpointLatitude = rad(v.Ls), longitudeDifference = rad(v.dl);
    const east = Math.cos(subpointLatitude) * Math.sin(longitudeDifference);
    const north = Math.sin(subpointLatitude) * Math.cos(latitude) -
      Math.cos(subpointLatitude) * Math.sin(latitude) * Math.cos(longitudeDifference);
    const magnitude = Math.hypot(east, north);
    return {east, north, magnitude, bearing: magnitude < 1e-10 ? null : (Math.atan2(east, north) + 2 * Math.PI) % (2 * Math.PI)};
  };
  const azimuth = moduleFor('azimuth-components');
  if (azimuth) {
    const original = azimuth.render;
    Spatial.controls(azimuth, {azimuth: -35, elevation: 25});
    azimuth.spatial = 'East-north horizon projection with its Up normal';
    azimuth.render = (v, U) => {
      const result = original(v, U), g = bearingGeometry(v), projected = [g.east, g.north, 0];
      const figure = Spatial.figure(U, v, {width: 800, height: 465, center: [285, 250], scale: 145,
        title: 'Azimuth belongs to the local east–north horizon plane',
        label: 'Three-dimensional local horizon plane and Up normal with east and north components of the horizontal ray projection'}, scene => {
        let s = scene.polygon([[-1.08, -1.08, 0], [1.08, -1.08, 0], [1.08, 1.08, 0], [-1.08, 1.08, 0]], U.C.c, .05, U.C.grid);
        s += scene.path(range(80, t => [Math.sin(2 * Math.PI * t), Math.cos(2 * Math.PI * t), 0]), U.C.grid, 1);
        s += scene.axes([0, 0, 0], 1.12, ['E', 'N', 'Up']);
        s += scene.line([0, 0, 0], [g.east, 0, 0], U.C.b, 2, '5 4');
        s += scene.line([g.east, 0, 0], projected, U.C.c, 2, '5 4');
        if (g.bearing !== null) {
          s += scene.path(range(70, t => [.58 * Math.sin(g.bearing * t), .58 * Math.cos(g.bearing * t), 0]), U.C.a, 2);
          s += scene.arrow([0, 0, 0], projected, U.C.a);
          s += componentLabel(scene, [0, 0, 0], projected, 'Horizontal projection', U.C.a, 32);
        }
        s += scene.point([0, 0, 0], U.C.ink, 4);
        s += U.text(515, 103, 'East component = ' + U.fmt(g.east, 3));
        s += U.text(515, 139, 'North component = ' + U.fmt(g.north, 3));
        s += U.text(515, 200, g.bearing === null ? 'Azimuth is undefined.' : 'Azimuth = ' + U.fmt(U.deg(g.bearing), 1) + '°');
        s += U.text(515, 237, 'Clockwise from local North');
        s += U.text(515, 296, 'Up is perpendicular to the horizon.');
        s += U.text(45, 430, 'The plotted vector is the horizontal projection; this model determines bearing.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(azimuth, () => {
      const east = bearingGeometry({Le: 0, Ls: 0, dl: 90});
      const south = bearingGeometry({Le: 30, Ls: 0, dl: 0});
      return [
        {name: 'Spatial ENU eastward projection has90-degree bearing', pass: near(east.east, 1) && near(east.north, 0) && near(east.bearing, Math.PI / 2)},
        {name: 'Spatial ENU equatorial subpoint is south of a northern station at the same longitude', pass: near(south.east, 0) && near(south.north, -.5) && near(south.bearing, Math.PI)}
      ];
    });
  }

  const skyDirections = v => Array.from({length: 6}, (_, i) => {
    const azimuth = rad(-v.spread / 2 + v.spread * i / 5);
    const elevation = rad(i % 2 ? Math.min(85, v.low + v.separation) : v.low);
    return {azimuth, elevation, point: [Math.cos(elevation) * Math.sin(azimuth),
      Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation)]};
  });
  const dop = moduleFor('gnss-dop-3d');
  if (dop) {
    const original = dop.render;
    Spatial.controls(dop, {azimuth: 35, elevation: 25});
    dop.spatial = 'Local ENU sky hemisphere and elevation-group geometry';
    dop.render = (v, U) => {
      const result = original(v, U), directions = skyDirections(v);
      const figure = Spatial.figure(U, v, {width: 800, height: 455, center: [285, 260], scale: 143,
        title: 'Elevation separates vertical position from receiver-clock bias',
        label: 'Three-dimensional ENU hemisphere with six line-of-sight directions and their vertical projections'}, scene => {
        const ring = elevation => range(80, t => [Math.cos(elevation) * Math.sin(2 * Math.PI * t),
          Math.cos(elevation) * Math.cos(2 * Math.PI * t), Math.sin(elevation)]);
        let s = scene.polygon(ring(0), U.C.c, .05, U.C.muted);
        for (const elevation of [0, 30, 60]) s += scene.path(ring(rad(elevation)), U.C.grid, 1);
        for (const azimuth of [0, 90, 180, 270]) s += scene.path(range(50, t => {
          const elevation = t * Math.PI / 2;
          return [Math.cos(elevation) * Math.sin(rad(azimuth)), Math.cos(elevation) * Math.cos(rad(azimuth)), Math.sin(elevation)];
        }), U.C.grid, 1);
        s += scene.axes([0, 0, 0], 1.15, ['E', 'N', 'U']);
        s += scene.path(ring(rad(v.low)), U.C.a, 1, '5 4');
        if (v.separation) s += scene.path(ring(rad(Math.min(85, v.low + v.separation))), U.C.b, 1, '5 4');
        directions.forEach(({point}, i) => {
          const color = i % 2 ? U.C.b : U.C.a;
          s += scene.line(point, [point[0], point[1], 0], U.C.muted, 1, '4 4');
          s += scene.arrow([0, 0, 0], point, color) + scene.point(point, color, 4.5);
          s += scene.label(point, String(i + 1), color, 8, -8);
        });
        s += scene.point([0, 0, 0], U.C.ink, 4);
        s += U.text(510, 100, 'Receiver at the ENU origin');
        s += U.text(510, 140, 'Lower group: ' + U.fmt(v.low, 0) + '° elevation');
        s += U.text(510, 174, 'Upper group: ' + U.fmt(Math.min(85, v.low + v.separation), 0) + '° elevation');
        s += U.text(510, 230, 'Vertical direction component = sin E');
        if (v.separation === 0) {
          s += U.text(510, 275, 'All rays end at the same height.');
          s += U.text(510, 309, 'Height and clock columns are dependent.');
        } else {
          s += U.text(510, 275, 'Two heights give different U components.');
          s += U.text(510, 309, 'Azimuth spread also affects conditioning.');
        }
        s += U.text(45, 425, 'Dashed drops show the horizontal projection of each unit ray.');
        return s;
      });
      return {...result, svg: figure + result.svg};
    };
    extendChecks(dop, () => {
      const rays = skyDirections({spread: 300, low: 20, separation: 35});
      const flat = skyDirections({spread: 300, low: 20, separation: 0});
      return [
        {name: 'Spatial GNSS ENU rays have unit length', pass: rays.every(ray => near(Math.hypot(...ray.point), 1))},
        {name: 'Equal GNSS elevations place every ray on one horizontal plane', pass: flat.every(ray => near(ray.point[2], Math.sin(rad(20))))}
      ];
    });
  }

  const passPosition = v => {
    const along = v.speed * v.time / 1000;
    return {position: [along, v.cross / 1000, .85],
      halfTrack: Math.max(1.2, Math.abs(along) + .35), cross: v.cross / 1000, height: .85};
  };
  const pass = moduleFor('doppler-pass');
  if (pass) {
    const original = pass.render;
    Spatial.controls(pass, {azimuth: 35, elevation: 25});
    pass.spatial = 'Altitude, cross-track offset and along-track motion in three perpendicular directions';
    pass.render = (v, U) => {
      const result = original(v, U), g = passPosition(v), x = g.position[0];
      const extent = Math.hypot(g.halfTrack + .8, g.cross + .5, g.height);
      const figure = Spatial.figure(U, v, {width: 800, height: 460, center: [355, 250], scale: 155 / extent,
        title: 'The line of sight combines altitude, cross-track offset and along-track motion',
        label: 'Three-dimensional straight satellite pass over a flat ground plane showing h, b, vt and slant range'}, scene => {
        let s = scene.polygon([[-g.halfTrack - .3, -.35, 0], [g.halfTrack + .3, -.35, 0],
          [g.halfTrack + .3, g.cross + .5, 0], [-g.halfTrack - .3, g.cross + .5, 0]], U.C.c, .06, U.C.grid);
        s += scene.line([-g.halfTrack, g.cross, 0], [g.halfTrack, g.cross, 0], U.C.muted, 1, '5 4');
        s += scene.arrow([-g.halfTrack, g.cross, g.height], [g.halfTrack, g.cross, g.height], U.C.a);
        s += scene.line([0, 0, 0], [0, g.cross, 0], U.C.c, 2);
        s += scene.line([0, g.cross, 0], [x, g.cross, 0], U.C.muted, 2);
        s += scene.line([x, g.cross, 0], g.position, U.C.d, 1.5, '5 4');
        s += scene.line([0, 0, 0], g.position, U.C.b, 2);
        s += scene.point([0, 0, 0], U.C.b, 5) + scene.label([0, 0, 0], 'Beacon', U.C.b, -54, 20);
        s += scene.point(g.position, U.C.a, 5) + scene.label(g.position, 'Satellite', U.C.a, 8, -10);
        s += componentLabel(scene, [x, g.cross, 0], g.position, 'h', U.C.d);
        s += componentLabel(scene, [0, 0, 0], [0, g.cross, 0], 'b', U.C.c);
        s += componentLabel(scene, [0, g.cross, 0], [x, g.cross, 0], 'vt', U.C.muted);
        s += componentLabel(scene, [0, 0, 0], g.position, 'r(t)', U.C.b, 24);
        s += U.text(45, 65, 'View refits; all dimensions share one scale. The ground is h = 0.');
        s += U.text(45, 405, 'h = 850 km; b = ' + U.fmt(v.cross, 0) + ' km; vt = ' + U.fmt(v.speed * v.time, 0) + ' km');
        s += U.text(45, 434, 'r(t) = ' + U.fmt(Math.hypot(...g.position) * 1000, 0) + ' km; motion is along the teal track.');
        return s;
      });
      return {...result, svg: result.svg.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/, figure),
        note: result.note + ' Altitude h, cross-track offset b and along-track motion vt are perpendicular in this model.'};
    };
    extendChecks(pass, () => {
      const at = passPosition({speed: 7.4, cross: 400, time: 250});
      const closest = passPosition({speed: 7.4, cross: 400, time: 0});
      return [
        {name: 'Spatial Doppler pass preserves independent altitude, cross-track and along-track dimensions',
          pass: near(at.position[0], 1.85) && near(at.position[1], .4) && near(at.position[2], .85)},
        {name: 'Spatial closest approach gives the original altitude/cross-track slant range',
          pass: near(Math.hypot(...closest.position) * 1000, Math.hypot(850, 400))}
      ];
    });
  }
})();

/* Spatial geometry accompanies the existing scalar budgets and angular cuts. */
(() => {
  const tau=2*Math.PI,add=(a,b)=>a.map((x,i)=>x+b[i]),scale=(a,s)=>a.map(x=>x*s);
  const replaceFirst=(markup,view)=>markup.replace(/<svg\b[\s\S]*?<\/svg>/,()=>view);
  function adapt(id,description,draw,replace=false,note){
    const module=modules.find(m=>m.id===id),original=module.render;
    Spatial.controls(module);module.spatial=description;
    module.render=(v,U)=>{
      const result=original(v,U),view=draw(v,U);
      result.svg=replace?replaceFirst(result.svg,view):view+result.svg;
      if(note)result.note=note;
      return result;
    };
  }

  adapt('solar-array','Physical panel area, normal and projected collecting area',(v,U)=>{
    const angle=U.rad(v.angle),normal=[Math.sin(angle),0,Math.cos(angle)],along=[Math.cos(angle),0,-Math.sin(angle)];
    // The full square is to one shared area scale; its projection is onto z=constant.
    const half=Math.sqrt(v.area)/2,plane=1.6;
    const panel=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>add(scale(along,x*half),[0,y*half,0]));
    const shadow=panel.map(p=>[p[0],p[1],-plane]);
    return Spatial.figure(U,v,{title:'A tilted surface presents a smaller area to the Sun',label:'Three-dimensional panel and its collecting-area projection',height:460,center:[400,220],scale:65},s=>{
      let out=s.polygon(shadow,v.angle<=90?U.C.b:U.C.grid,.13);
      for(let j=0;j<4;j++)out+=s.line(panel[j],shadow[j],U.C.grid,1,'4 4');
      out+=s.polygon(panel,U.C.a,.4);
      for(const t of [-.5,0,.5]){
        out+=s.line(add(scale(along,-half),[0,t*half,0]),add(scale(along,half),[0,t*half,0]),U.C.a);
        out+=s.line(add(scale(along,t*half),[0,-half,0]),add(scale(along,t*half),[0,half,0]),U.C.a);
      }
      out+=s.arrow([0,0,0],scale(normal,1.3),U.C.c,'Panel normal');
      for(const y of [-.9,0,.9])out+=s.arrow([-1.6,y,1.7],[-1.6,y,.6],U.C.b);
      out+=U.text(24,64,'Sunlight travels along −z')+U.text(24,420,'A = '+U.fmt(v.area,2)+' m²; front-side projected area = '+U.fmt(v.area*Math.max(0,Math.cos(angle)),2)+' m²');
      out+=U.text(24,445,v.angle<=90?'Orange outline: projection onto a plane perpendicular to sunlight':'Backside illumination: this front-side model collects zero power');
      return out;
    });
  },true);

  adapt('solid-angle','Finite spherical patch with polar and azimuth bounds',(v,U)=>{
    const theta=U.rad(v.theta),half=U.rad(v.width)/2,dp=U.rad(v.azimuth),point=(t,p)=>Spatial.spherical(t,p);
    return Spatial.figure(U,v,{title:'Both angular widths bound the spherical patch',label:'Three-dimensional solid angle with finite polar and azimuth extents',height:450,scale:145},s=>{
      let out=s.sphere(1),vertices=[];
      for(let i=0;i<=24;i++)vertices.push(point(theta-half,-dp/2+i*dp/24));
      for(let i=0;i<=12;i++)vertices.push(point(theta-half+i*2*half/12,dp/2));
      for(let i=0;i<=24;i++)vertices.push(point(theta+half,dp/2-i*dp/24));
      for(let i=0;i<=12;i++)vertices.push(point(theta+half-i*2*half/12,-dp/2));
      // Small surface tiles follow curvature; a single planar polygon would flatten it.
      for(let j=0;j<6;j++)for(let k=0;k<12;k++){
        const t0=theta-half+j*2*half/6,t1=t0+2*half/6,p0=-dp/2+k*dp/12,p1=p0+dp/12;
        out+=s.polygon([point(t0,p0),point(t1,p0),point(t1,p1),point(t0,p1)],U.C.a,.55);
      }
      for(const corner of [point(theta-half,-dp/2),point(theta-half,dp/2),point(theta+half,-dp/2),point(theta+half,dp/2)])out+=s.line([0,0,0],corner,U.C.b,1,'4 4');
      out+=s.path(vertices.concat([vertices[0]]),U.C.a,2)+s.arrow([0,0,0],[0,0,1.25],U.C.c,'Polar axis');
      out+=U.text(24,407,'Δθ = '+v.width+'°; Δφ = '+v.azimuth+'°; θ is measured from the polar axis');
      out+=U.text(24,435,'Radial edges enclose ΔΩ; the highlighted surface follows both exact angle bounds.');
      return out;
    });
  },true,'The highlighted curved patch spans the stated finite polar and azimuth bounds on a unit sphere. Its exact area equals its solid angle; uniform intensity U gives patch power UΔΩ.');

  adapt('free-space-flux','Spherical spreading and an enlarged receiver aperture',(v,U)=>Spatial.figure(U,v,{title:'Radiated power crosses spherical surfaces around the transmitter',label:'Three-dimensional spherical power flow and receiving aperture',height:470,center:[400,215],scale:110},s=>{
    let out='';
    for(const radius of [1.15,.8,.45])out+=s.sphere(radius);
    const receiver=[1.35,0,0],aperture=[[1.35,-.3,-.3],[1.35,.3,-.3],[1.35,.3,.3],[1.35,-.3,.3]];
    out+=s.point([0,0,0],U.C.b,6)+s.arrow([0,0,0],receiver,U.C.a,'R = '+U.fmt(v.range,0)+' km');
    out+=s.polygon(aperture,U.C.c,.45)+s.label(receiver,'Receiver Aₑ',U.C.c,30,30);
    for(const axis of [[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[-1,0,0]])out+=s.arrow(scale(axis,.3),scale(axis,.95),U.C.b);
    out+=U.text(24,423,'S = EIRP/(4πR²); receiver captures S Aₑ, with Aₑ = Gᵣλ²/(4π)');
    out+=U.text(24,453,'Spheres show fractions of the current range; the collecting aperture is enlarged.');
    return out;
  }),true);

  adapt('array-normalization','Full forward-hemisphere power pattern used by the normalization integral',(v,U)=>{
    const module=modules.find(m=>m.id==='array-normalization');
    return Spatial.figure(U,v,{title:'The normalization integrates this full forward pattern',label:'Three-dimensional relative array power over the forward hemisphere',height:440,scale:150},s=>{
      let out=s.surface((theta,phi)=>module.spatialPower(theta,phi,v),{thetaMax:Math.PI/2,thetaSteps:40,phiSteps:64,color:U.C.a});
      out+=s.axes([0,0,0],1.12,['x','y','Normal +z']);
      out+=U.text(24,397,'Radial distance = p/(2N²); the rear hemisphere has zero modeled radiation.');
      out+=U.text(24,426,'The curve below is one angular cut; the power integral includes every θ and φ.');
      return out;
    });
  });

  adapt('planar-array','Steered three-dimensional forward pattern with its u-v companion',(v,U)=>{
    const module=modules.find(m=>m.id==='planar-array'),sample=(n,center)=>{
      const values=Array.from({length:35},(_,j)=>-1+2*j/34);
      for(let j=-5;j<=5;j++)values.push(U.clamp(center+j/(4*n),-1,1));
      return [...new Set(values)].sort((a,b)=>a-b);
    };
    const us=sample(v.nx,v.u0),vs=sample(v.ny,v.v0);
    return Spatial.figure(U,v,{title:'Two phase gradients steer a beam in the forward hemisphere',label:'Three-dimensional normalized rectangular-array power pattern',height:440,scale:150},s=>{
      const faces=[],position=(u,w)=>{
        const p=module.spatialPower(u,w,v);return scale([u,w,Math.sqrt(Math.max(0,1-u*u-w*w))],p);
      };
      for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){
        const uv=[[us[i],vs[j]],[us[i+1],vs[j]],[us[i+1],vs[j+1]],[us[i],vs[j+1]]];
        if(uv.some(([u,w])=>u*u+w*w>1))continue;
        const points=uv.map(([u,w])=>position(u,w));faces.push({points,depth:points.reduce((x,p)=>x+s.project(p)[2],0)/4});
      }
      let out=faces.sort((a,b)=>a.depth-b.depth).map(f=>s.polygon(f.points,U.C.a,.18)).join('');
      const target=[v.u0,v.v0,Math.sqrt(1-v.u0*v.u0-v.v0*v.v0)];
      out+=s.axes([0,0,0],1.1,['x','y','Broadside +z'])+s.arrow([0,0,0],target,U.C.b,'Steered peak');
      out+=U.text(24,397,'Radial distance = |AF/(NₓNᵧ)|²; the marked direction has u = u₀, v = v₀.');
      out+=U.text(24,426,'The u–v map below gives the same pattern in a flat angular-coordinate view.');
      return out;
    });
  });

  adapt('array-footprint','Individual rays connect a spatial transmitter to the sampled target plane',(v,U)=>{
    const module=modules.find(m=>m.id==='array-footprint'),half=1.2,height=v.range/22500,source=[0,0,height],threshold=10**(v.level/10);
    return Spatial.figure(U,v,{title:'The same angular field reaches different locations on a target plane',label:'Three-dimensional transmitter-to-flat-target geometry and relative coverage',height:460,center:[400,255],scale:78},s=>{
      const faces=[];
      for(let i=0;i<24;i++)for(let j=0;j<24;j++){
        const x=-1500+3000*(i+.5)/24,y=-1500+3000*(j+.5)/24,p=module.spatialPower(x,y,v),color=p>=threshold?U.C.a:U.C.grid;
        const x0=-half+2*half*i/24,y0=-half+2*half*j/24,d=2*half/24,points=[[x0,y0,0],[x0+d,y0,0],[x0+d,y0+d,0],[x0,y0+d,0]];
        faces.push({points,color,depth:s.project([x0+d/2,y0+d/2,0])[2]});
      }
      let out=faces.sort((a,b)=>a.depth-b.depth).map(f=>s.polygon(f.points,f.color,.55)).join('');
      for(const point of [[-half,-half,0],[half,-half,0],[half,half,0],[-half,half,0]])out+=s.line(source,point,U.C.b,1,'4 4');
      out+=s.point(source,U.C.b,6)+s.label(source,'Array',U.C.b)+s.arrow(source,[0,0,0],U.C.c,'Boresight');
      out+=U.text(24,405,'Colored target cells meet the selected '+v.level+' dB contour; window = ±1500 km.');
      out+=U.text(24,432,'Axial distance is compressed; the quantitative map below keeps its own ground scale.');
      return out;
    });
  });
})();

const courseTopicOrder=["orbit-types", "kepler-ellipse", "geo-frames", "look-triangle", "azimuth-components", "solar-pressure-components", "numerical-orbits", "hohmann-transfer", "eclipse-battery", "solar-array", "rocket-mass", "electric-propulsion", "thermal-balance", "radiation-redundancy", "divergence-curl", "double-curl", "displacement-current", "helmholtz-curvature", "plane-wave", "standing-wave", "polarization", "phasor-interference", "db-distance", "link-budget", "receiver-noise", "doppler-shift", "rain-path", "bandwidth-noise", "free-space-flux", "dipole-pattern", "aperture-phasors", "circular-aperture", "dish-gain", "reflector-screens", "array-multiplication", "array-path-phase", "planar-array", "array-footprint", "beamforming-frontends", "gain-references", "array-normalization", "solid-angle", "sampling-alias", "quantization-pcm", "source-compression", "nyquist-pulse", "rectangular-pulse-spectrum", "matched-filter", "ofdm-multipath", "modem-chain", "iq-constellation", "rate-bandwidth", "adaptive-modcod", "amplifier-backoff", "gnss-orbits", "doppler-pass", "pseudorange-clock", "navigation-frames", "gnss-geometry", "gnss-dop-3d", "gnss-error-budget", "pn-correlation", "lfsr-code", "processing-gain", "near-far", "gnss-acquisition", "dual-frequency"];
modules.sort((a,b)=>{const rank=id=>{const i=courseTopicOrder.indexOf(id);return i<0?999:i;};return rank(a.id)-rank(b.id);});
const groups=[['Orbits','Orbits & look angles'],['Systems','Spacecraft systems'],['Waves','Waves & fields'],['RF','RF links'],['Antennas','Antennas'],['Digital','Digital signals'],['Navigation','Navigation']];
if(document.querySelector('[data-project-overview]')) { window.CourseLab={modules,U,checks:()=>modules.flatMap(m=>(m.checks?.()||[]).map(x=>({module:m.id,...x})))}; return; }
const root=document.getElementById('course-lab'),$=id=>root.querySelector('#'+id),values={};let active=modules[0].id,frame=0,playing=false,lastFrame=0;
for(const m of modules)values[m.id]=Object.fromEntries(m.controls.map(c=>[c.id,c.value]));
try{const s=JSON.parse(localStorage.getItem('ece6390-course-lab-v1')||'null');if(s&&modules.some(m=>m.id===s.active)){active=s.active;for(const m of modules)for(const c of m.controls){const x=s.values?.[m.id]?.[c.id];if(Number.isFinite(x)&&(c.options?c.options.some(o=>o.value===x):x>=c.min&&x<=c.max))values[m.id][c.id]=x}}}catch{}
if(location.hash&&modules.some(m=>m.id===location.hash.slice(1)))active=location.hash.slice(1);
if(root.dataset.topic) active=root.dataset.topic;
if(root.dataset.topic) {
  const params=new URLSearchParams(location.search),m=modules.find(x=>x.id===active);
  for(const c of m.controls) {
    const raw=params.get('c_'+c.id),n=Number(raw);
    if(raw===null||raw.trim()===''||!Number.isFinite(n))continue;
    if(c.options ? c.options.some(x=>x.value===n) : n>=c.min&&n<=c.max)
      values[active][c.id]=c.options?n:Number(Math.min(c.max,Math.max(c.min,c.min+Math.round((n-c.min)/c.step)*c.step)).toPrecision(12));
  }
}
const save=()=>{
  try{localStorage.setItem('ece6390-course-lab-v1',JSON.stringify({active,values}))}catch{}
  if(root.dataset.topic)try{
    const url=new URL(location.href),m=modules.find(x=>x.id===active);
    for(const c of m.controls){const key='c_'+c.id;if(values[active][c.id]===c.value)url.searchParams.delete(key);else url.searchParams.set(key,values[active][c.id]);}
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }catch{}
};
function pause(){playing=false;cancelAnimationFrame(frame);const b=$('play');if(b){b.textContent='Play';b.setAttribute('aria-pressed','false')}}
function draw(){const m=modules.find(m=>m.id===active);try{const r=m.render(values[active],U);$('figure').innerHTML=r.svg;$('stats').innerHTML=(r.stats||[]).slice(0,3).map(s=>`<div class="stat"><span>${esc(s[0])}</span><strong>${esc(s[1])}</strong></div>`).join('');$('equation').innerHTML=r.equation||'';$('note').textContent=r.note||'';$('question').textContent=r.question?'Think it through: '+r.question:'';$('figure').classList.remove('error');for(const c of m.controls){const out=$('value-'+c.id);if(out)out.textContent=fmt(values[active][c.id],3)+(c.unit?' '+c.unit:'')}}catch(e){$('figure').classList.add('error');$('figure').textContent='This graphic could not be drawn: '+e.message;console.error(active,e)}}
function select(id,focus=false){pause();id=root.dataset.topic||id;active=id;const m=modules.find(x=>x.id===id);$('subjects').innerHTML=groups.map(([g,label])=>`<button type="button" role="tab" id="subject-${g}" aria-selected="${m.group===g}" aria-controls="panel">${label}</button>`).join('');$('concepts').innerHTML=modules.filter(x=>x.group===m.group).map(x=>`<button type="button" role="tab" id="tab-${x.id}" aria-selected="${id===x.id}" aria-controls="panel">${esc(x.title)}</button>`).join('');$('panel').setAttribute('aria-labelledby',root.dataset.topic?'topic-title':'tab-'+id);$('heading').textContent=m.heading;const lesson=$('topic-lesson');if(lesson)lesson.href='../topics/'+id+'/';$('intro').textContent=m.intro;$('controls').innerHTML=m.controls.map(c=>`<div class="control"><label for="input-${c.id}"><span>${esc(c.label)}</span>${c.options?'':`<output id="value-${c.id}" for="input-${c.id}"></output>`}</label>${c.options?`<select id="input-${c.id}">${c.options.map(o=>`<option value="${o.value}" ${values[id][c.id]===o.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`:`<input type="range" id="input-${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${values[id][c.id]}">`}</div>`).join('')+`<div class="actions">${m.animate?'<button type="button" id="play" aria-pressed="false">Play</button>':''}<button type="button" id="reset">Reset example</button></div>`;$('sources').innerHTML=(m.sources||[]).map(s=>`<li>${esc(sourceLabel(s))}</li>`).join('');$('footer').textContent='';for(const c of m.controls)$('input-'+c.id).addEventListener('input',e=>{pause();values[id][c.id]=Number(e.target.value);draw();save()});$('reset').onclick=()=>{pause();values[id]=Object.fromEntries(m.controls.map(c=>[c.id,c.value]));select(id)};if(m.animate)$('play').onclick=()=>{if(playing){pause();return}playing=true;$('play').textContent='Pause';$('play').setAttribute('aria-pressed','true');const a=m.animate;if(values[id][a.id]>=a.max)values[id][a.id]=a.min;lastFrame=0;const tick=t=>{if(!playing)return;if(t-lastFrame>=80){lastFrame=t;values[id][a.id]=Math.min(a.max,values[id][a.id]+a.step);$('input-'+a.id).value=values[id][a.id];draw();if(values[id][a.id]>=a.max){pause();save();return}}frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)};draw();save();try{!root.dataset.topic&&history.replaceState(null,'','#'+id)}catch{}if(focus)$('tab-'+id).focus()}
$('subjects').addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b)select(modules.find(m=>m.group===b.id.replace('subject-','')).id)});$('concepts').addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b)select(b.id.slice(4))});
for(const id of ['subjects','concepts'])$(id).addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...$(id).querySelectorAll('[role=tab]')],i=tabs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[j].click();const fresh=[...$(id).querySelectorAll('[role=tab]')];fresh[j].focus()});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(modules.some(m=>m.id===id))select(id)});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.CourseLab={modules,values,U,select,draw,checks:()=>modules.flatMap(m=>(m.checks?.()||[]).map(x=>({module:m.id,...x})))};
select(active);
})();
