"""Build figure-led topic routes from the shared, locally executed simulations."""
from pathlib import Path
import html
import json
import re

GROUPS = [('Orbits', 'Orbits and look angles'), ('Systems', 'Spacecraft systems'),
          ('Waves', 'Waves and fields'), ('RF', 'RF links'), ('Antennas', 'Antennas and arrays'),
          ('Navigation', 'Navigation'), ('Digital', 'Digital signals')]


def inventory(root):
    result = []
    for name in ['course-lab.html', 'course-update.js', 'course-extensions.js', 'course-navigation.js']:
        source = (root / 'src' / name).read_text()
        starts = list(re.finditer(r"modules\.push\(\{\s*id:\s*'([a-z0-9-]+)'", source))
        for i, match in enumerate(starts):
            block = source[match.end():starts[i+1].start() if i+1 < len(starts) else len(source)]
            item = {'id': match.group(1)}
            for key in ['group', 'title', 'heading']:
                field = re.search(r'\b'+key+r"\s*:\s*'((?:\\.|[^'])*)'", block)
                assert field, f'Missing {key}: {item["id"]}'
                item[key] = field.group(1).replace("\\'", "'")
            result.append(item)
    assert len(result) == len({item['id'] for item in result})
    return result


def shell(title, body, csp, *, topic=None):
    prefix = '../../' if topic else '../'
    scripts = (f'<script src="{prefix}assets/figure-utils.js" defer></script>\n<script src="{prefix}assets/course-lab.js" defer></script>\n'
               f'<script src="{prefix}assets/topic-practice.js" defer></script>') if topic else ''
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="description" content="{html.escape(title)}: interactive figures, explanations, examples and practice.">
<title>{html.escape(title)} | Orbital HW</title>
<link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{prefix}assets/course-lab.css">
<link rel="stylesheet" href="{prefix}assets/topics.css">
{scripts}</head><body class="topic-site">
<a class="lab-skip" href="#course-lab">Skip to content</a>
<header class="topic-header"><nav aria-label="Learning tools"><a data-site-view="orbit" href="{prefix}">Orbit</a><a data-site-view="solar" href="{prefix}solar/">Solar components</a><a data-site-view="topics" href="{'../' if topic else './'}" aria-current="{'true' if topic else 'page'}">Topics</a><a data-site-view="project" href="{prefix}project/">GeorgiaTenna</a><a data-site-view="lab" href="{prefix}lab/">Course lab</a></nav></header>
{body}
</body></html>'''


def build_topics(root, csp):
    topics = inventory(root)
    course_groups = json.loads((root/'src/topic-groups.json').read_text()).get('gt/ece6390',[])
    order=[ident for group in course_groups for ident in group['ids']]
    ordered=sorted(topics,key=lambda x:order.index(x['id']) if x['id'] in order else len(order))
    content = json.loads((root / 'src/topic-content.json').read_text())
    extensions = json.loads((root / 'src/topic-extensions.json').read_text())
    assert not (content.keys() & extensions.keys()), 'Duplicate topic content'
    content.update(extensions)
    navigation = json.loads((root/'src/topic-navigation.json').read_text())
    assert not (content.keys() & navigation.keys()), 'Duplicate navigation content'
    content.update(navigation)
    related_tools = json.loads((root / 'src/related-tools.json').read_text())
    assert content.keys() == {item['id'] for item in topics}, 'Topic content and simulations differ'
    esc = html.escape
    dest = root / 'dist/learn'
    dest.mkdir(exist_ok=True)
    for old in dest.glob('*/index.html'):
        if old.parent.name not in content:
            old.unlink()
            old.parent.rmdir()
    sections = []
    for group, label in GROUPS:
        cards = ''.join(f'<li><a href="{item["id"]}/">{esc(item["title"])}</a></li>' for item in topics if item['group'] == group)
        sections.append(f'<section aria-labelledby="group-{group}"><h2 id="group-{group}">{label}</h2><ul class="topic-grid">{cards}</ul></section>')
    jumps = '<nav class="topic-jumps" aria-label="Course subjects">'+''.join(f'<a href="#group-{group}">{label}</a>' for group, label in GROUPS)+'</nav>'
    body = '<main id="course-lab" class="topic-index"><h1>Course topics</h1>'+jumps+''.join(sections)+'</main>'
    (dest / 'index.html').write_text(shell('Course topics', body, csp))
    manifest = []
    for item in topics:
        ident = item['id']
        data = content[ident]
        assert 1 <= len(data['questions']) <= 2, ident
        paragraphs = ''.join('<p>'+esc(p)+'</p>' for p in data['explanation'])
        related = related_tools.get(ident, data.get('relatedTools', []))
        if related:
            for link in related:
                assert link['url'].startswith('https://adamdjellouli.com/tools/'), link
            links = '<section class="topic-reading"><h2>Related tools</h2><ul>'+''.join(f'<li><a href="{esc(link["url"])}" rel="noreferrer">{esc(link["title"])}</a> <span class="external-author">Adam Djellouli</span></li>' for link in related)+'</ul></section>'
        else:
            links = ''
        practice = []
        for n, question in enumerate(data['questions'], 1):
            assert all(question.get(k) for k in ['prompt', 'hint', 'answer']), ident
            practice.append(f'''<article class="practice-question" data-practice="{ident}-{n}"><h3>{n}. {esc(question['prompt'])}</h3>
