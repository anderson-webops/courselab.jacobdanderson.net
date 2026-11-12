(() => {
  'use strict';
  const input=document.getElementById('topic-search'),results=document.getElementById('search-results'),count=document.getElementById('search-count');
  const data=window.CourseSearchIndex||[];
  input.value=new URLSearchParams(location.search).get('q')||'';
  function draw(){
    const terms=input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches=data.filter(x=>terms.every(t=>(x.title+' '+x.code+' '+x.group+' '+x.text).toLowerCase().includes(t)));
    results.replaceChildren();
    for(const x of matches){const li=document.createElement('li'),a=document.createElement('a'),label=document.createElement('span');a.href='../'+x.route.slice(1);a.textContent=x.title;label.textContent=x.code+' · '+x.group;li.append(a,label);results.append(li);}
    count.textContent=matches.length+' topics';
    const u=new URL(location.href);if(input.value.trim())u.searchParams.set('q',input.value.trim());else u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search);
  }
  input.addEventListener('input',draw);draw();
})();
