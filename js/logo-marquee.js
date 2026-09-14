export class LogoMarquee {
  constructor(container, { speed = 30, gap = 80 } = {}) {
    this.container = container;
    this.track = container.querySelector('.logo-track');
    this.speed = speed; // pixels per second
    this.gap = gap;
    this.position = 0;
    this.paused = false;
    this.rafId = null;
    this.lastTime = 0;
    this.resumeTimer = null;

    if (!this.track) {
      this.track = document.createElement('div');
      this.track.className = 'logo-track';
      this.track.style.display = 'flex';
      this.track.style.gap = `${this.gap}px`;
      this.track.style.willChange = 'transform';
      this.track.style.alignItems = 'center';
      this.container.appendChild(this.track);
    }

    this.cloneNodes();
    this.bindEvents();
    this.start();
  }

  cloneNodes() {
    const originals = Array.from(this.track.children).filter(el => !el.hasAttribute('aria-hidden'));
    if (originals.length === 0) return;

    let totalWidth = 0;
    originals.forEach(el => {
      totalWidth += el.offsetWidth + this.gap;
    });

    // Clone enough times to fill 3x viewport width for seamless looping
    while (this.track.scrollWidth < window.innerWidth * 3) {
      originals.forEach(el => {
        const clone = el.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        this.track.appendChild(clone);
      });
    }
    this.loopWidth = totalWidth; // One full set of originals
  }

  animate(time) {
    if (!this.lastTime) this.lastTime = time;
    const dt = (time - this.lastTime) / 1000; // delta time in seconds
    this.lastTime = time;

    if (!this.paused) {
      this.position -= this.speed * dt;
      // Seamless loop: when we've moved one full set width, jump back
      if (Math.abs(this.position) >= this.loopWidth) {
        this.position += this.loopWidth;
      }
      this.track.style.transform = `translateX(${this.position}px)`;
    }
    this.rafId = requestAnimationFrame(this.animate.bind(this));
  }

  start() { this.rafId = requestAnimationFrame(this.animate.bind(this)); }
  stop() { cancelAnimationFrame(this.rafId); }

  bindEvents() {
    // Pause on hover/focus
    this.container.addEventListener('mouseenter', () => this.paused = true);
    this.container.addEventListener('mouseleave', () => this.paused = false);
    this.container.addEventListener('focusin', () => this.paused = true);
    this.container.addEventListener('focusout', () => this.paused = false);

    // Pause when off-screen for performance
    const io = new IntersectionObserver(([e]) => {
      this.paused = !e.isIntersecting;
    }, { rootMargin: '100px' });
    io.observe(this.container);

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.step(-1);
      if (e.key === 'ArrowRight') this.step(1);
    });

    // Arrow button controls
    const prevBtn = this.container.querySelector('.marquee-arrow--prev');
    const nextBtn = this.container.querySelector('.marquee-arrow--next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.step(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.step(1));
    }
  }

  step(direction) {
    const first = this.track.querySelector(':not([aria-hidden])');
    const jump = first ? first.offsetWidth + this.gap : 200;
    this.position += direction * jump;
    this.track.style.transform = `translateX(${this.position}px)`;
    this.paused = true;
    clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => this.paused = false, 3000);
  }
}