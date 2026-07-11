/* =============================================================================
   sim-scripts.js — declarative scenarios for the Sim engine, one per
   consensus algorithm. Each factory receives the algorithm's data record
   and returns { nodes, steps, flow }.

   Coordinate space: 100 × 58 (see sim.js).
   ========================================================================== */

const GOOD = "#58e0a5";
const BAD = "#ff5d5d";
const GOLD = "#ffcf7e";

/** N points on a circle. */
function ring(n, cx = 50, cy = 27, r = 18) {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: +(cx + Math.cos(a) * r).toFixed(2), y: +(cy + Math.sin(a) * r * 0.82).toFixed(2) };
  });
}

const flowOf = (a) => ({ label: a.detail.states.label, states: a.detail.states.flow });

/* ------------------------------- PoW ----------------------------------- */
function pow(a) {
  const pos = ring(5, 50, 28, 19);
  const miners = pos.map((p, i) => ({ id: `m${i}`, label: `Miner ${i + 1}`, ...p }));
  return {
    nodes: miners,
    flow: flowOf(a),
    steps: [
      { caption: "Pending transactions pool in every miner's <b>mempool</b>.", flow: -1,
        run: async (s) => {
          for (const m of miners) s.badge(m.id, "tx");
          s.log("Mempools filled with unconfirmed transactions");
          await s.allToAll({ color: "#8a8f9c", r: 0.7, dur: 500 });
        } },
      { caption: "Each miner assembles a <b>candidate block</b> and starts hashing.", flow: 0,
        run: async (s) => {
          miners.forEach((m) => { s.setState(m.id, "active"); s.pulse(m.id); s.badge(m.id, "#"); });
          s.log("Nonce search begins — trillions of hashes per second");
          await s._wait(1100);
        } },
      { caption: "<b>Miner 3</b> finds a hash below the difficulty target!", flow: 1,
        run: async (s) => {
          miners.forEach((m) => s.pulse(m.id, false));
          s.setState("m2", "leader");
          s.badge("m2", "✓");
          s.log("Miner 3 wins the proof search", true);
          await s._wait(500);
        } },
      { caption: "The winning block is <b>broadcast</b> to all peers.", flow: 2,
        run: async (s) => {
          await s.broadcast("m2", { color: "var(--accent)" });
          s.log("Block propagates across the gossip network");
        } },
      { caption: "Peers verify cheaply and <b>extend the chain</b>. Miner 3 collects the reward.", flow: 3,
        run: async (s) => {
          s.block("#841 · Miner 3");
          miners.forEach((m) => s.setState(m.id, m.id === "m2" ? "done" : null));
          s.log("Block #841 confirmed · reward + fees paid");
          await s._wait(500);
        } },
      { caption: "Round 2 — <b>two miners solve at once</b>. The network forks!", flow: 1,
        run: async (s) => {
          miners.forEach((m) => { s.setState(m.id, "active"); s.pulse(m.id); });
          await s._wait(700);
          miners.forEach((m) => s.pulse(m.id, false));
          s.setState("m0", "leader"); s.setState("m4", "leader");
          await Promise.all([
            s.broadcast("m0", { color: "var(--accent)", skip: ["m4"] }),
            s.broadcast("m4", { color: GOLD, skip: ["m0"] }),
          ]);
          s._forkA = s.block("#842a · M1", { fork: "a" });
          s._forkB = s.block("#842b · M5", { fork: "b" });
          s.log("Simultaneous blocks — chain temporarily forks", true);
        } },
      { caption: "The next block lands on branch A — the <b>heavier chain wins</b>.", flow: 4,
        run: async (s) => {
          s.setState("m1", "leader");
          await s.broadcast("m1", { color: "var(--accent)" });
          s.block("#843 · Miner 2");
          s.orphan(s._forkB);
          miners.forEach((m) => s.setState(m.id, "done"));
          s.log("Branch B orphaned · Nakamoto consensus resolves the fork", true);
        } },
    ],
  };
}

