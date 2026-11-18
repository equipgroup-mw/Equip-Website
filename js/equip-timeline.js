/* js/equip-timeline.js
   Animation for the "Company Milestones" timeline (partials/equip-timeline.html).
   Load this AFTER the partial has been inserted into the page. */
function eqtInit(root) {

  /* ==========================================================
     CONFIG — tweak timings here (milliseconds)
     ========================================================== */
  const TOTAL_DURATION   = 29000;
  const LINE_DRAW_START  = 1800;
  const LINE_DRAW_END    = 25500;
  const NODE_R           = 53;
  const DOT_OFFSET       = 84;

  const RIBBON_D =
    "M -12 712 C 40 684 88 652 122 608 " +
    "C 190 600 270 585 355 560 " +
    "C 430 535 490 515 555 497 " +
    "C 620 485 690 470 747 459 " +
    "C 745 380 780 330 868 312 " +
    "C 940 290 1000 330 1043 426 " +
    "C 1090 400 1130 360 1181 330 " +
    "C 1250 330 1290 390 1327 456 " +
    "C 1350 445 1400 430 1500 380";

  const milestones = [
    { year:"2015", icon:"i-train",  cx:122,  cy:608, dir:"up",   tx:64,   yx:64,   lines:["First client","trained in STATA."] },
    { year:"2016", icon:"i-write",  cx:355,  cy:560, dir:"down", tx:312,  yx:312,  lines:["We added writing","and translation."] },
    { year:"2019", icon:"i-rocket", cx:555,  cy:497, off:72, dir:"up",   tx:494,  yx:504,  lines:["Official launch of","Equip with 1 staff","and 5 projects."] },
    { year:"2020", icon:"i-team",   cx:747,  cy:459, dir:"down", tx:667,  yx:706,  lines:["Staff grew to 3, set up","4 departments (RPM,","DSS, WTS and BDS)."] },
    { year:"2021", icon:"i-audit",  cx:868,  cy:312, dir:"up",   tx:811,  yx:811,  lines:["Launched auditing","of accounts."] },
    { year:"2022", icon:"i-deal",   cx:1043, cy:426, dir:"down", tx:972,  yx:1004, lines:["We helped SMEs to","get over two Billion","Kwacha investment."] },
    { year:"2024", icon:"i-globe",  cx:1181, cy:330, dir:"up",   tx:1110, yx:1110, lines:["Staff grew to 10,","we now have worked","on over 70 projects in","Malawi and other","countries."] },
    { year:"2025", icon:"i-org",    cx:1327, cy:456, off:72, dir:"down", tx:1265, yx:1265, lines:["Staff grown to 14,","introduced 2 new","departments","(Data Division &","Digital Marketing)."] }
  ];

  /* ==========================================================
     HELPERS
     ========================================================== */
  const $ = id => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const seg = (ms, start, dur) => clamp((ms - start) / dur);

  /* Same query as the CSS: vertical list on phones, portrait tablets & narrow windows */
  const mq = window.matchMedia("(max-width: 900px), (max-aspect-ratio: 1/1)");
  const isMobile = () => mq.matches;

  /* ==========================================================
     FULL-SCREEN FIT: if the site header is fixed/sticky, subtract its
     height so the scene fits exactly in the visible viewport.
     ========================================================== */
  function updateHeaderOffset() {
    let offset = 0;
    const header = document.querySelector("#header-slot > *") || document.querySelector("body > header");
    if (header && !isMobile()) {
      const pos = getComputedStyle(header).position;
      if (pos === "fixed" || pos === "sticky") offset = Math.round(header.getBoundingClientRect().height);
    }
    root.style.setProperty("--eqt-offset", offset + "px");
  }
  updateHeaderOffset();
  addEventListener("resize", updateHeaderOffset);
  addEventListener("load", updateHeaderOffset);
  setTimeout(updateHeaderOffset, 400);
  setTimeout(updateHeaderOffset, 1500);

  /* ==========================================================
     DESKTOP SCENE SETUP
     ========================================================== */
  const ribbon = $("eqt-ribbon");
  const track  = $("eqt-ribbon-track");
  const comet  = $("eqt-comet");
  const layer  = $("eqt-milestones-layer");
  ribbon.setAttribute("d", RIBBON_D);
  track.setAttribute("d", RIBBON_D);
  ribbon.style.strokeDasharray = 1000;
  ribbon.style.strokeDashoffset = 1000;

  const totalLen = ribbon.getTotalLength();

  function lengthAtPoint(x, y) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= 1500; i++) {
      const p = ribbon.getPointAtLength((i / 1500) * totalLen);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { bestD = d; best = i / 1500; }
    }
    return best;
  }

  const items = milestones.map(m => {
    const up = m.dir === "up";
    const sign = up ? -1 : 1;
    const frac = lengthAtPoint(m.cx, m.cy);
    const lead = (NODE_R + 18) / totalLen;
    const trigger = LINE_DRAW_START + clamp(frac - lead) * (LINE_DRAW_END - LINE_DRAW_START);

    const g = svgEl("g", { class: "eqt-node" }, layer);

    const off = m.off || DOT_OFFSET;
    const dotY = m.cy + sign * off;
    const stemLen = off - NODE_R;
    const stem = svgEl("line", {
      x1: m.cx, y1: m.cy + sign * NODE_R, x2: m.cx, y2: dotY,
      stroke: "#a8935a", "stroke-width": 2.2, "stroke-linecap": "round"
    }, g);
    stem.style.strokeDasharray = stemLen;
    stem.style.strokeDashoffset = stemLen;
    const endDot = svgEl("g", { transform: `translate(${m.cx} ${dotY}) scale(0)` }, g);
    svgEl("circle", { r: 5.5, fill: "#a8935a" }, endDot);

    const nodeG = svgEl("g", { transform: `translate(${m.cx} ${m.cy})` }, g);
    const hover = svgEl("g", { class: "eqt-node-hover" }, nodeG);
    const pulse = svgEl("circle", { r: NODE_R, fill: "none", stroke: "#a8935a", "stroke-width": 2, opacity: 0 }, nodeG);
    const pop = svgEl("g", { transform: "scale(0)" }, hover);
    const ring = svgEl("circle", {
      class: "eqt-node-ring", r: NODE_R - 1.5, fill: "#f3efe8", "fill-opacity": 0,
      stroke: "#a8935a", "stroke-width": 3, pathLength: 100, transform: "rotate(-90)"
    }, pop);
    ring.style.strokeDasharray = 100;
    ring.style.strokeDashoffset = 100;
    const iconWrap = svgEl("g", { opacity: 0 }, pop);
    const iconInner = svgEl("g", { transform: "scale(0.7)" }, iconWrap);
    const use = svgEl("use", { x: -37, y: -37, width: 74, height: 74, class: "eqt-icon" }, iconInner);
    use.setAttribute("href", "#eqt-" + m.icon);

    const n = m.lines.length;
    const lineH = 23, yearGap = 33;
    let firstY, yearY;
    if (up) { firstY = dotY - 22 - (n - 1) * lineH; yearY = firstY - yearGap; }
    else    { yearY = dotY + 42; firstY = yearY + yearGap; }

    const yearG = svgEl("g", { opacity: 0 }, g);
    const yearT = svgEl("text", { class: "eqt-year", x: m.yx, y: yearY, "font-size": 34 }, yearG);
    yearT.textContent = m.year;

    const lineGs = m.lines.map((str, i) => {
      const lg = svgEl("g", { opacity: 0 }, g);
      const t = svgEl("text", { class: "eqt-desc", x: m.tx, y: firstY + i * lineH, "font-size": 20 }, lg);
      t.textContent = str;
      return lg;
    });

    return { m, up, trigger, stem, stemLen, endDot, dotY, pop, ring, iconWrap, iconInner, pulse, yearG, lineGs };
  });

  const T = { t1: $("eqt-t1g"), t2: $("eqt-t2g"), rule: $("eqt-t-rule"), t3: $("eqt-t3g"), t4: $("eqt-t4g") };
  const ruleLen = 521;
  T.rule.style.strokeDasharray = ruleLen;
  T.rule.style.strokeDashoffset = ruleLen;

  /* ==========================================================
     MOBILE SETUP
     ========================================================== */
  const mList = $("eqt-m-list");
  const mFill = $("eqt-m-fill");
  const mobileItems = items.map(it => {
    const li = document.createElement("li");
    li.className = "eqt-m-item";
    li.innerHTML =
      `<span class="eqt-m-node"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#eqt-${it.m.icon}"/></svg></span>` +
      `<div class="eqt-m-card"><span class="eqt-m-year">${it.m.year}</span>` +
      `<p class="eqt-m-desc">${it.m.lines.join(" ")}</p></div>`;
    mList.appendChild(li);
    return { el: li, trigger: it.trigger };
  });

  /* ==========================================================
     RENDER
     ========================================================== */
  let elapsed = 0, lastTs = null, isPlaying = false, hasTriggered = false;
  let targetScrollY = window.pageYOffset, isUserScrolling = false;
  let hasReplayed = false;
  let rootInView = false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  addEventListener("touchstart", () => { isUserScrolling = true; }, { passive: true });
  addEventListener("wheel",      () => { isUserScrolling = true; }, { passive: true });

  function fadeSlide(g, p, dx, dy) {
    g.setAttribute("opacity", p);
    g.setAttribute("transform", `translate(${(1 - p) * dx} ${(1 - p) * dy})`);
  }

  function renderFrame(ms) {
    fadeSlide(T.t1, easeOutCubic(seg(ms, 150, 900)),  0, 26);
    fadeSlide(T.t2, easeOutCubic(seg(ms, 380, 900)),  0, 26);
    T.rule.style.strokeDashoffset = ruleLen * (1 - easeOutCubic(seg(ms, 800, 900)));
    fadeSlide(T.t3, easeOutCubic(seg(ms, 1000, 800)), 0, 14);
    fadeSlide(T.t4, easeOutCubic(seg(ms, 1200, 800)), 0, 14);

    const progress = seg(ms, LINE_DRAW_START, LINE_DRAW_END - LINE_DRAW_START);
    ribbon.style.strokeDashoffset = 1000 * (1 - progress);

    const head = ribbon.getPointAtLength(progress * totalLen);
    comet.setAttribute("cx", head.x);
    comet.setAttribute("cy", head.y);
    const cometIn  = seg(ms, LINE_DRAW_START, 400);
    const cometOut = 1 - seg(ms, LINE_DRAW_END, 700);
    comet.setAttribute("opacity", progress <= 0 ? 0 : cometIn * cometOut);

    items.forEach(it => {
      const lt = ms - it.trigger;
      if (lt <= 0) {
        it.pop.setAttribute("transform", "scale(0)");
        it.ring.style.strokeDashoffset = 100;
        it.ring.setAttribute("fill-opacity", 0);
        it.iconWrap.setAttribute("opacity", 0);
        it.pulse.setAttribute("opacity", 0);
        it.stem.style.strokeDashoffset = it.stemLen;
        it.endDot.setAttribute("transform", `translate(${it.m.cx} ${it.dotY}) scale(0)`);
        it.yearG.setAttribute("opacity", 0);
        it.lineGs.forEach(l => l.setAttribute("opacity", 0));
        return;
      }

      const popP = easeOutBack(seg(lt, 0, 600));
      it.pop.setAttribute("transform", `scale(${0.35 + 0.65 * popP})`);
      it.ring.style.strokeDashoffset = 100 * (1 - easeOutCubic(seg(lt, 0, 800)));
      it.ring.setAttribute("fill-opacity", easeOutCubic(seg(lt, 150, 500)));

      const iconP = seg(lt, 300, 600);
      it.iconWrap.setAttribute("opacity", easeOutCubic(iconP));
      it.iconInner.setAttribute("transform", `scale(${0.7 + 0.3 * easeOutBack(iconP)})`);

      const pulseP = seg(lt, 100, 1000);
      it.pulse.setAttribute("transform", `scale(${1 + pulseP * 0.55})`);
      it.pulse.setAttribute("opacity", (1 - pulseP) * 0.7);

      it.stem.style.strokeDashoffset = it.stemLen * (1 - easeOutCubic(seg(lt, 450, 550)));
      const dotP = easeOutBack(seg(lt, 900, 450));
      it.endDot.setAttribute("transform", `translate(${it.m.cx} ${it.dotY}) scale(${dotP})`);

      const yp = easeOutCubic(seg(lt, 1000, 700));
      fadeSlide(it.yearG, yp, 0, it.up ? 16 : -16);
      it.lineGs.forEach((lg, i) => {
        const p = easeOutCubic(seg(lt, 1300 + i * 140, 650));
        fadeSlide(lg, p, 14, 0);
      });
    });

    mFill.style.height = `${progress * 100}%`;

    /* Mobile reveal is driven by the m-fill bar's progress against each
       card's TOP edge, so a card lights up the moment the bar reaches it. */
    const stage = mFill.parentElement.parentElement;   // .eqt-mobile-stage
    const trackH = mFill.parentElement.clientHeight || 1;
    const fillPx = (parseFloat(mFill.style.height) / 100) * trackH;
    let active = null;

    mobileItems.forEach(mi => {
      const node = mi.el.querySelector(".eqt-m-node");
      const fromTop = node
        ? node.getBoundingClientRect().top - stage.getBoundingClientRect().top
        : Infinity;
      const revealed = fillPx >= fromTop - 12;
      mi.el.classList.toggle("eqt-revealed", revealed);
      if (revealed) active = mi.el;
    });

    if (isMobile() && isPlaying && active && !isUserScrolling && !hasReplayed && rootInView) {
      const r = active.getBoundingClientRect();
      targetScrollY = r.top + pageYOffset - innerHeight / 2 + r.height / 2;
    }
  }

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    const delta = ts - lastTs;
    lastTs = ts;

    if (isPlaying) {
      elapsed = Math.min(elapsed + delta, TOTAL_DURATION);
      renderFrame(elapsed);
      if (elapsed >= TOTAL_DURATION) isPlaying = false;
    }
    if (isMobile() && isPlaying && !isUserScrolling && !hasReplayed && rootInView) {
      const cur = pageYOffset, diff = targetScrollY - cur;
      if (Math.abs(diff) > 0.5) scrollTo(0, cur + diff * 0.08);
    }
    requestAnimationFrame(tick);
  }

  function startOrReplay() {
    isUserScrolling = false;
    lastTs = null;
    if (hasTriggered) hasReplayed = true;
    if (reduceMotion) { elapsed = TOTAL_DURATION; isPlaying = false; renderFrame(TOTAL_DURATION); return; }
    elapsed = 0;
    isPlaying = true;
    renderFrame(0);
  }

  /* Start once the section is mostly on screen */
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      rootInView = e.isIntersecting;
      if (e.isIntersecting && !hasTriggered) { hasTriggered = true; startOrReplay(); }
    });
  }, { threshold: 0.4 }).observe(root);

  const rd = $("eqt-btn-replay-desktop"); if (rd) rd.addEventListener("click", startOrReplay);
  const rm = $("eqt-btn-replay-mobile"); if (rm) rm.addEventListener("click", startOrReplay);

  renderFrame(0);
  requestAnimationFrame(tick);
}

