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
