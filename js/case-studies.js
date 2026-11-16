const VIDEO_MAP = {
    'business-development': 'hero-bds-video.webm',
    'research-project-management': 'hero-rpm-video.webm',
    'data-division': 'hero-dd-video.webm'
  };

const POSTER_MAP = {
    'business-development': 'hero-bds.avif',
    'research-project-management': 'hero-rpm.png',
    'data-division': 'hero-data.avif'
  };

const ACCENT_CLASS_MAP = {
    'business-development': 'hero--accent-plum',
    'research-project-management': 'hero--accent-green',
    'data-division': 'hero--accent-turquoise'
  };

const ROOT = document.documentElement.dataset.root || '';

export async function loadCaseStudies(serviceSlug, { featuredOnly = false, limit = null } = {}) {
  const res = await fetch(ROOT + 'data/case-studies.json');
  const { caseStudies } = await res.json();
  let filtered = serviceSlug ? caseStudies.filter(cs => cs.serviceSlug === serviceSlug) : caseStudies;
  if (featuredOnly) filtered = filtered.filter(cs => cs.featured);
  filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  if (limit) filtered = filtered.slice(0, limit);
  return filtered;
}

export function getServiceColor(serviceSlug) {
  const colors = {
    'business-development': 'plum',
    'research-project-management': 'green',
    'data-division': 'turquoise'
  };
  return colors[serviceSlug] || 'navy';
}

/* Plain-text snippet from the case study's body prose.
   Uses the first populated of challenge/approach/solution/results,
   strips HTML tags, collapses whitespace. The card clamps to 3 lines. */
function cardDescription(cs){
  const raw = cs.challenge || cs.approach || cs.solution || cs.results || cs.summary || '';
  return String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderCaseStudyCard(cs, { link = true } = {}) {
  const color = getServiceColor(cs.serviceSlug);
  const studyUrl = ROOT + `case-study.html?id=${cs.id}`;
  const description = cardDescription(cs);
  const serviceName = String(cs.eyebrow || '').split('•')[0].trim();

  return `
    <article class="card case-study-card" data-id="${cs.id}" style="display:flex; flex-direction:column; height:100%; min-width:0;">
      <div class="card-media" style="aspect-ratio:2/1;">
        <img src="${ROOT}${cs.heroImage}" alt="${cs.heroImageAlt}"
             onerror="this.parentElement.style.background='var(--${color})'"
             style="width:100%; height:100%; object-fit:cover; object-position:center 30%;">
      </div>
      <div class="card-body" style="display:flex; flex-direction:column; flex:1; min-width:0; padding:.875rem .875rem .875rem .875rem; gap:.4rem;">
        <span class="tag" title="${escapeHtml(cs.eyebrow || '')}">${escapeHtml(serviceName)}</span>
        <h4 style="font-size:1.05rem; line-height:1.25; margin:0;">${cs.title}</h4>
        <p style="font-size:.8rem; color:var(--ink-soft); margin:0; line-height:1.4;">${cs.client} &bull; ${cs.period}</p>
        ${description ? `<p class="case-study-desc">${escapeHtml(description)}</p>` : ''}
        <div class="update-cta" style="margin-top:auto; padding-top:1rem; padding-bottom:0;">
          ${link ? `<a href="${studyUrl}" class="pc-cta" style="min-height:36px;">Read Now</a>` : ''}
        </div>
      </div>
    </article>
  `;
}

/* Listing page for a project's department, used by the "← Back to projects" link. */
const SERVICE_LISTINGS = {
  'business-development': 'services/business-development.html',
  'research-project-management': 'services/research-project-management.html',
  'data-division': 'services/data-division.html'
};
export function caseStudyListingHref(serviceSlug) {
  return ROOT + (SERVICE_LISTINGS[serviceSlug] || 'services/business-development.html');
}

/* Sort key for ordering projects newest → oldest.
   Primary field: publishedAt (YYYY-MM-DD). Fallback: the last year in the
   period string ("2022–2024" → 2024, "2022–Present" → current year). */
export function caseStudySortKey(cs) {
  if (!cs) return 0;
  if (cs.publishedAt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(cs.publishedAt));
    if (m) return parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
  }
  const years = String(cs.period || '').match(/\d{4}/g);
  if (!years || !years.length) return 0;
  const endYear = /present/i.test(cs.period || '')
    ? new Date().getFullYear()
    : parseInt(years[years.length - 1], 10);
  return endYear ? endYear * 10000 + 1231 : 0;
}

