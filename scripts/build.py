"""Build the supplied teaching tools into a dependency-free static site."""
from pathlib import Path
import hashlib
import html
import json
import re
import shutil
try:
    from scripts.topics import build_topics, build_project
    from scripts.catalog import build_catalog
except ModuleNotFoundError:
    from topics import build_topics, build_project
    from catalog import build_catalog

ROOT = Path(__file__).resolve().parents[1]
CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"


def write_generated(path, text):
    path.write_text('\n'.join(line.rstrip() for line in text.splitlines()).strip() + '\n')


def extract_document(source, name):
    styles = re.findall(r'<style\b[^>]*>(.*?)</style>', source, re.S | re.I)
    scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', source, re.S | re.I)
    body = re.search(r'<body\b[^>]*>(.*?)</body>', source, re.S | re.I)
    markup = body.group(1) if body else source
    markup = re.sub(r'<(?:style|script)\b[^>]*>.*?</(?:style|script)>', '', markup, flags=re.S | re.I)
    declarations = []

    def external_style(match):
        tag = match.group(0)
        inline = re.search(r'\sstyle=("|\')(.*?)\1', tag, re.S | re.I)
        if not inline:
            return tag
        class_name = f'{name}-inline-{len(declarations)}'
        declarations.append(f'.{class_name} {{ {html.unescape(inline.group(2))} }}')
        tag = tag[:inline.start()] + tag[inline.end():]
        existing = re.search(r'\bclass=("|\')(.*?)\1', tag, re.S)
        if existing:
            tag = tag[:existing.start(2)] + existing.group(2) + ' ' + class_name + tag[existing.end(2):]
        else:
            ending = '/>' if tag.endswith('/>') else '>'
            tag = tag[:-len(ending)] + f' class="{class_name}"' + ending
        return tag

    markup = re.sub(r'<[A-Za-z][^>]*>', external_style, markup)
    return markup, '\n'.join(styles + declarations), '\n'.join(scripts)


def shell(view, content, admin=False):
    orbit = view == 'orbit'
    assert not admin or orbit, 'The walkthrough belongs to the admin orbit page'
    base = '../' if admin or not orbit else './'
    orbit_link = './' if admin else base
    orbit_label = 'Orbit &amp; Code' if admin else 'Orbit'
    title = 'Orbit, forces &amp; look angles' if orbit else 'Solar acceleration components'
    intro = (('Change the orbit, follow the satellite, and connect each view to the code.' if admin else 'Change the orbit and follow the satellite’s forces and look angles.') if orbit else 'Change the angles to see one solar push resolved into radial and tangential components.')
    css = (f'<link rel="stylesheet" href="{base}assets/orbit-runtime.css">' if orbit else '')
    context = '' if orbit else '<p id="solar-import-status" class="import-status">Independent angle controls. Import a moment from the orbit’s acceleration view.</p>'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Interactive orbital physics, solar acceleration components, look angles and RK4 code learning tools.">
