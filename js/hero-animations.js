import { reveal, revealStagger, animateCounters, animateButtons, initPageTransition } from './scroll-reveal.js';

export function initHeroAnimations() {
  initHeroFullHeight();
  
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    initPageTransition();
    animateButtons();
  }

  const content = hero.querySelector('.hero-content');
  if (content) {
    if (!prefersReducedMotion) {
      anime.timeline({ easing: 'easeOutExpo' })
        .add({ 
          targets: content.querySelector('h1'), 
          translateY: [80, 0], 
          opacity: [0, 1], 
          duration: 1200 
        })
        .add({ 
          targets: content.querySelector('.hero-lede'), 
          translateY: [50, 0], 
          opacity: [0, 1], 
          duration: 900 
        }, '-=700')
        .add({ 
          targets: content.querySelectorAll('.btn'), 
          translateY: [40, 0], 
          opacity: [0, 1], 
          scale: [0.95, 1],
          duration: 700, 
          delay: anime.stagger(120) 
        }, '-=500');

      const bg = hero.querySelector('.hero-bg img');
      if (bg) {
        let ticking = false;
        window.addEventListener('scroll', () => {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              const rect = hero.getBoundingClientRect();
              if (rect.bottom > 0 && rect.top < window.innerHeight) {
                const progress = 1 - rect.top / (rect.height + window.innerHeight);
                bg.style.transform = `translateY(${progress * 80}px) scale(${1 + progress * 0.08})`;
              }
              ticking = false;
            });
            ticking = true;
          }
        }, { passive: true });
      }
    } else {
      anime.set(content.querySelectorAll('*'), { opacity: 1, translateY: 0, scale: 1 });
    }
  }

  if (!prefersReducedMotion) {
    reveal('.section-head', { translateY: 50, duration: 900, stagger: 100, once: true });
    reveal('.card', { translateY: 60, duration: 1000, stagger: 100, once: true, scale: [0.94, 1] });
    reveal('.feature-item', { translateY: 50, duration: 900, stagger: 80, once: true });
    reveal('.stat', { translateY: 50, duration: 900, stagger: 80, once: true, scale: [0.9, 1] });
    reveal('.testimonial-card', { translateY: 60, duration: 1000, stagger: 120, once: true });
    reveal('.update-card', { translateY: 60, duration: 1000, stagger: 100, once: true });
    reveal('.dd-card', { translateY: 60, duration: 1000, stagger: 100, once: true });
    reveal('.team-mini .tag', { translateY: 30, opacity: [0, 1], duration: 600, stagger: 50, once: true });

    revealStagger('.metric-row', '.metric-row > div', { once: true });
    revealStagger('.grid.grid-4', '.grid-4 > *', { once: true });
    revealStagger('.grid.grid-3', '.grid-3 > *', { once: true });
    revealStagger('.feature-list', '.feature-item', { once: true });
    revealStagger('.dd-sectors', '.dd-sector-chip', { once: true });
    revealStagger('.platform-row', '.platform-btn', { once: true });

    animateCounters('[data-count], .stat b, .metric-row b, .hero-stats .stat b', { 
      duration: 2200, 
      easing: 'easeOutExpo' 
    });
  }

  const scrollCue = hero.querySelector('.scroll-cue');
  if (scrollCue && !prefersReducedMotion) {
    anime({
      targets: scrollCue.querySelector('.line'),
      scaleY: [0, 1, 0],
      duration: 2000,
      easing: 'easeInOutSine',
      loop: true,
      direction: 'alternate'
    });
  }
}

export function initHeroFullHeight() {
  const heroes = document.querySelectorAll('[data-hero]');
  heroes.forEach(hero => {
    hero.style.minHeight = '100dvh';
    hero.style.height = '100dvh';
    
    const heroInner = hero.querySelector('.hero-inner');
    if (heroInner) {
      heroInner.style.minHeight = '100dvh';
    }
  });
}