/* =============================================================================
   sim.js — step-driven consensus simulation engine
   Renders an SVG network stage plus chain strip, lifecycle flow, caption,
   event log and transport controls. Scripts (sim-scripts.js) declare nodes
   and an ordered list of steps; the engine executes them with animated
   packets, node state changes and narration.

   Determinism: "next" runs one step animated; "prev"/seek rebuilds by
   replaying from zero with animations disabled (fast mode).
   ========================================================================== */

const SVGNS = "http://www.w3.org/2000/svg";
const VIEW_W = 100;
const VIEW_H = 58;

function svgEl(name, attrs = {}) {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export class Sim {
  /**
   * @param {HTMLElement} root  .sim-panel element containing stage/controls
   * @param {{nodes:Array, steps:Array, flow?:{label:string,states:string[]}}} script
   */
  constructor(root, script) {
    this.root = root;
    this.script = script;
    this.speed = 1;
    this.fast = false;      // replay mode: skip animations
    this.playing = false;
    this.stepIndex = 0;     // next step to run
    this.destroyed = false;
    this._token = 0;        // cancels in-flight play loops

    this.stage = root.querySelector(".sim-stage");
    this.captionEl = root.querySelector(".sim-caption");
    this.logEl = root.querySelector(".sim-log");
    this.chainEl = root.querySelector(".sim-chain-blocks");
    this.flowEl = root.querySelector(".sim-flow-chips");
    this.countEl = root.querySelector(".sim-step-count");

    this.stage.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    this._buildFlow();
    this.reset(false);
  }

  /* ------------------------------ lifecycle ----------------------------- */
  destroy() {
    this.destroyed = true;
    this._token++;
  }

  reset(announce = true) {
    this._token++;
    this.playing = false;
    this.stepIndex = 0;
    this.nodes = new Map();
    this.stage.innerHTML = "";
    this.chainEl.innerHTML = "";
    this.logEl.innerHTML = "";
    this._forkCol = null;
    this._setFlow(-1);

    // wires between all declared nodes (subtle mesh)
    const defs = this.script.nodes;
    if (this.script.mesh !== false) {
      for (let i = 0; i < defs.length; i++) {
        for (let j = i + 1; j < defs.length; j++) {
          if (defs[i].wire === false || defs[j].wire === false) continue;
          this.stage.appendChild(
            svgEl("line", {
              x1: defs[i].x, y1: defs[i].y, x2: defs[j].x, y2: defs[j].y,
              class: "sim-wire",
            })
          );
        }
      }
    }
    defs.forEach((d) => this._addNode(d));
    this.caption(announce ? "Press play to run the simulation." : "");
    this._sync();
  }

  _addNode(d) {
    const g = svgEl("g", { class: "sim-node", "data-id": d.id });
    const r = d.r || 4.6;
    g.appendChild(svgEl("circle", { cx: d.x, cy: d.y, r, class: "sn-body" }));
    const label = svgEl("text", { x: d.x, y: d.y + r + 3.4, class: "sn-label", "font-size": 2.6 });
    label.textContent = d.label;
    g.appendChild(label);
    if (d.sub) {
      const sub = svgEl("text", { x: d.x, y: d.y + r + 6.6, class: "sn-sub", "font-size": 2 });
      sub.textContent = d.sub;
      g.appendChild(sub);
    }
    const badge = svgEl("text", { x: d.x, y: d.y + 1.1, class: "sn-badge", "font-size": 3 });
    badge.textContent = d.icon || "";
    g.appendChild(badge);
    this.stage.appendChild(g);
    this.nodes.set(d.id, { ...d, r, el: g, badgeEl: badge, subEl: g.querySelector(".sn-sub") });
  }

  _buildFlow() {
    const flow = this.script.flow;
    this.flowEl.innerHTML = "";
    if (!flow) return;
    flow.states.forEach((s, i) => {
      if (i) {
        const a = document.createElement("span");
        a.className = "flow-arrow";
        a.textContent = "→";
        this.flowEl.appendChild(a);
      }
      const c = document.createElement("span");
      c.className = "flow-chip";
      c.textContent = s;
      this.flowEl.appendChild(c);
    });
  }

  _setFlow(idx) {
    [...this.flowEl.querySelectorAll(".flow-chip")].forEach((c, i) =>
      c.classList.toggle("on", i === idx)
    );
  }

  /* ------------------------------ transport ----------------------------- */
  get total() { return this.script.steps.length; }
  get atEnd() { return this.stepIndex >= this.total; }

  async play() {
    if (this.playing) return;
    if (this.atEnd) await this.seek(0);
    this.playing = true;
    this._emit();
    const token = ++this._token;
    while (this.playing && !this.atEnd && token === this._token) {
      await this._runStep(this.stepIndex);
      if (token !== this._token) return;
      this.stepIndex++;
      this._sync();
      await this._wait(650);
    }
    if (token === this._token) {
      this.playing = false;
      this._emit();
    }
  }

  pause() {
    this.playing = false;
    this._token++;
    this._emit();
  }

  async next() {
    if (this.atEnd || this.playing) return;
    this._token++;
    const token = this._token;
    await this._runStep(this.stepIndex);
    if (token !== this._token) return;
    this.stepIndex++;
    this._sync();
  }

  async prev() {
    if (this.playing) this.pause();
    await this.seek(Math.max(0, this.stepIndex - 1));
  }

  /** Rebuild deterministically to `idx` by fast-replaying from zero. */
  async seek(idx) {
    this._token++;
    this.playing = false;
    this.fast = true;
    this.reset(false);
    for (let i = 0; i < idx; i++) await this._runStep(i);
    this.fast = false;
    this.stepIndex = idx;
    this._sync();
    this._emit();
  }

  async _runStep(i) {
    const step = this.script.steps[i];
    if (!step) return;
    this.caption(step.caption, true);
    if (step.flow !== undefined) this._setFlow(step.flow);
    await step.run(this);
  }

  _sync() {
    this.countEl.textContent = `step ${Math.min(this.stepIndex, this.total)} / ${this.total}`;
    this._emit();
  }

  _emit() { this.root.dispatchEvent(new CustomEvent("simstate")); }

  /* ------------------------------ primitives ---------------------------- */
  _dur(ms) { return this.fast ? 0 : ms / this.speed; }

  _wait(ms) {
    const d = this._dur(ms);
    return d ? new Promise((r) => setTimeout(r, d)) : Promise.resolve();
  }

  caption(text, hl = false) {
    this.captionEl.innerHTML = text;
    this.captionEl.style.opacity = text ? 1 : 0;
  }

  log(text, hl = false) {
    const d = document.createElement("div");
    if (hl) d.className = "hl";
    d.innerHTML = text;
    this.logEl.prepend(d);
    while (this.logEl.children.length > 40) this.logEl.lastChild.remove();
  }

  setState(id, state) {
    const n = this.nodes.get(id);
    if (!n) return;
    n.el.classList.remove("is-active", "is-leader", "is-fault", "is-done", "pulsing");
    if (state) n.el.classList.add(`is-${state}`);
    if (state === "fault") {
      if (!n.faultX) {
        const s = n.r * 0.5;
        n.faultX = svgEl("g", { class: "sn-fault" });
        n.faultX.appendChild(svgEl("line", { x1: n.x - s, y1: n.y - s, x2: n.x + s, y2: n.y + s, class: "sn-fault-x" }));
        n.faultX.appendChild(svgEl("line", { x1: n.x + s, y1: n.y - s, x2: n.x - s, y2: n.y + s, class: "sn-fault-x" }));
        n.el.appendChild(n.faultX);
      }
    } else if (n.faultX) {
      n.faultX.remove();
      n.faultX = null;
    }
  }

  pulse(id, on = true) {
    const n = this.nodes.get(id);
    if (n) n.el.classList.toggle("pulsing", on && !this.fast);
  }

  badge(id, text) {
    const n = this.nodes.get(id);
    if (n) n.badgeEl.textContent = text ?? "";
  }

  sub(id, text) {
    const n = this.nodes.get(id);
    if (n && n.subEl) n.subEl.textContent = text ?? "";
  }

  size(id, r) {
    const n = this.nodes.get(id);
    if (!n) return;
    n.r = r;
    n.el.querySelector(".sn-body").setAttribute("r", r);
  }

  /** Animated packet from node A to node B. */
  packet(from, to, opts = {}) {
    const a = this.nodes.get(from);
    const b = this.nodes.get(to);
    if (!a || !b) return Promise.resolve();
    const dur = this._dur(opts.dur || 700);
    // hidden tabs freeze the animation clock — resolve instantly there
    if (!dur || document.hidden) return Promise.resolve();

    const dot = svgEl("circle", {
      cx: a.x, cy: a.y, r: opts.r || 1.1,
      fill: opts.color || "var(--accent)",
      class: "sim-packet",
      style: `color:${opts.color || "var(--accent)"}`,
    });
    this.stage.appendChild(dot);
    const anim = dot.animate(
      [
        { transform: "translate(0,0)" },
        { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px)` },
      ],
      { duration: dur, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
    );
    // race finished against a timer so a throttled tab can never wedge playback
    const done = new Promise((r) => setTimeout(r, dur + 250));
    return Promise.race([anim.finished.catch(() => {}), done]).then(() => dot.remove());
  }

  /** One-to-all packets in parallel. */
  broadcast(from, opts = {}) {
    const targets = opts.to || [...this.nodes.keys()].filter(
      (id) => id !== from && !(opts.skip || []).includes(id) && !this.nodes.get(id).noRecv
    );
    return Promise.all(targets.map((t, i) =>
      this._wait(i * 40).then(() => this.packet(from, t, opts))
    ));
  }

  /** All-to-one packets in parallel. */
  gather(to, opts = {}) {
    const sources = opts.from || [...this.nodes.keys()].filter(
      (id) => id !== to && !(opts.skip || []).includes(id) && !this.nodes.get(id).noRecv
    );
    return Promise.all(sources.map((s, i) =>
      this._wait(i * 40).then(() => this.packet(s, to, opts))
    ));
  }

  /** Every node messages every other node (BFT storms). */
  allToAll(opts = {}) {
    const ids = (opts.among || [...this.nodes.keys()]).filter(
      (id) => !(opts.skip || []).includes(id)
    );
    const jobs = [];
    ids.forEach((a, i) => ids.forEach((b) => {
      if (a !== b) jobs.push(this._wait(i * 60).then(() => this.packet(a, b, opts)));
    }));
    return Promise.all(jobs);
  }

  /* ------------------------------ chain strip --------------------------- */
  block(label, opts = {}) {
    const chip = document.createElement("span");
    chip.className = "chain-block" + (opts.cls ? ` ${opts.cls}` : "");
    chip.textContent = label;
    if (opts.fork) {
      // start (or extend) a two-branch column
      if (!this._forkCol) {
        this._forkCol = document.createElement("span");
        this._forkCol.className = "chain-fork-col";
        this._appendLink();
        this.chainEl.appendChild(this._forkCol);
      }
      chip.classList.add(opts.fork === "b" ? "fork-b" : "fork-a");
      this._forkCol.appendChild(chip);
    } else {
      this._forkCol = null;
      if (this.chainEl.children.length) this._appendLink();
      this.chainEl.appendChild(chip);
    }
    this.chainEl.scrollLeft = this.chainEl.scrollWidth;
    return chip;
  }

  _appendLink() {
    const l = document.createElement("span");
    l.className = "chain-link";
    l.textContent = "⛓";
    this.chainEl.appendChild(l);
  }

  orphan(chip) { chip?.classList.add("orphaned"); }
}
