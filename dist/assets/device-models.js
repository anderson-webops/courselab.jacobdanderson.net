/* Original device teaching models; all dimensions and approximations are local. */
(() => {
  'use strict';
  const models=window.CourseDeviceModels||=[];
  const ctl=(id,label,min,max,step,value,unit)=>({id,label,min,max,step,value,unit});
  const close=(a,b,tol=1e-9)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));

  // Independent-scattering illustration. The supplied mobility reading supports
  // competing mechanisms and the high-temperature phonon T^(-3/2) trend.
  const mobility=(T,phonon,impurity,surface)=>{
    const p=phonon*(T/300)**-1.5,i=impurity*(T/300)**1.5;
    return{phonon:p,impurity:i,surface,effective:1/(1/p+1/i+1/surface)};
  };
  models.push({id:'mobility-scattering',
    controls:[ctl('T','Temperature',150,500,10,300,'K'),
      ctl('phonon','Phonon-limited mobility at 300 K',100,3000,100,1500,'cm²/(V·s)'),
      ctl('impurity','Impurity-limited mobility at 300 K',50,5000,50,800,'cm²/(V·s)'),
      ctl('surface','Fixed-field surface-limited mobility',100,10000,100,2000,'cm²/(V·s)')],
    render(v,U){
      const m=mobility(v.T,v.phonon,v.impurity,v.surface);
      const curve=key=>U.range(250,t=>{const T=150+350*t;return[T,mobility(T,v.phonon,v.impurity,v.surface)[key]];});
      const series=[['Effective mobility','effective',U.C.a],['Phonons','phonon',U.C.b],['Ionized impurities','impurity',U.C.c],['Surface limit','surface',U.C.d]]
        .map(([name,key,color])=>({name,color,points:curve(key)}));
      const ymax=Math.max(...series.flatMap(s=>s.points.map(p=>p[1])))*1.05;
      series.push({name:'Selected temperature',color:U.C.muted,dash:'4 4',points:[[v.T,0],[v.T,ymax]]});
      const limits=[['phonons',m.phonon],['ionized impurities',m.impurity],['surface scattering',m.surface]].sort((a,b)=>a[1]-b[1]);
      const s=U.text(60,40,'Independent relaxation rates add; mobility does not add directly.')+
        U.text(60,90,'Higher T: this phonon mobility falls; the illustrative impurity mobility rises.')+
        U.text(60,140,'The combined curve remains below each individual mobility limit.');
      return{svg:U.plot(series,{xmin:150,xmax:500,ymin:0,ymax,xlabel:'Temperature T (K)',ylabel:'Mobility (cm²/(V·s))',title:'Competing scattering mechanisms set the effective mobility'})+
          U.svg(s,'Matthiessen rate addition and the opposing temperature trends',800,180),
        stats:[['Effective mobility',U.fmt(m.effective,2)+' cm²/(V·s)'],['Strongest selected limitation',limits[0][0]],['Inverse effective mobility',(1/m.effective).toExponential(3)+' V·s/cm²']],
        equation:'1/μeff = 1/μphonon + 1/μimpurity + 1/μsurface; μphonon∝T⁻³ᐟ²; illustrative μimpurity∝T³ᐟ²',
        note:'Independent-scattering Matthiessen illustration with a common carrier effective mass. The supplied mobility reading supports competing Coulomb, phonon and surface mechanisms and a high-temperature T⁻³ᐟ² trend. The impurity power law and temperature-independent surface term are illustrative, not a universal mobility fit. Carrier degeneracy, field dependence and mechanism correlations are omitted.'};
    },
    checks:()=>{const m=mobility(300,1000,1000,1000),a=mobility(200,1500,800,2000),b=mobility(400,1500,800,2000);return[
      {name:'Three equal independent limits combine to one third',pass:close(m.effective,1000/3)},
      {name:'Effective mobility is below every positive component limit',pass:m.effective<Math.min(m.phonon,m.impurity,m.surface)},
      {name:'Phonon and illustrative impurity temperature trends oppose',pass:b.phonon<a.phonon&&b.impurity>a.impurity}
    ];}
  });

  // Long-channel charge-sheet model: m=1+Cdep/Cox. The optional saturation
  // correction is joined continuously at the knee, not differentiated there.
  const channel=(overdrive,drain,beta,m,clm)=>{
    const over=Math.max(0,overdrive),knee=over/m;
    if(over===0)return{current:0,knee,region:'ideal cutoff'};
    const saturation=beta*over*over/(2*m);
    return{current:drain<knee?beta*(over*drain-m*drain*drain/2):saturation*(1+clm*(drain-knee)),
      knee,region:drain<knee?'linear':'saturation'};
  };
  models.push({id:'mosfet',
    controls:[ctl('overdrive','Gate overdrive VGS−VT',0,2,.1,1,'V'),
      ctl('drain','Drain voltage VDS',0,3,.1,1.5,'V'),
      ctl('beta','β = μCoxW/L',.1,5,.1,1,'mA/V²'),
      ctl('body','Charge-sheet factor m',1,1.5,.1,1,''),
      ctl('clm','Optional saturation modulation λCLM',0,.2,.02,0,'V⁻¹')],
    render(v,U){
      const at=(over,V)=>channel(over,V,v.beta,v.body,v.clm),point=at(v.overdrive,v.drain);
      const curves=[{name:'Selected overdrive '+U.fmt(v.overdrive,1)+' V',color:U.C.a,
        points:U.range(300,t=>[3*t,at(v.overdrive,3*t).current])},
        {name:'Half that overdrive',color:U.C.b,points:U.range(300,t=>[3*t,at(v.overdrive/2,3*t).current])}];
      const ymax=Math.max(.05,...curves.flatMap(s=>s.points.map(p=>p[1])))*1.1;
      curves.push({name:'Operating VDS',color:U.C.c,dash:'4 4',points:[[v.drain,0],[v.drain,point.current]]});
      const kneeText='Knee: VDS,sat = Vov/m = '+U.fmt(point.knee,3)+' V';
      const s=U.text(60,40,kneeText)+U.text(60,90,'Linear branch: increasing VDS removes inversion charge toward the drain.')+
        U.text(60,140,'Beyond the knee, λCLM adds an illustrative finite output slope.');
      return{svg:U.plot(curves,{xmin:0,xmax:3,ymin:0,ymax,xlabel:'Drain-source voltage VDS (V)',ylabel:'Drain current ID (mA)',title:'Long-channel charge control: linear region and saturation'})+
          U.svg(s,'The overdrive-dependent knee and optional saturation slope',800,180),
        stats:[['Drain current',U.fmt(point.current,3)+' mA'],['Saturation knee',U.fmt(point.knee,3)+' V'],['Operating region',point.region]],
        equation:'Vov=max(VGS−VT,0); β=μCoxW/L; m=1+Cdep/Cox; ID,lin=β(VovVDS−mVDS²/2); VDS,sat=Vov/m; ID,sat=βVov²/(2m)·[1+λCLM(VDS−VDS,sat)]',
        note:'Strong-inversion, long-channel, gradual-channel charge-sheet model with constant mobility and constant m. The familiar square law is the m=1 simplification. Optional λCLM is an empirical saturation correction joined continuously at the knee; its slope can jump there. Weak inversion, body-voltage shifts, velocity saturation, series resistance and short-channel electrostatics are omitted.'};
    },
    checks:()=>{const b=2,m=1.2,o=1,knee=o/m;return[
      {name:'Zero drain voltage and zero overdrive give zero ideal current',pass:channel(1,0,b,m,.1).current===0&&channel(0,2,b,m,.1).current===0},
      {name:'Linear and optional-modulation branches join at the knee',pass:close(channel(o,knee,b,m,.1).current,b*o*o/(2*m))&&Math.abs(channel(o,knee-1e-7,b,m,.1).current-channel(o,knee,b,m,.1).current)<1e-10},
      {name:'With λCLM=0, current saturates beyond Vov/m',pass:close(channel(o,1.5,b,m,0).current,channel(o,2.5,b,m,0).current)},
      {name:'Positive optional modulation increases the saturation slope',pass:channel(o,2,b,m,.1).current>channel(o,1,b,m,.1).current}
    ];}
  });

  const screeningLength=(silicon,oxide)=>Math.sqrt(11.7*silicon*oxide/(2*3.9));
  const drainPerturbation=(x,L,ell,drain)=>drain*Math.exp(-(L-x)/ell)*(-Math.expm1(-2*x/ell))/(-Math.expm1(-2*L/ell));
  models.push({id:'short-channel',
    controls:[ctl('length','Channel length L',20,300,10,100,'nm'),
      ctl('silicon','Silicon body thickness tsi',3,30,1,10,'nm'),
      ctl('oxide','SiO₂ thickness tox',.5,5,.5,2,'nm'),
      ctl('drain','Drain-induced boundary voltage Vd',0,1.5,.1,1,'V')],
    render(v,U){
      const ell=screeningLength(v.silicon,v.oxide),a=v.length/ell,mid=drainPerturbation(v.length/2,v.length,ell,v.drain);
      const point=t=>drainPerturbation(t*v.length,v.length,ell,v.drain);
      const curves=[{name:'Selected screening length ℓ',color:U.C.a,points:U.range(400,t=>[t,point(t)])},
        {name:'Hypothetical 2ℓ, same boundaries',color:U.C.b,points:U.range(400,t=>[t,drainPerturbation(t*v.length,v.length,2*ell,v.drain)])}];
      const s=U.line(90,100,710,100,U.C.muted,3)+U.circle(90,100,6,U.C.a,U.C.a)+U.circle(710,100,6,U.C.b,U.C.b)+
        U.text(90,55,'Source: u(0)=0','middle')+U.text(710,55,'Drain: u(L)=Vd','middle')+
        U.text(400,145,'L = '+U.fmt(v.length,0)+' nm; estimated ℓ = '+U.fmt(ell,3)+' nm','middle')+
        U.text(60,200,'The plot is the drain perturbation, rather than the full channel band profile.');
      const limit=Math.PI*ell<Math.max(v.silicon,2*v.oxide)
        ?'For these dimensions πℓ is below the geometric eigenlength bound, so the square-root estimate is only a toy parameter.'
        :'The square-root estimate is a thin-angle approximation, not an exact device eigenlength.';
      return{svg:U.plot(curves,{xmin:0,xmax:1,ymin:0,ymax:Math.max(.1,v.drain*1.1),xlabel:'Position x/L: source 0 → drain 1',ylabel:'Drain-induced perturbation u (V)',title:'A longer screening length lets the drain influence more of the channel'})+
          U.svg(s,'Source and drain boundary conditions and the screening length',800,235),
        stats:[['Estimated decay length ℓ',U.fmt(ell,3)+' nm'],['Length / decay length',U.fmt(a,2)],['Midpoint perturbation',mid.toExponential(3)+' V']],
        equation:'u″−u/ℓ²=0; u(0)=0, u(L)=Vd; u(x)=Vd sinh(x/ℓ)/sinh(L/ℓ); ℓ≈√[εsi tsi tox/(2εox)] for a symmetric double gate',
        note:'Linear screened-potential teaching model, with εsi/εox=11.7/3.9 and lengths in nm. '+limit+' The course eigenlength convention uses exp(−πx/λeigen), so its decay length is λeigen/π. This is a drain-induced electrostatic perturbation with fixed source/drain boundaries; it does not compute current or a quantitative DIBL coefficient. Mobile charge and full two-dimensional electrostatics are omitted.'};
    },
    checks:()=>[
      {name:'Screened solution satisfies both exact boundary values',pass:drainPerturbation(0,100,5,1)===0&&close(drainPerturbation(100,100,5,1),1)},
      {name:'Stable screened solution remains finite for very long L/ℓ',pass:Number.isFinite(drainPerturbation(2500,5000,1,1))&&drainPerturbation(5000,5000,1,1)===1},
      {name:'Longer screening length increases midpoint drain coupling',pass:drainPerturbation(50,100,10,1)>drainPerturbation(50,100,5,1)},
      {name:'Thin-limit estimate scales with square root of oxide thickness',pass:close(screeningLength(10,4)/screeningLength(10,2),Math.sqrt(2))}
    ]
  });

  const scaled=(v)=>{
    const ratio=1/v.kappa,C=v.cap*1e-15*ratio,V=v.voltage*ratio,I=v.current*1e-3*ratio;
    return{ratio,C,V,I,delay:C*V/I,density:v.kappa*v.kappa,power:V*I,energy:C*V*V};
  };
  models.push({id:'constant-field-scaling',
    controls:[ctl('kappa','Ideal scaling factor κ',1,5,.25,2,''),
      ctl('length','Original channel length',50,500,50,200,'nm'),
      ctl('voltage','Original voltage',.5,2,.1,1,'V'),
      ctl('cap','Original gate capacitance',1,50,1,10,'fF'),
      ctl('current','Original on-current',.05,2,.05,.1,'mA')],
    render(v,U){
      const r=scaled(v),originalPower=v.voltage*v.current*1e-3;
      const x=520,w=200/v.kappa,h=70/v.kappa;
      let s=U.text(60,35,'Constant-field scaling: geometry and voltage shrink together')+
        `<rect x="90" y="90" width="200" height="70" fill="none" stroke="${U.C.a}" stroke-width="3"/>`+
        `<rect x="${x}" y="${125-h/2}" width="${w}" height="${h}" fill="none" stroke="${U.C.b}" stroke-width="3"/>`+
        U.text(190,200,'Original: L='+U.fmt(v.length,0)+' nm','middle')+
        U.text(620,200,'Scaled: L='+U.fmt(v.length/v.kappa,1)+' nm','middle')+
        U.text(60,245,'V: '+U.fmt(v.voltage,2)+' → '+U.fmt(r.V,3)+' V;  E≈V/L unchanged')+
        U.text(60,290,'Gates per area: ×'+U.fmt(r.density,2)+'; per-gate power: ×'+U.fmt(1/r.density,3));
      const series=[{name:'Length, voltage, C, I and delay: 1/κ',color:U.C.a,points:U.range(240,t=>{const k=1+4*t;return[k,1/k];})},
        {name:'Per-gate power: 1/κ²',color:U.C.b,points:U.range(240,t=>{const k=1+4*t;return[k,1/(k*k)];})},
        {name:'Transition energy: 1/κ³',color:U.C.d,points:U.range(240,t=>{const k=1+4*t;return[k,1/(k*k*k)];})},
        {name:'Ideal power per chip area: 1',color:U.C.c,points:[[1,1],[5,1]]}];
      return{svg:U.svg(s,'Original and scaled geometry with voltage and density ratios',800,325)+
          U.plot(series,{xmin:1,xmax:5,ymin:0,ymax:1.08,xlabel:'Scaling factor κ',ylabel:'Scaled / original value',title:'More devices offset each device’s lower ideal power'}),
        stats:[['Scaled CV/I delay',U.fmt(r.delay*1e12,3)+' ps'],['Areal transistor density','×'+U.fmt(r.density,2)],['Ideal power-density ratio',U.fmt(r.power/originalPower*r.density,3)]],
        equation:'L,W,tox,V → /κ; doping → ×κ; field and velocity unchanged; C,I,delay → /κ; per-gate power → /κ²; transition energy → /κ³; gates/area → ×κ²; power/area unchanged',
        note:'Ideal constant-field scaling with fixed mobility, similar electrostatics and activity, and operating frequency proportional to1/delay. Gate capacitance follows CoxWL; delay is CV/I. Thermal voltage, bandgap, built-in potentials and leakage do not scale with the drawing. Parasitic resistance/capacitance, velocity changes and practical threshold limits break this ideal similarity. Rectangles show geometry ratios, not a process cross-section.'};
    },
    checks:()=>{const v={kappa:2,cap:10,voltage:1,current:.1},a=scaled(v),b=scaled({...v,kappa:1});return[
      {name:'κ=1 retains baseline values',pass:close(b.C/10e-15,1)&&close(b.V,1)&&close(b.I/(.1e-3),1)},
      {name:'κ=2 halves ideal delay and quadruples density',pass:close(a.delay/b.delay,.5)&&a.density===4},
      {name:'Per-gate power falls by κ² while power density is constant',pass:close(a.power/b.power,.25)&&close(a.power/b.power*a.density,1)},
      {name:'Transition energy falls by κ³',pass:close(a.energy/b.energy,.125)}
    ];}
  });
})();
