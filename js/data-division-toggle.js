const DD_VIEWS = ['projects', 'portal'];

function ddViewFromHash() {
  const hash = (window.location.hash || '').toLowerCase();
  if (hash === '#portal') return 'portal';
  if (hash === '#projects') return 'projects';
  return null;
}

function ddReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
}

function ddScrollToViews() {
  const switcher = document.querySelector('.dd-tab-switcher');
  if (!switcher) return;
  try {
    switcher.scrollIntoView({ behavior: ddReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  } catch (err) {
    switcher.scrollIntoView();
  }
}

export function ddSetView(view, options) {
  const opts = options || {};
  if (!DD_VIEWS.includes(view)) return;
  // A detail modal owns the hash while open; never steal it.
  const modalOpen = !!document.querySelector('.dd-modal.open');
  const tabs = Array.from(document.querySelectorAll('.dd-tab-btn'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === view)));
  panels.forEach(p => { p.hidden = p.dataset.panel !== view; });
  try { localStorage.setItem('ddView', view); } catch (err) {}
  if (opts.updateHash && !modalOpen) {
    const hash = view === 'portal' ? '#portal' : '#projects';
    if (window.location.hash !== hash) {
      try { window.history.pushState(null, '', hash); } catch (err) {}
    }
  }
  if (view === 'portal') {
    try { window.dispatchEvent(new CustomEvent('dd:portal-shown')); } catch (err) {}
  }
  if (opts.scroll) ddScrollToViews();
  if (opts.focus) {
    const tab = document.querySelector(`.dd-tab-btn[data-view="${view}"]`);
    if (tab) tab.focus({ preventScroll: true });
  }
}

function ddApplyHashView() {
  // Detail-modal hashes belong to the modal; leave them alone.
  if ((window.location.hash || '').toLowerCase().indexOf('#item-') === 0) return;
  const view = ddViewFromHash();
  if (view) ddSetView(view, { updateHash: false });
}

export function initDataDivisionToggle() {
  const switcher = document.querySelector('.dd-tab-switcher');
  const tabs = Array.from(document.querySelectorAll('.dd-tab-btn'));
  if (!switcher || !tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Synthetic clicks (e.g. deep-link setup) must not rewrite the URL.
      ddSetView(tab.dataset.view, { updateHash: e.isTrusted !== false });
    });
    tab.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(tab);
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      ddSetView(next.dataset.view, { updateHash: true, focus: true });
    });
  });

  document.querySelectorAll('[data-dd-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      ddSetView(btn.dataset.ddView, { updateHash: true, scroll: true });
    });
  });

  window.addEventListener('hashchange', ddApplyHashView);
  window.addEventListener('popstate', ddApplyHashView);

  const hashView = ddViewFromHash();
  let saved = null;
  try { saved = window.localStorage.getItem('ddView'); } catch (err) {}
  const initial = hashView || (DD_VIEWS.includes(saved) ? saved : 'portal');
  ddSetView(initial, { updateHash: false });
  if (hashView) ddScrollToViews();
}