/* =============================================================================
   app.js — keynote deck controller
   Slide engine · lazy diagram builds · click-to-zoom lightbox
   ========================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = () => prefersReducedMotion();

/* ----------------------- inject algorithm slides ----------------------- */
function buildAlgoSlides() {
  const deck = $("#deck");
  const anchorSlide = $(".slide-compare") || $(".slide-matrix");

  ALGORITHMS.forEach((a, i) => {
    const s = document.createElement("section");
    s.className = "slide slide-algo";
    s.dataset.accent = a.accent;
    s.dataset.build = "radar";
    s.dataset.algo = a.id;

    const idx = String(i + 1).padStart(2, "0");
    const facts = a.chains
      .map((c) => {
        const langs = c.languages
          .map((l) => `<span class="fact-lang">${l}</span>`)
          .join("");
        return `
        <div class="fact">
          <div class="fact-top">
            <span class="fact-name">${c.name}</span>
            <span class="fact-ticker">${c.ticker && c.ticker !== "—" ? c.ticker : ""}</span>
            <span class="fact-badge badge-${c.layer}">${c.layer}</span>
          </div>
          <div class="fact-langs">${langs}</div>
          <p class="fact-why">${c.why}</p>
        </div>`;
      })
      .join("");

    s.innerHTML = `
      <div class="slide-inner algo">
        <div class="algo-head" data-anim>
          <span class="algo-index">${idx}</span>
          <span class="algo-chip">${a.acronym}</span>
          <span class="algo-rule"></span>
        </div>
        <div class="algo-main">
          <div class="algo-left">
            <h2 class="algo-title" data-anim>${a.name}</h2>
            <p class="algo-tag" data-anim>${a.tagline}</p>
            <p class="algo-mech" data-anim>${a.mechanism}</p>
            <div class="algo-meta" data-anim>
              <span class="meta-chip"><i>Category</i>${a.meta.category}</span>
              <span class="meta-chip"><i>Sybil resistance</i>${a.meta.sybil}</span>
              <span class="meta-chip"><i>Fault model</i>${a.meta.faultModel}</span>
              <span class="meta-chip"><i>Finality</i>${a.meta.finality}</span>
            </div>
            <div class="algo-security" data-anim>
              <div><span class="cap">51% attack</span><p>${a.security.attack51}</p></div>
              <div><span class="cap">Sybil</span><p>${a.security.sybil}</p></div>
            </div>
            <button class="dive-btn" data-anim data-algo="${a.id}" type="button">
              Explore in depth
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <div class="algo-right" data-anim>
            <div class="zoomable" data-zoom="radar" data-algo="${a.id}" tabindex="0"
                 aria-label="Zoom ${a.name} trilemma radar"></div>
            <div class="algo-metrics">
              <div><span class="cap">Block time</span><b>${a.metrics.blockTime}</b></div>
              <div><span class="cap">TPS</span><b>${a.metrics.tps}</b></div>
              <div><span class="cap">Energy</span><b>${a.metrics.energy}</b></div>
            </div>
          </div>
        </div>
        <div class="algo-facts" data-anim>${facts}</div>
      </div>`;

    deck.insertBefore(s, anchorSlide);
  });
}

/* ------------------------------ lazy builds ---------------------------- */
const built = new WeakSet();

