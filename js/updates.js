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

  function fmtDate(d){
    if(!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }

  function getSeries(seriesId){
    return PODCAST_SERIES[seriesId];
  }

  function formatPeople(people){
    if(!people || !people.length) return '';
    const max = 5;
    const shown = people.slice(0, Math.min(max, people.length));
    if(shown.length === 1) return shown[0];
    if(shown.length === 2) return shown.join(' & ');
    // 3+ people: show first 2 + remaining count
    const remaining = people.length - 2;
    return shown.slice(0, 2).join(', ') + ` +${remaining} more`;
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

  function card(item){
    const isPodcast = item.type === 'podcast';
    const isExternalMedia = isPodcast || item.type === 'webinar';
    const media = item.embedUrl
      ? `<div class="update-embed"><iframe src="${item.embedUrl}" title="${item.title}" loading="lazy" allowfullscreen></iframe></div>`
      : `<img src="${ROOT}${(item.image||'').replace(/^\//,'')}" alt="" loading="lazy" onerror="this.parentElement.style.background='var(--navy)'">`;

    if(isPodcast){
      const series = getSeries(item.seriesId);
      const people = series ? (series.people || []) : [];
      const epCount = series ? series.totalEpisodes : 0;
      const peopleStr = peopleLabel(people);
      return `<article class="card update-card podcast-card">
        <div class="card-media">${media}
          <span class="update-type-badge">${TYPE_LABELS.podcast}</span>
          <span class="pc-episodes">${epCount} Episode${epCount!==1?'s':''}</span>
        </div>
        <div class="card-body">
          ${peopleStr ? `<span class="pc-people">${peopleStr}</span>` : ''}
          <h4>${item.title}</h4>
          <p class="pc-excerpt">${item.excerpt||''}</p>
          <span class="pc-updated">Updated ${fmtDate(item.date)}</span>
          <button class="pc-cta" type="button">▶ Listen Now</button>
          <div class="pc-platforms-holder">${platformSelector(item.links)}</div>
        </div>
      </article>`;
    }

    const body = `
      <div class="card-body">
        <span class="tag update-type-badge-inline" style="position:static; background:var(--cream); color:var(--navy); display:inline-block;">${TYPE_LABELS[item.type]||item.type}</span>
        <h4>${item.title}</h4>
        <span class="update-date">${fmtDate(item.date)}</span>
        <p style="margin:0;">${item.excerpt||''}</p>
        ${item.deadline ? `<span class="deadline-flag">Apply by ${fmtDate(item.deadline)}</span>` : ''}
        ${isExternalMedia ? platformButtons(item.links) : ''}
      </div>`;

    if(isExternalMedia){
      return `<article class="card update-card"><div class="card-media">${media}<span class="update-type-badge">${TYPE_LABELS[item.type]}</span></div>${body}</article>`;
    }
    return `<a class="card update-card" href="${ROOT}${(item.link||'#').replace(/^\//,'')}"><div class="card-media">${media}</div>${body}</a>`;
  }

  function platformButtons(links){
    if(!links) return '';
    return `<div class="platform-row">${Object.entries(links).filter(([,url])=>url).map(([key,url]) =>
      `<a class="platform-btn" href="${url}" target="_blank" rel="noopener">${PLATFORM_MAP[key]||key} ↗</a>`).join('')}</div>`;
  }

  function draw(){
    const grid = document.getElementById('updatesGrid');
    const filtered = ALL.filter(i => {
      const matchType = activeType === 'All' || i.type === activeType;
      const matchQuery = !activeQuery || (i.title + i.excerpt).toLowerCase().includes(activeQuery);
      return matchType && matchQuery;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));

    document.getElementById('ddCount').textContent = `${filtered.length} result${filtered.length===1?'':'s'}`;
    grid.innerHTML = filtered.length
      ? filtered.map(card).join('')
      : `<div class="dd-empty">Nothing here yet — check back soon.</div>`;

    grid.querySelectorAll('.pc-cta').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const holder = btn.nextElementSibling;
        const isOpen = holder.classList.contains('pc-platforms-open');
        grid.querySelectorAll('.pc-platforms-holder').forEach(h => h.classList.remove('pc-platforms-open'));
        if(!isOpen) holder.classList.add('pc-platforms-open');
      });
    });
  }

  document.addEventListener('click', (e) => {
    const grid = document.getElementById('updatesGrid');
    if(grid && !e.target.closest('.podcast-card')){
      grid.querySelectorAll('.pc-platforms-holder').forEach(h => h.classList.remove('pc-platforms-open'));
    }
  });

  function wireControls(){
    const types = ['All', ...new Set(ALL.map(i => i.type))];
    const tabWrap = document.getElementById('ddTabs');
    tabWrap.innerHTML = types.map(t => `<button type="button" class="dd-tab${t==='All'?' active':''}" data-type="${t}">${t==='All'?'All':TYPE_LABELS_PLURAL[t]}</button>`).join('');
    tabWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.dd-tab');
      if(!btn) return;
      tabWrap.querySelectorAll('.dd-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeType = btn.dataset.type;
      draw();
    });
    document.getElementById('ddSearch').addEventListener('input', (e) => { activeQuery = e.target.value.trim().toLowerCase(); draw(); });
  }

  async function init(){
    const res = await fetch(ROOT + 'data/updates.json');
    const json = await res.json();
    ALL = json.items;
    if (json.podcastSeries) {
      json.podcastSeries.forEach(s => { PODCAST_SERIES[s.id] = s; });
    }
    wireControls();

    const hash = location.hash.replace('#','');
    const hashMap = { podcasts:'podcast', webinars:'webinar', opportunities:'opportunity', articles:'article', announcements:'announcement' };
    if(hashMap[hash]){
      activeType = hashMap[hash];
      document.querySelectorAll('.dd-tab').forEach(b => b.classList.toggle('active', b.dataset.type === hashMap[hash]));
    }
    draw();
  }

  document.addEventListener('partials:ready', init);
})();
