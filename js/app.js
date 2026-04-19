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

function renderPersonCard(person) {
  const born = person.born ? formatDate(person.born) : 'Unknown';
  const died = person.died ? formatDate(person.died) : '';
  const conf = person.confidence || 'medium';
  const href = getPersonHref(person.id);
  const lifespan = `${person.born?.year || '?'}${person.died ? '-' + (person.died.year || '?') : ''}`;
  const ariaLabel = `View details for ${person.name}, ${lifespan}`;

  return `
    <a class="card" href="${href}" aria-label="${ariaLabel}" data-person-id="${person.id}">
      <div class="card-name">${person.name}</div>
      <div class="card-dates">${born}${died ? ' — ' + died : ''}</div>
      ${person.occupation ? `<div class="card-detail"><strong>Occupation:</strong> ${person.occupation}</div>` : ''}
      ${person.religion ? `<div class="card-detail"><strong>Religion:</strong> ${person.religion}</div>` : ''}
      <span class="confidence-badge confidence-${conf}">${conf} confidence</span>
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

  content.innerHTML = `
    <button class="close-btn" onclick="closeModal()">&times;</button>
    <h3>${person.name}</h3>
    <p><strong>Born:</strong> ${formatDate(person.born)}</p>
    ${person.died ? `<p><strong>Died:</strong> ${formatDate(person.died)}</p>` : ''}
    ${person.occupation ? `<p><strong>Occupation:</strong> ${person.occupation}</p>` : ''}
    ${person.religion ? `<p><strong>Religion:</strong> ${person.religion}</p>` : ''}
    ${parents.length ? `<p><strong>Parents:</strong> ${parents.map(p => p.name).join(' & ')}</p>` : ''}
    ${spouses.length ? `<p><strong>Spouse(s):</strong> ${spouses.map(s => s.name + (s.married ? ` (m. ${s.married.year})` : '')).join(', ')}</p>` : ''}
    ${children.length ? `<p><strong>Children:</strong> ${children.map(c => c.name).join(', ')}</p>` : ''}
    ${person.notes ? `<p style="margin-top:1rem;color:var(--color-text-muted)">${person.notes}</p>` : ''}
    ${person.sources?.length ? `
      <div style="margin-top:1rem;font-size:0.85rem;">
        <strong>Sources:</strong>
        <ul style="margin-top:0.3rem;padding-left:1.2rem;">
          ${person.sources.map(s => `<li style="color:var(--color-text-muted)">${s}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <span class="confidence-badge confidence-${person.confidence || 'medium'}">${person.confidence || 'medium'} confidence</span>
  `;

  modal.classList.add('active');

  if (!opts.skipPushState) {
    try {
      const newUrl = `${location.pathname}${location.search}#${personId}`;
      if (location.hash !== `#${personId}`) {
        history.pushState({ personModal: personId }, '', newUrl);
      }
    } catch (e) { /* ignore */ }
  }
}

function closeModal() {
  const modal = document.getElementById('person-modal');
  if (modal) modal.classList.remove('active');
  if (location.hash) {
    try {
      history.replaceState({}, '', location.pathname + location.search);
    } catch (e) { /* ignore */ }
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
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
      showPersonModal(id);
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
  modal.classList.remove('active');
});
