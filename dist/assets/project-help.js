/* Contextual teaching popovers stay outside the document's layout. */
(() => {
  'use strict';
  const root=document.getElementById('project-overview'),help=window.GeorgiaHelp;
  if(!root||!help)return;
  const panel=document.createElement('aside');panel.id='project-help-panel';panel.className='project-help-panel';panel.hidden=true;panel.setAttribute('popover','manual');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','project-help-title');
  const heading=document.createElement('h2');heading.id='project-help-title';
  const close=document.createElement('button');close.type='button';close.className='project-help-close';close.textContent='×';close.setAttribute('aria-label','Close explanation');
  const body=document.createElement('div');body.id='project-help-body';
  panel.append(heading,close,body);document.body.append(panel);
  const native=typeof panel.showPopover==='function';let active=null,pinned=false,timer=0,suppressFocus=false;
  const readoutSelectors={phasor:'[data-help-phasor]',optimal:'[data-help-optimal]', 'feed-phase':'.gs-element-state > span',fom:'[data-gs-fom]',coverage:'[data-gs-covered]',spill:'[data-gs-spill]',installed:'[data-gs-installed]'};
  function content(key){return key==='gs-preset'&&document.querySelector('[data-gs-preset]')?.value==='optimal'?help.optimal:help[key];}
  function hide(returnFocus=false){
    clearTimeout(timer);const previous=active;active=null;pinned=false;
    if(previous){previous.classList.remove('is-help-open');previous.setAttribute('aria-expanded','false');previous.removeAttribute('aria-describedby');}
    if(native&&panel.matches(':popover-open'))panel.hidePopover();panel.hidden=true;
    if(returnFocus&&previous){suppressFocus=true;previous.focus();queueMicrotask(()=>suppressFocus=false);}
  }
  function show(button,key,lock=false,force=false){
    clearTimeout(timer);
    if(pinned&&active!==button&&!lock&&!force)return;
    if(active&&active!==button){active.classList.remove('is-help-open');active.setAttribute('aria-expanded','false');active.removeAttribute('aria-describedby');}
    const same=active===button;active=button;pinned=lock||(same&&pinned);button.classList.add('is-help-open');button.setAttribute('aria-expanded','true');button.setAttribute('aria-describedby',body.id);
    const entry=content(key);heading.textContent=entry.title;body.replaceChildren();
    for(const text of entry.paragraphs||[]){const p=document.createElement('p');p.textContent=text;body.append(p);}
    for(const field of ['equation','example'])if(entry[field]){const p=document.createElement('p');p.className='project-help-'+field;p.textContent=entry[field];body.append(p);}
    panel.hidden=false;if(native&&!panel.matches(':popover-open'))panel.showPopover();
  }
  function scheduleHide(){clearTimeout(timer);timer=setTimeout(()=>{if(!pinned&&!panel.matches(':hover')&&active&&!active.matches(':hover')&&document.activeElement!==active&&!panel.contains(document.activeElement))hide();},180);}
  close.addEventListener('click',()=>hide(true));
  panel.addEventListener('pointerenter',()=>clearTimeout(timer));panel.addEventListener('pointerleave',scheduleHide);
  panel.addEventListener('focusout',e=>{if(!panel.contains(e.relatedTarget)&&e.relatedTarget!==active)hide();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();hide(panel.contains(document.activeElement));}});
  document.addEventListener('pointerdown',e=>{if(active&&!panel.contains(e.target)&&!active.contains(e.target))hide();});
  function insert(button,target){
    if(target.matches('input,select')){
      const label=target.labels?.[0];if(!label)return false;
      const row=document.createElement('span');row.className='project-help-label-row';
      if(label.contains(target)){
        const control=document.createElement('div');control.className='project-help-control';label.before(control);
        const check=target.type==='checkbox';if(check)control.classList.add('is-check');
        target.remove();row.append(...(check?[target]:[]),label,button);control.append(row);if(!check)control.append(target);
      }else{label.before(row);row.append(label,button);}
    }else if(target.matches('button')){
      const wrap=document.createElement('span');wrap.className='project-help-action';target.before(wrap);wrap.append(target,button);
    }else target.append(button);
    return true;
  }
  let count=0;
  for(const [key,entry]of Object.entries(help)){
    let targets=[];
    if(readoutSelectors[key]){
      let target=root.querySelector(readoutSelectors[key]);if(target?.tagName==='DD')target=target.parentElement.querySelector('dt');if(target)targets=[target];
    }else if(document.getElementById(key)&&root.contains(document.getElementById(key)))targets=[document.getElementById(key)];
    else if(key.startsWith('['))targets=[...root.querySelectorAll(key)];
    for(const target of targets){
      const b=document.createElement('button');b.type='button';b.className='project-help-button';b.setAttribute('aria-label','About '+entry.title);b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls',panel.id);b.setAttribute('aria-expanded','false');b.dataset.helpKey=key;
      const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='i';b.append(icon);
      if(!insert(b,target))continue;count++;
      b.addEventListener('pointerenter',()=>show(b,key));b.addEventListener('pointerleave',scheduleHide);
      b.addEventListener('focus',()=>{if(!suppressFocus)show(b,key,false,true);});b.addEventListener('blur',scheduleHide);
      b.addEventListener('click',e=>{e.stopPropagation();if(active===b&&pinned)hide();else{show(b,key,true);close.focus({preventScroll:true});}});
      b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&active===b){e.preventDefault();pinned=true;close.focus();}});
    }
  }
  root.dataset.helpReady='true';window.ProjectControlHelp=Object.freeze({count,close:()=>hide(),get active(){return active?.dataset.helpKey||null;}});
})();
