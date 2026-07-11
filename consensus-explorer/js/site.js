/* =============================================================================
   site.js — app entry: hash router, reveal/counter/tilt effects, nav sync,
   scroll progress, cursor glow, command palette.
   ========================================================================== */

import { renderHome, renderDetail, renderCompare, destroySim } from "./views.js";
import { initPalette } from "./palette.js";

const $ = (s, r = document) => r.querySelector(s);
const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------ reveal ---------------------------------- */
let observer = null;
function initReveals(root) {
  const nodes = [...root.querySelectorAll(".reveal")];
  // hidden tabs freeze the CSS transition clock — show instantly there
  if (reduce() || document.hidden) {
    nodes.forEach((n) => {
      n.style.transition = "none";
      n.classList.add("in");
      void n.offsetWidth;
      n.style.transition = "";
    });
    nodes.forEach((n) => n.classList.contains("in") && maybeCount(n));
    return;
  }
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        maybeCount(e.target);
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  nodes.forEach((n) => observer.observe(n));
}

/* --------------------------- animated counters --------------------------- */
function maybeCount(scope) {
  scope.querySelectorAll("[data-count]").forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || "";
    const fmt = (v) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
    if (reduce() || document.hidden) { el.textContent = fmt(target); return; }
    const t0 = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* ------------------------------ card tilt -------------------------------- */
function initTilt(root) {
  if (reduce()) return;
  root.querySelectorAll(".algo-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
      card.style.transform =
        `rotateY(${(px - 0.5) * 7}deg) rotateX(${(0.5 - py) * 6}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

/* -------------------------- button ripple -------------------------------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn, .sim-btn");
  if (!btn || reduce()) return;
  const r = btn.getBoundingClientRect();
  const d = Math.max(r.width, r.height);
  const rip = document.createElement("span");
  rip.className = "ripple";
  rip.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px;`;
  btn.appendChild(rip);
  setTimeout(() => rip.remove(), 650);
});

/* --------------------------- cursor glow --------------------------------- */
function initGlow() {
  const glow = $("#glowFollow");
  if (!glow || reduce()) return;
  let raf = null;
  window.addEventListener("pointermove", (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
      glow.style.opacity = 1;
      raf = null;
    });
  });
  document.addEventListener("pointerleave", () => (glow.style.opacity = 0));
}

/* --------------------------- scroll progress ------------------------------ */
function initProgress() {
  const bar = $("#progressBar");
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* -------------------------------- router --------------------------------- */
const views = {
  home: $("#view-home"),
  detail: $("#view-detail"),
  compare: $("#view-compare"),
};
const compareState = { selected: new Set(["pow", "pos", "pbft"]), sort: null };

function setAccent(hex) {
  document.documentElement.style.setProperty("--accent", hex);
  window.Background?.setAccent(hex);
}

function route() {
  const hash = location.hash || "#/";
  const algoMatch = hash.match(/^#\/algo\/([a-z]+)/);
  destroySim();
  Object.values(views).forEach((v) => (v.hidden = true));

  let name = "home";
  if (algoMatch) {
    name = "detail";
    const a = window.ALGORITHMS.find((x) => x.id === algoMatch[1]);
    setAccent(a ? a.accent : "#8899ff");
    renderDetail(views.detail, algoMatch[1]);
  } else if (hash.startsWith("#/compare")) {
    name = "compare";
    setAccent("#8899ff");
    renderCompare(views.compare, compareState);
  } else {
    setAccent("#8899ff");
    renderHome(views.home);
  }

  views[name].hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  initReveals(views[name]);
  initTilt(views[name]);

  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === (name === "detail" ? "home" : name))
  );
}

/* re-render compare when its state changes via picker (it re-calls itself) */

/* -------------------------------- boot ----------------------------------- */
function init() {
  initPalette();
  initGlow();
  initProgress();
  window.addEventListener("hashchange", route);
  route();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
