/**
 * work.js
 * Renders the Our Work hub from /data/case-studies.json, filtered by service.
 * Cards reuse renderCaseStudyCard from case-studies.js so a project looks
 * identical whether it appears on a service page, the case study page, or here.
 */
import { loadCaseStudies, renderCaseStudyCard } from './case-studies.js';

(function(){
  const ROOT = document.documentElement.dataset.root || '';
  let ALL = [];
  let activeService = 'All';
  let activeQuery = '';
  let activeSort = 'newest';
  let activePage = 1;

  const SERVICE_LABELS = {
    'business-development': 'Business Development',
    'research-project-management': 'Research & Project Management',
    'data-division': 'Data Division'
  };
  const SERVICE_SLUGS = ['business-development', 'research-project-management', 'data-division'];
  const SORTS = ['newest', 'oldest', 'title-asc', 'title-desc'];
  const PAGE_SIZE = 15;

  /* Shared date format: "29 Sept 2026". */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  function fmtWorkDate(d){
    if(!d) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if(!m) return '';
    const mi = parseInt(m[2], 10);
    if(mi < 1 || mi > 12) return '';
    return `${parseInt(m[3], 10)} ${MONTHS[mi - 1]} ${m[1]}`;
  }

  function isExternalUrl(url){ return /^https?:\/\//i.test(url || ''); }

  /* One case-study card — delegates to the shared renderer used by the
     service pages and the case study page, so output is identical. */
  function card(cs){
    return renderCaseStudyCard(cs, { link: true });
  }

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
    return ALL.filter(cs => {
      const matchService = activeService === 'All' || cs.serviceSlug === activeService;
      const haystack = `${cs.title||''} ${cs.client||''} ${cs.eyebrow||''} ${cs.location||''}`.toLowerCase();
      const matchQuery = !activeQuery || haystack.includes(activeQuery);
      return matchService && matchQuery;
    });
  }

  function getSorted(list){
    const decorated = list.map((item, index) => ({ item, index }));
    decorated.sort((a, b) => {
      let cmp = 0;
      if(activeSort === 'oldest' || activeSort === 'newest'){
        cmp = new Date(a.item.publishedAt) - new Date(b.item.publishedAt);
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
    const service = params.get('service');
    const sort = params.get('sort');
    const pageParam = params.get('page');
    const hasQuery = service !== null || sort !== null || pageParam !== null;
    if(service && SERVICE_SLUGS.includes(service)){
      activeService = service;
    } else {
      activeService = 'All';
    }
    activeSort = SORTS.includes(sort) ? sort : 'newest';
    const page = parseInt(pageParam, 10);
    activePage = Number.isFinite(page) && page >= 1 ? page : 1;
    if(hasQuery) return 'query';
    return activeService !== 'All' ? 'service' : 'none';
  }

  function writeURL(mode){
    const params = new URLSearchParams();
    if(activeService !== 'All') params.set('service', activeService);
    if(activeSort !== 'newest') params.set('sort', activeSort);
    if(activePage > 1) params.set('page', String(activePage));
    const query = params.toString();
    const url = window.location.pathname + (query ? '?' + query : '');
    try {
      if(mode === 'push') window.history.pushState({ work: true }, '', url);
      else window.history.replaceState({ work: true }, '', url);
    } catch(e){ /* file:// or restricted context: ignore */ }
  }

  function syncControls(){
    const tabWrap = document.getElementById('workTabs');
    if(tabWrap){
      tabWrap.querySelectorAll('.work-tab').forEach(b => {
        const isAll = b.dataset.service === 'All';
        const match = activeService === 'All' ? isAll : b.dataset.service === activeService;
        b.classList.toggle('active', match);
        b.setAttribute('aria-selected', String(match));
      });
    }
    const sortSel = document.getElementById('workSort');
    if(sortSel) sortSel.value = activeSort;
    const search = document.getElementById('workSearch');
    if(search) search.value = activeQuery;
  }

  function clearAllFilters(){
    activeService = 'All';
    activeQuery = '';
    activeSort = 'newest';
    activePage = 1;
    const search = document.getElementById('workSearch');
    if(search) search.value = '';
  }

  function draw(){
    const grid = document.getElementById('workGrid');
    const sorted = getSorted(getFiltered());
    const total = sorted.length;
    const pages = pageCount(total);
    if(activePage > pages) activePage = pages;
    if(activePage < 1) activePage = 1;
    const start = (activePage - 1) * PAGE_SIZE;
    const visible = sorted.slice(start, start + PAGE_SIZE);

    const countEl = document.getElementById('workCount');
    if(countEl){
      countEl.textContent = total > PAGE_SIZE
        ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} projects`
        : `${total} project${total===1?'':'s'}`;
    }
    grid.innerHTML = visible.length
      ? visible.map(card).join('')
      : `<div class="dd-empty"><p>No projects match your search.</p><button type="button" class="btn btn-gold" data-clear-filters>Clear filters</button></div>`;

    const pagination = document.getElementById('workPagination');
    const info = document.getElementById('workPageInfo');
    const prev = document.getElementById('workPrev');
    const next = document.getElementById('workNext');
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

    grid.querySelectorAll('.card').forEach(cardEl => {
      if(cardEl.querySelector('a[href]')){
        cardEl.setAttribute('tabindex', '0');
      }
    });
  }

  function wireControls(){
    const tabWrap = document.getElementById('workTabs');
    if(tabWrap){
      tabWrap.innerHTML = [
        { service: 'All', label: 'All' },
        ...SERVICE_SLUGS.map(s => ({ service: s, label: SERVICE_LABELS[s] }))
      ].map(t => `<button type="button" class="work-tab${t.service==='All'?' active':''}" data-service="${t.service}" aria-selected="${t.service==='All'}">${t.label}</button>`).join('');
      tabWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.work-tab');
        if(!btn) return;
        activeService = btn.dataset.service;
        activePage = 1;
        syncControls();
        draw();
        writeURL('push');
      });
    }
    const search = document.getElementById('workSearch');
    if(search){
      search.addEventListener('input', (e) => {
        activeQuery = e.target.value.trim().toLowerCase();
        activePage = 1;
        draw();
        writeURL('replace');
      });
    }

    const sortSel = document.getElementById('workSort');
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

    const prev = document.getElementById('workPrev');
    const next = document.getElementById('workNext');
    if(prev) prev.addEventListener('click', () => {
      if(activePage <= 1) return;
      activePage -= 1;
      draw();
      writeURL('push');
      smoothScrollTo(document.getElementById('workGrid'));
    });
    if(next) next.addEventListener('click', () => {
      activePage += 1;
      draw();
      writeURL('push');
      smoothScrollTo(document.getElementById('workGrid'));
    });

    const grid = document.getElementById('workGrid');
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

  function scrollToResults(){
    const grid = document.getElementById('workGrid');
    smoothScrollTo(grid);
    const heading = document.getElementById('workGridHeading');
    if(heading){
      try { heading.focus({ preventScroll: true }); } catch(e){ try { heading.focus(); } catch(e2){} }
    }
  }

  async function init(){
    const settled = await fetch(ROOT + 'data/case-studies.json')
      .then(r => { if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(err => { console.warn('[work] could not load data/case-studies.json — catalogue unavailable.', err); return null; });
    if(!settled || !Array.isArray(settled.caseStudies)){
      const grid = document.getElementById('workGrid');
      if(grid) grid.innerHTML = `<div class="dd-empty"><p>Projects are unavailable right now. Please try again later.</p></div>`;
      const countEl = document.getElementById('workCount');
      if(countEl) countEl.textContent = '0 projects';
      return;
    }
    ALL = settled.caseStudies;
    const fromURL = readURL();
    wireControls();
    syncControls();
    draw();
    if(fromURL === 'query'){
      writeURL('replace');
      smoothScrollTo(document.querySelector('.updates-toolbar, .work-toolbar'));
    }
  }

  document.addEventListener('partials:ready', init);

  /* Test hook: exposes the render helper so a test page can build cards
     through the real code path. */
  try {
    window.__work = { card, renderCaseStudyCard };
  } catch(err) {}
})();
