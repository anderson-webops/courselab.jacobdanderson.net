"""Author original study chapters from reviewed LaTeX; builds need no Pandoc."""
from concurrent.futures import ThreadPoolExecutor
from html import escape, unescape
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import hashlib
import json
import re
import subprocess
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE_ROUTE = '/courses/gt/ece6390/study/'
PRIMARY_DOMAINS = ('youtube.com', 'youtu.be', 'gatech.edu', 'mathworks.com',
                   'numpy.org', 'esa.int', 'gps.gov', 'nist.gov', 'noaa.gov',
                   'mit.edu', 'analog.com', 'etsi.org', 'byu.net', 'ctan.org', 'nasa.gov')
MACROS = r'\newcommand{\vct}[1]{\boldsymbol{#1}}\newcommand{\sinc}{\operatorname{sinc}}'


def group(text, start):
    """Read one balanced TeX argument, preserving its nested equations."""
    assert text[start] == '{'
    depth, end = 1, start + 1
    while depth:
        if text[end] in '{}' and text[end - 1] != '\\':
            depth += 1 if text[end] == '{' else -1
        end += 1
    return text[start + 1:end - 1], end


def plain(text):
    text = re.sub(r'\\(?:emph|textbf|textit|mathrm|textrm)\{([^{}]*)\}', r'\1', text)
    text = text.replace('~', ' ').replace('\\&', '&').replace('--', '-')
    return re.sub(r'\\[A-Za-z]+|[{}$]', '', text).strip()


def convert(text):
    # Modern font commands preserve the same mathematics in the MathML parser.
    text = re.sub(r'\\rm\s+([^{}]*)', lambda match:r'\mathrm{' + match[1].rstrip() + '}', text)
    text = re.sub(r'\\(mathbf|mathcal|mathrm|boldsymbol|mathbb)\s+([A-Za-z0-9])', r'\\\1{\2}', text)
    text = re.sub(r'\\notag\b', '', text)
    result = subprocess.run(['pandoc', '--from=latex', '--to=html5',
                             '--math-method=mathml', '--wrap=none'],
                            input=MACROS + '\n' + text, text=True,
                            capture_output=True, check=True)
    if result.stderr:
        sys.stderr.write(result.stderr)
    if 'class="math inline"' in result.stdout or 'class="math display"' in result.stdout:
        raise ValueError('An equation could not be rendered as native MathML.')
    # Column widths are a print-layout instruction; the web stylesheet owns them.
    return re.sub(r'\sstyle="[^"]*"', '', result.stdout)


def source_book(folder, exam):
    main = (folder / 'main.tex').read_text()
    pieces = [(folder / (path + '.tex')).read_text()
              for path in re.findall(r'\\input\{([^}]+)\}', main)]
    summary = main.find(r'\section*{Follow the Connections')
    if summary >= 0:
        pieces.append(main[summary:main.index(r'\begin{thebibliography}', summary)])
    text = '\n'.join(pieces)
    starts = list(re.finditer(r'\\section\*?\{', text))
    chapters = []
    for i, match in enumerate(starts):
        title, title_end = group(text, match.end() - 1)
        body = text[title_end:starts[i + 1].start() if i + 1 < len(starts) else len(text)]
        label = re.match(r'\s*\\label\{([^}]+)\}', body)
        ident = label[1] if label else 'sec:connections'
        slug = re.sub(r'^(?:sec:|e1-)', '', ident)
        slug = slug.removeprefix('e1-').replace('_', '-')
        if slug in ('intro', 'introduction'):
            slug = 'introduction'
            paragraphs = re.split(r'\n\s*\n', body)
            paragraphs = [p for p in paragraphs if not p.strip().startswith((
                'The November 10 class', 'The supplied pre-exam transcript',
                'The worked examples use declared teaching inputs.'))]
            body = '\n\n'.join(paragraphs)
            body = re.sub(r'Each topic opens with a figure\..*?(?=\\begin\{table\})',
                          'Some symbols change meaning between chapters; the notation table keeps their definitions together.\n\n', body, flags=re.S)
        chapters.append({'slug': slug, 'title': plain(title), 'label': ident,
                         'tex': body, 'route': BASE_ROUTE + exam + '/' + slug + '/'})
    assert len({c['slug'] for c in chapters}) == len(chapters)
    bibliography = {}
    entries = list(re.finditer(r'\\bibitem\{([^}]+)\}', main))
    for i, item in enumerate(entries):
        end = entries[i + 1].start() if i + 1 < len(entries) else main.index(r'\end{thebibliography}')
        bibliography[item[1]] = main[item.end():end].strip()
    labels = {}
    aux=(folder/'main.aux').read_text()
    for match in re.finditer(r'\\newlabel\{',aux):
        label,pos=group(aux,match.end()-1)
        payload,pos=group(aux,pos)
        number,_=group(payload,0)
        labels[label]=number
    return chapters, bibliography, labels


