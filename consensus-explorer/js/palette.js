/* =============================================================================
   palette.js — ⌘K command palette: fuzzy jump to any view or algorithm.
   ========================================================================== */

export function initPalette() {
  const root = document.getElementById("palette");
  const input = document.getElementById("paletteInput");
  const list = document.getElementById("paletteList");
  let open = false;
  let selIdx = 0;
  let items = [];

  const commands = () => [
    { label: "Home — explore all mechanisms", kind: "view", go: () => (location.hash = "#/") },
    { label: "Compare mechanisms", kind: "view", go: () => (location.hash = "#/compare") },
    { label: "Presentation mode", kind: "view", go: () => (location.href = "present.html") },
    ...window.ALGORITHMS.map((a) => ({
      label: `${a.name} (${a.acronym})`,
      kind: "algorithm",
      accent: a.accent,
      go: () => (location.hash = `#/algo/${a.id}`),
    })),
    ...window.ALGORITHMS.map((a) => ({
      label: `Simulate ${a.acronym} step by step`,
      kind: "simulation",
      accent: a.accent,
      go: () => (location.hash = `#/algo/${a.id}`),
    })),
  ];

  function show() {
    open = true;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("show"));
    input.value = "";
    render("");
    input.focus();
  }
  function hide() {
    open = false;
    root.classList.remove("show");
    setTimeout(() => (root.hidden = true), 220);
  }

  function render(q) {
    const needle = q.trim().toLowerCase();
    items = commands().filter((c) => !needle || c.label.toLowerCase().includes(needle));
    selIdx = 0;
    list.innerHTML = items.length
      ? items.map((c, i) => `
          <li class="palette-item${i === 0 ? " sel" : ""}" data-i="${i}" role="option">
            <span class="pi-dot" style="${c.accent ? `background:${c.accent};box-shadow:0 0 8px ${c.accent}` : ""}"></span>
            <span>${c.label}</span><span class="pi-kind">${c.kind}</span>
          </li>`).join("")
      : `<div class="palette-empty">No matches — try “PBFT” or “compare”.</div>`;
    list.querySelectorAll(".palette-item").forEach((li) => {
      li.addEventListener("mouseenter", () => select(+li.dataset.i));
      li.addEventListener("click", () => choose(+li.dataset.i));
    });
  }

  function select(i) {
    selIdx = i;
    list.querySelectorAll(".palette-item").forEach((li, k) => li.classList.toggle("sel", k === i));
    list.querySelector(".palette-item.sel")?.scrollIntoView({ block: "nearest" });
  }
  function choose(i) {
    const c = items[i];
    if (!c) return;
    hide();
    c.go();
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); select(Math.min(items.length - 1, selIdx + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(Math.max(0, selIdx - 1)); }
    else if (e.key === "Enter") choose(selIdx);
  });
  root.addEventListener("click", (e) => { if (e.target === root) hide(); });
  document.getElementById("paletteOpen").addEventListener("click", show);

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      open ? hide() : show();
    } else if (e.key === "Escape" && open) {
      hide();
    }
  });

  return { isOpen: () => open };
}
