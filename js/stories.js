/* js/stories.js — render the Stories index page from data/stories.json */
(function () {
  'use strict';

  const Site = window.Site || {};
  const escapeHtml = Site.escapeHtml || function (s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  };

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)} ${monthName} ${y}`;
  }

  function sourceTypeLabel(t) {
    const map = {
      'oral-history': '👵 Oral history',
      'research-breakthrough': '🔬 Research breakthrough',
      'photograph': '📸 Photograph',
      'document': '📜 Document',
      'place': '📍 Place',
      'note': '📝 Note'
    };
    return map[t] || t;
  }

  function renderStory(story) {
    const id = escapeHtml(story.id);
    const tags = (story.tags || []).map(t =>
      `<li class="story-tag">${escapeHtml(t)}</li>`
    ).join('');
    const contributors = (story.contributors || []).map(escapeHtml).join(', ');
    const peopleList = (story.people || []).map(p =>
      `<a href="people.html#${escapeHtml(p)}" class="story-person-link">${escapeHtml(p.replace(/-/g, ' '))}</a>`
    ).join(', ');
    const sources = (story.relatedSources || []).map(s =>
      `<li>${escapeHtml(s)}</li>`
    ).join('');

    return `
      <article class="story-card" id="story-${id}">
        <header class="story-header">
          <p class="story-meta">
            <span class="story-source-type">${sourceTypeLabel(story.sourceType)}</span>
            <span class="story-era">${escapeHtml(story.era || '')}</span>
            <span class="story-published">Published ${escapeHtml(fmtDate(story.published))}</span>
          </p>
          <h2 class="story-title"><a href="#story-${id}">${escapeHtml(story.title)}</a></h2>
          <p class="story-summary">${escapeHtml(story.summary || '')}</p>
        </header>

        <div class="story-body">
          ${story.body || ''}
        </div>

        <footer class="story-footer">
          ${tags ? `<ul class="story-tags" aria-label="Tags">${tags}</ul>` : ''}
          ${peopleList ? `<p class="story-people"><strong>People:</strong> ${peopleList}</p>` : ''}
          ${contributors ? `<p class="story-contributors"><strong>Contributors:</strong> ${escapeHtml(contributors)}</p>` : ''}
          ${sources ? `<details class="story-sources"><summary>Related sources (${(story.relatedSources || []).length})</summary><ul>${sources}</ul></details>` : ''}
        </footer>
      </article>
    `;
  }

  function renderToc(stories) {
    return `
      <nav class="story-toc" aria-label="Stories on this page">
        <h2>On this page</h2>
        <ol>
          ${stories.map(s => `
            <li>
              <a href="#story-${escapeHtml(s.id)}">${escapeHtml(s.title)}</a>
              <span class="story-toc-era">${escapeHtml(s.era || '')}</span>
            </li>
          `).join('')}
        </ol>
      </nav>
    `;
  }

  async function init() {
    const container = document.querySelector('[data-stories-container]');
    if (!container) return;

    container.innerHTML = '<p class="story-loading">Loading stories…</p>';

    try {
      const res = await fetch('data/stories.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load stories.json: ' + res.status);
      const data = await res.json();
      const stories = Array.isArray(data.stories) ? data.stories : [];

      if (stories.length === 0) {
        container.innerHTML = '<p class="story-empty">No stories yet.</p>';
        return;
      }

      const html = renderToc(stories) +
                   '<div class="story-list">' +
                   stories.map(renderStory).join('') +
                   '</div>';
      container.innerHTML = html;

      if (window.location.hash) {
        const target = document.querySelector(window.location.hash);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error('[stories]', err);
      container.innerHTML = `<p class="story-error">Could not load stories: ${escapeHtml(err.message)}</p>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
