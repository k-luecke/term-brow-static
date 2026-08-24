# term-brow-static

Static presentation layer for **termbrow.org**.

GitHub remains the source/history/test layer; this repository provides a curated reading interface over selected research, investigations, and systems.

## Design constraints

- plain HTML/CSS/JS; no build step
- reading-first, minimal chrome, no SaaS-card aesthetic
- project pages organized as question → method → evidence/result → limits → source
- status vocabulary keeps failed, recorded, derived, projected, and verified claims visually distinct
- personal introduction is intentionally left for Kyle to write

## Structure

```text
index.html            portfolio front door
work.html             projects by problem type
method.html           research protocol / status vocabulary
about.html            factual background; personal prose intentionally absent
cv.html               concise professional history
projects/              case-study presentation pages
assets/                shared CSS + minimal theme JS
data/projects.json     hand-curated presentation manifest
CNAME                  termbrow.org
```

GitHub Pages publishes from `main` / repository root.
