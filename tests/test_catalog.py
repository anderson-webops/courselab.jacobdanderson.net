"""Shared course routing, canonical identity and non-destructive state contracts."""
from html.parser import HTMLParser
import json
from pathlib import Path
import unittest
from urllib.parse import urljoin, urlsplit
from xml.etree import ElementTree

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'

class Tags(HTMLParser):
    def __init__(self,text):
        super().__init__();self.tags=[];self.feed(text)
    def handle_starttag(self,tag,pairs):self.tags.append((tag,dict(pairs)))
    handle_startendtag=handle_starttag

class CatalogTests(unittest.TestCase):
    def test_course_registry_has_stable_ids_and_matching_landing_pages(self):
        courses=json.loads((ROOT/'src/courses.json').read_text())
        keys=[x['institution']+'/'+x['code'] for x in courses]
        self.assertEqual(len(keys),len(set(keys)))
        self.assertIn('gt/ece6390',keys);self.assertIn('gt/ece6612',keys);self.assertIn('byu/phscs587',keys)
        for c,key in zip(courses,keys):
            page=(DIST/'courses'/key/'index.html').read_text()
            self.assertIn(c['displayCode'],page);self.assertIn(c['title'],page)
            if c['status']=='in-progress':self.assertIn('In progress',page)

    def test_every_page_has_one_primary_canonical_and_relative_internal_navigation(self):
        for file in DIST.rglob('*.html'):
            with self.subTest(page=str(file.relative_to(DIST))):
                tags=Tags(file.read_text()).tags
                expected='https://courselab.jacobdanderson.net/'+file.relative_to(DIST).as_posix().removesuffix('index.html')
                self.assertEqual([a['href'] for t,a in tags if t=='link' and a.get('rel')=='canonical'],[expected])
                self.assertTrue(any(a.get('id')=='course-switcher' for t,a in tags))
                for tag,a in tags:
                    for key in ['src','href']:
                        url=a.get(key)
                        if not url or url.startswith('#') or urlsplit(url).scheme:continue
                        self.assertFalse(url.startswith('/'),url)
                        for host in ['courselab.jacobdanderson.net','learn.jacobdanderson.net']:
                            base='https://'+host+'/'+file.relative_to(DIST).as_posix()
                            self.assertEqual(urlsplit(urljoin(base,url)).hostname,host)

    def test_sitemap_contains_only_primary_public_pages(self):
        xml=ElementTree.parse(DIST/'sitemap.xml')
        urls=[e.text for e in xml.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        self.assertEqual(len(urls),len(set(urls)))
        for url in urls:
            self.assertTrue(url.startswith('https://courselab.jacobdanderson.net/'))
            self.assertNotIn('/admin/',url)
            path=urlsplit(url).path.lstrip('/')
            self.assertTrue((DIST/path/'index.html').is_file())
        self.assertIn('https://courselab.jacobdanderson.net/',urls)

    def test_legacy_storage_keys_and_conflict_preservation_are_explicit(self):
        self.assertIn("const key = 'orbitalhw:orbit:v1'",(DIST/'assets/site.js').read_text())
        progress=(DIST/'assets/progress.js').read_text()
        for key in ['orbitalhw:orbit:v1','ece6390-course-lab-v1','orbitalhw-attempt-']:
            self.assertIn(key,progress)
        self.assertIn('!overwrite&&localStorage.getItem(k)!==null',progress)
        self.assertNotIn('localStorage.clear',progress)