/* ------------------------------- PoS ----------------------------------- */
function pos(a) {
  const p = ring(6, 50, 27, 19);
  const stakes = [32, 64, 48, 32, 96, 32];
  const vals = p.map((pt, i) => ({
    id: `v${i}`, label: `V${i + 1}`, sub: `${stakes[i]} ETH`,
    r: 3.4 + stakes[i] / 40, ...pt,
  }));
  return {
    nodes: vals,
    flow: flowOf(a),
    steps: [
      { caption: "Validators <b>bond stake</b> and join the activation queue.", flow: 0,
        run: async (s) => {
          for (const v of vals) { s.setState(v.id, "active"); await s._wait(110); }
          s.log("6 validators active · total stake 304 ETH");
        } },
      { caption: "The protocol draws a <b>proposer</b>, weighted by stake (RANDAO).", flow: 2,
        run: async (s) => {
          for (const v of vals) { s.pulse(v.id); await s._wait(90); s.pulse(v.id, false); }
          s.setState("v4", "leader");
          s.badge("v4", "★");
          s.log("V5 selected — largest stake, highest odds", true);
        } },
      { caption: "V5 <b>proposes a block</b> for its slot and signs it.", flow: 2,
        run: async (s) => {
          await s.broadcast("v4", { color: "var(--accent)" });
          s.block("slot 101 · V5");
          s.log("Block proposed for slot 101");
        } },
      { caption: "A committee <b>attests</b> — votes stream back to the chain head.", flow: 2,
        run: async (s) => {
          await s.gather("v4", { color: GOOD, r: 0.9 });
          s.log("5/5 committee attestations received");
        } },
      { caption: "Two-thirds supermajority → checkpoint <b>justified, then finalized</b>.", flow: 2,
        run: async (s) => {
          vals.forEach((v) => s.setState(v.id, "done"));
          s.block("✓ finalized");
          s.log("Casper FFG: checkpoint finalized — irreversible", true);
          await s._wait(400);
        } },
      { caption: "V2 signs <b>two conflicting blocks</b> — equivocation detected!", flow: 3,
        run: async (s) => {
          vals.forEach((v) => s.setState(v.id, "active"));
          s.setState("v1", "leader");
          await Promise.all([
            s.packet("v1", "v0", { color: BAD }),
            s.packet("v1", "v2", { color: BAD }),
          ]);
          s.log("Double proposal from V2 — slashable offence", true);
        } },
      { caption: "The protocol <b>slashes</b> V2's stake and ejects it.", flow: 4,
        run: async (s) => {
          s.setState("v1", "fault");
          s.sub("v1", "slashed");
          s.size("v1", 3.2);
          s.log("V2 slashed: stake burned, validator exited");
          await s._wait(500);
          vals.filter((v) => v.id !== "v1").forEach((v) => s.setState(v.id, "done"));
        } },
    ],
  };
}

