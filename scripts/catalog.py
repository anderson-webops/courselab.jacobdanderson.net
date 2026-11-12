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
    e = html.escape
    home = relative(file,'/')
    options = ['<option value="'+home+'">Choose a course</option>']
    for c in courses:
        key = c['institution']+'/'+c['code']
        options.append(f'<option value="{relative(file,"/courses/"+key+"/")}" {"selected" if current==key else ""}>{e(c["displayCode"])} · {e(c["title"])}</option>')
    nav = f'''<header class="catalog-header"><div class="catalog-bar"><a class="catalog-brand" href="{home}">Course Lab</a><nav aria-label="Site"><a href="{relative(file,'/courses/')}">Courses</a><a href="{relative(file,'/search/')}">Search</a><a href="{relative(file,'/progress/')}">Progress</a></nav><label class="course-switch-label">Course<select id="course-switcher">{''.join(options)}</select></label></div>'''
    if current:
        c = next(x for x in courses if x['institution']+'/'+x['code']==current)
        base = '/courses/'+current+'/'
        nav += f'<nav class="course-navigation" aria-label="Current course"><a data-site-view="overview" href="{relative(file,base)}">{e(c["displayCode"])} overview</a>'
        if current=='gt/ece6390':
            for key,label,path in [('topics','Topics','topics/'),('orbit','Orbit','orbit/'),('solar','Solar components','solar/'),('project','GeorgiaTenna','project/'),('lab','All simulations','lab/')]:
                active = ' aria-current="page"' if route(file)==base+path else ''
                # Admin remains an unlinked presentation route with its own orbit tab.
                target = base+('admin/' if key=='orbit' and '/admin/' in str(file) else path)
                nav += f'<a data-site-view="{key}" href="{relative(file,target)}"{active}>{label}</a>'
        else:
            nav += f'<a data-site-view="topics" href="{relative(file,base)}#topics">Topics</a>'
        nav += '</nav>'
    return nav+'</header>'


