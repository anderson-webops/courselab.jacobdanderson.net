"""Readable, portable study chapters retain their figures and connections."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import unittest
from urllib.parse import urljoin, urlsplit, unquote
from scripts.catalog import relative

ROOT=Path(__file__).resolve().parents[1]


class Elements(HTMLParser):
    def __init__(self,text):
        super().__init__();self.items=[];self.feed(text)
    def handle_starttag(self,tag,pairs):self.items.append((tag,dict(pairs)))
    handle_startendtag=handle_starttag


class StudyNarrativeTests(unittest.TestCase):
    def test_both_exam_readings_preserve_all_scientific_figures(self):
        books=json.loads((ROOT/'src/study-narratives.json').read_text())
        self.assertEqual({b['id']:b['figureCount'] for b in books},{'exam-1':54,'exam-2':138})
        for book in books:
            for chapter in book['chapters']:
                with self.subTest(chapter=chapter['route']):
                    file=ROOT/'dist'/chapter['route'].lstrip('/')/'index.html'
                    text=file.read_text();tags=Elements(text).items
                    self.assertEqual(sum(tag=='h1' for tag,a in tags),1)
                    figures=[a for tag,a in tags if tag=='figure' and a.get('class')=='narrative-figure']
                    self.assertEqual(len(figures),chapter['figureCount'])
                    self.assertIn('data-compare',text)
                    self.assertRegex(text,r'data-compare[^>]* disabled')
                    if chapter['slug'] not in ('introduction','connections'):
                        self.assertIn('<math',text)
                    self.assertNotIn('mathjax',text.lower())
                    self.assertNotRegex(text,r'class="math (?:inline|display)"')
                    ids=[a['id'] for tag,a in tags if 'id' in a]
                    self.assertEqual(len(ids),len(set(ids)))
                    for tag,a in tags:
                        if tag=='img':
                            self.assertGreater(len(a.get('alt','')),20)
                            self.assertGreater(int(a['width']),0);self.assertGreater(int(a['height']),0)
                            path=unquote(urlsplit(urljoin(file.as_uri(),a['src'])).path)
                            self.assertTrue(Path(path).read_bytes().startswith(b'\x89PNG\r\n\x1a\n'))
                    visible=re.sub(r'<annotation\b.*?</annotation>','',text,flags=re.S)
                    self.assertNotRegex(visible,r'\\(?:ref|cite|guidefigure)\{')
                    self.assertNotIn('/Users/',text)

    def test_every_ece6390_topic_connects_to_its_longer_explanation(self):
        topics=list((ROOT/'dist/courses/gt/ece6390/topics').glob('*/index.html'))
        self.assertEqual(len(topics),95)
        for file in topics:
            with self.subTest(topic=file.parent.name):
                text=file.read_text()
                self.assertIn('Read the connected explanation',text)
                self.assertRegex(text,r'href="[^"]*study/exam-[12]/')

    def test_topic_readings_open_the_relevant_figure_inside_the_right_chapter(self):
        corrected={'array-normalization':'link','soft-decisions':'coding','amplifier-backoff':'advanced-digital'}
        for file in (ROOT/'dist/courses/gt/ece6390/topics').glob('*/index.html'):
            with self.subTest(topic=file.parent.name):
                links=[a['href'] for tag,a in Elements(file.read_text()).items
                       if tag=='a' and '/study/exam-' in a.get('href','')]
                self.assertTrue(links)
                for link in links:
                    target=urlsplit(urljoin(file.as_uri(),link))
                    self.assertTrue(target.fragment.startswith('fig:'))
                    page=Path(unquote(target.path))/'index.html'
                    self.assertIn(('figure',{'class':'narrative-figure','id':target.fragment}),Elements(page.read_text()).items)
                    if file.parent.name in corrected:
                        self.assertEqual(page.parent.name,corrected[file.parent.name])

    def test_reading_fragments_keep_directory_routes_and_the_requested_hostname(self):
        file='courses/gt/ece6390/topics/array-normalization/index.html'
        target='/courses/gt/ece6390/study/exam-2/link/?from=topic#fig:arr-normal'
        link=relative(file,target)
        self.assertEqual(link,'../../study/exam-2/link/?from=topic#fig:arr-normal')
        for host in ('courselab.jacobdanderson.net','learn.jacobdanderson.net'):
            self.assertEqual(urljoin('https://'+host+'/'+file,link),'https://'+host+target)

    def test_referenced_equations_display_their_source_numbers(self):
        books=json.loads((ROOT/'src/study-narratives.json').read_text())
        numbered=0
        for book in books:
            for chapter in book['chapters']:
                for display in re.finditer(r'<span id="(eq:[^"]+)"></span>\s*<span class="narrative-equation">(.*?<span class="narrative-equation-number">[^<]+</span>)</span>',chapter['html'],re.S):
                    with self.subTest(equation=display[1]):
                        self.assertRegex(display[2],r'<span class="narrative-equation-number">\([0-9]+\)</span>')
                        numbered+=1
        self.assertGreaterEqual(numbered,35)

    def test_readings_are_discoverable_without_changing_primary_navigation(self):
        overview=(ROOT/'dist/courses/gt/ece6390/index.html').read_text()
        for exam in ('exam-1','exam-2'):
            self.assertIn('href="study/'+exam+'/"',overview)
            self.assertTrue((ROOT/'dist/courses/gt/ece6390/study'/exam/'index.html').is_file())
        search=(ROOT/'dist/assets/search-index.js').read_text()
        self.assertIn('Exam 1 study narrative',search);self.assertIn('Exam 2 study narrative',search)


if __name__=='__main__':unittest.main()
