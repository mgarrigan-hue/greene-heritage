/* Greene Family Heritage — Gallery & Lightbox
 *
 * Two responsibilities:
 *   1. Lightbox — opt-in on any page. Hooks any element matching
 *      `[data-lightbox]` (typically an <a> wrapping a thumbnail <img>).
 *      Click → modal overlay with the full image, caption, credit, and
 *      a link back to the asset's source page.
 *   2. Gallery grid — runs only on gallery.html. Loads the canonical
 *      asset catalogue from research-results/gallery-inventory.json,
 *      filters out hero backgrounds + wishlist items, groups by topic,
 *      and renders a responsive card grid. Cards open the lightbox.
 *
 * Both features are defensive: if their DOM hooks aren't present they
 * no-op silently. Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────  Lightbox  ───────────────────────── */

  let lightboxEl = null;
  let lastFocus = null;

  function ensureLightbox() {
    if (lightboxEl) return lightboxEl;
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.setAttribute('aria-hidden', 'true');
    lightboxEl.innerHTML = `
      <button class="lightbox-close" aria-label="Close image viewer">&times;</button>
      <figure class="lightbox-figure">
        <img class="lightbox-img" alt="">
        <figcaption class="lightbox-caption">
          <p class="lightbox-text"></p>
          <p class="lightbox-meta">
            <span class="lightbox-credit"></span>
            <span class="lightbox-license"></span>
          </p>
          <p class="lightbox-source"></p>
        </figcaption>
      </figure>
    `;
    document.body.appendChild(lightboxEl);

    lightboxEl.addEventListener('click', (e) => {
      if (e.target === lightboxEl ||
          e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightboxEl.getAttribute('aria-hidden') === 'false') {
        closeLightbox();
      }
    });
    return lightboxEl;
  }

  function openLightbox(opts) {
    const lb = ensureLightbox();
    lastFocus = document.activeElement;
    const img = lb.querySelector('.lightbox-img');
    img.src = opts.src;
    img.alt = opts.alt || opts.caption || '';
    lb.querySelector('.lightbox-text').textContent = opts.caption || '';
    lb.querySelector('.lightbox-credit').textContent = opts.credit || '';
    lb.querySelector('.lightbox-license').textContent = opts.license ? ' · ' + opts.license : '';
    const sourceEl = lb.querySelector('.lightbox-source');
    if (opts.sourceUrl) {
      sourceEl.innerHTML = '<a href="' + opts.sourceUrl + '" target="_blank" rel="noopener">View original source</a>';
    } else {
      sourceEl.textContent = '';
    }
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lb.querySelector('.lightbox-close').focus();
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function bindLightboxTriggers(root) {
    (root || document).querySelectorAll('[data-lightbox]').forEach((el) => {
      if (el.dataset.lightboxBound === '1') return;
      el.dataset.lightboxBound = '1';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openLightbox({
          src: el.getAttribute('href') || el.dataset.src,
          alt: el.dataset.alt,
          caption: el.dataset.caption,
          credit: el.dataset.credit,
          license: el.dataset.license,
          sourceUrl: el.dataset.sourceUrl
        });
      });
    });
  }

  /* ─────────────────────────  Gallery grid  ───────────────────────── */

  const INVENTORY_URL = 'research-results/gallery-inventory.json';

  // Group definitions: order matters — first match wins. Each entry
  // matches assets by person_id, kind, or page-usage. The fallback
  // bucket "Other" catches anything unmatched.
  const GROUPS = [
    { id: 'catherine', label: "Catherine Clinton & the Clarkes of Mullaghfin",
      match: (a) => (a.person_ids || []).some(p => ['catherine-clarke', 'patrick-clarke-snr', 'bridget-wife2'].includes(p)) },
    { id: 'thomas', label: 'Thomas Greene & the Portarlington Greenes',
      match: (a) => (a.person_ids || []).some(p => ['thomas-greene', 'william-greene-thomas-father', 'joseph-greene'].includes(p)) },
    { id: 'elizabeth', label: 'Elizabeth Harris & the Channel Islands',
      match: (a) => (a.person_ids || []).some(p => ['elizabeth-harris', 'alfred-bower-harris'].includes(p)) },
    { id: 'military', label: 'Military service',
      match: (a) => (a.used_on_pages || []).includes('military.html') },
    { id: 'other', label: 'Other context', match: () => true }
  ];

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function assetThumb(a) {
    // Prefer local file; fall back to URL only if it's a direct image URL.
    if (a.file_path) return a.file_path;
    if (a.url && /\.(jpe?g|png|gif|webp)$/i.test(a.url)) return a.url;
    return null;
  }

  function assetSourceUrl(a) {
    return a.url || null;
  }

  function renderCard(a) {
    const thumb = assetThumb(a);
    if (!thumb) return ''; // skip un-renderable
    const caption = escapeHtml(a.caption || '');
    const credit = escapeHtml(a.credit || '');
    const license = escapeHtml(a.license || '');
    const date = escapeHtml(a.date || '');
    const place = escapeHtml(a.place || '');
    const sourceUrl = assetSourceUrl(a) || '';
    const kindBadge = a.kind === 'primary-evidence'
      ? '<span class="gallery-badge gallery-badge-evidence">Primary evidence</span>'
      : '<span class="gallery-badge gallery-badge-illustration">Context</span>';
    const usedOn = (a.used_on_pages || []).map(p =>
      '<a href="' + escapeHtml(p) + '">' + escapeHtml(p.replace('.html', '')) + '</a>'
    ).join(', ');
    return `
      <article class="gallery-card" id="asset-${escapeHtml(a.id)}">
        <a href="${escapeHtml(thumb)}"
           class="gallery-card-link"
           data-lightbox
           data-caption="${caption}"
           data-credit="${credit}"
           data-license="${license}"
           data-source-url="${escapeHtml(sourceUrl)}"
           data-alt="${caption}">
          <img src="${escapeHtml(thumb)}" alt="${caption}" loading="lazy">
        </a>
        <div class="gallery-card-body">
          ${kindBadge}
          <p class="gallery-card-caption">${caption}</p>
          <p class="gallery-card-meta">
            ${date ? '<span>📅 ' + date + '</span>' : ''}
            ${place ? '<span>📍 ' + place + '</span>' : ''}
          </p>
          <p class="gallery-card-credit">${credit}${license ? ' · <em>' + license + '</em>' : ''}</p>
          ${usedOn ? '<p class="gallery-card-usedon">Used on: ' + usedOn + '</p>' : ''}
        </div>
      </article>
    `;
  }

  function groupAssets(assets) {
    const buckets = new Map(GROUPS.map(g => [g.id, { ...g, items: [] }]));
    for (const a of assets) {
      for (const g of GROUPS) {
        if (g.match(a)) { buckets.get(g.id).items.push(a); break; }
      }
    }
    return [...buckets.values()].filter(g => g.items.length > 0);
  }

  function renderGallery(root, inv) {
    const all = [
      ...(inv.primary_evidence || []),
      ...(inv.site_illustration || [])
    ];
    const grouped = groupAssets(all);
    const summaryLine = `${all.length} assets catalogued — ` +
      `${(inv.primary_evidence || []).length} primary-source documents, ` +
      `${(inv.site_illustration || []).length} context illustrations.`;
    const wishlistOpen = (inv.wishlist || []).filter(w => !w.status || !/^FILLED/.test(w.status));
    const html = `
      <p class="gallery-intro">${escapeHtml(summaryLine)}</p>
      ${grouped.map(g => `
        <section class="gallery-group" id="group-${g.id}">
          <h2>${escapeHtml(g.label)} <small>(${g.items.length})</small></h2>
          <div class="gallery-grid">
            ${g.items.map(renderCard).join('')}
          </div>
        </section>
      `).join('')}
      ${wishlistOpen.length ? `
        <section class="gallery-wishlist">
          <h2>Still searching <small>(${wishlistOpen.length} open gaps)</small></h2>
          <p>Imagery we are actively trying to source. If you have any of
          these — or know where to look — please get in touch.</p>
          <ul>
            ${wishlistOpen.map(w =>
              '<li><strong>' + escapeHtml(w.id.replace(/^wish-/, '').replace(/-/g, ' ')) +
              '</strong> — ' + escapeHtml(w.notes || w.caption || w.description || '') + '</li>'
            ).join('')}
          </ul>
        </section>
      ` : ''}
    `;
    root.innerHTML = html;
    bindLightboxTriggers(root);
  }

  function initGalleryPage() {
    const root = document.querySelector('[data-gallery-root]');
    if (!root) return;
    fetch(INVENTORY_URL, { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(inv => renderGallery(root, inv))
      .catch(err => {
        root.innerHTML = '<p class="gallery-error">Could not load gallery inventory: ' +
          escapeHtml(err.message) + '. Try refreshing the page.</p>';
      });
  }

  /* ─────────────────────────  Boot  ───────────────────────── */

  function boot() {
    bindLightboxTriggers(document);
    initGalleryPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for any page wanting to programmatically open the lightbox.
  window.GreeneGallery = {
    open: openLightbox,
    close: closeLightbox,
    rebind: bindLightboxTriggers
  };
})();
