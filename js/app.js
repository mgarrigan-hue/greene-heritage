// Greene Family Heritage — Shared Application Logic

let familyData = null;

async function loadFamilyData() {
  if (familyData) return familyData;
  const resp = await fetch('data/family.json');
  familyData = await resp.json();
  return familyData;
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

  return `
    <div class="card" onclick="showPersonModal('${person.id}')">
      <div class="card-name">${person.name}</div>
      <div class="card-dates">${born}${died ? ' — ' + died : ''}</div>
      ${person.occupation ? `<div class="card-detail"><strong>Occupation:</strong> ${person.occupation}</div>` : ''}
      ${person.religion ? `<div class="card-detail"><strong>Religion:</strong> ${person.religion}</div>` : ''}
      <span class="confidence-badge confidence-${conf}">${conf} confidence</span>
    </div>
  `;
}

function showPersonModal(personId) {
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
}

function closeModal() {
  document.getElementById('person-modal').classList.remove('active');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
