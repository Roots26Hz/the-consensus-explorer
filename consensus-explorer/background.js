/* =============================================================================
   background.js — living blockchain backdrop (canvas)
   A drifting chain of linked blocks over a faint node network, with a soft
   "new block" pulse and rising hash digits. Tinted to the active slide accent.
   Kept dim; a CSS .scrim sits above it so slide text stays crisp on a projector.
   ========================================================================== */

const Background = (() => {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return { setAccent() {}, pause() {}, resume() {} };
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, DPR = 1;
  let accent = { r: 136, g: 153, b: 255 };
  let running = true;
  let raf = null;
  let t = 0;
  let frame = 0; // exposed for verification

  const HEX = "0123456789abcdef";
  const reduce = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------- entities ------------------------------ */
  let blocks = [];   // the drifting chain
  let nodes = [];    // faint network points
  let glyphs = [];   // rising hash digits

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeChain() {
    blocks = [];
    // a few parallel chain "lanes" at different depths
    const lanes = W < 900 ? 2 : 3;
    for (let lane = 0; lane < lanes; lane++) {
      const y = H * (0.22 + lane * (0.56 / Math.max(1, lanes - 1)));
      const depth = 0.5 + lane * 0.28;         // parallax / size factor
      const size = rand(30, 46) * depth;
      const gap = size * rand(2.4, 3.1);
      const speed = (10 + lane * 6) * 0.06;    // px/frame-ish, slow
      const count = Math.ceil(W / gap) + 3;
      for (let i = 0; i < count; i++) {
        blocks.push({
          lane,
          x: i * gap + rand(-8, 8),
          y: y + rand(-size * 0.4, size * 0.4),
          s: size,
          gap,
          speed,
          depth,
          pulse: 0,
          nextPulseAt: rand(120, 600) + i * 30,
          age: i * 30,
        });
      }
    }
  }

  function makeNodes() {
    nodes = [];
    const n = Math.round((W * H) / 42000);
    for (let i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: rand(-0.12, 0.12),
        vy: rand(-0.12, 0.12),
        r: rand(0.8, 1.8),
      });
    }
  }

  function spawnGlyph() {
    glyphs.push({
      x: rand(0, W),
      y: H + 20,
      ch: HEX[(Math.random() * 16) | 0],
      v: rand(0.3, 0.8),
      life: 0,
      max: rand(180, 340),
      size: rand(10, 16),
    });
  }

  /* ------------------------------- sizing -------------------------------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    makeChain();
    makeNodes();
    glyphs = [];
  }

  /* -------------------------------- draw --------------------------------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rgba(a) {
    return `rgba(${accent.r},${accent.g},${accent.b},${a})`;
  }

  function drawNetwork() {
    // move + draw faint connecting web behind everything
    const maxD = 130;
    for (const p of nodes) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) {
          const alpha = (1 - Math.sqrt(d2) / maxD) * 0.12;
          ctx.strokeStyle = rgba(alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (const p of nodes) {
      ctx.fillStyle = rgba(0.16);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawChain() {
    // sort by depth so nearer lanes draw on top
    for (const bk of blocks) {
      bk.age++;
      bk.x -= bk.speed;
      // recycle to the right when off the left edge
      if (bk.x < -bk.s * 2) bk.x += (Math.ceil(W / bk.gap) + 3) * bk.gap;
      // schedule pulses
      if (bk.age > bk.nextPulseAt) {
        bk.pulse = 1;
        bk.nextPulseAt = bk.age + rand(300, 900);
      }
      if (bk.pulse > 0) bk.pulse = Math.max(0, bk.pulse - 0.02);
    }

    // connectors first
    for (const bk of blocks) {
      const base = 0.10 + bk.depth * 0.06;
      ctx.strokeStyle = rgba(base * 0.9);
      ctx.lineWidth = 1 + bk.depth;
      ctx.beginPath();
      ctx.moveTo(bk.x + bk.s, bk.y + bk.s / 2);
      ctx.lineTo(bk.x + bk.gap, bk.y + bk.s / 2);
      ctx.stroke();
    }

    // blocks
    for (const bk of blocks) {
      const pulse = bk.pulse;
      const grow = 1 + pulse * 0.14;
      const s = bk.s * grow;
      const x = bk.x - (s - bk.s) / 2;
      const y = bk.y - (s - bk.s) / 2;
      const baseA = 0.12 + bk.depth * 0.08;
      const a = baseA + pulse * 0.4;

      // glow on pulse
      if (pulse > 0.02) {
        ctx.shadowColor = rgba(0.8 * pulse);
        ctx.shadowBlur = 24 * pulse;
      } else {
        ctx.shadowBlur = 0;
      }
      roundRect(x, y, s, s, s * 0.22);
      ctx.fillStyle = rgba(a * 0.28);
      ctx.fill();
      ctx.lineWidth = 1.2 + bk.depth * 0.6;
      ctx.strokeStyle = rgba(Math.min(0.9, a + 0.12));
      ctx.stroke();
      ctx.shadowBlur = 0;

      // inner "hash" ticks
      const inA = a * 0.7;
      ctx.strokeStyle = rgba(inA);
      ctx.lineWidth = 1;
      const pad = s * 0.24;
      for (let k = 0; k < 3; k++) {
        const yy = y + pad + ((s - pad * 2) / 3) * k + 3;
        ctx.beginPath();
        ctx.moveTo(x + pad, yy);
        ctx.lineTo(x + s - pad - (k === 1 ? s * 0.18 : 0), yy);
        ctx.stroke();
      }
    }
  }

  function drawGlyphs() {
    if (Math.random() < 0.14 && glyphs.length < 46) spawnGlyph();
    ctx.font = "600 14px 'SF Mono', ui-monospace, monospace";
    for (let i = glyphs.length - 1; i >= 0; i--) {
      const g = glyphs[i];
      g.y -= g.v;
      g.life++;
      if (g.life > g.max || g.y < -20) {
        glyphs.splice(i, 1);
        continue;
      }
      const fade =
        Math.sin((g.life / g.max) * Math.PI) * 0.22; // ease in/out
      ctx.fillStyle = rgba(fade);
      ctx.font = `600 ${g.size}px 'SF Mono', ui-monospace, monospace`;
      ctx.fillText(g.ch, g.x, g.y);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawNetwork();
    drawChain();
    drawGlyphs();
  }

  function loop() {
    if (!running) return;
    t++;
    frame++;
    render();
    raf = requestAnimationFrame(loop);
  }

  /* --------------------------------- api --------------------------------- */
  function setAccent(hex) {
    if (!hex) return;
    const h = hex.replace("#", "").trim();
    if (h.length < 6) return;
    accent = {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
    // repaint immediately so the tint tracks the slide even between frames
    render();
  }
  function pause() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }
  function resume() {
    if (reduce()) return;
    if (!running) {
      running = true;
      loop();
    }
  }

  /* --------------------------------- boot -------------------------------- */
  resize();
  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 160);
  });

  if (reduce()) {
    running = false;
    render(); // single static frame
  } else {
    loop();
  }

  return {
    setAccent,
    pause,
    resume,
    get frame() { return frame; },
  };
})();

if (typeof window !== "undefined") window.Background = Background;
