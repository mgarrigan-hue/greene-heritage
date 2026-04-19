/* Greene Family Heritage — Shared site chrome
 * Loaded on every page after app.js. All features are defensive: if the
 * expected DOM hooks are not present the feature silently no-ops.
 *
 * Contracts exposed for HTML / app.js agents:
 *   <body class="use-drawer-nav" [data-long-page]>
 *   <a class="skip-link" href="#main">Skip to content</a>
 *   <button class="nav-toggle" aria-label="Open menu">…</button>
 *   <aside class="nav-drawer" id="nav-drawer" aria-hidden="true">
 *     <button class="nav-drawer-close" aria-label="Close menu">×</button>
 *     …links / dropdowns…
 *   </aside>
 *   <div class="nav-drawer-backdrop"></div>            (auto-injected if missing)
 *   <button data-theme-toggle aria-label="Toggle theme">
 *     <span data-theme-icon>🌙</span>
 *   </button>
 *   <div class="search-wrap">
 *     <input data-global-search type="search" class="search-input"
 *            placeholder="Search…" aria-label="Search the site">
 *     <div data-search-results class="search-results" role="listbox"></div>
 *   </div>
 * Reading progress bar, back-to-top, and ToC are auto-injected on long pages.
 *
 * Depends on app.js exposing window.loadFamilyDataCached() returning a Promise
 * that resolves to the parsed family.json. Falls back to a local fetch.
 */