<meta name="referrer" content="no-referrer">
{'<meta name="robots" content="noindex">' if admin else ''}
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{orbit_label if orbit else 'Solar Components'} | Orbital HW</title>
<link rel="icon" href="{base}assets/favicon.svg" type="image/svg+xml">
{css}<link rel="stylesheet" href="{base}assets/{view}.css">
<link rel="stylesheet" href="{base}assets/site.css">
<script src="{base}assets/site.js" defer></script>
<script src="{base}assets/{view}.js" defer></script>
{f'<script src="{base}assets/sun-view.js" defer></script>' if orbit else ''}
</head>
<body>
<a class="site-skip" href="#main">Skip to the visualization</a>
<header class="site-header">
<nav class="site-nav" aria-label="Learning tools"><a data-site-view="orbit" href="{orbit_link}" {'aria-current="page"' if orbit else ''}>{orbit_label}</a><a data-site-view="solar" href="{base}solar/" {'' if orbit else 'aria-current="page"'}>Solar Components</a><a data-site-view="topics" href="{base}learn/">Topics</a><a data-site-view="project" href="{base}project/">GeorgiaTenna</a><a data-site-view="lab" href="{base}lab/">Course Lab</a></nav>
</header>
<main id="main" class="site-main">
<div class="site-intro"><h1>{title}</h1><p>{intro}</p></div>
{context}
{content}
<noscript><p>Enable JavaScript to use the interactive controls.</p></noscript>
</main>
</body>
</html>
'''


def replace_once(text, old, new):
    """Fail the build if a preserved source no longer matches its adaptation."""
    assert text.count(old) == 1, f'Expected one source landmark: {old[:80]}'
    return text.replace(old, new, 1)


def course_lab(source):
    """Keep the imported lab intact while satisfying the site's strict CSP."""
    markup, css, js = extract_document(source, 'course-lab')
    js = replace_once(js, 'style="fill:${color}"', 'fill="${color}"')
    js = replace_once(js,
                      '<i style="border-color:${q.color||C.a};${q.dash?\'border-top-style:dashed\':\'\'}"></i>',
                      '<svg class="legend-key" viewBox="0 0 22 6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="${q.color||C.a}" stroke-width="3" stroke-dasharray="${q.dash?\'5 3\':\'none\'}"/></svg>')
    # Internal authoring paths do not help a visitor identify course sources.
    js = replace_once(js, ".map(s=>`<li>${esc(s)}</li>`)",
                      ".map(s=>`<li>${esc(sourceLabel(s))}</li>`)")
    js = replace_once(js, "const groups=[", """function sourceLabel(source) {
  if (source.includes('Yn-MEMaiA0Y')) return 'WAV01: Maxwell’s equations';
  if (source.includes('R3KHaRWzpFM')) return 'WAV02: Helmholtz wave equation';
  if (source.includes('1V26Yr5KzW8')) return 'WAV03: Plane waves';
  if (source.includes('orbits.json')) return 'Course guided reading: astrodynamics and look angles';
  if (source.includes('subsystems.json')) return 'Course guided reading: spacecraft subsystems';
  if (source.includes('radio.json')) return 'Course guided reading: RF systems and propagation';
  if (source.includes('waves_antennas.json')) return 'Course guided reading: waves and wire antennas';
  if (source.includes('orbit_sim_math_final.py')) return 'Polar orbit model: derivatives, RK4 and observer geometry';
  if (source.includes('Double Curl')) return 'Analytic sinusoidal double-curl example';
  if (source.includes('2026-10-27')) return 'October 22 and 27 course notes: apertures and introductory arrays';
  return 'Supplied course notes and guided reading';
}
const groups=[""")
    js = replace_once(js, "const groups=[", (ROOT / 'src/course-update.js').read_text() + '\nconst groups=[')
    js = replace_once(js, "const groups=[", (ROOT / 'src/course-extensions.js').read_text() + '\nconst groups=[')
    js = replace_once(js, "const groups=[", (ROOT / 'src/course-navigation.js').read_text() + '\nconst groups=[')
    js = replace_once(js, "const groups=[", (ROOT / 'src/orbit-types.js').read_text() + '\nconst groups=[')
    order=[ident for group in json.loads((ROOT/'src/topic-groups.json').read_text())['gt/ece6390'] for ident in group['ids']]
    js = replace_once(js,'const groups=[','const courseTopicOrder='+json.dumps(order)+';\nmodules.sort((a,b)=>{const rank=id=>{const i=courseTopicOrder.indexOf(id);return i<0?999:i;};return rank(a.id)-rank(b.id);});\nconst groups=[')
    js = replace_once(js, "const root=document.getElementById('course-lab')", "if(document.querySelector('[data-project-overview]')) { window.CourseLab={modules,U,checks:()=>modules.flatMap(m=>(m.checks?.()||[]).map(x=>({module:m.id,...x})))}; return; }\nconst root=document.getElementById('course-lab')")
    js = replace_once(js, "['Antennas','Antennas']];", "['Antennas','Antennas'],['Digital','Digital signals'],['Navigation','Navigation']];")
    js = replace_once(js, "function sourceLabel(source) {", "function sourceLabel(source) {\n  if (source.startsWith('Course: ')) return source.slice(8);")
    js = replace_once(js, 'Course material through October 27, 2026', 'Class through October 29, 2026; assigned digital review')
    js = replace_once(js, 'This explicitly supplied uniform-array toy model extends the introductory pattern-multiplication picture, not a claim that the general array definition has already been taught.', 'This uniform identical-element model illustrates the general array factor defined in the October 29 lecture.')
    markup = replace_once(markup, '<h2 id="heading"></h2>', '<h2 id="heading"></h2><a id="topic-lesson" class="concept-lesson" href="../learn/kepler-ellipse/">Lesson and practice</a>')
    js = replace_once(js, "$('heading').textContent=m.heading;", "$('heading').textContent=m.heading;const lesson=$('topic-lesson');if(lesson)lesson.href='../topics/'+id+'/';")
    # Topic routes reuse the same physics and controls, locked to their own concept.
    js = replace_once(js, "const save=()=>", "if(root.dataset.topic) active=root.dataset.topic;\nconst save=()=>")
    js = replace_once(js, "const save=()=>{try{localStorage.setItem('ece6390-course-lab-v1',JSON.stringify({active,values}))}catch{}};", """if(root.dataset.topic) {
  const params=new URLSearchParams(location.search),m=modules.find(x=>x.id===active);
  for(const c of m.controls) {
    const raw=params.get('c_'+c.id),n=Number(raw);
    if(raw===null||raw.trim()===''||!Number.isFinite(n))continue;
    if(c.options ? c.options.some(x=>x.value===n) : n>=c.min&&n<=c.max)
      values[active][c.id]=c.options?n:Number(Math.min(c.max,Math.max(c.min,c.min+Math.round((n-c.min)/c.step)*c.step)).toPrecision(12));
  }
}
const save=()=>{
  try{localStorage.setItem('ece6390-course-lab-v1',JSON.stringify({active,values}))}catch{}
  if(root.dataset.topic)try{
    const url=new URL(location.href),m=modules.find(x=>x.id===active);
    for(const c of m.controls){const key='c_'+c.id;if(values[active][c.id]===c.value)url.searchParams.delete(key);else url.searchParams.set(key,values[active][c.id]);}
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }catch{}
};""")
    js = replace_once(js, 'pause();active=id;const m=modules.find', 'pause();id=root.dataset.topic||id;active=id;const m=modules.find')
    js = replace_once(js, "$('panel').setAttribute('aria-labelledby','tab-'+id)", "$('panel').setAttribute('aria-labelledby',root.dataset.topic?'topic-title':'tab-'+id)")
    js = replace_once(js, "history.replaceState(null,'','#'+id)", "!root.dataset.topic&&history.replaceState(null,'','#'+id)")
    js = replace_once(js, "$('footer').textContent=modules.length+' interactive concepts · Class through October 29, 2026; assigned digital review · Illustrative examples'", "$('footer').textContent=''")
    css += '''