/* ------------------------------- DPoS ---------------------------------- */
function dpos(a) {
  const holders = [
    { id: "h0", label: "Holders", sub: "40k votes", x: 12, y: 14, icon: "◎" },
    { id: "h1", label: "Holders", sub: "25k votes", x: 12, y: 29, icon: "◎" },
    { id: "h2", label: "Holders", sub: "18k votes", x: 12, y: 44, icon: "◎" },
  ].map((h) => ({ ...h, r: 3.6, noRecv: true }));
  const cands = [0, 1, 2, 3].map((i) => ({
    id: `d${i}`, label: `Delegate ${i + 1}`, x: 52 + (i % 2) * 30, y: 13 + Math.floor(i / 2) * 26, r: 4.4,
  }));
  return {
    nodes: [...holders, ...cands],
    mesh: false,
    flow: flowOf(a),
    steps: [
      { caption: "Token holders <b>vote continuously</b> for their delegates.", flow: 0,
        run: async (s) => {
          await Promise.all([
            s.packet("h0", "d0", { color: "var(--accent)" }),
            s.packet("h1", "d1", { color: "var(--accent)", dur: 850 }),
            s.packet("h2", "d0", { color: "var(--accent)", dur: 1000 }),
            s.packet("h0", "d2", { color: "var(--accent)", dur: 900 }),
          ]);
          s.log("Stake-weighted votes stream in");
        } },
      { caption: "The <b>top 3</b> become active block producers; #4 stands by.", flow: 1,
        run: async (s) => {
          ["d0", "d1", "d2"].forEach((d) => s.setState(d, "active"));
          s.sub("d3", "standby");
          s.log("Producer set elected: D1, D2, D3", true);
          await s._wait(400);
        } },
      { caption: "Producers take turns — <b>round-robin</b>, sub-second blocks.", flow: 3,
        run: async (s) => {
          for (const [i, d] of ["d0", "d1", "d2"].entries()) {
            s.setState(d, "leader");
            await s.broadcast(d, { color: "var(--accent)", dur: 420, to: ["d0", "d1", "d2"].filter((x) => x !== d) });
            s.block(`#${120 + i} · D${i + 1}`);
            s.setState(d, "active");
          }
          s.log("3 blocks in 3 slots — coordinated speed");
        } },
      { caption: "A 2/3 producer supermajority marks blocks <b>irreversible</b>.", flow: 3,
        run: async (s) => {
          await s.allToAll({ among: ["d0", "d1", "d2"], color: GOOD, r: 0.8, dur: 450 });
          s.block("✓ LIB");
          s.log("Last Irreversible Block advanced", true);
        } },
      { caption: "D2 goes offline and <b>misses its slot</b>…", flow: 3,
        run: async (s) => {
          s.setState("d1", "fault");
          s.sub("d1", "missed slot");
          s.log("D2 missed production — flagged by voters", true);
          await s._wait(600);
        } },
      { caption: "Voters <b>recall</b> D2 — the standby delegate is promoted.", flow: 4,
        run: async (s) => {
          await Promise.all([
            s.packet("h0", "d3", { color: GOLD }),
            s.packet("h1", "d3", { color: GOLD, dur: 850 }),
          ]);
          s.sub("d1", "recalled");
          s.setState("d3", "active");
          s.sub("d3", "promoted");
          s.log("D4 voted into the active set — social recovery");
          ["d0", "d2", "d3"].forEach((d) => s.setState(d, "done"));
        } },
    ],
  };
}

