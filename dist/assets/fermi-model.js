/* Finite-temperature occupation, with a fixed illustrative silicon bandgap. */
(() => {
  'use strict';
  const models=window.CourseDeviceModels||=[],kB=8.617333262e-5,EC=0,EV=-1.12;
  const occupation=(E,EF,T)=>{const x=(E-EF)/(kB*T);return x>0?Math.exp(-x)/(1+Math.exp(-x)):1/(1+Math.exp(x));};
  models.push({id:'fermi-occupation',controls:[
    {id:'fermi',label:'Fermi level EF relative to EC',min:-1.3,max:.2,step:.01,value:-.15,unit:'eV'},
    {id:'temperature',label:'Temperature T',min:50,max:600,step:10,value:300,unit:'K'}],
    render(v,U){
      const points=U.range(450,t=>{const E=-1.5+2*t;return[E,occupation(E,v.fermi,v.temperature)];});
      const svg=U.plot([
        {name:'Occupation f(E)',points},
        {name:'EF',color:U.C.b,points:[[v.fermi,0],[v.fermi,1]]},
        {name:'EC',color:U.C.c,points:[[EC,0],[EC,1]]},
        {name:'EV',color:U.C.muted,points:[[EV,0],[EV,1]]}
      ],{xmin:-1.5,xmax:.5,ymin:0,ymax:1,xlabel:'Electron energy E relative to EC (eV)',ylabel:'Occupation probability f(E)',title:'EF shifts the occupation curve; temperature sets its width'});
      const location=v.fermi>EC?'Conduction band':v.fermi<EV?'Valence band':'Bandgap or band edge';
      return{svg,stats:[['f(EC)',occupation(EC,v.fermi,v.temperature).toExponential(3)],['f(EF)','0.500'],['EF location',location]],
        equation:'f(E) = 1 / [1 + exp((E − EF)/(kBT))]; EC = 0 eV; EV = −1.12 eV',
        note:'Equilibrium occupation per complete quantum state at finite temperature. EF and T are independently controlled to isolate occupation; a complete material calculation uses charge neutrality to determine EF. The fixed band edges are an illustrative bulk-silicon model. Between EV and EC the ideal bulk bands have no available states, so DOS × occupation gives zero band-carrier density there even though f(E) is defined. Each state has electron occupancy zero or one; f is its statistical occupation probability. This graph uses energy as its horizontal coordinate and does not calculate carrier concentration or a spatial electric field.'};
    },
    checks:()=>[
      {name:'Fermi occupation is one half at EF',pass:occupation(.07,.07,50)===.5&&occupation(-.4,-.4,600)===.5},
      {name:'Occupations are complementary around EF',pass:Math.abs(occupation(.1,0,300)+occupation(-.1,0,300)-1)<1e-14},
      {name:'Higher electron energy lowers occupation',pass:occupation(-.1,0,300)>occupation(.1,0,300)},
      {name:'Heating raises occupation above EF',pass:occupation(.1,0,600)>occupation(.1,0,50)}
    ]
  });
})();
