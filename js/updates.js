/**
 * updates.js
 * Renders the Updates hub from /data/updates.json. Podcast cards display
 * actual people (not series names), compact platform selectors, and
 * locked card dimensions.
 */
(function(){
  const ROOT = document.documentElement.dataset.root || '';
  let ALL = [];
  let PODCAST_SERIES = {};
  let ARTICLES = [];
  let activeType = 'All';
  let activeQuery = '';

  const TYPE_LABELS = { article:'Article', announcement:'Announcement', opportunity:'Opportunity', podcast:'Podcast', webinar:'Webinar' };
  const TYPE_LABELS_PLURAL = { article:'Articles', announcement:'Announcements', opportunity:'Opportunities', podcast:'Podcasts', webinar:'Webinars' };
  const PLATFORM_MAP = { youtube:'YouTube', spotify:'Spotify', applePodcasts:'Apple Podcasts', zoom:'Recording' };

  /* Shared date format: "29 Sept 2026". Fixed month names ("Sept" is
     intentional) so browser locale can never change the output. */
  const UPDATE_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  function fmtUpdateDate(d){
    if(!d) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if(!m) return '';
    const mi = parseInt(m[2], 10);
    if(mi < 1 || mi > 12) return '';
    return `${parseInt(m[3], 10)} ${UPDATE_MONTHS[mi - 1]} ${m[1]}`;
  }

  /* Malawi calendar day (Africa/Blantyre is UTC+2 year-round, no DST). */
  function malawiTodayStr(){
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Blantyre', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
    } catch(e){
      return new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);
    }
  }

  /* A deadline counts as passed after the end of the deadline day in Malawi
     time (deadline treated as <date>T23:59:59+02:00). Computed at load. */
  function deadlineStatus(deadline){
    if(!deadline) return 'none';
    if(Date.now() > new Date(deadline + 'T23:59:59+02:00').getTime()) return 'closed';
    if(deadline === malawiTodayStr()) return 'today';
    return 'open';
  }

  function isExternalUrl(url){
    return /^https?:\/\//i.test(url || '');
  }

  /* Article routing (AR): match an updates item to its articles.json record.
     Explicit articleId wins; otherwise equal image (articles.json mainImage
     takes precedence, legacy top-level image still matches), otherwise equal
     title. Announcements never match — only type "article" is routed. Pure. */
  function matchArticleRecord(item, articles){
    if(!item || item.type !== 'article') return null;
    const list = Array.isArray(articles) ? articles : [];
    if(item.articleId){
      const byId = list.find(a => a.id === item.articleId);
      if(byId) return byId;
    }
    const artImage = (a) => (a.mainImage && a.mainImage.src) || a.image;
    const byImage = list.find(a => artImage(a) && item.image && artImage(a) === item.image);
    if(byImage) return byImage;
    return list.find(a => a.title && item.title && a.title === item.title) || null;
  }

  /* Href for an article card's Read Now. Explicit non-empty link wins
     (safety fallback); otherwise the routed article.html URL, or null when
     no record matches (renders the spacer, as before). Pure. */
  function articleDetailHref(item, articles, root){
    if(!item || item.type !== 'article') return null;
    if(item.link) return null;
    const rec = matchArticleRecord(item, articles);
    return rec ? ((root || '') + 'article.html?id=' + rec.id) : null;
  }
  function linkTargetAttrs(url){
    return isExternalUrl(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
  }

  function getSeries(seriesId){
    return PODCAST_SERIES[seriesId];
  }

  function formatPeople(people){
    if(!people || !people.length) return '';
    if(people.length === 1) return people[0];
    if(people.length === 2) return people.join(' & ');
    return people.slice(0, -1).join(', ') + ' & ' + people[people.length - 1];
  }

  function peopleLabel(people){
    if(!people || !people.length) return '';
    return 'BY ' + formatPeople(people);
  }

  /* Inline platform icons (no font, no CDN): 17px, currentColor resolves to
     the button navy at rest and white on hover. Key-first mapping, URL sniff
     as fallback: youtube/spotify/apple keys, mailto → mail, else globe. */
  const UB_ICONS = {
    youtube: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M8 10.5c2.7-.8 5.3-.5 7.5.8M8.3 13.2c2.2-.6 4.2-.3 6 .8M8.6 15.7c1.7-.5 3.2-.2 4.6.7" stroke-width="1.6" stroke-linecap="round"/></svg>',
    apple: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M7.5 16.5a6.4 6.4 0 0 1 0-9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.8 19.2a10.2 10.2 0 0 1 0-14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" stroke-width="1.8" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="1.8"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" stroke-width="1.6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke-width="1.8"/><path d="M3.5 7l8.5 6 8.5-6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function platformIcon(key, url){
    const k = String(key || '').toLowerCase();
    const u = String(url || '').toLowerCase();
    if(k.includes('youtube')) return UB_ICONS.youtube;
    if(k.includes('spotify')) return UB_ICONS.spotify;
    if(k.includes('apple')) return UB_ICONS.apple;
    if(k.includes('mail') || u.startsWith('mailto:')) return UB_ICONS.mail;
    return UB_ICONS.globe;
  }

  /* One submenu anchor: real link, icon left of label, no arrow glyph. */
  function submenuBtn(key, url, verb, label){
    const text = label || PLATFORM_MAP[key] || key;
    const ext = isExternalUrl(url);
    return `<a class="pc-platform-btn" href="${url}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''} aria-label="${verb} on ${text}">${platformIcon(key, url)}<span>${text}</span></a>`;
  }

  function submenuGroup(links, verb){
    if(!links) return '';
    const entries = Object.entries(links).filter(([,url])=>url);
    if(!entries.length) return '';
    const buttons = entries.map(([key,url]) => submenuBtn(key, url, verb)).join('');
    return `<div class="pc-platforms" data-count="${entries.length}">${buttons}</div>`;
  }

  function platformSelector(links, verb){
    return submenuGroup(links, verb || 'Listen');
  }

  /* Reveal-button opener reusing the Listen Now component. */
  function revealOpener(label, holderId){
    return `<button class="pc-cta" type="button" aria-expanded="false" aria-controls="${holderId}">${label}</button>`;
  }

  function card(item, index){
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const holderId = `up-links-${index}`;
    const isPodcast = item.type === 'podcast';
    const media = item.embedUrl
      ? `<div class="update-embed"><iframe src="${item.embedUrl}" title="${item.title}" loading="lazy" allowfullscreen></iframe></div>`
      : `<img src="${ROOT}${(item.image||'').replace(/^\//,'')}" alt="" loading="lazy"${item.imagePosition ? ` style="object-position:${item.imagePosition}"` : ''} onerror="this.parentElement.style.background='var(--navy)'">`;

    let badges = `<span class="update-type-badge">${typeLabel}</span>`;
    let byline = '';
    let deadlineHtml = '';
    let ctaInner = '';
    let holder = '';

    if(isPodcast){
      const series = getSeries(item.seriesId);
      const people = series ? (series.people || []) : [];
      const epCount = series ? series.totalEpisodes : 0;
      const peopleStr = peopleLabel(people);
      badges += `<span class="pc-episodes">${epCount} Episode${epCount!==1?'s':''}</span>`;
      if(peopleStr) byline = `<span class="pc-people">${peopleStr}</span>`;
      ctaInner = revealOpener('▶ Listen Now', holderId);
      holder = `<div class="pc-platforms-holder" id="${holderId}" hidden>${platformSelector(item.links, 'Listen')}</div>`;
    } else if(item.type === 'webinar'){
      ctaInner = revealOpener('▶ Watch Now', holderId);
      holder = `<div class="pc-platforms-holder" id="${holderId}" hidden>${submenuGroup(item.links, 'Watch')}</div>`;
    } else if(item.type === 'opportunity'){
      const st = deadlineStatus(item.deadline);
      if(st === 'closed'){
        deadlineHtml = `<span class="deadline-flag">Applications closed on ${fmtUpdateDate(item.deadline)}</span>`;
        ctaInner = `<button class="pc-cta" type="button" disabled aria-disabled="true">Applications closed</button>`;
      } else {
        if(st === 'today') deadlineHtml = `<span class="deadline-flag">Closes today</span>`;
        else if(item.deadline) deadlineHtml = `<span class="deadline-flag">Apply by ${fmtUpdateDate(item.deadline)}</span>`;
        const applyUrl = item.link || (ROOT + 'contact.html');
        const ext = isExternalUrl(applyUrl);
        const applyLabel = ext ? 'Application form' : 'Contact us';
        ctaInner = revealOpener('Apply Now', holderId);
        holder = `<div class="pc-platforms-holder" id="${holderId}" hidden><div class="pc-platforms" data-count="1">${submenuBtn('link', applyUrl, 'Apply', applyLabel)}</div></div>`;
      }
      if(st === 'closed') badges += `<span class="update-closed-badge">Closed</span>`;
    } else if(item.type === 'article'){
      if(item.link){
        const href = isExternalUrl(item.link) ? item.link : (ROOT + item.link.replace(/^\//,''));
        ctaInner = `<a class="pc-cta" href="${href}"${linkTargetAttrs(item.link)}>Read Now</a>`;
      } else {
        const artHref = articleDetailHref(item, ARTICLES, ROOT);
        if(artHref){
          ctaInner = `<a class="pc-cta" href="${artHref}">Read Now</a>`;
        } else {
          ctaInner = `<div class="update-cta--empty" aria-hidden="true"><span class="pc-cta" style="visibility:hidden">Read Now</span></div>`;
        }
      }
    } else {
      if(item.link){
        const href = isExternalUrl(item.link) ? item.link : (ROOT + item.link.replace(/^\//,''));
        ctaInner = `<a class="pc-cta" href="${href}"${linkTargetAttrs(item.link)}>Read Now</a>`;
      } else {
        ctaInner = `<div class="update-cta--empty" aria-hidden="true"><span class="pc-cta" style="visibility:hidden">Read Now</span></div>`;
      }
    }

    return `<article class="card update-card${isPodcast ? ' podcast-card' : ''}">
      <div class="card-media">${media}${badges}</div>
      <div class="card-body">
        ${byline}
        <h4>${item.title}</h4>
        <span class="update-date">${fmtUpdateDate(item.date)}</span>
        <p class="update-desc">${item.excerpt||''}</p>
        ${deadlineHtml}
        <div class="update-cta">${ctaInner}${holder}</div>
      </div>
    </article>`;
  }

  function platformButtons(links, verb){
    return submenuGroup(links, verb || 'Watch');
  }

  /* Button-swap reveal: the main button hides (hidden attr, kept in DOM) and
     the submenu takes its exact box. restoreSwap brings the main back. */
  function restoreSwap(cardEl, focusMain){
    if(!cardEl) return;
    const main = cardEl.querySelector('.pc-cta[aria-expanded]');
    const holder = cardEl.querySelector('.pc-platforms-holder');
    if(holder && !holder.hasAttribute('hidden')) holder.setAttribute('hidden', '');
    if(main){
      if(main.hasAttribute('hidden')) main.removeAttribute('hidden');
      main.setAttribute('aria-expanded', 'false');
      if(focusMain){
        try { main.focus({ preventScroll: true }); } catch(err) { main.focus(); }
      }
    }
  }

  function closeAllSwaps(exceptCard){
    const grid = document.getElementById('updatesGrid');
    if(!grid) return;
    grid.querySelectorAll('.update-card').forEach(c => {
      if(c !== exceptCard) restoreSwap(c, false);
    });
  }

  /* Card-level action (UC): reuses the card's own main control — the toggle's
     click handler for Listen/Watch/Apply, the Read Now link for articles.
     Open-submenu, disabled-button and linkless cards deliberately do nothing. */
  function triggerCardAction(cardEl){
    if(!cardEl) return;
    if(cardEl.querySelector('.pc-cta[aria-expanded="true"]')) return;
    if(cardEl.querySelector('button.pc-cta:disabled')) return;
    const mainBtn = cardEl.querySelector('.pc-cta[aria-expanded]');
    if(mainBtn){
      if(!mainBtn.disabled) mainBtn.click();
      return;
    }
    const readLink = cardEl.querySelector('a.pc-cta[href]');
    if(readLink) readLink.click();
  }

  const PAGE_SIZE = 15;
  const SHORTCUTS = {
    'articles-announcements': { name: 'Articles & announcements', types: ['article', 'announcement'] },
    'opportunities': { name: 'Opportunities', types: ['opportunity'] },
    'podcasts-webinars': { name: 'Podcasts & webinars', types: ['podcast', 'webinar'] }
  };
  const SORTS = ['newest', 'oldest', 'title-asc', 'title-desc'];
  let activeShortcut = null;
  let activeSort = 'newest';
  let activePage = 1;

  function prefersReduced(){
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch(e){ return false; }
  }
  function smoothScrollTo(el){
    if(!el) return;
    try {
      el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
    } catch(e){ el.scrollIntoView(); }
  }

  function getFiltered(){
    return ALL.filter(i => {
      const matchType = activeShortcut
        ? SHORTCUTS[activeShortcut].types.includes(i.type)
        : (activeType === 'All' || i.type === activeType);
      const matchQuery = !activeQuery || ((i.title || '') + ' ' + (i.excerpt || '')).toLowerCase().includes(activeQuery);
      return matchType && matchQuery;
    });
  }

  function getSorted(list){
    const decorated = list.map((item, index) => ({ item, index }));
    decorated.sort((a, b) => {
      let cmp = 0;
      if(activeSort === 'oldest' || activeSort === 'newest'){
        cmp = new Date(a.item.date) - new Date(b.item.date);
        if(activeSort === 'newest') cmp = -cmp;
      } else if(activeSort === 'title-asc' || activeSort === 'title-desc'){
        cmp = String(a.item.title || '').localeCompare(String(b.item.title || ''));
        if(activeSort === 'title-desc') cmp = -cmp;
      }
      return cmp !== 0 ? cmp : a.index - b.index;
    });
    return decorated.map(d => d.item);
  }

  function pageCount(total){
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }

  function readURL(){
    const params = new URLSearchParams(window.location.search || '');
    const filter = params.get('filter');
    const sort = params.get('sort');
    const pageParam = params.get('page');
    const hasQuery = filter !== null || sort !== null || pageParam !== null;
    if(filter && SHORTCUTS[filter]){
      activeShortcut = filter;
      activeType = 'All';
    } else {
      const hash = (window.location.hash || '').replace('#', '');
      const hashMap = { podcasts:'podcast', webinars:'webinar', opportunities:'opportunity', articles:'article', announcements:'announcement' };
      if(!filter && hashMap[hash]){
        activeShortcut = null;
        activeType = hashMap[hash];
      } else {
        /* Plain URL (or an unknown filter value): single-type mode, All. */
        activeShortcut = null;
        activeType = 'All';
      }
    }
    activeSort = SORTS.includes(sort) ? sort : 'newest';
    const page = parseInt(pageParam, 10);
    activePage = Number.isFinite(page) && page >= 1 ? page : 1;
    if(hasQuery) return 'query';
    return activeType !== 'All' ? 'hash' : 'none';
  }

  function writeURL(mode){
    const params = new URLSearchParams();
    if(activeShortcut) params.set('filter', activeShortcut);
    if(activeSort !== 'newest') params.set('sort', activeSort);
    if(activePage > 1) params.set('page', String(activePage));
    const query = params.toString();
    const url = window.location.pathname + (query ? '?' + query : '');
    try {
      if(mode === 'push') window.history.pushState({ updates: true }, '', url);
      else window.history.replaceState({ updates: true }, '', url);
    } catch(e){ /* file:// or restricted context: ignore */ }
  }

  function syncControls(){
    const tabWrap = document.getElementById('ddTabs');
    if(tabWrap){
      tabWrap.querySelectorAll('.dd-tab').forEach(b => {
        b.classList.toggle('active', !activeShortcut && b.dataset.type === activeType);
      });
      let chip = tabWrap.querySelector('[data-up-chip]');
      if(activeShortcut){
        if(!chip){
          chip = document.createElement('span');
          chip.className = 'up-chip';
          chip.setAttribute('data-up-chip', '');
          tabWrap.prepend(chip);
        }
        chip.innerHTML = `<span>${SHORTCUTS[activeShortcut].name}</span><button type="button" class="up-chip-x" aria-label="Clear filter">×</button>`;
      } else if(chip){
        chip.remove();
      }
    }
    const sortSel = document.getElementById('upSort');
    if(sortSel) sortSel.value = activeSort;
  }

  function clearAllFilters(){
    activeShortcut = null;
    activeType = 'All';
    activeQuery = '';
    activeSort = 'newest';
    activePage = 1;
    const search = document.getElementById('ddSearch');
    if(search) search.value = '';
  }

  function draw(){
    const grid = document.getElementById('updatesGrid');
    const sorted = getSorted(getFiltered());
    const total = sorted.length;
    const pages = pageCount(total);
    if(activePage > pages) activePage = pages;
    if(activePage < 1) activePage = 1;
    const start = (activePage - 1) * PAGE_SIZE;
    const visible = sorted.slice(start, start + PAGE_SIZE);

    const countEl = document.getElementById('ddCount');
    if(countEl){
      countEl.textContent = total > PAGE_SIZE
        ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`
        : `${total} result${total===1?'':'s'}`;
    }
    grid.innerHTML = visible.length
      ? visible.map(card).join('')
      : `<div class="dd-empty"><p>No updates match your search.</p><button type="button" class="btn btn-gold" data-clear-filters>Clear filters</button></div>`;

    const pagination = document.getElementById('upPagination');
    const info = document.getElementById('upPageInfo');
    const prev = document.getElementById('upPrev');
    const next = document.getElementById('upNext');
    if(pagination){
      const show = total > PAGE_SIZE;
      pagination.hidden = !show;
      if(show){
        if(info) info.textContent = `Page ${activePage} of ${pages}`;
        [[prev, activePage <= 1], [next, activePage >= pages]].forEach(([btn, disabled]) => {
          if(!btn) return;
          btn.disabled = !!disabled;
          if(disabled) btn.setAttribute('aria-disabled', 'true');
          else btn.removeAttribute('aria-disabled');
        });
      }
    }

    /* UC: only actionable cards are focusable — toggle mains and Read Now
       links qualify; disabled-button and spacer cards never match. */
    grid.querySelectorAll('.update-card').forEach(cardEl => {
      if(cardEl.querySelector('.pc-cta[aria-expanded], a.pc-cta[href]')){
        cardEl.setAttribute('tabindex', '0');
      }
    });

    grid.querySelectorAll('.pc-cta[aria-expanded]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cardEl = btn.closest('.update-card');
        const holder = document.getElementById(btn.getAttribute('aria-controls'));
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        closeAllSwaps(cardEl);
        if(!isOpen && holder && cardEl){
          btn.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'true');
          holder.removeAttribute('hidden');
          const first = holder.querySelector('a.pc-platform-btn');
          if(first) first.focus();
        }
      });
    });

    grid.querySelectorAll('.update-card').forEach(cardEl => {
      cardEl.addEventListener('focusout', (e) => {
        if(cardEl.querySelector('.pc-cta[aria-expanded="true"]')
          && e.relatedTarget && !cardEl.contains(e.relatedTarget)){
          restoreSwap(cardEl, false);
        }
      });
      cardEl.addEventListener('keydown', (e) => {
        if(e.key === 'Escape'
          && cardEl.querySelector('.pc-cta[aria-expanded="true"]')){
          e.stopPropagation();
          restoreSwap(cardEl, true);
        }
      });
    });
  }

  document.addEventListener('click', (e) => {
    const grid = document.getElementById('updatesGrid');
    if(!grid) return;
    grid.querySelectorAll('.update-card').forEach(cardEl => {
      if(cardEl.querySelector('.pc-cta[aria-expanded="true"]')
        && !cardEl.contains(e.target)){
        restoreSwap(cardEl, false);
      }
    });
  });

  function wireControls(){
    const types = ['All', ...new Set(ALL.map(i => i.type))];
    const tabWrap = document.getElementById('ddTabs');
    tabWrap.innerHTML = types.map(t => `<button type="button" class="dd-tab${t==='All'?' active':''}" data-type="${t}">${t==='All'?'All':TYPE_LABELS_PLURAL[t]}</button>`).join('');
    tabWrap.addEventListener('click', (e) => {
      if(e.target.closest('[data-up-chip] .up-chip-x')){
        clearAllFilters();
        syncControls();
        draw();
        writeURL('push');
        return;
      }
      const btn = e.target.closest('.dd-tab');
      if(!btn) return;
      activeShortcut = null;
      activeType = btn.dataset.type;
      activePage = 1;
      syncControls();
      draw();
      writeURL('push');
    });
    document.getElementById('ddSearch').addEventListener('input', (e) => {
      activeQuery = e.target.value.trim().toLowerCase();
      activePage = 1;
      draw();
      writeURL('replace');
    });

    const sortSel = document.getElementById('upSort');
    if(sortSel){
      sortSel.addEventListener('change', () => {
        if(SORTS.includes(sortSel.value)){
          activeSort = sortSel.value;
          activePage = 1;
          draw();
          writeURL('push');
        }
      });
    }

    const prev = document.getElementById('upPrev');
    const next = document.getElementById('upNext');
    if(prev) prev.addEventListener('click', () => {
      if(activePage <= 1) return;
      activePage -= 1;
      draw();
      writeURL('push');
      scrollToResults(true);
    });
    if(next) next.addEventListener('click', () => {
      activePage += 1;
      draw();
      writeURL('push');
      scrollToResults(true);
    });

    document.querySelectorAll('[data-shortcut]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-shortcut');
        if(!SHORTCUTS[key]) return;
        activeShortcut = key;
        activeType = 'All';
        activeQuery = '';
        activeSort = 'newest';
        activePage = 1;
        const search = document.getElementById('ddSearch');
        if(search) search.value = '';
        syncControls();
        draw();
        writeURL('push');
        smoothScrollTo(document.querySelector('.updates-toolbar'));
      });
    });

    const grid = document.getElementById('updatesGrid');
    if(grid){
      grid.addEventListener('click', (e) => {
        if(!e.target.closest('[data-clear-filters]')) return;
        clearAllFilters();
        syncControls();
        draw();
        writeURL('push');
      });
      /* UC: one delegated listener — the grid persists across re-renders.
         Genuine interactive elements keep their own behaviour (no double
         fire); media clicks pass through since only a/button/form controls
         and iframes are skipped. */
      grid.addEventListener('click', (e) => {
        const cardEl = e.target.closest ? e.target.closest('.update-card') : null;
        if(!cardEl || !grid.contains(cardEl)) return;
        if(e.target.closest('a, button, iframe, input, select, textarea')) return;
        triggerCardAction(cardEl);
      });
      /* UC keyboard: only when the card element itself is focused — inner
         buttons/links already handle Enter/Space natively. */
      grid.addEventListener('keydown', (e) => {
        if(e.key !== 'Enter' && e.key !== ' ') return;
        const cardEl = e.target.closest ? e.target.closest('.update-card') : null;
        if(!cardEl || e.target !== cardEl) return;
        e.preventDefault();
        triggerCardAction(cardEl);
      });
    }

    window.addEventListener('popstate', () => {
      readURL();
      syncControls();
      draw();
    });
  }

  function scrollToResults(focusHeading){
    const grid = document.getElementById('updatesGrid');
    smoothScrollTo(grid);
    if(focusHeading){
      const heading = document.getElementById('updatesGridHeading');
      if(heading){
        try { heading.focus({ preventScroll: true }); } catch(e){ try { heading.focus(); } catch(e2){} }
      }
    }
  }

  async function init(){
    const res = await fetch(ROOT + 'data/updates.json');
    const json = await res.json();
    ALL = json.items;
    if (json.podcastSeries) {
      json.podcastSeries.forEach(s => { PODCAST_SERIES[s.id] = s; });
    }
    /* Article records are optional at runtime: a failed fetch only disables
       article.html routing (linkless article cards fall back to the spacer). */
    try {
      const artRes = await fetch(ROOT + 'data/articles.json');
      if(artRes.ok){
        const artJson = await artRes.json();
        if(Array.isArray(artJson.articles)) ARTICLES = artJson.articles;
      } else {
        console.warn(`[updates] articles.json HTTP ${artRes.status} — article routing disabled.`);
      }
    } catch(err) {
      console.warn('[updates] could not load articles.json — article routing disabled.', err);
    }
    const fromURL = readURL();
    wireControls();
    syncControls();
    draw();
    if(fromURL === 'query'){
      /* Normalise invalid values (e.g. ?page beyond the last page). */
      writeURL('replace');
      smoothScrollTo(document.querySelector('.updates-toolbar'));
    }
  }

  document.addEventListener('partials:ready', init);

  /* Test hook for the updates harness: exposes the render helpers so a
     test page can build cards through the real code path. */
  try {
    window.__updates = {
      card, submenuGroup, platformSelector, platformButtons, submenuBtn, platformIcon,
      triggerCardAction, restoreSwap, matchArticleRecord, articleDetailHref
    };
  } catch(err) {}
})();
