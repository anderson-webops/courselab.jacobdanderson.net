/* Shared controls for course-specific figure models; static SVG remains a fallback. */
(() => {
  'use strict';
  const U=window.CourseFigureU,models=window.CourseFigureRegistry||window.CourseDeviceModels||[];
  for(const mount of document.querySelectorAll('[data-course-figure]')){
    const model=models.find(m=>m.id===mount.dataset.courseFigure);if(!model)continue;
    const values=Object.fromEntries(model.controls.map(c=>[c.id,c.value]));
    const params=new URLSearchParams(location.search);
    for(const c of model.controls){const raw=params.get('c_'+c.id),n=Number(raw);if(raw!==null&&raw.trim()!==''&&Number.isFinite(n)&&n>=c.min&&n<=c.max)values[c.id]=Number((c.min+Math.round((n-c.min)/c.step)*c.step).toPrecision(12));}
    const live=document.createElement('figure');live.className='topic-demonstration';const figure=document.createElement('div');figure.className='figure';figure.tabIndex=0;figure.setAttribute('role','region');figure.setAttribute('aria-label','Adjustable '+model.id.replaceAll('-',' ')+' model');const caption=document.createElement('figcaption');caption.textContent='Fig. 2. Adjustable '+model.id.replaceAll('-',' ')+' model.';const controls=document.createElement('div');controls.className='controls additional-controls';
    const stats=document.createElement('div');stats.className='stats';stats.setAttribute('aria-live','polite');
    const equation=document.createElement('div');equation.className='equation';const note=document.createElement('p');note.className='note';
    const outputs=new Map();
    const draw=()=>{const r=model.render(values,U);figure.classList.remove('course-static');figure.innerHTML=r.svg;stats.replaceChildren();for(const[label,value]of(r.stats||[]).slice(0,3)){const d=document.createElement('div');d.className='stat';const s=document.createElement('span'),b=document.createElement('strong');s.textContent=label;b.textContent=value;d.append(s,b);stats.append(d);}equation.innerHTML=r.equation||'';note.textContent='Fig. 2 uses the following model: '+(r.note||'');for(const c of model.controls)outputs.get(c.id).textContent=U.fmt(values[c.id],3)+(c.unit?' '+c.unit:'');try{const url=new URL(location.href);for(const c of model.controls){if(values[c.id]===c.value)url.searchParams.delete('c_'+c.id);else url.searchParams.set('c_'+c.id,values[c.id]);}history.replaceState(null,'',url.pathname+url.search+url.hash);}catch{};};
    for(const c of model.controls){const row=document.createElement('div');row.className='control';const label=document.createElement('label'),text=document.createElement('span'),out=document.createElement('output'),input=document.createElement('input');text.textContent=c.label;input.id='device-'+c.id;input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=values[c.id];label.htmlFor=input.id;out.htmlFor=input.id;label.append(text,out);outputs.set(c.id,out);input.addEventListener('input',()=>{values[c.id]=Number(input.value);draw();});row.append(label,input);controls.append(row);}
    const reset=document.createElement('button');reset.type='button';reset.textContent='Reset example';reset.addEventListener('click',()=>{for(const c of model.controls){values[c.id]=c.value;document.getElementById('device-'+c.id).value=c.value;}draw();});controls.append(reset);live.append(figure,caption,controls,stats,equation,note);mount.after(live);draw();
  }
  window.CourseFigureModels={models,checks:()=>models.flatMap(m=>(m.checks?.()||[]).map(x=>({model:m.id,...x})))};
})();