.legend .legend-key { display:inline-block; width:22px; min-width:22px; height:6px; flex:none; }
.lab-site-header { max-width:1204px; margin:0 auto; padding:18px 0 0; }
.lab-site-tabs { display:flex; flex-wrap:wrap; gap:5px; border-bottom:1px solid var(--line); }
.lab-site-tabs a { display:inline-flex; align-items:center; min-height:44px; padding:9px 15px; color:var(--muted); background:var(--soft); border:1px solid var(--line); border-bottom:0; border-radius:8px 8px 0 0; text-decoration:none; }
.lab-site-tabs a[aria-current=page] { color:var(--ink); background:var(--surface); box-shadow:inset 0 3px var(--a); font-weight:650; }
.lab-skip { position:absolute; left:16px; top:-80px; background:var(--surface); padding:10px 16px; z-index:5; }
.lab-skip:focus { top:10px; }
@media(max-width:1260px) { .lab-site-header { margin-inline:28px; } }
@media(max-width:520px) { .lab-site-header { margin-inline:12px; } .lab-site-tabs a { padding:9px 11px; font-size:.9rem; } }
@media print { .lab-site-header { display:none; } }
'''
    page = f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Interactive concepts in orbital mechanics, arrays, navigation, digital signals, waves and RF links.">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>Course Lab | Orbital HW</title>
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/course-lab.css">
<script src="../assets/course-lab.js" defer></script>
</head><body>
<a class="lab-skip" href="#course-lab">Skip to the course lab</a>
<div class="lab-site-header"><nav class="lab-site-tabs" aria-label="Learning tools"><a data-site-view="orbit" href="../">Orbit</a><a data-site-view="solar" href="../solar/">Solar Components</a><a data-site-view="topics" href="../learn/">Topics</a><a data-site-view="project" href="../project/">GeorgiaTenna</a><a data-site-view="lab" href="./" aria-current="page">Course Lab</a></nav></div>
{markup}
<noscript><p>Enable JavaScript to use the interactive controls.</p></noscript>
</body></html>'''
    return page, css, js