/* ------------------------------- PBFT ----------------------------------- */
function pbft(a) {
  const client = { id: "c", label: "Client", x: 10, y: 27, r: 3.6, icon: "◇", noRecv: true };
  const p = ring(4, 60, 27, 17);
  const reps = p.map((pt, i) => ({
    id: `r${i}`, label: i === 0 ? "Primary" : `Replica ${i}`, ...pt, r: 4.6,
  }));
  const R = ["r0", "r1", "r2", "r3"];
  return {
    nodes: [client, ...reps],
    mesh: false,
    flow: flowOf(a),
    steps: [
      { caption: "A client sends a <b>request</b> to the primary.", flow: -1,
        run: async (s) => {
          s.setState("r0", "leader");
          await s.packet("c", "r0", { color: GOLD });
          s.log("Request received by primary (view 0)");
        } },
      { caption: "<b>Pre-prepare</b>: the primary assigns a sequence number and broadcasts.", flow: 0,
        run: async (s) => {
          await s.broadcast("r0", { color: "var(--accent)", to: ["r1", "r2", "r3"] });
          s.log("Pre-prepare (n=42) sent to all replicas");
        } },
      { caption: "<b>Prepare</b>: every replica broadcasts to every other — the message storm.", flow: 1,
        run: async (s) => {
          R.forEach((r) => s.setState(r, "active"));
          await s.allToAll({ among: R, color: "var(--accent)", r: 0.8, dur: 620 });
          s.log("2f matching prepares collected → prepared", true);
        } },
      { caption: "<b>Commit</b>: a second all-to-all round locks the order in.", flow: 2,
        run: async (s) => {
          await s.allToAll({ among: R, color: GOOD, r: 0.8, dur: 620 });
          s.log("2f+1 commits → committed-local");
        } },
      { caption: "Replicas <b>execute and reply</b>; the client accepts f+1 matching answers.", flow: 3,
        run: async (s) => {
          await Promise.all(R.map((r) => s.packet(r, "c", { color: GOOD, dur: 650 })));
          s.block("op 42 ✓ final");
          R.forEach((r) => s.setState(r, "done"));
          s.log("Instant, deterministic finality — no forks possible", true);
        } },
      { caption: "The <b>primary crashes</b>. Replicas time out waiting…", flow: 4,
        run: async (s) => {
          s.setState("r0", "fault");
          s.sub?.("r0", "");
          ["r1", "r2", "r3"].forEach((r) => { s.setState(r, "active"); s.pulse(r); });
          s.log("Primary unresponsive — view-change timers fire", true);
          await s._wait(900);
        } },
      { caption: "<b>View change</b>: Replica 1 becomes the new primary. Service resumes.", flow: 4,
        run: async (s) => {
          ["r1", "r2", "r3"].forEach((r) => s.pulse(r, false));
          await s.allToAll({ among: ["r1", "r2", "r3"], color: GOLD, r: 0.8, dur: 520 });
          s.setState("r1", "leader");
          s.log("View 1 established — new primary elected");
          s.block("op 43 ✓ (view 1)");
          ["r1", "r2", "r3"].forEach((r) => s.setState(r, r === "r1" ? "leader" : "done"));
        } },
    ],
  };
}

/* ------------------------------- PoA ------------------------------------ */
function poa(a) {
  const p = ring(4, 50, 27, 17);
  const auth = p.map((pt, i) => ({
    id: `a${i}`, label: `Authority ${i + 1}`, sub: "verified ID", ...pt, r: 4.6, icon: "✓",
  }));
  return {
    nodes: auth,
    flow: flowOf(a),
    steps: [
      { caption: "Governance <b>authorises</b> four vetted, identified signers.", flow: 1,
        run: async (s) => {
          for (const n of auth) { s.setState(n.id, "active"); await s._wait(130); }
          s.log("Signer set: 4 known legal identities");
        } },
      { caption: "The <b>in-turn signer</b> seals the block on schedule.", flow: 2,
        run: async (s) => {
          s.setState("a0", "leader");
          await s.broadcast("a0", { color: "var(--accent)" });
          s.block("#552 · Auth 1");
          s.setState("a0", "active");
          s.log("Block sealed by in-turn authority");
        } },
      { caption: "Next slot — Authority 2 is <b>in-turn</b>. Fast, predictable cadence.", flow: 2,
        run: async (s) => {
          s.setState("a1", "leader");
          await s.broadcast("a1", { color: "var(--accent)" });
          s.block("#553 · Auth 2");
          s.setState("a1", "active");
          s.log("1–5 s block times, near-zero energy");
        } },
      { caption: "Authority 3 is absent — an <b>out-of-turn</b> signer steps in after a delay.", flow: 2,
        run: async (s) => {
          s.sub("a2", "offline");
          s.setState("a2", "fault");
          await s._wait(600);
          s.setState("a3", "leader");
          await s.broadcast("a3", { color: GOLD, skip: ["a2"] });
          s.block("#554 · Auth 4*");
          s.setState("a3", "active");
          s.log("Out-of-turn seal keeps the chain live", true);
        } },
      { caption: "Authority 3 returns and signs a <b>fraudulent block</b>…", flow: 2,
        run: async (s) => {
          s.setState("a2", "fault");
          s.sub("a2", "bad block!");
          await s.broadcast("a2", { color: BAD, skip: [] });
          s.log("Invalid block detected — fraud is attributable", true);
        } },
      { caption: "Signers vote: Authority 3 is <b>deauthorised</b>. Reputation is the stake.", flow: 3,
        run: async (s) => {
          await s.gather("a2", { color: GOLD, r: 0.8 });
          s.sub("a2", "deauthorised");
          s.badge("a2", "✕");
          ["a0", "a1", "a3"].forEach((n) => s.setState(n, "done"));
          s.log("Governance removes the signer — identity burned");
        } },
    ],
  };
}

