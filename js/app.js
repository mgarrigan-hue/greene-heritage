// Greene Family Heritage — Shared Application Logic

let familyData = null;
const GH_CACHE_KEY = 'gh-family-data-v1';

window.familyDataPromise = null;

async function loadFamilyDataCached() {
  if (familyData) return familyData;
  if (window.familyDataPromise) return window.familyDataPromise;

  window.familyDataPromise = (async () => {
    let cached = null;
    try {
      const raw = sessionStorage.getItem(GH_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {
      cached = null;
    }

    if (cached && cached.data) {
      familyData = cached.data;
      // Background revalidation — replace cache if lastUpdated is newer.
      (async () => {
        try {
          const resp = await fetch('data/family.json', { cache: 'no-cache' });
          if (!resp.ok) return;
          const fresh = await resp.json();
          const cachedTs = cached.data?.meta?.lastUpdated;
          const freshTs = fresh?.meta?.lastUpdated;
          if (!cachedTs || !freshTs || freshTs !== cachedTs) {
            familyData = fresh;
            try {
              sessionStorage.setItem(GH_CACHE_KEY, JSON.stringify({
                cachedAt: Date.now(),
                data: fresh
              }));
            } catch (e) { /* quota — ignore */ }
          }
        } catch (e) { /* offline — keep cached */ }
      })();
      return familyData;
    }

    const resp = await fetch('data/family.json');
    familyData = await resp.json();
    try {
      sessionStorage.setItem(GH_CACHE_KEY, JSON.stringify({
        cachedAt: Date.now(),
        data: familyData
      }));
    } catch (e) { /* quota — ignore */ }
    return familyData;
  })();

  return window.familyDataPromise;
}

async function loadFamilyData() {
  return loadFamilyDataCached();
}

window.loadFamilyDataCached = loadFamilyDataCached;
window.loadFamilyData = loadFamilyData;

// People with dedicated story pages — link cards directly there.
const GH_STORY_PAGES = {
  'elizabeth-harris': 'elizabeth.html',
  'catherine-clarke': 'catherine.html'
};

function getPersonHref(personId) {
  if (GH_STORY_PAGES[personId]) return GH_STORY_PAGES[personId];
  return `people.html#${personId}`;
}

function getPerson(id) {
  return familyData?.people.find(p => p.id === id);
}

function getChildren(personId) {
  if (!familyData) return [];
  return familyData.parentChild
    .filter(pc => pc.parent === personId)
    .map(pc => getPerson(pc.child))
    .filter((p, i, arr) => p && arr.findIndex(x => x.id === p.id) === i);
}

function getParents(personId) {
  if (!familyData) return [];
  return familyData.parentChild
    .filter(pc => pc.child === personId)
    .map(pc => getPerson(pc.parent))
    .filter(p => p);
}

function getSpouses(personId) {
  if (!familyData) return [];
  return familyData.couples
    .filter(c => c.partner1 === personId || c.partner2 === personId)
    .map(c => {
      const spouseId = c.partner1 === personId ? c.partner2 : c.partner1;
      return { ...getPerson(spouseId), married: c.married };
    })
    .filter(s => s.id);
}

function formatDate(d) {
  if (!d) return 'Unknown';
  return d.year + (d.place ? `, ${d.place}` : '');
}

const GH_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

let personModalLastFocus = null;
let personModalPreviousOverflow = '';

function ghEscapeHtml(str) {
  if (window.Site && typeof window.Site.escapeHtml === 'function') {
    return window.Site.escapeHtml(str);
  }
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function ghSafeClassToken(str, fallback = 'medium') {
  const token = String(str || fallback).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return token || fallback;
}

function ghIsSafeHttpUrl(value) {
  if (window.Site && typeof window.Site.isSafeHttpUrl === 'function') {
    return window.Site.isSafeHttpUrl(value);
  }
  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function renderSourceItem(source) {
  const text = String(source || '');
  if (ghIsSafeHttpUrl(text)) {
    const href = ghEscapeHtml(text);
    return `<a href="${href}" target="_blank" rel="noopener">${href}</a>`;
  }
  return ghEscapeHtml(text);
}

function renderPersonCard(person) {
  const born = person.born ? formatDate(person.born) : 'Unknown';
  const died = person.died ? formatDate(person.died) : '';
  const conf = ghSafeClassToken(person.confidence);
  const href = getPersonHref(person.id);
  const lifespan = `${person.born?.year || '?'}${person.died ? '-' + (person.died.year || '?') : ''}`;
  const ariaLabel = `View details for ${person.name}, ${lifespan}`;

  return `
    <a class="card" href="${ghEscapeHtml(href)}" aria-label="${ghEscapeHtml(ariaLabel)}" data-person-id="${ghEscapeHtml(person.id)}">
      <div class="card-name">${ghEscapeHtml(person.name)}</div>
      <div class="card-dates">${ghEscapeHtml(born)}${died ? ' — ' + ghEscapeHtml(died) : ''}</div>
      ${person.occupation ? `<div class="card-detail"><strong>Occupation:</strong> ${ghEscapeHtml(person.occupation)}</div>` : ''}
      ${person.religion ? `<div class="card-detail"><strong>Religion:</strong> ${ghEscapeHtml(person.religion)}</div>` : ''}
      <span class="confidence-badge confidence-${conf}">${ghEscapeHtml(conf)} confidence</span>
    </a>
  `;
}

function showPersonModal(personId, opts = {}) {
  const person = getPerson(personId);
  if (!person) return;

  const parents = getParents(personId);
  const spouses = getSpouses(personId);
  const children = getChildren(personId);

  const modal = document.getElementById('person-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  personModalLastFocus = opts.trigger || document.activeElement;
  const confidence = ghSafeClassToken(person.confidence);
  const headingId = 'person-modal-title';

  content.innerHTML = `
    <button class="close-btn" type="button" data-modal-close aria-label="Close person details">&times;</button>
    <h2 id="${headingId}">${ghEscapeHtml(person.name)}</h2>
    <p><strong>Born:</strong> ${ghEscapeHtml(formatDate(person.born))}</p>
    ${person.died ? `<p><strong>Died:</strong> ${ghEscapeHtml(formatDate(person.died))}</p>` : ''}
    ${person.occupation ? `<p><strong>Occupation:</strong> ${ghEscapeHtml(person.occupation)}</p>` : ''}
    ${person.religion ? `<p><strong>Religion:</strong> ${ghEscapeHtml(person.religion)}</p>` : ''}
    ${parents.length ? `<p><strong>Parents:</strong> ${parents.map(p => ghEscapeHtml(p.name)).join(' & ')}</p>` : ''}
    ${spouses.length ? `<p><strong>Spouse(s):</strong> ${spouses.map(s => ghEscapeHtml(s.name) + (s.married ? ` (m. ${ghEscapeHtml(s.married.year)})` : '')).join(', ')}</p>` : ''}
    ${children.length ? `<p><strong>Children:</strong> ${children.map(c => ghEscapeHtml(c.name)).join(', ')}</p>` : ''}
    ${person.notes ? `<p style="margin-top:1rem;color:var(--color-text-muted)">${ghEscapeHtml(person.notes)}</p>` : ''}
    ${person.sources?.length ? `
      <div style="margin-top:1rem;font-size:0.85rem;">
        <strong>Sources:</strong>
        <ul style="margin-top:0.3rem;padding-left:1.2rem;">
          ${person.sources.map(s => `<li style="color:var(--color-text-muted)">${renderSourceItem(s)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <span class="confidence-badge confidence-${confidence}">${ghEscapeHtml(confidence)} confidence</span>
  `;

  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.setAttribute('aria-labelledby', headingId);
  content.setAttribute('tabindex', '-1');
  modal.classList.add('active');
  if (!document.body.classList.contains('person-modal-open')) {
    personModalPreviousOverflow = document.body.style.overflow || '';
  }
  document.body.classList.add('person-modal-open');
  document.body.style.overflow = 'hidden';

  const closeBtn = content.querySelector('[data-modal-close]');
  requestAnimationFrame(() => (closeBtn || content).focus());

  if (!opts.skipPushState) {
    try {
      const newUrl = `${location.pathname}${location.search}#${personId}`;
      if (location.hash !== `#${personId}`) {
        history.pushState({ personModal: personId }, '', newUrl);
      }
    } catch (e) { /* ignore */ }
  }
}

function closeModal(opts = {}) {
  const modal = document.getElementById('person-modal');
  if (modal) modal.classList.remove('active');
  document.body.classList.remove('person-modal-open');
  document.body.style.overflow = personModalPreviousOverflow;
  if (!opts.skipHistory && location.hash) {
    try {
      history.replaceState({}, '', location.pathname + location.search);
    } catch (e) { /* ignore */ }
  }
  if (opts.restoreFocus !== false &&
      personModalLastFocus &&
      typeof personModalLastFocus.focus === 'function' &&
      document.contains(personModalLastFocus)) {
    personModalLastFocus.focus();
  }
}

document.addEventListener('keydown', e => {
  const modal = document.getElementById('person-modal');
  if (!modal || !modal.classList.contains('active')) return;
  const content = document.getElementById('modal-content');
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
    return;
  }
  if (e.key !== 'Tab' || !content) return;
  const focusable = Array.from(content.querySelectorAll(GH_FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!focusable.length) {
    e.preventDefault();
    content.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('[data-modal-close]')) {
    e.preventDefault();
    closeModal();
    return;
  }
  const modal = document.getElementById('person-modal');
  if (modal && modal.classList.contains('active') && e.target === modal) {
    closeModal();
  }
});

// Intercept card anchors that point to people.html#<id> while we're already on
// people.html — open the modal instead of navigating. Right-click / Ctrl+click
// / middle-click still get default browser behaviour (open in new tab).
document.addEventListener('click', e => {
  const card = e.target.closest && e.target.closest('a.card');
  if (!card) return;
  if (e.defaultPrevented) return;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const href = card.getAttribute('href') || '';
  const onPeoplePage = /(^|\/)people\.html(\?|#|$)/.test(location.pathname) ||
                       location.pathname.endsWith('/people.html') ||
                       location.pathname.endsWith('people.html');
  const targetsPeopleHash = href.startsWith('people.html#') ||
                            (onPeoplePage && href.startsWith('#'));

  if (onPeoplePage && targetsPeopleHash) {
    const id = href.split('#')[1];
    if (id && getPerson(id)) {
      e.preventDefault();
      showPersonModal(id, { trigger: card });
    }
  }
});

window.addEventListener('popstate', e => {
  const modal = document.getElementById('person-modal');
  if (!modal) return;
  if (location.hash) {
    const id = location.hash.slice(1);
    if (getPerson(id)) {
      showPersonModal(id, { skipPushState: true });
      return;
    }
  }
  closeModal({ skipHistory: true, restoreFocus: false });
});