def figure_arguments(text):
    figures = []
    for match in re.finditer(r'\\guidefigure(?:small|tall)?\{', text):
        path, pos = group(text, match.end() - 1)
        caption, pos = group(text, pos)
        label, pos = group(text, pos)
        figures.append((match.start(), pos, path, caption, label))
    return figures


def raster(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return
    subprocess.run(['pdftoppm', '-singlefile', '-scale-to', '1600', '-png',
                    str(source), str(target.with_suffix(''))], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def import_book(folder, exam):
    chapters, bibliography, numbers = source_book(folder, exam)
    locations, assets, jobs = {}, {}, {}
    for chapter in chapters:
        for label in re.findall(r'\\label\{([^}]+)\}', chapter['tex']):
            locations[label] = chapter['route'] + '#' + label
        locations[chapter['label']] = chapter['route']
        for _, _, source, caption, label in figure_arguments(chapter['tex']):
            locations[label] = chapter['route'] + '#' + label
            file = Path(source).stem + '.png'
            target = ROOT/'src/narrative-figures'/exam/file
            asset = '/assets/narratives/' + exam + '/' + file
            assets[source] = asset
            jobs[str(target)] = (folder/source, target)
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(lambda pair: raster(*pair), jobs.values()))
    for chapter in chapters:
        body = chapter.pop('tex')
        used_sources = set()
        for start, end, source, caption, label in reversed(figure_arguments(body)):
            body = (body[:start] + r'\begin{figure}\includegraphics{' + assets[source] +
                    r'}\caption{' + caption + r'}\label{' + label + r'}\end{figure}' + body[end:])
        def reference(match):
            label = match[2]
            assert label in locations, 'Unresolved narrative reference ' + label
            number = numbers.get(label) or 'overview'
            if match[1] == 'eqref':
                number = '(' + number + ')'
            return r'\href{' + locations[label] + '}{' + number + '}'
        body = re.sub(r'\\(eqref|ref)\{([^}]+)\}', reference, body)
        def citation(match):
            keys = match[1].split(',')
            assert all(k in bibliography for k in keys)
            used_sources.update(keys)
            return ' '.join(r'\href{#source-' + k + '}{[source]}' for k in keys)
        body = re.sub(r'\\cite\{([^}]+)\}', citation, body)
        rendered = convert(body)
        # Retain equation targets outside the MathML semantics/TeX annotation.
        def equation(match):
            attrs, content = match[1], match[2]
            targets = re.findall(r'\\label\{([^}]+)\}', unescape(content))
            anchors = ''.join('<span id="'+escape(x)+'"></span>' for x in targets)
            math = '<math'+attrs+'>'+content+'</math>'
            if 'display="block"' in attrs:
                math = '<div class="narrative-equation">'+math+'</div>'
            return anchors + math
        rendered = re.sub(r'<math([^>]*)>(.*?)</math>', equation, rendered, flags=re.S)
        def figure(match):
            ident, inside = match[1], match[2]
            caption = re.search(r'<figcaption>(.*?)</figcaption>', inside, re.S)
            assert caption
            accessible_caption = re.sub(r'<annotation\b[^>]*>.*?</annotation>', '', caption[1], flags=re.S)
            alt = re.sub(r'<[^>]+>', ' ', accessible_caption)
            alt = ' '.join(unescape(alt).split())
            picture = re.search(r'<img\s[^>]*>', inside)[0]
            picture = re.sub(r'\salt="[^"]*"', '', picture).removesuffix(' />').removesuffix('>')
            image_path=ROOT/'src/narrative-figures'/exam/Path(re.search(r'src="([^"]+)"',picture)[1]).name
            width,height=struct.unpack('>II',image_path.read_bytes()[16:24])
            picture += ' alt="'+escape(alt, quote=True)+'" width="'+str(width)+'" height="'+str(height)+'" loading="lazy" decoding="async">'
            return ('<figure class="narrative-figure" id="'+ident+'">'
                    '<div class="figure course-static">'+picture+'</div>'
                    '<figcaption><strong>Fig. '+escape(numbers.get(ident,''))+'.</strong> '+caption[1]+
                    '</figcaption></figure>')
        rendered = re.sub(r'<figure id="([^"]+)">(.*?)</figure>', figure, rendered, flags=re.S)
        # The page shell owns the top-level section target and heading.
        rendered = re.sub(r'<span id="'+re.escape(chapter['label'])+r'"[^>]*></span>', '', rendered)
        rendered = re.sub(r'<p>\s*</p>', '', rendered)
        sources = ''.join('<li id="source-'+key+'">'+convert(bibliography[key])+'</li>'
                          for key in sorted(used_sources))
        if sources:
            rendered += '<details class="narrative-sources"><summary>Sources</summary><ul>'+sources+'</ul></details>'
        assert not re.search(r'<script|\son[a-z]+=|\sstyle=', rendered, re.I)
        assert '/Users/' not in rendered
        chapter['html'] = rendered
        chapter['figureCount'] = len(re.findall(r'class="narrative-figure"', rendered))
        chapter['sourceSha256'] = hashlib.sha256(body.encode()).hexdigest()
    title = 'Exam ' + exam[-1]
    descriptions = {
        'exam-1':'Orbital motion, look angles, spacecraft resources, traveling fields, basic antennas, and received link quality.',
        'exam-2':'Apertures and arrays, digital waveforms, DVB-S2, detection, coding, and satellite navigation.',
    }
    return {'id':exam,'title':title,'description':descriptions[exam],'chapters':chapters,
            'figureCount':sum(c['figureCount'] for c in chapters)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--exam-1',type=Path)
    parser.add_argument('--exam-2',type=Path)
    args = parser.parse_args()
    target = ROOT/'src/study-narratives.json'
    current = {x['id']:x for x in json.loads(target.read_text())} if target.exists() else {}
    for ident, source in [('exam-1',args.exam_1),('exam-2',args.exam_2)]:
        if source:
            current[ident] = import_book(source.resolve(), ident)
    target.write_text(json.dumps([current[k] for k in sorted(current)],indent=2,ensure_ascii=False)+'\n')
    urls=set()
    for book in current.values():
        for chapter in book['chapters']:
            for url in re.findall(r'href="(https?://[^"]+)"',chapter['html']):
                host=urlsplit(unescape(url)).hostname or ''
                assert any(host==d or host.endswith('.'+d) for d in PRIMARY_DOMAINS), 'Unreviewed source host '+host
                urls.add(unescape(url))
    provenance=ROOT/'src/provenance.json'
    data=json.loads(provenance.read_text())
    data['reference_links']=sorted(set(data.get('reference_links',[]))|urls)
    provenance.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({k:{'chapters':len(v['chapters']),'figures':v['figureCount']} for k,v in current.items()}))


if __name__ == '__main__':
    main()
