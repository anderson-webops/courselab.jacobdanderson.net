/* Coupled, regional teaching model: geometry -> coherent field -> gain -> map. */
(() => {
  'use strict';
  const root=typeof window==='undefined'?globalThis:window;
  const C=299792458,EARTH_RADIUS_M=6400000,GEO_RADIUS_M=42400000;
  const THRESHOLD_DBM=-80,RECEIVE_GAIN_DBI=10;
  const MIN_POWER_DBW=-30,MAX_POWER_DBW=110;
  const DEG=Math.PI/180;
  const GA_CENTER=Object.freeze({lat:32.7,lon:-83.6});
  // Author-drawn state outline from the existing project teaching figure.
  // It intentionally stays separate from the assignment's original MAT raster.
  const BOUNDARY=Object.freeze([
    [-85.6,35],[-83.1,35],[-83.35,34.75],[-83.1,34.6],[-82.9,34.1],
    [-82.3,33.6],[-81.9,33.3],[-81.8,32.8],[-81.4,32.5],[-81.2,32.1],
    [-80.85,32],[-81.1,31.5],[-81.35,30.7],[-81.8,30.85],[-82,30.4],
    [-82.3,30.65],[-84.9,30.75],[-85.1,31.2],[-85,31.8],[-85.25,32.5],[-85.15,32.8]
  ].map(p=>Object.freeze(p)));
  const MAP_BOUNDS=Object.freeze({west:-89,east:-79,south:28.5,north:37});
  const DEFAULT_STATE=Object.freeze({
    longitude:-84,rows:10,columns:10,stride:4,normal:'target',
    tiltX:0,tiltY:0,roll:0,steeringLat:32.7,steeringLon:-83.6,
    phaseX:0,phaseY:0,autoSteer:true,powerDBW:75,frequencyGHz:30,
    probeLat:32.7,probeLon:-83.6,
    phaseOffsets:Object.freeze({}),removed:Object.freeze([])
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  const bounded=(v,a,b,fallback)=>clamp(finite(v,fallback),a,b);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const scale=(a,s)=>a.map(v=>v*s);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>{const n=Math.hypot(...a);return n>0?scale(a,1/n):[0,0,0];};
  const radians=deg=>deg*DEG;
  const wrapPhase=p=>((p+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  const sinc=x=>Math.abs(x)<1e-8?1-x*x/6:Math.sin(x)/x;

  function spherical(lat,lon,radius=EARTH_RADIUS_M){
    const a=radians(lat),b=radians(lon),c=Math.cos(a);
    return[radius*c*Math.cos(b),radius*c*Math.sin(b),radius*Math.sin(a)];
  }
  function insideGeorgia(lon,lat){
    let hit=false;
    for(let i=0,j=BOUNDARY.length-1;i<BOUNDARY.length;j=i++){
      const a=BOUNDARY[i],b=BOUNDARY[j];
      if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function rotate(vector,axis,angle){
    const c=Math.cos(angle),s=Math.sin(angle);
    return add(add(scale(vector,c),scale(cross(axis,vector),s)),scale(axis,dot(axis,vector)*(1-c)));
  }
  function buildFrame(normal,tiltX=0,tiltY=0,roll=0){
    let n=unit(normal);
    if(Math.hypot(...n)<.1)n=[0,0,1];
    let x=unit(cross([0,0,1],n));
    if(Math.hypot(...x)<.1)x=[1,0,0];
    let y=unit(cross(n,x));
    y=rotate(y,x,radians(tiltX));n=rotate(n,x,radians(tiltX));
    x=rotate(x,y,radians(tiltY));n=rotate(n,y,radians(tiltY));
    x=rotate(x,n,radians(roll));y=rotate(y,n,radians(roll));
    return{x:unit(x),y:unit(y),normal:unit(n)};
  }
  function normalizeState(input={}){
    if(!input||typeof input!=='object')input={};
    const d=DEFAULT_STATE;
    const state={
      longitude:bounded(input.longitude,-150,-20,d.longitude),
      rows:Math.round(bounded(input.rows,1,20,d.rows)),
      columns:Math.round(bounded(input.columns,1,20,d.columns)),
      stride:Math.round(bounded(input.stride,1,60,d.stride)),
      normal:input.normal==='nadir'?'nadir':'target',
      tiltX:bounded(input.tiltX,-90,90,d.tiltX),
      tiltY:bounded(input.tiltY,-90,90,d.tiltY),
      roll:bounded(input.roll,-180,180,d.roll),
      steeringLat:bounded(input.steeringLat,-80,80,d.steeringLat),
      steeringLon:bounded(input.steeringLon,-180,180,d.steeringLon),
      phaseX:bounded(input.phaseX,-720,720,d.phaseX),
      phaseY:bounded(input.phaseY,-720,720,d.phaseY),
      autoSteer:input.autoSteer!==false,
      powerDBW:bounded(input.powerDBW,MIN_POWER_DBW,MAX_POWER_DBW,d.powerDBW),
      frequencyGHz:bounded(input.frequencyGHz,1,100,d.frequencyGHz),
      probeLat:bounded(input.probeLat,-80,80,d.probeLat),
      probeLon:bounded(input.probeLon,-180,180,d.probeLon),
      phaseOffsets:{},removed:[]
    };
    const offsets=input.phaseOffsets&&typeof input.phaseOffsets==='object'?input.phaseOffsets:{};
    const removed=new Set(Array.isArray(input.removed)?input.removed:[]);
    for(let row=0;row<state.rows;row++)for(let col=0;col<state.columns;col++){
      const id=`r${row}c${col}`;
      if(Object.hasOwn(offsets,id))state.phaseOffsets[id]=wrapPhase(radians(finite(offsets[id],0)))/DEG;
      if(removed.has(id))state.removed.push(id);
    }
    return state;
  }

  // All elements occupy one plane and have an ideal isotropic forward pattern.
  // The hemisphere integral of exp(j k Δr·q) is 2π sinc(k |Δr|).
  function normalization(elements,wavelengthM=C/(30e9)){
    const active=elements.filter(e=>e.installed!==false),k=2*Math.PI/wavelengthM;
    let q=active.length;
    for(let i=0;i<active.length;i++)for(let j=0;j<i;j++){
      const a=active[i],b=active[j],distance=Math.hypot(a.x-b.x,a.y-b.y);
      q+=2*Math.cos(a.phase-b.phase)*sinc(k*distance);
    }
    return Math.max(0,q);
  }
  function fieldAt(elements,u,v,wavelengthM=C/(30e9)){
    const k=2*Math.PI/wavelengthM;
    let re=0,im=0;
    for(const e of elements){
      if(e.installed===false)continue;
      const phase=e.phase+k*(e.x*u+e.y*v);
      re+=Math.cos(phase);im+=Math.sin(phase);
    }
    return{re,im,power:re*re+im*im,magnitude:Math.hypot(re,im),phase:Math.atan2(im,re)};
  }
  function directionGain(elements,q,u,v,w=1,wavelengthM=C/(30e9)){
    if(w<=0||q<=1e-12)return 0;
    return 2*fieldAt(elements,u,v,wavelengthM).power/q;
  }
  function scoreCounts(installed,missedGA,outsideCovered,validModel=true){
    if(installed<1||!validModel)return{score:0,FOM:0,scoreStatus:'invalid-model',W:0};
    const denominator=Math.sqrt(installed+100)*(100*missedGA+outsideCovered);
    if(denominator===0)return{score:null,FOM:null,scoreStatus:'unbounded-regional',W:1};
    const score=1/denominator;
    return{score,FOM:score,scoreStatus:'finite',W:1};
  }

  const NX=48,NY=44;
  const BASE_CELLS=[];
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
    const lon=MAP_BOUNDS.west+(i+.5)*(MAP_BOUNDS.east-MAP_BOUNDS.west)/NX;
    const lat=MAP_BOUNDS.north-(j+.5)*(MAP_BOUNDS.north-MAP_BOUNDS.south)/NY;
    BASE_CELLS.push(Object.freeze({i,j,lon,lat,inGA:insideGeorgia(lon,lat),ecef:Object.freeze(spherical(lat,lon))}));
  }
  function evaluateSystem(input={}){
    const state=normalizeState(input),wavelengthM=C/(state.frequencyGHz*1e9),k=2*Math.PI/wavelengthM;
    const satellite=spherical(0,state.longitude,GEO_RADIUS_M),target=spherical(GA_CENTER.lat,GA_CENTER.lon);
    const normal=state.normal==='nadir'?unit(scale(satellite,-1)):unit(sub(target,satellite));
    const basis=buildFrame(normal,state.tiltX,state.tiltY,state.roll);
    const steeringPoint=spherical(state.steeringLat,state.steeringLon);
    const steeringDirection=unit(sub(steeringPoint,satellite));
    const steerU=dot(steeringDirection,basis.x),steerV=dot(steeringDirection,basis.y);
    const absent=new Set(state.removed),elements=[];
    for(let row=0;row<state.rows;row++)for(let col=0;col<state.columns;col++){
      const id=`r${row}c${col}`,gx=col*state.stride,gy=row*state.stride;
      const x=(col-(state.columns-1)/2)*state.stride*wavelengthM/2;
      const y=(row-(state.rows-1)/2)*state.stride*wavelengthM/2;
      const extraPhase=state.phaseOffsets[id]||0;
      const phase=wrapPhase((state.autoSteer?-k*(x*steerU+y*steerV):0)+radians(
        (col-(state.columns-1)/2)*state.phaseX+(row-(state.rows-1)/2)*state.phaseY+extraPhase));
      elements.push({id,row,col,gx,gy,x,y,phase,phaseDeg:phase/DEG,extraPhaseDeg:extraPhase,
        installed:!absent.has(id),relativeECEF:add(scale(basis.x,x),scale(basis.y,y))});
    }
    const activeElements=elements.filter(e=>e.installed),q=normalization(activeElements,wavelengthM);
    const gainLog=state.powerDBW+30+RECEIVE_GAIN_DBI;
    const evaluatePoint=(ecef,detail=false)=>{
      const delta=sub(ecef,satellite),rangeM=Math.hypot(...delta),direction=scale(delta,1/rangeM);
      const u=dot(direction,basis.x),v=dot(direction,basis.y),w=dot(direction,basis.normal);
      const earthVisible=dot(unit(ecef),sub(satellite,ecef))>0;
      const visible=earthVisible&&w>0;
      const field=fieldAt(activeElements,u,v,wavelengthM);
      const gainLinear=visible&&q>1e-12?2*field.power/q:0;
      const pathLossDB=20*Math.log10(4*Math.PI*rangeM/wavelengthM);
      const powerDBm=gainLinear>1e-30?Math.max(-300,gainLog+10*Math.log10(gainLinear)-pathLossDB):-300;
      const point={rangeM,direction,u,v,w,visible,earthVisible,gainLinear,pathLossDB,powerDBm,
        power:powerDBm,receivedDBm:powerDBm,covered:visible&&powerDBm>=THRESHOLD_DBM};
      if(detail){
        point.field=field;
        point.contributions=activeElements.map(e=>{
          const phase=wrapPhase(e.phase+k*(e.x*u+e.y*v));
          return{elementId:e.id,id:e.id,phase,phaseDeg:phase/DEG,re:Math.cos(phase),im:Math.sin(phase)};
        });
      }
      return point;
    };
    let ga=0,coveredGA=0,missedGA=0,outsideCovered=0,outside=0,minGA=Infinity,maxGA=-Infinity;
    const cells=BASE_CELLS.map(base=>{
      const p=evaluatePoint(base.ecef);
      if(base.inGA){ga++;if(p.covered)coveredGA++;else missedGA++;minGA=Math.min(minGA,p.powerDBm);maxGA=Math.max(maxGA,p.powerDBm);}
      else{outside++;if(p.covered)outsideCovered++;}
      return{...base,inGeorgia:base.inGA,...p};
    });
    const validModel=q>1e-12&&Number.isFinite(q),installed=activeElements.length;
    const counts={installed,ga,coveredGA,missedGA,outsideCovered,outside};
    const scoring=scoreCounts(installed,missedGA,outsideCovered,validModel);
    const eligibility={eligible:installed>=100&&validModel,meetsBaseline:installed>=100,
      reason:!validModel?'Install at least one radiating element.':installed<100?'Below the 100-element baseline; partial-credit design.':'Sampled model; assumes W = 1.'};
    const probeECEF=spherical(state.probeLat,state.probeLon),probe={
      lat:state.probeLat,lon:state.probeLon,ecef:probeECEF,...evaluatePoint(probeECEF,true)};
    const targetResult={lat:GA_CENTER.lat,lon:GA_CENTER.lon,ecef:target,...evaluatePoint(target,true)};
    return{state,params:state,satellite,target,basis,arrayNormal:basis.normal,
      earthRadiusM:EARTH_RADIUS_M,geoRadiusM:GEO_RADIUS_M,wavelengthM,spacingM:state.stride*wavelengthM/2,
      thresholdDBm:THRESHOLD_DBM,receiveGainDBi:RECEIVE_GAIN_DBI,elements,activeElements,
      normalizationQ:q,hemisphereIntegral:2*Math.PI*q,
      geometry:{satellite,target,basis,normal:basis.normal,rangeM:targetResult.rangeM},
      steering:{lat:state.steeringLat,lon:state.steeringLon,ecef:steeringPoint,direction:steeringDirection,u:steerU,v:steerV},
      map:{bounds:MAP_BOUNDS,nx:NX,ny:NY,cells,boundary:BOUNDARY},cells,counts,
      eligibility,...scoring,minGAPowerDBm:Number.isFinite(minGA)?minGA:-300,
      maxGAPowerDBm:Number.isFinite(maxGA)?maxGA:-300,probe,targetResult,contributions:probe.contributions,
      scope:'Uniform coarse regional teaching grid; the score assumes model correctness. Original-raster grading and whole-Earth sidelobe checks are separate.'};
  }
  function fitPower(result,marginDB=.05){
    const ga=result.cells.filter(c=>c.inGA);
    if(!ga.length||!result.activeElements.length||ga.some(c=>!c.visible||c.gainLinear<=1e-30))return null;
    const minimum=Math.min(...ga.map(c=>c.powerDBm));
    const required=result.state.powerDBW+result.thresholdDBm+Math.max(0,finite(marginDB,.05))-minimum;
    return Number.isFinite(required)&&required>=MIN_POWER_DBW&&required<=MAX_POWER_DBW?required:null;
  }
  function preset(name='compact'){
    const state={...DEFAULT_STATE,phaseOffsets:{},removed:[]};
    if(name==='wide')state.stride=12;
    else if(name==='thinned'){
      state.rows=14;state.columns=14;state.stride=6;
      for(let row=0;row<state.rows;row++)for(let col=0;col<state.columns;col++){
        if((row+2*col)%4===0)state.removed.push(`r${row}c${col}`);
      }
    }else state.stride=1;
    return state;
  }

  root.GeorgiaSystemModel=Object.freeze({DEFAULT_STATE,BOUNDARY,MAP_BOUNDS,GA_CENTER,
    C,EARTH_RADIUS_M,GEO_RADIUS_M,THRESHOLD_DBM,RECEIVE_GAIN_DBI,MIN_POWER_DBW,MAX_POWER_DBW,
    evaluateSystem,fitPower,preset,normalizeState,spherical,buildFrame,insideGeorgia,
    fieldAt,normalization,directionGain,scoreCounts,wrapPhase});
})();
