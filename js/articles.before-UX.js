/* articles.js — article detail system, modelled on js/case-studies.js.
   One module + one data file (data/articles.json): loadArticles() fetches,
   renderArticleDetail() builds the fixed hero + byline + captioned figures +
   body + sidebar, renderArticleCard() builds Updates-style cards for the
   related section. Section bodies are plain paragraphs (blank line separates
   paragraphs); everything is escaped. Story images always render inside a
   <figure> with a visible caption; sections without images render no figure. */

const ROOT = document.documentElement.dataset.root || '';

/* Fixed branded hero — identical for every article (same background the
   Updates page hero uses). Never the article's own image. */
const ARTICLE_HERO_SRC = 'assets/images/hero-updates.avif';

export async function loadArticles() {
  const res = await fetch(ROOT + 'data/articles.json');
  const { articles } = await res.json();
  return Array.isArray(articles) ? articles.slice() : [];
}

export function findArticle(articles, id) {
  if (!id) return null;
  return (articles || []).find(a => a.id === id) || null;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Fixed month names ("Sept" intentional) so locale never changes output —
   same convention as the Updates cards. */
const ARTICLE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
export function fmtArticleDate(d) {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return '';
  const mi = parseInt(m[2], 10);
  if (mi < 1 || mi > 12) return '';
  return `${parseInt(m[3], 10)} ${ARTICLE_MONTHS[mi - 1]} ${m[1]}`;
}

export function articleAuthor(article) {
  const a = article && typeof article.author === 'string' ? article.author.trim() : '';
  return a || 'EQUIP Team';
}

function paragraphs(body) {
  return String(body || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="color:var(--ink-soft); line-height:1.7; margin:0 0 1em;">${esc(p)}</p>`)
    .join('');
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

function imgSrc(src) {
  return ROOT + String(src || '').replace(/^\//, '');
}

/* One captioned story figure. Only ever called with a real image object, so
   imageless sections produce no figure element and no gap. */
function storyFigure(img) {
  return `
    <figure class="article-figure">
      <img src="${imgSrc(img.src)}" alt="${esc(img.alt)}" loading="lazy" onerror="this.closest('figure').style.display='none'">
      <figcaption class="image-caption">${esc(img.caption)}</figcaption>
    </figure>`;
}

/* Resolve a record's related entries: article ids become internal cards,
   full URLs become new-tab links, unknown ids are skipped with a warning —
   never rendered as dead links. Pure; takes the full article list. */
export function relatedFor(article, articles) {
  const out = [];
  const list = (article && Array.isArray(article.related)) ? article.related : [];
  for (const ref of list) {
    if (typeof ref !== 'string' || !ref) continue;
    if (isExternalUrl(ref)) {
      out.push({ kind: 'external', url: ref });
      continue;
    }
    const hit = findArticle(articles, ref);
    if (hit) out.push({ kind: 'internal', article: hit });
    else console.warn(`[articles] unknown related id "${ref}" on "${article.id}" — skipped.`);
  }
  return out;
}

export function renderArticleCard(article) {
  const studyUrl = ROOT + `article.html?id=${article.id}`;
  const img = article.mainImage || {};
  return `
    <article class="card update-card">
      <div class="card-media">
        <img src="${imgSrc(img.src)}" alt="${esc(img.alt || article.title)}" loading="lazy">
        <span class="update-type-badge">Article</span>
      </div>
      <div class="card-body" style="display:flex; flex-direction:column; flex:1;">
        <h4>${esc(article.title)}</h4>
        <span class="update-date">${fmtArticleDate(article.date)}</span>
        <p class="update-desc">${esc(article.excerpt || '')}</p>
        <div class="update-cta" style="margin-top:auto; padding-top:.85rem;">
          <a class="pc-cta" href="${studyUrl}">Read More</a>
        </div>
      </div>
    </article>`;
}

export function renderArticleDetail(article, articles) {
  const author = articleAuthor(article);
  const related = relatedFor(article, articles || []);
  const relatedCards = related
    .filter(r => r.kind === 'internal')
    .map(r => renderArticleCard(r.article))
    .join('');
  const relatedLinks = related
    .filter(r => r.kind === 'external')
    .map(r => `<a class="pc-cta" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a>`)
    .join('');
  const tags = Array.isArray(article.tags) ? article.tags : [];

  return `
    <section class="hero hero--compact" data-hero>
      <div class="hero-bg"><img src="${imgSrc(ARTICLE_HERO_SRC)}" alt="" onerror="this.style.opacity=0"></div>
      <div class="hero-inner">
        <div class="hero-content">
          <p class="hero-eyebrow">Article</p>
          <h1>${esc(article.title)}</h1>
          <p class="hero-lede">${esc(article.excerpt || '')}</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="grid cs-detail-grid" style="grid-template-columns: 2fr 1fr; gap:3rem;">
          <div>
            <p style="font-size:.95rem; font-weight:600; color:var(--ink-soft); margin:0 0 1.5rem;">${esc(author)} · ${fmtArticleDate(article.date)} · ${esc(article.readTime || '')}</p>
            ${article.mainImage ? storyFigure(article.mainImage) : ''}
            ${(article.sections || []).map(s => `
              <div class="case-study-section" style="margin-bottom:2.5rem;">
                <h2>${esc(s.heading)}</h2>
                ${s.image ? storyFigure(s.image) : ''}
                <div class="prose">${paragraphs(s.body)}</div>
              </div>`).join('')}
            ${article.pullQuote ? `<blockquote style="margin:2.5rem 0; padding:1rem 0 1rem 1.5rem; border-left:3px solid var(--navy); font-family:var(--font-display); font-style:italic; font-size:clamp(1.2rem, 2vw, 1.5rem); line-height:1.4; color:var(--navy);">${esc(article.pullQuote)}</blockquote>` : ''}
          </div>
          <aside>
            <div class="card" style="position:sticky; top:100px;">
              <div class="card-body">
                <h4>Article Details</h4>
                <dl style="display:grid; grid-template-columns:auto 1fr; gap:.5rem 1rem; font-size:.9rem; margin-bottom:1.5rem;">
                  <dt style="color:var(--ink-soft);">Author</dt><dd style="font-weight:600;">${esc(author)}</dd>
                  <dt style="color:var(--ink-soft);">Published</dt><dd>${fmtArticleDate(article.date)}</dd>
                  <dt style="color:var(--ink-soft);">Read time</dt><dd>${esc(article.readTime || '')}</dd>
                </dl>
                ${tags.length ? `<hr class="rule" style="margin:1rem 0;"><h4>Tags</h4><div style="display:flex; flex-wrap:wrap; gap:.5rem;">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
              </div>
            </div>
          </aside>
        </div>
        ${relatedCards || relatedLinks ? `
        <div style="margin-top:3rem;">
          <h2>Related reading</h2>
          <div class="grid grid-3">${relatedCards}</div>
          ${relatedLinks ? `<div style="margin-top:1.5rem; display:flex; gap:1rem; flex-wrap:wrap;">${relatedLinks}</div>` : ''}
        </div>` : ''}
      </div>
    </section>`;
}

/* JSON-LD Article block for the router to inject per article. Pure. */
export function buildArticleJsonLd(article, pageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || '',
    datePublished: article.date,
    author: { '@type': 'Organization', name: articleAuthor(article) },
    image: (article.mainImage && article.mainImage.src) || article.image || ''
  };
}
