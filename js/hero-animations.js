/**
 * hero-animations.js — hero entrance + site-wide scroll reveals.
 * Scroll animation is IntersectionObserver + CSS (see scroll-reveal.js);
 * this module wires hero staggering, parallax, counters and transitions.
 */
import { reveal, revealStagger, animateCounters, initPageTransition } from './scroll-reveal.js';

const REDUCED = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHeroFullHeight() {
  document.querySelectorAll('[data-hero]').forEach(hero => {
    hero.style.minHeight = '100dvh';
    hero.style.height = '100dvh';
    const inner = hero.querySelector('.hero-inner');
    if (inner) inner.style.minHeight = '100dvh';
  });
}

function animateHeroEntrance(hero) {
  const content = hero.querySelector('.hero-content');
  if (!content) return;
  const items = content.querySelectorAll('h1, .hero-lede, .btn, .hero-eyebrow');
  if (!items.length || REDUCED()) {
    items.forEach(el => el.classList.add('in-view'));
    return;
  }
  items.forEach((el, i) => {
    el.classList.add('reveal', 'reveal-hero');
    el.style.setProperty('--reveal-delay', `${150 + i * 140}ms`);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    items.forEach(el => el.classList.add('in-view'));
  }));
}

function initHeroParallax(hero) {
  if (REDUCED()) return;
  const bg = hero.querySelector('.hero-bg img, .hero-bg video');
  if (!bg) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        // progress: 0 while the hero sits fully at the top of the page
        // (rect.top === 0), climbing to 1 once it has scrolled fully out
        // of view. Anchored to the hero's own height (not hero+viewport),
        // and clamped so it can never run past that range.
        const progress = Math.min(1, Math.max(0, -rect.top / rect.height));

        // Keep the downward drift within what the scale-up actually covers,
        // so the image can never slide down far enough to expose the hero's
        // own background above it. At scale (1 + progress*0.08), the image
        // grows by rect.height*0.04*progress on each edge — cap the drift
        // just under that so a gap can never open at the top.
        const maxDrift = rect.height * 0.035;
        bg.style.transform = `translateY(${(progress * maxDrift).toFixed(1)}px) scale(${(1 + progress * 0.08).toFixed(3)})`;
      }
      ticking = false;
    });
  }, { passive: true });
}

export function initHeroAnimations() {
  initHeroFullHeight();
  initPageTransition();

  const hero = document.querySelector('[data-hero]');
  if (hero) {
    animateHeroEntrance(hero);
    initHeroParallax(hero);
  }

  // Section heads rise; cards / features / stats cascade in sequence.
  reveal('.section-head', { variant: 'up', stagger: 100 });
  reveal('.section-head-simple', { variant: 'up', stagger: 100 });
  reveal('.card', { variant: 'up', stagger: 110 });
  reveal('.feature-item', { variant: 'left', stagger: 90 });
  reveal('.stat', { variant: 'scale', stagger: 90 });
  reveal('.testimonial-card', { variant: 'up', stagger: 130 });
  reveal('.update-card', { variant: 'up', stagger: 110 });
  reveal('.dd-card', { variant: 'up', stagger: 110 });
  reveal('.case-study-card', { variant: 'up', stagger: 110 });
  reveal('.case-study-section', { variant: 'up', stagger: 120 });

  // Numbers section: stagger the 4 stat cards
  revealStagger('.numbers-grid', '.stat-card', { variant: 'scale', stagger: 120, startDelay: 150 });

  // Vision + Mission section: text blocks from left, photo from right
  reveal('.vision-block', { variant: 'left', stagger: 150 });
  reveal('.mission-block', { variant: 'left', delay: 200, stagger: 150 });
  reveal('.vision-mission-photo', { variant: 'right', stagger: 150 });

  revealStagger('.metric-row', '.metric-row > div', { variant: 'scale' });
  revealStagger('.dd-sectors', '.dd-sector-chip', { variant: 'scale', stagger: 60 });
  revealStagger('.platform-row', '.platform-btn', { variant: 'fade', stagger: 60 });

  // Only elements with explicit data-count/prefix/suffix animate, so values
  // like "$2.1M" elsewhere are never mangled.
  animateCounters('[data-count]');
}