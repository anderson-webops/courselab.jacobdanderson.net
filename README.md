# Course Lab

Shared course notes, explanations, figures, simulations and attempt-first practice. Courses, Simulations and Topics are centered in the header; Search sits at its right edge. Topics includes the interactive lessons and related tools. The former `/simulations/` index forwards to `/topics/`. Primary public name: **courselab.jacobdanderson.net**. **learn.jacobdanderson.net** serves the same application without changing the visitor’s hostname.

Source: [anderson-webops/courselab.jacobdanderson.net](https://github.com/anderson-webops/courselab.jacobdanderson.net).

## Build and preview

Use Node 26.13.1 and npm 12.2.1. There are no application dependencies or server database.

```sh
npm ci
npm run validate
python3 scripts/serve.py --port 4178
```

Open `http://127.0.0.1:4178`. Serve only `dist/`. The builder regenerates that directory, including routes, local assets, canonical links, search data, `sitemap.xml`, `robots.txt`, security headers and source hashes.

```sh
PLAYWRIGHT_MODULE=/path/to/playwright PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

Browser checks cover the preserved orbital models, course topics, project figures, course navigation, mobile layouts, state and requested-hostname behavior. The two-host test replays the local artifact under the requested HTTPS origins; production DNS, certificate validity and server routing require the separate live domain checks.

## Courses and topics

- `/courses/gt/ece6390/`: Satellite Communications and Navigation Systems.
- `/courses/gt/ece6612/`: Computer Network Security.
- `/courses/byu/phscs587/`: Physics of Semiconductor Devices.

Each course has its own landing page. Topics use `/courses/<institution>/<course>/topics/<stable-topic-id>/`. ECE 6390 also retains `/orbit/`, `/solar/`, `/project/` and `/lab/` within its course. Specialized orbit/solar explorers are linked from their relevant topics; GeorgiaTenna is grouped with arrays. The shared course navigation prioritizes the overview and topic sequence. Its unlinked `/admin/` route contains the code walkthrough. That route is a presentation choice, not authentication.

`src/courses.json` is the shared course registry. `scripts/catalog.py` generates the site home, course pages, navigation, breadcrumbs, search, canonical URLs and sitemap. `scripts/topics.py` builds the ECE 6390 lesson pages around the preserved model registry. All courses share figure utilities, control presentation, practice feedback and optional browser storage.

ECE 6390 authoring sources are `src/course-lab.html`, `src/course-update.js`, `src/course-extensions.js` and `src/course-navigation.js`; lesson prose and practice are in the corresponding `topic-*.json` files. The supplied HTML originals retain their original bytes. Adaptations belong in the builder and shared assets.

Other courses use the topic-array schema demonstrated by `src/additional-course-topics.json` and the BYU topic parts. Each entry provides `course`, `id`, `title`, `heading`, a figure-led `problem`, original `figureSvg`, explanatory paragraphs, an example, 1–2 staged questions and source notes. Optional `simulation` selects a model from `window.CourseFigureRegistry`. `src/course-model-assets.json` lists each course’s model scripts; the shared renderer supplies controls, equations, model scope, URL state and reset behavior. Subject modules use the common `{id, controls, render, checks}` interface. Figures and equations must state their units, assumptions and model limits.

To add a course, add its verified institution/code/title to `courses.json`, then add topic entries using that course key in a file under `src/course-topics/`. Reuse the shared shell and components. Keep topic IDs stable, validate the build, and review rendered pages on desktop and mobile. Mark incomplete course coverage `in-progress` and describe the gap. Publish original learning material; retain raw course documents, personal assignments, solutions, grades and confidential material outside this public repository.

## ECE 6612 coverage

The 26 topic lessons follow cryptography, link/IP protection, routing, transport/DNS, TLS/QUIC, web, authentication/email, access control, DoS and malware. Eleven adjustable models use the existing shared figure controls. Existing authenticated-encryption and TLS URLs and their saved-question prompts are retained. [Coverage and remaining depth](ECE6612-COVERAGE.md) records source scope and model limits.

## State and sharing

Existing storage keys are preserved: `orbitalhw:orbit:v1`, `ece6390-course-lab-v1` and `orbitalhw-attempt-*`. Storage failure does not disable simulations. Written attempts stay local and comparison feedback begins hidden. Topic controls use validated `c_<control-id>` query parameters where supported; direct links and refreshes restore those values. Question answers are never put in URLs.

Browser storage is isolated by origin. Consequently courselab, learn and the former orbitalhw hostname each have separate browser-local settings and progress, despite serving shared application content. `/progress/` exports supported entries to a JSON file and imports them on another hostname. Import keeps conflicting existing entries unless the user explicitly selects replacement. Existing saved keys are neither cleared nor renamed by this migration. If the former hostname continues to serve this build, its `/progress/` can export its prior local state.

No accounts or shared server-side progress store are introduced. Cross-host automatic progress or sign-in would be a separate architecture/privacy decision. Both domains use the same deployed artifact and content sources.

## Domains and delivery

All internal links and assets are relative. Course Lab retains the opened hostname during ordinary navigation. Every page’s canonical URL uses `https://courselab.jacobdanderson.net`; sitemap entries use that primary hostname. `learn` is an alias serving content directly, with no canonical-host navigation redirect.

`deploy/` contains the reviewed static-host and domain configuration. DNS, valid TLS for both names, and both hostnames selecting the same exact `dist/` release are production prerequisites. HTTP may redirect to HTTPS on its **same hostname**. Preserve the existing IPv4 and IPv6 records and rollback release when activating a new artifact.

Source publication is separate from protected deployment. Source agents commit, push and publish a verified immutable release through this repository. Production activation and server access remain with the protected server-side process. Consult the domain verification receipt for the exact observed state and remaining access/configuration requirements; a successful local build does not establish a public deployment.
