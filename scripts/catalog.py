"""Shared Course Lab routing, navigation, search metadata and canonical URLs."""
from pathlib import Path, PurePosixPath
from urllib.parse import urljoin, urlsplit, urlunsplit
import html
import json
import posixpath
import re

PRIMARY = 'https://courselab.jacobdanderson.net'
ECE = 'courses/gt/ece6390'
INSTITUTIONS = {'gt':'Georgia Tech','byu':'Brigham Young University'}


def route(file):
    return '/' + str(file).removesuffix('index.html')


def relative(file, target):
    folder = str(PurePosixPath(file).parent)
    out = posixpath.relpath(target.lstrip('/').split('#')[0] or '.', folder)
    if target.endswith('/') and not out.endswith('/'):
        out += '/'
    if '#' in target:
        out += '#' + target.split('#',1)[1]
    return out


def header(file, courses, current=None):
    current_route=route(file)
    nav=[]
    for ident,label,target in [('courses','Courses','/courses/'),('search','Search','/search/'),('simulations','Simulations','/simulations/'),('topics','Topics','/topics/')]:
        active=' aria-current="page"' if current_route==target or (ident=='topics' and '/topics/' in current_route) or (ident=='simulations' and current_route.split('/')[-2] in ['orbit','solar','project','lab','admin']) else ''
        nav.append(f'<a data-site-view="{ident}" href="{relative(file,target)}"{active}>{label}</a>')
    return '<header class="catalog-header"><nav class="catalog-bar" aria-label="Site">'+''.join(nav)+'</nav></header>'


