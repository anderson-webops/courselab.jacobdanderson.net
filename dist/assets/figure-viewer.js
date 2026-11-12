/* Enlarged vector figures retain their authored palette and readable natural size. */
(() => {
  'use strict';
  const references=[...document.querySelectorAll('.course-static > svg')];
  if(!references.length)return;
  let serial=0;
  const dialog=document.createElement('dialog');dialog.className='figure-viewer';
  dialog.setAttribute('aria-labelledby','fv-title');
  const title=document.createElement('h2');title.id='fv-title';
  const toolbar=document.createElement('div');toolbar.className='fv-toolbar';
  const stage=document.createElement('div');stage.className='fv-stage';stage.tabIndex=0;
  stage.setAttribute('role','region');stage.setAttribute('aria-label','Enlarged figure, scroll to pan');
  const button=(label,aria)=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(aria)b.setAttribute('aria-label',aria);toolbar.append(b);return b;};
  const fit=button('Fit','Fit the complete figure'),minus=button('−','Zoom out');
  const readout=document.createElement('output');readout.setAttribute('aria-label','Figure zoom');toolbar.append(readout);
  const plus=button('+','Zoom in'),close=button('Close');
  dialog.append(title,toolbar,stage);document.body.append(dialog);
  let picture=null,opener=null,scale=1,width=900,height=500;
  function resize(next){
    if(!picture)return;
    const centerX=(stage.scrollLeft+stage.clientWidth/2)/(width*scale),centerY=(stage.scrollTop+stage.clientHeight/2)/(height*scale);
    scale=Math.max(.2,Math.min(3,next));
    picture.setAttribute('width',String(Math.round(width*scale)));picture.setAttribute('height',String(Math.round(height*scale)));
    readout.textContent=Math.round(scale*100)+'%';minus.disabled=scale<=.2;plus.disabled=scale>=3;
    stage.scrollLeft=Math.max(0,centerX*width*scale-stage.clientWidth/2);stage.scrollTop=Math.max(0,centerY*height*scale-stage.clientHeight/2);
  }
  fit.addEventListener('click',()=>resize(Math.min(1,(stage.clientWidth-24)/width,(stage.clientHeight-24)/height)));
  minus.addEventListener('click',()=>resize(scale-.25));plus.addEventListener('click',()=>resize(scale+.25));
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  for(const svg of references){
    const launch=document.createElement('button');launch.type='button';launch.className='figure-enlarge';launch.textContent='Enlarge figure';
    launch.setAttribute('aria-haspopup','dialog');
    svg.parentElement.after(launch);
    launch.addEventListener('click',()=>{
      opener=launch;picture=svg.cloneNode(true);const prefix='fv-'+(++serial)+'-';
      const ids=new Map([...picture.querySelectorAll('[id]')].map(e=>[e.id,prefix+e.id]));
      if(picture.id)ids.set(picture.id,prefix+picture.id);
      for(const e of [picture,...picture.querySelectorAll('*')])for(const a of [...e.attributes]){
        let value=a.value;if(a.name==='id')value=ids.get(value)||value;
        else if(['aria-labelledby','aria-describedby'].includes(a.name))value=value.split(/\s+/).map(id=>ids.get(id)||id).join(' ');
        else for(const [id,replacement]of ids){value=value.replaceAll('url(#'+id+')','url(#'+replacement+')');if(value==='#'+id)value='#'+replacement;}
        if(value!==a.value)e.setAttribute(a.name,value);
      }
      const box=svg.viewBox.baseVal;width=box.width||900;height=box.height||500;scale=1;
      title.textContent=svg.querySelector('title')?.textContent||'Figure';stage.replaceChildren(picture);
      dialog.showModal();resize(1);stage.scrollLeft=0;stage.scrollTop=0;close.focus();
    });
  }
})();
