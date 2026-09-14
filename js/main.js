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
    if(!host) return;
    try{
      const res = await fetch(ROOT + url);
      const html = await res.text();
      host.innerHTML = rewritePaths(html, ROOT);
    }catch(e){
      console.error('Could not load partial', url, e);
    }
  }

  function rewritePaths(html, root){
    // Rewrite href and src attributes that start with / to be relative to root
    // For root page (empty root), keep leading slash for absolute paths
    const prefix = root || '/';
    return html
      .replace(/href="\//g, `href="${prefix}`)
      .replace(/src="\//g, `src="${prefix}`)
      .replace(/action="\//g, `action="${prefix}`);
  }

  async function buildServicesDropdown(){
    const panel = document.getElementById('servicesPanel');
    if(!panel) return;
    try{
      const res = await fetch(ROOT + 'data/nav.json');
      const { departments } = await res.json();
      panel.innerHTML = departments.map(d => {
        const href = d.external ? d.url : (ROOT + d.path.replace(/^\//,''));
        const attrs = d.external ? 'target="_blank" rel="noopener"' : '';
        const extIcon = d.external ? `<svg class="ext-icon" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
        return `<a href="${href}" ${attrs}><strong>${d.name} ${extIcon}</strong><span>${d.description}</span></a>`;
      }).join('');
    }catch(e){ console.error('Could not load nav.json', e); }
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

  function wireMobileNav(){
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('mainNav');
    if(!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

  /**
   * Header visibility rule:
   * - While the hero (or, on pages with no hero, the page banner) is on screen,
   *   the header stays visible, transparent, overlaying it.
   * - Once the visitor scrolls past it, the header hides entirely.
   * - Scrolling back up to the hero brings it back.
   * - On pages with a short hero, once you're below it the header also hides on
   *   scroll-down and reappears on any scroll-up, so it's never permanently gone.
   */
  function wireHeaderBehaviour(){
    const header = document.getElementById('siteHeader');
    if(!header) return;
    const hero = document.querySelector('[data-hero]');
    let lastY = window.scrollY;
    let heroVisible = true;

    function setState(){
      if(heroVisible){
        header.classList.remove('is-hidden', 'is-solid');
        return;
      }
      header.classList.add('is-solid');
      const goingDown = window.scrollY > lastY && window.scrollY > 40;
      header.classList.toggle('is-hidden', goingDown);
      lastY = window.scrollY;
    }

    if(hero && 'IntersectionObserver' in window){
      const io = new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
        setState();
      }, { threshold: 0.12 });
      io.observe(hero);
    } else {
      heroVisible = false;
    }

    window.addEventListener('scroll', setState, { passive:true });
    setState();
  }

  function setYear(){
    const el = document.getElementById('year');
    if(el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await injectPartial('#header-slot', 'partials/header.html');
    await injectPartial('#footer-slot', 'partials/footer.html');
    await buildServicesDropdown();
    wireDropdown();
    wireMobileNav();
    wireHeaderBehaviour();
    setYear();
    document.dispatchEvent(new CustomEvent('partials:ready'));
  });
})();