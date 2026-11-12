"""Independent static acceptance checks for the deployable tree."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.ids = []
        self.h1 = 0
        self.csp = None
        self.canonical = []

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        assert 'style' not in attrs, 'Inline style would violate production CSP'
        assert not any(name.lower().startswith('on') for name in attrs), 'Inline event handler'
        if tag == 'script':
            assert attrs.get('src'), 'Inline script would violate production CSP'
        if tag == 'meta' and attrs.get('http-equiv', '').lower() == 'content-security-policy':
            self.csp = attrs.get('content', '')
        if tag == 'h1':
            self.h1 += 1
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href'))
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for key in ('src', 'href'):
            if attrs.get(key):
                self.assets.append((tag, key, attrs[key], attrs.get('rel')))

    handle_startendtag = handle_starttag


def check():
    dist = ROOT / 'dist'
    course = 'courses/gt/ece6390/'
    required = ['index.html', course+'solar/index.html', course+'admin/index.html', course+'lab/index.html', 'assets/course-lab.js', 'assets/course-lab.css', 'assets/site.js', 'assets/site.css', 'assets/orbit.js', 'assets/sun-view.js', 'assets/orbit.css', 'assets/solar.js', 'assets/solar.css', 'assets/orbit-runtime.css', 'assets/favicon.svg', '_headers', 'source-info.json', 'sitemap.xml', 'robots.txt', 'search/index.html', 'progress/index.html']
    for name in required:
        assert (dist / name).is_file(), f'Missing required artifact: {name}'
    allowed_links = {link['url'] for links in json.loads((ROOT / 'src/related-tools.json').read_text()).values() for link in links}
    for file in dist.rglob('*.html'):
        text = file.read_text()
        page = Page()
        page.feed(text)
        assert len(page.ids) == len(set(page.ids)), f'Duplicate IDs in {file.name}'
        assert page.csp and "script-src 'self'" in page.csp and "style-src 'self'" in page.csp
        assert 'unsafe-inline' not in page.csp and 'unsafe-eval' not in page.csp
        assert all(f'data-site-view="{name}"' in text for name in ('courses','simulations','topics','search'))
        name=file.relative_to(dist).as_posix()
        canonical='/topics/' if name=='simulations/index.html' else '/'+name.removesuffix('index.html')
        assert page.canonical == ['https://courselab.jacobdanderson.net'+canonical]
        walkthrough = ['rk-heading', 'ol-rk-svg', 'ol-stages', 'flow-heading', 'ol-code-detail']
        if file == dist / course / 'admin/index.html':
            assert all(name in page.ids for name in walkthrough), 'Admin walkthrough is incomplete'
        else:
            assert not any(name in page.ids for name in walkthrough), 'Walkthrough leaked onto a public page'
        for tag, key, url, rel in page.assets:
            parsed = urlsplit(url)
            if url.startswith('#'):
                assert url[1:] in page.ids, f'Broken anchor {url}'
                continue
            if parsed.scheme or parsed.netloc:
                if tag == 'link' and rel == 'canonical':
                    assert url == page.canonical[0]
                    continue
                assert tag == 'a' and key == 'href' and url in allowed_links, f'External dependency or unexpected URL: {url}'
                continue
            target = (file.parent / unquote(parsed.path)).resolve()
            assert target.is_relative_to(dist), f'Path escapes dist: {url}'
            if target.is_dir():
                target /= 'index.html'
            assert target.is_file(), f'Missing linked file {url}'
            if file != dist / course / 'admin/index.html':
                assert target != dist / course / 'admin/index.html', 'Admin must not be linked from public navigation'
    for file in dist.rglob('*'):
        if not file.is_file():
            continue
        text = file.read_text()
        assert '/Users/' not in text, f'Local path leaked in {file.name}'
        assert not re.search(r'\b(?:AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,})\b', text), 'Unexpected credential-shaped value'
    info = json.loads((dist / 'source-info.json').read_text())
    for name, digest in info['source_sha256'].items():
        assert digest == hashlib.sha256((ROOT / 'src' / name).read_bytes()).hexdigest(), f'Source hash mismatch: {name}'
    headers = (dist / '_headers').read_text()
    assert "frame-ancestors 'none'" in headers
    assert 'immutable' not in headers, 'Unhashed assets must not use immutable caching'
    print('Static acceptance passed: pages, navigation, assets, source hashes, CSP and privacy checks.')


if __name__ == '__main__':
    check()