/* ============================================================
   MARKUP SAFETY NET
   The partial normally supplies all of this markup. If any piece is
   missing when the script runs (late injection, a proxy/minifier or a
   dev-server rewriting the fetched HTML, etc.) it is rebuilt here
   from the same source, and a console warning says what was missing.
   ============================================================ */
const EQT_SPRITE = `<svg class="eqt-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <defs>
      <!-- 1 · Presenter + chart -->
      <symbol id="eqt-i-train" viewBox="0 0 64 64">
        <circle cx="13" cy="14" r="6.5" fill="currentColor"/>
        <path d="M4 58V34q0-8 8-8h3q8 0 8 8v24h-6V44h-7v14z" fill="currentColor"/>
        <path d="M22 33l13-5" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
        <rect x="35" y="12" width="26" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="40" y="27" width="4" height="6" fill="currentColor"/>
        <rect x="47" y="22" width="4" height="11" fill="currentColor"/>
        <rect x="54" y="17" width="4" height="16" fill="currentColor"/>
        <path d="M43 36l-3 22M53 36l3 22" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
      </symbol>
      <!-- 2 · Book + pen -->
      <symbol id="eqt-i-write" viewBox="0 0 64 64">
        <path d="M5 20q13-5 25 3v33q-12-8-25-3z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M30 23q8-5 16-3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M30 56q9-6 16-4v-16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M10 29q7-2 14 1M10 37q7-2 14 1M10 45q7-2 14 1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <g transform="rotate(40 48 24)"><rect x="44" y="2" width="8" height="30" rx="1.5" fill="currentColor"/><path d="M44 33h8l-4 9z" fill="currentColor"/></g>
      </symbol>
      <!-- 3 · Rocket -->
      <symbol id="eqt-i-rocket" viewBox="0 0 64 64">
        <g transform="rotate(42 32 32)">
          <path d="M32 2c11 9 14 23 10 40H22c-4-17-1-31 10-40z" fill="currentColor"/>
          <circle cx="32" cy="21" r="5" fill="var(--eqt-node-fill)"/>
          <path d="M23.500 31L15 43l9-1.500zM40.500 31L49 43l-9-1.500z" fill="currentColor"/>
          <path d="M27 45h10l-5 15z" fill="currentColor"/>
        </g>
        <circle cx="9" cy="50" r="2.400" fill="currentColor"/><circle cx="14" cy="57" r="1.900" fill="currentColor"/>
      </symbol>
      <!-- 4 · Team -->
      <symbol id="eqt-i-team" viewBox="0 0 64 64">
        <circle cx="32" cy="20" r="9" fill="currentColor"/>
        <path d="M14 54q0-20 18-20t18 20z" fill="currentColor"/>
        <circle cx="12" cy="29" r="6.5" fill="currentColor"/>
        <path d="M0 54q0-14 11-14 3 0 6 2-5 5-5 12z" fill="currentColor"/>
        <circle cx="52" cy="29" r="6.5" fill="currentColor"/>
        <path d="M64 54q0-14-11-14-3 0-6 2 5 5 5 12z" fill="currentColor"/>
      </symbol>
      <!-- 5 · Audit -->
      <symbol id="eqt-i-audit" viewBox="0 0 64 64">
        <path d="M12 6h24l12 12v13M12 6v48h17" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M36 6v12h12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M20 26h14M20 34h9M20 42h7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="42" cy="43" r="11" fill="var(--eqt-node-fill)" stroke="currentColor" stroke-width="3.6"/>
        <path d="M50 51l9 9" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
        <path d="M37 43l4 4 7-8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
      <!-- 6 · Handshake -->
      <symbol id="eqt-i-deal" viewBox="0 0 64 64">
        <path d="M0 20l12-5 10 25-12 5z" fill="currentColor"/>
        <path d="M64 20l-12-5-10 25 12 5z" fill="currentColor"/>
        <path d="M17 20l12-4c3-1 6-.5 8.500 1.500l5.500 4.500 8 2.500v9l-9 9-7 7c-2 2-5 2-7 0l-3-3c-2 1-4.500.5-6-1.500L14 39z" fill="currentColor"/>
        <path d="M29 22c3 4 8 5 13 2M44 37l-8 8M38 32l-7 8M32 27l-6 7" fill="none" stroke="var(--eqt-node-fill)" stroke-width="2.200" stroke-linecap="round"/>
      </symbol>
      <!-- 7 · Globe + arrow -->
      <symbol id="eqt-i-globe" viewBox="0 0 64 64">
        <circle cx="29" cy="30" r="21" fill="none" stroke="currentColor" stroke-width="3.2"/>
        <ellipse cx="29" cy="30" rx="9.5" ry="21" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M8 30h42M11.5 19h35M11.5 41h35M29 9v42" fill="none" stroke="currentColor" stroke-width="2.6"/>
        <path d="M12 56q30 9 45-22" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M49 33l11-12 3 17z" fill="currentColor"/>
      </symbol>
      <!-- 8 · Org chart -->
      <symbol id="eqt-i-org" viewBox="0 0 64 64">
        <circle cx="32" cy="9" r="5.2" fill="currentColor"/>
        <path d="M22 26q0-9 10-9t10 9z" fill="currentColor"/>
        <path d="M32 26v8M10 34h44M10 34v7M32 34v7M54 34v7" fill="none" stroke="currentColor" stroke-width="3"/>
        <circle cx="10" cy="46" r="4.6" fill="currentColor"/><path d="M2 61q0-9 8-9t8 9z" fill="currentColor"/>
        <circle cx="32" cy="46" r="4.6" fill="currentColor"/><path d="M24 61q0-9 8-9t8 9z" fill="currentColor"/>
        <circle cx="54" cy="46" r="4.6" fill="currentColor"/><path d="M46 61q0-9 8-9t8 9z" fill="currentColor"/>
      </symbol>
    </defs>
  </svg>`;
