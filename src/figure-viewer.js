/* Enlarged scientific diagrams retain their current state and authored appearance. */
(() => {
  'use strict';
  const diagrams=container=>[...container.children].filter(element=>element.matches('svg:not(.legend-key), img')&&element.getAttribute('aria-hidden')!=='true');
  const references=[...document.querySelectorAll('.course-static, .topic-demonstration .figure')].filter(container=>diagrams(container).length);
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
  const legend=document.createElement('div');legend.className='fv-legend';legend.hidden=true;
  dialog.append(title,toolbar,legend,stage);document.body.append(dialog);
  let picture=null,opener=null,returnActions=null,returnIndex=0,scale=1,width=900,height=500;
  function resize(next){
    if(!picture)return;
    const centerX=(stage.scrollLeft+stage.clientWidth/2)/(width*scale),centerY=(stage.scrollTop+stage.clientHeight/2)/(height*scale);
    scale=Math.max(.05,Math.min(3,next));
    picture.setAttribute('width',String(Math.round(width*scale)));picture.setAttribute('height',String(Math.round(height*scale)));
    readout.textContent=Math.round(scale*100)+'%';minus.disabled=scale<=.05;plus.disabled=scale>=3;
    stage.scrollLeft=Math.max(0,centerX*width*scale-stage.clientWidth/2);stage.scrollTop=Math.max(0,centerY*height*scale-stage.clientHeight/2);
  }
  const pictureTitle=source=>source.tagName.toLowerCase()==='img'?(source.closest('figure')?.querySelector('figcaption strong')?.textContent||'Figure'):source.querySelector('title')?.textContent||'Figure';
  const effectiveBackground=element=>{
    for(let node=element;node;node=node.parentElement){
      const color=getComputedStyle(node).backgroundColor;
      if(color!=='transparent'&&color!=='rgba(0, 0, 0, 0)')return color;
    }
    return 'rgb(255, 255, 255)';
  };
  function copyForViewer(source){
    const copy=source.cloneNode(true),prefix='fv-'+(++serial)+'-';
    const ids=new Map([...copy.querySelectorAll('[id]')].map(e=>[e.id,prefix+e.id]));
    if(copy.id)ids.set(copy.id,prefix+copy.id);
    for(const e of [copy,...copy.querySelectorAll('*')])for(const a of [...e.attributes]){
      let value=a.value;if(a.name==='id')value=ids.get(value)||value;
      else if(['aria-labelledby','aria-describedby'].includes(a.name))value=value.split(/\s+/).map(id=>ids.get(id)||id).join(' ');
      else for(const [id,replacement]of ids){value=value.replaceAll('url(#'+id+')','url(#'+replacement+')');if(value==='#'+id)value='#'+replacement;}
      if(value!==a.value)e.setAttribute(a.name,value);
    }
    return copy;
  }
  function open(source,launch,actions,index){
    opener=launch;returnActions=actions;returnIndex=index;picture=copyForViewer(source);
    const key=source.nextElementSibling;
    legend.replaceChildren();legend.hidden=!key?.matches('.legend');
    if(!legend.hidden)legend.append(copyForViewer(key));
    const box=source.viewBox?.baseVal;width=box?.width||source.naturalWidth||Number(source.getAttribute('width'))||900;height=box?.height||source.naturalHeight||Number(source.getAttribute('height'))||500;scale=1;
    if(source.tagName.toLowerCase()==='svg'){
      // Preserve text colors supplied by the figure's surrounding theme rules.
      const labels=[...source.querySelectorAll('text')];
      [...picture.querySelectorAll('text')].forEach((label,index)=>label.setAttribute('fill',getComputedStyle(labels[index]).fill));
      // A live plot's transparent canvas uses its surrounding surface, including dark mode.
      const background=document.createElementNS('http://www.w3.org/2000/svg','rect');
      background.setAttribute('width','100%');background.setAttribute('height','100%');background.setAttribute('fill',effectiveBackground(source.parentElement));background.setAttribute('data-viewer-background','');
      picture.prepend(background);
    }
    title.textContent=pictureTitle(source);stage.replaceChildren(picture);
    dialog.showModal();resize(1);stage.scrollLeft=0;stage.scrollTop=0;close.focus();
  }
  fit.addEventListener('click',()=>resize(Math.min(1,(stage.clientWidth-24)/width,(stage.clientHeight-24)/height)));
  minus.addEventListener('click',()=>resize(scale-.25));plus.addEventListener('click',()=>resize(scale+.25));
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{const target=opener?.isConnected?opener:returnActions?.querySelectorAll('button')[returnIndex]||returnActions?.querySelector('button');target?.focus();});
  for(const container of references){
    const actions=document.createElement('div');actions.className='figure-enlarge-actions actions';container.after(actions);
    const buttons=[];
    const synchronize=()=>{
      const current=diagrams(container);
      while(buttons.length>current.length)buttons.pop().remove();
      current.forEach((source,index)=>{
        let launch=buttons[index];
        if(!launch){
          launch=document.createElement('button');launch.type='button';launch.className='figure-enlarge';launch.dataset.figureIndex=String(index);launch.setAttribute('aria-haspopup','dialog');actions.append(launch);buttons.push(launch);
          launch.addEventListener('click',()=>{const latest=diagrams(container)[index];if(latest)open(latest,launch,actions,index);});
        }
        launch.textContent=current.length===1?'Enlarge figure':'Enlarge diagram '+(index+1);
        if(current.length===1)launch.removeAttribute('aria-label');else launch.setAttribute('aria-label','Enlarge diagram '+(index+1)+': '+pictureTitle(source));
      });
    };
    synchronize();
    // Keep actions outside the replaced SVG content; same-count redraws preserve button focus.
    new MutationObserver(synchronize).observe(container,{childList:true});
  }
})();
