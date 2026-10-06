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
    return cardShell(item, `<canvas id="${canvasId}" width="400" height="300" role="img" aria-label="${esc(ddTypeName(item))}: ${esc(item.title)}"></canvas>`, '');
  }

  function renderFallbackCard(item){
    return cardShell(item, `<div class="dd-fallback">Visual coming soon</div>`, '');
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
      if(item.type === 'chart'){
        const v = validateChartItem(item);
        if(!v.ok){
          console.warn(`[dd] skipping chart "${item.id}" (${v.reason}) — showing fallback.`);
          return renderFallbackCard(item);
        }
        return renderChartCard(item, i);
      }
      if(item.type === 'dashboard') return renderDashboardCard(item);
      if(item.type === 'article') return renderArticleCard(item);
      return '';
    }).join('');

    // Destroy old chart instances
    chartInstances.forEach(chart => { try { chart.destroy(); } catch(err) {} });
    chartInstances = [];

    // draw charts after they exist in the DOM
    filtered.forEach((item, i) => {
      if(item.type !== 'chart') return;
      if(!validateChartItem(item).ok) return;
      const ctx = document.getElementById(`chart-${item.id}-${i}`);
      if(!ctx || !window.Chart) return;
      try {
        const chartConfig = buildChartConfig(item, 'card');
        if(!chartConfig) return;
        const chart = new Chart(ctx, chartConfig);
        chartInstances.push(chart);
      } catch(err) {
        console.warn(`[dd] failed to render chart "${item.id}":`, err);
      }
    });

    wireLightbox();
  }

  /* One brand palette for every chart: navy, gold, slate, beige plus
     four harmonious brand tones. Lightness varies so adjacent series
     stay distinguishable in greyscale. */
  const DD_PALETTE = ['#0d2136','#a8935a','#8a949e','#d8d0c6','#7e2138','#2f3527','#004451','#512137'];

  const DD_TYPE_NAMES = {
    bar: 'Bar chart', horizontalBar: 'Horizontal bar chart', line: 'Line chart',
    area: 'Area chart', pie: 'Pie chart', doughnut: 'Doughnut chart',
    polarArea: 'Polar area chart', groupedBar: 'Grouped bar chart',
    stackedBar: 'Stacked bar chart', stackedBar100: '100% stacked bar chart',
    steppedLine: 'Stepped line chart', radar: 'Radar chart', scatter: 'Scatter chart',
    combo: 'Combination chart', bubble: 'Bubble chart', treemap: 'Treemap'
  };

  const DD_LABEL_TYPES = ['bar','horizontalBar','line','area','pie','doughnut','polarArea',
    'groupedBar','stackedBar','stackedBar100','steppedLine','radar','combo'];
  const DD_KNOWN_TYPES = DD_LABEL_TYPES.concat(['scatter','bubble','treemap']);

  function ddSeriesColor(series, si){
    const c = series && typeof series.color === 'string' ? series.color.trim() : '';
    if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
    return DD_PALETTE[si % DD_PALETTE.length];
  }

  function ddHexA(hex, alpha){
    const h = hex.replace('#','');
    const full = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function ddFmtVal(v, unit){
    if(v == null || v === '') return '';
    if(typeof v === 'number' && Math.abs(v) >= 1000) v = (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
    if(!unit) return String(v);
    return unit === '%' ? `${v}%` : `${v} ${unit}`;
  }

  /* Wrap long category labels onto several lines (arrays of lines) so
     nothing is rotated or clipped at the card edge. */
  function ddWrapLabel(label, maxLen){
    const text = String(label == null ? '' : label);
    const max = maxLen || 24;
    if(text.length <= max) return text;
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(w => {
      const next = line ? line + ' ' + w : w;
      if(next.length > max && line){ lines.push(line); line = w; }
      else line = next;
    });
    if(line) lines.push(line);
    return lines.length > 1 ? lines : text;
  }

  function ddTypeName(item){
    const t = (item && item.chartType) || 'bar';
    return DD_TYPE_NAMES[t] || DD_TYPE_NAMES.bar;
  }

  /* Pure validation: returns {ok:true} or {ok:false, reason}. Never throws,
     never mutates. One bad item must never stop the rest from rendering. */
  function validateChartItem(item){
    if(!item || item.type !== 'chart') return { ok: false, reason: 'not-a-chart' };
    const type = item.chartType || 'bar';
    if(type === 'treemap') return { ok: false, reason: 'treemap-unsupported' };
    if(type === 'scatter' || type === 'bubble'){
      if(!Array.isArray(item.series) || !item.series.length) return { ok: false, reason: 'empty' };
      for(const s of item.series){
        if(!s || !Array.isArray(s.data) || !s.data.length) return { ok: false, reason: 'empty' };
        for(const p of s.data){
          if(!p || typeof p.x !== 'number' || typeof p.y !== 'number') return { ok: false, reason: 'length' };
          if(type === 'bubble' && typeof p.r !== 'number') return { ok: false, reason: 'length' };
        }
      }
      return { ok: true };
    }
    /* Unknown chartType falls back to "bar" (warned in normalize), so any
       other label-based type validates against labels/series lengths. */
    if(!Array.isArray(item.labels) || !item.labels.length) return { ok: false, reason: 'empty' };
    if(!Array.isArray(item.series) || !item.series.length) return { ok: false, reason: 'empty' };
    for(const s of item.series){
      if(!s || !Array.isArray(s.data) || s.data.length !== item.labels.length){
        return { ok: false, reason: 'length' };
      }
    }
    if(type === 'combo'){
      for(const s of item.series){
        const st = s.type || 'bar';
        if(st !== 'bar' && st !== 'line') return { ok: false, reason: 'combo-type' };
      }
    }
    return { ok: true };
  }

  /* Normalise a valid item into a render-ready copy (never mutates JSON):
     unknown chartType falls back to bar, sortDescending reorders a copy,
     stackedBar100 converts to percentages (raw kept for tooltips/tables),
     bubble radii scale so the largest bubble is ~30px. */
  function normalizeChartItem(item){
    let type = item.chartType || 'bar';
    if(!DD_KNOWN_TYPES.includes(type)){
      console.warn(`[dd] unknown chartType "${type}" for item "${item.id}" — falling back to "bar".`);
      type = 'bar';
    }
    const labels = Array.isArray(item.labels) ? item.labels.slice() : [];
    const series = (item.series || []).map(s => ({
      name: s.name, data: Array.isArray(s.data) ? s.data.slice() : [],
      type: s.type, axis: s.axis, color: s.color, fill: s.fill
    }));
    if((type === 'bar' || type === 'horizontalBar') && item.sortDescending && series.length){
      const order = labels.map((_, i) => i).sort((a, b) => (Number(series[0].data[b]) || 0) - (Number(series[0].data[a]) || 0));
      const sortedLabels = order.map(i => labels[i]);
      series.forEach(s => { s.data = order.map(i => s.data[i]); });
      return { type, labels: sortedLabels, series };
    }
    if(type === 'stackedBar100'){
      const totals = labels.map((_, li) => series.reduce((t, s) => t + (Number(s.data[li]) || 0), 0));
      series.forEach(s => {
        s._raw = s.data.slice();
        s.data = s.data.map((v, li) => totals[li] > 0 ? +((Number(v) || 0) / totals[li] * 100).toFixed(1) : 0);
      });
    }
    if(type === 'bubble'){
      let maxR = 0;
      series.forEach(s => s.data.forEach(p => { if(p && typeof p.r === 'number' && p.r > maxR) maxR = p.r; }));
      const k = maxR > 0 ? 30 / maxR : 1;
      series.forEach(s => { s.data = s.data.map(p => ({ x: p.x, y: p.y, r: Math.max(2, p.r * k) })); });
    }
    return { type, labels, series };
  }

  function buildChartConfig(item, context) {
    const validity = validateChartItem(item);
    if(!validity.ok){
      if(validity.reason === 'unknown-type'){
        /* fall through to bar fallback below */
      } else {
        return null;
      }
    }
    const norm = normalizeChartItem(item);
    const type = norm.type;
    const labels = norm.labels;
    const series = norm.series;
    if(type === 'treemap'){
      console.warn(`[dd] chartType "treemap" for item "${item.id}" is not supported — showing fallback.`);
      return null;
    }
    const isModal = context === 'modal';
    const tickSize = isModal ? 14 : 11;
    const legendSize = isModal ? 14 : 11;
    const unit = item.unit || '';
    const showTitles = isModal;

    const tooltipLabel = function(ctx){
      const ds = ctx.dataset;
      const si = ctx.datasetIndex;
      const sName = ds.label ? ds.label + ': ' : '';
      if(type === 'stackedBar100'){
        const raw = ds._raw ? ds._raw[ctx.dataIndex] : ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
        const pct = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : ctx.parsed;
        return `${sName}${raw} (${pct}%)`;
      }
      if(type === 'scatter'){
        const p = ctx.raw || {};
        return `${sName}(${p.x}, ${p.y})`;
      }
      if(type === 'bubble'){
        const p = ctx.raw || {};
        return `${sName}(${p.x}, ${p.y}, size ${p.r == null ? '' : Math.round(p.r)})`;
      }
      if(type === 'pie' || type === 'doughnut' || type === 'polarArea'){
        const v = ctx.parsed;
        return `${ctx.label}: ${ddFmtVal(typeof v === 'number' ? v : v, unit)}`;
      }
      const v = ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
      return `${sName}${ddFmtVal(v, unit)}`;
    };

    const baseConfig = {
      type: type === 'horizontalBar' ? 'bar'
        : type === 'area' ? 'line'
        : type === 'steppedLine' ? 'line'
        : type === 'groupedBar' ? 'bar'
        : type === 'stackedBar' ? 'bar'
        : type === 'stackedBar100' ? 'bar'
        : type === 'combo' ? 'bar'
        : type,
      data: { labels: labels, datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: series.length > 1 || ['pie','doughnut','polarArea','treemap'].includes(type),
            position: 'bottom',
            labels: { boxWidth: 10, font: { family: 'Public Sans', size: legendSize }, padding: 16, usePointStyle: (type === 'pie' || type === 'doughnut') }
          },
          tooltip: {
            backgroundColor: 'rgba(13,33,54,0.9)',
            titleFont: { family: 'Public Sans', size: isModal ? 14 : 12 },
            bodyFont: { family: 'Public Sans', size: isModal ? 14 : 11 },
            padding: 10,
            cornerRadius: 4,
            callbacks: { label: tooltipLabel }
          }
        },
        scales: {},
        layout: {
          padding: { left: 0, right: 0, top: 8, bottom: 0 }
        },
        animation: (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          ? false
          : { duration: 750, easing: 'easeOutQuart' }
      }
    };

    /* Bar family */
    if(['bar','horizontalBar','groupedBar','stackedBar','stackedBar100'].includes(type)){
      if(type === 'horizontalBar') baseConfig.options.indexAxis = 'y';
      const stacked = type === 'stackedBar' || type === 'stackedBar100';
      baseConfig.data.datasets = series.map((s, si) => ({
        label: s.name,
        data: s.data,
        backgroundColor: ddSeriesColor(s, si),
        borderWidth: 0
      }));
      const catAxis = type === 'horizontalBar' ? 'y' : 'x';
      const valAxis = type === 'horizontalBar' ? 'x' : 'y';
      const tickUnit = type === 'stackedBar100' ? '%' : unit;
      baseConfig.options.scales[catAxis] = {
        stacked: stacked || undefined,
        border: { display: false },
        grid: { display: false, drawBorder: false, drawOnChartArea: false },
        ticks: {
          font: { family: 'Public Sans', size: tickSize }, color: '#666',
          maxRotation: 0, autoSkip: true, padding: 8,
          callback: type === 'horizontalBar'
            ? function(value){ const l = this.getLabelForValue(value); return ddWrapLabel(l, 24); }
            : undefined
        }
      };
      baseConfig.options.scales[valAxis] = {
        stacked: stacked || undefined,
        border: { display: false },
        grid: { color: '#eee', drawBorder: false, drawOnChartArea: true, drawTicks: false },
        ticks: {
          font: { family: 'Public Sans', size: tickSize }, color: '#666', padding: 8,
          callback: function(value){ return ddFmtVal(value, tickUnit); }
        },
        beginAtZero: true
      };
      if(showTitles){
        if(item.xAxisTitle) baseConfig.options.scales.x.title = { display: true, text: item.xAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
        if(item.yAxisTitle) baseConfig.options.scales.y.title = { display: true, text: item.yAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
      }
      baseConfig.options.interaction = { intersect: false, mode: 'index' };
    }

    /* Line family */
    if(['line','area','steppedLine'].includes(type)){
      baseConfig.data.datasets = series.map((s, si) => {
        const c = ddSeriesColor(s, si);
        return {
          label: s.name,
          data: s.data,
          borderColor: c,
          backgroundColor: type === 'area' ? ddHexA(c, 0.22) : c,
          borderWidth: 2,
          fill: type === 'area' ? true : false,
          stepped: type === 'steppedLine' ? true : false,
          tension: type === 'steppedLine' ? 0 : 0.3,
          pointRadius: isModal ? 3 : 2,
          pointBackgroundColor: c
        };
      });
      baseConfig.options.scales = cartesianValueScales(tickSize, unit);
      if(showTitles){
        if(item.xAxisTitle) baseConfig.options.scales.x.title = { display: true, text: item.xAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
        if(item.yAxisTitle) baseConfig.options.scales.y.title = { display: true, text: item.yAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
      }
      baseConfig.options.interaction = { intersect: false, mode: 'index' };
    }

    /* Circular */
    if(['pie','doughnut','polarArea'].includes(type)){
      baseConfig.data.datasets = series.map(s => ({
        label: s.name,
        data: s.data,
        backgroundColor: labels.map((_, li) => DD_PALETTE[li % DD_PALETTE.length]),
        borderWidth: 0
      }));
      baseConfig.options.scales = {};
      if(type === 'doughnut') baseConfig.options.cutout = '65%';
      if(type === 'polarArea'){
        baseConfig.options.scales = {
          r: {
            border: { display: false },
            grid: { color: '#eee' },
            angleLines: { color: '#eee' },
            ticks: { display: false, beginAtZero: true },
            pointLabels: { font: { family: 'Public Sans', size: tickSize }, color: '#666' }
          }
        };
      }
    }

    /* Radar */
    if(type === 'radar'){
      baseConfig.data.datasets = series.map((s, si) => {
        const c = ddSeriesColor(s, si);
        return {
          label: s.name,
          data: s.data,
          borderColor: c,
          backgroundColor: ddHexA(c, 0.2),
          borderWidth: 2,
          pointRadius: isModal ? 3 : 2,
          pointBackgroundColor: c
        };
      });
      baseConfig.options.scales = {
        r: {
          border: { display: false },
          grid: { color: '#eee' },
          angleLines: { color: '#eee' },
          ticks: { display: false, beginAtZero: true },
          pointLabels: { font: { family: 'Public Sans', size: tickSize }, color: '#333' }
        }
      };
    }

    /* Scatter */
    if(type === 'scatter'){
      baseConfig.data.datasets = series.map((s, si) => {
        const c = ddSeriesColor(s, si);
        return {
          label: s.name,
          data: s.data,
          backgroundColor: c,
          borderColor: c,
          pointRadius: isModal ? 4 : 3
        };
      });
      baseConfig.options.scales = pointScales(tickSize, unit, showTitles, item);
    }

    /* Bubble */
    if(type === 'bubble'){
      baseConfig.data.datasets = series.map((s, si) => {
        const c = ddSeriesColor(s, si);
        return {
          label: s.name,
          data: s.data,
          backgroundColor: ddHexA(c, 0.55),
          borderColor: c,
          borderWidth: 1
        };
      });
      baseConfig.options.scales = pointScales(tickSize, unit, showTitles, item);
    }

    /* Combo */
    if(type === 'combo'){
      const useRight = series.some(s => s.axis === 'right');
      baseConfig.data.datasets = series.map((s, si) => {
        const c = ddSeriesColor(s, si);
        const st = s.type === 'line' ? 'line' : 'bar';
        const d = {
          type: st,
          label: s.name,
          data: s.data,
          yAxisID: s.axis === 'right' ? 'y1' : 'y',
          borderColor: c,
          backgroundColor: st === 'bar' ? c : 'transparent',
          borderWidth: st === 'line' ? 2 : 0,
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          pointBackgroundColor: c
        };
        return d;
      });
      baseConfig.options.scales.x = {
        border: { display: false },
        grid: { display: false, drawBorder: false, drawOnChartArea: false },
        ticks: { font: { family: 'Public Sans', size: tickSize }, color: '#666', maxRotation: 0, autoSkip: true, padding: 8 }
      };
      baseConfig.options.scales.y = {
        border: { display: false },
        grid: { color: '#eee', drawBorder: false, drawOnChartArea: true, drawTicks: false },
        ticks: { font: { family: 'Public Sans', size: tickSize }, color: '#666', padding: 8 },
        beginAtZero: true
      };
      if(showTitles){
        if(item.xAxisTitle) baseConfig.options.scales.x.title = { display: true, text: item.xAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
        if(item.yAxisTitle) baseConfig.options.scales.y.title = { display: true, text: item.yAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
      }
      if(useRight){
        baseConfig.options.scales.y1 = {
          position: 'right',
          border: { display: false },
          grid: { drawOnChartArea: false, drawBorder: false },
          ticks: { font: { family: 'Public Sans', size: tickSize }, color: '#666', padding: 8 },
          beginAtZero: true
        };
        if(showTitles && item.rightAxisTitle){
          baseConfig.options.scales.y1.title = { display: true, text: item.rightAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
        }
      }
      baseConfig.options.interaction = { intersect: false, mode: 'index' };
    }

    return baseConfig;
  }

  function cartesianValueScales(tickSize, unit){
    return {
      x: {
        border: { display: false },
        grid: { display: false, drawBorder: false, drawOnChartArea: false },
        ticks: { font: { family: 'Public Sans', size: tickSize }, color: '#666', maxRotation: 0, autoSkip: true, padding: 8 }
      },
      y: {
        border: { display: false },
        grid: { color: '#eee', drawBorder: false, drawOnChartArea: true, drawTicks: false },
        ticks: {
          font: { family: 'Public Sans', size: tickSize }, color: '#666', padding: 8,
          callback: function(value){ return ddFmtVal(value, unit); }
        },
        beginAtZero: true
      }
    };
  }

  function pointScales(tickSize, unit, showTitles, item){
    const scales = {
      x: {
        type: 'linear',
        border: { display: false },
        grid: { display: false, drawBorder: false, drawOnChartArea: false },
        ticks: { font: { family: 'Public Sans', size: tickSize }, color: '#666', padding: 8 }
      },
      y: {
        type: 'linear',
        border: { display: false },
        grid: { color: '#eee', drawBorder: false, drawOnChartArea: true, drawTicks: false },
        ticks: {
          font: { family: 'Public Sans', size: tickSize }, color: '#666', padding: 8,
          callback: function(value){ return ddFmtVal(value, unit); }
        },
        beginAtZero: false
      }
    };
    if(showTitles){
      if(item.xAxisTitle) scales.x.title = { display: true, text: item.xAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
      if(item.yAxisTitle) scales.y.title = { display: true, text: item.yAxisTitle, font: { family: 'Public Sans', size: 14, weight: '600' }, color: '#333' };
    }
    return scales;
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
      const hasData = validateChartItem(item).ok;
      inner = hasData
        ? `<div class="dd-modal__chart-wrap"><canvas id="ddDetailChart" role="img" aria-label="${esc(ddTypeName(item))}: ${esc(item.title)}"></canvas></div>`
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

  function modalTableCell(v, unit){
    if(v == null || v === '') return `<td style="text-align:right;">&ndash;</td>`;
    if(typeof v === 'number') return `<td style="text-align:right;">${esc(ddFmtVal(v, unit))}</td>`;
    if(typeof v === 'object') return `<td style="text-align:right;">${esc(`(${v.x}, ${v.y}${v.r == null ? '' : ', ' + v.r})`)}</td>`;
    return `<td style="text-align:right;">${esc(v)}</td>`;
  }

  function modalTableHtml(item){
    if(item.type !== 'chart') return '';
    if(!validateChartItem(item).ok) return '';
    const type = item.chartType || 'bar';
    const unit = item.unit || '';
    const unitNote = unit ? ` <span style="font-weight:400;">(${esc(unit)})</span>` : '';
    const wrap = inner => `<div class="dd-modal__table-wrap"><table class="dd-modal__details-table"><caption class="sr-only" style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);">Data for ${esc(item.title)}</caption>${inner}</table></div>`;

    if(type === 'scatter'){
      const rows = item.series.map(s => (s.data || []).map(p =>
        `<tr><th scope="row" style="font-weight:400; text-transform:none; letter-spacing:0;">${esc(s.name)}</th><td style="text-align:right;">${esc(p.x)}</td><td style="text-align:right;">${esc(p.y)}</td></tr>`
      ).join('')).join('');
      return wrap(`<thead><tr><th scope="col">Series</th><th scope="col" style="text-align:right;">X${unitNote}</th><th scope="col" style="text-align:right;">Y${unitNote}</th></tr></thead><tbody>${rows}</tbody>`);
    }
    if(type === 'bubble'){
      const rows = item.series.map(s => (s.data || []).map(p =>
        `<tr><th scope="row" style="font-weight:400; text-transform:none; letter-spacing:0;">${esc(s.name)}</th><td style="text-align:right;">${esc(p.x)}</td><td style="text-align:right;">${esc(p.y)}</td><td style="text-align:right;">${esc(p.r)}</td></tr>`
      ).join('')).join('');
      return wrap(`<thead><tr><th scope="col">Series</th><th scope="col" style="text-align:right;">X${unitNote}</th><th scope="col" style="text-align:right;">Y${unitNote}</th><th scope="col" style="text-align:right;">Size${unitNote}</th></tr></thead><tbody>${rows}</tbody>`);
    }
    if(type === 'pie' || type === 'doughnut' || type === 'polarArea'){
      const s = item.series[0] || { data: [] };
      const rows = (item.labels || []).map((label, li) =>
        `<tr><th scope="row" style="font-weight:400; text-transform:none; letter-spacing:0;">${esc(label)}</th>${modalTableCell(s.data[li], unit)}</tr>`
      ).join('');
      return wrap(`<thead><tr><th scope="col">Label</th><th scope="col" style="text-align:right;">Value${unitNote}</th></tr></thead><tbody>${rows}</tbody>`);
    }
    const multi = item.series.length > 1;
    const head = multi
      ? `<tr><th scope="col">Label</th>${item.series.map(s => `<th scope="col" style="text-align:right;">${esc(s.name)}</th>`).join('')}</tr>`
      : `<tr><th scope="col">Label</th><th scope="col" style="text-align:right;">Value${unitNote}</th></tr>`;
    const rows = (item.labels || []).map((label, li) => {
      const cells = item.series.map(s => modalTableCell(Array.isArray(s.data) ? s.data[li] : '', unit)).join('');
      const shown = typeof label === 'string' ? label : (Array.isArray(label) ? label.join(' ') : String(label));
      return `<tr><th scope="row" style="font-weight:400; text-transform:none; letter-spacing:0;">${esc(shown)}</th>${cells}</tr>`;
    }).join('');
    const note = type === 'stackedBar100'
      ? `<p style="font-size:.85rem; color:var(--ink-soft); margin:.75rem 0 0;">Values below are the raw numbers; the chart displays each category as percentages.</p>`
      : '';
    return wrap(`<thead>${head}</thead><tbody>${rows}</tbody>`) + note;
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

    if(item.type === 'chart' && validateChartItem(item).ok){
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if(modalOpenId !== id) return;
        const canvas = document.getElementById('ddDetailChart');
        if(!canvas || !window.Chart) return;
        try {
          const cfg = buildChartConfig(item, 'modal');
          if(!cfg) return;
          modalChart = new Chart(canvas, cfg);
        } catch(err) {
          console.warn(`[dd] failed to render modal chart "${item.id}":`, err);
        }
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

  /* Test hook for the chart-type harness: exposes the shared builders so a
     test page can render every chartType through the real code path. */
  try {
    window.__ddCharts = {
      buildChartConfig, validateChartItem, normalizeChartItem, ddTypeName, DD_PALETTE
    };
  } catch(err) {}
})();
