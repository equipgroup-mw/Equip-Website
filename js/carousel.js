/**
 * carousel.js
 * Testimonial carousel only.
 * Logo marquee is now handled by logo-marquee.js
 */
(function(){
  const ROOT = document.documentElement.dataset.root || '';

  const ARROW_LEFT = `<svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ARROW_RIGHT = `<svg viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function buildCarousel({ mount, itemsHtml, itemSelector }){
    mount.innerHTML = `
      <div class="carousel">
        <div class="carousel-track" tabindex="0" aria-label="Carousel, use arrow keys or the controls below to browse">${itemsHtml}</div>
        <div class="carousel-controls">
          <div class="carousel-dots" role="tablist"></div>
          <div class="carousel-arrows">
            <button type="button" class="prev" aria-label="Previous">${ARROW_LEFT}</button>
            <button type="button" class="next" aria-label="Next">${ARROW_RIGHT}</button>
          </div>
        </div>
      </div>`;

    const track = mount.querySelector('.carousel-track');
    const dotsWrap = mount.querySelector('.carousel-dots');
    const prevBtn = mount.querySelector('.prev');
    const nextBtn = mount.querySelector('.next');
    const items = Array.from(track.querySelectorAll(itemSelector));

    items.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to item ${i+1}`);
      dot.addEventListener('click', () => scrollToIndex(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function visibleCount(){
      const itemWidth = items[0]?.getBoundingClientRect().width || track.clientWidth;
      return Math.max(1, Math.round(track.clientWidth / itemWidth));
    }

    function currentIndex(){
      const scrollLeft = track.scrollLeft;
      let closest = 0, min = Infinity;
      items.forEach((item, i) => {
        const d = Math.abs(item.offsetLeft - scrollLeft);
        if(d < min){ min = d; closest = i; }
      });
      return closest;
    }

    function scrollToIndex(i){
      i = Math.max(0, Math.min(items.length - 1, i));
      const itemWidth = items[0].getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      track.scrollTo({ left: i * (itemWidth + gap), behavior: 'smooth' });
    }

    function currentIndex(){
      const scrollLeft = track.scrollLeft;
      const itemWidth = items[0].getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return Math.max(0, Math.min(items.length - 1, Math.round(scrollLeft / (itemWidth + gap))));
    }

    function updateUI(){
      const idx = currentIndex();
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    }

    prevBtn.addEventListener('click', () => scrollToIndex(currentIndex() - 1));
    nextBtn.addEventListener('click', () => scrollToIndex(currentIndex() + 1));
    track.addEventListener('scroll', () => { window.requestAnimationFrame(updateUI); }, { passive:true });
    track.addEventListener('keydown', (e) => {
      if(e.key === 'ArrowRight'){ scrollToIndex(currentIndex()+1); }
      if(e.key === 'ArrowLeft'){ scrollToIndex(currentIndex()-1); }
    });
    window.addEventListener('resize', updateUI);
    updateUI();
  }

  async function initTestimonials(){
    const mount = document.querySelector('[data-testimonials]');
    if(!mount) return;
    const res = await fetch(ROOT + 'data/testimonials.json');
    const { testimonials } = await res.json();
    const html = testimonials.map(t => `
      <article class="testimonial-card">
        <div>
          <div class="quote-mark">&ldquo;</div>
          <p>${t.quote}</p>
        </div>
        <div class="testimonial-who">
          <b>${t.name}</b>
          <span>${t.title}</span>
        </div>
      </article>`).join('');
    buildCarousel({ mount, itemsHtml: html, itemSelector: '.testimonial-card' });
  }

  document.addEventListener('partials:ready', () => {
    initTestimonials();
  });
})();