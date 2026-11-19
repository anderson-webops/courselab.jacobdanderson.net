/* Original ECE6390 timing, synchronization and link-geometry models. Units are stated on every axis and readout. */
(() => {
  'use strict';
  const models=window.CourseFigureRegistry||(window.CourseFigureRegistry=[]);
  const tau=2*Math.PI,rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const control=(id,label,min,max,step,value,unit='')=>({id,label,min,max,step,value,unit});
  const near=(a,b,tol=1e-9)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(b));
  const wrap=a=>((a+180)%360+360)%360-180;
  const sinc=x=>Math.abs(x)<1e-12?1:Math.sin(Math.PI*x)/(Math.PI*x);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const scale=(a,k)=>a.map(x=>x*k);
  const norm=a=>Math.hypot(...a);
  const unit=a=>scale(a,1/norm(a));
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

  // One labeled Cartesian frame; every model draws inside its own explicit rectangle.
  function frame(U,o){
    const X=x=>o.x+(x-o.xmin)/(o.xmax-o.xmin)*o.w,Y=y=>o.y+o.h-(clamp(y,o.ymin,o.ymax)-o.ymin)/(o.ymax-o.ymin)*o.h;
    let s=`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="${U.C.grid}"/>`;
    for(const t of o.xticks)s+=U.line(X(t),o.y,X(t),o.y+o.h,U.C.grid)+U.text(X(t),o.y+o.h+18,(o.xfmt||(x=>U.fmt(x,2)))(t),'middle',U.C.muted);
    for(const t of o.yticks)s+=U.line(o.x,Y(t),o.x+o.w,Y(t),U.C.grid)+U.text(o.x-8,Y(t)+5,(o.yfmt||(y=>U.fmt(y,2)))(t),'end',U.C.muted);
    if(o.xlabel)s+=U.text(o.x+o.w/2,o.y+o.h+38,o.xlabel,'middle');
    if(o.ylabel)s+=`<text class="axis-title" fill="${U.C.ink}" transform="translate(${o.x-50},${o.y+o.h/2}) rotate(-90)" text-anchor="middle">${U.esc(o.ylabel)}</text>`;
    return{s,X,Y};
  }
  const curve=(U,f,X,Y,points,color,width=2,dash='')=>U.path(points.map(x=>[X(x),Y(f(x))]),color,width,dash);
  const samples=(lo,hi,n)=>Array.from({length:n+1},(_,i)=>lo+(hi-lo)*i/n);
  const dotMark=(U,x,y,color,r=5)=>U.circle(x,y,r,color,color);
  // Deterministic pseudo-random values keep every figure state reproducible.
  const generator=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const gaussians=(n,seed)=>{const r=generator(seed),out=[];while(out.length<n){const u=Math.max(r(),1e-12),v=r();out.push(Math.sqrt(-2*Math.log(u))*Math.cos(tau*v),Math.sqrt(-2*Math.log(u))*Math.sin(tau*v));}return out.slice(0,n);};
  const mSequence=(degree,taps,length)=>{let state=(1<<degree)-1;const out=[];for(let i=0;i<length;i++){out.push(state&1);const bit=taps.reduce((b,t)=>b^((state>>(degree-t))&1),0);state=(state>>1)|(bit<<(degree-1));}return out;};

  // 1. Grating lobes: the visible window of ψ decides how many coherent peaks are real directions.
  const arrayFactor=(psi,n)=>{const s=Math.sin(psi/2);return Math.abs(s)<1e-9?1:Math.abs(Math.sin(n*psi/2)/(n*s));};
  const grating=v=>{
    const s=v.spacing,c0=Math.cos(rad(v.steer)),beta=-tau*s*c0,lo=beta-tau*s,hi=beta+tau*s,peaks=[];
    for(let m=Math.ceil(lo/tau-1e-9);m<=Math.floor(hi/tau+1e-9);m++){const c=m/s+c0;if(Math.abs(c)<=1+1e-9)peaks.push({m,theta:deg(Math.acos(clamp(c,-1,1)))});}
    return{s,c0,beta,lo,hi,peaks,extra:peaks.filter(p=>p.m!==0),limit:1/(1+Math.abs(c0))};
  };
  models.push({id:'ece-grating',controls:[control('n','Number of elements N',2,16,1,8),control('spacing','Element spacing d/λ',.25,1.5,.05,.5),control('steer','Steering angle θ₀ from the array axis',0,180,5,60,'°')],
    render(v,U){
      const z=grating(v),top=frame(U,{x:84,y:46,w:686,h:150,xmin:-3.2,xmax:3.2,ymin:0,ymax:1,xticks:[-3,-2,-1,0,1,2,3],yticks:[0,.5,1],xlabel:'Adjacent phase ψ/2π (cycles)',ylabel:'|AF|/N'});
      let s=U.text(84,28,'Array factor against adjacent phase; the shaded band is the visible window',)+top.s;
      s+=`<rect x="${top.X(clamp(z.lo/tau,-3.2,3.2))}" y="46" width="${top.X(clamp(z.hi/tau,-3.2,3.2))-top.X(clamp(z.lo/tau,-3.2,3.2))}" height="150" fill="${U.C.a}" opacity=".12"/>`;
      s+=curve(U,x=>arrayFactor(tau*x,v.n),top.X,top.Y,samples(-3.2,3.2,1400),U.C.a,1.8);
      for(const p of z.peaks)s+=dotMark(U,top.X(p.m),top.Y(1),p.m?U.C.d:U.C.b,6);
      const bottom=frame(U,{x:84,y:290,w:686,h:150,xmin:0,xmax:180,ymin:0,ymax:1,xticks:[0,30,60,90,120,150,180],yticks:[0,.5,1],xfmt:x=>x+'°',xlabel:'Angle θ from the array axis (degrees)',ylabel:'|AF/N|²'});
      s+=U.text(84,272,'Normalized power pattern in space: orange is the main beam, magenta marks grating lobes')+bottom.s;
      s+=curve(U,t=>arrayFactor(tau*z.s*Math.cos(rad(t))+z.beta,v.n)**2,bottom.X,bottom.Y,samples(0,180,900),U.C.a,2);
      for(const p of z.peaks)s+=dotMark(U,bottom.X(p.theta),bottom.Y(1),p.m?U.C.d:U.C.b,6);
      const svg=U.svg(s,'Uniform linear array factor with its visible window and grating lobes',800,500);
      return{svg,stats:[['Visible window',`ψ/2π from ${U.fmt(z.lo/tau,3)} to ${U.fmt(z.hi/tau,3)}`],['Coherent beams in real space',z.extra.length?`${z.peaks.length}: main + ${z.extra.length} grating`:'1: main beam only'],['Largest spacing without grating lobes',`${U.fmt(z.limit,3)} λ`]],
        equation:'ψ = kd cos θ + β, β = −kd cos θ₀; real directions fill |ψ − β| ≤ kd; no grating lobe when d/λ &lt; 1/(1 + |cos θ₀|)',
        note:'Isotropic, uncoupled, equal-amplitude elements with a progressive phase β. θ is measured from the line of elements. A coherent peak exactly at the window edge points along the axis (endfire); with an element pattern, that lobe is weighted by the element’s response there.'};
    },
    checks:()=>{
      const half=grating({n:8,spacing:.5,steer:90}),full=grating({n:8,spacing:1,steer:90}),scan=grating({n:8,spacing:.7,steer:60}),safe=grating({n:8,spacing:.65,steer:60});
      return[{name:'Half-wave broadside line has only its main beam',pass:half.peaks.length===1&&near(half.peaks[0].theta,90)},
        {name:'One-wavelength broadside spacing adds both endfire grating lobes',pass:full.extra.length===2&&full.extra.some(p=>near(p.theta,0,1e-6))&&full.extra.some(p=>near(p.theta,180,1e-6))},
        {name:'Steering to 60 degrees lowers the spacing limit to 2/3 wavelength',pass:near(scan.limit,2/3)&&scan.extra.length===1&&safe.extra.length===0},
        {name:'Array factor is one at coherence and zero at its first null',pass:near(arrayFactor(tau*3,8),1)&&arrayFactor(tau/8,8)<1e-12}];
    }
  });

  // 2. Eye diagram: overlaid raised-cosine traces and the worst neighbor pattern at one sampling instant.
  const raisedCosine=(t,a)=>{const x=2*a*t;if(Math.abs(Math.abs(x)-1)<1e-7)return Math.PI/4*sinc(1/(2*a));return sinc(t)*Math.cos(Math.PI*a*t)/(1-x*x);};
  const eyeOpening=(offset,a,span=12)=>{let s=raisedCosine(offset,a);for(let k=1;k<=span;k++)s-=Math.abs(raisedCosine(offset-k,a))+Math.abs(raisedCosine(offset+k,a));return s;};
  const eyeSymbols=mSequence(7,[7,6],127).map(b=>2*b-1);
  models.push({id:'ece-eye',controls:[control('rolloff','Raised-cosine rolloff α',.1,1,.05,.35),control('offset','Sampling offset from the ideal instant',-.5,.5,.05,.25,'T')],
    render(v,U){
      const f=frame(U,{x:84,y:46,w:686,h:330,xmin:-1,xmax:1,ymin:-1.9,ymax:1.9,xticks:[-1,-.5,0,.5,1],yticks:[-1.5,-1,0,1,1.5],xfmt:x=>({'-1':'−T','-0.5':'−T/2','0':'0','0.5':'T/2','1':'T'})[String(x)],xlabel:'Time from the decision instant (symbol intervals T)',ylabel:'Received amplitude (normalized)'});
      let s=U.text(84,28,`127 overlaid two-symbol slices, α = ${U.fmt(v.rolloff,2)}; every 7-symbol neighbor pattern appears`)+f.s;
      const times=samples(-1,1,48),traced=[];
      for(let n=0;n<eyeSymbols.length;n++){
        const y=t=>{let total=0;for(let k=-8;k<=8;k++)total+=eyeSymbols[(n+k+127)%127]*raisedCosine(t-k,v.rolloff);return total;};
        s+=`<g opacity=".32">${U.path(times.map(t=>[f.X(t),f.Y(y(t))]),eyeSymbols[n]>0?U.C.a:U.C.c,1)}</g>`;
        traced.push(eyeSymbols[n]*y(v.offset));
      }
      const worst=eyeOpening(v.offset,v.rolloff),seen=Math.min(...traced);
      s+=U.line(f.X(v.offset),46,f.X(v.offset),376,U.C.b,2,'5 4')+U.line(f.X(0),46,f.X(0),376,U.C.ink,1,'2 4');
      if(worst>0)s+=U.line(f.X(v.offset)+8,f.Y(worst),f.X(v.offset)+8,f.Y(-worst),U.C.d,4);
      s+=U.text(f.X(v.offset)>600?f.X(v.offset)-14:f.X(v.offset)+16,64,'chosen sample',f.X(v.offset)>600?'end':'start',U.C.b);
      s+=U.text(84,430,worst>0?`Worst-case half-opening at this instant: ${U.fmt(worst,3)} (magenta bar spans ±)`:'Worst-case eye is closed at this instant: some neighbor pattern crosses zero',)+U.text(84,456,`Smallest traced half-opening: ${U.fmt(seen,3)}; occupied bandwidth (1 + α)Rs = ${U.fmt(1+v.rolloff,2)} Rs`);
      return{svg:U.svg(s,'Eye diagram for a raised-cosine pulse with the selected sampling offset',800,470),
        stats:[['Occupied bandwidth',`${U.fmt(1+v.rolloff,2)} × Rs`],['Worst-case half-opening',worst>0?U.fmt(worst,3):'closed'],['Traced half-opening',U.fmt(seen,3)]],
        equation:'g(t) = sinc(t/T)·cos(παt/T)/[1 − (2αt/T)²]; worst half-opening h(τ) = g(τ) − Σ<sub>k≠0</sub>|g(τ − kT)|',
        note:'Binary ±1 symbols, an ideal raised-cosine combined response and no noise. The traced curves include eight neighbors on each side; the worst-case value adds twelve neighbors on each side with the most harmful signs. A larger rolloff spends bandwidth to keep the eye open over a wider timing range.'};
    },
    checks:()=>[{name:'Raised-cosine response is one at zero and zero at other symbol instants',pass:near(raisedCosine(0,.35),1)&&[1,2,3,4,5].every(k=>Math.abs(raisedCosine(k,.35))<1e-12)},
      {name:'Removable point at t = T/(2α) is continuous',pass:near(raisedCosine(1/(2*.25),.25),raisedCosine(1/(2*.25)+1e-6,.25),1e-5)},
      {name:'Zero intersymbol interference keeps the eye fully open at the ideal instant',pass:near(eyeOpening(0,.25),1,1e-9)&&near(eyeOpening(0,1),1,1e-9)},
      {name:'Larger rolloff keeps a wider eye a quarter symbol late',pass:eyeOpening(.25,1)>eyeOpening(.25,.25)},
      {name:'Degree-7 m-sequence is balanced over one period',pass:eyeSymbols.reduce((a,b)=>a+b,0)===1}]
  });

  // 3. Packet start and symbol-clock drift.
  const barker=[1,1,1,1,1,-1,-1,1,1,-1,1,-1,1],packetNoise=gaussians(64,6390);
  const packet=v=>{
    const r=Array.from({length:64},(_,k)=>(k>=v.arrival&&k<v.arrival+13?barker[k-v.arrival]:0)+v.noise*packetNoise[k]);
    const score=Array.from({length:52},(_,q)=>Math.abs(barker.reduce((s,p,k)=>s+r[k+q]*p,0))/13);
    const estimate=score.indexOf(Math.max(...score)),slope=v.ppm*1e-6;
    return{score,estimate,end:slope*v.length,reach:slope?.1/Math.abs(slope):Infinity};
  };
  models.push({id:'ece-packet',controls:[control('arrival','True header arrival',0,51,1,12,'samples'),control('noise','Noise standard deviation',0,1.5,.1,.5,'× header amplitude'),control('ppm','Symbol-clock interval error',-50,50,5,10,'ppm'),control('length','Packet length',100,5000,100,1000,'symbols')],
    render(v,U){
      const z=packet(v),ymax=Math.max(1.2,Math.ceil(Math.max(...z.score)*10)/10+.1);
      const top=frame(U,{x:84,y:46,w:686,h:150,xmin:0,xmax:51,ymin:0,ymax,xticks:[0,10,20,30,40,50],yticks:[0,.5,1],xlabel:'Trial header offset q (samples)',ylabel:'|C[q]|'});
      let s=U.text(84,28,'Correlate the received samples with the known 13-chip header')+top.s;
      z.score.forEach((c,q)=>{s+=U.line(top.X(q),top.Y(0),top.X(q),top.Y(c),q===z.estimate?U.C.b:U.C.a,q===z.estimate?4:2);});
      s+=U.line(top.X(v.arrival),46,top.X(v.arrival),196,U.C.d,1.5,'4 4');
      const lim=Math.max(.12,Math.abs(z.end)*1.15),bottom=frame(U,{x:84,y:290,w:686,h:150,xmin:0,xmax:v.length,ymin:-lim,ymax:lim,xticks:samples(0,v.length,4),yticks:[-lim,0,lim],xfmt:x=>U.fmt(x,0),yfmt:y=>U.fmt(y,3),xlabel:'Symbol index n within the packet',ylabel:'Timing error eₙ/T'});
      s+=U.text(84,272,`Accumulated decision-time error for a ${U.fmt(v.ppm,0)} ppm interval mismatch`)+bottom.s;
      s+=U.line(84,bottom.Y(.1),770,bottom.Y(.1),U.C.d,1.5,'6 4')+U.line(84,bottom.Y(-.1),770,bottom.Y(-.1),U.C.d,1.5,'6 4');
      s+=U.text(764,bottom.Y(.1)-6,'+0.1 T','end',U.C.d)+U.text(764,bottom.Y(-.1)+16,'−0.1 T','end',U.C.d)+U.path([[bottom.X(0),bottom.Y(0)],[bottom.X(v.length),bottom.Y(z.end)]],U.C.b,2.5);
      return{svg:U.svg(s,'Header correlation search and accumulated symbol-clock error',800,500),
        stats:[['Estimated header start',z.estimate===v.arrival?`${z.estimate} samples (correct)`:`${z.estimate} samples (true ${v.arrival})`],['Error at packet end',`${U.fmt(z.end,4)} T`],['Symbols until 0.1 T',Number.isFinite(z.reach)?U.fmt(z.reach,0):'no drift']],
        equation:'C[q] = (1/N<sub>h</sub>) Σ<sub>k</sub> r[k + q] p*[k]; e<sub>n</sub> = (t̂₀ − t₀) + n(T̂ − T)',
        note:'Real baseband samples, one sample per chip, unit header amplitude and fixed Gaussian noise realizations. The orange bar is the selected peak and the magenta dashed line is the true arrival. The lower panel assumes a perfect start estimate and no tracking updates, so only the interval mismatch accumulates.'};
    },
    checks:()=>{
      const side=Array.from({length:12},(_,j)=>Math.abs(barker.slice(j+1).reduce((s,p,k)=>s+p*barker[k],0)));
      return[{name:'Barker-13 aperiodic sidelobes never exceed one',pass:side.every(x=>x<=1)},
        {name:'Noise-free search finds every true arrival',pass:Array.from({length:52},(_,arrival)=>packet({arrival,noise:0,ppm:0,length:100}).estimate===arrival).every(Boolean)},
        {name:'Ten ppm over 1000 one-microsecond symbols accumulates 10 ns',pass:near(packet({arrival:0,noise:0,ppm:10,length:1000}).end*1e-6,1e-8)}];
    }
  });

  // 4. Carrier frequency offset rotates a QPSK constellation at 360Δf degrees per second.
  const qpskSymbols=mSequence(5,[5,3],400).map((b,i,a)=>45+90*(2*b+(a[(i+7)%400]))) ;
  const carrier=v=>{
    const slip=360*v.offset/(v.rate*1e3),phases=Array.from({length:v.count},(_,n)=>v.phase+slip*n),first=phases.findIndex(p=>Math.abs(wrap(p))>=45);
    return{slip,phases,first,quarter:v.offset?.25/Math.abs(v.offset):Infinity};
  };
  models.push({id:'ece-carrier',controls:[control('offset','Receiver minus transmitter frequency Δf',-2000,2000,50,1000,'Hz'),control('phase','Initial phase error ε₀',-40,40,5,0,'°'),control('rate','Symbol rate',10,1000,10,100,'ksym/s'),control('count','Symbols shown',20,400,20,100)],
    render(v,U){
      const z=carrier(v),cx=200,cy=255,R=135;
      let s=U.text(36,28,'Recovered QPSK points (no noise)')+U.line(cx-170,cy,cx+170,cy,U.C.grid)+U.line(cx,cy-170,cx,cy+170,U.C.grid)+U.text(cx+172,cy-8,'I','end')+U.text(cx+10,cy-158,'Q');
      for(let k=0;k<4;k++){const a=rad(45+90*k);s+=U.circle(cx+R*Math.cos(a),cy-R*Math.sin(a),9,'none',U.C.muted);}
      z.phases.forEach((p,n)=>{const a=rad(qpskSymbols[n%400]-p),ok=Math.abs(wrap(p))<45;s+=U.circle(cx+R*Math.cos(a),cy-R*Math.sin(a),3.2,ok?U.C.a:U.C.d,ok?U.C.a:U.C.d);});
      s+=U.text(36,450,'Teal: correct quadrant. Magenta: wrong decision. Grey rings: ideal points.');
      const f=frame(U,{x:470,y:50,w:300,h:320,xmin:0,xmax:v.count,ymin:-180,ymax:180,xticks:samples(0,v.count,2),yticks:[-180,-45,0,45,180],xfmt:x=>U.fmt(x,0),yfmt:y=>y+'°',xlabel:'Symbol index n',ylabel:'Wrapped phase error ε'});
      s+=U.text(420,28,'Phase error grows at 360°·Δf per second')+f.s+U.line(470,f.Y(45),770,f.Y(45),U.C.d,1.5,'6 4')+U.line(470,f.Y(-45),770,f.Y(-45),U.C.d,1.5,'6 4');
      z.phases.forEach((p,n)=>{s+=U.circle(f.X(n),f.Y(wrap(p)),2.2,Math.abs(wrap(p))<45?U.C.a:U.C.d,Math.abs(wrap(p))<45?U.C.a:U.C.d);});
      return{svg:U.svg(s,'QPSK constellation rotated by a carrier frequency offset, with the phase error against symbol index',800,470),
        stats:[['Phase slip per symbol',`${U.fmt(z.slip,3)}°`],['Time for a 90° slip',Number.isFinite(z.quarter)?`${U.fmt(z.quarter*1e3,4)} ms`:'no slip'],['First wrong QPSK decision',z.first<0?'none in these symbols':`symbol ${z.first}`]],
        equation:'ε(t) = ε₀ + 2πΔf·t; recovered point = transmitted point × e<sup>−jε(t)</sup>; QPSK fails once |ε| ≥ 45°',
        note:'Δf is the receiver reference minus the transmitter carrier. Positive Δf turns the recovered points clockwise. The model has no noise and perfect symbol timing, so every error here comes from carrier rotation; a header can estimate ε₀ and Δf so the receiver can derotate.'};
    },
    checks:()=>[{name:'A 1 kHz offset slips 90 degrees in 0.25 ms',pass:near(carrier({offset:1000,phase:0,rate:100,count:20}).quarter,2.5e-4)},
      {name:'Zero frequency offset keeps a constant phase error',pass:carrier({offset:0,phase:20,rate:100,count:40}).phases.every(p=>p===20)},
      {name:'First QPSK error appears when the phase passes 45 degrees',pass:carrier({offset:1000,phase:0,rate:100,count:100}).first===13},
      {name:'QPSK symbols sit on the four diagonal angles',pass:qpskSymbols.every(a=>[45,135,225,315].includes(a))}]
  });

  // 5. Ground look angles and the satellite antenna's scan angle along the same ray.
  const RE=6378.137,RS=42164.2;
  const scan=v=>{
    const L=rad(v.lat),l=rad(v.dlon),A=rad(v.aim);
    const g=[RE*Math.cos(L)*Math.cos(l),RE*Math.cos(L)*Math.sin(l),RE*Math.sin(L)],sat=[RS,0,0],qg=unit(sub(sat,g)),qs=scale(qg,-1);
    const e=[-Math.sin(l),Math.cos(l),0],n=[-Math.sin(L)*Math.cos(l),-Math.sin(L)*Math.sin(l),Math.cos(L)],u=[Math.cos(L)*Math.cos(l),Math.cos(L)*Math.sin(l),Math.sin(L)];
    const aim=[RE*Math.cos(A),0,RE*Math.sin(A)],zs=unit(sub(aim,sat)),xs=unit(sub([0,1,0],scale(zs,zs[1]))),ys=cross(zs,xs);
    return{g,sat,qg,qs,aim,zs,el:deg(Math.asin(dot(qg,u))),az:(deg(Math.atan2(dot(qg,e),dot(qg,n)))+360)%360,scan:deg(Math.acos(clamp(dot(qs,zs),-1,1))),ux:dot(qs,xs),uy:dot(qs,ys),range:norm(sub(sat,g))};
  };
  models.push({id:'ece-scan',controls:[control('lat','Station latitude',-80,80,.25,33.75,'°'),control('dlon','Station longitude minus satellite longitude',-80,80,.5,0,'°'),control('aim','Antenna aim-point latitude (0 = nadir)',-60,60,.5,0,'°'),control('viewAzimuth','3D view azimuth',-70,70,1,-25,'°'),control('viewElevation','3D view elevation',5,60,1,18,'°')],
    render(v,U){
      const z=scan(v),shift=[-RS/RE/2,0,0],P=p=>add(scale(p,1/RE),shift);
      const svg=U.spatial.figure(U,v,{width:800,height:460,center:[400,250],scale:86,title:'Earth and a GEO satellite drawn to scale; one ray serves both ends'},sc=>{
        let m=sc.sphere(1,P([0,0,0]))+sc.line(P(z.sat),P(z.g),z.el>=0?U.C.a:U.C.d,2.4)+sc.line(P(z.sat),P(z.aim),U.C.muted,1.6,'6 4');
        const up=unit(z.g);m+=sc.arrow(P(z.g),P(add(z.g,scale(up,RE*.7))),U.C.c,'local up')+sc.point(P(z.sat),U.C.b,6)+sc.point(P(z.g),z.el>=0?U.C.a:U.C.d,5);
        m+=sc.label(P(z.sat),'satellite',U.C.b,0,-14)+sc.label(P(z.aim),'antenna axis',U.C.muted,-10,24)+sc.label(P(z.g),`station: El ${U.fmt(z.el,2)}°`,U.C.ink,-14,-16);
        m+=sc.label(P(add(z.sat,scale(z.qs,RS*.45))),`scan ${U.fmt(z.scan,2)}° at the satellite`,U.C.a,0,-16);
        return m;
      });
      return{svg,stats:[['Ground elevation, azimuth',`${U.fmt(z.el,2)}°, ${U.fmt(z.az,1)}°`],['Satellite scan angle',`${U.fmt(z.scan,3)}°`],['Antenna direction cosines (uₓ, u_y)',`(${U.fmt(z.ux,4)}, ${U.fmt(z.uy,4)})`]],
        equation:'q̂<sub>g</sub> = (r<sub>s</sub> − r<sub>g</sub>)/R; q̂<sub>s</sub> = −q̂<sub>g</sub>; El = asin(q̂<sub>g</sub>·û); θ<sub>scan</sub> = acos(q̂<sub>s</sub>·ẑ<sub>s</sub>); u<sub>x</sub> = q̂<sub>s</sub>·x̂<sub>s</sub>, u<sub>y</sub> = q̂<sub>s</sub>·ŷ<sub>s</sub>',
        note:`Spherical Earth, a geostationary satellite over longitude 0 and an antenna z axis pointing from the satellite to the aim point; x̂ points east and ŷ = ẑ × x̂. Slant range here is ${U.fmt(z.range,0)} km. ${z.el<0?'This station is below its horizon, so the ray is blocked by Earth.':'Ground angles use the station horizon; the scan angle uses the satellite antenna axes.'}`};
    },
    checks:()=>{
      const atlanta=scan({lat:33.75,dlon:0,aim:0}),points=[[10,20],[45,-30],[60,5],[-20,40]].map(([lat,dlon])=>scan({lat,dlon,aim:0}));
      return[{name:'Atlanta-latitude station sees the satellite at 50.76 degrees elevation due south',pass:near(atlanta.el,50.76,2e-4)&&near(atlanta.az,180,1e-9)},
        {name:'Nadir-facing antenna scans 5.49 degrees toward that station',pass:Math.abs(atlanta.scan-5.49)<.005&&Math.abs(atlanta.uy+.0957)<5e-4},
        {name:'Law of sines gives the same nadir scan angle everywhere',pass:points.every(z=>near(Math.sin(rad(z.scan)),RE*Math.cos(rad(z.el))/RS,1e-9))},
        {name:'Aiming the antenna at the station gives zero scan',pass:scan({lat:33.75,dlon:0,aim:33.75}).scan<1e-6}];
    }
  });

  // 6. Dish feed illumination: spillover and taper from a cos^q feed at a chosen F/D.
  const dish=v=>{
    const psi0=2*Math.atan(1/(4*v.fd)),q=v.q,field=psi=>Math.sqrt(Math.cos(psi)**q)*(1+Math.cos(psi))/2;
    const spill=Math.cos(psi0)**(q+1),n=600;let a=0,b=0;
    for(let i=0;i<n;i++){const r=(i+.5)/n,psi=2*Math.atan(r*Math.tan(psi0/2)),e=field(psi);a+=e*r/n;b+=e*e*r/n;}
    const taper=2*a*a/b;
    return{psi0,spill,taper,aperture:(1-spill)*taper,edge:20*Math.log10(field(psi0)),field};
  };
  const silver=v=>{const psi0=2*Math.atan(1/(4*v.fd)),n=4000;let s=0;for(let i=0;i<n;i++){const psi=(i+.5)/n*psi0;s+=Math.sqrt(2*(v.q+1)*Math.cos(psi)**v.q)*Math.tan(psi/2)*psi0/n;}return s*s/Math.tan(psi0/2)**2;};
  models.push({id:'ece-dish-feed',controls:[control('fd','Focal length over diameter F/D',.25,1,.05,.4),control('q','Feed pattern exponent q in cosᵠψ',.5,12,.5,2)],
    render(v,U){
      const z=dish(v),D=240,R=D/2,F=v.fd*D,vx=60,cy=250,fx=vx+F,depth=R*R/(4*F);
      let s=U.text(30,28,`Side view: rim at ψ₀ = ${U.fmt(deg(z.psi0),1)}° (F/D = ${U.fmt(v.fd,2)})`);
      s+=U.path(samples(-R,R,80).map(r=>[vx+r*r/(4*F),cy-r]),U.C.ink,3)+U.line(vx-10,cy,fx+150,cy,U.C.grid,1,'4 4');
      const lobe=(lo,hi,color,w)=>U.path(samples(lo,hi,90).map(p=>{const g=110*Math.cos(p)**v.q;return[fx-g*Math.cos(p),cy-g*Math.sin(p)];}),color,w);
      s+=lobe(-z.psi0,z.psi0,U.C.a,2.5)+lobe(z.psi0,Math.PI/2,U.C.d,3)+lobe(-Math.PI/2,-z.psi0,U.C.d,3);
      s+=U.line(fx,cy,vx+depth,cy-R,U.C.muted,1.5,'5 4')+U.line(fx,cy,vx+depth,cy+R,U.C.muted,1.5,'5 4')+dotMark(U,fx,cy,U.C.b,6);
      s+=U.text(fx+10,cy+28,'feed at focus','start',U.C.b)+U.text(30,420,'Teal: feed power on the dish','start',U.C.a)+U.text(30,444,'Magenta: spillover past the rim','start',U.C.d);
      const f=frame(U,{x:500,y:60,w:270,h:290,xmin:.5,xmax:12,ymin:0,ymax:1,xticks:[.5,4,8,12],yticks:[0,.25,.5,.75,1],xfmt:x=>U.fmt(x,1),xlabel:'Feed exponent q',ylabel:'Efficiency'});
      s+=U.text(500,46,'Efficiency against feed narrowness')+f.s;
      const qs=samples(.5,12,70),cached=qs.map(q=>dish({fd:v.fd,q}));
      s+=U.path(qs.map((q,i)=>[f.X(q),f.Y(1-cached[i].spill)]),U.C.d,2)+U.path(qs.map((q,i)=>[f.X(q),f.Y(cached[i].taper)]),U.C.c,2,'6 4')+U.path(qs.map((q,i)=>[f.X(q),f.Y(cached[i].aperture)]),U.C.a,3);
      s+=U.line(f.X(v.q),60,f.X(v.q),350,U.C.b,1.5,'4 4')+dotMark(U,f.X(v.q),f.Y(z.aperture),U.C.a,5);
      s+=U.text(500,420,'Magenta: intercepted   Purple: taper')+U.text(500,444,'Teal: product (aperture efficiency)');
      return{svg:U.svg(s,'Parabolic dish side view with feed pattern, spillover and efficiency curves',800,460),
        stats:[['Spillover lost',`${U.fmt(100*z.spill,1)} %`],['Edge illumination (field)',`${U.fmt(z.edge,1)} dB`],['Aperture efficiency ηₛ·ηₜ',`${U.fmt(100*(1-z.spill),1)} % × ${U.fmt(100*z.taper,1)} % = ${U.fmt(100*z.aperture,1)} %`]],
        equation:'tan(ψ₀/2) = D/(4F); P<sub>spill</sub>/P<sub>feed</sub> = cos<sup>q+1</sup>ψ₀; E<sub>a</sub>(ψ) ∝ √(cos<sup>q</sup>ψ)·(1 + cos ψ)/2; η<sub>t</sub> = 2(∫E r dr)²/∫E² r dr',
        note:'Rotationally symmetric cosᵠψ feed power pattern with nothing radiated behind the feed, a perfect paraboloid and no blockage, phase error or cross-polarization. Spillover and taper efficiency multiply. Their product peaks between a broad feed that spills and a narrow feed that wastes the dish edge.'};
    },
    checks:()=>{
      const broad=dish({fd:.4,q:1}),narrow=dish({fd:.4,q:4});
      return[{name:'F/D 0.4 puts the rim 64 degrees from the feed axis',pass:Math.abs(deg(broad.psi0)-64.01)<.01},
        {name:'Broad q=1 feed spills 19.2 percent with a -6.4 dB edge',pass:Math.abs(100*broad.spill-19.2)<.05&&Math.abs(broad.edge+6.44)<.02},
        {name:'Narrow q=4 feed spills 1.6 percent with a -17.2 dB edge',pass:Math.abs(100*narrow.spill-1.62)<.02&&Math.abs(narrow.edge+17.19)<.02},
        {name:'Aperture integration matches Silver’s feed-angle formula',pass:[[.3,2],[.4,1],[.5,6],[.8,3]].every(([fd,q])=>near(dish({fd,q}).aperture,silver({fd,q}),2e-4))}];
    }
  });

  // 7. Early-minus-late code tracking with a delayed echo.
  const triangle=e=>Math.max(0,1-Math.abs(e));
  const tracking=v=>{
    const a=v.alpha,p=rad(v.phase),C=e=>{const re=triangle(e)+a*Math.cos(p)*triangle(e-v.delay),im=a*Math.sin(p)*triangle(e-v.delay);return Math.hypot(re,im);};
    const D=e=>C(e-v.spacing/2)-C(e+v.spacing/2);
    let best=null;
    for(let i=-1500;i<1500;i++){const a0=i/1000,a1=(i+1)/1000;if(D(a0)<0&&D(a1)>=0){let lo=a0,hi=a1;for(let k=0;k<50;k++){const mid=(lo+hi)/2;if(D(mid)<0)lo=mid;else hi=mid;}const root=(lo+hi)/2;if(best===null||Math.abs(root)<Math.abs(best))best=root;}}
    return{C,D,bias:best};
  };
  models.push({id:'ece-dll',controls:[control('spacing','Early–late spacing',.1,1,.05,1,'chip'),control('alpha','Echo amplitude relative to direct',0,.9,.05,.3),control('delay','Echo excess delay',0,1.5,.05,.25,'chip'),control('phase','Echo carrier phase',0,180,15,0,'°')],
    render(v,U){
      const z=tracking(v),top=frame(U,{x:84,y:46,w:686,h:160,xmin:-1.5,xmax:3,ymin:0,ymax:2,xticks:[-1,0,1,2,3],yticks:[0,1,2],xlabel:'Replica delay error ε (chips)',ylabel:'Correlation |C|'});
      let s=U.text(84,28,'Direct triangle (dashed), echo-weighted total (teal) and the balanced early/late pair')+top.s;
      const xs=samples(-1.5,3,450);
      s+=curve(U,triangle,top.X,top.Y,xs,U.C.muted,1.6,'6 4')+curve(U,z.C,top.X,top.Y,xs,U.C.a,2.4);
      if(z.bias!==null)for(const e of [z.bias-v.spacing/2,z.bias+v.spacing/2])s+=dotMark(U,top.X(e),top.Y(z.C(e)),U.C.b,6);
      const bottom=frame(U,{x:84,y:300,w:686,h:140,xmin:-1.5,xmax:3,ymin:-1.2,ymax:1.2,xticks:[-1,0,1,2,3],yticks:[-1,0,1],xlabel:'Replica delay error ε (chips)',ylabel:'Early − late'});
      s+=U.text(84,282,'Discriminator S-curve: the loop settles where it rises through zero')+bottom.s+curve(U,z.D,bottom.X,bottom.Y,xs,U.C.c,2.2);
      if(z.bias!==null)s+=dotMark(U,bottom.X(z.bias),bottom.Y(0),U.C.d,6)+U.line(bottom.X(0),300,bottom.X(0),440,U.C.ink,1,'2 4');
      return{svg:U.svg(s,'Code correlation with a delayed echo and the early-minus-late discriminator',800,500),
        stats:[['Tracking bias',z.bias===null?'no stable lock near zero':`${U.fmt(z.bias,4)} chip`],['Range bias at 293 m per chip',z.bias===null?'—':`${U.fmt(z.bias*293.05,1)} m`],['Direct-path peak','0 chip (true arrival)']],
        equation:'C(ε) = R(ε) + αe<sup>jφ</sup>R(ε − δ), R(ε) = max(0, 1 − |ε|); D(ε) = |C(ε − s/2)| − |C(ε + s/2)|; lock where D = 0 and rising',
        note:'Ideal triangular code correlation from an infinitely wide front end, one echo and no noise. Positive bias means the receiver measures a later arrival. With φ = 0° or 180° this magnitude discriminator balances at the same point as the coherent one; 293 m is one GPS C/A chip.'};
    },
    checks:()=>{
      const inPhase=tracking({spacing:1,alpha:.3,delay:.25,phase:0}),opposite=tracking({spacing:1,alpha:.3,delay:.25,phase:180});
      return[{name:'No echo means no tracking bias',pass:Math.abs(tracking({spacing:1,alpha:0,delay:.5,phase:0}).bias)<1e-9},
        {name:'In-phase echo biases late by αδ/(1 + α) = 0.0577 chip',pass:near(inPhase.bias,.3*.25/1.3,1e-6)},
        {name:'Opposite-phase echo biases early by 0.1071 chip',pass:near(opposite.bias,-.3*.25/.7,1e-6)},
        {name:'An echo outside the correlator span leaves no bias',pass:Math.abs(tracking({spacing:.2,alpha:.5,delay:1.5,phase:0}).bias)<1e-9}];
    }
  });

  // 8. Time difference of arrival: a fixed range difference is a hyperbola branch.
  const towers=[[-35,0],[35,0],[0,50]];
  const hyperbola=(Ti,Tj,delta,tmax=3.2,n=160)=>{
    const c=norm(sub(Ti,Tj))/2,a=Math.abs(delta)/2;if(a>=c)return[];
    const b=Math.sqrt(c*c-a*a),M=scale(add(Ti,Tj),.5),u=unit(sub(Ti,Tj)),w=[-u[1],u[0]],sign=delta>0?-1:1;
    return samples(-tmax,tmax,n).map(t=>add(M,add(scale(u,sign*a*Math.cosh(t)),scale(w,b*Math.sinh(t)))));
  };
  const tdoa=v=>{const P=[v.x,v.y],R=towers.map(T=>norm(sub(P,T)));return{P,R,rho:R.map(r=>r+v.bias),d12:R[0]-R[1],d13:R[0]-R[2]};};
  models.push({id:'ece-tdoa',controls:[control('x','Receiver east position',-40,40,1,10,'km'),control('y','Receiver north position',-5,45,1,15,'km'),control('bias','Receiver clock bias as distance',-30,30,1,12,'km'),control('tol','Range-difference tolerance',0,3,.25,1,'km')],
    render(v,U){
      const z=tdoa(v),X=x=>40+(x+55)*5,Y=y=>420-(y+12)*5,inside=p=>p[0]>=-55&&p[0]<=55&&p[1]>=-12&&p[1]<=62;
      const draw=(pts,color,width,dash='')=>{let out='',run=[];for(const p of pts){if(inside(p))run.push([X(p[0]),Y(p[1])]);else{if(run.length>1)out+=U.path(run,color,width,dash);run=[];}}if(run.length>1)out+=U.path(run,color,width,dash);return out;};
      let s=U.text(40,28,'Two range differences from three synchronized transmitters')+`<rect x="40" y="50" width="550" height="370" fill="none" stroke="${U.C.grid}"/>`;
      for(const [Tj,d,color] of [[towers[1],z.d12,U.C.a],[towers[2],z.d13,U.C.c]]){
        s+=draw(hyperbola(towers[0],Tj,d),color,2.6);
        if(v.tol>0)for(const k of [-1,1])s+=draw(hyperbola(towers[0],Tj,d+k*v.tol),color,1.2,'5 4');
      }
      towers.forEach((T,i)=>{s+=dotMark(U,X(T[0]),Y(T[1]),U.C.b,7)+U.text(X(T[0])+(i===1?-12:12),Y(T[1])+(i===2?-12:24),`T${i+1}`,i===1?'end':'start',U.C.b);});
      s+=dotMark(U,X(z.P[0]),Y(z.P[1]),U.C.d,6)+U.text(X(z.P[0])+10,Y(z.P[1])-10,'receiver','start',U.C.d);
      const rows=['Pseudoranges ρᵢ = Rᵢ + b',...z.rho.map((r,i)=>`ρ${'₁₂₃'[i]} = ${U.fmt(r,2)} km`),'',`ρ₁ − ρ₂ = ${U.fmt(z.d12,2)} km`,`ρ₁ − ρ₃ = ${U.fmt(z.d13,2)} km`,`b = ${U.fmt(v.bias,0)} km cancels`];
      rows.forEach((r,i)=>{s+=U.text(606,80+i*26,r,'start',i>=5&&i<=6?[U.C.a,U.C.c][i-5]:U.C.ink);});
      s+=U.text(40,446,'Solid: measured differences. Dashed: ± tolerance bands. Grid 10 km; positions are illustrative.');
      for(let g=-50;g<=50;g+=10)s+=U.line(X(g),418,X(g),422,U.C.muted);
      return{svg:U.svg(s,'Hyperbolic time-difference positioning with three transmitters',800,460),
        stats:[['ρ₁ − ρ₂',`${U.fmt(z.d12,3)} km = ${U.fmt(z.d12/299792.458*1e6,3)} µs`],['ρ₁ − ρ₃',`${U.fmt(z.d13,3)} km = ${U.fmt(z.d13/299792.458*1e6,3)} µs`],['Receiver clock bias','cancels in each difference']],
        equation:'Δρ<sub>ij</sub> = ρ<sub>i</sub> − ρ<sub>j</sub> = R<sub>i</sub> − R<sub>j</sub> + ε<sub>i</sub> − ε<sub>j</sub>; |P − T<sub>i</sub>| − |P − T<sub>j</sub>| = Δρ<sub>ij</sub> is one hyperbola branch',
        note:'A two-dimensional analogue with synchronized transmitters and straight-line propagation. Each difference keeps the noise of both measurements: Var(ε₁ − ε₂) = 2σ². In three dimensions each difference defines a hyperboloid, and four satellites supply three independent differences.'};
    },
    checks:()=>{
      const z=tdoa({x:10,y:15,bias:0,tol:0}),pts=hyperbola(towers[0],towers[1],z.d12),shift=tdoa({x:10,y:15,bias:25,tol:0});
      return[{name:'Every plotted point keeps the measured range difference',pass:pts.length>0&&pts.every(p=>near(norm(sub(p,towers[0]))-norm(sub(p,towers[1])),z.d12,1e-9))},
        {name:'The receiver lies on both measured branches',pass:hyperbola(towers[0],towers[2],z.d13).length>0&&near(norm(sub(z.P,towers[0]))-norm(sub(z.P,towers[2])),z.d13)},
        {name:'Adding receiver clock bias leaves every difference unchanged',pass:near(shift.rho[0]-shift.rho[1],z.d12)&&near(shift.rho[0]-shift.rho[2],z.d13)}];
    }
  });

  // 9. Differential correction from a surveyed base.
  const differential=v=>{const base=v.baseClock+v.shared,correction=-v.shared,before=v.roverClock+v.shared*(1+v.decorrelation),after=v.roverClock+v.shared*v.decorrelation;return{base,correction,before,after,sigma:Math.hypot(v.baseNoise,v.roverNoise)};};
  models.push({id:'ece-dgps',controls:[control('shared','Shared satellite and atmosphere error d',-20,20,1,8,'m'),control('baseClock','Base clock distance',-20,20,1,3,'m'),control('roverClock','Rover clock distance',-60,60,1,40,'m'),control('decorrelation','Rover error that differs from the base',0,.5,.05,0,'× d'),control('baseNoise','Base noise and multipath σ',0,3,.1,.5,'m'),control('roverNoise','Rover noise and multipath σ',0,3,.1,.5,'m')],
    render(v,U){
      const z=differential(v),X=m=>430+m*3.1,rows=[['Base: ρᴮ − Rᴮ',[[v.baseClock,U.C.c],[v.shared,U.C.b]],v.baseNoise],['Correction sent',[[z.correction,U.C.b]],0],['Rover before',[[v.roverClock,U.C.c],[v.shared*(1+v.decorrelation),U.C.b]],v.roverNoise],['Rover after',[[v.roverClock,U.C.c],[v.shared*v.decorrelation,U.C.d]],z.sigma]];
      let s=U.text(30,28,'Pseudorange residual ledger in metres for one satellite')+U.line(X(0),50,X(0),400,U.C.ink,1.2)+U.text(X(0),418,'0 m','middle',U.C.muted);
      for(const m of [-80,-40,40,80])s+=U.line(X(m),50,X(m),400,U.C.grid,1,'2 4')+U.text(X(m),418,m+' m','middle',U.C.muted);
      rows.forEach(([label,parts,sigma],i)=>{
        const y=78+i*84;let start=0;s+=U.text(30,y+22,label);
        for(const [len,color] of parts){if(Math.abs(len)>1e-9)s+=`<rect x="${Math.min(X(start),X(start+len))}" y="${y}" width="${Math.abs(X(start+len)-X(start))}" height="34" fill="${color}" opacity=".75"/>`;start+=len;}
        s+=U.text(Math.min(770,Math.max(X(start)+(start>=0?10:-10),190)),y+22,U.fmt(start,2)+' m',start>=0?'start':'end');
        if(sigma>0)s+=U.line(X(start-sigma),y+44,X(start+sigma),y+44,U.C.ink,2)+U.line(X(start-sigma),y+38,X(start-sigma),y+50,U.C.ink,2)+U.line(X(start+sigma),y+38,X(start+sigma),y+50,U.C.ink,2);
      });
      s+=U.text(30,446,'Purple: receiver clock · Orange: shared error · Magenta: unshared error · whiskers: ±1σ');
      return{svg:U.svg(s,'Differential correction ledger from a surveyed base receiver to a rover',800,460),
        stats:[['Correction sent',`${U.fmt(z.correction,2)} m`],['Rover residual after correction',`${U.fmt(z.after,2)} m`],['Remaining noise σ',`${U.fmt(z.sigma,3)} m`]],
        equation:'ρ<sub>i</sub><sup>B</sup> = R<sub>i</sub><sup>B</sup> + b<sup>B</sup> + d<sub>i</sub> + ν<sub>i</sub><sup>B</sup>; d̂<sub>i</sub> = ρ<sub>i</sub><sup>B</sup> − R<sub>i</sub><sup>B</sup> − b̂<sup>B</sup>; ρ<sub>i,corr</sub><sup>U</sup> = ρ<sub>i</sub><sup>U</sup> − d̂<sub>i</sub> ≈ R<sub>i</sub><sup>U</sup> + b<sup>U</sup> + ν<sub>i</sub><sup>U</sup> − ν<sub>i</sub><sup>B</sup>',
        note:'The base knows its surveyed geometric range and removes its own clock before sending a satellite-specific correction. The rover still solves for its own clock. Base and rover noise are independent, so they add in quadrature; any error that differs between the two sites passes through.'};
    },
    checks:()=>{
      const z=differential({shared:8,baseClock:3,roverClock:40,decorrelation:0,baseNoise:.5,roverNoise:.5});
      return[{name:'Ledger example: 11 m base residual, -8 m correction, 48 m to 40 m rover residual',pass:z.base===11&&z.correction===-8&&z.before===48&&z.after===40},
        {name:'Independent base and rover noise add in quadrature',pass:near(z.sigma,Math.SQRT1_2)},
        {name:'Unshared error passes through the correction',pass:near(differential({shared:10,baseClock:0,roverClock:0,decorrelation:.3,baseNoise:0,roverNoise:0}).after,3)}];
    }
  });

  const captions={'ece-grating':'Adjustable line array: visible window, main beam and grating lobes.','ece-eye':'Adjustable raised-cosine eye diagram and worst-case opening at a chosen sampling instant.','ece-packet':'Adjustable header search and symbol-clock drift across a packet.','ece-carrier':'Adjustable carrier frequency and phase offset acting on recovered QPSK points.','ece-scan':'Adjustable station and antenna aim: ground look angles and the satellite scan angle.','ece-dish-feed':'Adjustable dish focal ratio and feed pattern: spillover, edge taper and aperture efficiency.','ece-dll':'Adjustable early–late tracking with one delayed echo.','ece-tdoa':'Adjustable receiver position, clock bias and range-difference tolerance.','ece-dgps':'Adjustable differential-correction ledger for one satellite.'};
  for(const model of models)if(captions[model.id])model.caption=captions[model.id];
  window.ECE6390TimingGeometry={grating,arrayFactor,raisedCosine,eyeOpening,packet,carrier,scan,dish,silver,tracking,hyperbola,tdoa,differential,models:()=>models.filter(m=>captions[m.id])};
})();
