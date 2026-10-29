/**
 * updates.js
 * Renders the Updates hub from /data/updates.json.
 * Podcasts: one card per SERIES (title, description, people and show-level
 * platform links from podcastSeries; episode count and latest date counted
 * from the episode items).
 * Webinars: upcoming = only the registration form link; past = only the
 * video/recording links.
 * Podcast, webinar and opportunity cards (click anywhere except the button)
 * open a popup. Each popup has its own shareable URL: #<id> where <id> is the
 * item's "id" in updates.json (podcasts: the series id).
 */
(function(){
  const ROOT = document.documentElement.dataset.root || '';
  let ALL = [];
  let PODCAST_SERIES = {};
  let EPISODES = {};                 // seriesId -> episodes, newest first
  let MODALS = Object.create(null);  // modal id -> { kind:'podcast'|'webinar'|'opportunity', ... }
  let activeType = 'All';
  let activeQuery = '';
  let lastSearch = window.location.search;

  /* Image fallback: try data-fb (if present) once, then fall back to navy. */
  const IMG_ONERROR = "if(this.dataset.fb){var f=this.dataset.fb;this.removeAttribute('data-fb');this.src=f}else{this.parentElement.style.background='var(--navy)'}";

  const TYPE_LABELS = { article:'Article', announcement:'Announcement', opportunity:'Opportunity', podcast:'Podcast', webinar:'Webinar' };
  const TYPE_LABELS_PLURAL = { article:'Articles', announcement:'Announcements', opportunity:'Opportunities', podcast:'Podcasts', webinar:'Webinars' };
  const PLATFORM_MAP = { youtube:'YouTube', spotify:'Spotify', applePodcasts:'Apple Podcasts', apple:'Apple Podcasts', zoom:'Recording', form:'Registration form' };

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

  /* A webinar is "upcoming" from today onward (Malawi time); the day of the
     event still counts as upcoming. Date-only strings compare lexically. */
  function webinarStatus(date){
    if(!date) return 'past';
    const d = String(date).slice(0, 10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 'past';
    return d >= malawiTodayStr() ? 'upcoming' : 'past';
  }

  function isExternalUrl(url){
    return /^https?:\/\//i.test(url || '');
  }

  /* Opportunity apply link: external URLs as-is, internal ones relative to
     the site root (works on sub-folder hosting too). */
  function applyUrlFor(item){
    const link = item.link || 'contact.html';
    return isExternalUrl(link) ? link : ROOT + String(link).replace(/^\//, '');
  }

  /* Single source of truth (MG): articles live in data/articles.json.
     Convert one article record into the card-item shape the renderer
     expects. Pure. */
  function articleToCardItem(rec){
    if(!rec) return null;
    return {
      type: 'article',
      id: rec.id,
      title: rec.title,
      excerpt: rec.excerpt,
      image: rec.mainImage && rec.mainImage.src,
      date: rec.date
    };
  }

  /* Merge updates items + article records into one feed. Stale type:article
     items in updates.json are skipped with a warning (articles belong in
     data/articles.json); draft records are excluded from the feed (their
     detail pages still work — nothing here filters those). Pure. */
  function mergeFeed(updatesItems, articleRecords){
    const list = Array.isArray(updatesItems) ? updatesItems : [];
    const arts = Array.isArray(articleRecords) ? articleRecords : [];
    const out = [];
    for(const it of list){
      if(it && it.type === 'article'){
        console.warn('[updates] skipping type:"article" item in data/updates.json — articles belong in data/articles.json.', it.title || it);
        continue;
      }
      out.push(it);
    }
    for(const rec of arts){
      if(rec && rec.draft === true) continue;
      const card = articleToCardItem(rec);
      if(card) out.push(card);
    }
    return out;
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

  /* One submenu anchor: real link, icon left of label, no arrow glyph.
     Empty verb → aria-label is just the label (e.g. "Registration form"). */
  function submenuBtn(key, url, verb, label){
    const text = label || PLATFORM_MAP[key] || PLATFORM_MAP[String(key).toLowerCase()] || key;
    const ext = isExternalUrl(url);
    const aria = verb ? `${verb} on ${text}` : text;
    return `<a class="pc-platform-btn" href="${url}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''} aria-label="${aria}">${platformIcon(key, url)}<span>${text}</span></a>`;
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

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function imgSrc(p){
    return p ? ROOT + String(p).replace(/^\//, '') : '';
  }
  function slugify(s){
    return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  }

  /* ---------- Webinar links: upcoming = form only, past = video only ---------- */
  function isFormLink(key, url){
    if(/^(form|register|registration|rsvp|signup)$/i.test(String(key || ''))) return true;
    return /docs\.google\.com\/forms|forms\.gle|eventbrite\./i.test(String(url || ''));
  }
  function webinarEntries(item){
    const entries = Object.entries(item.links || {}).filter(([, url]) => url);
    if(webinarStatus(item.date) === 'upcoming'){
      return entries.filter(([k, u]) => isFormLink(k, u));
    }
    return entries.filter(([k, u]) => !isFormLink(k, u));
  }
  function webinarVerb(item){
    return webinarStatus(item.date) === 'upcoming' ? '' : 'Watch';
  }
  function webinarGroup(item, entries){
    const verb = webinarVerb(item);
    return `<div class="pc-platforms" data-count="${entries.length}">${entries.map(([k, u]) => submenuBtn(k, u, verb)).join('')}</div>`;
  }

  /* Build the feed: ONE card per podcast series (count and latest date come
     from the episodes); webinars and opportunities get a popup id taken from
     their own "id" in updates.json (falls back to a slug of the title, with a
     console warning). Episodes with an unknown seriesId are not shown
     (warned); a series with no episodes is hidden. */
  function buildFeed(items){
    EPISODES = {};
    MODALS = Object.create(null);
    const rest = [];
    const usedIds = {};

    function claimId(it){
      let id = it.id ? String(it.id) : slugify(it.title);
      if(!it.id){
        console.warn('[updates] "' + (it.title || 'untitled') + '" has no "id" in updates.json; using "' + id + '" for its popup URL. Add an "id" to keep the link stable.');
      }
      if(usedIds[id]){
        console.warn('[updates] duplicate id "' + id + '" in updates.json — ids must be unique.');
        usedIds[id] += 1;
        id = id + '-' + usedIds[id];
      } else {
        usedIds[id] = 1;
      }
      return id;
    }

    items.forEach(it => {
      if(it && it.type === 'podcast'){
        (EPISODES[it.seriesId] = EPISODES[it.seriesId] || []).push(it);
      } else if(it && (it.type === 'webinar' || it.type === 'opportunity')){
        const id = claimId(it);
        it.modalId = id;
        MODALS[id] = { kind: it.type, item: it };
        rest.push(it);
      } else {
        rest.push(it);
      }
    });
    Object.keys(EPISODES).forEach(id => {
      EPISODES[id].sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || '')) ||
        (b.episodeNumber || 0) - (a.episodeNumber || 0));
      if(!PODCAST_SERIES[id]){
        console.warn('[updates] podcast episode(s) with unknown seriesId "' + id + '" are not shown.', EPISODES[id]);
      }
    });
    Object.values(PODCAST_SERIES).forEach(s => {
      const eps = EPISODES[s.id] || [];
      if(!eps.length) return;
      const latest = eps[0];
      const modalId = claimId({ id: s.id, title: s.title });
      MODALS[modalId] = { kind: 'podcast', seriesId: s.id };
      rest.push({
        type: 'podcast',
        seriesId: s.id,
        modalId: modalId,
        title: s.title,
        excerpt: s.description || '',
        image: s.coverArt || latest.image,
        fallbackImage: latest.image,
        imagePosition: s.imagePosition || '',
        date: latest.date,
        links: s.links,
        searchText: [(s.people || []).join(' ')].concat(eps.map(e => (e.title || '') + ' ' + (e.excerpt || ''))).join(' ')
      });
    });
    return rest;
  }

  /* ---------- Popup (podcast series, webinar, opportunity) with shareable URL hash ---------- */
  let modalEl = null;
  let modalId = null;
  let modalPushed = false;
  let modalReturnFocus = null;

  function modalURL(id){
    return window.location.pathname + window.location.search + (id ? '#' + encodeURIComponent(id) : '');
  }
  function hashId(){
    let h = (window.location.hash || '').replace(/^#/, '');
    try { h = decodeURIComponent(h); } catch(err){}
    return h;
  }

  function modalLinks(links, verb){
    if(!links) return '';
    const entries = Object.entries(links).filter(([, url]) => url);
    if(!entries.length) return '';
    return `<div class="pcm-links">${entries.map(([key, url]) => submenuBtn(key, url, verb)).join('')}</div>`;
  }

  /* Episode row: no thumbnail, all available platform pills as compact
     "Listen" buttons. Keeps the row scannable in the split-view layout. */
  function episodeRow(ep){
    const num = ep.episodeNumber ? `<span class="pcm-ep-num">Episode ${esc(ep.episodeNumber)}</span>` : '';
    const entries = Object.entries(ep.links || {}).filter(([, url]) => url);
    const pills = entries.length
      ? `<div class="pcm-ep-links">${entries.map(([k, u]) => submenuBtn(k, u, 'Listen')).join('')}</div>`
      : '';
    return `<li class="pcm-episode">
      <div class="pcm-ep-body">
        <div class="pcm-ep-meta">${num}<span class="pcm-ep-date">${fmtUpdateDate(ep.date)}</span></div>
        <h4>${ep.title}</h4>
        ${ep.excerpt ? `<p>${ep.excerpt}</p>` : ''}
        ${pills}
      </div>
    </li>`;
  }

  function podcastModalHtml(series){
    const eps = EPISODES[series.id] || [];
    const latest = eps[0];
    const cover = series.coverArt || (latest && latest.image) || '';
    const fb = latest && latest.image ? imgSrc(latest.image) : '';
    const people = peopleLabel(series.people);
    const metaBits = [`${eps.length} episode${eps.length !== 1 ? 's' : ''}`];
    if(latest) metaBits.push('Latest: ' + fmtUpdateDate(latest.date));
    const showLinks = modalLinks(series.links, 'Listen');
    return `
      <header class="pcm-head">
        <div class="pcm-cover"><img src="${imgSrc(cover)}"${fb ? ` data-fb="${esc(fb)}"` : ''} alt="" onerror="${IMG_ONERROR}"></div>
        <div class="pcm-info">
          <p class="pcm-kicker">Podcast</p>
          <h2 id="pcmTitle">${series.title}</h2>
          ${people ? `<span class="pc-people">${people}</span>` : ''}
          <p class="pcm-meta">${metaBits.join(' · ')}</p>
          ${series.description ? `<p class="pcm-desc">${series.description}</p>` : ''}
          ${showLinks ? `<p class="pcm-links-label">Listen to the full podcast</p>${showLinks}` : ''}
        </div>
      </header>
      <section class="pcm-episodes" aria-label="Episodes">
        <h3>All episodes</h3>
        <ul>${eps.map(episodeRow).join('')}</ul>
      </section>`;
  }

  /* Shared layout for webinar + opportunity popups (portrait image). */
  function posterModalHtml(o){
    return `
      <header class="pcm-head">
        <div class="pcm-cover pcm-cover--portrait"><img src="${imgSrc(o.image)}" alt="" onerror="${IMG_ONERROR}"></div>
        <div class="pcm-info">
          <p class="pcm-kicker">${o.kicker}</p>
          <h2 id="pcmTitle">${o.title}</h2>
          ${o.meta ? `<p class="pcm-meta">${o.meta}</p>` : ''}
          ${o.desc ? `<p class="pcm-desc">${o.desc}</p>` : ''}
          ${o.linksHtml}
        </div>
      </header>${o.embed || ''}`;
  }

  function webinarModalHtml(item){
    const upcoming = webinarStatus(item.date) === 'upcoming';
    const entries = webinarEntries(item);
    const time = item.time ? ` • ${esc(item.time)}` : '';
    const verb = webinarVerb(item);
    const linksHtml = entries.length
      ? `<p class="pcm-links-label">${upcoming ? 'Register for this webinar' : 'Watch the recording'}</p><div class="pcm-links">${entries.map(([k, u]) => submenuBtn(k, u, verb)).join('')}</div>`
      : `<p class="pcm-note">${upcoming ? 'Registration details coming soon.' : 'The recording will be available here soon.'}</p>`;
    const embed = (!upcoming && item.embedUrl)
      ? `<div class="pcm-embed"><iframe src="${esc(item.embedUrl)}" title="${esc(item.title)}" loading="lazy" allowfullscreen></iframe></div>`
      : '';
    return posterModalHtml({
      kicker: upcoming ? 'Upcoming webinar' : 'Webinar',
      title: item.title,
      meta: upcoming ? `Live: ${fmtUpdateDate(item.date)}${time}` : fmtUpdateDate(item.date),
      desc: item.excerpt,
      image: item.image,
      linksHtml,
      embed
    });
  }

  function opportunityModalHtml(item){
    const st = deadlineStatus(item.deadline);
    const closed = st === 'closed';
    let meta = '';
    if(closed) meta = `Applications closed on ${fmtUpdateDate(item.deadline)}`;
    else if(st === 'today') meta = 'Closes today';
    else if(item.deadline) meta = `Apply by ${fmtUpdateDate(item.deadline)}`;
    const applyUrl = applyUrlFor(item);
    const applyLabel = isExternalUrl(applyUrl) ? 'Application form' : 'Contact us';
    const linksHtml = closed
      ? `<p class="pcm-note">This opportunity is now closed.</p>`
      : `<p class="pcm-links-label">Apply for this opportunity</p><div class="pcm-links">${submenuBtn('link', applyUrl, 'Apply', applyLabel)}</div>`;
    return posterModalHtml({
      kicker: closed ? 'Opportunity · Closed' : 'Opportunity',
      title: item.title,
      meta,
      desc: item.excerpt,
      image: item.image,
      linksHtml
    });
  }

  function modalKeydown(e){
    if(!modalEl) return;
    if(e.key === 'Escape'){ e.preventDefault(); dismissModal(); return; }
    if(e.key !== 'Tab') return;
    const f = Array.from(modalEl.querySelectorAll('a[href], button:not([disabled])')).filter(n => n.offsetParent !== null);
    if(!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if(!modalEl.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
    else if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  /* Removes the popup from the page only (no URL changes). */
  function closeModalDom(skipFocus){
    if(!modalEl) return;
    document.removeEventListener('keydown', modalKeydown);
    modalEl.remove();
    modalEl = null;
    modalId = null;
    modalPushed = false;
    document.body.classList.remove('pcm-open');
    if(!skipFocus && modalReturnFocus && document.contains(modalReturnFocus)){
      try { modalReturnFocus.focus({ preventScroll: true }); } catch(err){}
    }
    modalReturnFocus = null;
  }

  /* User-initiated close (×, backdrop, Escape): if we pushed a history entry
     when opening, go back (popstate then removes the popup); otherwise just
     close and drop the hash. */
  function dismissModal(){
    if(!modalEl) return;
    if(modalPushed){
      modalPushed = false;
      try { window.history.back(); return; } catch(err){}
    }
    closeModalDom();
    try { window.history.replaceState({ updates: true }, '', modalURL('')); } catch(err){}
  }

  function mountModal(innerHtml, id, triggerEl, fromURL, kind){
    closeModalDom(true);
    modalReturnFocus = triggerEl || document.activeElement;
    const kindClass = kind === 'podcast'
      ? ' pcm--podcast'
      : (kind === 'webinar' || kind === 'opportunity')
        ? ' pcm--tall'
        : '';
    const el = document.createElement('div');
    el.className = 'pcm-backdrop';
    el.innerHTML = `
      <div class="pcm${kindClass}" role="dialog" aria-modal="true" aria-labelledby="pcmTitle" tabindex="-1">
        <button type="button" class="pcm-close" aria-label="Close">×</button>
        <div class="pcm-scroll">${innerHtml}</div>
      </div>`;
    el.addEventListener('click', (e) => {
      if(e.target === el || e.target.closest('.pcm-close')) dismissModal();
    });
    document.body.appendChild(el);
    document.body.classList.add('pcm-open');
    modalEl = el;
    modalId = id;
    document.addEventListener('keydown', modalKeydown);
    if(!fromURL){
      try {
        window.history.pushState({ updates: true, modal: id }, '', modalURL(id));
        modalPushed = true;
      } catch(err){ modalPushed = false; }
    }
    const closeBtn = el.querySelector('.pcm-close');
    if(closeBtn) closeBtn.focus();
  }

  function openModal(id, triggerEl, fromURL){
    const entry = MODALS[id];
    if(!entry) return;
    let html = '';
    if(entry.kind === 'podcast'){
      const series = getSeries(entry.seriesId);
      if(!series) return;
      html = podcastModalHtml(series);
    } else if(entry.kind === 'webinar'){
      html = webinarModalHtml(entry.item);
    } else if(entry.kind === 'opportunity'){
      html = opportunityModalHtml(entry.item);
    } else {
      return;
    }
    mountModal(html, id, triggerEl, !!fromURL, entry.kind);
  }

  /* Open/close the popup to match the URL hash (deep links, back/forward). */
  function syncModalFromURL(){
    const id = hashId();
    if(id && MODALS[id]){
      if(modalId !== id) openModal(id, null, true);
    } else if(modalEl){
      closeModalDom();
    }
  }

  function card(item, index){
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const holderId = `up-links-${index}`;
    const isPodcast = item.type === 'podcast';
    const media = item.embedUrl
      ? `<div class="update-embed"><iframe src="${item.embedUrl}" title="${item.title}" loading="lazy" allowfullscreen></iframe></div>`
      : `<img src="${ROOT}${(item.image||'').replace(/^\//,'')}" alt="" loading="lazy"${item.imagePosition ? ` style="object-position:${item.imagePosition}"` : ''}${item.fallbackImage ? ` data-fb="${ROOT}${item.fallbackImage.replace(/^\//,'')}"` : ''} onerror="${IMG_ONERROR}">`;

    let badges = `<span class="update-type-badge">${typeLabel}</span>`;
    let byline = '';
    let deadlineHtml = '';
    let ctaInner = '';
    let holder = '';
    const modalAttr = item.modalId ? ` data-modal-id="${esc(item.modalId)}" aria-haspopup="dialog"` : '';
    const emptyCta = `<div class="update-cta--empty" aria-hidden="true"><span class="pc-cta" style="visibility:hidden">Read Now</span></div>`;

    if(isPodcast){
      const series = getSeries(item.seriesId);
      const people = series ? (series.people || []) : [];
      const epCount = (EPISODES[item.seriesId] || []).length;
      const peopleStr = peopleLabel(people);
      badges += `<span class="pc-episodes">${epCount} Episode${epCount!==1?'s':''}</span>`;
      if(peopleStr) byline = `<span class="pc-people">${peopleStr}</span>`;
      ctaInner = revealOpener('▶ Listen Now', holderId);
      holder = `<div class="pc-platforms-holder" id="${holderId}" hidden>${platformSelector(item.links, 'Listen')}</div>`;
    } else if(item.type === 'webinar'){
      const upcoming = webinarStatus(item.date) === 'upcoming';
      const wEntries = webinarEntries(item);
      if(upcoming){
        badges += `<span class="update-status-badge update-status-upcoming">Upcoming</span>`;
        const time = item.time ? ` • ${esc(item.time)}` : '';
        deadlineHtml = `<span class="webinar-schedule">Live: ${fmtUpdateDate(item.date)}${time}</span>`;
      }
      if(wEntries.length){
        ctaInner = revealOpener(upcoming ? 'Register Now' : '▶ Watch Now', holderId);
        holder = `<div class="pc-platforms-holder" id="${holderId}" hidden>${webinarGroup(item, wEntries)}</div>`;
      } else {
        ctaInner = emptyCta;
      }
    } else if(item.type === 'opportunity'){
      const st = deadlineStatus(item.deadline);
      if(st === 'closed'){
        deadlineHtml = `<span class="deadline-flag">Applications closed on ${fmtUpdateDate(item.deadline)}</span>`;
        ctaInner = `<button class="pc-cta" type="button" disabled aria-disabled="true">Applications closed</button>`;
      } else {
        if(st === 'today') deadlineHtml = `<span class="deadline-flag">Closes today</span>`;
        else if(item.deadline) deadlineHtml = `<span class="deadline-flag">Apply by ${fmtUpdateDate(item.deadline)}</span>`;
        const applyUrl = applyUrlFor(item);
        const applyLabel = isExternalUrl(applyUrl) ? 'Application form' : 'Contact us';
        ctaInner = revealOpener('Apply Now', holderId);
        holder = `<div class="pc-platforms-holder" id="${holderId}" hidden><div class="pc-platforms" data-count="1">${submenuBtn('link', applyUrl, 'Apply', applyLabel)}</div></div>`;
      }
      if(st === 'closed') badges += `<span class="update-closed-badge">Closed</span>`;
    } else if(item.type === 'article'){
      if(item.id){
        ctaInner = `<a class="pc-cta" href="${ROOT}article.html?id=${item.id}">Read Now</a>`;
      } else {
        ctaInner = emptyCta;
      }
    } else {
      if(item.link){
        const href = isExternalUrl(item.link) ? item.link : (ROOT + item.link.replace(/^\//,''));
        ctaInner = `<a class="pc-cta" href="${href}"${linkTargetAttrs(item.link)}>Read Now</a>`;
      } else {
        ctaInner = emptyCta;
      }
    }

    return `<article class="card update-card${isPodcast ? ' podcast-card' : ''}"${modalAttr}>
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

  /* Card-level action (UC): podcast, webinar and opportunity cards open their
     popup; other cards reuse their own main control — the Read Now link for
     articles. Linkless cards deliberately do nothing. */
  function triggerCardAction(cardEl){
    if(!cardEl) return;
    const mid = cardEl.getAttribute('data-modal-id');
    if(mid){
      restoreSwap(cardEl, false);
      openModal(mid, cardEl, false);
      return;
    }
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
      const matchQuery = !activeQuery || ((i.title || '') + ' ' + (i.excerpt || '') + ' ' + (i.searchText || '')).toLowerCase().includes(activeQuery);
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
    lastSearch = query ? '?' + query : '';
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

    /* UC: only actionable cards are focusable — popup cards, toggle mains and
       Read Now links qualify; spacer cards never match. */
    grid.querySelectorAll('.update-card').forEach(cardEl => {
      if(cardEl.hasAttribute('data-modal-id') || cardEl.querySelector('.pc-cta[aria-expanded], a.pc-cta[href]')){
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

    /* Back/forward: redraw only when the filters/sort/page (query string)
       changed; a popup opening or closing only changes the hash, so the
       grid is left alone. */
    window.addEventListener('popstate', () => {
      if(window.location.search !== lastSearch){
        lastSearch = window.location.search;
        readURL();
        syncControls();
        draw();
      }
      syncModalFromURL();
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
    /* Fetch both feeds in parallel; each file fails independently. */
    const [upSettled, artSettled] = await Promise.allSettled([
      fetch(ROOT + 'data/updates.json'),
      fetch(ROOT + 'data/articles.json')
    ]);
    let json = null;
    if(upSettled.status === 'fulfilled'){
      try {
        if(!upSettled.value.ok) throw new Error(`HTTP ${upSettled.value.status}`);
        json = await upSettled.value.json();
      } catch(err) {
        console.warn('[updates] could not load data/updates.json — catalogue unavailable.', err);
        json = null;
      }
    } else {
      console.warn('[updates] could not load data/updates.json — catalogue unavailable.', upSettled.reason);
    }
    if(!json || !Array.isArray(json.items)){
      const grid = document.getElementById('updatesGrid');
      if(grid) grid.innerHTML = `<div class="dd-empty"><p>Updates are unavailable right now. Please try again later.</p></div>`;
      const countEl = document.getElementById('ddCount');
      if(countEl) countEl.textContent = '0 results';
      return;
    }
    ALL = json.items;
    if (json.podcastSeries) {
      json.podcastSeries.forEach(s => { PODCAST_SERIES[s.id] = s; });
    }
    let articleRecords = [];
    if(artSettled.status === 'fulfilled'){
      try {
        if(!artSettled.value.ok) throw new Error(`HTTP ${artSettled.value.status}`);
        const artJson = await artSettled.value.json();
        if(Array.isArray(artJson.articles)) articleRecords = artJson.articles;
      } catch(err) {
        console.warn('[updates] could not load data/articles.json — showing updates.json items only.', err);
      }
    } else {
      console.warn('[updates] could not load data/articles.json — showing updates.json items only.', artSettled.reason);
    }
    ALL = mergeFeed(ALL, articleRecords);
    ALL = buildFeed(ALL);
    const fromURL = readURL();
    lastSearch = window.location.search;
    wireControls();
    syncControls();
    draw();
    if(fromURL === 'query'){
      /* Normalise invalid values (e.g. ?page beyond the last page). */
      writeURL('replace');
      smoothScrollTo(document.querySelector('.updates-toolbar'));
    }
    /* Deep link: #<id> opens that item's popup on load. */
    syncModalFromURL();
  }

  document.addEventListener('partials:ready', init);

  /* Test hook for the updates harness: exposes the render helpers so a
     test page can build cards through the real code path. */
  try {
    window.__updates = {
      card, submenuGroup, platformSelector, platformButtons, submenuBtn, platformIcon,
      triggerCardAction, restoreSwap, articleToCardItem, mergeFeed,
      openModal, dismissModal, buildFeed, buildPodcastFeed: buildFeed, webinarStatus, webinarEntries,
      openSeriesModal: (seriesId, el) => {
        const key = Object.keys(MODALS).find(k => MODALS[k].kind === 'podcast' && MODALS[k].seriesId === seriesId);
        if(key) openModal(key, el, false);
      },
      closeSeriesModal: dismissModal
    };
  } catch(err) {}
})();