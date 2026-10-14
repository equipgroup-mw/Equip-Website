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

  function platformSelector(links){
    if(!links) return '';
    const entries = Object.entries(links).filter(([,url])=>url);
    if(!entries.length) return '';
    const buttons = entries.map(([key,url]) =>
      `<a class="pc-platform-btn" href="${url}" target="_blank" rel="noopener">${PLATFORM_MAP[key]||key}</a>`
    ).join('');
    return `<div class="pc-platforms">${buttons}</div>`;
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
      holder = `<div class="pc-platforms-holder" id="${holderId}">${platformSelector(item.links)}</div>`;
    } else if(item.type === 'webinar'){
      ctaInner = revealOpener('▶ Watch Now', holderId);
      holder = `<div class="pc-platforms-holder" id="${holderId}">${platformButtons(item.links)}</div>`;
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
        const applyLabel = ext ? 'Application form ↗' : 'Contact us →';
        ctaInner = revealOpener('Apply Now', holderId);
        holder = `<div class="pc-platforms-holder" id="${holderId}"><div class="pc-platforms"><a class="pc-platform-btn" href="${applyUrl}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${applyLabel}</a></div></div>`;
      }
      if(st === 'closed') badges += `<span class="update-closed-badge">Closed</span>`;
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

  function platformButtons(links){
    if(!links) return '';
    return `<div class="platform-row">${Object.entries(links).filter(([,url])=>url).map(([key,url]) =>
      `<a class="platform-btn" href="${url}" target="_blank" rel="noopener">${PLATFORM_MAP[key]||key} ↗</a>`).join('')}</div>`;
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

    grid.querySelectorAll('.pc-cta[aria-expanded]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const holder = document.getElementById(btn.getAttribute('aria-controls'));
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        grid.querySelectorAll('.pc-platforms-holder.pc-platforms-open').forEach(h => h.classList.remove('pc-platforms-open'));
        grid.querySelectorAll('.pc-cta[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
        if(!isOpen && holder){
          holder.classList.add('pc-platforms-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  document.addEventListener('click', (e) => {
    const grid = document.getElementById('updatesGrid');
    if(grid && !e.target.closest('.update-card')){
      grid.querySelectorAll('.pc-platforms-holder.pc-platforms-open').forEach(h => h.classList.remove('pc-platforms-open'));
      grid.querySelectorAll('.pc-cta[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
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
})();