/* ------------------------------- PoH ------------------------------------ */
function poh(a) {
  const leader = { id: "L", label: "Leader", sub: "slot 88", x: 30, y: 16, r: 5, icon: "⏱" };
  const vals = [0, 1, 2].map((i) => ({
    id: `v${i}`, label: `Validator ${i + 1}`, x: 62 + (i % 2) * 22, y: 14 + i * 12, r: 3.8,
  }));
  const txs = { id: "tx", label: "Transactions", x: 10, y: 40, r: 3.4, icon: "⇄", noRecv: true };
  return {
    nodes: [leader, ...vals, txs],
    mesh: false,
    flow: flowOf(a),
    steps: [
      { caption: "The leader runs a <b>continuous VDF hash sequence</b> — a cryptographic clock.", flow: 0,
        run: async (s) => {
          s.setState("L", "leader");
          s.pulse("L");
          for (let i = 0; i < 4; i++) { s.block(`h${1000 + i}`, {}); await s._wait(200); }
          s.log("Unforgeable timeline ticking (hash → hash → hash)");
        } },
      { caption: "Incoming transactions are <b>stamped into the timeline</b> at exact counts.", flow: 1,
        run: async (s) => {
          await s.packet("tx", "L", { color: GOLD });
          s.block("tx@1004", { cls: "fork-b" });
          await s.packet("tx", "L", { color: GOLD, dur: 500 });
          s.block("tx@1005", { cls: "fork-b" });
          s.log("Order fixed cryptographically before any voting", true);
        } },
      { caption: "Stamped entries are <b>batched into a block</b> and shipped to validators.", flow: 1,
        run: async (s) => {
          s.pulse("L", false);
          await s.broadcast("L", { color: "var(--accent)", to: ["v0", "v1", "v2"] });
          s.block("slot 88 ✓");
          s.log("Entries streamed via Turbine propagation");
        } },
      { caption: "Validators <b>vote (Tower BFT)</b> with exponential lockouts.", flow: 2,
        run: async (s) => {
          ["v0", "v1", "v2"].forEach((v) => s.setState(v, "active"));
          await s.gather("L", { from: ["v0", "v1", "v2"], color: GOOD, r: 0.9 });
          s.log("Votes locked — optimistic confirmation");
        } },
      { caption: "Enough confirmations → the block is <b>rooted</b>, irreversibly.", flow: 3,
        run: async (s) => {
          s.block("rooted ✓");
          ["L", "v0", "v1", "v2"].forEach((n) => s.setState(n, "done"));
          s.log("Rooted — finality without negotiating time", true);
        } },
      { caption: "Next slot: the <b>leader schedule rotates</b> (chosen by stake).", flow: 0,
        run: async (s) => {
          s.setState("L", null); s.sub("L", "");
          s.setState("v0", "leader"); s.sub("v0", "slot 89");
          s.log("V1 leads slot 89 — PoS drives the rotation");
          await s._wait(400);
        } },
    ],
  };
}