def page(file, title, body, csp, courses, current=None, extra='', noindex=False):
    css = ''.join(f'<link rel="stylesheet" href="{relative(file,"/assets/"+x)}">' for x in ['course-lab.css','topics.css','catalog.css'])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="{csp}"><title>{html.escape(title) + (' | Course Lab' if title != 'Course Lab' else '')}</title><link rel="canonical" href="{PRIMARY+route(file)}">{'<meta name="robots" content="noindex">' if noindex else ''}<link rel="icon" href="{relative(file,'/assets/favicon.svg')}" type="image/svg+xml">{css}{extra}</head><body class="topic-site"><a class="lab-skip" href="#main">Skip to content</a>{header(file,courses,current)}{body}</body></html>'''


def practice(ident, questions):
    e = html.escape
    return '<section class="topic-reading practice"><h2>Practice</h2>'+''.join(f'''<article class="practice-question" data-practice="{ident}-{n}"><h3>{n}. {e(q['prompt'])}</h3><label for="attempt-{n}">Your reasoning</label><textarea id="attempt-{n}" rows="4" maxlength="8000"></textarea><div class="practice-actions"><button type="button" data-hint aria-controls="hint-{n}">Hint</button><button type="button" data-compare aria-controls="answer-{n}" disabled>Compare reasoning</button></div><p id="hint-{n}" class="practice-hint" hidden>{e(q['hint'])}</p><p id="answer-{n}" class="practice-answer" hidden>{e(q['answer'])}</p></article>''' for n,q in enumerate(questions,1))+'</section>'


def grouped_topics(file, entries, definitions):
    lookup={x['route'].rstrip('/').split('/')[-1]:x for x in entries}
    groups=[];used=set()
    for definition in definitions:
        chosen=[lookup[i] for i in definition['ids'] if i in lookup]
        if not chosen:continue
        used.update(x['route'] for x in chosen)
        anchor=f'<span id="group-{definition["anchor"]}"></span>' if definition.get('anchor') else ''
        links=''.join(f'<li><a href="{relative(file,x["route"])}">{html.escape(x["title"])}</a></li>' for x in chosen)
        related=''.join(f'<p><a href="{relative(file,x["route"])}">{html.escape(x["title"])}</a></p>' for x in definition.get('links',[]))
        groups.append(anchor+'<section><h2>'+html.escape(definition['title'])+'</h2><ul class="topic-grid">'+links+'</ul>'+related+'</section>')
    remaining=[x for x in entries if x['route'] not in used]
    if remaining:
        groups.append('<section><h2>Topics</h2><ul class="topic-grid">'+''.join(f'<li><a href="{relative(file,x["route"])}">{html.escape(x["title"])}</a></li>' for x in remaining)+'</ul></section>')
    return ''.join(groups)


def build_catalog(root, csp):
    dest = root/'dist'
    courses = json.loads((root/'src/courses.json').read_text())
    groups = json.loads((root/'src/topic-groups.json').read_text())
    model_assets = json.loads((root/'src/course-model-assets.json').read_text())
    extra_topics = []
    for source in [root/'src/additional-course-topics.json', *sorted((root/'src').glob('byu-topics-part-*.json')), *sorted((root/'src/course-topics').glob('*.json'))]:
        if source.exists():
            extra_topics.extend(json.loads(source.read_text()))
    assert len(extra_topics) == len({(t['course'],t['id']) for t in extra_topics}), 'Duplicate course topic ids'
    topics = json.loads((dest/'assets/topic-manifest.json').read_text())
    old_pages = list(dest.rglob('*.html'))
    mapping = {}
    for old in old_pages:
        name = old.relative_to(dest).as_posix()
        mapped = 'orbit/index.html' if name=='index.html' else 'topics/'+name[len('learn/'):] if name.startswith('learn/') else name
        mapping[name] = ECE+'/'+mapped
    def rewrite_url(file,new_file,tag,key,value):
        u = urlsplit(value)
        if value.startswith('#') or u.scheme or u.netloc:
            return value
        target = urlsplit(urljoin('https://local.invalid/'+file,value))
        path = target.path.lstrip('/')
        lookup = path+'index.html' if path.endswith('/') or not path else path
        mapped = mapping.get(lookup,path)
        if mapped.endswith('index.html'):
            mapped = mapped[:-len('index.html')]
        answer = relative(new_file,'/'+mapped)
        if target.path.endswith('/') and not answer.endswith('/'):
            answer += '/'
        return urlunsplit(('', '', answer, target.query, target.fragment))
    for old in old_pages:
        name = old.relative_to(dest).as_posix()
        new_file = mapping[name]
        text = old.read_text()
        def tag(match):
            return re.sub(r'\b(href|src)="([^"]*)"',lambda a:a[1]+'="'+html.escape(rewrite_url(name,new_file,match[0],a[1],html.unescape(a[2])),quote=True)+'"',match[0])
        text = re.sub(r'<[^>]+>',tag,text)
        new_header = header(new_file,courses,'gt/ece6390')
        patterns=[r'<header class="site-header">.*?</header>',r'<header class="topic-header">.*?</header>',r'<div class="lab-site-header">.*?</div>']
        replaced=0
        for pattern in patterns:
            text,n=re.subn(pattern,lambda m:new_header,text,count=1,flags=re.S)
            replaced+=n
        assert replaced==1,(name,replaced)
        text = text.replace('| Orbital HW','| Course Lab').replace('ECE 6390 · Course Lab','All simulations')
        if not name.startswith('learn/'):
            breadcrumb=f'<p class="topic-breadcrumb"><a href="{relative(new_file,"/"+ECE+"/")}">ECE 6390</a></p>'
            text=text.replace('<h1',breadcrumb+'<h1',1)
        if name.startswith('learn/') and name!='learn/index.html':
            text=text.replace('<p class="topic-breadcrumb">',f'<p class="topic-breadcrumb"><a href="{relative(new_file,"/"+ECE+"/")}">ECE 6390</a> / ',1)
            ident=PurePosixPath(name).parent.name
            related_map={'kepler-ellipse':[('Orbit and Sun explorer','orbit/')],'geo-frames':[('Orbit and Sun explorer','orbit/')],'numerical-orbits':[('Compare an integrated orbit','orbit/')],'solar-pressure-components':[('Solar components explorer','solar/'),('Solar acceleration along an orbit','orbit/')],'array-footprint':[('GeorgiaTenna project figures','project/')],'array-normalization':[('GeorgiaTenna project figures','project/')]}
            links=related_map.get(ident,[])
            if links:
                extras='<section class="topic-reading"><h2>Explore further</h2><ul>'+''.join(f'<li><a href="{relative(new_file,"/"+ECE+"/"+path)}">{html.escape(label)}</a></li>' for label,path in links)+'</ul></section>'
                text=text.replace('<section class="topic-reading practice"',extras+'<section class="topic-reading practice"',1)
        text = text.replace('</head>',f'<link rel="canonical" href="{PRIMARY+route(new_file)}"><link rel="stylesheet" href="{relative(new_file,"/assets/catalog.css")}"></head>')
        target=dest/new_file;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text);old.unlink()
    for folder in sorted((x for x in dest.rglob('*') if x.is_dir()),key=lambda x:len(x.parts),reverse=True):
        if not any(folder.iterdir()):folder.rmdir()
    index=[]
    for t in topics:
        t['route']='/'+ECE+'/topics/'+t['id']+'/'
        index.append({'title':t['title'],'course':'gt/ece6390','code':'ECE 6390','group':t['group'],'route':t['route'],'text':t['heading']})
    (dest/'assets/topic-manifest.json').write_text(json.dumps(topics,indent=2)+'\n')
    counts={'gt/ece6390':len(topics)}
    for t in extra_topics:
        key=t['course'];counts[key]=counts.get(key,0)+1
        file='courses/'+key+'/topics/'+t['id']+'/index.html'
        e=html.escape
        assert '<script' not in t['figureSvg'] and 'style=' not in t['figureSvg'] and 'onload=' not in t['figureSvg']
        model_attr = f' data-course-figure="{e(t["simulation"])}"' if t.get('simulation') else ''
        body=f'<main id="main" class="topic-page"><p class="topic-breadcrumb"><a href="{relative(file,"/courses/"+key+"/")}">{e(next(c["displayCode"] for c in courses if c["institution"]+"/"+c["code"]==key))}</a></p><h1>{e(t["title"])}</h1><figure class="topic-demonstration"{model_attr}><div class="figure course-static" role="region" tabindex="0" aria-label="{e(t["heading"])}">{t["figureSvg"]}</div><figcaption>Fig. 1. {e(t["heading"])}</figcaption></figure><section class="topic-reading"><h2>From the figure to the concept</h2><p>Fig. 1 shows {e(t["problem"])}</p>'+''.join('<p>'+e(p)+'</p>' for p in t['explanation'])+'</section><section class="topic-reading"><h2>Example</h2><p>'+e(t['example'])+'</p></section><details><summary>Sources and scope</summary><ul>'+''.join('<li>'+e(s)+'</li>' for s in t['sourceNotes'])+'</ul></details>'+practice(key.replace('/','-')+'-'+t['id'],t['questions'])+'</main>'
        scripts = ['topic-practice.js']
        if model_attr:
            scripts = ['figure-utils.js','figure-registry.js']+model_assets.get(key,[])+['course-figures.js','topic-practice.js']
        assets = ''.join(f'<script src="{relative(file,"/assets/"+s)}" defer></script>' for s in scripts)
        siblings=[x for x in extra_topics if x['course']==key]
        order={ident:i for i,ident in enumerate([ident for group in groups.get(key,[]) for ident in group['ids']])}
        siblings.sort(key=lambda x:order.get(x['id'],999))
        at=next(i for i,x in enumerate(siblings) if x['id']==t['id'])
        sequence=[]
        if at:sequence.append(f'<a rel="prev" href="../{siblings[at-1]["id"]}/">← {e(siblings[at-1]["title"])}</a>')
        if at+1<len(siblings):sequence.append(f'<a rel="next" href="../{siblings[at+1]["id"]}/">{e(siblings[at+1]["title"])} →</a>')
        body=body.replace('</main>','<nav class="topic-sequence" aria-label="More in this course">'+''.join(sequence)+'</nav></main>')
        out=dest/file;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(page(file,t['title'],body,csp,courses,key,extra=assets))
        index.append({'title':t['title'],'course':key,'code':next(c['displayCode'] for c in courses if c['institution']+'/'+c['code']==key),'group':'Foundations','route':route(file),'text':' '.join(t['explanation'])})
    cards=[]
    for c in courses:
        key=c['institution']+'/'+c['code'];base='/courses/'+key+'/'
        title=c['displayCode']+' · '+c['title'];count=counts.get(key,0);status='In progress' if c['status']=='in-progress' else f'{count} topics'
        cards.append(f'<li><a href="{base.lstrip("/")}"><strong>{html.escape(c["displayCode"])}</strong><span>{html.escape(c["title"])}</span><small>{INSTITUTIONS[c["institution"]]} · {status}</small></a></li>')
        file=base.lstrip('/')+'index.html'
        course_topics=[x for x in index if x['course']==key]
        links=grouped_topics(file,course_topics,groups.get(key,[]))
        tools=''
        if key=='gt/ece6390':
            tools='<p><a href="topics/">Browse the topic index</a></p>'
        unfinished=f'<p class="course-status">In progress</p><p>{html.escape(c.get("gap","Additional course topics and practice remain to be developed."))}</p>' if c['status']=='in-progress' else ''
        library=f'<p><a data-site-view="lab" href="lab/">Simulation library</a></p>' if key=='gt/ece6390' else ''
        body=f'<main id="main" class="catalog-page"><p class="course-institution">{INSTITUTIONS[c["institution"]]}</p><h1>{html.escape(title)}</h1><p>{html.escape(c["description"])}</p>{unfinished}{tools}<div id="topics">{links}</div>{library}</main>'
        out=dest/file;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(page(file,title,body,csp,courses,key))
        if key=='gt/ece6390':
            topic_file=ECE+'/topics/index.html'
            topic_body='<main id="course-lab" class="topic-index"><p class="topic-breadcrumb"><a href="../">ECE 6390</a></p><h1>Course topics</h1>'+grouped_topics(topic_file,course_topics,groups.get(key,[]))+'<p><a data-site-view="lab" href="../lab/">Simulation library</a></p></main>'
            (dest/topic_file).write_text(page(topic_file,'Course topics',topic_body.replace('id="course-lab"','id="main"'),csp,courses,key))
    interactive={('gt/ece6390', t['id']) for t in topics}
    interactive.update((t['course'],t['id']) for t in extra_topics if t.get('simulation'))
    for kind,title in [('topics','Topics'),('simulations','Simulations')]:
        file=kind+'/index.html';sections=[]
        for c in courses:
            key=c['institution']+'/'+c['code']
            chosen=[x for x in index if x['course']==key and (kind=='topics' or (key,x['route'].rstrip('/').split('/')[-1]) in interactive)]
            course_title=c['displayCode']+' · '+c['title']
            content=grouped_topics(file,chosen,groups.get(key,[])).replace('<h2>','<h3>').replace('</h2>','</h3>') if chosen else '<p>Interactive models in progress.</p>'
            sections.append(f'<section><h2><a href="{relative(file,"/courses/"+key+"/")}">{html.escape(course_title)}</a></h2>'+content+'</section>')
        body='<main id="main" class="catalog-page"><h1>'+title+'</h1>'+''.join(sections)+'</main>'
        folder=dest/kind;folder.mkdir(exist_ok=True)
        (folder/'index.html').write_text(page(file,title,body,csp,courses))
    home='<main id="main" class="catalog-page"><h1>Course Lab</h1><p class="catalog-intro">Course notes, explanations and interactive experiments.</p><section id="courses"><h2>Courses</h2><ul class="course-cards">'+''.join(cards)+'</ul></section></main>'
    (dest/'index.html').write_text(page('index.html','Course Lab',home,csp,courses))
    (dest/'courses').mkdir(exist_ok=True)
    course_index='<main id="main" class="catalog-page"><h1>Courses</h1><ul class="course-cards">'+''.join(card.replace('href="courses/', 'href="') for card in cards)+'</ul></main>'
    (dest/'courses/index.html').write_text(page('courses/index.html','Courses',course_index,csp,courses))
    # Search data is shipped as a local script to retain connect-src none.
    for title,path,text in [('GeorgiaTenna project','project/','Aperture, feeds, phases, steering, normalization, link budget and geographic coverage'),('Orbit and Sun','orbit/','Orbital forces, look angles and Sun geometry'),('Solar acceleration components','solar/','Radial and tangential projections of solar pressure')]:
        index.append({'title':title,'course':'gt/ece6390','code':'ECE 6390','group':'Interactive tools','route':'/'+ECE+'/'+path,'text':text})
    for c in courses:
        key=c['institution']+'/'+c['code']
        index.append({'title':c['displayCode']+' · '+c['title'],'course':key,'code':c['displayCode'],'group':'Course overview','route':'/courses/'+key+'/','text':c['description']})
    for entry in index:
        c=next(x for x in courses if x['institution']+'/'+x['code']==entry['course'])
        entry['courseTitle']=c['title']
        entry['institution']=INSTITUTIONS[c['institution']]
    course_rank={c['institution']+'/'+c['code']:i for i,c in enumerate(courses)}
    ranks={key:{ident:i for i,ident in enumerate([i for g in definitions for i in g['ids']])} for key,definitions in groups.items()}
    index.sort(key=lambda x:(course_rank[x['course']],-1 if x['group']=='Course overview' else ranks.get(x['course'],{}).get(x['route'].rstrip('/').split('/')[-1],999)))
    index.append({'title':'Progress and preferences','course':'shared','code':'Course Lab','courseTitle':'','institution':'','group':'Saved work','route':'/progress/','text':'Export import and move saved settings and written practice between hostnames'})
    (dest/'assets/search-index.js').write_text('window.CourseSearchIndex='+json.dumps(index,ensure_ascii=False)+';\n')
    search='<main id="main" class="catalog-page"><h1>Search</h1><label for="topic-search">Courses and topics</label><input id="topic-search" type="search" autocomplete="off"><p id="search-count" role="status"></p><ul id="search-results" class="search-results"></ul></main>'
    (dest/'search').mkdir(exist_ok=True)
    (dest/'search/index.html').write_text(page('search/index.html','Search',search,csp,courses,extra='<script src="../assets/search-index.js" defer></script><script src="../assets/search.js" defer></script>',noindex=True))
    (dest/'progress').mkdir(exist_ok=True)
    (dest/'progress/index.html').write_text(page('progress/index.html','Progress and preferences',(root/'src/progress.html').read_text(),csp,courses,extra='<script src="../assets/progress.js" defer></script>',noindex=True))
    urls=[PRIMARY+route(f.relative_to(dest)) for f in sorted(dest.rglob('*.html')) if '/admin/' not in str(f.relative_to(dest)) and f.parent.name not in ['search','progress']]
    (dest/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>'+html.escape(u)+'</loc></url>\n' for u in urls)+'</urlset>\n')
    (dest/'robots.txt').write_text('User-agent: *\nDisallow: /'+ECE+'/admin/\nSitemap: '+PRIMARY+'/sitemap.xml\n')