function buildSlide(slide) {
  if (built.has(slide)) {
    // radar re-pop for delight on revisit
    const area = slide.querySelector(".radar-area");
    if (area && !reduce()) {
      area.classList.remove("radar-anim");
      void area.offsetWidth;
      area.classList.add("radar-anim");
    }
    return;
  }
  built.add(slide);
  const kind = slide.dataset.build;

  if (kind === "triangle") {
    $("#triHolder").appendChild(buildTrilemmaTriangle({ size: 460 }));
  } else if (kind === "agenda") {
    const ol = $("#agendaGrid");
    ALGORITHMS.forEach((a, i) => {
      const li = document.createElement("li");
      li.className = "agenda-item";
      li.innerHTML = `
        <span class="agenda-dot" style="background:${a.accent}"></span>
        <span class="agenda-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="agenda-acr">${a.acronym}</span>
        <span class="agenda-name">${a.name}</span>`;
      li.addEventListener("click", () => goTo(slideIndexOfAlgo(a.id)));
      ol.appendChild(li);
    });
  } else if (kind === "radar") {
    const a = getAlgo(slide.dataset.algo);
    const holder = slide.querySelector(".zoomable[data-zoom='radar']");
    holder.appendChild(buildRadar(a.trilemma, a.accent, { size: 300 }));
  } else if (kind === "compare") {
    const table = $("#compareTable");
    table.innerHTML = `
      <thead><tr>
        <th>Mechanism</th><th>Model</th><th>Sybil resource</th>
        <th>Finality</th><th>~TPS</th><th>Energy</th>
      </tr></thead>
      <tbody>${ALGORITHMS.map((a) => `
        <tr data-algo="${a.id}" tabindex="0">
          <td class="ct-mech"><span class="ct-dot" style="background:${a.accent}"></span>${a.acronym}</td>
          <td>${a.meta.category.split(" · ")[0]}</td>
          <td>${a.meta.sybil}</td>
          <td>${a.meta.finality}</td>
          <td class="ct-num">${a.metrics.tps}</td>
          <td>${a.metrics.energy}</td>
        </tr>`).join("")}</tbody>`;
    table.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-algo]");
      if (row) goTo(slideIndexOfAlgo(row.dataset.algo));
    });
    table.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const row = e.target.closest("tr[data-algo]");
      if (row) goTo(slideIndexOfAlgo(row.dataset.algo));
    });
  } else if (kind === "matrix") {
    renderMatrix($("#matrixHolder"), $("#matrixTip"));
  }
}

function getAlgo(id) {
  return ALGORITHMS.find((a) => a.id === id);
}
function slideIndexOfAlgo(id) {
  return slides.findIndex((s) => s.dataset.algo === id);
}

/* ----------------------------- matrix render --------------------------- */
function renderMatrix(holder, tip) {
  holder.innerHTML = "";
  const svg = buildHeatmap(BLOCKCHAINS, null, (reason) => {
    if (!reason) return tip.classList.remove("show");
    tip.innerHTML = reason.replace(
      /(compatible|incompatible|same chain)/i,
      "<b>$1</b>"
    );
    tip.classList.add("show");
  });
  holder.appendChild(svg);
}

/* ------------------------------ deck engine ---------------------------- */
let slides = [];
let current = 0;

function playAnims(slide) {
  const items = $$("[data-anim]", slide);
  items.forEach((el) => {
    el.classList.remove("play");
    el.style.transitionDelay = "";
  });
  if (reduce() || document.hidden) {
    // hidden tabs freeze the CSS transition clock — show content instantly
    items.forEach((el) => {
      el.style.transition = "none";
      el.classList.add("play");
      void el.offsetWidth;
      el.style.transition = "";
    });
    return;
  }
  // small timeout (not rAF, which pauses when the tab is backgrounded) so the
  // element paints its initial state, then transitions in with a stagger.
  setTimeout(() => {
    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * 70}ms`;
      el.classList.add("play");
    });
  }, 20);
}

function goTo(i, push = true) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  const prev = slides[current];
  const next = slides[i];
  const dir = i > current ? 1 : i < current ? -1 : 0;
  const off = reduce() ? 0 : 6; // vw of horizontal travel

  if (prev && prev !== next) {
    prev.classList.remove("is-active");
    prev.style.transform = off ? `translateX(${-dir * off}vw)` : "";
  }

  current = i;
  const accent = next.dataset.accent || "#8899ff";
  document.documentElement.style.setProperty("--accent", accent);
  if (window.Background) window.Background.setAccent(accent);

  buildSlide(next);

  // enter from the opposite side, then settle to 0 (directional feel)
  if (off && prev !== next) {
    next.style.transition = "none";
    next.style.transform = `translateX(${dir * off}vw)`;
    void next.offsetWidth; // flush the start position
    next.style.transition = "";
  }
  next.classList.add("is-active");
  setTimeout(() => { next.style.transform = ""; }, 16);
  playAnims(next);

  // chrome
  const total = slides.length;
  $("#counter").innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b> / ${String(total).padStart(2, "0")}`;
  $("#progressBar").style.width = ((i + 1) / total) * 100 + "%";
  $$(".dot").forEach((d, di) => d.classList.toggle("active", di === i));
  $("#navPrev").disabled = i === 0;
  $("#navNext").disabled = i === total - 1;

  if (push) history.replaceState(null, "", `#${i + 1}`);
}

function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }

