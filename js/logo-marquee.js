/**
 * logo-marquee.js — seamless conveyor-belt logo strip (no dependency).
 *
 * Expected markup inside `container` (built by each page's inline script):
 *   <div class="logo-marquee" role="region" aria-label="Trusted partners" tabindex="0">
 *     <div class="logo-item">…</div> …
 *   </div>
 *   <button class="marquee-arrow marquee-arrow--prev">…</button>
 *   <button class="marquee-arrow marquee-arrow--next">…</button>
 *
 * Motion is a constant-velocity rAF loop (pause on hover/focus/off-screen),
 * so logos glide at a slow, readable pace and wrap seamlessly one at a time.
 */
export class LogoMarquee {
  constructor(container, { speed = 28, gap = 96 } = {}) {
    this.container = container;
    // Pages build a `.logo-marquee` track (older builds used `.logo-track`).
    this.track = container.querySelector('.logo-marquee') || container.querySelector('.logo-track');
    this.speed = speed; // pixels per second — slow enough to read each logo
    this.gap = gap;
    this.position = 0;
    this.paused = false;
    this.rafId = null;
    this.lastTime = 0;
    this.resumeTimer = null;

    if (!this.track) return;

    this.track.style.display = 'flex';
    this.track.style.gap = `${this.gap}px`;
    this.track.style.willChange = 'transform';
    this.track.style.alignItems = 'center';
    this.track.style.width = 'max-content';

    this.cloneNodes();
    this.bindEvents();
    this.start();
  }

  cloneNodes() {
    const originals = Array.from(this.track.children).filter(el => !el.hasAttribute('aria-hidden'));
    if (originals.length === 0) return;

    // Measure one full set (items + gaps) once everything has laid out.
    requestAnimationFrame(() => {
      let totalWidth = 0;
      originals.forEach(el => { totalWidth += el.offsetWidth + this.gap; });
      this.loopWidth = totalWidth;

      // Clone enough sets to cover ~3 viewport widths for a seamless wrap.
      const sets = Math.max(2, Math.ceil((window.innerWidth * 3) / Math.max(totalWidth, 1)));
      for (let s = 1; s < sets; s++) {
        originals.forEach(el => {
          const clone = el.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.tabIndex = -1;
          this.track.appendChild(clone);
        });
      }
    });
    // Fallback until measured.
    this.loopWidth = this.track.scrollWidth || window.innerWidth;
  }

  animate(time) {
    if (!this.lastTime) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05); // clamp tab-switch jumps
    this.lastTime = time;

    if (!this.paused && this.loopWidth > 0) {
      this.position -= this.speed * dt;
      // Seamless wrap: jump forward exactly one set width.
      if (Math.abs(this.position) >= this.loopWidth) {
        this.position += this.loopWidth;
      }
      this.track.style.transform = `translateX(${this.position}px)`;
    }
    this.rafId = requestAnimationFrame(this.animate.bind(this));
  }

  start() {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(this.animate.bind(this));
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  bindEvents() {
    // Pause on hover/focus so visitors can read each logo.
    this.container.addEventListener('mouseenter', () => { this.paused = true; });
    this.container.addEventListener('mouseleave', () => { this.paused = false; });
    this.container.addEventListener('focusin', () => { this.paused = true; });
    this.container.addEventListener('focusout', () => { this.paused = false; });

    // Pause when off-screen (performance).
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        this.paused = !e.isIntersecting;
      }, { rootMargin: '100px' });
      io.observe(this.container);
    }

    // Keyboard: arrows nudge one logo at a time.
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.step(1);
      if (e.key === 'ArrowRight') this.step(-1);
    });

    const prevBtn = this.container.querySelector('.marquee-arrow--prev');
    const nextBtn = this.container.querySelector('.marquee-arrow--next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.step(1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.step(-1));

    window.addEventListener('resize', () => { this.lastTime = 0; });
  }

  step(direction) {
    const first = this.track.querySelector(':not([aria-hidden])');
    const jump = first ? first.offsetWidth + this.gap : 240;
    this.position += direction * jump;
    this.track.style.transform = `translateX(${this.position}px)`;
    // Briefly hold still so the nudge is readable, then resume the belt.
    this.paused = true;
    clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => { this.paused = false; }, 3000);
  }
}
