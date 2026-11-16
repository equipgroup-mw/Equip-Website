/**
 * main.js
 * Handles: shared header/footer injection, the Services dropdown (built from
 * data/nav.json so departments can be added/removed without touching code),
 * the mobile menu, and the "header only visible in the hero" scroll behaviour.
 */
(function(){
  window.ROOT = document.documentElement.dataset.root || ''; // e.g. "../" on nested pages

  async function injectPartial(selector, url){
    const host = document.querySelector(selector);
    if(!host){ return false; }
    try{
      const res = await fetch(window.ROOT + url);
      if(!res.ok) throw new Error(url + ' → HTTP ' + res.status);
      const html = await res.text();
      if(!html.trim()) throw new Error(url + ' → empty response');
      host.innerHTML = rewritePaths(html, window.ROOT);
      return true;
    }catch(e){
      host.innerHTML = '<div style="padding:1rem;background:#fee;border:1px solid #f88;color:#800;font-family:monospace;font-size:.8rem">Failed to load '+url+': '+e.message+'</div>';
      return false;
    }
  }

  function rewritePaths(html, root){
    return html.replace(/((?:href|src|action|poster)=["'])(\/[^\s"'>]+)(["'])/g, (match, prefix, path, suffix) => {
      if(path.startsWith('//')) return match;
      return prefix + root + path.slice(1) + suffix;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Services data (single source of truth: data/nav.json)               */
  /* ------------------------------------------------------------------ */

  async function loadDepartments(){
    try{
      const res = await fetch(window.ROOT + 'data/nav.json');
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const { departments } = await res.json();
      return Array.isArray(departments) ? departments : [];
    }catch(e){
      console.warn('[nav] could not load data/nav.json:', e);
      return [];
    }
  }

  function deptHref(d){
    return d.external ? d.url : (window.ROOT + d.path.replace(/^\//,''));
  }

  function deptKey(d){
    return d.name.toLowerCase().replace(/[^a-z]+/g, '-');
  }

  // Desktop dropdown — full-screen Services navigation
  function buildServicesDropdown(departments) {
    const panel = document.getElementById('servicesPanel');
    if (!panel || !departments.length) return;

    panel.classList.add('services-mega-panel');

    // Existing photograph — no captions or overlays added.
    const imagePanel = document.createElement('div');
    imagePanel.className = 'services-mega-image';

    // Right-hand navigation panel
    const content = document.createElement('div');
    content.className = 'services-mega-content';

    // Close control
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'services-mega-close';
    closeButton.textContent = 'CLOSE';
    closeButton.setAttribute('aria-label', 'Close services navigation');

    const links = document.createElement('nav');
    links.className = 'services-mega-links';
    links.setAttribute('aria-label', 'Services');

    departments.forEach((d, index) => {
      const link = document.createElement('a');

      link.href = deptHref(d);
      link.dataset.service = deptKey(d);
      link.style.setProperty('--link-index', index);

      if (d.external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

      link.textContent = d.name;
      links.appendChild(link);
    });

    // Reuse the social links from the actual website footer.
    const footer = document.querySelector('#footer-slot');
    const footerSocials = document.createElement('div');
    footerSocials.className = 'services-mega-socials';

    if (footer) {
      const socialLinks = Array.from(
        footer.querySelectorAll('a[href]')
      ).filter(link => {
        try {
          const host = new URL(link.href).hostname.replace(/^www\./, '');
          return [
            'facebook.com',
            'linkedin.com',
            'instagram.com',
            'youtube.com',
            'x.com'
          ].some(domain => host === domain || host.endsWith('.' + domain));
        } catch {
          return false;
        }
      });

      socialLinks.forEach(original => {
        const link = original.cloneNode(true);
        link.className = 'services-mega-social-link';
        link.removeAttribute('style');
        footerSocials.appendChild(link);
      });
    }

    content.append(closeButton, links);

    if (footerSocials.children.length) {
      content.appendChild(footerSocials);
    }

    panel.replaceChildren(imagePanel, content);
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

  // Desktop dropdown wiring — full-screen open/close with scroll lock
  function wireDropdown() {
    const dd = document.getElementById('servicesDropdown');
    if (!dd) return;

    const toggle = dd.querySelector('.dropdown-toggle');
    const panel = document.getElementById('servicesPanel');
    const closeButton = panel?.querySelector('.services-mega-close');

    if (!toggle || !panel || !closeButton) return;

    function openMenu() {
      dd.classList.add('is-open');
      document.body.classList.add('services-menu-open');

      toggle.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');

      panel.inert = false;

      requestAnimationFrame(() => {
        closeButton.focus();
      });
    }

    function closeMenu(restoreFocus = true) {
      dd.classList.remove('is-open');
      document.body.classList.remove('services-menu-open');

      toggle.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');

      panel.inert = true;

      if (restoreFocus) toggle.focus();
    }

    // Initial closed state
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    toggle.setAttribute('aria-controls', 'servicesPanel');

    toggle.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      if (dd.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    closeButton.addEventListener('click', () => closeMenu());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && dd.classList.contains('is-open')) {
        closeMenu();
      }
    });

    // Close after choosing an internal service.
    panel.addEventListener('click', e => {
      const link = e.target.closest('.services-mega-links a');

      if (link && !link.target) {
        closeMenu(false);
      }
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

    const isContact = window.location.pathname.includes('contact.html');
    if(isContact){
      header.classList.add('solid');
      header.classList.remove('is-hidden');
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                header.classList.add('in-hero');
                header.classList.remove('is-hidden');
                header.classList.remove('solid');
            } else {
                header.classList.remove('in-hero');
                header.classList.remove('solid');
                if(!isContact) header.classList.add('is-hidden');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    io.observe(hero);
  }

  function setYear(){
    const el = document.getElementById('year');
    if(el) el.textContent = new Date().getFullYear();
  }

  /* Highlight the nav link whose href matches the current path, so "Our Work"
     (and any other nav link) shows its current-page state. Works for root and
     nested pages because injectPartial rewrites root-absolute hrefs to be
     relative to the page. */
  function setActiveNavLink(){
    const currentPath = window.location.pathname;
    document.querySelectorAll('#mainNav a[href], .mobile-nav-link[href]').forEach(a=>{
      try{
        const hrefPath = new URL(a.href, window.location.href).pathname;
        a.setAttribute('aria-current', hrefPath === currentPath ? 'page' : null);
      }catch(e){
        /* ignore unparseable hrefs */
      }
    });
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
    wireServicesScroll();
    setYear();
    setActiveNavLink();

    document.dispatchEvent(new CustomEvent('partials:ready'));
  });
})();

/* ------------------------------------------------------------------ */
/* Services hero scroll-pin                                           */
/* When the services section reaches the top of the viewport, the
   curtain pins to the top. Scrolling further translates the curtain
   up (-100%) to reveal the service cards underneath. Scrolling back
   up reverses the effect. Disabled on mobile (<=768px).            */
/* ------------------------------------------------------------------ */
function wireServicesScroll(){
  const section = document.querySelector('.services-hero-section');
  const curtain = document.querySelector('.services-hero-curtain');
  if(!section || !curtain) return;

  if(window.matchMedia('(max-width: 768px)').matches) return;

  let isPinned = false;
  let isRevealed = false;
  let ticking = false;

  function update(){
    const rect = section.getBoundingClientRect();
    const curtainHeight = curtain.offsetHeight;

    if(rect.top <= 0 && rect.bottom > curtainHeight){
      if(!isPinned){
        curtain.classList.add('pinned');
        isPinned = true;
      }
      const scrolledPast = Math.abs(Math.min(rect.top, 0));
      if(scrolledPast >= curtainHeight){
        if(!isRevealed){
          curtain.classList.add('revealed');
          isRevealed = true;
        }
      } else {
        if(isRevealed){
          curtain.classList.remove('revealed');
          isRevealed = false;
        }
      }
    } else {
      if(isPinned){
        curtain.classList.remove('pinned');
        isPinned = false;
      }
      if(isRevealed){
        curtain.classList.remove('revealed');
        isRevealed = false;
      }
    }
  }

  function onScroll(){
    if(!ticking){
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