(function () {
  'use strict';

  const Site = {};
  window.Site = Site;

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- *
   * 1. Mobile nav drawer
   * ---------------------------------------------------------------- */
  Site.initDrawer = function () {
    const toggle  = $('.nav-toggle');
    const drawer  = $('.nav-drawer');
    if (!toggle || !drawer) return;

    let backdrop = $('.nav-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'nav-drawer-backdrop';
      document.body.appendChild(backdrop);
    }
    const closeBtn = $('.nav-drawer-close', drawer);
    let lastFocus = null;

    const focusableSel =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function openDrawer() {
      lastFocus = document.activeElement;
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      const first = $$(focusableSel, drawer)[0];
      if (first) first.focus();
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function trap(e) {
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      const items = $$(focusableSel, drawer).filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    toggle.addEventListener('click', () => {
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
    backdrop.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', trap);

    /* Inline dropdown expansion inside the drawer */
    $$('.nav-dropdown', drawer).forEach(dd => {
      const trigger = $('.nav-dropdown-trigger', dd) || $('a, button', dd);
      if (!trigger) return;
      trigger.addEventListener('click', e => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          e.preventDefault();
          dd.classList.toggle('open');
        }
      });
    });

    /* Desktop dropdowns: click toggles, outside click closes */
    $$('.nav-dropdown').forEach(dd => {
      if (drawer.contains(dd)) return;
      const trigger = $('.nav-dropdown-trigger', dd) || $('a, button', dd);
      if (!trigger) return;
      trigger.addEventListener('click', e => {
        e.preventDefault();
        const isOpen = dd.classList.contains('open');
        $$('.nav-dropdown.open').forEach(o => o.classList.remove('open'));
        if (!isOpen) dd.classList.add('open');
      });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.nav-dropdown')) {
        $$('.nav-dropdown.open').forEach(o => o.classList.remove('open'));
      }
    });
  };

  /* ---------------------------------------------------------------- *
   * 2. Theme toggle
   * ---------------------------------------------------------------- */
  Site.initTheme = function () {
    const STORAGE_KEY = 'gh-theme';
    const root = document.documentElement;

    function apply(theme) {
      if (theme === 'light') root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
      $$('[data-theme-icon]').forEach(el => {
        el.textContent = theme === 'light' ? '☀️' : '🌙';
      });
      $$('[data-theme-toggle]').forEach(el => {
        el.setAttribute('aria-label',
          theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      });
    }

    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) { /* ignore */ }
    const prefersLight =
      window.matchMedia('(prefers-color-scheme: light)').matches;
    const initial = stored || (prefersLight ? 'light' : 'dark');
    apply(initial);

    const toggles = $$('[data-theme-toggle]');
    if (!toggles.length) return;
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        apply(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { /* ignore */ }
      });
    });
  };

  /* ---------------------------------------------------------------- *
   * 3. Global search
   * ---------------------------------------------------------------- */
  Site.initSearch = function () {
    const input   = $('[data-global-search]');
    const results = $('[data-search-results]');
    if (!input || !results) {
      Site._installSearchHotkey(null);
      return;
    }

    let debounceId = null;
    let activeIndex = -1;
    let currentResults = [];

    async function getData() {
      if (typeof window.loadFamilyDataCached === 'function') {
        return window.loadFamilyDataCached();
      }
      if (typeof window.loadFamilyData === 'function') {
        return window.loadFamilyData();
      }
      const r = await fetch('data/family.json');
      return r.json();
    }

    /* Map a person/place to its destination page. */
    function pageForPerson(p) {
      const id = (p.id || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      if (id.includes('catherine') || name.includes('catherine')) return 'catherine.html';
      if (id.includes('elizabeth') || name.includes('elizabeth')) return 'elizabeth.html';
      return `people.html#${encodeURIComponent(p.id)}`;
    }
    function pageForPlace(place) {
      const s = place.toLowerCase();
      if (s.includes('dublin')) return 'dublin.html';
      if (s.includes('portarlington') || s.includes('queens') || s.includes('ballyburly') ||
          s.includes("king's") || s.includes('offaly')) return 'portarlington.html';
      return null;
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[c]));
    }

    function renderResults(items) {
      currentResults = items;
      activeIndex = -1;
      if (!items.length) {
        results.innerHTML = '<div class="search-result search-empty" aria-disabled="true">No matches</div>';
        results.classList.add('open');
        return;
      }
      results.innerHTML = items.map((it, i) => `
        <a class="search-result" role="option" data-idx="${i}" href="${escapeHtml(it.href)}">
          <div class="search-result-name">${escapeHtml(it.name)}</div>
          <div class="search-result-meta">${escapeHtml(it.meta || '')}</div>
          ${it.confidence ? `<span class="confidence-badge confidence-${escapeHtml(it.confidence)}">${escapeHtml(it.confidence)}</span>` : ''}
        </a>
      `).join('');
      results.classList.add('open');
    }

    function clearResults() {
      results.classList.remove('open');
      results.innerHTML = '';
      currentResults = [];
      activeIndex = -1;
    }

    function setActive(i) {
      const nodes = $$('.search-result', results);
      if (!nodes.length) return;
      activeIndex = (i + nodes.length) % nodes.length;
      nodes.forEach((n, idx) => n.classList.toggle('active', idx === activeIndex));
      const node = nodes[activeIndex];
      if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }

    async function runQuery(q) {
      q = q.trim().toLowerCase();
      if (q.length < 2) { clearResults(); return; }
      let data;
      try { data = await getData(); }
      catch (_) { clearResults(); return; }

      const out = [];
      const seen = new Set();
      const push = (key, item) => {
        if (seen.has(key)) return;
        seen.add(key); out.push(item);
      };

      (data.people || []).forEach(p => {
        if ((p.name || '').toLowerCase().includes(q)) {
          const born = p.born ? p.born.year : '';
          const died = p.died ? p.died.year : '';
          push('p:' + p.id, {
            href: pageForPerson(p),
            name: p.name,
            meta: `Person · ${born}${died ? ' – ' + died : ''}`.trim(),
            confidence: p.confidence
          });
        }
      });

      (data.events || []).forEach((e, i) => {
        if ((e.title || '').toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q)) {
          push('e:' + i, {
            href: 'timeline.html#event-' + i,
            name: e.title,
            meta: `Event · ${e.year || ''}`
          });
        }
      });

      const placeStrings = new Set();
      (data.people || []).forEach(p => {
        if (p.born && p.born.place) placeStrings.add(p.born.place);
        if (p.died && p.died.place) placeStrings.add(p.died.place);
      });
      placeStrings.forEach(place => {
        if (place.toLowerCase().includes(q)) {
          const href = pageForPlace(place);
          if (!href) return;
          push('pl:' + place, { href, name: place, meta: 'Place' });
        }
      });

      renderResults(out.slice(0, 8));
    }

    input.addEventListener('input', () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => runQuery(input.value), 150);
    });
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) runQuery(input.value);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') {
        if (activeIndex >= 0 && currentResults[activeIndex]) {
          e.preventDefault();
          window.location.href = currentResults[activeIndex].href;
        }
      } else if (e.key === 'Escape') {
        clearResults(); input.blur();
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-search-results]') &&
          !e.target.closest('[data-global-search]')) clearResults();
    });

    Site._installSearchHotkey(input);
  };

  Site._installSearchHotkey = function (input) {
    document.addEventListener('keydown', e => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = (t && t.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                     (t && t.isContentEditable);
      if (typing) return;
      if (input) { e.preventDefault(); input.focus(); input.select(); }
    });
  };

  /* ---------------------------------------------------------------- *
   * 4. Reading-progress bar
   * ---------------------------------------------------------------- */
  Site.initProgress = function () {
    if (!document.body.hasAttribute('data-long-page')) return;
    if (reducedMotion()) return;
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    function update() {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      const pct = Math.min(100, Math.max(0, (h.scrollTop / max) * 100));
      bar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  };

  /* ---------------------------------------------------------------- *
   * 5. Floating Table of Contents
   * ---------------------------------------------------------------- */
  Site.initToc = function () {
    if (!document.body.hasAttribute('data-long-page')) return;
    const prose = $('.prose') || $('main') || document.body;
    const headings = $$('h2, h3', prose).filter(h => h.offsetParent !== null);
    if (headings.length < 3) return;

    /* Ensure each heading has an id */
    const slug = s => s.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
    const used = new Set();
    headings.forEach(h => {
      if (!h.id) {
        let base = slug(h.textContent || 'section') || 'section';
        let id = base, n = 2;
        while (used.has(id) || document.getElementById(id)) { id = `${base}-${n++}`; }
        h.id = id;
      }
      used.add(h.id);
    });

    const aside = document.createElement('aside');
    aside.className = 'page-toc';
    aside.setAttribute('aria-label', 'Table of contents');
    aside.innerHTML = `
      <h4>On this page</h4>
      <ul>
        ${headings.map(h => `
          <li data-level="${h.tagName === 'H3' ? '3' : '2'}">
            <a href="#${h.id}">${h.textContent.trim()}</a>
          </li>`).join('')}
      </ul>`;
    document.body.appendChild(aside);

    /* Mobile toggle */
    const toggle = document.createElement('button');
    toggle.className = 'page-toc-toggle';
    toggle.setAttribute('aria-label', 'Open table of contents');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
    document.body.appendChild(toggle);
    toggle.addEventListener('click', () => {
      const open = aside.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    /* Smooth scroll + close mobile sheet on click */
    $$('a', aside).forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: reducedMotion() ? 'auto' : 'smooth',
            block: 'start'
          });
          history.replaceState(null, '', '#' + id);
          aside.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });

    /* Active section highlight */
    if ('IntersectionObserver' in window) {
      const linkFor = id => $(`a[href="#${CSS.escape(id)}"]`, aside);
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          $$('a.active', aside).forEach(a => a.classList.remove('active'));
          const link = linkFor(en.target.id);
          if (link) link.classList.add('active');
        });
      }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });
      headings.forEach(h => io.observe(h));
    }
  };

  /* ---------------------------------------------------------------- *
   * 6. Back-to-top button
   * ---------------------------------------------------------------- */
  Site.initBackToTop = function () {
    if (!document.body.hasAttribute('data-long-page')) return;
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '↑';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: reducedMotion() ? 'auto' : 'smooth'
      });
    });
    let ticking = false;
    function update() {
      btn.classList.toggle('visible', window.scrollY > 600);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  };

  /* ---------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------- */
  function boot() {
    try { Site.initTheme();      } catch (e) { console.error('theme', e); }
    try { Site.initDrawer();     } catch (e) { console.error('drawer', e); }
    try { Site.initSearch();     } catch (e) { console.error('search', e); }
    try { Site.initProgress();   } catch (e) { console.error('progress', e); }
    try { Site.initToc();        } catch (e) { console.error('toc', e); }
    try { Site.initBackToTop();  } catch (e) { console.error('backtotop', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