/* Other projects in the SAME department, excluding the current one, newest first. */
export function relatedCaseStudies(all, current) {
  const list = Array.isArray(all) ? all : [];
  const slug = current && current.serviceSlug;
  return list
    .filter(cs => cs && cs.id !== (current && current.id) && cs.serviceSlug === slug)
    .sort((a, b) => caseStudySortKey(b) - caseStudySortKey(a));
}

const CS_PER_PAGE = 3;

/* Detail page — same layout language as the article page (article.html):
   hero → back link → details strip → cover figure → body → more projects. */
export function renderCaseStudyDetail(cs, related) {
  const accentClass = ACCENT_CLASS_MAP[cs.serviceSlug] || 'hero--accent-plum';
  const posterSrc = ROOT + 'assets/images/' + (POSTER_MAP[cs.serviceSlug] || 'hero-bds.avif');
  const videoSrc = ROOT + 'assets/videos/' + (VIDEO_MAP[cs.serviceSlug] || 'hero-bds-video.webm');
  const siblings = Array.isArray(related) ? related : [];

  const details = [
    ['Client', cs.client],
    ['Period', cs.period],
    ['Location', cs.location],
    ['Service', String(cs.eyebrow || '').split('•')[0].trim()]
  ].filter(([, value]) => value);

  const cover = cs.heroImage ? `
    <figure class="article-cover">
      <img src="${ROOT}${cs.heroImage}" alt="${cs.heroImageAlt || cs.title}" loading="lazy" onerror="this.closest('figure').style.display='none'">
      ${cs.coverCaption ? `<figcaption class="image-caption">${cs.coverCaption}</figcaption>` : ''}
    </figure>` : '';

  const sections = [
    ['The Challenge', cs.challenge],
    ['Our Approach', cs.approach],
    ['The Solution', cs.solution],
    ['Results & Impact', cs.results]
  ].filter(([, body]) => body);

  return `
    <section class="hero hero--compact ${accentClass} hero--case-study" data-hero>
      <div class="hero-bg"><video autoplay muted loop playsinline preload="auto" poster="${posterSrc}"><source src="${videoSrc}" type="video/webm"></video></div>
      <div class="hero-inner">
        <div class="hero-content" style="grid-column:1/-1; text-align:center;">
          <span class="hero-eyebrow">${cs.eyebrow}</span>
          <h1>${cs.title}</h1>
          <p class="hero-lede" style="max-width:60ch; margin-inline:auto;">${cs.client} • ${cs.period} • ${cs.location}</p>
          <div class="metric-row" style="display:flex; gap:2rem; justify-content:center; margin-top:2rem; flex-wrap:wrap;">
            ${cs.metrics.map(m => `
              <div style="text-align:center; min-width:120px;">
                <b style="font-family:var(--font-display); font-size:var(--step-3); color:var(--soft-gold);">${m.value}</b>
                <div style="font-size:.85rem; color:rgba(246,244,238,.7);">${m.label}</div>
                <div style="font-size:.75rem; color:rgba(246,244,238,.5);">${m.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="article-column">
          <p class="article-backlink"><a href="${caseStudyListingHref(cs.serviceSlug)}">← Back to projects</a></p>
          ${details.length ? `<div class="cs-details">
            ${details.map(([label, value]) => `
              <div class="cs-details-item">
                <span class="cs-details-label">${label}</span>
                <span class="cs-details-value">${value}</span>
              </div>`).join('')}
          </div>` : ''}
          ${cover}
          ${sections.map(([heading, body]) => `
            <div class="case-study-section">
              <h2>${heading}</h2>
              <div class="prose">${body}</div>
            </div>`).join('')}
        </div>
        ${siblings.length ? `
        <div style="margin-top:3rem;">
          <h2>More Projects</h2>
          <div class="grid grid-3" data-cs-more></div>
          <nav class="up-pagination" data-cs-pagination aria-label="More projects pages" hidden>
            <button type="button" class="up-page-btn" data-cs-prev aria-label="Previous page"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5"/></svg></button>
            <span class="up-page-info" data-cs-page-info aria-live="polite"></span>
            <button type="button" class="up-page-btn" data-cs-next aria-label="Next page"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.5"/></svg></button>
          </nav>
        </div>` : ''}
      </div>
    </section>
  `;
}

/* Wire the "More Projects" pagination: re-renders the card set per page
   (destroying the current cards, not hiding them). */
export function wireCaseStudyPagination(rootEl, related) {
  if (!rootEl || !rootEl.querySelector) return;
  const grid = rootEl.querySelector('[data-cs-more]');
  const nav = rootEl.querySelector('[data-cs-pagination]');
  if (!grid || !nav) return;
  const list = Array.isArray(related) ? related : [];
  const pages = Math.ceil(list.length / CS_PER_PAGE);
  const prev = nav.querySelector('[data-cs-prev]');
  const next = nav.querySelector('[data-cs-next]');
  const info = nav.querySelector('[data-cs-page-info]');
  let page = 1;

  function attachCardBehaviors() {
    grid.addEventListener('click', (e) => {
      const cardEl = e.target.closest ? e.target.closest('.case-study-card') : null;
      if(!cardEl || !grid.contains(cardEl)) return;
      if(e.target.closest('a, button, iframe, input, select, textarea')) return;
      const link = cardEl.querySelector('a.pc-cta[href]');
      if(link) link.click();
    });
    
    grid.addEventListener('keydown', (e) => {
      if(e.key !== 'Enter' && e.key !== ' ') return;
      const cardEl = e.target.closest ? e.target.closest('.case-study-card') : null;
      if(!cardEl || e.target !== cardEl) return;
      e.preventDefault();
      const link = cardEl.querySelector('a.pc-cta[href]');
      if(link) link.click();
    });
    
    grid.querySelectorAll('.case-study-card').forEach(cardEl => {
      if(cardEl.querySelector('a.pc-cta[href]')) cardEl.setAttribute('tabindex', '0');
    });
  }

  function renderPage(n) {
    page = Math.max(1, Math.min(pages, n));
    grid.innerHTML = list
      .slice((page - 1) * CS_PER_PAGE, page * CS_PER_PAGE)
      .map(cs => renderCaseStudyCard(cs, { link: true }))
      .join('');
    if (info) info.textContent = `Page ${page} of ${pages}`;
    if (prev) {
      prev.disabled = page <= 1;
      prev.setAttribute('aria-disabled', String(page <= 1));
    }
    if (next) {
      next.disabled = page >= pages;
      next.setAttribute('aria-disabled', String(page >= pages));
    }
    attachCardBehaviors();
  }

  if (pages <= 1) {
    nav.hidden = true;
  } else {
    nav.hidden = false;
  }
  if (prev) prev.addEventListener('click', () => renderPage(page - 1));
  if (next) next.addEventListener('click', () => renderPage(page + 1));
  renderPage(1);
}

/* Wire the "Featured Projects" pagination on service pages: re-renders the
   card set per page (destroying the current cards, not hiding them). */
export function wireFeaturedPagination(gridEl, navEl, studies, { perPage = 3 } = {}) {
  if (!gridEl || !navEl) return;
  const prev = navEl.querySelector('[data-fp-prev]');
  const next = navEl.querySelector('[data-fp-next]');
  const info = navEl.querySelector('[data-fp-page-info]');
  let page = 1;
  const pages = Math.max(1, Math.ceil(studies.length / perPage));

  function attachCardBehaviors() {
    /* Whole-card click behavior (matching Updates page) */
    gridEl.addEventListener('click', (e) => {
      const cardEl = e.target.closest ? e.target.closest('.case-study-card') : null;
      if(!cardEl || !gridEl.contains(cardEl)) return;
      if(e.target.closest('a, button, iframe, input, select, textarea')) return;
      const link = cardEl.querySelector('a.pc-cta[href]');
      if(link) link.click();
    });
    
    /* Keyboard activation */
    gridEl.addEventListener('keydown', (e) => {
      if(e.key !== 'Enter' && e.key !== ' ') return;
      const cardEl = e.target.closest ? e.target.closest('.case-study-card') : null;
      if(!cardEl || e.target !== cardEl) return;
      e.preventDefault();
      const link = cardEl.querySelector('a.pc-cta[href]');
      if(link) link.click();
    });
    
    /* Focusable cards */
    gridEl.querySelectorAll('.case-study-card').forEach(cardEl => {
      if(cardEl.querySelector('a.pc-cta[href]')) cardEl.setAttribute('tabindex', '0');
    });
  }

  function renderPage(n) {
    page = Math.max(1, Math.min(pages, n));
    gridEl.innerHTML = studies
      .slice((page - 1) * perPage, page * perPage)
      .map(cs => renderCaseStudyCard(cs, { link: true }))
      .join('');
    if (info) info.textContent = `Page ${page} of ${pages}`;
    if (prev) {
      prev.disabled = page <= 1;
      prev.setAttribute('aria-disabled', String(page <= 1));
    }
    if (next) {
      next.disabled = page >= pages;
      next.setAttribute('aria-disabled', String(page >= pages));
    }
    attachCardBehaviors();
  }

  if (pages <= 1) {
    navEl.hidden = true;
  } else {
    navEl.hidden = false;
  }
  if (prev) prev.addEventListener('click', () => renderPage(page - 1));
  if (next) next.addEventListener('click', () => renderPage(page + 1));
  renderPage(1);
}