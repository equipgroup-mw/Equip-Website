/**
 * scroll-reveal.js — premium scroll animations the performant way.
 *
 * Pattern (per the IntersectionObserver approach):
 *   1. JavaScript observes elements and toggles a class exactly when they
 *      enter/leave the viewport (cheap — no scroll listeners).
 *   2. CSS owns the actual animation (opacity / transform / blur transitions).
 *
 * Variants: data-reveal="up" (default) | "left" | "right" | "scale" | "fade"
 * Stagger:  put data-reveal-group on a container; children with [data-reveal]
 *           animate in sequence automatically.
 * Repeat:   add data-reveal-repeat to re-hide when scrolled out of view.
 */

const REDUCED = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Registry of reveal rules so content injected later (JSON-driven cards,
// grids, team lists) animates too. One MutationObserver covers the page.
const registry = [];
let moInstalled = false;

function matchesAny(node, sel) {
  if (node.matches && node.matches(sel)) return [node];
  if (node.querySelectorAll) return Array.from(node.querySelectorAll(sel));
  return [];
}

function installMutationObserver() {
  if (moInstalled || !('MutationObserver' in window)) return;
  moInstalled = true;
  const mo = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        registry.forEach(rule => {
          matchesAny(node, rule.selector).forEach(el => rule.apply(el));
        });
      });
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

function registerReveal(selector, apply) {
  registry.push({ selector, apply });
  installMutationObserver();
}

function observeOnce(el, io) {
  if (el.dataset.revealRepeat === undefined) io.unobserve(el);
}

/**
 * Watch every element matching `selector`, adding `.in-view` when visible.
 * Stagger is applied by element order within the matched set.
 */
export function reveal(selector, { variant = 'up', stagger = 90, delay = 0, once = true } = {}) {
  const els = Array.from(document.querySelectorAll(selector));
  if (!els.length || REDUCED()) {
    els.forEach(el => el.classList.add('in-view'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        if (once && !entry.target.hasAttribute('data-reveal-repeat')) io.unobserve(entry.target);
      } else if (entry.target.hasAttribute('data-reveal-repeat')) {
        entry.target.classList.remove('in-view');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  let index = els.length;
  const apply = (el) => {
    if (el.classList.contains('reveal')) return;
    el.classList.add('reveal', `reveal-${variant}`);
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', variant);
    el.style.setProperty('--reveal-delay', `${delay + (index++) * stagger}ms`);
    if (!once) el.setAttribute('data-reveal-repeat', '');
    io.observe(el);
  };
  els.forEach(apply);
  registerReveal(selector, apply);
}

/**
 * Stagger the items inside one container: the container crossing the
 * viewport fires the whole sequence with per-item delays.
 */
export function revealStagger(containerSelector, itemSelector, { variant = 'up', stagger = 110, startDelay = 120 } = {}) {
  const containers = Array.from(document.querySelectorAll(containerSelector));
  if (!containers.length) return;
  if (REDUCED()) {
    containers.forEach(c => c.querySelectorAll(itemSelector).forEach(el => el.classList.add('in-view')));
    return;
  }

  containers.forEach(container => {
    const items = Array.from(container.querySelectorAll(itemSelector));
    if (!items.length) return;
    items.forEach((el, i) => {
      el.classList.add('reveal', `reveal-${variant}`);
      el.style.setProperty('--reveal-delay', `${startDelay + i * stagger}ms`);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          items.forEach(el => el.classList.add('in-view'));
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    io.observe(container);
  });
}

/**
 * Dial-up / count-up numbers (stats, metrics, achievements).
 * Reads data-count, data-prefix, data-suffix, data-decimals, data-duration.
 * Triggered by IntersectionObserver; animated with rAF + easeOutExpo.
 */
export function animateCounters(selector, { duration = 2200 } = {}) {
  const els = Array.from(document.querySelectorAll(selector));
  if (!els.length) return;
  if (REDUCED()) return; // leave final text as authored

  const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const run = (el) => {
    const target = parseFloat(el.dataset.count ?? String(el.textContent).replace(/[^0-9.]/g, '')) || 0;
    const prefix = el.dataset.prefix ?? '';
    const suffix = el.dataset.suffix ?? '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
    const total = el.dataset.duration ? parseInt(el.dataset.duration, 10) : duration;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / total, 1);
      const val = target * easeOutExpo(p);
      el.textContent =
        prefix +
        val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
        suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Set the starting value so the count-up is visible from zero.
      const prefix = el.dataset.prefix ?? '';
      const suffix = el.dataset.suffix ?? '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
      el.textContent = prefix + (0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      io.unobserve(el);
      // Let the reveal settle, then count.
      setTimeout(() => run(el), 250);
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -5% 0px' });

  els.forEach(el => io.observe(el));
}

/**
 * Button micro-interactions are pure CSS (.btn:hover / :active / sheen).
 * Kept as a no-op for backwards compatibility with existing call sites.
 */
export function animateButtons() {
  return;
}

/**
 * Premium page transitions: a navy wipe covers the screen on load-out and
 * lifts away on load-in. CSS owns the motion; JS owns the timing.
 */
export function initPageTransition() {
  if (REDUCED()) return;
  let wipe = document.querySelector('.page-wipe');
  if (!wipe) {
    wipe = document.createElement('div');
    wipe.className = 'page-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wipe);
  }

  // Load-in: wipe lifts away.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('page-ready');
    wipe.classList.add('page-wipe--lift');
  }));

  // Load-out: wipe covers, then navigate.
  document.querySelectorAll('a[href$=".html"]').forEach(link => {
    if (link.target || link.origin !== window.location.origin) return;
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      e.preventDefault();
      wipe.classList.remove('page-wipe--lift');
      wipe.classList.add('page-wipe--cover');
      setTimeout(() => { window.location.href = href; }, 420);
    });
  });
}
