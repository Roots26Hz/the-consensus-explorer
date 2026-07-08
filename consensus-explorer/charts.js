/* =============================================================================
   charts.js — dependency-free SVG chart builders
   buildRadar()   : animated trilemma spider chart
   buildMiniRadar(): small-multiple radar for the "All" comparison view
   buildHeatmap() : interactive blockchain compatibility matrix
   ========================================================================== */

const SVGNS = "http://www.w3.org/2000/svg";

function el(name, attrs = {}) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const AXES = [
  { key: "scalability", label: "Scalability" },
  { key: "security", label: "Security" },
  { key: "decentralization", label: "Decentralisation" },
];

/* Return the {x,y} for a given axis index & radius fraction (0..1). */
function polar(cx, cy, R, i, total, frac) {
  const angle = -Math.PI / 2 + (i / total) * Math.PI * 2; // start at top
  return {
    x: cx + Math.cos(angle) * R * frac,
    y: cy + Math.sin(angle) * R * frac,
  };
}

/* -------------------------------------------------------------------------
   Full radar chart. `animate` controls the draw-in transition.
   ---------------------------------------------------------------------- */
function buildRadar(trilemma, accent, opts = {}) {
  const size = opts.size || 340;
  const animate = opts.animate !== false;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.34;
  const rings = 5;

  const svg = el("svg", {
    viewBox: `0 0 ${size} ${size}`,
    class: "radar",
    role: "img",
    "aria-label": `Trilemma radar: scalability ${trilemma.scalability}, security ${trilemma.security}, decentralisation ${trilemma.decentralization} out of 10`,
  });

  const g = el("g");
  svg.appendChild(g);

  // concentric grid rings
  for (let r = 1; r <= rings; r++) {
    const frac = r / rings;
    const pts = AXES.map((_, i) => {
      const p = polar(cx, cy, R, i, AXES.length, frac);
      return `${p.x},${p.y}`;
    }).join(" ");
    g.appendChild(
      el("polygon", {
        points: pts,
        class: "radar-ring",
      })
    );
  }

  // spokes + axis labels
  AXES.forEach((axis, i) => {
    const p = polar(cx, cy, R, i, AXES.length, 1);
    g.appendChild(
      el("line", { x1: cx, y1: cy, x2: p.x, y2: p.y, class: "radar-spoke" })
    );
    const lp = polar(cx, cy, R + size * 0.085, i, AXES.length, 1);
    const label = el("text", {
      x: lp.x,
      y: lp.y,
      class: "radar-label",
      "text-anchor": i === 0 ? "middle" : lp.x < cx ? "end" : "start",
      "dominant-baseline": "middle",
    });
    label.textContent = axis.label;
    g.appendChild(label);

    // value badge at each vertex
    const vp = polar(cx, cy, R, i, AXES.length, trilemma[axis.key] / 10);
    const badge = el("text", {
      x: vp.x,
      y: vp.y - 10,
      class: "radar-value",
      "text-anchor": "middle",
    });
    badge.textContent = trilemma[axis.key];
    g.appendChild(badge);
  });

  // data polygon
  const dataPts = AXES.map((axis, i) =>
    polar(cx, cy, R, i, AXES.length, trilemma[axis.key] / 10)
  );
  const poly = el("polygon", {
    points: dataPts.map((p) => `${p.x},${p.y}`).join(" "),
    class: "radar-area",
    style: `--accent:${accent}`,
  });
  g.appendChild(poly);

  // vertex dots
  dataPts.forEach((p) => {
    g.appendChild(
      el("circle", { cx: p.x, cy: p.y, r: 4, class: "radar-dot", style: `--accent:${accent}` })
    );
  });

  if (animate && !prefersReducedMotion()) {
    // scale the data polygon + dots up from the centre
    g.style.setProperty("--cx", cx + "px");
    g.style.setProperty("--cy", cy + "px");
    poly.classList.add("radar-anim");
    poly.style.transformOrigin = `${cx}px ${cy}px`;
  }

  return svg;
}

function buildMiniRadar(algo) {
  const wrap = document.createElement("button");
  wrap.className = "mini-radar reveal";
  wrap.type = "button";
  wrap.dataset.algo = algo.id;
  wrap.style.setProperty("--accent", algo.accent);
  wrap.setAttribute("aria-label", `Focus ${algo.name}`);
  const svg = buildRadar(algo.trilemma, algo.accent, { size: 200, animate: false });
  wrap.appendChild(svg);
  const cap = document.createElement("div");
  cap.className = "mini-radar-cap";
  cap.innerHTML = `<span class="mini-acr">${algo.acronym}</span><span class="mini-name">${algo.name}</span>`;
  wrap.appendChild(cap);
  return wrap;
}

/* -------------------------------------------------------------------------
   Compatibility matrix. Cells are compatible when two chains share the same
   consensus mechanism. `activeAlgo` highlights that mechanism's band.
   ---------------------------------------------------------------------- */
