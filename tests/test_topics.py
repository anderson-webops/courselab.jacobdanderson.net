"""Topic-route publication and attempt-first practice contracts."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


class TopicsTests(unittest.TestCase):
    def test_every_simulation_has_a_standalone_figure_first_topic(self):
        manifest = json.loads((DIST/'assets/topic-manifest.json').read_text())
        self.assertEqual(len(manifest), 67)
        self.assertEqual(len({x['id'] for x in manifest}), 67)
        for item in manifest:
            with self.subTest(topic=item['id']):
                page = (DIST/item['route'].strip('/')/'index.html').read_text()
                self.assertIn(f'data-topic="{item["id"]}"', page)
                self.assertLess(page.index('id="figure"'), page.index('From the figure'))
                self.assertLess(page.index('Fig. 1.'), page.index('Fig. 1 shows'))
                self.assertLess(page.index('<h2>Example'), page.index('id="practice-title"'))
                self.assertEqual(len(re.findall('<h1\\b', page)), 1)
                self.assertGreaterEqual(item['questions'], 1)
                self.assertLessEqual(item['questions'], 2)
                self.assertNotIn('<iframe', page)
                self.assertIn('topic-practice.js', page)

    def test_feedback_is_hidden_and_comparison_requires_an_attempt(self):
        for page in (DIST/'courses/gt/ece6390/topics').glob('*/index.html'):
            with self.subTest(topic=page.parent.name):
                text = page.read_text()
                self.assertRegex(text, r'data-compare[^>]* disabled')
                self.assertRegex(text, r'class="practice-answer" hidden')
                self.assertRegex(text, r'<textarea[^>]+maxlength="8000"')
        script = (DIST/'assets/topic-practice.js').read_text()
        self.assertIn("if (!input.value.trim()) return", script)
        self.assertNotRegex(script, r'fetch\(|XMLHttpRequest|WebSocket')

    def test_related_tools_are_anchors_and_not_runtime_dependencies(self):
        tools = json.loads((ROOT/'src/related-tools.json').read_text())
        self.assertGreaterEqual(len(tools), 12)
        for ident, links in tools.items():
            page = (DIST/'courses/gt/ece6390/topics'/ident/'index.html').read_text()
            for link in links:
                self.assertIn(f'href="{link["url"]}"',page)
                self.assertNotIn(f'src="{link["url"]}"',page)
