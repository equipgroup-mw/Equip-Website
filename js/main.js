/**
 * main.js
 * Handles: shared header/footer injection, the Services dropdown (built from
 * data/nav.json so departments can be added/removed without touching code),
 * the mobile menu, and the "header only visible in the hero" scroll behaviour.
 */
(function(){
  const ROOT = document.documentElement.dataset.root || ''; // e.g. "../" on nested pages

  async function injectPartial(selector, url){
    const host = document.querySelector(selector);
    if(!host){ return false; }
    try{
      const res = await fetch(ROOT + url);
      if(!res.ok) throw new Error(url + ' → HTTP ' + res.status);
      const html = await res.text();
      if(!html.trim()) throw new Error(url + ' → empty response');
      host.innerHTML = html;
      return true;
    }catch(e){
      host.innerHTML = '<div style="padding:1rem;background:#fee;border:1px solid #f88;color:#800;font-family:monospace;font-size:.8rem">Failed to load '+url+': '+e.message+'</div>';
      return false;
    }
  }

  function rewritePaths(html, root){
    const ATTRS = ['href', 'src', 'action', 'poster'];
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const els = tpl.content.querySelectorAll(ATTRS.map(a => `[${a}]`).join(','));
    els.forEach(el => {
      ATTRS.forEach(attr => {
        const v = el.getAttribute(attr);
        if(v && v.startsWith('/') && !v.startsWith('//')){
          el.setAttribute(attr, root + v.slice(1));
        }
      });
    });
    return tpl.innerHTML;
  }

  /* ------------------------------------------------------------------ */
  /* Services data (single source of truth: data/nav.json)               */
  /* ------------------------------------------------------------------ */

  async function loadDepartments(){
    try{
      const res = await fetch(ROOT + 'data/nav.json');
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const { departments } = await res.json();
      return Array.isArray(departments) ? departments : [];
    }catch(e){
      console.warn('[nav] could not load data/nav.json:', e);
      return [];
    }
  }

  function deptHref(d){
    return d.external ? d.url : (ROOT + d.path.replace(/^\//,''));
  }

  function deptKey(d){
    return d.name.toLowerCase().replace(/[^a-z]+/g, '-');
  }

  // Desktop dropdown
  function buildServicesDropdown(departments){
    const panel = document.getElementById('servicesPanel');
    if(!panel || !departments.length) return;
    panel.innerHTML = departments.map((d) => {
      const attrs = d.external ? 'target="_blank" rel="noopener"' : '';
      const extIcon = d.external ? `<svg class="ext-icon" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
      return `<a href="${deptHref(d)}" ${attrs} data-service="${deptKey(d)}"><strong>${d.name} ${extIcon}</strong><span>${d.description}</span></a>`;
    }).join('');
  }

  // [FIX] Mobile accordion sub-links were never populated (only the desktop
  // #servicesPanel was), so expanding "Services" on mobile showed nothing.
function buildMobileServices(departments){
    const overlay = document.getElementById('mobileNavOverlay');
    if(!overlay || !departments.length) return;
    const item = overlay.querySelector('[data-accordion]');
    if(!item) return;
    
    // Reuse an existing list in the markup if there is one; otherwise create it.
    let list = item.querySelector('[data-accordion-panel] ul, ul');
    if(!list){
      const panel = document.createElement('div');
      panel.className = 'mobile-nav-sub';
      panel.setAttribute('data-accordion-panel', '');
      list = document.createElement('ul');
      list.className = 'mobile-nav-sublist';
      panel.appendChild(list);
      item.appendChild(panel);
    }
    
    list.innerHTML = departments.map((d) => {
      const attrs = d.external ? ' target="_blank" rel="noopener"' : '';
      return `<li><a class="mobile-nav-subitem" href="${deptHref(d)}"${attrs} data-service="${deptKey(d)}">${d.name}</a></li>`;
    }).join('');
  }

  function wireDropdown(){
    const dd = document.getElementById('servicesDropdown');
    if(!dd) return;
    const toggle = dd.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dd.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', (e) => {
      if(!dd.contains(e.target)){ dd.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){ dd.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile menu                                                         */
  /* ------------------------------------------------------------------ */

  function wireMobileNav(){
    const toggle = document.getElementById('navToggle');
    const overlay = document.getElementById('mobileNavOverlay');
    const closeBtn = document.getElementById('mobileNavClose');
    if(!toggle || !overlay) return;

    const accordions = Array.from(overlay.querySelectorAll('[data-accordion]'));
    let lastFocused = null;

    function isOpen(){ return overlay.classList.contains('open'); }

    // [FIX] Collapsed accordion panels are made inert so their links can't be
    // tabbed to (a 0fr/overflow:hidden panel still leaves them focusable).
    function setAccordion(item, open){
      const btn = item.querySelector('.mobile-nav-link');
      const panel = item.querySelector('[data-accordion-panel]');
      item.toggleAttribute('data-open', open);
      if(btn) btn.setAttribute('aria-expanded', String(open));
      if(panel) panel.inert = !open;
    }

    function openMenu(){
      lastFocused = toggle;
      overlay.inert = false;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      // Lock scroll on both roots (iOS Safari ignores body-only locks)
      document.documentElement.classList.add('nav-open');
      document.body.classList.add('nav-open');
      // [FIX] no more toggle.textContent = 'CLOSE': the overlay has its own
      // Close button, and hard-coding uppercase here fought the brand styling.
      requestAnimationFrame(() => {
        const first = closeBtn || overlay.querySelector('a[href], button');
        if(first) first.focus();
      });
    }

    function closeMenu(restoreFocus = true){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.inert = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
      document.body.classList.remove('nav-open');
      accordions.forEach(item => setAccordion(item, false));
      if(restoreFocus && lastFocused) lastFocused.focus();
    }

    // Initial state: closed, links unreachable by keyboard
    overlay.inert = true;
    accordions.forEach(item => setAccordion(item, false));
    if(!toggle.hasAttribute('aria-controls')) toggle.setAttribute('aria-controls', overlay.id);
    toggle.setAttribute('aria-expanded', 'false');

    // Toggle button
    toggle.addEventListener('click', () => {
      if(isOpen()){ closeMenu(); } else { openMenu(); }
    });

    // Close button
    if(closeBtn){
      closeBtn.addEventListener('click', () => closeMenu());
    }

    // Close on Esc
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && isOpen()){ closeMenu(); }
    });

    // Close on ANY link click inside the overlay (covers injected links too).
    // Don't steal focus back to the toggle: the user is navigating.
    overlay.addEventListener('click', (e) => {
      if(e.target.closest('a')){ closeMenu(false); }
    });

    // Services accordion
    accordions.forEach(item => {
      const btn = item.querySelector('.mobile-nav-link');
      if(!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // keep the link-click delegation above from closing the menu
        setAccordion(item, !item.hasAttribute('data-open'));
      });
    });

    // Focus trap (skips anything hidden or inside a collapsed/inert panel)
    overlay.addEventListener('keydown', (e) => {
      if(e.key !== 'Tab') return;
      const focusable = Array.from(
        overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.closest('[inert]') && el.getClientRects().length > 0);
      if(!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    });

    // [FIX] If the viewport grows past the mobile breakpoint while the menu is
    // open (rotate, resize), close it so the scroll lock isn't left on.
    // Breakpoint-agnostic: the Menu button is hidden on desktop.
    window.addEventListener('resize', () => {
      if(isOpen() && getComputedStyle(toggle).display === 'none'){ closeMenu(false); }
    });
  }

  /**
   * Header visibility rule:
   * - While the hero is on screen, the header stays visible, transparent, overlaying it.
   * - Once the visitor scrolls past the hero, the header hides entirely.
   * - Scrolling back up into the hero brings it back transparent.
   */
  function wireHeaderBehaviour(){
    const header = document.getElementById('siteHeader');
    if(!header) return;
    const hero = document.querySelector('[data-hero]');
    if(!hero) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                header.classList.add('in-hero');
                header.classList.remove('is-hidden');
            } else {
                header.classList.remove('in-hero');
                header.classList.add('is-hidden');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    io.observe(hero);
  }

  function setYear(){
    const el = document.getElementById('year');
    if(el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await injectPartial('#header-slot', 'partials/header.html');
    await injectPartial('#footer-slot', 'partials/footer.html');

    const departments = await loadDepartments();
    buildServicesDropdown(departments);
    buildMobileServices(departments);

    wireDropdown();
    wireMobileNav();
    wireHeaderBehaviour();
    setYear();

    document.dispatchEvent(new CustomEvent('partials:ready'));
  });
})();