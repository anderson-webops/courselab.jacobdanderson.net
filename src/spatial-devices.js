/* Physical dimensionality accompanies the existing density-of-states energy plot. */
(() => {
  'use strict';
  const U=window.CourseFigureU,Spatial=U?.spatial;
  const models=window.CourseFigureRegistry||window.CourseDeviceModels||[];
  const model=models.find(item=>item.id==='density-of-states');
  if(!model||!Spatial)return;
  const original=model.render;
  Spatial.controls(model,{azimuth:35,elevation:25});
  model.spatial='Bulk, sheet and wire geometry distinguishes free carrier motion from confined directions';
  model.render=(v,tools=U)=>{
    const result=original(v,tools),dimension=v.dimension;
    const descriptions={
      3:{name:'Bulk · 3D motion',size:[.8,.65,.55],free:'x, y, z',confined:'none',measure:'volume',units:'states/(eV·cm³)'},
      2:{name:'Sheet · 2D motion',size:[1.05,.8,.08],free:'x, y',confined:'z',measure:'area',units:'states/(eV·cm²)'},
      1:{name:'Wire · 1D motion',size:[1.15,.1,.1],free:'x',confined:'y, z',measure:'length',units:'states/(eV·cm)'}
    };
    const shape=descriptions[dimension];
    const spatial=Spatial.figure(tools,v,{height:360,center:[235,200],scale:95,
      title:shape.name,label:'Carrier motion in a '+shape.name.toLowerCase()+' structure, with free and confined directions'},scene=>{
      const [x,y,z]=shape.size;
      const vertices=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
      const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].map(indices=>{
        const points=indices.map(i=>vertices[i]);return{points,depth:points.reduce((total,p)=>total+scene.project(p)[2],0)/4};
      }).sort((a,b)=>a.depth-b.depth);
      let s=faces.map(face=>scene.polygon(face.points,tools.C.a,.13,tools.C.a)).join('');
      const names=['x','y','z'];
      for(let axis=0;axis<3;axis++){
        const free=axis<dimension,length=free?1.35:.85;
        const plus=[0,0,0],minus=[0,0,0];plus[axis]=length;minus[axis]=-length;
        if(free)s+=scene.arrow([0,0,0],plus,tools.C.a)+scene.arrow([0,0,0],minus,tools.C.a);
        else s+=scene.line(minus,plus,tools.C.b,2,'4 4');
        s+=scene.label(plus,(free?'Free ':'Confined ')+names[axis],free?tools.C.a:tools.C.b,8,-10);
      }
      s+=tools.text(470,100,'Free motion: '+shape.free,'start',tools.C.a);
      s+=tools.text(470,145,'Confined: '+shape.confined,'start',dimension===3?tools.C.ink:tools.C.b);
      s+=tools.text(470,205,'DOS per unit '+shape.measure);
      s+=tools.text(470,240,shape.units);
      const meaning=dimension===3?'Bulk carriers have three continuous wave-vector components.':'Confined directions form quantized transverse modes; the plot follows one subband.';
      return s+tools.text(400,340,meaning,'middle');
    });
    return{...result,svg:spatial+result.svg,note:result.note+' The geometry identifies free-motion and confined directions. Its dimensions are schematic; confinement lengths and subband energies are outside this model.'};
  };
})();
