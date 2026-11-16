/**
 * timeline.js — "Equip through the years" animated timeline.
 *
 * Desktop (≥901px): horizontal SVG timeline, draws itself left→right,
 * then reveals each milestone (dot, stem, year, description) as the
 * main line reaches it.
 *
 * Mobile / portrait tablet (≤900px): vertical spine timeline; the spine
 * fills as the user scrolls and each milestone fades in as it enters
 * the viewport. Optionally, when the animation plays automatically after
 * the section scrolls into view, the page auto-scrolls to keep the
 * active card centred — but any touch/wheel input cancels the auto-scroll.
 *
 * Colours come from the global CSS vars in css/style.css — no hardcoded
 * brand hex values in this file.
 */
(function () {
  const section = document.getElementById('equip-evolution');
  if (!section) return;

  /* ---------------- Config ---------------- */
  const TOTAL_DURATION = 32000;
  const LINE_START_X = 122;
  const LINE_END_X = 1795;
  const AXIS_Y = 510;
  const LINE_DRAW_START = 400;
  const LINE_DRAW_END = 29000;

  /* ---------------- Milestones ---------------- */
  const milestones = [
    { year: '2015', x: 183,  direction: 'up',   stemLength: 325, lines: ['First client', 'trained in STATA'] },
    { year: '2016', x: 282,  direction: 'down', stemLength: 345, lines: ['We added writing', 'and translation'] },
    { year: '2019', x: 547,  direction: 'up',   stemLength: 325, lines: ['Official launch of', 'Equip with 1 staff', 'and 5 projects'] },
    { year: '2020', x: 720,  direction: 'down', stemLength: 345, lines: ['Staff grew to 3, set up', '4 departments (RPM,', 'DSS, WTS and BDS)'] },
    { year: '2021', x: 946,  direction: 'up',   stemLength: 325, lines: ['Launched auditing', 'of accounts'] },
    { year: '2022', x: 1125, direction: 'down', stemLength: 345, lines: ['We helped SMEs to', 'get over two Billion', 'Kwacha investment'] },
    { year: '2024', x: 1411, direction: 'up',   stemLength: 325, lines: ['Staff grew to 10,', 'we now have worked on', 'over 70 projects in', 'Malawi and other countries'] },
    { year: '2025', x: 1599, direction: 'down', stemLength: 345, lines: ['Staff grew to 14,', 'introduced 2 new', 'departments:', 'Data Division &', 'Clickbait Marketing'] }
  ];

  /* ---------------- Helpers ---------------- */
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  /* ---------------- Desktop: SVG build ---------------- */
  const svgNS = 'http://www.w3.org/2000/svg';
  const mainAxis = document.getElementById('equip-main-axis');
  const milestonesLayer = document.getElementById('equip-milestones-layer');
  const axisLength = LINE_END_X - LINE_START_X;

  let desktopItems = [];
  if (mainAxis && milestonesLayer) {
    mainAxis.style.strokeDasharray = axisLength;
    mainAxis.style.strokeDashoffset = axisLength;

    desktopItems = milestones.map((m) => {
      const isUp = m.direction === 'up';
      const stemEndY = isUp ? AXIS_Y - m.stemLength : AXIS_Y + m.stemLength;
      const progressRatio = (m.x - LINE_START_X) / axisLength;
      const triggerTime = LINE_DRAW_START + progressRatio * (LINE_DRAW_END - LINE_DRAW_START);

      const group = document.createElementNS(svgNS, 'g');

      const stem = document.createElementNS(svgNS, 'line');
      stem.setAttribute('class', 'equip-stem-line');
      stem.setAttribute('x1', m.x); stem.setAttribute('y1', AXIS_Y);
      stem.setAttribute('x2', m.x); stem.setAttribute('y2', stemEndY);
      stem.style.strokeDasharray = m.stemLength;
      stem.style.strokeDashoffset = m.stemLength;

      const pulse = document.createElementNS(svgNS, 'circle');
      pulse.setAttribute('class', 'equip-node-pulse');
      pulse.setAttribute('cx', m.x); pulse.setAttribute('cy', AXIS_Y); pulse.setAttribute('r', 15);

      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'equip-node-dot');
      dot.setAttribute('cx', m.x); dot.setAttribute('cy', AXIS_Y); dot.setAttribute('r', 15);

      const yearX = m.x - 30;
      const yearY = isUp ? AXIS_Y - 135 : AXIS_Y + 265;
      const yearText = document.createElementNS(svgNS, 'text');
      yearText.setAttribute('class', 'equip-year-label');
      yearText.setAttribute('x', yearX); yearText.setAttribute('y', yearY);
      yearText.setAttribute('transform', `rotate(-90, ${yearX}, ${yearY})`);
      yearText.textContent = m.year;

      const descX = m.x + 24;
      const descStartY = isUp
        ? AXIS_Y - m.stemLength + 34
        : AXIS_Y + m.stemLength - (m.lines.length - 1) * 31 - 12;
      const descText = document.createElementNS(svgNS, 'text');
      descText.setAttribute('class', 'equip-desc-text');
      descText.setAttribute('x', descX); descText.setAttribute('y', descStartY);
      if (m.year === '2025') descText.setAttribute('font-size', '22');

      m.lines.forEach((lineStr, idx) => {
        const tspan = document.createElementNS(svgNS, 'tspan');
        tspan.setAttribute('x', descX);
        tspan.setAttribute('dy', idx === 0 ? '0' : '31');
        tspan.textContent = lineStr;
        descText.appendChild(tspan);
      });

      group.appendChild(stem);
      group.appendChild(pulse);
      group.appendChild(dot);
      group.appendChild(yearText);
      group.appendChild(descText);
      milestonesLayer.appendChild(group);

      return { ...m, triggerTime, stem, pulse, dot, yearText, descText, yearX, yearY };
    });
  }

  /* ---------------- Mobile: list build ---------------- */
  const mobileList = document.getElementById('equip-mobile-list');
  const mobileSpineFill = document.getElementById('equip-mobile-spine-fill');

  const mobileItems = [];
  if (mobileList) {
    milestones.forEach((m, index) => {
      const li = document.createElement('li');
      li.className = 'equip-mobile-item';
      li.innerHTML = `
        <span class="equip-mobile-node"></span>
        <span class="equip-mobile-branch"></span>
        <div class="equip-mobile-card">
          <span class="equip-mobile-year">${m.year}</span>
          <p class="equip-mobile-desc">${m.lines.join(' ')}</p>
        </div>
      `;
      mobileList.appendChild(li);
      const triggerTime = LINE_DRAW_START + (index / (milestones.length - 1)) * (LINE_DRAW_END - LINE_DRAW_START);
      mobileItems.push({ el: li, triggerTime });
    });
  }

  /* ---------------- Animation state ---------------- */
  let elapsed = 0;
  let lastTimestamp = null;
  let isPlaying = false;
  let hasTriggeredOnScroll = false;
  let targetScrollY = window.pageYOffset;
  let isUserScrolling = false;

  window.addEventListener('touchstart', () => { isUserScrolling = true; }, { passive: true });
  window.addEventListener('wheel',       () => { isUserScrolling = true; }, { passive: true });

  /* ---------------- Frame renderer ---------------- */
  function renderFrame(ms) {
    const progress = clamp(
      (ms - LINE_DRAW_START) / (LINE_DRAW_END - LINE_DRAW_START),
      0,
      1
    );

    /* Desktop: SVG */
    if (mainAxis) {
      mainAxis.style.strokeDashoffset = axisLength * (1 - progress);
    }
    desktopItems.forEach((item) => {
      const localTime = ms - item.triggerTime;
      if (localTime <= 0) {
        item.dot.style.transform = 'scale(0)';
        item.pulse.style.opacity = 0;
        item.stem.style.strokeDashoffset = item.stemLength;
        item.yearText.style.opacity = 0;
        item.descText.style.opacity = 0;
        return;
      }

      const dotP = clamp(localTime / 450, 0, 1);
      item.dot.style.transform = `scale(${easeOutBack(dotP)})`;

      const pulseP = clamp(localTime / 900, 0, 1);
      item.pulse.style.transform = `scale(${0.8 + pulseP * 1.4})`;
      item.pulse.style.opacity = (1 - pulseP) * 0.75;

      const stemP = easeOutCubic(clamp((localTime - 180) / 800, 0, 1));
      item.stem.style.strokeDashoffset = item.stemLength * (1 - stemP);

      const yearP = easeOutCubic(clamp((localTime - 450) / 700, 0, 1));
      const slideOffset = (1 - yearP) * (item.direction === 'up' ? 24 : -24);
      item.yearText.style.opacity = yearP;
      item.yearText.setAttribute(
        'transform',
        `translate(0, ${slideOffset}) rotate(-90, ${item.yearX}, ${item.yearY})`
      );

      const descP = easeOutCubic(clamp((localTime - 700) / 800, 0, 1));
      const descSlideX = (1 - descP) * 18;
      item.descText.style.opacity = descP;
      item.descText.setAttribute('transform', `translate(${descSlideX}, 0)`);
    });

    /* Mobile: spine + card reveal */
    if (mobileSpineFill) {
      mobileSpineFill.style.height = `${progress * 100}%`;
    }

    let activeItemEl = null;
    mobileItems.forEach((item) => {
      if (ms >= item.triggerTime) {
        item.el.classList.add('is-revealed');
        activeItemEl = item.el;
      } else {
        item.el.classList.remove('is-revealed');
      }
    });

    /* Mobile auto-scroll target: centre the most recently revealed card */
    if (window.innerWidth <= 900 && isPlaying && activeItemEl && !isUserScrolling) {
      const rect = activeItemEl.getBoundingClientRect();
      const absoluteItemTop = rect.top + window.pageYOffset;
      targetScrollY = absoluteItemTop - (window.innerHeight / 2) + (rect.height / 2);
    }
  }

  /* ---------------- rAF loop ---------------- */
  function tick(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (isPlaying) {
      elapsed = Math.min(elapsed + delta, TOTAL_DURATION);
      renderFrame(elapsed);
      if (elapsed >= TOTAL_DURATION) isPlaying = false;
    }

    /* Mobile: lerped auto-scroll while playing and user isn't touching */
    if (window.innerWidth <= 900 && isPlaying && !isUserScrolling) {
      const currentScrollY = window.pageYOffset;
      const diff = targetScrollY - currentScrollY;
      if (Math.abs(diff) > 0.5) {
        window.scrollTo(0, currentScrollY + diff * 0.08);
      }
    }

    requestAnimationFrame(tick);
  }

  /* ---------------- Play / replay ---------------- */
  function startOrReplay() {
    elapsed = 0;
    lastTimestamp = null;
    isUserScrolling = false;
    isPlaying = true;
    renderFrame(0);
  }

  /* Auto-start once when the section first scrolls into view */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasTriggeredOnScroll) {
          hasTriggeredOnScroll = true;
          startOrReplay();
        }
      });
    },
    { threshold: 0.25 }
  );
  observer.observe(section);

  /* Replay buttons */
  const btnDesktop   = document.getElementById('equip-btn-replay-desktop');
  const btnMobileTop = document.getElementById('equip-btn-replay-mobile-top');
  if (btnDesktop)   btnDesktop.addEventListener('click',   () => { isUserScrolling = false; startOrReplay(); });
  if (btnMobileTop) btnMobileTop.addEventListener('click', () => { isUserScrolling = false; startOrReplay(); });

  /* First paint */
  renderFrame(0);
  requestAnimationFrame(tick);
})();