<label for="attempt-{n}">Your reasoning</label><textarea id="attempt-{n}" rows="4" maxlength="8000"></textarea>
<div class="practice-actions"><button type="button" data-hint aria-controls="hint-{n}">Hint</button><button type="button" data-compare aria-controls="answer-{n}" disabled>Compare reasoning</button></div>
<p id="hint-{n}" class="practice-hint" hidden>{esc(question['hint'])}</p><p id="answer-{n}" class="practice-answer" hidden>{esc(question['answer'])}</p></article>''')
        siblings = ordered
        at = siblings.index(item)
        prev = f'<a rel="prev" href="../{siblings[at-1]["id"]}/">← {esc(siblings[at-1]["title"])}</a>' if at else '<span></span>'
        nxt = f'<a rel="next" href="../{siblings[at+1]["id"]}/">{esc(siblings[at+1]["title"])} →</a>' if at+1 < len(siblings) else '<span></span>'
        body = f'''<main id="course-lab" class="topic-page" data-topic="{ident}">
<p class="topic-breadcrumb"><a href="../#group-{item['group']}">{dict(GROUPS)[item['group']]}</a></p>
<h1 id="topic-title">{esc(item['title'])}</h1>
<div id="subjects" hidden></div><div id="concepts" hidden></div>
<section id="panel" aria-labelledby="topic-title">
<figure class="topic-demonstration"><div class="workspace"><div class="visual"><div id="figure" class="figure" role="region" aria-label="Interactive figure" tabindex="0"></div><div id="stats" class="stats" aria-live="polite"></div></div><div id="controls" class="controls"></div></div>
<figcaption>Fig. 1. <span id="heading">{esc(item['heading'])}</span>.</figcaption></figure>
<div id="equation" class="equation"></div><p id="note" class="note"></p><p id="intro" hidden></p><p id="question" hidden></p>
<section class="topic-reading"><h2>{esc(data.get('sectionTitle', 'From the figure to the physics'))}</h2><p>Fig. 1 shows {esc(data['problem'])}</p>{paragraphs}</section>
<section class="topic-reading"><h2>Example</h2><p>{esc(data['example'])}</p></section>
{links}
<details class="topic-sources"><summary>Model and course sources</summary><ul id="sources"></ul></details>
<section class="topic-reading practice" aria-labelledby="practice-title"><h2 id="practice-title">Practice</h2>{''.join(practice)}</section>
</section><footer id="footer" hidden></footer><nav class="topic-sequence" aria-label="More in this course">{prev}{nxt}</nav>
<noscript><p>Enable JavaScript for the interactive figure and practice feedback.</p></noscript></main>'''
        folder = dest / ident
        folder.mkdir(exist_ok=True)
        (folder / 'index.html').write_text(shell(item['title'], body, csp, topic=ident))
        manifest.append({**item, 'route': f'/learn/{ident}/', 'questions': len(data['questions'])})
    (root / 'dist/assets/topic-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return len(topics)


def build_project(root, csp):
    page = shell('The GeorgiaTenna design', (root/'src/project.html').read_text(), csp)
    page = page.replace('href="#course-lab"', 'href="#project-overview"')
    page = page.replace('href="./" aria-current="page">Topics', 'href="../learn/">Topics')
    page = page.replace('href="../project/">GeorgiaTenna', 'href="./" aria-current="page">GeorgiaTenna')
    page = page.replace('</head>', '''<link rel="stylesheet" href="../assets/project.css">
<script src="../assets/figure-utils.js" defer></script>
<script src="../assets/course-lab.js" defer></script>
<script src="../assets/project.js" defer></script>
<script src="../assets/topic-practice.js" defer></script></head>''')
    folder = root/'dist/project'
    folder.mkdir(exist_ok=True)
    (folder/'index.html').write_text(page)
