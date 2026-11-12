"""Course coverage, stable saved-attempt meanings and security lesson contracts."""
import json
from pathlib import Path
import unittest
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]


class SecurityCourseTests(unittest.TestCase):
    def setUp(self):
        self.lessons = []
        for file in sorted((ROOT / 'src/course-topics').glob('ece6612-*.json')):
            self.lessons.extend(json.loads(file.read_text()))

    def test_reviewed_order_covers_every_lesson_once(self):
        groups = json.loads((ROOT / 'src/topic-groups.json').read_text())['gt/ece6612']
        ordered = [ident for group in groups for ident in group['ids']]
        self.assertEqual(len(ordered), 26)
        self.assertEqual(len(set(ordered)), len(ordered))
        self.assertCountEqual(ordered, [t['id'] for t in self.lessons])
        self.assertEqual(ordered[0], 'security-models')
        self.assertEqual(ordered[-1], 'malware-spread')

    def test_original_figures_questions_and_scoped_models_reach_built_pages(self):
        self.assertEqual(sum(len(t['questions']) for t in self.lessons), 52)
        self.assertEqual(sum(bool(t.get('simulation')) for t in self.lessons), 11)
        for topic in self.lessons:
            with self.subTest(topic=topic['id']):
                self.assertEqual(topic['course'], 'gt/ece6612')
                ElementTree.fromstring(topic['figureSvg'])
                self.assertIn(len(topic['questions']), [1, 2])
                text = (ROOT / 'dist/courses/gt/ece6612/topics' / topic['id'] / 'index.html').read_text()
                self.assertIn('Fig. 1 shows ', text)
                self.assertIn('data-practice="gt-ece6612-' + topic['id'] + '-1"', text)
                self.assertIn('Sources and scope', text)
                if topic.get('simulation'):
                    self.assertIn('data-course-figure="' + topic['simulation'] + '"', text)
                    self.assertIn('security-models.js', text)
                self.assertNotRegex(text, r'/Users/|/Volumes/|BEGIN (?:RSA )?PRIVATE KEY')

    def test_existing_saved_question_prompts_keep_their_meaning(self):
        topics = {t['id']: t for t in self.lessons}
        self.assertEqual(topics['authenticated-encryption']['questions'][0]['prompt'],
                         'Does a valid authentication tag alone establish that a packet is fresh?')
        self.assertEqual([q['prompt'] for q in topics['tls-session-keys']['questions']], [
            "Why does proving that both ends computed a shared secret fail to establish the server's intended identity by itself?",
            'Why derive traffic keys instead of directly treating the raw Diffie–Hellman value as every encryption key?'])


if __name__ == '__main__':
    unittest.main()
