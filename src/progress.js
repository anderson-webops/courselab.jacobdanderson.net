(() => {
  'use strict';
  const supported=k=>k==='orbitalhw:orbit:v1'||k==='ece6390-course-lab-v1'||k.startsWith('orbitalhw-attempt-')||k.startsWith('courselab:');
  const status=document.getElementById('progress-status');
  document.getElementById('export-progress').addEventListener('click',()=>{
    try{const entries={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(supported(k))entries[k]=localStorage.getItem(k);}const blob=new Blob([JSON.stringify({format:'courselab-progress',version:1,entries},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='course-lab-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=Object.keys(entries).length+' saved entries exported.';}catch{status.textContent='Browser storage is unavailable. Your current page can still be used.';}
  });
  document.getElementById('import-progress').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>2000000)throw Error('Progress files must be smaller than 2 MB.');const data=JSON.parse(await file.text());if(data.format!=='courselab-progress'||data.version!==1||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries))throw Error('Choose a Course Lab progress export.');
      const entries=Object.entries(data.entries);if(entries.some(([k,v])=>!supported(k)||typeof v!=='string'||v.length>200000))throw Error('This file contains unsupported progress entries.');
      const overwrite=document.getElementById('overwrite-progress').checked;let imported=0,kept=0;for(const[k,v]of entries){if(!overwrite&&localStorage.getItem(k)!==null){kept++;continue;}localStorage.setItem(k,v);imported++;}status.textContent=imported+' entries imported; '+kept+' existing entries kept.';
    }catch(e){status.textContent=e.message||'Progress could not be imported.';}
    event.target.value='';
  });
})();