const EQT_SCENE  = `<svg viewBox="0 0 1456 819" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animated timeline of Equip's company milestones from 2015 to 2025">
      <defs>
        <linearGradient id="eqt-ribbonGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1456" y2="0">
          <stop offset="0"    stop-color="#d9c28f" stop-opacity="0.55"/>
          <stop offset="0.14" stop-color="#bf9a55"/>
          <stop offset="0.55" stop-color="#b58c43"/>
          <stop offset="0.9"  stop-color="#c5a465"/>
          <stop offset="1"    stop-color="#d9c28f" stop-opacity="0.45"/>
        </linearGradient>
        <radialGradient id="eqt-cometGrad">
          <stop offset="0" stop-color="#fff3cf" stop-opacity="0.95"/>
          <stop offset="0.35" stop-color="#e2bd69" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#b08a45" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <g>
        <g id="eqt-t1g"><text class="eqt-t-line" x="56" y="125" font-size="92" fill="#0f2347" textLength="462" lengthAdjust="spacingAndGlyphs">COMPANY</text></g>
        <g id="eqt-t2g"><text class="eqt-t-line" x="56" y="213" font-size="92" fill="#b08a45" textLength="612" lengthAdjust="spacingAndGlyphs">MILESTONES</text></g>
        <line id="eqt-t-rule" x1="56" y1="232" x2="577" y2="232" stroke="#b08a45" stroke-width="1.6"/>
        <g id="eqt-t3g"><text class="eqt-t-tag" x="56" y="276" font-size="31" textLength="556" lengthAdjust="spacingAndGlyphs">Our Journey. Our Growth. Our Future.</text></g>
        <g id="eqt-t4g">
          <text class="eqt-t-sub" x="56" y="315" font-size="22">Key moments that shaped our company</text>
          <text class="eqt-t-sub" x="56" y="342" font-size="22">and continue to drive us forward.</text>
        </g>
      </g>

      <path id="eqt-ribbon-track" fill="none" stroke="#b08a45" stroke-opacity="0.10" stroke-width="22" stroke-linecap="round"/>
      <path id="eqt-ribbon" fill="none" stroke="url(#eqt-ribbonGrad)" stroke-width="22" stroke-linecap="round" pathLength="1000"/>
      <circle id="eqt-comet" r="34" fill="url(#eqt-cometGrad)" opacity="0"/>

      <g id="eqt-milestones-layer"></g>
    </svg>`;
