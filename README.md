# term-brow-static

Static presentation layer for **termbrow.org**.

GitHub remains the source/history/test layer; this repository provides a curated reading interface over selected research, investigations, and systems.

## Design constraints

- plain HTML/CSS/JS; no build step
- reading-first, minimal chrome, no SaaS-card aesthetic
- project pages organized as question → method → evidence/result → limits → source
- status vocabulary keeps failed, recorded, derived, projected, and verified claims visually distinct
- index and About carry a short bio / through-line; CV holds the compact professional record

## Structure

```text
index.html            portfolio front door + through-line intro
work.html             projects by problem type
method.html           research protocol / status vocabulary
about.html            bio + factual background
cv.html               concise professional history
projects/              case-study presentation pages
assets/                shared CSS + minimal theme JS
data/projects.json     hand-curated presentation manifest
CNAME                  termbrow.org
```

GitHub Pages publishes from `main` / repository root.
