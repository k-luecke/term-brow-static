# termbrow.org (`term-brow-static`)

Static source for **[termbrow.org](https://termbrow.org)** — Kyle W. Luecke's technical engineering notebook and empirical case-study archive, rendered inside the fixed-frame interface of the open-source **[TermBrow](https://github.com/k-luecke/TermBrow)** terminal reading browser.

## Interface & Architecture

- **Fixed `84ch` Reading Frame:** Mirrors `TermBrow`'s Textual TUI (`termbrow/app.py`): top titlebar, interactive address/command bar (`#addrbar` supporting instant search plus `:notes`, `:work`, `:save`, `:library`, `:history`, `:keywords`, `:explore`, `:strip`, `:theme`, `:install`, `:help`), horizontal `For You · Explore` strip, tab bar, centered `84ch` reading column, and docked status/keybinding footer.
- **Inspectable Local Curation (`assets/js/site.js`):** Client-side port of `termbrow/curate.py` and `termbrow/store.py` (`0.98` per-visit exponential topic decay, `Focus 15% / Balanced 40% / Discover 65%` bounded exploration slots, zero remote analytics or cookies).
- **Content Surface:**
  - `notes.html` & `notes/*.html` — 5 long-form technical articles grounded in shipped protocols, kernel invariants, geophysical metrology, and survival analysis (`/feed.xml` Atom feed).
  - `work.html` & `projects/*.html` — 20 bounded empirical and systems case studies.
  - Open protocol standards ([paxiom.org](https://paxiom.org)) and institutional research/advisory operate through **[Driftbound Labs LLC](https://driftboundlabs.com/ventures.html)**.
