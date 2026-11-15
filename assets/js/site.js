/* TermBrow Web Runtime — Faithful port of TermBrow's local reading state:
 * - ~/.termbrow/keywords.json  -> localStorage['tb-keywords'] (0.98 decay + 1.0 visit boost)
 * - ~/.termbrow/history.json   -> localStorage['tb-history']
 * - ~/.termbrow/library.json   -> localStorage['tb-library']
 * - ~/.termbrow/prefs.json     -> localStorage['tb-prefs'] (explore mode, feed visibility, theme)
 * - Address/Command bar (:notes, :work, :library, :history, :keywords, :explore, :install, :help, live search)
 */
(() => {
  const root = document.documentElement;
  const THEME_KEY = 'termbrow-theme';
  const KW_KEY = 'tb-keywords-v1';
  const HIST_KEY = 'tb-history-v1';
  const LIB_KEY = 'tb-library-v1';
  const PREF_KEY = 'tb-prefs-v1';
  const TABS_KEY = 'tb-tabs-v1';

  const EXPLORE_MODES = [
    { name: 'Focus', ratio: 0.15 },
    { name: 'Balanced', ratio: 0.40 },
    { name: 'Discover', ratio: 0.65 }
  ];

  // Built-in catalog of technical notes + key case studies (zero network dependency)
  const CATALOG = window.TERMBROW_CATALOG || [];

  const readJson = (k, def) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : def;
    } catch {
      return def;
    }
  };
  const writeJson = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  };
  const readSession = (k, def) => {
    try {
      const raw = sessionStorage.getItem(k);
      return raw ? JSON.parse(raw) : def;
    } catch {
      return def;
    }
  };
  const writeSession = (k, v) => {
    try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {}
  };

  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Normalize current canonical path (e.g. /notes/foo.html or /index.html)
  const normPath = (p) => {
    let clean = (p || '/').split('#')[0].split('?')[0];
    if (clean === '' || clean === '/') return '/index.html';
    if (!clean.startsWith('/')) clean = '/' + clean;
    return clean;
  };
  const currentPath = normPath(window.location.pathname);
  const currentTitle = (document.querySelector('h1')?.textContent || document.title || 'TermBrow')
    .replace(/\s+—\s+Kyle Luecke.*$/i, '')
    .trim();

  // 1. Theme setup (default dark like TermBrow's textual-dark, respecting saved choice)
  const applyTheme = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch {}
  };
  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  })();
  applyTheme(savedTheme || 'light');

  const statusEl = document.getElementById('tb-status-msg');
  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  // 2. Record visit & update keyword decay (mirrors termbrow/store.py: _DECAY=0.98, _VISIT_WEIGHT=1.0)
  const recordVisitAndKeywords = () => {
    const history = readJson(HIST_KEY, []);
    if (!history.length || history[history.length - 1].url !== currentPath) {
      history.push({ url: currentPath, title: currentTitle, ts: Date.now() });
      writeJson(HIST_KEY, history.slice(-200));
    }

    const item = CATALOG.find((c) => c.url === currentPath);
    const pageKeywords = item ? item.keywords : [];
    if (pageKeywords.length) {
      const weights = readJson(KW_KEY, {});
      for (const k of Object.keys(weights)) {
        weights[k] = Math.round(weights[k] * 0.98 * 10000) / 10000;
        if (weights[k] < 0.05) delete weights[k];
      }
      for (const k of pageKeywords) {
        weights[k] = Math.round(((weights[k] || 0) + 1.0) * 10000) / 10000;
      }
      writeJson(KW_KEY, weights);
    }
  };
  recordVisitAndKeywords();

  // 3. Session Tabs (mirrors TermBrow's TabbedContent)
  const tabsEl = document.getElementById('tb-tabs');
  const syncTabs = () => {
    if (!tabsEl) return;
    let tabs = readSession(TABS_KEY, []);
    if (!tabs.some((t) => t.url === '/index.html')) {
      tabs.unshift({ url: '/index.html', title: 'Home' });
    }
    if (!tabs.some((t) => t.url === currentPath)) {
      tabs.push({ url: currentPath, title: currentTitle.slice(0, 24) });
      if (tabs.length > 7) {
        tabs = [tabs[0], ...tabs.slice(tabs.length - 6)];
      }
    }
    writeSession(TABS_KEY, tabs);

    tabsEl.innerHTML = tabs.map((t) => {
      const active = t.url === currentPath ? ' active' : '';
      const closeBtn = tabs.length > 1 && t.url !== '/index.html'
        ? `<button type="button" class="tb-tab-close" data-close-url="${esc(t.url)}" aria-label="Close tab">×</button>`
        : '';
      return `<span class="tb-tab${active}"><a class="tb-tab-label" href="${esc(t.url)}" style="color:inherit;text-decoration:none;">${esc(t.title)}</a>${closeBtn}</span>`;
    }).join('') + `<a class="tb-tab" href="/notes.html" title="Open Technical Notes">+ Notes</a>`;

    tabsEl.querySelectorAll('[data-close-url]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = btn.getAttribute('data-close-url');
        const nextTabs = readSession(TABS_KEY, []).filter((t) => t.url !== target);
        writeSession(TABS_KEY, nextTabs);
        if (target === currentPath) {
          const fallback = nextTabs[nextTabs.length - 1]?.url || '/index.html';
          window.location.href = fallback;
        } else {
          syncTabs();
        }
      });
    });
  };
  syncTabs();

  // 4. Library Save button (:save / ^S)
  const saveBtn = document.getElementById('tb-save');
  const isSaved = (url) => readJson(LIB_KEY, []).some((i) => i.url === url);
  const updateSaveBtn = () => {
    if (!saveBtn) return;
    const saved = isSaved(currentPath);
    saveBtn.textContent = saved ? '★ Saved' : '☆ Save';
    saveBtn.classList.toggle('saved', saved);
  };
  const toggleSave = () => {
    const lib = readJson(LIB_KEY, []);
    const idx = lib.findIndex((i) => i.url === currentPath);
    if (idx >= 0) {
      lib.splice(idx, 1);
      writeJson(LIB_KEY, lib);
      setStatus(`Removed "${currentTitle}" from local library.`);
    } else {
      lib.unshift({ url: currentPath, title: currentTitle, ts: Date.now() });
      writeJson(LIB_KEY, lib);
      setStatus(`Saved "${currentTitle}" to local library (:library to view).`);
    }
    updateSaveBtn();
  };
  updateSaveBtn();
  if (saveBtn) saveBtn.addEventListener('click', toggleSave);

  // 5. "For You / Explore" Feed Curation (mirrors termbrow/curate.py _interleave & explore_ratio)
  const prefs = readJson(PREF_KEY, { exploreIdx: 1, hideFeed: false });
  const feedWrap = document.getElementById('tb-feed-wrap');
  const feedStrip = document.getElementById('tb-feed');
  const exploreBtn = document.getElementById('tb-explore-btn');
  const feedToggleBtn = document.getElementById('tb-feed-toggle');

  const interleave = (exploit, discover, limit) => {
    const nDisc = discover.length;
    const res = [];
    let di = 0, ei = 0;
    for (let i = 0; i < limit; i++) {
      const want = Math.round(((i + 1) * nDisc) / Math.max(1, limit));
      if (want > di && di < discover.length) res.push(discover[di++]);
      else if (ei < exploit.length) res.push(exploit[ei++]);
      else if (di < discover.length) res.push(discover[di++]);
      else break;
    }
    return res;
  };

  const renderFeed = () => {
    if (!feedWrap || !feedStrip || !CATALOG.length) return;
    feedWrap.classList.toggle('hidden', Boolean(prefs.hideFeed));
    const mode = EXPLORE_MODES[prefs.exploreIdx % EXPLORE_MODES.length];
    if (exploreBtn) {
      exploreBtn.textContent = `${mode.name} (${Math.round(mode.ratio * 100)}%)`;
    }
    if (prefs.hideFeed) return;

    const weights = readJson(KW_KEY, {});
    const readSet = new Set(readJson(HIST_KEY, []).slice(-6).map((h) => h.url));
    readSet.add(currentPath);

    const topKw = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    const limit = 4;
    const nDisc = Math.max(1, Math.round(limit * mode.ratio));

    const candidates = CATALOG.filter((c) => c.url !== currentPath);
    const scored = candidates.map((c) => {
      const overlap = (c.keywords || []).reduce((acc, k) => acc + (weights[k] || 0), 0);
      const unreadBonus = readSet.has(c.url) ? 0 : 0.35;
      const noteBonus = c.kind === 'note' ? 0.5 : 0;
      return { ...c, score: overlap + unreadBonus + noteBonus, overlap };
    });

    let exploitPool, discoverPool;
    if (!topKw.length) {
      exploitPool = scored.filter((c) => c.kind === 'note');
      discoverPool = scored.filter((c) => c.kind !== 'note');
    } else {
      exploitPool = scored.filter((c) => c.overlap > 0).sort((a, b) => b.score - a.score);
      discoverPool = scored.filter((c) => c.overlap === 0).sort((a, b) => b.score - a.score);
      if (discoverPool.length < nDisc) {
        const extra = scored.filter((c) => !discoverPool.includes(c)).reverse();
        discoverPool = [...discoverPool, ...extra];
      }
    }

    const discPicks = discoverPool.slice(0, nDisc).map((x) => ({ ...x, feedKind: 'discover' }));
    const usedUrls = new Set(discPicks.map((x) => x.url));
    const expPicks = exploitPool
      .filter((x) => !usedUrls.has(x.url))
      .slice(0, limit - discPicks.length)
      .map((x) => ({ ...x, feedKind: 'foryou' }));

    const items = interleave(expPicks, discPicks, limit);
    feedStrip.innerHTML = items.map((it) => {
      const isDisc = it.feedKind === 'discover';
      const prefix = isDisc ? '◇ ' : '';
      return `<a class="feed-item${isDisc ? ' discover' : ''}" href="${esc(it.url)}">` +
        `<span class="feed-item-title">${prefix}${esc(it.title)}</span>` +
        `<span class="feed-item-meta"><span>${esc(it.kind)}</span><span>${esc(it.meta || '')}</span></span>` +
        `</a>`;
    }).join('');
  };
  renderFeed();

  const cycleExplore = () => {
    prefs.exploreIdx = ((prefs.exploreIdx || 0) + 1) % EXPLORE_MODES.length;
    writeJson(PREF_KEY, prefs);
    renderFeed();
    const m = EXPLORE_MODES[prefs.exploreIdx];
    setStatus(`Explore dial → ${m.name} (${Math.round(m.ratio * 100)}% anchored discovery).`);
  };
  const toggleStrip = () => {
    prefs.hideFeed = !prefs.hideFeed;
    writeJson(PREF_KEY, prefs);
    renderFeed();
    setStatus(prefs.hideFeed ? 'For You strip hidden (:strip or Alt+G to show).' : 'For You strip visible.');
  };
  if (exploreBtn) exploreBtn.addEventListener('click', cycleExplore);
  if (feedToggleBtn) feedToggleBtn.addEventListener('click', toggleStrip);

  // 6. Inspector Panel + Address Bar (:commands & instant search)
  const inspector = document.getElementById('tb-inspector');
  const addrInput = document.getElementById('addrbar');
  const addrForm = document.getElementById('tb-addr-form');

  const showInspector = (title, bodyHtml) => {
    if (!inspector) return;
    inspector.innerHTML =
      `<div class="tb-inspector-head"><strong>${esc(title)}</strong>` +
      `<button type="button" class="tb-pill-btn" id="tb-inspector-close">Close [Esc]</button></div>` +
      `<div>${bodyHtml}</div>`;
    inspector.hidden = false;
    inspector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('tb-inspector-close')?.addEventListener('click', () => {
      inspector.hidden = true;
    });
  };

  const runCommand = (raw) => {
    const q = (raw || '').trim();
    if (!q) return;

    const cmd = q.toLowerCase();
    if (cmd === ':home') { window.location.href = '/index.html'; return; }
    if (cmd === ':notes' || cmd === ':articles' || cmd === ':blog') { window.location.href = '/notes.html'; return; }
    if (cmd === ':work' || cmd === ':projects') { window.location.href = '/work.html'; return; }
    if (cmd === ':method') { window.location.href = '/method.html'; return; }
    if (cmd === ':about') { window.location.href = '/about.html'; return; }
    if (cmd === ':cv') { window.location.href = '/cv.html'; return; }
    if (cmd === ':rss' || cmd === ':feed') { window.location.href = '/feed.xml'; return; }
    if (cmd === ':driftbound' || cmd === ':ventures') { window.location.href = 'https://driftboundlabs.com/ventures.html'; return; }
    if (cmd === ':paxiom') { window.location.href = 'https://paxiom.org'; return; }
    if (cmd === ':back') { window.history.back(); return; }
    if (cmd === ':save') { toggleSave(); return; }
    if (cmd === ':explore') { cycleExplore(); return; }
    if (cmd === ':strip') { toggleStrip(); return; }
    if (cmd === ':dark') { applyTheme('dark'); setStatus('Theme → textual-dark.'); return; }
    if (cmd === ':light') { applyTheme('light'); setStatus('Theme → textual-light.'); return; }
    if (cmd === ':theme') {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      setStatus(`Theme → textual-${next}.`);
      return;
    }
    if (cmd === ':clear') {
      [KW_KEY, HIST_KEY, LIB_KEY].forEach((k) => { try { localStorage.removeItem(k); } catch {} });
      updateSaveBtn();
      renderFeed();
      setStatus('Cleared local history, keyword weights, and saved library.');
      return;
    }
    if (cmd === ':library') {
      const lib = readJson(LIB_KEY, []);
      const html = lib.length
        ? `<ul>${lib.map((i) => `<li><a href="${esc(i.url)}">${esc(i.title)}</a> <span style="color:var(--faint)">(${esc(i.url)})</span></li>`).join('')}</ul>`
        : `<p>Your local library is empty. Click <code>☆ Save</code> (or type <code>:save</code>) on any technical note or case study.</p>`;
      showInspector('~/.termbrow/library.json (Browser Local Storage)', html);
      setStatus(`Showing ${lib.length} saved item(s).`);
      return;
    }
    if (cmd === ':history') {
      const hist = readJson(HIST_KEY, []).slice().reverse();
      const html = hist.length
        ? `<ul>${hist.slice(0, 25).map((h) => `<li><a href="${esc(h.url)}">${esc(h.title)}</a> <span style="color:var(--faint)">· ${new Date(h.ts).toISOString().slice(0, 16).replace('T', ' ')}Z</span></li>`).join('')}</ul>`
        : `<p>No local reading history recorded yet.</p>`;
      showInspector('~/.termbrow/history.json (Recent Visits)', html);
      setStatus(`Showing ${hist.length} local history entry(s).`);
      return;
    }
    if (cmd === ':keywords') {
      const weights = readJson(KW_KEY, {});
      const pairs = Object.entries(weights).sort((a, b) => b[1] - a[1]);
      const html = pairs.length
        ? `<p>TermBrow shapes the <em>For You</em> strip using inspectable local topic weights (<code>w ← 0.98·w</code> per visit, <code>+1.0</code> for active article topics; zero remote tracking):</p>` +
          `<pre><code>${esc(JSON.stringify(Object.fromEntries(pairs), null, 2))}</code></pre>`
        : `<p>No topic weights accumulated yet — open a technical note to populate local weights.</p>`;
      showInspector('~/.termbrow/keywords.json (Inspectable Decay State)', html);
      setStatus(`Inspecting ${pairs.length} local topic weight(s).`);
      return;
    }
    if (cmd === ':install') {
      showInspector('Install TermBrow Desktop TUI (Python 3.10+ / Textual)',
        `<p>This website uses the layout and curation model of <strong>TermBrow</strong>, Kyle Luecke's open-source terminal reading browser.</p>` +
        `<pre><code>pipx install git+https://github.com/k-luecke/TermBrow\ntermbrow</code></pre>` +
        `<p>Source &amp; architecture: <a href="https://github.com/k-luecke/TermBrow">github.com/k-luecke/TermBrow</a> · <a href="/notes/fixed-frame-terminal-reading-and-tls-escalation.html">Technical Note →</a></p>`
      );
      return;
    }
    if (cmd === ':help' || cmd === '?') {
      showInspector('TermBrow Command & Keybinding Reference',
        `<ul>` +
        `<li><code>:notes</code> — Deep technical engineering articles</li>` +
        `<li><code>:work</code> — All 20 research &amp; systems case studies</li>` +
        `<li><code>:method</code> / <code>:about</code> / <code>:cv</code> — Protocol, bio, and CV</li>` +
        `<li><code>:save</code> / <code>:library</code> — Save current page or inspect saved reading pile</li>` +
        `<li><code>:history</code> / <code>:keywords</code> / <code>:clear</code> — Inspect or reset local <code>~/.termbrow</code> state</li>` +
        `<li><code>:explore</code> / <code>:strip</code> — Cycle Focus (15%) → Balanced (40%) → Discover (65%) or toggle strip</li>` +
        `<li><code>:dark</code> / <code>:light</code> / <code>:install</code> / <code>:rss</code> — Theme, desktop CLI install, Atom feed</li>` +
        `<li><em>Any other text</em> — Full-text filter across all 5 technical notes and 20 case studies</li>` +
        `</ul>`
      );
      setStatus('Opened :help reference.');
      return;
    }

    // Direct internal path navigation
    if (q.startsWith('/') && (q.endsWith('.html') || q.endsWith('.xml'))) {
      window.location.href = q;
      return;
    }

    // Full-text keyword search across CATALOG
    const terms = cmd.split(/\s+/).filter(Boolean);
    const hits = CATALOG.map((item) => {
      const hay = `${item.title} ${item.summary || ''} ${(item.keywords || []).join(' ')} ${item.kind}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (item.title.toLowerCase().includes(t)) score += 4;
        else if (hay.includes(t)) score += 2;
      }
      return { ...item, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

    const body = hits.length
      ? `<ul>${hits.map((h) => `<li><strong>[${esc(h.kind)}]</strong> <a href="${esc(h.url)}">${esc(h.title)}</a> — <span style="color:var(--muted)">${esc(h.summary || '')}</span></li>`).join('')}</ul>`
      : `<p>No local notes or case studies matched <code>${esc(q)}</code>. Try terms like <code>ed25519</code>, <code>schumann</code>, <code>ring 0</code>, <code>kaplan-meier</code>, <code>811</code>, or <code>tls</code>.</p>`;
    showInspector(`Search results for "${q}" (${hits.length})`, body);
    setStatus(`Found ${hits.length} match(es) for "${q}".`);
  };

  if (addrForm && addrInput) {
    addrForm.addEventListener('submit', (e) => {
      e.preventDefault();
      runCommand(addrInput.value);
    });
  }

  document.getElementById('tb-back')?.addEventListener('click', () => window.history.back());
  document.getElementById('tb-help')?.addEventListener('click', () => runCommand(':help'));

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => runCommand(':theme'));
  });

  document.querySelectorAll('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.getAttribute('data-cmd');
      if (c === ':focus-addr') {
        addrInput?.focus();
        addrInput?.select();
      } else {
        runCommand(c);
      }
    });
  });

  // Global keyboard bindings (non-destructive in web browsers)
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    const inInput = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;

    if (e.key === 'Escape') {
      if (inspector && !inspector.hidden) {
        inspector.hidden = true;
        setStatus('Closed inspector.');
      }
      if (inInput) e.target.blur();
      return;
    }

    if (!inInput && e.key === '/') {
      e.preventDefault();
      addrInput?.focus();
      addrInput?.select();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      addrInput?.focus();
      addrInput?.select();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      toggleSave();
      return;
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'e') { e.preventDefault(); cycleExplore(); }
      else if (k === 'g') { e.preventDefault(); toggleStrip(); }
      else if (k === 'd') { e.preventDefault(); runCommand(':theme'); }
      else if (k === 'y') { e.preventDefault(); runCommand(':library'); }
      else if (k === 'h') { e.preventDefault(); runCommand(':history'); }
    }
  });
})();
