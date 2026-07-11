/* =============================================================================
   views.js — renderers for the three views (home / detail / compare).
   Pure DOM generation from window.ALGORITHMS + window.BLOCKCHAINS.
   ========================================================================== */

import { Sim } from "./sim.js";
import { SIM_SCRIPTS } from "./sim-scripts.js";

const A = () => window.ALGORITHMS;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* Simple line-icon per algorithm (24×24 stroke paths). */
const ICONS = {
  pow: '<path d="M4 14l6-6m0 0l3-3c2-2 5-2 7 0l-4 4c-1-1-2-1-3 0zm-6 6l-4 4" stroke-linecap="round"/>',
  pos: '<path d="M12 3v18M7 8l5-5 5 5M6 21h12" stroke-linecap="round" stroke-linejoin="round"/>',
  dpos: '<path d="M5 9h14M5 9l2-4h10l2 4M5 9v10h14V9M9 13h6" stroke-linecap="round" stroke-linejoin="round"/>',
  pbft: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>',
  poa: '<circle cx="12" cy="8" r="4"/><path d="M5 21c1-4 3.5-6 7-6s6 2 7 6" stroke-linecap="round"/>',
  poh: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3" stroke-linecap="round" stroke-linejoin="round"/>',
  poet: '<path d="M7 3h10M7 21h10M8 3c0 8 8 8 8 18M16 3c0 8-8 8-8 18" stroke-linecap="round"/>',
  poc: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke-linecap="round"/>',
  pob: '<path d="M12 3c1 4-4 5-4 9a4 4 0 008 0c0-2-1-3-1-3s4 1 4 5a7 7 0 11-14 0c0-6 6-7 7-11z" stroke-linejoin="round"/>',
};
const icon = (id) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${ICONS[id] || ""}</svg>`;

const metaChips = (a) => `
  <div class="meta-row">
    <span class="meta-chip"><i>Category</i>${a.meta.category}</span>
    <span class="meta-chip"><i>Sybil resistance</i>${a.meta.sybil}</span>
    <span class="meta-chip"><i>Fault model</i>${a.meta.faultModel}</span>
    <span class="meta-chip"><i>Finality</i>${a.meta.finality}</span>
  </div>`;

/* ============================== HOME ==================================== */
export function renderHome(el) {
  el.innerHTML = `
    <div class="hero">
      <p class="eyebrow reveal">Blockchain · Distributed Consensus</p>
      <h1 class="hero-title reveal">Consensus<br><em>Algorithms</em></h1>
      <p class="hero-sub reveal">
        How do thousands of strangers agree on a single truth with no one in charge?
        Nine mechanisms answer that question — each paying for trust in a different
        currency. <b>Simulate them live.</b>
      </p>
      <div class="hero-cta reveal">
        <a class="btn btn-solid" href="#/algo/pow">▶&nbsp; Run a simulation</a>
        <a class="btn btn-glass" href="#/compare">Compare all nine</a>
      </div>
      <div class="hero-stats reveal">
        <div class="stat"><b data-count="9">0</b><span>consensus mechanisms</span></div>
        <div class="stat"><b data-count="65000" data-suffix="+">0</b><span>peak TPS simulated (PoH)</span></div>
        <div class="stat"><b data-count="33" data-suffix="%">0</b><span>Byzantine nodes tolerated (PBFT)</span></div>
        <div class="stat"><b data-count="99.95" data-decimals="2" data-suffix="%">0</b><span>less energy — PoS vs PoW</span></div>
      </div>
      <span class="hero-scrollcue">scroll ↓</span>
    </div>

    <div class="section wrap" id="trilemma">
      <div class="section-head">
        <span class="eyebrow reveal">The framework</span>
        <h2 class="h-lg reveal">Every design answers the Trilemma</h2>
      </div>
      <div class="tri-strip">
        <div>
          <p class="lead reveal">A consensus algorithm can sharpen at most <b>two</b> of the three
          pillars — the third gives ground. Every card below is a different bet on
          which corner to give up.</p>
          <div class="tri-points">
            <div class="tri-point reveal"><span class="tri-dot"></span><div><b>Security</b><p>How expensive is it to rewrite or censor history?</p></div></div>
            <div class="tri-point reveal"><span class="tri-dot"></span><div><b>Decentralisation</b><p>How open is participation — and how low the barrier?</p></div></div>
            <div class="tri-point reveal"><span class="tri-dot"></span><div><b>Scalability</b><p>How much load can the network absorb without degrading?</p></div></div>
          </div>
        </div>
        <figure class="reveal" id="triFigure"></figure>
      </div>
    </div>

    <div class="section wrap" id="explore">
      <div class="section-head">
        <span class="eyebrow reveal">Nine ways to agree</span>
        <h2 class="h-lg reveal">Choose your mechanism</h2>
        <p class="lead reveal">Each card opens an interactive walkthrough with a live,
        step-by-step network simulation.</p>
      </div>
      <div class="cards-grid" id="cardsGrid"></div>
    </div>`;

  el.querySelector("#triFigure").appendChild(window.buildTrilemmaTriangle({ size: 430 }));

  const grid = el.querySelector("#cardsGrid");
  A().forEach((a, i) => {
    const card = document.createElement("a");
    card.className = "algo-card reveal";
    card.href = `#/algo/${a.id}`;
    card.style.setProperty("--c", a.accent);
    card.style.transitionDelay = `${(i % 3) * 70}ms`;
    card.innerHTML = `
      <div class="ac-top">
        <span class="ac-icon">${icon(a.id)}</span>
        <div><div class="ac-name">${a.name}</div><div class="ac-acr">${a.acronym} · ${a.meta.category.split(" · ")[0]}</div></div>
      </div>
      <p class="ac-tag">${a.tagline} ${a.mechanism.split(";")[0]}.</p>
      <div class="ac-mid">
        <div class="ac-radar" style="--accent:${a.accent}"></div>
        <div class="ac-metrics">
          <div class="ac-metric"><i>TPS</i><b>${a.metrics.tps}</b></div>
          <div class="ac-metric"><i>Block</i><b>${a.metrics.blockTime}</b></div>
          <div class="ac-metric"><i>Energy</i><b>${a.metrics.energy}</b></div>
          <div class="ac-metric"><i>Finality</i><b>${a.meta.finality.split(" (")[0].split(" —")[0]}</b></div>
        </div>
      </div>
      <div class="ac-foot">
        <span>${a.chains.map((c) => c.name.split(" ")[0]).join(" · ")}</span>
        <span class="go">Simulate →</span>
      </div>`;
    card.querySelector(".ac-radar").appendChild(
      window.buildRadar(a.trilemma, a.accent, { size: 130, animate: false })
    );
    grid.appendChild(card);
  });
}