const EQT_MOBILE = `<div class="eqt-mobile-head">
    <div class="eqt-mh-1">COMPANY</div>
    <div class="eqt-mh-2">MILESTONES</div>
    <div class="eqt-mh-rule"></div>
    <div class="eqt-mh-tag">Our Journey. Our Growth. Our Future.</div>
    <p class="eqt-mh-sub">Key moments that shaped our company and continue to drive us forward.</p>
    <!-- Replay sits at the top on mobile so it never needs the auto-scroll to travel back up -->
    <button type="button" class="eqt-replay" id="eqt-btn-replay-mobile">Replay</button>
  </div>

  <div class="eqt-mobile-stage">
    <div class="eqt-m-track"><div class="eqt-m-fill" id="eqt-m-fill"></div></div>
    <ul class="eqt-m-list" id="eqt-m-list"></ul>
  </div>`;
const EQT_REQUIRED = ["eqt-i-train","eqt-ribbon","eqt-ribbon-track","eqt-comet","eqt-milestones-layer",
  "eqt-t1g","eqt-t2g","eqt-t-rule","eqt-t3g","eqt-t4g","eqt-m-list","eqt-m-fill",
  "eqt-btn-replay-desktop","eqt-btn-replay-mobile"];

function eqtRepair(root) {
  const missing = EQT_REQUIRED.filter(id => !document.getElementById(id));
  if (!missing.length) return;
  console.warn("[equip-timeline] markup was incomplete, rebuilding missing parts:", missing,
               "| section has", root.children.length, "child elements,", root.innerHTML.length, "chars of HTML");

  if (!document.getElementById("eqt-i-train")) root.insertAdjacentHTML("afterbegin", EQT_SPRITE);

  const sceneIds = ["eqt-ribbon","eqt-ribbon-track","eqt-comet","eqt-milestones-layer","eqt-t1g","eqt-t2g","eqt-t-rule","eqt-t3g","eqt-t4g"];
  if (sceneIds.some(id => !document.getElementById(id))) {
    let desk = root.querySelector(".eqt-desktop");
    if (!desk) { desk = document.createElement("div"); desk.className = "eqt-desktop"; root.appendChild(desk); }
    desk.innerHTML = EQT_SCENE;
  }
  if (!document.getElementById("eqt-btn-replay-desktop")) {
    const b = document.createElement("button");
    b.type = "button"; b.id = "eqt-btn-replay-desktop"; b.className = "eqt-replay eqt-replay-desktop"; b.textContent = "Replay";
    root.insertBefore(b, root.firstChild);
  }
  if (!document.getElementById("eqt-m-list") || !document.getElementById("eqt-m-fill") || !document.getElementById("eqt-btn-replay-mobile")) {
    root.querySelectorAll(".eqt-mobile-head, .eqt-mobile-stage").forEach(el => el.remove());
    root.insertAdjacentHTML("beforeend", EQT_MOBILE);
  }
}

/* ============================================================
   BOOT — wait for the partial to be in the page, then start
   ============================================================ */
(function eqtBoot() {
  let grace = null;
  function tryStart(final) {
    const root = document.getElementById("equip-evolution");
    if (!root) return false;
    if (root.dataset.eqtInit) return true;
    if (!final && !document.getElementById("eqt-ribbon")) {
      if (!grace) grace = setTimeout(() => tryStart(true), 700);
      return false;
    }
    root.dataset.eqtInit = "1";
    eqtRepair(root);
    eqtInit(root);
    return true;
  }
  if (tryStart(false)) return;
  const mo = new MutationObserver(() => { if (tryStart(false)) mo.disconnect(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => {
    mo.disconnect();
    if (!tryStart(true)) console.error("[equip-timeline] #equip-evolution was not found. Check that partials/equip-timeline.html loaded (Network tab).");
  }, 8000);
})();
