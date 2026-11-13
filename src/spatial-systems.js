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