/* ============================== DETAIL ================================== */
let activeSim = null;

export function destroySim() {
  activeSim?.destroy();
  activeSim = null;
}

export function renderDetail(el, id) {
  const a = A().find((x) => x.id === id);
  if (!a) { location.hash = "#/"; return; }
  const i = A().indexOf(a);
  const prev = A()[(i + A().length - 1) % A().length];
  const next = A()[(i + 1) % A().length];

  el.innerHTML = `
    <div class="wrap detail-hero">
      <a class="detail-back" href="#/">← All mechanisms</a>
      <div class="detail-head reveal">
        <span class="detail-idx">${String(i + 1).padStart(2, "0")} / 09</span>
        <span class="detail-chip">${a.acronym}</span>
        <h1 class="detail-title">${a.name}</h1>
        <p class="detail-tag">${a.tagline}</p>
      </div>
      <p class="lead detail-mech reveal">${a.mechanism}</p>
      <div class="reveal">${metaChips(a)}</div>

      <!-- ============ SIMULATOR ============ -->
      <div class="sim-panel reveal" id="simPanel">
        <div class="sim-head">
          <h3>Live simulation</h3>
          <span class="sim-live">interactive</span>
          <span class="sim-step-count">step 0 / 0</span>
        </div>
        <div class="sim-body">
          <div class="sim-stage-wrap">
            <svg class="sim-stage" role="img" aria-label="Animated ${a.name} network simulation"></svg>
            <div class="sim-caption"></div>
          </div>
          <aside class="sim-side">
            <span class="sim-side-lbl">Event log</span>
            <div class="sim-log" aria-live="polite"></div>
          </aside>
        </div>
        <div class="sim-flow">
          <span class="sim-flow-lbl">${a.detail.states.label}</span>
          <span class="sim-flow-chips"></span>
        </div>
        <div class="sim-chain">
          <span class="sim-chain-lbl">Ledger</span>
          <span class="sim-chain-blocks" style="display:flex;align-items:center;gap:7px;"></span>
        </div>
        <div class="sim-controls">
          <button class="sim-btn primary" id="simPlay">▶ Play</button>
          <button class="sim-btn icon" id="simPrev" aria-label="Previous step">‹</button>
          <button class="sim-btn icon" id="simNext" aria-label="Next step">›</button>
          <button class="sim-btn" id="simReset">↺ Reset</button>
          <label class="sim-speed">Speed
            <select id="simSpeed" aria-label="Simulation speed">
              <option value="0.6">0.6×</option>
              <option value="1" selected>1×</option>
              <option value="1.8">1.8×</option>
              <option value="3">3×</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <div class="wrap detail-section">
      <div class="detail-cols">
        <div>
          <section>
            <h2 class="ds-lbl">How it works</h2>
            ${a.detail.how.map((p) => `<p class="ds-para">${p}</p>`).join("")}
          </section>
          <section class="detail-section">
            <h2 class="ds-lbl">Phases</h2>
            <ol class="dd-phases">
              ${a.detail.phases.map((ph, k) => `
                <li class="dd-phase reveal">
                  <span class="dd-phase-idx">${String(k + 1).padStart(2, "0")}</span>
                  <span class="dd-phase-body"><strong>${ph.t}</strong><span>${ph.d}</span></span>
                </li>`).join("")}
            </ol>
          </section>
          <section class="detail-section">
            <h2 class="ds-lbl">Security &amp; attack surface</h2>
            <ul class="dd-attacks">
              ${a.detail.attacks.map((at) => `<li class="reveal"><strong>${at.t}.</strong> ${at.d}</li>`).join("")}
            </ul>
          </section>
          <section class="detail-section">
            <h2 class="ds-lbl">Worth knowing</h2>
            <div class="dd-notes">${a.detail.notes.map((n) => `<p>${n}</p>`).join("")}</div>
          </section>
        </div>
        <aside class="detail-aside">
          <div class="aside-panel reveal">
            <h3 class="ds-lbl">Trilemma fingerprint</h3>
            <div id="detailRadar"></div>
          </div>
          <div class="aside-panel reveal">
            <h3 class="ds-lbl">At a glance</h3>
            <div class="aside-metrics">
              <div class="aside-metric"><i>Block time</i><b>${a.metrics.blockTime}</b></div>
              <div class="aside-metric"><i>Throughput</i><b>${a.metrics.tps}</b></div>
              <div class="aside-metric"><i>Energy</i><b>${a.metrics.energy}</b></div>
              <div class="aside-metric"><i>Finality</i><b>${a.meta.finality.split(" (")[0]}</b></div>
            </div>
          </div>
        </aside>
      </div>

      <section class="detail-section">
        <h2 class="ds-lbl">In the real world</h2>
        <div class="chain-cards">
          ${a.chains.map((c) => `
            <article class="chain-card reveal">
              <div class="cc-top">
                <span class="cc-name">${c.name}</span>
                <span class="cc-ticker">${c.ticker !== "—" ? c.ticker : ""}</span>
                <span class="cc-layer">${c.layer}</span>
              </div>
              <p class="cc-why">${c.why}</p>
              <div class="cc-langs">${c.languages.map((l) => `<span class="cc-lang">${l}</span>`).join("")}</div>
            </article>`).join("")}
        </div>
      </section>

      <div class="detail-nav">
        <a class="dn-link" href="#/algo/${prev.id}"><i>← Previous</i><b>${prev.name}</b></a>
        <a class="dn-link dn-next" href="#/algo/${next.id}"><i>Next →</i><b>${next.name}</b></a>
      </div>
    </div>`;

  el.querySelector("#detailRadar").appendChild(
    window.buildRadar(a.trilemma, a.accent, { size: 300 })
  );

  /* ---- wire the simulator ---- */
  destroySim();
  const panel = el.querySelector("#simPanel");
  const sim = new Sim(panel, SIM_SCRIPTS[a.id](a));
  activeSim = sim;
  window.__sim = sim; // dev/testing hook

  const playBtn = panel.querySelector("#simPlay");
  const prevBtn = panel.querySelector("#simPrev");
  const nextBtn = panel.querySelector("#simNext");

  panel.querySelector("#simReset").addEventListener("click", () => { sim.pause(); sim.reset(); });
  prevBtn.addEventListener("click", () => sim.prev());
  nextBtn.addEventListener("click", () => sim.next());
  panel.querySelector("#simSpeed").addEventListener("change", (e) => { sim.speed = +e.target.value; });
  playBtn.addEventListener("click", () => (sim.playing ? sim.pause() : sim.play()));

  panel.addEventListener("simstate", () => {
    playBtn.innerHTML = sim.playing ? "⏸ Pause" : sim.atEnd ? "↻ Replay" : "▶ Play";
    prevBtn.disabled = sim.stepIndex === 0 || sim.playing;
    nextBtn.disabled = sim.atEnd || sim.playing;
  });
}

