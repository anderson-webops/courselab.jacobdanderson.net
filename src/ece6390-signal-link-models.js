/* Original ECE6390 signal-representation, modulation, GPS-signal, coding-gain and link-margin models. */
(() => {
  'use strict';
  const models=window.CourseFigureRegistry||(window.CourseFigureRegistry=[]);
  const shared=window.ECE6390TimingGeometry?.helpers,q=window.ECE6390Teaching?.q;
  if(!shared||!q)throw new Error('ECE 6390 signal models need the timing-geometry helpers and the Q function loaded first.');
  const {frame,curve,samples,dotMark,control,near,wrap,sinc}=shared;
  const tau=2*Math.PI,rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI,log10=Math.log10,db=x=>10*log10(x);
  const choice=(id,label,options,value)=>({...control(id,label,Math.min(...options.map(o=>o[0])),Math.max(...options.map(o=>o[0])),1,value),options:options.map(([v,l])=>({value:v,label:l}))});
  const stem=(U,X,Y,x,y,color,width=2)=>U.line(X(x),Y(0),X(x),Y(y),color,width);

  // 1. FFT frequency grid: native storage order, fftshift order and the continuous-transform scale.
  const fftGrid=v=>{
    const N=v.n,M=N*v.pad,dt=v.dt,re=new Array(M).fill(0),im=new Array(M).fill(0),x=new Array(M).fill(0);
    for(let n=0;n<N;n++){const t=(n-N/2)*dt;x[n]=Math.exp(-t*t/(2*v.sigma*v.sigma));}
    const c=Array.from({length:M},(_,k)=>Math.cos(tau*k/M)),s=Array.from({length:M},(_,k)=>Math.sin(tau*k/M));
    for(let k=0;k<M;k++){let a=0,b=0;for(let n=0;n<N;n++){const i=(k*n)%M;a+=x[n]*c[i];b-=x[n]*s[i];}re[k]=a*dt;im[k]=b*dt;}
    const mag=re.map((r,k)=>Math.hypot(r,im[k])),df=1/(M*dt),freq=k=>(k<M/2?k:k-M)*df;
    return{N,M,dt,fs:1/dt,df,mag,freq,x,peak:v.sigma*Math.sqrt(tau)};
  };
  models.push({id:'ece-fft',controls:[choice('n','Samples N in the record',[[16,'16'],[32,'32'],[64,'64'],[128,'128']],64),control('dt','Sample interval Δt',.01,.2,.01,.05,'s'),control('sigma','Gaussian pulse width σ',.1,1,.05,.25,'s'),control('pad','Zero-padding factor (1 = none)',1,4,1,1,'×')],
    render(v,U){
      const z=fftGrid(v),ymax=z.peak*1.15,top=frame(U,{x:84,y:46,w:686,h:140,xmin:0,xmax:z.M,ymin:0,ymax,xticks:[0,z.M/4,z.M/2,3*z.M/4,z.M],yticks:[0,ymax/2],xfmt:x=>U.fmt(x,0),yfmt:y=>U.fmt(y,3),xlabel:'Native FFT storage index k',ylabel:'|Δt·Xₖ| (V·s)'});
      let s=U.text(84,28,'Native order: DC first, positive frequencies (teal), then negative frequencies (orange)')+top.s;
      z.mag.forEach((m,k)=>{s+=stem(U,top.X,top.Y,k+.5,m,k<z.M/2?U.C.a:U.C.b,z.M>256?1:1.6);});
      const bottom=frame(U,{x:84,y:290,w:686,h:140,xmin:-z.fs/2,xmax:z.fs/2,ymin:0,ymax,xticks:samples(-z.fs/2,z.fs/2,4),yticks:[0,ymax/2],xfmt:x=>U.fmt(x,2),yfmt:y=>U.fmt(y,3),xlabel:'Frequency f (Hz) after fftshift',ylabel:'|P(f)| (V·s)'});
      s+=U.text(84,272,'After fftshift: the same values reordered around DC; dashed curve is the continuous transform')+bottom.s;
      z.mag.forEach((m,k)=>{const f=z.freq(k);s+=stem(U,bottom.X,bottom.Y,f,m,f>=0?U.C.a:U.C.b,z.M>256?1:1.6);});
      s+=curve(U,f=>z.peak*Math.exp(-2*Math.PI*Math.PI*v.sigma*v.sigma*f*f),bottom.X,bottom.Y,samples(-z.fs/2,z.fs/2,300),U.C.ink,1.4,'5 4');
      return{svg:U.svg(s,'FFT magnitude in native storage order and after fftshift',800,500),
        stats:[['Sampling rate fₛ',`${U.fmt(z.fs,3)} Hz`],['Bin spacing Δf',`${U.fmt(z.df,4)} Hz`],['Plotted bins',`${z.M} (${z.N} measured samples)`]],
        equation:'f<sub>s</sub> = 1/Δt; Δf = f<sub>s</sub>/M; X<sub>k</sub> = Σ<sub>n</sub> p<sub>n</sub>e<sup>−j2πkn/M</sup>; P(f<sub>k</sub>) ≈ Δt·X<sub>k</sub>; bins k ≥ M/2 hold f = (k − M)Δf',
        note:'A Gaussian pulse p(t) = exp(−t²/2σ²) in volts, sampled N times and zero-padded to M samples. Zero padding interpolates the plotted spectrum on a finer grid; it does not lengthen the measured record or improve its true resolution. A pulse that is too narrow for Δt aliases, so the stems no longer follow the dashed curve.'};
    },
    checks:()=>{
      const z=fftGrid({n:64,dt:.05,sigma:.25,pad:1}),energyT=z.x.reduce((a,b)=>a+b*b,0)*z.dt,energyF=z.mag.reduce((a,b)=>a+b*b,0)*z.df;
      return[{name:'N = 64 and Δt = 0.05 s give fs = 20 Hz and Δf = 0.3125 Hz',pass:near(z.fs,20)&&near(z.df,.3125)},
        {name:'Discrete Parseval relation holds with the Δt scale',pass:near(energyT,energyF,1e-9)},
        {name:'Scaled DC bin matches the continuous Gaussian area σ√(2π)',pass:near(z.mag[0],z.peak,1e-6)},
        {name:'Zero padding refines the grid without changing the DC value',pass:near(fftGrid({n:64,dt:.05,sigma:.25,pad:4}).df,.3125/4)&&near(fftGrid({n:64,dt:.05,sigma:.25,pad:4}).mag[0],z.mag[0])}];
    }
  });

  // 2. Sinc reconstruction from uniform samples, including truncation and aliasing.
  const reconstruct=v=>{
    const f0=v.f0,phi=rad(v.phase),x=t=>Math.cos(tau*f0*t+phi),K=v.terms;
    const xr=t=>{let s=0;for(let n=-K;n<=K;n++)s+=x(n)*sinc(t-n);return s;};
    const ts=samples(-4,4,400),rec=ts.map(xr),err=ts.map((t,i)=>rec[i]-x(t));
    const apparent=f0<=.5?f0:1-f0;
    return{x,xr,ts,rec,err,apparent,maxErr:Math.max(...err.map(Math.abs)),alias:f0>.5,aliasCurve:t=>Math.cos(tau*(1-f0)*t-phi)};
  };
  models.push({id:'ece-reconstruct',controls:[control('f0','Signal frequency (cycles per sample)',.05,.95,.01,.18),control('terms','Sinc terms on each side of t = 0',1,60,1,12),control('phase','Signal phase',0,180,15,30,'°')],
    render(v,U){
      const z=reconstruct(v),top=frame(U,{x:84,y:46,w:686,h:200,xmin:-4,xmax:4,ymin:-1.6,ymax:1.6,xticks:[-4,-2,0,2,4],yticks:[-1,0,1],xfmt:x=>x?(x<0?'−':'')+Math.abs(x)+'T':'0',xlabel:'Time t (sample intervals T)',ylabel:'Amplitude'});
      let s=U.text(84,28,'Each sample scales a sinc pulse; their sum (teal) rebuilds the signal between samples')+top.s;
      for(const n of [-1,0,1])s+=curve(U,t=>z.x(n)*sinc(t-n),top.X,top.Y,samples(-4,4,240),U.C.c,1,'3 3');
      s+=curve(U,z.x,top.X,top.Y,samples(-4,4,400),U.C.ink,1.4,'6 4');
      if(z.alias)s+=curve(U,z.aliasCurve,top.X,top.Y,samples(-4,4,400),U.C.b,1.8,'2 3');
      s+=U.path(z.ts.map((t,i)=>[top.X(t),top.Y(z.rec[i])]),U.C.a,2.4);
      for(let n=-4;n<=4;n++)s+=dotMark(U,top.X(n),top.Y(z.x(n)),U.C.b,5);
      const lim=Math.max(.02,z.maxErr*1.2),bottom=frame(U,{x:84,y:330,w:686,h:110,xmin:-4,xmax:4,ymin:-lim,ymax:lim,xticks:[-4,-2,0,2,4],yticks:[-lim,0,lim],xfmt:x=>x?(x<0?'−':'')+Math.abs(x)+'T':'0',yfmt:y=>U.fmt(y,3),xlabel:'Time t (sample intervals T)',ylabel:'Error'});
      s+=U.text(84,312,z.alias?'Reconstruction minus original: the samples describe the orange alias, not the original':'Reconstruction minus original: finite-sum truncation error')+bottom.s+U.path(z.ts.map((t,i)=>[bottom.X(t),bottom.Y(z.err[i])]),U.C.d,2);
      return{svg:U.svg(s,'Sinc reconstruction of a sampled cosine with its error',800,500),
        stats:[['Frequency the samples describe',`${U.fmt(z.apparent,3)} cycles/sample`],['Largest error for |t| ≤ 4T',U.fmt(z.maxErr,4)],['Sinc terms in the sum',String(2*v.terms+1)]],
        equation:'x(t) = Σ<sub>n</sub> x[n]·sinc((t − nT)/T), sinc(v) = sin(πv)/(πv); unambiguous only when the signal frequency stays below f<sub>s</sub>/2 = 0.5 cycles/sample',
        note:'Black dashed: the original cosine. Orange dots: its samples. Purple dotted: three of the scaled sinc terms. Every sinc term is one at its own sample and zero at every other, so the sum passes exactly through the samples; between samples a finite sum leaves a truncation error that shrinks as more terms are added.'};
    },
    checks:()=>{
      const z=reconstruct({f0:.18,terms:12,phase:30}),far=reconstruct({f0:.18,terms:60,phase:30}),alias=reconstruct({f0:.7,terms:400,phase:0});
      return[{name:'The sum reproduces every sample exactly',pass:Array.from({length:9},(_,i)=>i-4).every(m=>Math.abs(z.xr(m)-z.x(m))<1e-12)},
        {name:'More sinc terms shrink the truncation error',pass:far.maxErr<z.maxErr},
        {name:'A 0.7 cycle/sample cosine reconstructs as its 0.3 alias',pass:Math.abs(alias.xr(.5)-Math.cos(tau*.3*.5))<.01}];
    }
  });

  // 3. μ-law companding: compress, quantize uniformly, expand.
  const compress=(x,mu)=>mu<=0?x:Math.sign(x)*Math.log1p(mu*Math.abs(x))/Math.log1p(mu);
  const expand=(y,mu)=>mu<=0?y:Math.sign(y)*Math.expm1(Math.abs(y)*Math.log1p(mu))/mu;
  const quantize=(y,bits)=>{const L=2**bits,step=2/(L-1);return Math.max(-1,Math.min(1,Math.round((y+1)/step)*step-1));};
  // Golden-ratio phases cover the cycle evenly without locking to the quantizer grid.
  const sqnr=(amplitude,mu,bits)=>{let s=0,e=0;for(let i=0;i<1600;i++){const x=amplitude*Math.sin(tau*((i*.6180339887498949)%1)),xh=expand(quantize(compress(x,mu),bits),mu);s+=x*x;e+=(xh-x)**2;}return db(s/Math.max(e,1e-300));};
  models.push({id:'ece-mulaw',controls:[control('mu','Compression parameter μ (0 = uniform)',0,255,5,255),control('bits','Bits per sample',3,8,1,6),control('level','Sinusoid amplitude',-40,0,1,-20,'dB re full scale')],
    render(v,U){
      const top=frame(U,{x:84,y:46,w:300,h:300,xmin:-1,xmax:1,ymin:-1,ymax:1,xticks:[-1,0,1],yticks:[-1,0,1],xlabel:'Input x (full scale = 1)',ylabel:'Compressed F(x)'});
      let s=U.text(36,28,'Compressor and the input steps it creates')+top.s+U.path([[top.X(-1),top.Y(-1)],[top.X(1),top.Y(1)]],U.C.muted,1.2,'5 4');
      s+=curve(U,x=>compress(x,v.mu),top.X,top.Y,samples(-1,1,300),U.C.a,2.4);
      const L=2**v.bits,levels=Array.from({length:L},(_,i)=>expand(-1+2*i/(L-1),v.mu));
      for(const x of levels)s+=U.line(top.X(x),346,top.X(x),356,U.C.b,1.4);
      const right=frame(U,{x:480,y:46,w:290,h:300,xmin:-40,xmax:0,ymin:0,ymax:55,xticks:[-40,-30,-20,-10,0],yticks:[0,10,20,30,40,50],xlabel:'Input level (dB re full scale)',ylabel:'SQNR (dB)'});
      s+=U.text(430,28,'SQNR against input level')+right.s;
      const lv=samples(-40,0,40);
      s+=U.path(lv.map(l=>[right.X(l),right.Y(sqnr(10**(l/20),0,v.bits))]),U.C.b,2,'6 4')+U.path(lv.map(l=>[right.X(l),right.Y(sqnr(10**(l/20),v.mu,v.bits))]),U.C.a,2.6);
      const a=10**(v.level/20),mu=sqnr(a,v.mu,v.bits),uni=sqnr(a,0,v.bits);
      s+=U.line(right.X(v.level),46,right.X(v.level),346,U.C.ink,1,'3 4')+dotMark(U,right.X(v.level),right.Y(mu),U.C.a,5)+dotMark(U,right.X(v.level),right.Y(uni),U.C.b,5);
      s+=U.text(36,420,'Orange ticks: reconstruction levels mapped back to the input; dense near zero.')+U.text(36,446,'Teal: companded SQNR.   Orange dashed: uniform quantizer with the same bits.');
      const steps=levels.slice(1).map((x,i)=>x-levels[i]);
      return{svg:U.svg(s,'Mu-law compressor curve and SQNR against input level',800,460),
        stats:[['SQNR at the selected level',`companded ${U.fmt(mu,1)} dB, uniform ${U.fmt(uni,1)} dB`],['Smallest input step',U.fmt(Math.min(...steps),4)],['Largest input step',U.fmt(Math.max(...steps),4)]],
        equation:'F(x) = sgn(x)·ln(1 + μ|x|)/ln(1 + μ); quantize F(x) with 2<sup>b</sup> levels; x̂ = F<sup>−1</sup>(y) = sgn(y)·[(1 + μ)<sup>|y|</sup> − 1]/μ',
        note:'A sinusoid sampled at 1600 evenly spread phases passes through the compressor, an endpoint quantizer with 2ᵇ levels between −1 and 1, and the expander. Companding spends fine steps on quiet signals and coarse steps on loud ones, so SQNR stays nearly flat across a wide input range at the cost of a few dB at full scale.'};
    },
    checks:()=>{
      const L=2**8,ideal=db(1.5*(L-1)**2);
      return[{name:'Compressor maps full scale to full scale and inverts exactly',pass:near(compress(1,255),1)&&[-.9,-.01,.003,.5].every(x=>near(expand(compress(x,255),255),x,1e-12))},
        {name:'Uniform 8-bit full-scale SQNR is within 0.6 dB of the uniform-error estimate 1.5(L − 1)²',pass:Math.abs(sqnr(1,0,8)-ideal)<.6},
        {name:'At −30 dB, μ = 255 companding beats uniform 8-bit quantization by over 10 dB',pass:sqnr(10**(-30/20),255,8)-sqnr(10**(-30/20),0,8)>10},
        {name:'μ = 0 reduces to the plain uniform quantizer',pass:(()=>{let sig=0,err=0;for(let i=0;i<1600;i++){const x=.1*Math.sin(tau*((i*.6180339887498949)%1));sig+=x*x;err+=(quantize(x,6)-x)**2;}return near(sqnr(.1,0,6),db(sig/err),1e-12)&&compress(.3,0)===.3&&expand(.3,0)===.3;})()}];
    }
  });

  // 4. Differential QPSK and π/4-DQPSK: information in phase changes.
  const DQPSK={'10':0,'11':90,'00':-90,'01':180},PI4={'00':45,'01':135,'11':-135,'10':-45};
  const wordList=['11','10','00','01','11','00','10','01','00','11','01','10','10','00','11','01'];
  const differential=v=>{
    const map=v.scheme?PI4:DQPSK,words=wordList.slice(0,v.count),entries=Object.entries(map);
    let phase=0;const sent=[0],received=[deg(0)-v.rotation];
    words.forEach((w,k)=>{phase+=map[w];sent.push(phase);received.push(phase-v.rotation-(k+1)*v.slip);});
    const decoded=words.map((w,k)=>{const d=wrap(received[k+1]-received[k]);return entries.reduce((best,[word,inc])=>Math.abs(wrap(d-inc))<Math.abs(wrap(d-best[1]))?[word,inc]:best,entries[0]);});
    const jumps=words.map(w=>Math.abs(map[w]));
    return{map,words,sent,received,decoded,correct:decoded.filter((d,k)=>d[0]===words[k]).length,locations:new Set(sent.map(p=>((p%360)+360)%360)).size,maxJump:Math.max(...jumps)};
  };
  models.push({id:'ece-dqpsk',controls:[choice('scheme','Differential scheme',[[1,'Alternating sets (π/4-DQPSK)'],[0,'Four phases (DQPSK)']],0),control('rotation','Unknown common carrier rotation ε',-180,180,1,37,'°'),control('slip','Extra phase drift per symbol',-60,60,5,0,'°'),control('count','Symbols sent',4,16,1,8)],
    render(v,U){
      const z=differential(v),cx=190,cy=245,R=140;
      let s=U.text(30,28,v.scheme?'π/4-DQPSK: alternating four-point sets':'DQPSK: four absolute phases')+U.circle(cx,cy,R,'none',U.C.grid)+U.line(cx-165,cy,cx+165,cy,U.C.grid)+U.line(cx,cy-165,cx,cy+165,U.C.grid)+U.text(cx+168,cy-6,'I','end')+U.text(cx+8,cy-152,'Q');
      const allowed=v.scheme?[0,45,90,135,180,225,270,315]:[0,90,180,270];
      for(const a of allowed)s+=U.circle(cx+R*Math.cos(rad(a)),cy-R*Math.sin(rad(a)),9,'none',U.C.muted);
      z.received.forEach((p,k)=>{const a=rad(p),r=R-6*Math.min(k,12);s+=dotMark(U,cx+r*Math.cos(a),cy-r*Math.sin(a),k?U.C.a:U.C.c,4)+U.text(cx+(r-22)*Math.cos(a),cy-(r-22)*Math.sin(a)+5,String(k),'middle',U.C.muted);});
      s+=U.text(30,440,'Grey rings: allowed transmitted phases. Teal: received points (0 = reference).');
      const rows=[['k','sent','Δφ','measured','decoded']];
      z.words.forEach((w,k)=>rows.push([String(k+1),w,`${z.map[w]}°`,`${U.fmt(wrap(z.received[k+1]-z.received[k]),0)}°`,z.decoded[k][0]]));
      const xs=[440,486,546,612,706],rowH=Math.min(24,330/rows.length);
      rows.forEach((r,i)=>{const y=60+i*rowH,ok=i===0||z.decoded[i-1][0]===z.words[i-1];r.forEach((cell,j)=>{s+=U.text(xs[j],y,cell,'start',i===0?U.C.muted:j===4?(ok?U.C.a:U.C.d):U.C.ink);});});
      return{svg:U.svg(s,'Differential phase encoding with a common rotation and per-symbol drift',800,460),
        stats:[['Words decoded correctly',`${z.correct} of ${z.words.length}`],['Absolute phase locations visited',String(z.locations)],['Largest phase change',`${z.maxJump}°`]],
        equation:'φ<sub>k</sub> = φ<sub>k−1</sub> + Δφ<sub>k</sub>; r<sub>k</sub>r*<sub>k−1</sub> = E<sub>s</sub>e<sup>j(Δφ<sub>k</sub> − ε<sub>k</sub> + ε<sub>k−1</sub>)</sup>; a constant ε cancels, a per-symbol drift does not',
        note:'Bit-to-phase-change mapping follows the class convention for DQPSK (10 → 0°, 11 → +90°, 00 → −90°, 01 → 180°); π/4-DQPSK uses ±45° and ±135° (00 → 45°, 01 → 135°, 11 → −135°, 10 → −45°). No noise. Decoding picks the allowed change nearest the measured angle between consecutive received points, so a drift above 45° per symbol produces errors.'};
    },
    checks:()=>{
      const ex=differential({scheme:0,rotation:0,slip:0,count:4}),rot=differential({scheme:0,rotation:137,slip:0,count:16}),pi4=differential({scheme:1,rotation:-80,slip:0,count:16});
      return[{name:'Words 11, 10, 00, 01 from 0° give phases 90°, 90°, 0°, 180°',pass:ex.sent.slice(1).join()==='90,90,0,180'},
        {name:'A constant carrier rotation cancels in every differential decision',pass:rot.correct===16&&pi4.correct===16},
        {name:'π/4-DQPSK alternates between the 0°/90° set and the 45° set and never jumps 180°',pass:pi4.sent.every((p,k)=>(((p%90)+90)%90)===(k%2?45:0))&&pi4.maxJump===135},
        {name:'A 50° drift per symbol breaks DQPSK decisions',pass:differential({scheme:0,rotation:0,slip:50,count:16}).correct<16}];
    }
  });

  // 5. Multiplying by a carrier moves message frequencies into sidebands.
  const sidebands=v=>{
    const lines=v.mode===2?[[v.fc+v.fm,v.ac/2]]:v.mode===1?[[v.fc-v.fm,v.ac/2],[v.fc,v.ac],[v.fc+v.fm,v.ac/2]]:[[v.fc-v.fm,v.ac/2],[v.fc+v.fm,v.ac/2]];
    const m=t=>Math.cos(tau*v.fm*t),s=t=>v.mode===2?v.ac/2*Math.cos(tau*(v.fc+v.fm)*t):v.ac*((v.mode===1?1:0)+m(t))*Math.cos(tau*v.fc*t);
    const width=v.mode===2?v.fm:2*v.fm,power=lines.reduce((a,[,amp])=>a+amp*amp/2,0);
    return{lines,m,s,width,power};
  };
  models.push({id:'ece-sidebands',controls:[control('fm','Message frequency fₘ',.5,4,.5,1,'Hz'),control('fc','Carrier frequency f_c',6,20,1,8,'Hz'),choice('mode','Modulation',[[1,'Conventional AM (carrier added)'],[0,'Double sideband, suppressed carrier'],[2,'Upper single sideband']],0),control('ac','Carrier amplitude A_c',.5,2,.1,1,'V')],
    render(v,U){
      const z=sidebands(v),top=frame(U,{x:84,y:46,w:686,h:160,xmin:0,xmax:2,ymin:-2*v.ac-.2,ymax:2*v.ac+.2,xticks:[0,.5,1,1.5,2],yticks:[-2*v.ac,0,2*v.ac],yfmt:y=>U.fmt(y,2),xlabel:'Time t (s)',ylabel:'Voltage (V)'});
      let s=U.text(84,28,'Message (purple, dashed) and the transmitted waveform (teal)')+top.s;
      s+=curve(U,t=>v.ac*z.m(t),top.X,top.Y,samples(0,2,300),U.C.c,1.6,'6 4')+curve(U,z.s,top.X,top.Y,samples(0,2,1400),U.C.a,1.4);
      const fmax=26,bottom=frame(U,{x:84,y:300,w:686,h:140,xmin:0,xmax:fmax,ymin:0,ymax:2.2,xticks:[0,5,10,15,20,25],yticks:[0,1,2],xlabel:'Frequency (Hz), positive half',ylabel:'Cosine amplitude (V)'});
      s+=U.text(84,282,'Spectral lines: the message tone reappears beside the carrier')+bottom.s+U.line(bottom.X(v.fc),300,bottom.X(v.fc),440,U.C.muted,1,'3 4');
      for(const [f,a] of z.lines){s+=U.line(bottom.X(f),bottom.Y(0),bottom.X(f),bottom.Y(a),f===v.fc?U.C.b:U.C.a,4)+U.text(bottom.X(f),bottom.Y(a)-8,U.fmt(f,2)+' Hz','middle',f===v.fc?U.C.b:U.C.a);}
      s+=dotMark(U,bottom.X(v.fm),bottom.Y(0),U.C.c,5)+U.text(bottom.X(v.fm),bottom.Y(0)-12,'fₘ','middle',U.C.c);
      return{svg:U.svg(s,'Modulated waveform and its positive-frequency spectral lines',800,500),
        stats:[['Spectral lines',z.lines.map(([f])=>U.fmt(f,2)+' Hz').join(', ')],['Occupied width',`${U.fmt(z.width,2)} Hz`],['Average power into 1 Ω',`${U.fmt(z.power,3)} W`]],
        equation:'A<sub>c</sub>cos(2πf<sub>m</sub>t)·cos(2πf<sub>c</sub>t) = (A<sub>c</sub>/2)cos[2π(f<sub>c</sub> − f<sub>m</sub>)t] + (A<sub>c</sub>/2)cos[2π(f<sub>c</sub> + f<sub>m</sub>)t]',
        note:'One message tone of unit amplitude. Conventional AM adds a constant 1 before multiplying, which puts a carrier line at f_c; upper single sideband keeps only the f_c + fₘ line. Each cosine of amplitude a carries a²/2 W into 1 Ω. A real message with many frequencies up to B produces bands of width 2B (double sideband) or B (single sideband).'};
    },
    checks:()=>{
      const z=sidebands({fm:1,fc:8,mode:0,ac:1}),ts=samples(0,2,500),identity=ts.every(t=>Math.abs(z.s(t)-(.5*Math.cos(tau*7*t)+.5*Math.cos(tau*9*t)))<1e-12);
      return[{name:'Product identity: 1 Hz message on an 8 Hz carrier is two 0.5 V cosines at 7 and 9 Hz',pass:identity&&z.lines.map(l=>l.join()).join(';')==='7,0.5;9,0.5'},
        {name:'Conventional AM adds a carrier line of amplitude A_c',pass:sidebands({fm:1,fc:8,mode:1,ac:2}).lines.some(([f,a])=>f===8&&a===2)},
        {name:'Single sideband halves the occupied width',pass:sidebands({fm:2,fc:10,mode:2,ac:1}).width===2&&sidebands({fm:2,fc:10,mode:0,ac:1}).width===4}];
    }
  });

  // 6. Legacy GPS signal plan and navigation-message time scales.
  const C=299792458,signal={ca:1.023e6,p:10.23e6,L1:1575.42e6,L2:1227.6e6};
  const gps=v=>{
    const rate=v.code?signal.p:signal.ca,present=v.carrier===0||v.code===1;
    return{rate,present,chip:C/rate,null:2*rate,periods:v.code?null:v.integration,crosses:v.integration>20,frame:1500/50,subframe:300/50,perBit:20e-3/1e-3};
  };
  models.push({id:'ece-gpsplan',controls:[choice('carrier','Carrier',[[1,'L2 1227.60 MHz'],[0,'L1 1575.42 MHz']],0),choice('code','Highlighted code',[[1,'P(Y) (10.23 Mchip/s)'],[0,'C/A (1.023 Mchip/s)']],0),control('integration','Coherent integration time',1,40,1,10,'ms')],
    render(v,U){
      const z=gps(v),top=frame(U,{x:84,y:46,w:686,h:150,xmin:-25,xmax:25,ymin:0,ymax:1.1,xticks:[-20,-10,0,10,20],yticks:[0,1],xlabel:`Offset from the ${v.carrier?'L2':'L1'} carrier (MHz)`,ylabel:'Relative PSD'});
      let s=U.text(84,28,`Rectangular-chip spectra on ${v.carrier?'L2: legacy P(Y) only':'L1: C/A and P(Y) share the carrier'}`)+top.s;
      const comps=v.carrier?[['P(Y)',signal.p,U.C.c]]:[['C/A',signal.ca,U.C.a],['P(Y)',signal.p,U.C.c]];
      for(const [name,rate,color] of comps){const sel=(name==='C/A')===(v.code===0);s+=curve(U,f=>sinc(f*1e6/rate)**2,top.X,top.Y,samples(-25,25,900),color,sel?3:1.4,sel?'':'5 4');s+=U.text(top.X(rate/1e6)+6,top.Y(.32)+(name==='C/A'?0:22),`${name} first null ±${U.fmt(rate/1e6,3)} MHz`,'start',color);}
      if(!z.present)s+=U.text(427,120,'Legacy L2 carries no C/A code','middle',U.C.d);
      const lt=x=>84+(x+8)/10.5*686,bottomY=300;
      s+=U.text(84,272,'Nested time scales on a logarithmic axis (seconds)')+U.line(84,bottomY+120,770,bottomY+120,U.C.grid);
      for(let e=-7;e<=2;e++)s+=U.line(lt(e),bottomY+116,lt(e),bottomY+124,U.C.muted)+U.text(lt(e),bottomY+142,'10'+(e<0?'⁻':'')+String(Math.abs(e)).split('').map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join(''),'middle',U.C.muted);
      const bars=[['P(Y) chip 97.8 ns',97.75e-9,U.C.c],['C/A chip 977.5 ns',977.5e-9,U.C.a],['C/A code period 1 ms',1e-3,U.C.a],['Data bit 20 ms',20e-3,U.C.b],['Subframe 6 s',6,U.C.b],['Frame 30 s',30,U.C.b]];
      bars.forEach(([label,t,color],i)=>{const y=bottomY+4+i*18;s+=`<rect x="84" y="${y}" width="${lt(log10(t))-84}" height="10" fill="${color}" opacity=".7"/>`+U.text(lt(log10(t))+6,y+10,label,'start',color);});
      s+=U.line(lt(log10(v.integration*1e-3)),bottomY-6,lt(log10(v.integration*1e-3)),bottomY+120,U.C.d,2,'4 3')+U.text(lt(log10(v.integration*1e-3))-6,bottomY-10,`${v.integration} ms integration`,'end',U.C.d);
      return{svg:U.svg(s,'Legacy GPS code spectra and navigation-message time scales',800,470),
        stats:[['Chip rate and chip length',`${U.fmt(z.rate/1e6,3)} Mchip/s, ${U.fmt(z.chip,1)} m`],['First-null bandwidth',`${U.fmt(z.null/1e6,3)} MHz`],['Coherent integration',z.crosses?`${v.integration} ms crosses data-bit edges`:`${v.integration} ms inside one 20 ms bit`]],
        equation:'first-null width = 2R<sub>c</sub>; chip length = c/R<sub>c</sub>; C/A period = 1023/R<sub>c</sub> = 1 ms; 20 periods per 50 bit/s data bit; 300-bit subframe = 6 s; 1500-bit frame = 30 s',
        note:'Legacy components only: L1 carries C/A and P(Y), L2 carries P(Y). Each envelope is normalized to its own peak, so the plot compares widths rather than powers. Integrating coherently past 20 ms spans a possible data-bit sign change, which the receiver must remove first.'};
    },
    checks:()=>{
      const ca=gps({carrier:0,code:0,integration:10}),p=gps({carrier:1,code:1,integration:30});
      return[{name:'C/A: 2.046 MHz first-null width and 293.05 m chips',pass:near(ca.null,2.046e6)&&Math.abs(ca.chip-293.05)<.01},
        {name:'P(Y): 20.46 MHz first-null width',pass:near(p.null,20.46e6)},
        {name:'Message timing: 6 s subframes, 30 s frames, 20 code periods per bit',pass:ca.subframe===6&&ca.frame===30&&near(ca.perBit,20)},
        {name:'Integration beyond 20 ms is flagged as crossing data bits',pass:p.crosses&&!ca.crosses}];
    }
  });

  // 7. Coding gain read horizontally at a common post-decoder error rate.
  const coded=(ebn,v)=>Math.min(.5,v.mult*q(Math.sqrt(2*v.rate*v.dmin*10**(ebn/10))));
  const uncoded=ebn=>q(Math.sqrt(2*10**(ebn/10)));
  const required=(f,target)=>{let lo=-10,hi=25;for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(f(mid)>target)lo=mid;else hi=mid;}return(lo+hi)/2;};
  const codingGain=v=>{const target=10**(-v.target),u=required(uncoded,target),c=required(e=>coded(e,v),target);return{target,u,c,gain:u-c,asymptotic:db(v.rate*v.dmin),shift:-db(v.rate)};};
  models.push({id:'ece-codinggain',controls:[control('rate','Code rate r',.25,1,.05,.5),control('dmin','Minimum distance d',1,15,1,10),control('mult','Error multiplicity B',1,50,1,36),control('target','Target bit-error rate 10⁻ⁿ, n =',3,9,1,6),choice('mistake','Coded-bit energy axis',[[1,'Show the misleading comparison'],[0,'Hidden']],0)],
    render(v,U){
      const z=codingGain(v),f=frame(U,{x:84,y:46,w:686,h:330,xmin:0,xmax:14,ymin:-10,ymax:0,xticks:[0,2,4,6,8,10,12,14],yticks:[-10,-8,-6,-4,-2,0],yfmt:y=>'10'+(y?'⁻'+String(-y).split('').map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join(''):'⁰'),xlabel:'Eb,info/N₀ (dB)',ylabel:'Post-decoder bit-error rate'});
      let s=U.text(84,28,'Read coding gain horizontally at one target error rate')+f.s;
      const lg=p=>Math.max(-10,log10(Math.max(p,1e-12)));
      const above=(g,color,width,dash='')=>U.path(samples(0,14,280).filter(e=>g(e)>1e-10).map(e=>[f.X(e),f.Y(lg(g(e)))]),color,width,dash);
      s+=above(uncoded,U.C.b,2.4)+above(e=>coded(e,v),U.C.a,2.8);
      if(v.mistake)s+=above(e=>coded(e+z.shift,v),U.C.c,2,'6 4');
      s+=U.line(84,f.Y(-v.target),770,f.Y(-v.target),U.C.muted,1.2,'4 4');
      if(z.c>=0&&z.c<=14&&z.u<=14)s+=U.line(f.X(z.c),f.Y(-v.target),f.X(z.u),f.Y(-v.target),U.C.d,3)+dotMark(U,f.X(z.c),f.Y(-v.target),U.C.a,5)+dotMark(U,f.X(z.u),f.Y(-v.target),U.C.b,5)+U.text((f.X(z.c)+f.X(z.u))/2,f.Y(-v.target)-10,`gain ${U.fmt(z.gain,2)} dB`,'middle',U.C.d);
      s+=U.text(84,442,'Orange: uncoded BPSK.  Teal: coded, leading union term.'+(v.mistake?'  Purple: coded curve on the coded-bit axis.':''));
      return{svg:U.svg(s,'Uncoded and coded bit-error curves with the coding gain at a target error rate',800,460),
        stats:[['Coding gain at the target',`${U.fmt(z.gain,2)} dB`],['Asymptotic gain 10·log₁₀(r·d)',`${U.fmt(z.asymptotic,2)} dB`],['Required Eb,info/N₀',`uncoded ${U.fmt(z.u,2)} dB, coded ${U.fmt(z.c,2)} dB`]],
        equation:'P<sub>b,unc</sub> = Q(√(2E<sub>b</sub>/N₀)); P<sub>b,coded</sub> ≈ B·Q(√(2r·d·E<sub>b,info</sub>/N₀)); G<sub>c</sub> = (E<sub>b</sub>/N₀)<sub>unc</sub> − (E<sub>b,info</sub>/N₀)<sub>coded</sub> at P<sub>b</sub> = P★',
        note:`Soft-decision maximum-likelihood decoding on BPSK in white Gaussian noise, using only the leading union-bound term, which is accurate at low error rates. B counts information-bit errors among minimum-distance error events; d = 10, r = 1/2 and B = 36 approximate the common constraint-length-7 convolutional code. The purple curve plots the same code against Eb,coded = r·Eb,info, which would add a false ${U.fmt(z.shift,2)} dB.`};
    },
    checks:()=>{
      const z=codingGain({rate:.5,dmin:10,mult:36,target:9,mistake:0}),low=codingGain({rate:.5,dmin:10,mult:36,target:3,mistake:0});
      return[{name:'Uncoded BPSK needs 9.59 dB for a 10⁻⁵ bit-error rate',pass:Math.abs(required(uncoded,1e-5)-9.59)<.02},
        {name:'Rate 1/2 with d = 10 has a 6.99 dB asymptotic gain',pass:Math.abs(z.asymptotic-6.99)<.005},
        {name:'Gain grows toward the asymptote as the target tightens',pass:z.gain>low.gain&&z.gain<z.asymptotic},
        {name:'Rate 1/2 coded-bit axis shifts the curve by 3.01 dB',pass:Math.abs(z.shift-3.0103)<1e-3}];
    }
  });

  // 8. G/T and link margin for the running GEO downlink.
  const margin=v=>{
    const f=10e9,range=37031e3,lambda=C/f,fs=20*log10(4*Math.PI*range/lambda),gain=db(.6*(Math.PI*v.diameter/lambda)**2),gt=gain-db(v.tsys);
    const cn0=v.eirp-fs-v.rain+gt+228.599,ebn=cn0-db(v.rate*1e6);
    return{fs,gain,gt,cn0,ebn,margin:ebn-v.required};
  };
  models.push({id:'ece-margin',controls:[control('eirp','Satellite EIRP',30,55,.5,40,'dBW'),control('diameter','Ground dish diameter',.45,3,.05,1,'m'),control('tsys','System noise temperature',50,600,10,290,'K'),control('rain','Rain attenuation',0,10,.5,0,'dB'),control('rate','Information bit rate',.5,20,.5,4,'Mbit/s'),control('required','Required Eb/N₀',2,15,.1,10.5,'dB')],
    render(v,U){
      const z=margin(v),steps=[['EIRP (dBW)',v.eirp],['− free-space loss',-z.fs],['− rain attenuation',-v.rain],['+ G/T (dB/K)',z.gt],['− 10·log₁₀k (Boltzmann)',228.599]];
      const X=val=>84+(val+200)/300*686;let s=U.text(84,28,'From EIRP to C/N₀, one step per row (dB)')+U.line(X(0),40,X(0),240,U.C.ink,1);
      for(const m of [-200,-150,-100,-50,0,50,100])s+=U.line(X(m),40,X(m),240,U.C.grid,1,'2 4')+U.text(X(m),256,String(m),'middle',U.C.muted);
      let level=0;steps.forEach(([label,d],i)=>{const y=54+i*38,a=X(level),b=X(level+d);s+=U.text(84,y,`${label}: ${d>=0?'+':'−'}${U.fmt(Math.abs(d),2)} → ${U.fmt(level+d,2)}`)+`<rect x="${Math.min(a,b)}" y="${y+5}" width="${Math.max(1,Math.abs(b-a))}" height="16" fill="${d>=0?U.C.a:U.C.b}" opacity=".75"/>`;level+=d;});
      s+=U.text(84,280,`C/N₀ = ${U.fmt(z.cn0,2)} dB-Hz;  G/T = ${U.fmt(z.gain,2)} dBi − 10·log₁₀(${v.tsys} K) = ${U.fmt(z.gt,2)} dB/K`);
      const f=frame(U,{x:84,y:312,w:686,h:80,xmin:0,xmax:25,ymin:0,ymax:2,xticks:[0,5,10,15,20,25],yticks:[],xlabel:'Eb/N₀ (dB)',ylabel:''});
      s+=U.text(84,302,`Eb/N₀ = C/N₀ − 10·log₁₀(${U.fmt(v.rate,1)} × 10⁶) against the requirement`)+f.s;
      const e=Math.max(0,Math.min(25,z.ebn));s+=`<rect x="84" y="${f.Y(1.6)}" width="${f.X(e)-84}" height="${f.Y(.4)-f.Y(1.6)}" fill="${z.margin>=0?U.C.a:U.C.d}" opacity=".7"/>`;
      s+=U.line(f.X(v.required),312,f.X(v.required),392,U.C.ink,2.5)+U.text(f.X(v.required)+(v.required>20?-6:6),328,'required',v.required>20?'end':'start');
      s+=U.text(84,448,z.margin>=0?`Margin ${U.fmt(z.margin,2)} dB: the link closes`:`Shortfall ${U.fmt(-z.margin,2)} dB: the link does not close`,'start',z.margin>=0?U.C.a:U.C.d);
      return{svg:U.svg(s,'Link budget from EIRP to C/N0 and the Eb/N0 margin',800,460),
        stats:[['G/T',`${U.fmt(z.gt,2)} dB/K`],['C/N₀',`${U.fmt(z.cn0,2)} dB-Hz`],['Link margin',`${U.fmt(z.margin,2)} dB`]],
        equation:'C/N₀ = EIRP − L<sub>FS</sub> − L<sub>rain</sub> + G/T − 10·log₁₀k<sub>B</sub>; G/T = G<sub>r</sub> − 10·log₁₀T<sub>sys</sub>; E<sub>b</sub>/N₀ = C/N₀ − 10·log₁₀R<sub>b</sub>; margin = E<sub>b</sub>/N₀ − (E<sub>b</sub>/N₀)<sub>req</sub>',
        note:`The running 10 GHz geostationary downlink at 37,031 km (free-space loss ${U.fmt(z.fs,2)} dB) to a dish with aperture efficiency 0.6. G/T combines the receive antenna and its noise in one figure of merit. The default requirement, 10.5 dB, is uncoded Gray QPSK at a 10⁻⁶ bit-error rate; a coded waveform would use its own requirement.`};
    },
    checks:()=>{
      const z=margin({eirp:40,diameter:1,tsys:290,rain:0,rate:4,required:10.5}),big=margin({eirp:40,diameter:2,tsys:290,rain:0,rate:4,required:10.5}),hot=margin({eirp:40,diameter:1,tsys:580,rain:0,rate:4,required:10.5});
      return[{name:'Running example: G/T 13.56 dB/K, C/N0 78.35 dB-Hz, Eb/N0 12.33 dB',pass:Math.abs(z.gt-13.56)<.02&&Math.abs(z.cn0-78.35)<.03&&Math.abs(z.ebn-12.33)<.03},
        {name:'Free-space loss at 10 GHz over 37,031 km is 203.82 dB',pass:Math.abs(z.fs-203.82)<.01},
        {name:'Doubling the dish adds 6.02 dB of G/T; doubling Tsys removes 3.01 dB',pass:Math.abs(big.gt-z.gt-6.0206)<1e-3&&Math.abs(z.gt-hot.gt-3.0103)<1e-3}];
    }
  });

  const captions={'ece-fft':'Adjustable FFT record: sample count, interval, pulse width and zero padding.','ece-reconstruct':'Adjustable sinc reconstruction: signal frequency, number of terms and phase.','ece-mulaw':'Adjustable μ-law companding: compression, bits and input level.','ece-dqpsk':'Adjustable differential phase encoding with rotation and drift.','ece-sidebands':'Adjustable message, carrier and modulation type with the resulting spectral lines.','ece-gpsplan':'Adjustable carrier, code and integration time for the legacy GPS signals.','ece-codinggain':'Adjustable code rate, distance and target error rate for coding gain.','ece-margin':'Adjustable EIRP, dish, noise temperature, rain, rate and requirement for link margin.'};
  for(const model of models)if(captions[model.id])model.caption=captions[model.id];
  window.ECE6390SignalLink={fftGrid,reconstruct,compress,expand,quantize,sqnr,differential,sidebands,gps,coded,uncoded,required,codingGain,margin,models:()=>models.filter(m=>captions[m.id])};
})();
