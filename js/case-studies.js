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

export function renderCaseStudyCard(cs, { link = true } = {}) {
  const color = getServiceColor(cs.serviceSlug);
  const studyUrl = ROOT + `case-study.html?id=${cs.id}`;
  return `
    <article class="card case-study-card" data-id="${cs.id}">
      <div class="card-media">
        <img src="${ROOT}${cs.heroImage}" alt="${cs.heroImageAlt}"
             onerror="this.parentElement.style.background='var(--${color})'">
      </div>
      <div class="card-body">
        <span class="tag">${cs.eyebrow}</span>
        <h4>${cs.title}</h4>
        <p style="font-size:.85rem; color:var(--ink-soft); margin-bottom:.75rem;">${cs.client} • ${cs.period}</p>
        <div class="metric-preview" style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:.75rem;">
          ${cs.metrics.slice(0, 2).map(m => `
            <div class="metric-mini" style="flex:1; min-width:80px;">
              <b style="font-family:var(--font-display); color:var(--navy); display:block; font-size:.9rem;">${m.value}</b>
              <span style="font-size:.7rem; color:var(--ink-soft);">${m.label}</span>
            </div>
          `).join('')}
        </div>
        ${link ? `<a href="${studyUrl}" class="btn btn-outline" style="margin-top:.5rem; font-size:.8rem; width:100%; justify-content:center;">Read case study →</a>` : ''}
      </div>
    </article>
  `;
}

export function renderCaseStudyDetail(cs) {
  const color = getServiceColor(cs.serviceSlug);
  const teamNames = cs.team.map(id => {
    const nameMap = {
      'rollins-chitika': 'Rollins Chitika',
      'matilda-nhlane': 'Matilda Nhlane',
      'tereza-chaponda': 'Tereza Chaponda',
      'ipyana-mkandawire': 'Ipyana Mkandawire',
      'mervis-msukwa': 'Mervis Msukwa',
      'sophie-chisa': 'Sophie Chisa',
      'lusungu-masawanie': 'Lusungu Masawanie',
      'lizzie-mwanandi': 'Lizzie Mwanandi',
      'pacharo-njoloma': 'Pacharo Njoloma',
      'dorica-nyasulu': 'Dorica Nyasulu',
      'jacqueline-chibambo': 'Jacqueline Chibambo',
      'maxwell-mkumba': 'Maxwell Mkumba',
      'danford-mponda': 'Danford Mponda',
      'haywood-liuma': 'Haywood Liuma'
    };
    return nameMap[id] || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  });

  return `
    <section class="hero hero--compact" style="background:var(--${color});" data-hero>
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
        <div class="grid" style="grid-template-columns: 2fr 1fr; gap:3rem;">
          <div>
            <div class="case-study-section" style="margin-bottom:3rem;">
              <h2>The Challenge</h2>
              <div class="prose" style="color:var(--ink-soft); line-height:1.7;">${cs.challenge}</div>
            </div>
            <div class="case-study-section" style="margin-bottom:3rem;">
              <h2>Our Approach</h2>
              <div class="prose" style="color:var(--ink-soft); line-height:1.7;">${cs.approach}</div>
            </div>
            <div class="case-study-section" style="margin-bottom:3rem;">
              <h2>The Solution</h2>
              <div class="prose" style="color:var(--ink-soft); line-height:1.7;">${cs.solution}</div>
            </div>
            <div class="case-study-section">
              <h2>Results & Impact</h2>
              <div class="prose" style="color:var(--ink-soft); line-height:1.7;">${cs.results}</div>
            </div>
          </div>
          <aside>
            <div class="card" style="position:sticky; top:100px;">
              <div class="card-body">
                <h4>Project Details</h4>
                <dl style="display:grid; grid-template-columns:auto 1fr; gap:.5rem 1rem; font-size:.9rem; margin-bottom:1.5rem;">
                  <dt style="color:var(--ink-soft);">Client</dt><dd style="font-weight:600;">${cs.client}</dd>
                  <dt style="color:var(--ink-soft);">Period</dt><dd>${cs.period}</dd>
                  <dt style="color:var(--ink-soft);">Location</dt><dd>${cs.location}</dd>
                  <dt style="color:var(--ink-soft);">Service</dt><dd>${cs.eyebrow.split('•')[0].trim()}</dd>
                </dl>
                <hr class="rule" style="margin:1rem 0;">
                <h4>Team</h4>
                <div class="team-mini" style="display:flex; flex-wrap:wrap; gap:.5rem;">
                  ${teamNames.map(n => `<span class="tag">${n}</span>`).join('')}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}