/* ============================== COMPARE ================================= */
const ENERGY_SCORE = { "Very high": 10, High: 8, Low: 3, "Very low": 1.5, Negligible: 1 };
const tpsValue = (t) => {
  const m = String(t).replace(/,/g, "").match(/(\d+(?:\.\d+)?)(?!.*\d)/);
  return m ? +m[1] : 5;
};

export function renderCompare(el, state) {
  const sel = state.selected;
  const isRerender = !!state.booted;
  state.booted = true;
  el.innerHTML = `
    <div class="wrap compare-hero">
      <span class="eyebrow reveal">Side by side</span>
      <h1 class="h-xl reveal">Compare mechanisms</h1>
      <p class="lead reveal" style="margin:18px auto 0">Select up to five. Radar overlays their trilemma
      fingerprints; bars compare throughput and energy on real scales.</p>
      <div class="pick-row reveal" id="pickRow"></div>
    </div>

    <div class="wrap">
      <div class="compare-grid">
        <div class="compare-panel reveal">
          <div id="cmpRadar"></div>
          <div class="radar-legend" id="cmpLegend"></div>
        </div>
        <div class="compare-panel reveal">
          <div class="bars-group">
            <div class="bars-title">Throughput — TPS (log scale)</div>
            <div id="barsTps"></div>
          </div>
          <div class="bars-group">
            <div class="bars-title">Energy footprint (relative)</div>
            <div id="barsEnergy"></div>
          </div>
          <div class="bars-group" style="margin-bottom:0">
            <div class="bars-title">Decentralisation (score / 10)</div>
            <div id="barsDec"></div>
          </div>
        </div>
      </div>

      <div class="compare-scroll reveal">
        <table class="compare-table" id="cmpTable"></table>
      </div>

      <div class="section" style="padding-bottom:0">
        <div class="section-head">
          <span class="eyebrow reveal">Protocol-level interoperability</span>
          <h2 class="h-lg reveal">Compatibility matrix</h2>
          <p class="lead reveal">Two chains are compatible when they share a consensus mechanism.
          Hover any cell.</p>
        </div>
        <div class="matrix-wrap reveal">
          <div class="matrix-scroll" id="cmpMatrix"></div>
          <div class="matrix-tooltip" id="cmpTip" aria-live="polite"></div>
        </div>
      </div>
    </div>`;

  /* picker */
  const row = el.querySelector("#pickRow");
  A().forEach((a) => {
    const b = document.createElement("button");
    b.className = "pick" + (sel.has(a.id) ? " on" : "");
    b.style.setProperty("--c", a.accent);
    b.innerHTML = `<span class="dot"></span>${a.acronym}`;
    b.setAttribute("aria-pressed", sel.has(a.id));
    b.addEventListener("click", () => {
      if (sel.has(a.id)) { if (sel.size > 1) sel.delete(a.id); }
      else if (sel.size < 5) sel.add(a.id);
      renderCompare(el, state);
    });
    row.appendChild(b);
  });

  const chosen = A().filter((a) => sel.has(a.id));

  /* radar overlay + legend */
  el.querySelector("#cmpRadar").appendChild(
    window.buildRadarMulti(
      chosen.map((a) => ({ trilemma: a.trilemma, accent: a.accent, label: a.acronym })),
      { size: 400 }
    )
  );
  el.querySelector("#cmpLegend").innerHTML = chosen
    .map((a) => `<span><span class="dot" style="background:${a.accent};box-shadow:0 0 8px ${a.accent}"></span>${a.name}</span>`)
    .join("");

  /* bars */
  const maxLog = Math.log10(65000);
  const bars = (mount, val, fmt) => {
    mount.innerHTML = chosen.map((a) => {
      const v = val(a);
      return `
        <div class="bar-row" style="--c:${a.accent}">
          <i>${a.acronym}</i>
          <span class="bar-track"><span class="bar-fill" data-w="${Math.max(3, v * 100).toFixed(1)}"></span></span>
          <b>${fmt(a)}</b>
        </div>`;
    }).join("");
    const apply = () =>
      mount.querySelectorAll(".bar-fill").forEach((f) => (f.style.width = f.dataset.w + "%"));
    if (document.hidden) {
      // rAF never fires in hidden tabs — apply instantly, no transition
      mount.querySelectorAll(".bar-fill").forEach((f) => (f.style.transition = "none"));
      apply();
    } else {
      requestAnimationFrame(() => requestAnimationFrame(apply));
    }
  };
  bars(el.querySelector("#barsTps"), (a) => Math.log10(Math.max(2, tpsValue(a.metrics.tps))) / maxLog, (a) => a.metrics.tps);
  bars(el.querySelector("#barsEnergy"), (a) => (ENERGY_SCORE[a.metrics.energy] ?? 3) / 10, (a) => a.metrics.energy);
  bars(el.querySelector("#barsDec"), (a) => a.trilemma.decentralization / 10, (a) => `${a.trilemma.decentralization}/10`);

  /* sortable table */
  const cols = [
    { k: "acronym", h: "Mechanism", v: (a) => a.acronym },
    { k: "model", h: "Model", v: (a) => a.meta.category.split(" · ")[0] },
    { k: "sybil", h: "Sybil resource", v: (a) => a.meta.sybil },
    { k: "finality", h: "Finality", v: (a) => a.meta.finality },
    { k: "tps", h: "~TPS", v: (a) => a.metrics.tps, n: (a) => tpsValue(a.metrics.tps) },
    { k: "energy", h: "Energy", v: (a) => a.metrics.energy, n: (a) => ENERGY_SCORE[a.metrics.energy] ?? 3 },
  ];
  const table = el.querySelector("#cmpTable");
  const drawTable = () => {
    let rows = [...A()];
    if (state.sort) {
      const c = cols.find((x) => x.k === state.sort.k);
      rows.sort((x, y) => {
        const a1 = c.n ? c.n(x) : c.v(x), b1 = c.n ? c.n(y) : c.v(y);
        return (a1 > b1 ? 1 : a1 < b1 ? -1 : 0) * (state.sort.dir ? 1 : -1);
      });
    }
    table.innerHTML = `
      <thead><tr>${cols.map((c) => `
        <th data-k="${c.k}">${c.h}${state.sort?.k === c.k ? `<span class="sort">${state.sort.dir ? "↑" : "↓"}</span>` : ""}</th>`).join("")}
      </tr></thead>
      <tbody>${rows.map((a) => `
        <tr data-algo="${a.id}" class="${sel.has(a.id) ? "" : "dim"}">
          <td class="ct-mech"><span class="ct-dot" style="background:${a.accent}"></span>${a.acronym}</td>
          ${cols.slice(1).map((c) => `<td class="${c.k === "tps" ? "ct-num" : ""}">${c.v(a)}</td>`).join("")}
        </tr>`).join("")}
      </tbody>`;
    table.querySelectorAll("th").forEach((th) =>
      th.addEventListener("click", () => {
        const k = th.dataset.k;
        state.sort = state.sort?.k === k ? { k, dir: !state.sort.dir } : { k, dir: true };
        drawTable();
      })
    );
    table.querySelectorAll("tr[data-algo]").forEach((tr) =>
      tr.addEventListener("click", () => (location.hash = `#/algo/${tr.dataset.algo}`))
    );
  };
  drawTable();

  /* matrix */
  const tip = el.querySelector("#cmpTip");
  el.querySelector("#cmpMatrix").appendChild(
    window.buildHeatmap(window.BLOCKCHAINS, null, (reason) => {
      if (!reason) return tip.classList.remove("show");
      tip.innerHTML = reason.replace(/(compatible|incompatible|same chain)/i, "<b>$1</b>");
      tip.classList.add("show");
    })
  );

  /* on picker-driven re-renders the route observer has already run — show instantly */
  if (isRerender) {
    el.querySelectorAll(".reveal").forEach((n) => {
      n.style.transition = "none";
      n.classList.add("in");
      void n.offsetWidth;
      n.style.transition = "";
    });
  }
}