def learning_layout(orbit, solar):
    """Simplify presentation without changing the preserved teaching sources."""
    orbit = replace_once(orbit, '<h2>One orbit, four connected views</h2>',
                         '<section class="experiment-controls" aria-labelledby="controls-heading"><h2 id="controls-heading">Set up the orbit</h2>')
    orbit = replace_once(orbit, '<div class="text-small">Based on orbit_sim_math_final.py · 48-hour teaching scenario · no optimized homework orbit · spherical Earth · equatorial motion · no eclipses or thrust</div>', '')
    orbit = replace_once(orbit, '<span class="text-small">αr = 0.5 · ΩEarth: sidereal day · ΩSun: 365 days</span>', '')
    orbit = replace_once(orbit, '  <div class="controls-gap">\n    <label class="form-label" for="ol-time">', '  <div class="timeline-controls"><div class="controls-gap">\n    <label class="form-label" for="ol-time">')
    orbit = replace_once(orbit, '  <div class="legend text-small"', '''  </div>
  <details class="model-notes"><summary>Model assumptions</summary><p>48 hours of equatorial motion around a spherical Earth; no eclipses or thrust. Reflectivity αr = 0.5. Earth rotates once per sidereal day; the solar push direction rotates once per 365 days.</p></details>
  </section>
  <div class="legend text-small"''')
    orbit = orbit.replace('<h3>', '<h2>').replace('</h3>', '</h2>')
    orbit = replace_once(orbit, '1 · Orbit and rotating observer', '1 · Orbit &amp; observer')
    orbit = replace_once(orbit, "2 · Accelerations in the satellite's local axes", '2 · Local accelerations')
    orbit = replace_once(orbit, '3 · Elevation: the station-satellite plane', '3 · Elevation')
    orbit = replace_once(orbit, '4 · Azimuth: looking down on the horizon', '4 · Azimuth')
    orbit = replace_once(orbit, '<div class="readout text-small tabular-nums" id="ol-force-values"></div>', '<div class="readout text-small tabular-nums" id="ol-force-values"></div>\n      <a class="site-action" id="inspect-solar" href="./solar/">Explore these solar components →</a>')
    orbit = replace_once(orbit, '<hr>\n  <h2>The same state inside update()</h2>', '<section class="lesson-section" aria-labelledby="rk-heading">\n  <h2 id="rk-heading">One integration step: RK4</h2>')
    orbit = replace_once(orbit, '<hr>\n  <h2>Code flow: searches outside, physics inside</h2>\n  <div class="text-small">Diagram only: density thresholds and optimized designs are not computed here.</div>', '</section>\n  <section class="lesson-section" aria-labelledby="flow-heading">\n  <h2 id="flow-heading">Follow the simulation loop</h2>')
    # Keep whole-run searches available, but teach the inner physics loop first.
    outer = re.search(r'  <div class="code-flow">.*?</div>\n  <div class="connector">↓</div>', orbit, re.S)
    assert outer
    outer_markup = outer.group(0).rsplit('\n  <div class="connector">', 1)[0]
    orbit = orbit[:outer.start()] + orbit[outer.end():]
    orbit = replace_once(orbit, '  <div id="ol-status"', '''  <details class="search-details"><summary>How whole-orbit searches use this loop</summary><p>Each search changes inputs between complete simulation runs. It does not steer the satellite during a run.</p>
''' + outer_markup + '''
  </details>
  </section>
  <div id="ol-status"''')
    # Remove the duplicate source title rather than just hiding it with CSS.
    solar, count = re.subn(r'    <header>.*?</header>', '', solar, count=1, flags=re.S)
    assert count == 1
    solar = replace_once(solar, '<footer class="footer">Geometry demonstration, not a trajectory simulation. The dashed circle in the left view is a position-angle guide, not a prediction of the orbit. Positive angles are counterclockwise. + tangential is the direction of increasing θ, not necessarily the direction of the satellite’s velocity.</footer>', '<details class="model-notes"><summary>Reading the diagrams</summary><p>The dashed circle is a position-angle guide, not a predicted orbit. Positive angles are counterclockwise. + tangential means increasing θ, not necessarily the direction of the satellite’s velocity.</p></details>')
    return orbit, solar