/* -------------------------------- dots --------------------------------- */
function buildDots() {
  const wrap = $("#dots");
  slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "dot";
    b.type = "button";
    b.setAttribute("aria-label", `Go to slide ${i + 1}`);
    b.addEventListener("click", () => goTo(i));
    wrap.appendChild(b);
  });
}

/* ------------------------------ lightbox ------------------------------- */
const lb = $("#lightbox");
const lbStage = $("#lightboxStage");
const lbTip = $("#lightboxTip");
let lbOpen = false;
let lastFocus = null;

function openZoom(kind, algoId) {
  lbStage.innerHTML = "";
  lbTip.classList.remove("show");

  if (kind === "radar") {
    const a = getAlgo(algoId);
    document.documentElement.style.setProperty("--accent", a.accent);
    lbStage.appendChild(buildRadar(a.trilemma, a.accent, { size: 520 }));
  } else if (kind === "triangle") {
    lbStage.appendChild(buildTrilemmaTriangle({ size: 620 }));
  } else if (kind === "matrix") {
    const svg = buildHeatmap(BLOCKCHAINS, null, (reason) => {
      if (!reason) return lbTip.classList.remove("show");
      lbTip.innerHTML = reason.replace(
        /(compatible|incompatible|same chain)/i,
        "<b>$1</b>"
      );
      lbTip.classList.add("show");
    });
    lbStage.appendChild(svg);
  }

  lastFocus = document.activeElement;
  lb.hidden = false;
  setTimeout(() => lb.classList.add("show"), 10);
  lbOpen = true;
  if (window.Background) window.Background.pause();
  $("#lightboxClose").focus();
}

function closeZoom() {
  if (!lbOpen) return;
  lb.classList.remove("show");
  lbOpen = false;
  if (window.Background) window.Background.resume();
  setTimeout(() => {
    lb.hidden = true;
    lbStage.innerHTML = "";
  }, 350);
  // restore the active slide's accent
  document.documentElement.style.setProperty(
    "--accent",
    slides[current].dataset.accent || "#8899ff"
  );
  if (lastFocus) lastFocus.focus();
}

function initZoom() {
  document.addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]");
    if (z && !lbOpen) {
      openZoom(z.dataset.zoom, z.dataset.algo);
    }
  });
  // keyboard activate on focused zoomable
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !lbOpen) {
      const z = document.activeElement?.closest?.("[data-zoom]");
      if (z) {
        e.preventDefault();
        openZoom(z.dataset.zoom, z.dataset.algo);
      }
    }
  });
  $("#lightboxClose").addEventListener("click", closeZoom);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeZoom();
  });
}

/* ------------------------------ deep dive ------------------------------ */
const dd = $("#deepdive");
const ddStage = $("#deepdiveStage");
let ddOpen = false;
let ddLastFocus = null;