/* ------------------------------- PoET ----------------------------------- */
function poet(a) {
  const p = ring(5, 50, 27, 18);
  const waits = [4.2, 1.8, 3.1, 5.6, 2.4];
  const nodes = p.map((pt, i) => ({
    id: `n${i}`, label: `Node ${i + 1}`, sub: "SGX ✓", ...pt, r: 4.2,
  }));
  return {
    nodes,
    flow: flowOf(a),
    steps: [
      { caption: "Nodes register with an <b>attested SGX enclave</b> — trusted silicon.", flow: 0,
        run: async (s) => {
          for (const n of nodes) { s.setState(n.id, "active"); await s._wait(110); }
          s.log("5 enclaves attested and registered");
        } },
      { caption: "Each enclave issues a <b>random wait time</b>.", flow: 1,
        run: async (s) => {
          nodes.forEach((n, i) => s.badge(n.id, `${waits[i]}s`));
          s.log("Timers: 4.2 · 1.8 · 3.1 · 5.6 · 2.4 seconds");
          await s._wait(600);
        } },
      { caption: "Everyone <b>sleeps</b>. The shortest timer will wake first…", flow: 1,
        run: async (s) => {
          nodes.forEach((n) => s.pulse(n.id));
          await s._wait(1000);
          nodes.forEach((n) => s.pulse(n.id, false));
        } },
      { caption: "<b>Node 2 wakes first</b> (1.8 s) and claims the block with attestation.", flow: 2,
        run: async (s) => {
          s.setState("n1", "leader");
          s.badge("n1", "⏰");
          await s.broadcast("n1", { color: "var(--accent)" });
          s.block("#311 · Node 2");
          s.log("Shortest wait wins — a fair hardware lottery", true);
        } },
      { caption: "Peers <b>verify the attestation</b> and run statistical fairness checks.", flow: 2,
        run: async (s) => {
          await s.gather("n1", { color: GOOD, r: 0.8 });
          s.log("z-test: win frequency within honest bounds");
          nodes.forEach((n) => s.setState(n.id, "done"));
        } },
      { caption: "Node 4 wins <b>too often</b> — the z-test flags a compromised enclave.", flow: 3,
        run: async (s) => {
          nodes.forEach((n) => s.setState(n.id, "active"));
          s.setState("n3", "fault");
          s.sub("n3", "flagged");
          s.log("Statistical anti-cheat ejects the suspicious node", true);
          await s._wait(500);
          nodes.filter((n) => n.id !== "n3").forEach((n) => s.setState(n.id, "done"));
        } },
    ],
  };
}

/* ------------------------------- PoC ------------------------------------ */
function poc(a) {
  const sizes = [8, 3, 5, 2];
  const p = ring(4, 50, 27, 17);
  const farmers = p.map((pt, i) => ({
    id: `f${i}`, label: `Farmer ${i + 1}`, sub: `${sizes[i]} TB`, r: 3 + sizes[i] * 0.35, ...pt,
  }));
  return {
    nodes: farmers,
    flow: flowOf(a),
    steps: [
      { caption: "One-time <b>plotting</b>: drives fill with tables of hashes.", flow: 0,
        run: async (s) => {
          for (const f of farmers) { s.setState(f.id, "active"); s.pulse(f.id); await s._wait(150); }
          await s._wait(600);
          farmers.forEach((f) => s.pulse(f.id, false));
          s.log("Plots written: 8 + 3 + 5 + 2 TB committed");
        } },
      { caption: "The network issues a per-block <b>challenge</b>.", flow: 1,
        run: async (s) => {
          await s.allToAll({ color: GOLD, r: 0.7, dur: 450 });
          s.log("Challenge 0x7f3a… broadcast");
        } },
      { caption: "Farmers <b>scan their plots</b> for the closest stored answer.", flow: 2,
        run: async (s) => {
          farmers.forEach((f) => s.pulse(f.id));
          await s._wait(900);
          farmers.forEach((f) => s.pulse(f.id, false));
          s.log("Lookups are cheap — the work was done at plot time");
        } },
      { caption: "<b>Farmer 1's</b> 8 TB farm holds the best proof — probability follows space.", flow: 3,
        run: async (s) => {
          s.setState("f0", "leader");
          await s.broadcast("f0", { color: "var(--accent)" });
          s.block("#77 · F1");
          s.log("Best-quality proof wins block #77", true);
        } },
      { caption: "Chia adds a <b>VDF time-proof</b> so blocks are also spaced in real time.", flow: 3,
        run: async (s) => {
          s.block("⏱ VDF");
          s.log("Proof of Space **and Time** — grinding neutralised");
          await s._wait(400);
        } },
      { caption: "Next challenge — <b>Farmer 3</b> wins this one. Space is the lottery.", flow: 3,
        run: async (s) => {
          s.setState("f0", "done");
          await s.allToAll({ color: GOLD, r: 0.7, dur: 400 });
          s.setState("f2", "leader");
          await s.broadcast("f2", { color: "var(--accent)" });
          s.block("#78 · F3");
          farmers.forEach((f) => s.setState(f.id, "done"));
          s.log("Weighted fairness: bigger farms win proportionally");
        } },
    ],
  };
}