function buildHeatmap(blockchains, activeAlgo, onHover) {
  const n = blockchains.length;
  const cell = 30;
  const pad = 118; // room for labels
  const size = pad + n * cell + 12;

  const svg = el("svg", {
    viewBox: `0 0 ${size} ${size}`,
    class: "heatmap",
    role: "img",
    "aria-label": "Blockchain consensus compatibility matrix",
  });

  // column labels (rotated) + row labels
  blockchains.forEach((b, i) => {
    const x = pad + i * cell + cell / 2;
    const colText = el("text", {
      x: x,
      y: pad - 8,
      class: "hm-label hm-col",
      transform: `rotate(-55 ${x} ${pad - 8})`,
      "text-anchor": "start",
      style: `--accent:${b.accent}`,
    });
    colText.textContent = b.name;
    svg.appendChild(colText);

    const y = pad + i * cell + cell / 2;
    const rowText = el("text", {
      x: pad - 10,
      y: y,
      class: "hm-label hm-row",
      "text-anchor": "end",
      "dominant-baseline": "middle",
      style: `--accent:${b.accent}`,
    });
    rowText.textContent = b.name;
    svg.appendChild(rowText);
  });

  // cells
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const a = blockchains[r];
      const b = blockchains[c];
      const same = a.algoId === b.algoId;
      const isDiag = r === c;
      const inBand = activeAlgo && (a.algoId === activeAlgo || b.algoId === activeAlgo);

      let cls = "hm-cell";
      if (isDiag) cls += " hm-diag";
      else if (same) cls += " hm-compat";
      else cls += " hm-incompat";
      if (activeAlgo) cls += inBand ? " hm-inband" : " hm-dim";

      const rect = el("rect", {
        x: pad + c * cell + 1.5,
        y: pad + r * cell + 1.5,
        width: cell - 3,
        height: cell - 3,
        rx: 6,
        class: cls,
        style: same ? `--accent:${a.accent}` : "",
      });
      const verdict = isDiag
        ? "same chain"
        : same
        ? "compatible"
        : "incompatible";
      const reason = isDiag
        ? `${a.name} — ${a.algoName}`
        : same
        ? `${a.name} ↔ ${b.name} — both ${a.algoName} — compatible`
        : `${a.name} (${a.algoAcronym}) ↔ ${b.name} (${b.algoAcronym}) — different mechanisms — incompatible`;
      rect.addEventListener("mouseenter", () => onHover && onHover(reason, verdict, a.accent));
      rect.addEventListener("mouseleave", () => onHover && onHover(null));
      // symbol for compatible cells
      if (same && !isDiag) {
        const cx = pad + c * cell + cell / 2;
        const cy = pad + r * cell + cell / 2;
        rect.setAttribute("data-cx", cx);
      }
      svg.appendChild(rect);
    }
  }

  return svg;
}

/* -------------------------------------------------------------------------
   Trilemma concept triangle — three pillars, "pick two" geometry.
   ---------------------------------------------------------------------- */
function buildTrilemmaTriangle(opts = {}) {
  const size = opts.size || 460;
  const w = size;
  const h = size * 0.92;
  const cx = w / 2;
  const cy = h * 0.56;
  const R = Math.min(w, h) * 0.40;

  const verts = [
    { key: "Scalability", sub: "Speed · TPS", ang: -90 },
    { key: "Security", sub: "Attack resistance", ang: 30 },
    { key: "Decentralisation", sub: "Open participation", ang: 150 },
  ].map((v) => {
    const a = (v.ang * Math.PI) / 180;
    return { ...v, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });

  const svg = el("svg", {
    viewBox: `0 0 ${w} ${h}`,
    class: "triangle",
    role: "img",
    "aria-label": "The blockchain trilemma: scalability, security, decentralisation — a chain optimises for two",
  });

  // faint fill
  svg.appendChild(
    el("polygon", {
      points: verts.map((v) => `${v.x},${v.y}`).join(" "),
      class: "tri-fill",
    })
  );
  // edges
  svg.appendChild(
    el("polygon", {
      points: verts.map((v) => `${v.x},${v.y}`).join(" "),
      class: "tri-edge",
    })
  );

  verts.forEach((v, i) => {
    const outward = 1;
    const lx = cx + (v.x - cx) * 1.16;
    const ly = cy + (v.y - cy) * 1.16;
    svg.appendChild(el("circle", { cx: v.x, cy: v.y, r: 6, class: "tri-node", style: `--i:${i}` }));
    const anchor = i === 0 ? "middle" : v.x < cx ? "end" : "start";
    const t1 = el("text", { x: lx, y: ly, class: "tri-label", "text-anchor": anchor });
    t1.textContent = v.key;
    svg.appendChild(t1);
    const t2 = el("text", { x: lx, y: ly + 20, class: "tri-sub", "text-anchor": anchor });
    t2.textContent = v.sub;
    svg.appendChild(t2);
  });

  const center = el("text", { x: cx, y: cy + 4, class: "tri-center", "text-anchor": "middle" });
  center.textContent = "pick two";
  svg.appendChild(center);

  return svg;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

if (typeof window !== "undefined") {
  window.buildRadar = buildRadar;
  window.buildMiniRadar = buildMiniRadar;
  window.buildHeatmap = buildHeatmap;
  window.buildTrilemmaTriangle = buildTrilemmaTriangle;
  window.prefersReducedMotion = prefersReducedMotion;
}
