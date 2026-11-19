/* Original ECE6390 teaching models. Powers, event rates and error events keep explicit conventions. */
(() => {
  'use strict';
  const models=window.CourseFigureRegistry||(window.CourseFigureRegistry=[]);
  const tau=2*Math.PI;
  const control=(id,label,min,max,step,value,unit='')=>({id,label,min,max,step,value,unit});
  const defaults=m=>Object.fromEntries(m.controls.map(c=>[c.id,c.value]));
  const near=(a,b,tol=1e-9)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(b));
  // Direct tail approximation avoids subtracting two nearly equal probabilities.
  const q=x=>{
    if(x===0)return .5;
    if(x<0)return 1-q(-x);
    const z=x/Math.SQRT2,t=1/(1+.5*z);
    return .5*t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));
  };
  const bits=(number,length)=>Array.from({length},(_,i)=>(number>>(length-1-i))&1);
  const word=a=>a.join('');
  const distance=(a,b)=>a.reduce((s,x,i)=>s+(x!==b[i]?1:0),0);
  const G=[[1,0,0,1,0,1],[0,1,0,0,1,1],[0,0,1,1,1,1]];
  const H=[[1,0,1,1,0,0],[0,1,1,0,1,0],[1,1,1,0,0,1]];
  const encode=d=>Array.from({length:6},(_,j)=>d.reduce((s,x,i)=>s+x*G[i][j],0)%2);
  const codebook=Array.from({length:8},(_,i)=>({data:bits(i,3),coded:encode(bits(i,3))}));
  const syndrome=r=>H.map(row=>row.reduce((s,x,i)=>s+x*r[i],0)%2);
  const received=(data,mask)=>encode(bits(data,3)).map((b,i)=>b^bits(mask,6)[i]);
  const panel=(U,x,y,w,h,lines,color=U.C.a)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${color}" stroke-width="2"/>`+lines.map((s,i)=>U.text(x+w/2,y+h/2+6+(i-(lines.length-1)/2)*24,s,'middle',color)).join('');
  const scientific=x=>x.toExponential(3);
  const energy=v=>{
    const C=10**(v.power/10),R=v.rate*1e6,r=v.codeRate,m=v.loading,N0=10**(v.noiseDensity/10),BN=v.bandwidth*1e6;
    return {C,R,r,m,BN,N0,coded:R/r,symbols:R/(r*m),infoEnergy:C/R,codedEnergy:C*r/R,symbolEnergy:C*r*m/R,cn:C/(N0*BN),ebn:C/(R*N0)};
  };
  models.push({id:'ece-energy',controls:[
    control('power','Average received power C',-160,0,5,-100,'dBW'),
    control('rate','Information rate',1,20,1,4,'Mbit/s'),
    control('codeRate','Code rate r',.25,1,.05,.5),
    control('loading','Coded bits per symbol m',1,6,1,2),
    control('noiseDensity','One-sided noise density N₀',-220,-100,5,-200,'dBW/Hz'),
    control('bandwidth','Equivalent noise bandwidth BN',.5,10,.5,2,'MHz')],
    render(v,U){
      const z=energy(v),rows=[['Information',z.R,z.infoEnergy],['Coded bits',z.coded,z.codedEnergy],['Symbols',z.symbols,z.symbolEnergy]];
      let s=U.text(400,35,'The same received power is divided by a different event rate.','middle');
      rows.forEach((a,i)=>{const y=80+i*105;s+=panel(U,70,y,660,75,[a[0]+': '+U.fmt(a[1]/1e6,3)+' million events/s','Energy per event: '+scientific(a[2])+' J'],[U.C.a,U.C.b,U.C.c][i]);});
      s+=U.text(400,425,'C/N = '+U.fmt(10*Math.log10(z.cn),2)+' dB;   Eb,info/N₀ = '+U.fmt(10*Math.log10(z.ebn),2)+' dB','middle');
      return{svg:U.svg(s,'Information, coded-bit and symbol energies at fixed received power',800,460),stats:[['Eb, information',scientific(z.infoEnergy)+' J'],['Eb, coded',scientific(z.codedEnergy)+' J'],['Es',scientific(z.symbolEnergy)+' J']],equation:'E<sub>b,info</sub>=C/R<sub>info</sub>; E<sub>b,coded</sub>=r E<sub>b,info</sub>; E<sub>s</sub>=rm E<sub>b,info</sub>; E<sub>b</sub>/N₀=(C/N)B<sub>N</sub>/R<sub>b</sub>',note:'C is average signal power in W, rates are events/s, and energies are J. N₀ is one-sided W/Hz; N=N₀BN. m counts coded bits per symbol. Code rate varies at fixed information rate; framing and pilots are excluded. No modulation error curve is inferred from these rates.'};
    },checks:()=>{
      const z=energy({power:0,rate:4,codeRate:.5,loading:2,noiseDensity:-200,bandwidth:2});
      return[{name:'4Mbit/s and1W give0.25microjoule per information bit',pass:near(z.infoEnergy,2.5e-7,1e-14)},{name:'Rate1/2 halves coded-bit energy',pass:near(z.codedEnergy/z.infoEnergy,.5)},{name:'Noise bandwidth cancels in Eb/N0 conversion',pass:near(z.cn*z.BN/z.R,z.ebn)}];
    }
  });

  const bpsk=v=>{
    const gamma=10**(v.ebn/10),sigma=1/Math.sqrt(2*gamma),p=v.prior,t=v.threshold;
    const plus=q((1-t)/sigma),minus=q((t+1)/sigma);
    return{sigma,plus,minus,total:p*plus+(1-p)*minus,optimum:sigma*sigma*Math.log((1-p)/p)/2};
  };
  models.push({id:'ece-bpsk',controls:[control('ebn','Energy per bit / N₀',-8,14,.5,4,'dB'),control('threshold','Decision threshold τ',-2,2,.1,0,'normalized'),control('prior','Prior probability of +1',.05,.95,.05,.5)],
    render(v,U){
      const z=bpsk(v),limit=Math.max(2.7,1+4*z.sigma),density=(x,mu)=>Math.exp(-.5*((x-mu)/z.sigma)**2)/(z.sigma*Math.sqrt(tau));
      const ymax=1/(z.sigma*Math.sqrt(tau))*1.12;
      const series=[{name:'Sent −1: right tail '+scientific(z.minus),color:U.C.b,dash:'8 3',points:U.range(360,t=>{const x=-limit+2*limit*t;return[x,density(x,-1)];})},{name:'Sent +1: left tail '+scientific(z.plus),color:U.C.a,points:U.range(360,t=>{const x=-limit+2*limit*t;return[x,density(x,1)];})}];
      const sameThreshold=near(v.threshold,z.optimum);
      series.push({name:(sameThreshold?'Selected = MAP threshold':'Selected threshold')+' ('+U.fmt(v.threshold,3)+')',color:U.C.d,dash:'4 4',points:[[v.threshold,0],[v.threshold,ymax]]});
      if(!sameThreshold)series.push({name:'MAP threshold ('+U.fmt(z.optimum,3)+')',color:U.C.c,dash:'9 3 2 3',points:[[z.optimum,0],[z.optimum,ymax]]});
      const opts={xmin:-limit,xmax:limit,ymin:0,ymax,xlabel:'Matched-filter sample y (normalized amplitude)',ylabel:'Conditional probability density',title:'Decision +1 to the right of τ; decision −1 to the left',height:390};
      let chart=U.plot(series,opts);
      const X=x=>88+(x+limit)/(2*limit)*(800-88-28),Y=y=>390-65-y/ymax*(390-65-48);
      const shade=(lo,hi,mu,color)=>{if(hi<=lo)return'';const pts=[[X(lo),Y(0)],...U.range(120,t=>{const x=lo+(hi-lo)*t;return[X(x),Y(density(x,mu))];}),[X(hi),Y(0)]];return`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${color}" opacity=".2"/>`;};
      chart=chart.replace('</svg>',shade(-limit,Math.min(limit,v.threshold),1,U.C.a)+shade(Math.max(-limit,v.threshold),limit,-1,U.C.b)+'</svg>');
      return{svg:chart,stats:[['Weighted bit-error probability',scientific(z.total)],['Error given +1',scientific(z.plus)],['Equal-cost MAP threshold',U.fmt(z.optimum,4)]],equation:'P<sub>b</sub>=p₊Q((1−τ)/σ)+(1−p₊)Q((τ+1)/σ); σ²=1/[2(E<sub>b</sub>/N₀)]',note:'Normalized amplitudes ±1, coherent synchronization, independent Gaussian noise, equal error costs. The threshold is adjustable; the MAP value is reported separately. At equal priors and τ=0, Pb=Q(√(2Eb/N₀)). Shaded tails count conditional errors; their prior weights determine total BER.'};
    },checks:()=>[{name:'Q0 is exactly one half',pass:q(0)===.5},{name:'BPSK0dB anchor',pass:Math.abs(bpsk({ebn:0,threshold:0,prior:.5}).total-.0786496035251426)<2e-8},{name:'Complementary Gaussian tails',pass:near(q(2)+q(-2),1)},{name:'MAP threshold moves negative for frequent ones',pass:bpsk({ebn:4,threshold:0,prior:.8}).optimum<0}]
  });

  const qam=(M,gamma)=>{const a=1-1/Math.sqrt(M),tail=q(Math.sqrt(3*gamma/(M-1)));return{ser:4*a*tail-4*a*a*tail*tail,berApprox:4*a*tail/Math.log2(M)};};
  models.push({id:'ece-qam',controls:[control('loading','Bits per square-QAM symbol',2,8,2,4),control('esn','Energy per symbol / N₀',0,30,.5,10,'dB')],
    render(v,U){
      const M=2**v.loading,z=qam(M,10**(v.esn/10)),series=[{name:'Exact symbol-error probability',color:U.C.a,points:U.range(250,t=>{const dB=30*t;return[dB,Math.log10(Math.max(1e-12,qam(M,10**(dB/10)).ser))];})},{name:'High-SNR Gray BER approximation',color:U.C.b,dash:'6 4',points:U.range(250,t=>{const dB=30*t;return[dB,Math.log10(Math.max(1e-12,qam(M,10**(dB/10)).berApprox))];})},{name:'Selected Es/N₀',color:U.C.c,points:[[v.esn,-12],[v.esn,0]]}];
      return{svg:U.plot(series,{xmin:0,xmax:30,ymin:-12,ymax:0,xlabel:'Es/N₀ (dB; energy per symbol)',ylabel:'log₁₀(error probability)',title:M+'-QAM: symbol and bit counts stay distinct',height:420}),stats:[['Exact SER',scientific(z.ser)],['Gray BER approximation',scientific(z.berApprox)],['Coded bits per symbol',String(v.loading)]],equation:'q=Q(√[3E<sub>s</sub>/((M−1)N₀)]); a=1−1/√M; P<sub>s</sub>=4aq−4a²q²; P<sub>b</sub>≈4aq/log₂M',note:'Square-QAM, equally likely symbols, coherent perfect synchronization and AWGN. The bit-error expression assumes Gray labels and high-SNR nearest-neighbor errors; it is not exact at low SNR. Values below 10⁻¹² are floored on this log plot only. APSK requires another model.'};
    },checks:()=>[{name:'4QAM exactSER is2QminusQsquared',pass:near(qam(4,10).ser,2*q(Math.sqrt(10))-q(Math.sqrt(10))**2)},{name:'16QAM10dBSER anchor',pass:Math.abs(qam(16,10).ser-.2220308503)<1e-7},{name:'More symbol energy lowers16QAMerrors',pass:qam(16,100).ser<qam(16,10).ser}]
  });

  const constellation=mode=>{
    const n=[4,8,16,32][mode],pops=mode<2?[n]:mode===2?[4,12]:[4,12,16],radii=mode<2?[1]:mode===2?[1,2.8]:[1,2.5,4.3],pts=[];
    pops.forEach((count,j)=>{for(let k=0;k<count;k++){const a=tau*(k+.5)/count;pts.push([radii[j]*Math.cos(a),radii[j]*Math.sin(a)]);}});
    const scale=Math.sqrt(pts.reduce((s,p)=>s+p[0]**2+p[1]**2,0)/n);
    return{n,pops,points:pts.map(p=>p.map(x=>x/scale))};
  };
  models.push({id:'ece-apsk',controls:[control('mode','Constellation family index',0,3,1,2),control('compression','Illustrative amplitude compression',0,1,.05,0)],
    render(v,U){
      const z=constellation(v.mode),cx=330,cy=245,scale=140,compress=p=>{const r=Math.hypot(...p);return p.map(x=>x/Math.sqrt(1+v.compression*r*r));};
      let s=U.line(105,cy,555,cy,U.C.grid)+U.line(cx,40,cx,435,U.C.grid)+U.text(568,cy+7,'I')+U.text(cx+10,35,'Q');
      for(const p of z.points){const a=compress(p);s+=U.line(cx+p[0]*scale,cy-p[1]*scale,cx+a[0]*scale,cy-a[1]*scale,U.C.muted)+U.circle(cx+p[0]*scale,cy-p[1]*scale,5,'none',U.C.a)+U.circle(cx+a[0]*scale,cy-a[1]*scale,2.8,U.C.b,U.C.b);}
      s+=U.text(600,105,'Open: input')+U.text(600,145,'Filled: output')+U.text(600,230,z.pops.join('+')+' points')+U.text(600,270,Math.log2(z.n)+' coded bits/symbol');
      return{svg:U.svg(s,'Normalized PSK or APSK constellation under illustrative radial compression',800,470),stats:[['Constellation',['QPSK','8PSK','16APSK','32APSK'][v.mode]],['Average input symbol energy','1 normalized'],['Ring populations',z.pops.join(' + ')]],equation:'m=log₂M; ⟨|a|²⟩=1; a<sub>out</sub>=a/√(1+κ|a|²)',note:'Equally likely points and illustrative ring ratios, normalized to unit average energy. κ is a dimensionless teaching compression parameter, not a fitted amplifier. The model preserves phase and shows only symbol centers; it does not include pulse peaks, synchronization errors, noise or a BER prediction.'};
    },checks:()=>[0,1,2,3].map(mode=>{const z=constellation(mode);return{name:'Alphabet'+z.n+' has correct count and unit average energy',pass:z.points.length===z.n&&near(z.points.reduce((s,p)=>s+p[0]**2+p[1]**2,0)/z.n,1)};})
  });

  // Six supported normal-frame examples, checked against ETSIEN302307V1.3.1 tables5a and12.
  const profiles=[{name:'QPSK 1/4',m:2,k:16008,inner:.25},{name:'QPSK 1/2',m:2,k:32208,inner:.5},{name:'QPSK 3/4',m:2,k:48408,inner:.75},{name:'8PSK 3/4',m:3,k:48408,inner:.75},{name:'16APSK 3/4',m:4,k:48408,inner:.75},{name:'32APSK 3/4',m:5,k:48408,inner:.75}];
  const frame=v=>{
    const p=profiles[v.profile],symbolRate=v.bandwidth*1e6/(1+v.rolloff);
    const mapped=64800/p.m,slots=mapped/90;
    const pilots=v.pilots?36*Math.floor((slots-1)/16):0;
    const full=mapped+90+pilots,payload=p.k-80,seconds=full/symbolRate;
    return {p,symbolRate,mapped,slots,pilots,full,payload,seconds,raw:symbolRate*p.m,codedRate:64800/seconds,information:payload/seconds};
  };
  models.push({id:'ece-dvbs2',controls:[control('profile','DVB-S2 profile index',0,5,1,2),control('bandwidth','Occupied RF channel width',1,36,1,6,'MHz'),control('rolloff','Raised-cosine rolloff α',.2,.35,.05,.25),control('pilots','Pilots: 0 off, 1 on',0,1,1,1)],
    render(v,U){
      const z=frame(v),rows=[['Baseband frame (BCH input)',U.fmt(z.payload,0)+' payload bits + 80 header bits'],['BCH output / LDPC input',U.fmt(64800*z.p.inner,0)+' bits'],['LDPC output','64,800 coded bits'],['Mapped symbols',U.fmt(z.mapped,0)+' symbols × '+z.p.m+' coded bits/symbol'],['Physical frame',U.fmt(z.mapped,0)+' mapped + 90 header + '+z.pilots+' pilots = '+U.fmt(z.full,0)+' symbols']];
      let s=U.text(400,30,z.p.name+' at '+U.fmt(z.symbolRate/1e6,3)+' Msym/s','middle');
      rows.forEach(([a,b],i)=>{const y=55+77*i;s+=panel(U,85,y,630,59,[a,b],i<3?U.C.a:U.C.b);if(i<4)s+=U.arrow(400,y+59,400,y+75,U.C.muted);});
      s+=U.text(400,451,'Frame duration = '+U.fmt(z.full,0)+' symbols ÷ '+U.fmt(z.symbolRate/1e6,3)+' Msym/s = '+U.fmt(z.seconds*1000,3)+' ms','middle');
      return{svg:U.svg(s,'DVB-S2 normal-frame resource accounting for a supported profile',800,475),stats:[['Coded rate during mapped symbols',U.fmt(z.raw/1e6,3)+' Mbit/s'],['Frame-average coded rate',U.fmt(z.codedRate/1e6,3)+' Mbit/s'],['Filled-frame payload rate',U.fmt(z.information/1e6,3)+' Mbit/s']],equation:'R<sub>s</sub>=B/(1+α); S=64800/(90m); N<sub>PL</sub>=64800/m+90+36⌊(S−1)/16⌋ (pilots on); T<sub>frame</sub>=N<sub>PL</sub>/R<sub>s</sub>; R<sub>coded,avg</sub>=64800/T<sub>frame</sub>; R<sub>payload</sub>=(K<sub>BCH</sub>−80)/T<sub>frame</sub>',note:'A physical header and optional pilots use symbol time in every normal frame. Only mapped symbols carry FEC-frame bits. The 80-bit baseband header occupies part of the BCH input. Payload assumes a full frame with no input-packet, stuffing, padding, guard-band or implementation losses.'};
    },checks:()=>{
      const z=frame({profile:2,bandwidth:6,rolloff:.25,pilots:1}),a=frame({profile:2,bandwidth:6,rolloff:.25,pilots:0});
      return[{name:'QPSKnormalframe has360slots and792pilot symbols',pass:z.slots===360&&z.pilots===792},{name:'Usefulpayload cannot exceed mapperbitrate',pass:profiles.every((_,profile)=>{const r=frame({profile,bandwidth:6,rolloff:.25,pilots:1});return r.information<r.raw;})},{name:'Removingpilotsraisesfilledframepayloadrate',pass:a.information>z.information},{name:'QPSK3/4BCHdatacountmatchesstandard',pass:z.payload===48328}];
    }
  });

  const productBlock=data=>{const b=bits(data,4),a=[[b[0],b[1],b[0]^b[1]],[b[2],b[3],b[2]^b[3]]];a.push(a[0].map((x,j)=>x^a[1][j]));return a;};
  const productReceived=v=>{const a=productBlock(v.data),positions=[v.first,v.second].filter(n=>n>0);for(const n of new Set(positions))a[Math.floor((n-1)/3)][(n-1)%3]^=1;return{a,flips:new Set(positions).size,badRows:a.map(row=>row.reduce((s,b)=>s^b,0)),badCols:[0,1,2].map(j=>a.reduce((s,row)=>s^row[j],0))};};
  models.push({id:'ece-product-parity',controls:[control('data','Four-bit information word as integer',0,15,1,11),control('first','First flipped position (0 = none)',0,9,1,4),control('second','Second flipped position (0 = none)',0,9,1,0)],
    render(v,U){
      const z=productReceived(v);let s=U.text(400,35,'Data '+word(bits(v.data,4))+' · Received block after '+z.flips+' selected bit flip'+(z.flips===1?'':'s'),'middle');
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){const x=190+j*90,y=75+i*90;s+=panel(U,x,y,90,90,[String(z.a[i][j])],z.badRows[i]&&z.badCols[j]?U.C.d:U.C.a)+U.text(x+10,y+20,String(i*3+j+1),'start',U.C.muted);}
      for(let i=0;i<3;i++)s+=U.text(500,130+i*90,z.badRows[i]?'FAIL':'even','start',z.badRows[i]?U.C.d:U.C.a)+U.text(235+i*90,380,z.badCols[i]?'FAIL':'even','middle',z.badCols[i]?U.C.d:U.C.a);
      const rs=z.badRows.flatMap((b,i)=>b?[i]:[]),cs=z.badCols.flatMap((b,i)=>b?[i]:[]),repair=z.flips===1&&rs.length===1&&cs.length===1?String(1+rs[0]*3+cs[0]):'No guaranteed repair in this selected pattern';
      return{svg:U.svg(s,'Product parity block with numbered positions and failed checks',800,430),stats:[['Code rate','4/9'],['Distinct selected flips',String(z.flips)],['Single-error repair position',repair]],equation:'p<sub>row</sub>=XOR(data row); p<sub>column</sub>=XOR(data column); r=4/9',note:'Positions 1…9 are row-major. Repeating the same selected position counts as one distinct channel flip. The model reports a guaranteed repair only for exactly one selected error. Two or more errors can give ambiguous or misleading checks; four rectangle-corner errors may be undetected. No probabilistic BER is simulated.'};
    },checks:()=>{
      const valid=Array.from({length:16},(_,data)=>productReceived({data,first:0,second:0}));
      return[{name:'All16validblocks satisfy every paritycheck',pass:valid.every(z=>z.badRows.every(x=>x===0)&&z.badCols.every(x=>x===0))},{name:'All9singleflips giveexactly1failedrowandcolumn',pass:Array.from({length:9},(_,i)=>productReceived({data:11,first:i+1,second:0})).every(z=>z.badRows.reduce((s,x)=>s+x,0)===1&&z.badCols.reduce((s,x)=>s+x,0)===1)}];
    }
  });

  models.push({id:'ece-block-code',controls:[control('data','Three-bit information word as integer',0,7,1,5),control('mask','Six-bit error mask as integer',0,63,1,1)],
    render(v,U){
      const tx=encode(bits(v.data,3)),r=received(v.data,v.mask),ds=codebook.map(c=>distance(c.coded,r)),best=Math.min(...ds),matches=codebook.filter((_,i)=>ds[i]===best);
      let s=U.text(400,30,'Transmit '+word(tx)+'; mask '+word(bits(v.mask,6))+'; receive '+word(r),'middle');
      codebook.forEach((c,i)=>{const y=65+i*40,selected=ds[i]===best;s+=U.text(125,y+19,word(c.coded),'end',selected?U.C.a:U.C.ink)+`<rect x="150" y="${y}" width="${ds[i]*70}" height="26" fill="${selected?U.C.a:U.C.muted}"/>`+U.text(165+ds[i]*70,y+19,String(ds[i]),'start',U.C.ink);});
      s+=U.text(400,425,'Hamming distance from the received word','middle');
      return{svg:U.svg(s,'Distances from a received six-bit word to every legal codeword',800,460),stats:[['Minimum code distance','3'],['Nearest-word distance',String(best)],['Nearest information word',matches.map(x=>word(x.data)).join(' or ')]],equation:'c=dG mod2; G is 3×6; r=k/n=1/2; d<sub>min</sub>=3; guaranteed correction t=⌊(d<sub>min</sub>−1)/2⌋=1',note:'G rows: 100101, 010011, 001111. Row-vector data 1×3 produce codewords 1×6. The selected bit mask is a deterministic example. Equal nearest distances are shown as ties. Beyond one arbitrary flipped bit, a unique nearest word can still be the wrong transmitted word; no multi-error correction guarantee is implied.'};
    },checks:()=>[{name:'Generatorhasminimumdistance3',pass:Math.min(...codebook.flatMap((a,i)=>codebook.slice(i+1).map(b=>distance(a.coded,b.coded))))===3},{name:'101encodesto101010',pass:word(encode([1,0,1]))==='101010'},{name:'All48singlebiterrorsdecodeuniquelytotheirsentword',pass:codebook.every(c=>[0,1,2,3,4,5].every(bit=>{const r=c.coded.map((x,i)=>x^(i===bit?1:0)),ds=codebook.map(b=>distance(b.coded,r)),m=Math.min(...ds);return ds.filter(x=>x===m).length===1&&word(codebook[ds.indexOf(m)].coded)===word(c.coded);} ))}]
  });

  const convolutional=n=>{let memory=[0,0];return bits(n,4).map((u,i)=>{const before=[...memory],pair=[u^memory[0]^memory[1],u^memory[1]];memory=[u,memory[0]];return{step:i+1,u,before,after:[...memory],pair};});};
  models.push({id:'ece-convolutional',controls:[control('data','Four-bit input word as integer',0,15,1,10),control('clock','Selected bit clock',1,4,1,2)],
    render(v,U){
      const rows=convolutional(v.data),now=rows[v.clock-1];let s=U.text(400,35,'Input '+word(bits(v.data,4))+'; initial memory 00','middle');
      s+=panel(U,60,80,180,70,['Current input',String(now.u)],U.C.a)+panel(U,310,80,180,70,['Previous bit',String(now.before[0])],U.C.b)+panel(U,560,80,180,70,['Older bit',String(now.before[1])],U.C.c)+U.arrow(240,115,310,115,U.C.muted)+U.arrow(490,115,560,115,U.C.muted);
      s+=U.text(400,205,'Top XOR: '+now.u+'⊕'+now.before[0]+'⊕'+now.before[1]+' = '+now.pair[0],'middle',U.C.a)+U.text(400,245,'Bottom XOR: '+now.u+'⊕'+now.before[1]+' = '+now.pair[1],'middle',U.C.b)+U.text(400,295,'After this clock: stored memory '+word(now.after),'middle');
      const columns=[100,240,380,520,660];
      ['Clock','Input','Before','Output','After'].forEach((label,j)=>{s+=U.text(columns[j],350,label,'middle');});
      rows.forEach((r,i)=>{[r.step,r.u,word(r.before),word(r.pair),word(r.after)].forEach((value,j)=>{s+=U.text(columns[j],385+i*31,String(value),'middle',r.step===v.clock?U.C.a:U.C.muted);});});
      return{svg:U.svg(s,'Convolutional encoder current bit, history, XORs and complete four-step trace',800,510),stats:[['Constraint length','3 = current + 2 stored'],['Memory states','4'],['Output pairs',rows.map(r=>word(r.pair)).join(' | ')]],equation:'v₁,t=u<sub>t</sub>⊕u<sub>t−1</sub>⊕u<sub>t−2</sub>; v₂,t=u<sub>t</sub>⊕u<sub>t−2</sub>; rate 1/2',note:'The figure shows the memory before the chosen clock, then the updated memory after shifting. Each clock accepts one information bit and emits the ordered pair (v1,v2). No termination bits, puncturing, channel errors or Viterbi decoder are simulated.'};
    },checks:()=>[{name:'Input1010produces11|10|00|10',pass:convolutional(10).map(r=>word(r.pair)).join('|')==='11|10|00|10'},{name:'Zeroinputpreserveszeromemoryandoutputs',pass:convolutional(0).every(r=>word(r.pair)==='00'&&word(r.after)==='00')}]
  });

  const soft=v=>{const L=2*v.sample/(v.sigma*v.sigma),prior=Math.log(v.prior/(1-v.prior)),post=L+prior,one=post>=0?1/(1+Math.exp(-post)):Math.exp(post)/(1+Math.exp(post));return{L,prior,post,one,error:1/(1+Math.exp(Math.abs(post)))};};
  models.push({id:'ece-soft',controls:[control('sample','Observation y',-2,2,.05,.1,'normalized'),control('sigma','Noise standard deviation σ',.2,1.5,.05,.5,'normalized'),control('prior','Prior probability of bit 1',.05,.95,.05,.5)],
    render(v,U){
      const z=soft(v),bound=2/(v.sigma*v.sigma)*2+Math.abs(z.prior)+1,pts=U.range(150,t=>{const x=-2+4*t;return[x,2*x/(v.sigma*v.sigma)];});
      const series=[{name:z.prior===0?'Channel LLR = posterior log odds':'Channel log-likelihood L(y)',color:U.C.a,points:pts}];
      if(z.prior!==0)series.push({name:'Posterior log odds',color:U.C.b,dash:'7 3',points:pts.map(([x,L])=>[x,L+z.prior])});
      series.push({name:'Chosen sample y = '+U.fmt(v.sample,2),color:U.C.c,dash:'4 4',points:[[v.sample,-bound],[v.sample,bound]]});
      return{svg:U.plot(series,{xmin:-2,xmax:2,ymin:-bound,ymax:bound,xlabel:'Observation y (normalized; bit 1 mean +1)',ylabel:'Natural-log odds',title:'Sample strength and noise scale determine reliability',height:400}),stats:[['Channel LLR',U.fmt(z.L,4)],['Posterior P(bit 1|y)',U.fmt(z.one,6)],['Model posterior error',scientific(z.error)]],equation:'L=ln[p(y|1)/p(y|0)]=2y/σ²; L<sub>post</sub>=L+ln[p₁/(1−p₁)]; P(1|y)=1/(1+e<sup>−Lpost</sup>)',note:'Gaussian samples with means ±1, common variance σ². Positive channel LLR favors bit 1; another library may define the opposite sign. Prior evidence is counted once. These probabilities rely on the selected channel and prior model; the figure does not implement a full iterative decoder.'};
    },checks:()=>[{name:'y0andequalpriorsgiveposterioronehalf',pass:soft({sample:0,sigma:.5,prior:.5}).one===.5},{name:'sigma2scalingreducesLLRby4',pass:near(soft({sample:.1,sigma:1,prior:.5}).L/.8,.25)},{name:'Equalpriory0point1anchor',pass:near(soft({sample:.1,sigma:.5,prior:.5}).one,.6899744811,1e-8)}]
  });

  models.push({id:'ece-ldpc',controls:[control('data','Three-bit information word as integer',0,7,1,5),control('mask','Six-bit error mask as integer',0,63,1,1)],
    render(v,U){
      const tx=encode(bits(v.data,3)),r=received(v.data,v.mask),sy=syndrome(r),xs=[90,210,330,450,570,690],cx=[210,400,590];let s=U.text(400,30,'Transmit '+word(tx)+'; receive '+word(r)+'; syndrome '+word(sy),'middle');
      H.forEach((h,j)=>h.forEach((b,i)=>{if(b)s+=U.line(xs[i],112,cx[j],280,sy[j]?U.C.d:U.C.muted,sy[j]?2.3:1.2);}));
      r.forEach((b,i)=>{const changed=b!==tx[i];s+=U.circle(xs[i],85,25,'none',changed?U.C.d:U.C.a)+U.text(xs[i],92,String(b),'middle',changed?U.C.d:U.C.a)+U.text(xs[i],145,'c'+(i+1),'middle');});
      sy.forEach((b,i)=>{s+=panel(U,cx[i]-36,280,72,65,[b?'FAIL':'even'],b?U.C.d:U.C.a);});
      s+=U.text(400,395,'Each square XORs only its connected bit values.','middle');
      return{svg:U.svg(s,'Parity-check graph of a teaching block code with syndrome and chosen errors',800,430),stats:[['Syndrome H rᵀ',word(sy)],['Failed checks',String(sy.reduce((a,b)=>a+b,0))],['Received word legal?',sy.every(x=>x===0)?'Yes; transmission can still differ':'No']],equation:'H=[101100;011010;111001]; Hcᵀ=0 mod2; syndrome=Hrᵀ',note:'A six-bit teaching graph, not a practical long-block LDPC design. Its parity constraints match the systematic 3×6 generator. Sparse H defines LDPC; G need not be sparse. A zero syndrome establishes codeword membership rather than proving an error-free transmission. No belief-propagation or BER prediction is simulated.'};
    },checks:()=>[{name:'Everylegalcodewordhaszerosyndrome',pass:codebook.every(c=>syndrome(c.coded).every(x=>x===0))},{name:'Allsixsinglebiterrorpositionshaveuniquenonzerosyndromes',pass:new Set(Array.from({length:6},(_,j)=>word(syndrome(Array.from({length:6},(_,i)=>i===j?1:0))))).size===6},{name:'Lastbitflipof101010givessyndrome001',pass:word(syndrome([1,0,1,0,1,1]))==='001'}]
  });
  const captions={
    'ece-energy':'Information-bit, coded-bit and symbol energies at the same received power.',
    'ece-bpsk':'Gaussian decision regions for the chosen noise, threshold and prior probabilities.',
    'ece-qam':'Exact square-QAM symbol-error probability and a high-SNR Gray-bit approximation.',
    'ece-apsk':'Unit-average-energy symbol points and their response to the declared amplitude model.',
    'ece-dvbs2':'Coding, header and pilot resources in a completely filled normal DVB-S2 frame.',
    'ece-product-parity':'Row and column checks after the selected changes to a nine-bit product code.',
    'ece-block-code':'Distances from a received six-bit word to every legal word of the teaching code.',
    'ece-convolutional':'Current input, stored memory and output pairs across four encoder clock steps.',
    'ece-soft':'Channel log-likelihood and posterior log odds under a declared Gaussian model.',
    'ece-ldpc':'Bit variables and their parity checks for the selected received word.'
  };
  for(const model of models.filter(m=>m.id.startsWith('ece-')))model.caption=captions[model.id];
  // Discrete controls use named native options; URL values remain numeric and stable.
  const namedOptions=(model,id,label,options)=>{
    const c=models.find(m=>m.id===model).controls.find(c=>c.id===id);
    c.label=label;c.options=options.map(([value,label])=>({value,label}));
  };
  namedOptions('ece-apsk','mode','Constellation',[[0,'QPSK'],[1,'8PSK'],[2,'16APSK'],[3,'32APSK']]);
  namedOptions('ece-dvbs2','profile','DVB-S2 profile',profiles.map((p,i)=>[i,p.name.replace(/(QPSK|PSK|APSK)(?=\d)/,'$1 ')]));
  namedOptions('ece-dvbs2','pilots','Pilot symbols',[[0,'Off'],[1,'On']]);
  namedOptions('ece-dvbs2','rolloff','Raised-cosine rolloff α',[[.2,'0.20'],[.25,'0.25'],[.35,'0.35']]);
  window.ECE6390Teaching={q,energy,bpsk,qam,constellation,frame,encode,syndrome,convolutional,soft,models:()=>models.filter(m=>m.id.startsWith('ece-')),defaults};
})();
