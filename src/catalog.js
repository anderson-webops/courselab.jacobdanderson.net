'use strict';
document.getElementById('course-switcher')?.addEventListener('change',event=>{
  const url=new URL(event.target.value,location.href);
  if(url.origin===location.origin)location.assign(url.pathname+url.search+url.hash);
});
