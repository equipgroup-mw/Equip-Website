/**
 * data-division.js
 * Turns /data/data-division.json into a filterable, searchable catalogue:
 * HD visuals (lightbox), interactive charts (Chart.js, drawn from raw numbers
 * — no image needed), embedded dashboards (Power BI / Tableau / any iframe
 * embed link), and article cards. Everything here is driven entirely by the
 * JSON file — no code changes needed to publish new work.
 */
(function(){
  const ROOT = document.documentElement.dataset.root || '';
  let ALL_ITEMS = [];
  let activeCategory = 'All';
  let activeQuery = '';
  let chartInstances = [];

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardShell(item, innerHtml, extraClass){
    return `
      <article class="dd-card ${extraClass||''}" data-sector="${esc(item.sector||'')}" data-item-id="${esc(item.id)}" role="button" tabindex="0" aria-label="Open details: ${esc(item.title)}">
        <div class="dd-card-media">${innerHtml}</div>
        <div class="card-body">
          <span class="tag">${item.category}</span>
          <h4>${item.title}</h4>
          <p style="margin:0;">${item.description||''}</p>
          ${item.sector ? `<span style="font-size:.8rem; color:var(--gold); font-weight:700;">${item.sector}</span>` : ''}
        </div>
      </article>`;
  }

  function renderImageCard(item){
    return cardShell(item, `<img src="${ROOT}${item.image.replace(/^\//,'')}" alt="${esc(item.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'dd-fallback\\'>Visual coming soon</div>'">`, 'is-clickable');
  }

  function renderChartCard(item, index){
    const canvasId = `chart-${item.id}-${index}`;
    return cardShell(item, `<canvas id="${canvasId}" width="400" height="300" role="img" aria-label="${item.title}"></canvas>`, '');
  }

  function renderDashboardCard(item){
    return cardShell(item, `
      <div class="dd-dashboard-frame" style="position:relative; width:100%; height:100%;">
        <iframe src="${item.embedUrl}" title="${esc(item.title)}" loading="lazy" tabindex="-1" aria-hidden="true" style="width:100%; height:100%; border:0; pointer-events:none;"></iframe>
        <span class="dd-provider">${item.provider||'Dashboard'}</span>
      </div>`, '');
  }

  function renderArticleCard(item){
    return `
      <article class="dd-card" data-sector="${esc(item.sector||'')}" data-item-id="${esc(item.id)}" role="button" tabindex="0" aria-label="Open details: ${esc(item.title)}">
        <div class="dd-card-media"><div class="dd-fallback" style="background:var(--teal); color:#fff;">Read the article →</div></div>
        <div class="card-body">
          <span class="tag">${item.category}</span>
          <h4>${item.title}</h4>
          <p style="margin:0;">${item.description||''}</p>
        </div>
      </article>`;
  }

  function draw(){
    const grid = document.getElementById('ddGrid');
    const filtered = ALL_ITEMS.filter(item => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchQuery = !activeQuery || (item.title + item.description + (item.sector||'')).toLowerCase().includes(activeQuery);
      return matchCat && matchQuery;
    });

    document.getElementById('ddCount').textContent = `${filtered.length} result${filtered.length===1?'':'s'}`;

    if(!filtered.length){
      grid.innerHTML = `<div class="dd-empty">Nothing matches yet — try a different filter or search term.</div>`;
      return;
    }

    grid.innerHTML = filtered.map((item, i) => {
      if(item.type === 'image') return renderImageCard(item);
      if(item.type === 'chart') return renderChartCard(item, i);
      if(item.type === 'dashboard') return renderDashboardCard(item);
      if(item.type === 'article') return renderArticleCard(item);
      return '';
    }).join('');

    // Destroy old chart instances
    chartInstances.forEach(chart => chart.destroy());
    chartInstances = [];

    // draw charts after they exist in the DOM
    filtered.forEach((item, i) => {
      if(item.type !== 'chart') return;
      const ctx = document.getElementById(`chart-${item.id}-${i}`);
      if(!ctx || !window.Chart) return;
      const chartConfig = buildChartConfig(item, 'card');
      const chart = new Chart(ctx, chartConfig);
      chartInstances.push(chart);
    });

    wireLightbox();
  }

  function buildChartConfig(item, context) {
    const isModal = context === 'modal';
    const tickSize = isModal ? 14 : 11;
    const legendSize = isModal ? 13 : 11;
    const palette = ['#0F2038','#B9954A','#7A2331','#545A34','#16333B','#8A93A6'];
    const baseConfig = {
      type: item.chartType || 'bar',
      data: {
        labels: item.labels,
        datasets: item.series.map((s, si) => ({
          label: s.name,
          data: s.data,
          backgroundColor: item.chartType === 'bar' ? palette[0] : item.labels.map((_,li)=>palette[li % palette.length]),
          borderColor: palette[0],
          borderWidth: item.chartType === 'line' ? 2 : 0,
          fill: item.chartType === 'line' ? false : true,
          tension: 0.3
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isModal ? (Array.isArray(item.series) && item.series.length > 1) : item.chartType !== 'bar',
            labels: { boxWidth: 10, font: { family: 'Public Sans', size: legendSize } }
          },
          tooltip: {
            backgroundColor: 'rgba(13,33,54,0.9)',
            titleFont: { family: 'Public Sans', size: isModal ? 14 : 12 },
            bodyFont: { family: 'Public Sans', size: isModal ? 14 : 11 },
            padding: 10,
            cornerRadius: 4
          }
        },
        scales: {
          x: {
            border: { display: false },
            grid: {
              display: false,
              drawBorder: false,
              drawOnChartArea: false
            },
            ticks: { font: { family: 'Public Sans', size: tickSize }, color: '#666', maxRotation: 0, autoSkip: true, padding: 8 }
          },
          y: {
            border: { display: false },
            grid: {
              color: '#eee',
              drawBorder: false,
              drawOnChartArea: true,
              drawTicks: false
            },
            ticks: {
              font: { family: 'Public Sans', size: tickSize },
              color: '#666',
              padding: 8,
              callback: function(value) { return value >= 1000 ? (value/1000).toFixed(0)+'k' : value; }
            },
            beginAtZero: true
          }
        },
        layout: {
          padding: { left: 0, right: 0, top: 8, bottom: 0 }
        },
        interaction: { intersect: false, mode: 'index' },
        animation: (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          ? false
          : { duration: 750, easing: 'easeOutQuart' }
      }
    };

    if (item.chartType === 'pie' || item.chartType === 'doughnut') {
      baseConfig.options.scales = {};
      baseConfig.options.cutout = '65%';
      baseConfig.options.plugins.legend.position = 'bottom';
      baseConfig.options.plugins.legend.labels.padding = 16;
      baseConfig.options.plugins.legend.labels.usePointStyle = true;
    }

    return baseConfig;
  }

  function wireLightbox(){
    document.querySelectorAll('[data-lightbox]').forEach(img => {
      img.addEventListener('click', () => {
        const modal = document.getElementById('ddLightbox');
        modal.querySelector('img').src = img.dataset.lightbox;
        modal.querySelector('figcaption').textContent = img.dataset.caption;
        modal.classList.add('open');
      });
    });
  }

  function wireLightboxClose(){
    const modal = document.getElementById('ddLightbox');
    if(!modal) return;
    modal.querySelector('.dd-lightbox-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') modal.classList.remove('open'); });
  }

  /* ------------------------------------------------------------------ */
  /* Detail modal: opens any portal card in a 90%-viewport window        */
  /* ------------------------------------------------------------------ */
  let modalEl = null;
  let modalChart = null;
  let modalOpenId = null;
  let modalOpener = null;
  let modalFocusTimer = null;
  let suppressHashChange = false;
  let prevBodyOverflow = '';
  let prevBodyPaddingRight = '';

  function isPlaceholderUrl(url){
    return !url || /REPLACE_WITH/i.test(url);
  }

  function isRealUrl(url){
    return !!url && /^https?:\/\//i.test(url);
  }

  function isExternalUrl(url){
    return /^https?:\/\//i.test(url || '');
  }

  function modalArticleHref(item){
    if(!item.link || item.link === '#') return null;
    const href = item.link;
    if(isExternalUrl(href)) return { href, external: true };
    return { href: ROOT + href.replace(/^\//, ''), external: false };
  }

  function ensureModal(){
    if(modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'dd-modal';
    modalEl.id = 'ddDetailModal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'ddDetailTitle');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="dd-modal__backdrop" data-dd-close></div>
      <div class="dd-modal__window" role="document">
        <button type="button" class="dd-modal__close" data-dd-close aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="dd-modal__visual" id="ddDetailVisual"></div>
        <div class="dd-modal__details" id="ddDetailDetails"></div>
      </div>`;
    document.body.appendChild(modalEl);
    modalEl.querySelector('.dd-modal__backdrop').addEventListener('click', () => closeDetail());
    modalEl.querySelector('.dd-modal__close').addEventListener('click', () => closeDetail());
    modalEl.addEventListener('keydown', trapModalTab);
    return modalEl;
  }

  function modalVisualHtml(item){
    const visualClass = item.type === 'chart' ? ' dd-modal__visual--chart'
      : item.type === 'article' ? ' dd-modal__visual--article' : '';
    let inner = '';
    if(item.type === 'chart'){
      const hasData = Array.isArray(item.labels) && item.labels.length
        && Array.isArray(item.series) && item.series.length
        && item.series.some(s => Array.isArray(s.data) && s.data.length);
      inner = hasData
        ? `<div class="dd-modal__chart-wrap"><canvas id="ddDetailChart" role="img" aria-label="${esc(item.title)}"></canvas></div>`
        : `<div class="dd-fallback">Visual coming soon</div>`;
    } else if(item.type === 'image'){
      inner = item.image
        ? `<img src="${ROOT}${String(item.image).replace(/^\//, '')}" alt="${esc(item.title)}" loading="lazy">`
        : `<div class="dd-fallback">Visual coming soon</div>`;
    } else if(item.type === 'dashboard'){
      if(isPlaceholderUrl(item.embedUrl)){
        inner = `<div class="dd-fallback">Dashboard coming soon</div>`;
      } else {
        inner = `
          <div class="dd-modal__loading" data-dd-loading>Loading dashboard&hellip;</div>
          <iframe src="${esc(item.embedUrl)}" title="${esc(item.title)} — embedded dashboard" loading="lazy" style="width:100%; height:100%; border:0;"></iframe>
          <div class="dd-modal__embed-fallback" data-dd-embed-fallback hidden>
            <p>This dashboard could not be displayed here.</p>
            <a href="${esc(item.embedUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold">Open in new tab</a>
          </div>`;
      }
    } else if(item.type === 'article'){
      inner = `<h3>${item.title}</h3>`;
    } else {
      inner = `<div class="dd-fallback">Visual coming soon</div>`;
    }
    return { cls: visualClass, inner };
  }

  function modalTableHtml(item){
    if(item.type !== 'chart') return '';
    if(!Array.isArray(item.labels) || !item.labels.length) return '';
    if(!Array.isArray(item.series) || !item.series.length) return '';
    const multi = item.series.length > 1;
    const unit = item.unit ? ` <span style="font-weight:400;">(${esc(item.unit)})</span>` : '';
    let head = multi
      ? `<tr><th scope="col">Label</th>${item.series.map(s => `<th scope="col" style="text-align:right;">${esc(s.name)}</th>`).join('')}</tr>`
      : `<tr><th scope="col">Label</th><th scope="col" style="text-align:right;">Value${unit}</th></tr>`;
    const rows = item.labels.map((label, li) => {
      const cells = item.series.map(s => {
        const v = Array.isArray(s.data) ? s.data[li] : '';
        return `<td style="text-align:right;">${esc(v == null ? '' : v)}</td>`;
      }).join('');
      return `<tr><th scope="row" style="font-weight:400; text-transform:none; letter-spacing:0;">${esc(label)}</th>${cells}</tr>`;
    }).join('');
    return `<div class="dd-modal__table-wrap"><table class="dd-modal__details-table"><caption class="sr-only" style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);">Data for ${esc(item.title)}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function modalDetailsHtml(item){
    const link = modalArticleHref(item);
    const realDashboard = item.type === 'dashboard' && isRealUrl(item.embedUrl) && !isPlaceholderUrl(item.embedUrl);
    return `
      <span class="dd-modal__details-tag">${item.category || ''}</span>
      <hr class="dd-modal__details-rule">
      <h2 class="dd-modal__details-title" id="ddDetailTitle">${item.title}</h2>
      ${item.sector ? `<div class="dd-modal__details-row"><div><p class="dd-modal__details-label">Sector</p><p class="dd-modal__details-value">${esc(item.sector)}</p></div></div>` : ''}
      ${item.description ? `<p class="dd-modal__details-desc">${item.description}</p>` : ''}
      ${modalTableHtml(item)}
      ${item.type === 'dashboard' && item.provider ? `<div class="dd-modal__details-row"><div><p class="dd-modal__details-label">Provider</p><p class="dd-modal__details-value">${esc(item.provider)}</p></div></div>` : ''}
      ${realDashboard ? `<p style="margin:0;"><a href="${esc(item.embedUrl)}" target="_blank" rel="noopener noreferrer">Open in new tab</a></p>` : ''}
      ${item.type === 'article' && link ? `<p style="margin:1.5rem 0 0;"><a class="dd-modal__details-btn" href="${esc(link.href)}"${link.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>Read the full article &rarr;</a></p>` : ''}`;
  }

  function trapModalTab(e){
    if(e.key !== 'Tab' || !modalOpenId) return;
    const win = modalEl.querySelector('.dd-modal__window');
    const focusable = Array.from(
      win.querySelectorAll('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')
    ).filter(el => el.getClientRects().length > 0);
    if(!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  }

  function lockBodyScroll(){
    prevBodyOverflow = document.body.style.overflow;
    prevBodyPaddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if(scrollbar > 0) document.body.style.paddingRight = scrollbar + 'px';
  }

  function unlockBodyScroll(){
    document.body.style.overflow = prevBodyOverflow;
    document.body.style.paddingRight = prevBodyPaddingRight;
  }

  function setHash(id, mode){
    const url = id ? `#item-${id}` : window.location.pathname + window.location.search;
    suppressHashChange = true;
    try {
      if(mode === 'push') history.pushState({ ddItem: id || null }, '', url);
      else history.replaceState({ ddItem: id || null }, '', url);
    } catch(err) { /* file:// or restricted context: ignore */ }
    setTimeout(() => { suppressHashChange = false; }, 0);
  }

  function findItem(id){
    return ALL_ITEMS.find(it => it.id === id) || null;
  }

  function openDetail(id, opts){
    opts = opts || {};
    const item = findItem(id);
    if(!item) return false;
    const root = ensureModal();
    const visual = root.querySelector('#ddDetailVisual');
    const details = root.querySelector('#ddDetailDetails');
    if(!modalOpenId){
      modalOpener = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest('[data-item-id]') || document.activeElement
        : document.activeElement;
      lockBodyScroll();
    } else if(modalChart){
      modalChart.destroy();
      modalChart = null;
    }
    modalOpenId = id;
    const v = modalVisualHtml(item);
    visual.className = 'dd-modal__visual' + v.cls;
    visual.innerHTML = v.inner;
    details.scrollTop = 0;
    details.innerHTML = modalDetailsHtml(item);

    const frame = visual.querySelector('iframe');
    if(frame){
      const loading = visual.querySelector('[data-dd-loading]');
      const fallback = visual.querySelector('[data-dd-embed-fallback]');
      frame.addEventListener('load', () => { if(loading) loading.hidden = true; }, { once: true });
      frame.addEventListener('error', () => {
        if(loading) loading.hidden = true;
        if(fallback) fallback.hidden = false;
      }, { once: true });
    }
    const img = visual.querySelector('img');
    if(img){
      img.addEventListener('error', () => {
        const wrap = visual;
        wrap.classList.remove('dd-modal__visual--chart', 'dd-modal__visual--article');
        wrap.innerHTML = `<div class="dd-fallback">Visual coming soon</div>`;
      }, { once: true });
    }

    const wasAlreadyOpen = root.classList.contains('open');
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    if(opts.pushHash === false){
      /* hash already present (deep link): do not push */
    } else if(wasAlreadyOpen){
      setHash(id, 'replace');
    } else {
      setHash(id, 'push');
    }

    const closeBtn = root.querySelector('.dd-modal__close');
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(closeBtn){
      /* The window fades in over ~200ms; focusing while it is still
         visibility:hidden would fail, so wait for the transition. */
      if(reducedMotion){
        try { closeBtn.focus({ preventScroll: true }); } catch(err) {}
      } else {
        if(modalFocusTimer) clearTimeout(modalFocusTimer);
        modalFocusTimer = setTimeout(() => {
          modalFocusTimer = null;
          if(modalOpenId === id){
            try { closeBtn.focus({ preventScroll: true }); } catch(err) {}
          }
        }, 230);
      }
    }

    if(item.type === 'chart'){
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if(modalOpenId !== id) return;
        const canvas = document.getElementById('ddDetailChart');
        if(!canvas || !window.Chart) return;
        modalChart = new Chart(canvas, buildChartConfig(item, 'modal'));
      }));
    }
    return true;
  }

  function closeDetail(opts){
    opts = opts || {};
    if(!modalOpenId) return;
    modalOpenId = null;
    if(modalFocusTimer){ clearTimeout(modalFocusTimer); modalFocusTimer = null; }
    if(modalChart){ try { modalChart.destroy(); } catch(err) {} modalChart = null; }
    const root = ensureModal();
    const frame = root.querySelector('#ddDetailVisual iframe');
    if(frame){ try { frame.src = 'about:blank'; } catch(err) {} }
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    /* Clear stale content after the fade-out so no chart canvas,
       iframe or listeners linger; guarded so a quick reopen wins. */
    const clearStale = () => {
      if(modalOpenId) return;
      const v = root.querySelector('#ddDetailVisual');
      const d = root.querySelector('#ddDetailDetails');
      if(v) v.innerHTML = '';
      if(d) d.innerHTML = '';
    };
    if(typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      clearStale();
    } else {
      setTimeout(clearStale, 240);
    }
    unlockBodyScroll();
    if(!opts.fromPop && (window.location.hash || '').indexOf('#item-') === 0){
      setHash(null, 'replace');
    }
    if(modalOpener && document.contains(modalOpener)){
      try { modalOpener.focus({ preventScroll: true }); } catch(err) { try { modalOpener.focus(); } catch(e2) {} }
    }
    modalOpener = null;
  }

  function wireDetailModal(){
    const grid = document.getElementById('ddGrid');
    if(grid && !grid.dataset.ddModalWired){
      grid.dataset.ddModalWired = '1';
      grid.addEventListener('click', (e) => {
        if(e.target.closest('a, button')) return;
        const card = e.target.closest('[data-item-id]');
        if(card) openDetail(card.getAttribute('data-item-id'));
      });
      grid.addEventListener('keydown', (e) => {
        if(e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest ? e.target.closest('[data-item-id]') : null;
        if(!card || card.tagName === 'A' || card.tagName === 'BUTTON') return;
        e.preventDefault();
        openDetail(card.getAttribute('data-item-id'));
      });
    }
    if(!document.body.dataset.ddModalKeys){
      document.body.dataset.ddModalKeys = '1';
      document.addEventListener('keydown', (e) => {
        if(e.key === 'Escape' && modalOpenId) closeDetail();
      });
      window.addEventListener('popstate', () => {
        if(suppressHashChange) return;
        if(modalOpenId && (window.location.hash || '').indexOf('#item-') !== 0){
          closeDetail({ fromPop: true });
        }
      });
    }
  }

  function openFromHash(){
    const m = (window.location.hash || '').match(/^#item-(.+)$/);
    if(!m) return false;
    const id = decodeURIComponent(m[1]);
    if(!findItem(id)) return false;
    const portalTab = document.querySelector('.dd-tab-btn[data-view="portal"]');
    if(portalTab && portalTab.getAttribute('aria-selected') !== 'true'){
      portalTab.click();
    }
    openDetail(id, { pushHash: false });
    return true;
  }

  function wireFilters(categories){
    const tabWrap = document.getElementById('ddTabs');
    const cats = ['All', ...categories];
    tabWrap.innerHTML = cats.map(c => `<button type="button" class="dd-tab${c==='All'?' active':''}" data-cat="${c}">${c}</button>`).join('');
    tabWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.dd-tab');
      if(!btn) return;
      tabWrap.querySelectorAll('.dd-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      draw();
    });

    const search = document.getElementById('ddSearch');
    search.addEventListener('input', () => { activeQuery = search.value.trim().toLowerCase(); draw(); });
  }

  function renderSectors(sectors){
    const wrap = document.getElementById('ddSectors');
    if(!wrap) return;
    wrap.innerHTML = sectors.map(s => `<button type="button" class="dd-sector-chip">${s}</button>`).join('');
    wrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.dd-sector-chip');
      if(!chip) return;
      document.getElementById('ddSearch').value = chip.textContent;
      activeQuery = chip.textContent.toLowerCase();
      activeCategory = 'All';
      document.querySelectorAll('.dd-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === 'All'));
      draw();
      document.getElementById('ddGrid').scrollIntoView({ behavior:'smooth', block:'start' });
    });
  }

  async function init(){
    const res = await fetch(ROOT + 'data/data-division.json');
    const json = await res.json();
    ALL_ITEMS = json.items;
    const categories = [...new Set(ALL_ITEMS.map(i => i.category))];
    wireFilters(categories);
    renderSectors(json.sectors || []);
    wireLightboxClose();
    wireDetailModal();
    draw();
    openFromHash();

    // Handle Projects/Portal tab switching - resize charts when Portal tab becomes visible
    const tabSwitcher = document.querySelector('.dd-tab-switcher');
    if(tabSwitcher){
      tabSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.dd-tab-btn');
        if(!btn) return;
        const view = btn.dataset.view;
        const portalPanel = document.getElementById('ddPortalPanel');
        const projectsPanel = document.getElementById('ddProjectsPanel');
        if(view === 'portal'){
          projectsPanel.hidden = true;
          portalPanel.hidden = false;
          // Resize charts after panel is visible
          requestAnimationFrame(() => {
            chartInstances.forEach(chart => chart.resize());
          });
        } else {
          portalPanel.hidden = true;
          projectsPanel.hidden = false;
        }
      });
    }
  }

  document.addEventListener('partials:ready', init);
})();
