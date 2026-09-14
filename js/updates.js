/**
 * updates.js
 * Renders the Updates hub from /data/updates.json. Podcasts and webinars are
 * never hosted here — the card either shows an optional embedded preview
 * (a YouTube/Spotify embed link) or simply links out to wherever the real
 * episode/recording lives.
 */
(function(){
  const ROOT = document.documentElement.dataset.root || '';
  let ALL = [];
  let PODCAST_SERIES = {};
  let activeType = 'All';
  let activeQuery = '';

  const TYPE_LABELS = { article:'Article', announcement:'Announcement', opportunity:'Opportunity', podcast:'Podcast', webinar:'Webinar' };
  const TYPE_LABELS_PLURAL = { article:'Articles', announcement:'Announcements', opportunity:'Opportunities', podcast:'Podcasts', webinar:'Webinars' };

  function fmtDate(d){
    if(!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }

  function platformButtons(links){
    if(!links) return '';
    const map = { youtube:'YouTube', spotify:'Spotify', applePodcasts:'Apple Podcasts', zoom:'Recording' };
    return `<div class="platform-row">${Object.entries(links).filter(([,url])=>url).map(([key,url]) =>
      `<a class="platform-btn" href="${url}" target="_blank" rel="noopener">${map[key]||key} ↗</a>`).join('')}</div>`;
  }

  function getSeries(seriesId){
    return PODCAST_SERIES[seriesId];
  }

  function card(item){
    const isExternalMedia = item.type === 'podcast' || item.type === 'webinar';
    const media = item.embedUrl
      ? `<div class="update-embed"><iframe src="${item.embedUrl}" title="${item.title}" loading="lazy" allowfullscreen></iframe></div>`
      : `<img src="${ROOT}${(item.image||'').replace(/^\//,'')}" alt="" loading="lazy" onerror="this.parentElement.style.background='var(--navy)'">`;

    let body = '';
    if (item.type === 'podcast' && item.seriesId) {
      const series = getSeries(item.seriesId);
      body = `
        <div class="card-body">
          <span class="tag update-type-badge-inline" style="position:static; background:var(--cream); color:var(--navy); display:inline-block;">
            ${series ? series.title + ` • ${series.totalEpisodes} episodes` : 'Podcast'}
          </span>
          ${item.episodeNumber ? `<span class="tag" style="background:var(--gold); color:var(--navy-deep); font-size:.7rem; margin-left:.5rem;">Ep ${item.episodeNumber}</span>` : ''}
          <h4>${item.title}</h4>
          <span class="update-date">${fmtDate(item.date)}${item.duration ? ` • ${item.duration}` : ''}</span>
          <p style="margin:0;">${item.excerpt||''}</p>
          ${platformButtons(item.links)}
        </div>`;
    } else {
      body = `
        <div class="card-body">
          <span class="tag update-type-badge-inline" style="position:static; background:var(--cream); color:var(--navy); display:inline-block;">${TYPE_LABELS[item.type]||item.type}</span>
          <h4>${item.title}</h4>
          <span class="update-date">${fmtDate(item.date)}</span>
          <p style="margin:0;">${item.excerpt||''}</p>
          ${item.deadline ? `<span class="deadline-flag">Apply by ${fmtDate(item.deadline)}</span>` : ''}
          ${isExternalMedia ? platformButtons(item.links) : ''}
        </div>`;
    }

    if(isExternalMedia){
      return `<article class="card update-card"><div class="card-media">${media}<span class="update-type-badge">${TYPE_LABELS[item.type]}</span></div>${body}</article>`;
    }
    return `<a class="card update-card" href="${ROOT}${(item.link||'#').replace(/^\//,'')}"><div class="card-media">${media}</div>${body}</a>`;
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
  }

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

    // deep-link support: /updates/index.html#podcasts jumps + filters
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