def build():
    dest = ROOT / 'dist'
    # dist is generated from versioned inputs; discard stale generated routes.
    if dest.exists():
        shutil.rmtree(dest)
    assets = dest / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    (dest / 'solar').mkdir(exist_ok=True)
    (dest / 'admin').mkdir(exist_ok=True)
    (dest / 'lab').mkdir(exist_ok=True)
    orbit_raw = (ROOT / 'src/orbit.html').read_text()
    solar_raw = (ROOT / 'src/solar-acceleration-visualizer.html').read_text()
    orbit, orbit_css, orbit_js = extract_document(orbit_raw, 'orbit')
    solar, solar_css, solar_js = extract_document(solar_raw, 'solar')
    orbit, solar = learning_layout(orbit, solar)
    orbit = replace_once(orbit, '  <div class="legend text-small"', (ROOT / 'src/sun-view.html').read_text() + '\n  <div class="legend text-small"')
    # Build a real public page without walkthrough markup, not a CSS-only gate.
    walkthrough_start = '<section class="lesson-section" aria-labelledby="rk-heading">'
    walkthrough_end = '<div id="ol-status"'
    assert orbit.count(walkthrough_start) == orbit.count(walkthrough_end) == 1
    public_orbit = orbit.split(walkthrough_start, 1)[0] + walkthrough_end + orbit.split(walkthrough_end, 1)[1]
    admin_orbit = replace_once(orbit, 'id="inspect-solar" href="./solar/"', 'id="inspect-solar" href="../solar/"')
    # One main landmark belongs to the shared site shell.
    solar = solar.replace('<main id="solar-acceleration-app">', '<div id="solar-acceleration-app">').replace('</main>', '</div>')
    orbit_js = orbit_js.replace('window.openai', 'window.orbitalState').replace('openai:set_globals', 'orbitalhw:restore')
    # Public and admin views share identical physics, but not walkthrough DOM.
    orbit_js = replace_once(orbit_js, '    function panelRK(row){', "    function panelRK(row){\n      if (!$('rk-svg')) return;")
    orbit_js = replace_once(orbit_js, '    function highlight(){', "    function highlight(){if (!$('code-detail')) return;")
    # Do not reuse delta for two different angles across the integrated views.
    orbit_js = orbit_js.replace("cfg.frame==='earth'?'δ':'θ'", "cfg.frame==='earth'?'Δλ':'θ'")
    draw_end = "highlight();$('error').hidden=true;"
    assert draw_end in orbit_js
    orbit_js = orbit_js.replace(draw_end, draw_end + "root.dispatchEvent(new Event('orbitalhw:state', {bubbles:true}));")
    orbit_js += "\ndocument.dispatchEvent(new Event('orbitalhw:state'));\n"
    # Imported angles retain the original tool's whole-degree control behavior.
    needle = 'const state = { ...initial };'
    assert needle in solar_js
    solar_js = solar_js.replace(needle, '''const state = { ...initial };
    const imported = new URLSearchParams(location.search);
    const incoming = ['theta', 'phi'].map(key => imported.get(key));
    const validImport = incoming.every(value => value !== null && value.trim() !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 180);
    if (validImport) {
      state.theta = Math.round(Number(incoming[0]));
      state.phi = Math.round(Number(incoming[1]));
      document.getElementById('solar-import-status').textContent = 'Imported from orbit, rounded to the nearest degree. Edit the angles to explore independently.';
    } else if (incoming.some(value => value !== null)) {
      document.getElementById('solar-import-status').textContent = 'Invalid imported angles ignored. Showing the default example.';
    }''')
    # SVG viewBox scaling must not shrink phone labels to unreadable text.
    solar_js = replace_once(solar_js, '      const placed = [];', '''      // Reserve the fixed axis labels and Earth before placing moving labels.
      const svg = byId(ids[0]).ownerSVGElement;
      const placed = Array.from(svg.querySelectorAll('text'))
        .filter(label => !ids.includes(label.id))
        .map(label => label.getBBox());''')
    solar_js = replace_once(solar_js, '    function drawFixedFrame() {', '''    function sizeDiagramLabels(id) {
      const svg = byId(id);
      const scale = Math.min(1, Math.abs(svg.getScreenCTM()?.a || 1));
      svg.style.setProperty('--diagram-label-size', `${16 / scale}px`);
      svg.style.setProperty('--diagram-small-size', `${14 / scale}px`);
    }

    function drawFixedFrame() {
      sizeDiagramLabels('fixed-svg');''')
    solar_js = replace_once(solar_js, '    function drawLocalFrame(relative, ar, at) {', '''    function drawLocalFrame(relative, ar, at) {
      sizeDiagramLabels('local-svg');''')
    solar_js = replace_once(solar_js, '    // Render before enabling controls.', '''    let diagramWidth = 0;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - diagramWidth) > .5) {
        diagramWidth = width;
        render();
      }
    }).observe(root);

    // Render before enabling controls.''')
    for name, body, css, js in [('orbit', public_orbit, orbit_css, orbit_js), ('solar', solar, solar_css, solar_js)]:
        write_generated(assets / f'{name}.css', css)
        write_generated(assets / f'{name}.js', js)
        write_generated(dest / ('index.html' if name == 'orbit' else 'solar/index.html'), shell(name, body))
    write_generated(dest / 'admin/index.html', shell('orbit', admin_orbit, admin=True))
    lab, lab_css, lab_js = course_lab((ROOT / 'src/course-lab.html').read_text())
    # Fixed-palette reference SVGs retain their authored fills and label sizes.
    # The live figures continue to inherit the surrounding page theme.
    for selector in ['.figure svg text', '.figure svg .tick', '.figure svg .axis-title']:
        lab_css = lab_css.replace(selector, selector.replace('.figure', '.figure:not(.course-static)', 1))
    start = lab_js.index('const C=')
    end = lab_js.index('const Orb =', start)
    helpers = lab_js[start:end]
    write_generated(assets/'figure-utils.js', "(() => {'use strict';\n"+helpers+'\nwindow.CourseFigureU=U;\n})();')
    lab_js = lab_js[:start]+'const U=window.CourseFigureU;\nconst {C,esc,fmt,text,line,path,circle,arrow,svg,range,legend,wheel,plot}=U;\n'+lab_js[end:]
    lab = lab.replace('<script src="../assets/course-lab.js"', '<script src="../assets/figure-utils.js" defer></script>\n<script src="../assets/course-lab.js"')
    write_generated(dest / 'lab/index.html', lab)
    write_generated(assets / 'course-lab.css', lab_css)
    write_generated(assets / 'course-lab.js', lab_js)
    count = build_topics(ROOT, CSP)
    build_project(ROOT, CSP)
    for name in ['site.css', 'site.js', 'sun-view.js', 'favicon.svg', 'orbit-runtime.css', 'topics.css', 'topic-practice.js', 'project.css', 'project.js', 'georgia-optimal.js', 'georgia-system-model.js', 'georgia-system.js', 'georgia-help.js', 'project-help.js', 'project-help.css', 'status-slots.js', 'status-slots.css', 'figure-viewer.js', 'figure-viewer.css', 'catalog.css', 'search.js', 'progress.js']:
        shutil.copyfile(ROOT / 'src' / name, assets / name)
    configured_models = json.loads((ROOT/'src/course-model-assets.json').read_text())
    for name in ['figure-registry.js','course-figures.js', *sorted({name for names in configured_models.values() for name in names})]:
        assert re.fullmatch(r'[a-z0-9-]+\.js',name), f'Invalid model asset: {name}'
        if (ROOT/'src'/name).exists():
            shutil.copyfile(ROOT/'src'/name,assets/name)
    build_catalog(ROOT, CSP)
    # Known automatic feedback uses reserved frames on all applicable routes.
    for page in dest.rglob('*.html'):
        prefix = '../' * (len(page.relative_to(dest).parts) - 1)
        extra = f'<link rel="stylesheet" href="{prefix}assets/status-slots.css"><script src="{prefix}assets/status-slots.js" defer></script>'
        page.write_text(page.read_text().replace('</head>', extra + '</head>'))
    (dest / '_headers').write_text('/*\n  Content-Security-Policy: ' + CSP + "; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: no-cache\n")
    provenance = json.loads((ROOT / 'src/provenance.json').read_text())
    provenance['version'] = (ROOT / 'VERSION').read_text().strip()
    for source in sorted((ROOT/'src').rglob('*')):
        if source.is_file() and source.suffix in ['.js','.css','.html','.svg','.json'] and source.name != 'provenance.json':
            provenance['source_sha256'][source.relative_to(ROOT/'src').as_posix()] = hashlib.sha256(source.read_bytes()).hexdigest()
    (dest / 'source-info.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(f'Built Course Lab with {len(list(dest.rglob('*.html')))} pages; all runtime assets are local.')


if __name__ == '__main__':
    build()
