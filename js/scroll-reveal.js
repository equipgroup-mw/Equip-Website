export function reveal(selector, options = {}) {
  const defaults = {
    translateY: 60,
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo',
    stagger: 120,
    delay: 0,
    once: true,
    scale: [0.95, 1]
  };
  const cfg = { ...defaults, ...options };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        anime({
          targets: entry.target,
          translateY: [cfg.translateY, 0],
          opacity: cfg.opacity,
          scale: cfg.scale,
          duration: cfg.duration,
          easing: cfg.easing,
          delay: anime.stagger(cfg.stagger, { start: cfg.delay })
        });
        if (cfg.once) observer.unobserve(entry.target);
      } else if (!cfg.once) {
        anime.set(entry.target, { translateY: cfg.translateY, opacity: cfg.opacity[0], scale: cfg.scale[0] });
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

export function revealStagger(containerSelector, itemSelector, options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const items = container.querySelectorAll(itemSelector);
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        anime({
          targets: items,
          translateY: [60, 0],
          opacity: [0, 1],
          scale: [0.95, 1],
          duration: 900,
          easing: 'easeOutExpo',
          delay: anime.stagger(100, { start: 200 })
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  observer.observe(container);
}

export function animateCounters(selector, options = {}) {
  const defaults = {
    duration: 2000,
    easing: 'easeOutExpo',
    once: true
  };
  const cfg = { ...defaults, ...options };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count || el.textContent.replace(/[^0-9.]/g, ''));
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
        
        anime({
          targets: { value: 0 },
          value: target,
          duration: cfg.duration,
          easing: cfg.easing,
          round: decimals > 0 ? 1 / Math.pow(10, decimals) : 1,
          update: function(anim) {
            const val = anim.animatables[0].target.value;
            el.textContent = prefix + val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
          }
        });
        
        if (cfg.once) observer.unobserve(el);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

export function animateButtons() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      anime({
        targets: btn,
        scale: 1.03,
        boxShadow: '0 12px 32px rgba(13,33,54,0.2)',
        duration: 300,
        easing: 'easeOutExpo'
      });
    });
    btn.addEventListener('mouseleave', () => {
      anime({
        targets: btn,
        scale: 1,
        boxShadow: '0 4px 16px rgba(13,33,54,0.1)',
        duration: 300,
        easing: 'easeOutExpo'
      });
    });
    btn.addEventListener('mousedown', () => {
      anime({
        targets: btn,
        scale: 0.97,
        duration: 100,
        easing: 'easeOutExpo'
      });
    });
    btn.addEventListener('mouseup', () => {
      anime({
        targets: btn,
        scale: 1.03,
        duration: 100,
        easing: 'easeOutExpo'
      });
    });
  });
}

export function initPageTransition() {
  document.body.style.opacity = '0';
  anime({
    targets: document.body,
    opacity: [0, 1],
    duration: 600,
    easing: 'easeOutExpo'
  });

  document.querySelectorAll('a[href$=".html"]').forEach(link => {
    if (link.origin === window.location.origin && !link.target) {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          e.preventDefault();
          anime({
            targets: document.body,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInExpo',
            complete: () => { window.location.href = href; }
          });
        }
      });
    }
  });
}