/* ------------------------------- PoB ------------------------------------ */
function pob(a) {
  const eater = { id: "e", label: "Eater address", sub: "unspendable", x: 50, y: 12, r: 4.4, icon: "🔥", noRecv: true };
  const miners = [0, 1, 2].map((i) => ({
    id: `b${i}`, label: `Miner ${i + 1}`, sub: "0 burned", x: 26 + i * 24, y: 40, r: 4.2,
  }));
  return {
    nodes: [eater, ...miners],
    mesh: false,
    flow: flowOf(a),
    steps: [
      { caption: "Miners send coins to a provably <b>unspendable address</b>.", flow: 0,
        run: async (s) => {
          await Promise.all([
            s.packet("b0", "e", { color: GOLD }),
            s.packet("b1", "e", { color: GOLD, dur: 850 }),
          ]);
          s.sub("b0", "50 burned"); s.sub("b1", "120 burned");
          s.log("Burns: M1 → 50, M2 → 120 coins destroyed forever");
        } },
      { caption: "Burns are <b>recorded on-chain</b> — public, verifiable, irreversible.", flow: 1,
        run: async (s) => {
          s.block("burn: 50");
          s.block("burn: 120");
          s.log("Commitments etched into the ledger", true);
        } },
      { caption: "<b>Mining rights</b> are granted in proportion to value burned.", flow: 2,
        run: async (s) => {
          s.size("b0", 4.8); s.size("b1", 5.8);
          s.setState("b0", "active"); s.setState("b1", "active");
          s.log("Rights weighted: M2 has 2.4× M1's chance");
        } },
      { caption: "<b>Miner 2</b> — the biggest burner — wins the block.", flow: 3,
        run: async (s) => {
          s.setState("b1", "leader");
          await s.broadcast("b1", { color: "var(--accent)", skip: ["e"] });
          s.block("#19 · M2");
          s.log("Block forged with zero energy spent", true);
        } },
      { caption: "Burned weight <b>decays</b> — mimicking hardware wearing out.", flow: 3,
        run: async (s) => {
          s.size("b1", 5); s.sub("b1", "decaying…");
          s.log("Old burns count less — keep burning to compete");
          await s._wait(500);
        } },
      { caption: "Miner 3 makes a <b>fresh burn</b> and takes the next block.", flow: 2,
        run: async (s) => {
          await s.packet("b2", "e", { color: GOLD });
          s.sub("b2", "200 burned");
          s.size("b2", 6);
          s.setState("b2", "leader");
          s.block("#20 · M3");
          miners.forEach((m) => s.setState(m.id, m.id === "b2" ? "leader" : "done"));
          s.log("Skin in the game that can never be withdrawn");
        } },
    ],
  };
}

export const SIM_SCRIPTS = { pow, pos, dpos, pbft, poa, poh, poet, poc, pob };
