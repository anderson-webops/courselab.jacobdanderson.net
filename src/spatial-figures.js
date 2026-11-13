/* Orthographic views share physical coordinates with the quantitative figures. */
const Spatial=(() => {
  const tau=2*Math.PI,rad=x=>x*Math.PI/180;
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const spherical=(theta,phi,r=1)=>[r*Math.sin(theta)*Math.cos(phi),r*Math.sin(theta)*Math.sin(phi),r*Math.cos(theta)];
  function controls(module,defaults={}){
    for(const control of [
      {id:'viewAzimuth',label:'3D view azimuth',min:-180,max:180,step:1,value:defaults.azimuth??35,unit:'°'},
      {id:'viewElevation',label:'3D view elevation',min:5,max:80,step:1,value:defaults.elevation??25,unit:'°'}
    ])if(!module.controls.some(c=>c.id===control.id))module.controls.push(control);
  }
  function scene(U,v={},options={}){
    const width=options.width??800,height=options.height??420,center=options.center??[width/2,230],scale=options.scale??140;
    const az=rad(Number.isFinite(v.viewAzimuth)?v.viewAzimuth:35),el=rad(Number.isFinite(v.viewElevation)?v.viewElevation:25);
    const ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
    function project(p){
      if(!p||p.length!==3||!p.every(Number.isFinite))throw new RangeError('A spatial coordinate must contain three finite values.');
      const x=ca*p[0]-sa*p[1],y=sa*p[0]+ca*p[1];
      return[center[0]+scale*x,center[1]-scale*(ce*p[2]-se*y),ce*y+se*p[2]];
    }
    function line(a,b,color=U.C.grid,weight=1,dash=''){
      const p=project(a),q=project(b);return U.line(p[0],p[1],q[0],q[1],color,weight,dash);
    }
    function path(points,color=U.C.a,weight=2,dash=''){
      return U.path(points.map(p=>project(p).slice(0,2)),color,weight,dash);
    }
    function point(p,color=U.C.a,r=4){const q=project(p);return U.circle(q[0],q[1],r,color,color);}
    function label(p,value,color=U.C.ink,dx=8,dy=-8){
      const q=project(p),text=String(value),half=Math.min(width/2-12,text.length*4.7+3);
      const x=U.clamp(q[0]+dx,12+half,width-12-half),y=U.clamp(q[1]+dy,58,height-16);
      return U.text(x,y,text,'middle',color);
    }
    function arrow(a,b,color=U.C.a,value=''){
      const p=project(a),q=project(b);
      let markup=Math.hypot(q[0]-p[0],q[1]-p[1])<.1?point(b,color,3):U.arrow(p[0],p[1],q[0],q[1],color);
      if(value)markup+=label(b,value,color);return markup;
    }
    function polygon(points,fill=U.C.a,opacity=.15,stroke=fill){
      const coordinates=points.map(p=>project(p).slice(0,2).map(x=>x.toFixed(3)).join(',')).join(' ');
      return `<polygon points="${coordinates}" fill="${U.esc(fill)}" fill-opacity="${opacity}" stroke="${U.esc(stroke)}" stroke-opacity=".45" stroke-width=".6"/>`;
    }
    function axes(origin=[0,0,0],length=1,names=['x','y','z']){
      return [[length,0,0],[0,length,0],[0,0,length]].map((axis,i)=>arrow(origin,add(origin,axis),[U.C.b,U.C.c,U.C.a][i],names[i])).join('');
    }
    function sphere(radius=1,origin=[0,0,0]){
      const center2=project(origin);let markup=U.circle(center2[0],center2[1],radius*scale,'var(--soft)',U.C.grid);
      for(let j=1;j<6;j++)markup+=path(U.range(64,q=>add(origin,spherical(j*Math.PI/6,q*tau,radius))),U.C.grid,1);
      for(let j=0;j<6;j++)markup+=path(U.range(64,q=>add(origin,spherical(q*tau,j*Math.PI/6,radius))),U.C.grid,1);
      return markup;
    }
    function surface(radius,options={}){
      const low=options.thetaMin??0,high=options.thetaMax??Math.PI,nt=options.thetaSteps??28,np=options.phiSteps??40;
      const theta=options.thetaSamples??Array.from({length:nt+1},(_,i)=>low+(high-low)*i/nt),color=options.color??U.C.a,faces=[];
      const vertices=theta.map(t=>Array.from({length:np+1},(_,j)=>{
        const phi=tau*j/np;return spherical(t,phi,Math.max(0,radius(t,phi)));
      }));
      for(let i=0;i<theta.length-1;i++)for(let j=0;j<np;j++){
        const face=[vertices[i][j],vertices[i+1][j],vertices[i+1][j+1],vertices[i][j+1]];
        faces.push({vertices:face,depth:face.reduce((total,p)=>total+project(p)[2],0)/4});
      }
      faces.sort((a,b)=>a.depth-b.depth);
      return faces.map(face=>polygon(face.vertices,color,options.opacity??.13,color)).join('');
    }
    return{width,height,project,line,path,arrow,point,label,polygon,axes,sphere,surface};
  }
  function figure(U,v,options,draw){
    const view=scene(U,v,options),title=options.title??'Spatial view';
    const svg=U.svg(U.text(24,28,title)+draw(view),options.label??title,view.width,view.height);
    return svg.replace('<svg ','<svg data-spatial="true" ');
  }
  return Object.freeze({controls,scene,figure,spherical});
})();
U.spatial=Spatial;
