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

  function cardShell(item, innerHtml, extraClass){
    return `
      <article class="dd-card ${extraClass||''}" data-sector="${item.sector||''}">
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
    return cardShell(item, `<img src="${ROOT}${item.image.replace(/^\//,'')}" alt="${item.title}" loading="lazy" data-lightbox="${ROOT}${item.image.replace(/^\//,'')}" data-caption="${item.title}" onerror="this.parentElement.innerHTML='<div class=\\'dd-fallback\\'>Visual coming soon</div>'">`, 'is-clickable');
  }

  function renderChartCard(item, index){
    const canvasId = `chart-${item.id}-${index}`;
    return cardShell(item, `<canvas id="${canvasId}" width="400" height="300" role="img" aria-label="${item.title}"></canvas>`, '');
  }

  function renderDashboardCard(item){
    return cardShell(item, `
      <div class="dd-dashboard-frame">
        <iframe src="${item.embedUrl}" title="${item.title}" loading="lazy" style="width:100%; height:100%; border:0;"></iframe>
        <span class="dd-provider">${item.provider||'Dashboard'}</span>
      </div>`, '');
  }

  function renderArticleCard(item){
    return `
      <a href="${ROOT}${(item.link||'#').replace(/^\//,'')}" class="dd-card" data-sector="${item.sector||''}">
        <div class="dd-card-media"><div class="dd-fallback" style="background:var(--teal); color:#fff;">Read the article →</div></div>
        <div class="card-body">
          <span class="tag">${item.category}</span>
          <h4>${item.title}</h4>
          <p style="margin:0;">${item.description||''}</p>
        </div>
      </a>`;
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

    // draw charts after they exist in the DOM
    filtered.forEach((item, i) => {
      if(item.type !== 'chart') return;
      const ctx = document.getElementById(`chart-${item.id}-${i}`);
      if(!ctx || !window.Chart) return;
      const palette = ['#0F2038','#B9954A','#7A2331','#545A34','#16333B','#8A93A6'];
      new Chart(ctx, {
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
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display: item.chartType!=='bar', labels:{ boxWidth:10, font:{ family:'Public Sans', size:11 } } } },
          scales: item.chartType==='pie' || item.chartType==='doughnut' ? {} : {
            y:{ beginAtZero:true, grid:{ color:'#eee' }, ticks:{ font:{ family:'Public Sans' } } },
            x:{ grid:{ display:false }, ticks:{ font:{ family:'Public Sans' } } }
          }
        }
      });
    });

    wireLightbox();
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
    draw();
  }

  document.addEventListener('partials:ready', init);
})();