def page(file, title, body, csp, courses, current=None, extra='', noindex=False):
    css = ''.join(f'<link rel="stylesheet" href="{relative(file,"/assets/"+x)}">' for x in ['course-lab.css','topics.css','catalog.css'])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="{csp}"><title>{html.escape(title)} | Course Lab</title><link rel="canonical" href="{PRIMARY+route(file)}">{'<meta name="robots" content="noindex">' if noindex else ''}<link rel="icon" href="{relative(file,'/assets/favicon.svg')}" type="image/svg+xml">{css}<script src="{relative(file,'/assets/catalog.js')}" defer></script>{extra}</head><body class="topic-site"><a class="lab-skip" href="#main">Skip to content</a>{header(file,courses,current)}{body}</body></html>'''


def practice(ident, questions):
    e = html.escape
    return '<section class="topic-reading practice"><h2>Practice</h2>'+''.join(f'''<article class="practice-question" data-practice="{ident}-{n}"><h3>{n}. {e(q['prompt'])}</h3><label for="attempt-{n}">Your reasoning</label><textarea id="attempt-{n}" rows="4" maxlength="8000"></textarea><div class="practice-actions"><button type="button" data-hint aria-controls="hint-{n}">Hint</button><button type="button" data-compare aria-controls="answer-{n}" disabled>Compare reasoning</button></div><p id="hint-{n}" class="practice-hint" hidden>{e(q['hint'])}</p><p id="answer-{n}" class="practice-answer" hidden>{e(q['answer'])}</p></article>''' for n,q in enumerate(questions,1))+'</section>'


def build_catalog(root, csp):
    dest = root/'dist'
    courses = json.loads((root/'src/courses.json').read_text())
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
        text = text.replace('</head>',f'<link rel="canonical" href="{PRIMARY+route(new_file)}"><link rel="stylesheet" href="{relative(new_file,"/assets/catalog.css")}"><script src="{relative(new_file,"/assets/catalog.js")}" defer></script></head>')
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
        body=f'<main id="main" class="topic-page"><p class="topic-breadcrumb"><a href="{relative(file,"/courses/"+key+"/")}">{e(next(c["displayCode"] for c in courses if c["institution"]+"/"+c["code"]==key))}</a></p><h1>{e(t["title"])}</h1><figure class="topic-demonstration"{model_attr}><div class="figure" role="region" tabindex="0" aria-label="{e(t["heading"])}">{t["figureSvg"]}</div><figcaption>Fig. 1. {e(t["heading"])}</figcaption></figure><section class="topic-reading"><h2>From the figure to the concept</h2><p>Fig. 1 shows {e(t["problem"])}</p>'+''.join('<p>'+e(p)+'</p>' for p in t['explanation'])+'</section><section class="topic-reading"><h2>Example</h2><p>'+e(t['example'])+'</p></section><details><summary>Sources and scope</summary><ul>'+''.join('<li>'+e(s)+'</li>' for s in t['sourceNotes'])+'</ul></details>'+practice(key.replace('/','-')+'-'+t['id'],t['questions'])+'</main>'
        scripts = ['topic-practice.js']
        if model_attr:
            scripts = ['figure-utils.js', 'semiconductor-models.js']+(['device-models.js'] if (root/'src/device-models.js').exists() else [])+['course-figures.js','topic-practice.js']
        assets = ''.join(f'<script src="{relative(file,"/assets/"+s)}" defer></script>' for s in scripts)
        out=dest/file;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(page(file,t['title'],body,csp,courses,key,extra=assets))
        index.append({'title':t['title'],'course':key,'code':next(c['displayCode'] for c in courses if c['institution']+'/'+c['code']==key),'group':'Foundations','route':route(file),'text':' '.join(t['explanation'])})
    cards=[]
    for c in courses:
        key=c['institution']+'/'+c['code'];base='/courses/'+key+'/'
        title=c['displayCode']+' · '+c['title'];count=counts.get(key,0);status='In progress' if c['status']=='in-progress' else f'{count} topics'
        cards.append(f'<li><a href="{base.lstrip("/")}"><strong>{html.escape(c["displayCode"])}</strong><span>{html.escape(c["title"])}</span><small>{INSTITUTIONS[c["institution"]]} · {status}</small></a></li>')
        file=base.lstrip('/')+'index.html'
        course_topics=[x for x in index if x['course']==key]
        links=''.join(f'<li><a href="{relative(file,x["route"])}">{html.escape(x["title"])}</a></li>' for x in course_topics)
        tools=''
        if key=='gt/ece6390':
            tools='<ul class="course-tools">'+''.join(f'<li><a href="{path}/">{label}</a></li>' for path,label in [('topics','Browse all topics'),('orbit','Orbit and Sun'),('solar','Solar components'),('project','GeorgiaTenna project'),('lab','All simulations')])+'</ul>'
        unfinished=f'<p class="course-status">In progress</p><p>{html.escape(c.get("gap","Additional course topics and practice remain to be developed."))}</p>' if c['status']=='in-progress' else ''
        body=f'<main id="main" class="catalog-page"><p class="course-institution">{INSTITUTIONS[c["institution"]]}</p><h1>{html.escape(title)}</h1><p>{html.escape(c["description"])}</p>{unfinished}{tools}<section id="topics"><h2>Topics</h2><ul class="topic-grid">{links}</ul></section></main>'
        out=dest/file;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(page(file,title,body,csp,courses,key))
    home='<main id="main" class="catalog-page"><h1>Course Lab</h1><p class="catalog-intro">Course notes, explanations and interactive experiments.</p><section id="courses"><h2>Courses</h2><ul class="course-cards">'+''.join(cards)+'</ul></section></main>'
    (dest/'index.html').write_text(page('index.html','Course Lab',home,csp,courses))
    (dest/'courses').mkdir(exist_ok=True)
    course_index='<main id="main" class="catalog-page"><h1>Courses</h1><ul class="course-cards">'+''.join(card.replace('href="courses/', 'href="') for card in cards)+'</ul></main>'
    (dest/'courses/index.html').write_text(page('courses/index.html','Courses',course_index,csp,courses))
    # Search data is shipped as a local script to retain connect-src none.
    for title,path,text in [('GeorgiaTenna project','project/','Aperture, feeds, phases, steering, normalization, link budget and geographic coverage'),('Orbit and Sun','orbit/','Orbital forces, look angles and Sun geometry'),('Solar acceleration components','solar/','Radial and tangential projections of solar pressure')]:
        index.append({'title':title,'course':'gt/ece6390','code':'ECE 6390','group':'Interactive tools','route':'/'+ECE+'/'+path,'text':text})
    (dest/'assets/search-index.js').write_text('window.CourseSearchIndex='+json.dumps(index,ensure_ascii=False)+';\n')
    search='<main id="main" class="catalog-page"><h1>Search</h1><label for="topic-search">Courses and topics</label><input id="topic-search" type="search" autocomplete="off"><p id="search-count" role="status"></p><ul id="search-results" class="search-results"></ul></main>'
    (dest/'search').mkdir(exist_ok=True)
    (dest/'search/index.html').write_text(page('search/index.html','Search',search,csp,courses,extra='<script src="../assets/search-index.js" defer></script><script src="../assets/search.js" defer></script>',noindex=True))
    (dest/'progress').mkdir(exist_ok=True)
    (dest/'progress/index.html').write_text(page('progress/index.html','Progress and preferences',(root/'src/progress.html').read_text(),csp,courses,extra='<script src="../assets/progress.js" defer></script>',noindex=True))
    urls=[PRIMARY+route(f.relative_to(dest)) for f in sorted(dest.rglob('*.html')) if '/admin/' not in str(f.relative_to(dest)) and f.parent.name not in ['search','progress']]
    (dest/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>'+html.escape(u)+'</loc></url>\n' for u in urls)+'</urlset>\n')
    (dest/'robots.txt').write_text('User-agent: *\nDisallow: /'+ECE+'/admin/\nSitemap: '+PRIMARY+'/sitemap.xml\n')
