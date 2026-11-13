/* Known feedback messages share a responsive reserved frame. */
(() => {
  'use strict';
  if(window.CourseStatusSlots)return;
  const degrees=n=>String(n===0?0:n).replace('-', '−')+'°';
  const wrap=n=>{let value=((n+180)%360+360)%360-180;return value===-180&&n>0?180:value;};
  const relativeNotes=[];
  for(let raw=-360;raw<=360;raw++){
    const relative=wrap(raw);
    let note=relative===0?'Exactly aligned with outward radial.':Math.abs(relative)===180?'Exactly opposite outward radial.':`${Math.abs(relative)}° ${relative>0?'counterclockwise':'clockwise'} from outward radial.`;
    if(raw!==relative)note=`${degrees(raw)} is equivalent to ${degrees(relative)}. `+note;
    relativeNotes.push(note);
  }
  const definitions=[
    {selector:'[data-gs-status]',kind:'georgia',messages:[
      'The array model could not be loaded.',
      'These settings cannot cover every Georgia sample within the power range.',
      'Below the 100-element baseline; partial-credit design.',
      'Install at least one radiating element.',
      'This parameter combination could not be evaluated.',
      'Georgia needs about 999.9 dBW for this setting, beyond the 0–110 dBW control range.'
    ]},
    {selector:'#solar-import-status',kind:'solar-import',messages:[
      'Independent angle controls. Import a moment from the orbit’s acceleration view.',
      'Imported from orbit, rounded to the nearest degree. Edit the angles to explore independently.',
      'Invalid imported angles ignored. Showing the default example.',
      'Reset to the default angles, independent of the orbit snapshot.',
      'Exploring independently. Import another moment from the orbit’s acceleration view.'
    ]},
    {selector:'#control-feedback',kind:'solar-feedback',messages:[
      'Interactive controls are initializing. The starting example is shown below.',
      'Enter an angle between −180° and 180°. The previous value has been kept.',
      'The angle was adjusted to −180°. Controls use whole degrees from −180° to 180°.',
      'The angle was adjusted to 180°. Controls use whole degrees from −180° to 180°.',
      'Presets keep θ fixed and change the acceleration direction φ.',
      'θ stayed fixed. φ was changed to set the chosen relative angle.',
      'Reset to θ = 35° and φ = 80°. Relative angle = 45°.'
    ]},
    {selector:'#relative-note',kind:'solar-result',messages:relativeNotes},
    {selector:'#radial-note',kind:'solar-result',messages:['Positive: away from Earth.','Negative: toward Earth.','No radial component.']},
    {selector:'#tangent-note',kind:'solar-result',messages:['Positive: toward increasing θ.','Negative: toward decreasing θ.','No tangential component.']},
    {selector:'#sun-force-note',kind:'sun-force',messages:[
      ...['4.540','2.270','0.908','0.454'].map(a=>`Solar pressure: ${a} μm/s² away from the Sun. Orange rays show sunlight; the solid orange arrow shows its push on the satellite.`),
      'Solar pressure off: acceleration is zero. Sunlight and the dashed direction guide remain, but no solar force is applied.'
    ]},
    {selector:'#ol-error',kind:'orbit-error',messages:['Invalid teaching orbit. Choose another setting.']},
    {selector:'#progress-status',kind:'progress',messages:[
      '100000 saved entries exported.',
      '100000 entries imported; 100000 existing entries kept.',
      'Browser storage is unavailable. Your current page can still be used.',
      'Progress files must be smaller than 2 MB.',
      'Choose a Course Lab progress export.',
      'This file contains unsupported progress entries.',
      'Progress could not be imported.'
    ]}
  ];
  const installed=[];
  for(const definition of definitions){
    const live=document.querySelector(definition.selector);
    if(!live||live.classList.contains('course-status-slot__live'))continue;
    const frame=document.createElement('div');frame.className='course-status-slot course-status-slot--'+definition.kind;
    frame.dataset.statusSlot=definition.kind;
    const measure=document.createElement('div');measure.className='course-status-slot__measure';measure.setAttribute('aria-hidden','true');measure.inert=true;
    for(const message of new Set(definition.messages)){
      const sample=document.createElement('span');sample.textContent=message;measure.append(sample);
    }
    live.before(frame);frame.append(measure,live);live.classList.add('course-status-slot__live');
    // Unexpected exception text stays readable inside the allocated region.
    const refresh=()=>{
      const scrollable=!live.hidden&&Boolean(live.textContent.trim())&&live.scrollHeight>live.clientHeight+1;
      if(scrollable)live.tabIndex=0;else live.removeAttribute('tabindex');
    };
    let scheduled=false;
    const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});};
    new MutationObserver(schedule).observe(live,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    new ResizeObserver(schedule).observe(frame);schedule();installed.push(definition.selector);
  }
  window.CourseStatusSlots=Object.freeze({installed:Object.freeze(installed)});
})();
