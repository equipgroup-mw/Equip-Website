/* articles.js — article detail system, modelled on js/case-studies.js.
   One module + one data file (data/articles.json): loadArticles() fetches,
   renderArticleDetail() builds the fixed hero + centred column (back link,
   byline + Share button, cover figure, body, tag strip, share popup) +
   latest-articles section, renderArticleCard() builds Updates-style cards.
   Section bodies are plain paragraphs (blank line separates paragraphs);
   everything is escaped. Story images always render inside a <figure> with
   a visible caption (+ optional portal link); sections without images render
   no figure. There is no sidebar and no typed-in read time. */

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

/* Slug for a section heading (stable deep-link ids). Pure. */
export function slugifyHeading(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
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
   imageless sections produce no figure element and no gap. An optional
   portalUrl renders a same-tab "Explore in the Data Division portal →" link
   under the caption (generic wording — correct for static visuals too).
   Cover figures get the 16:9 capped frame; body figures keep natural ratio. */
function storyFigure(img, cover) {
  return `
    <figure class="${cover ? 'article-cover' : 'article-figure'}">
      <img src="${imgSrc(img.src)}" alt="${esc(img.alt)}" loading="lazy" onerror="this.closest('figure').style.display='none'">
      <figcaption class="image-caption">${esc(img.caption)}</figcaption>
      ${img.portalUrl ? `<p class="portal-link"><a href="${imgSrc(img.portalUrl)}">Explore in the Data Division portal →</a></p>` : ''}
    </figure>`;
}

/* Latest articles: all records newest-first excluding the current one,
   capped at `limit`. Pure. */
export function latestArticles(articles, currentId, limit) {
  const n = limit == null ? 3 : limit;
  return (Array.isArray(articles) ? articles.slice() : [])
    .filter(a => a && a.id !== currentId)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, n);
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
  const seen = {};
  const sections = (article.sections || []).map(s => {
    let slug = slugifyHeading(s.heading);
    if (seen[slug] != null) {
      seen[slug] += 1;
      slug = `${slug}-${seen[slug]}`;
    } else {
      seen[slug] = 0;
    }
    return { heading: s.heading, body: s.body, image: s.image, slug };
  });
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const latest = latestArticles(articles || [], article.id, 3);
  const latestCards = latest.map(renderArticleCard).join('');

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
        <div class="article-column">
          <p class="article-backlink"><a href="${imgSrc('updates/index.html')}">← Back to updates</a></p>
          <div class="article-byline-row">
            <p class="article-byline">${fmtArticleDate(article.date)} · By ${esc(author)}</p>
            <button type="button" class="btn-share" data-share-open>Share</button>
          </div>
          ${article.mainImage ? storyFigure(article.mainImage, true) : ''}
          ${sections.map(s => `
            <div class="case-study-section" style="margin-bottom:2.5rem;">
              <h2 id="${esc(s.slug)}">${esc(s.heading)}</h2>
              ${s.image ? storyFigure(s.image, false) : ''}
              <div class="prose">${paragraphs(s.body)}</div>
            </div>`).join('')}
          ${article.pullQuote ? `<blockquote style="margin:2.5rem 0; padding:1rem 0 1rem 1.5rem; border-left:3px solid var(--navy); font-family:var(--font-display); font-style:italic; font-size:clamp(1.2rem, 2vw, 1.5rem); line-height:1.4; color:var(--navy);">${esc(article.pullQuote)}</blockquote>` : ''}
          ${tags.length ? `<div class="article-tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
        ${latestCards ? `
        <div style="margin-top:3rem;">
          <h2>Latest articles</h2>
          <div class="grid grid-3">${latestCards}</div>
        </div>` : ''}
        <div class="share-backdrop" data-share-backdrop hidden>
          <div class="share-panel" role="dialog" aria-modal="true" aria-label="Share this article">
            <button type="button" class="share-close" data-share-close aria-label="Close share dialog"><span aria-hidden="true">×</span></button>
            <ul class="share-options">
              <li><button type="button" data-share-copy aria-label="Copy link">${UB_SHARE_ICONS.copy}<span>Copy link</span></button></li>
              <li><a data-share="linkedin" data-title="${esc(article.title)}" aria-label="Share on LinkedIn">${UB_SHARE_ICONS.linkedin}<span>LinkedIn</span></a></li>
              <li><a data-share="facebook" data-title="${esc(article.title)}" aria-label="Share on Facebook">${UB_SHARE_ICONS.facebook}<span>Facebook</span></a></li>
              <li><a data-share="x" data-title="${esc(article.title)}" aria-label="Share on X">${UB_SHARE_ICONS.x}<span>X</span></a></li>
              <li><a data-share="whatsapp" data-title="${esc(article.title)}" aria-label="Share on WhatsApp">${UB_SHARE_ICONS.whatsapp}<span>WhatsApp</span></a></li>
            </ul>
            <p class="share-feedback" role="status" aria-live="polite" hidden></p>
          </div>
        </div>
      </div>
    </section>`;
}

/* Friendly in-page not-found state (unknown/missing ?id=). Pure. */
export function renderNotFound() {
  return `
    <section class="section"><div class="container">
      <p class="hero-eyebrow">Article</p>
      <h1>Article not found</h1>
      <p style="color:var(--ink-soft); max-width:52ch;">We couldn't find the article you're looking for. It may have been moved or the link may be incomplete.</p>
      <p><a class="btn btn-gold" href="${imgSrc('updates/index.html')}">← Back to updates</a></p>
    </div></section>`;
}

/* Inline share icons (no font, no CDN): ~17px, currentColor resolves to navy
   at rest and white on hover. */
const UB_SHARE_ICONS = {
  copy: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" stroke-width="1.8"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke-width="1.8" stroke-linecap="round"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.8"/><path d="M8 10.5V17M8 7.2v.1M12 17v-3.8c0-1.2.9-2.2 2.2-2.2 1.2 0 2.1 1 2.1 2.2V17" stroke-width="1.8" stroke-linecap="round"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M14.5 8.5V7.8c0-.8.2-1.3 1.4-1.3H17V3.5h-2.6c-2.5 0-3.9 1.6-3.9 4v2H8v3h2.5v7H14v-7h2.3l.4-3H14"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke-width="2" stroke-linecap="round"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5 2 1c-.5 1.5-1.5 2-2.5 1.5-3-1-6-4-7-7-.5-1 0-2 1.5-2.5l1 2L9 9.5z" fill="currentColor" stroke="none"/></svg>'
};

/* Share URL builders per network from the live page URL + title. Pure. */
export function shareUrls(pageUrl, title) {
  const u = encodeURIComponent(pageUrl || '');
  const t = encodeURIComponent(title || '');
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`
  };
}

/* Wire the share popup rendered above: fills social hrefs from the live URL,
   opens/closes via Share button, × button, backdrop click and Escape, traps
   Tab focus inside while open, locks body scroll, and handles copy-link
   (Clipboard API with textarea fallback + live feedback).
   Called once by the router after injecting the detail markup. */
export function wireSharePopup(rootEl) {
  if (!rootEl || !rootEl.querySelector) return;
  const openBtn = rootEl.querySelector('[data-share-open]');
  const backdrop = rootEl.querySelector('[data-share-backdrop]');
  if (!openBtn || !backdrop) return;
  const panel = backdrop.querySelector('.share-panel');
  const closeBtn = backdrop.querySelector('[data-share-close]');
  const pageUrl = window.location.href;
  backdrop.querySelectorAll('a[data-share]').forEach(a => {
    const net = a.getAttribute('data-share');
    const title = a.getAttribute('data-title') || '';
    const full = shareUrls(pageUrl, title)[net];
    if (!full) return;
    a.setAttribute('href', full);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  let prevOverflow = '';
  function focusables() {
    return [...backdrop.querySelectorAll('button:not([disabled]), a[href]')]
      .filter(el => !el.hasAttribute('hidden'));
  }
  function open() {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    backdrop.hidden = false;
    if (closeBtn) closeBtn.focus();
  }
  function close() {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.style.overflow = prevOverflow;
    openBtn.focus();
  }
  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  const btn = rootEl.querySelector('[data-share-copy]');
  const note = rootEl.querySelector('[data-share-note], .share-feedback');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const done = () => {
      if (note) {
        note.textContent = 'Copied';
        note.hidden = false;
        setTimeout(() => { note.textContent = ''; note.hidden = true; }, 2000);
      }
    };
    try {
      const clip = window.navigator && window.navigator.clipboard;
      if (clip && typeof clip.writeText === 'function') {
        clip.writeText(pageUrl).then(done, () => { if (fallbackCopy(pageUrl)) done(); });
        return;
      }
    } catch (err) { /* fall through to legacy path */ }
    if (fallbackCopy(pageUrl)) done();
  });
  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (err) {
      return false;
    }
  }
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