function openDive(algoId) {
  const a = getAlgo(algoId);
  if (!a || !a.detail) return;
  const i = ALGORITHMS.indexOf(a);
  const d = a.detail;

  ddStage.innerHTML = `
    <div class="dd-head">
      <span class="algo-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="algo-chip">${a.acronym}</span>
      <div class="dd-title">
        <h2>${a.name}</h2>
        <p>${a.tagline}</p>
      </div>
    </div>
    <div class="algo-meta dd-meta">
      <span class="meta-chip"><i>Category</i>${a.meta.category}</span>
      <span class="meta-chip"><i>Sybil resistance</i>${a.meta.sybil}</span>
      <span class="meta-chip"><i>Fault model</i>${a.meta.faultModel}</span>
      <span class="meta-chip"><i>Finality</i>${a.meta.finality}</span>
    </div>

    <h3 class="dd-lbl">How it works</h3>
    ${d.how.map((p) => `<p class="dd-para">${p}</p>`).join("")}

    <h3 class="dd-lbl">Phases</h3>
    <ol class="dd-phases">
      ${d.phases.map((ph, k) => `
        <li class="dd-phase">
          <span class="dd-phase-idx">${String(k + 1).padStart(2, "0")}</span>
          <span class="dd-phase-body"><strong>${ph.t}</strong><span>${ph.d}</span></span>
        </li>`).join("")}
    </ol>

    <h3 class="dd-lbl">States &amp; transitions</h3>
    <span class="dd-states-label">${d.states.label}</span>
    <div class="dd-state-flow">
      ${d.states.flow.map((s) => `<span class="dd-state-chip">${s}</span>`).join('<span class="dd-state-arrow" aria-hidden="true">→</span>')}
    </div>

    <h3 class="dd-lbl">Security &amp; attack surface</h3>
    <ul class="dd-attacks">
      ${d.attacks.map((at) => `<li><strong>${at.t}.</strong> ${at.d}</li>`).join("")}
    </ul>

    <div class="dd-notes">
      <span class="dd-notes-lbl">Worth knowing</span>
      ${d.notes.map((n) => `<p>${n}</p>`).join("")}
    </div>
  `;

  document.documentElement.style.setProperty("--accent", a.accent);
  ddLastFocus = document.activeElement;
  dd.hidden = false;
  dd.scrollTop = 0;
  setTimeout(() => dd.classList.add("show"), 10);
  ddOpen = true;
  if (window.Background) window.Background.pause();
  $("#deepdiveClose").focus();
}

function closeDive() {
  if (!ddOpen) return;
  dd.classList.remove("show");
  ddOpen = false;
  if (window.Background) window.Background.resume();
  setTimeout(() => {
    dd.hidden = true;
    ddStage.innerHTML = "";
  }, 350);
  document.documentElement.style.setProperty(
    "--accent",
    slides[current].dataset.accent || "#8899ff"
  );
  if (ddLastFocus) ddLastFocus.focus();
}

function initDive() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".dive-btn");
    if (b && !ddOpen && !lbOpen) openDive(b.dataset.algo);
  });
  $("#deepdiveClose").addEventListener("click", closeDive);
  dd.addEventListener("click", (e) => {
    if (e.target === dd) closeDive();
  });
}

/* -------------------------------- input -------------------------------- */
function initInput() {
  window.addEventListener("keydown", (e) => {
    if (lbOpen) {
      if (e.key === "Escape") closeZoom();
      return;
    }
    if (ddOpen) {
      if (e.key === "Escape") closeDive();
      return; // deck keys suspended while the deep dive is open
    }
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        e.preventDefault();
        next();
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        prev();
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(slides.length - 1);
        break;
    }
  });

  $("#navPrev").addEventListener("click", prev);
  $("#navNext").addEventListener("click", next);

  // touch swipe
  let x0 = null, y0 = null;
  const deck = $("#deck");
  deck.addEventListener("touchstart", (e) => {
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  deck.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dx < 0 ? next() : prev();
    }
    x0 = y0 = null;
  }, { passive: true });

  window.addEventListener("hashchange", () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n) && n - 1 !== current) goTo(n - 1, false);
  });
}

/* -------------------------------- boot --------------------------------- */
function init() {
  buildAlgoSlides();
  slides = $$(".slide");
  buildDots();
  initInput();
  initZoom();
  initDive();

  const start = parseInt(location.hash.slice(1), 10);
  const idx = !isNaN(start) ? start - 1 : 0;
  // clear the pre-set is-active on slide 0 so goTo drives everything
  slides.forEach((s) => s.classList.remove("is-active"));
  goTo(idx >= 0 ? idx : 0, false);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
