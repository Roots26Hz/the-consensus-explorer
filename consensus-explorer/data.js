/* =============================================================================
   Consensus Algorithms in Blockchain — data layer
   Single source of truth. Content grounded in the course README, enriched with
   trilemma scores, throughput metrics, smart-contract languages and L1/L2 tags.
   ========================================================================== */

const ALGORITHMS = [
  {
    id: "pow",
    name: "Proof of Work",
    acronym: "PoW",
    accent: "#f7931a", // bitcoin orange
    tagline: "Burn energy, earn trust.",
    mechanism:
      "Miners spend real computational energy racing to solve a cryptographic puzzle; the winner writes the next block.",
    steps: [
      "Nodes collect pending transactions into a candidate block.",
      "Miners repeatedly hash the block header with different nonces, hunting for a hash below the target difficulty.",
      "The first miner to find a valid hash broadcasts the block to the network.",
      "Other nodes cheaply verify the hash and, if valid, append the block and start on the next one.",
      "The winning miner collects the block reward plus transaction fees.",
    ],
    trilemma: { scalability: 2, security: 9, decentralization: 9 },
    metrics: { blockTime: "~10 min", tps: "~7", energy: "Very high" },
    security: {
      attack51:
        "An attacker must out-hash the entire honest network — economically ruinous for large chains like Bitcoin.",
      sybil:
        "Sybil-resistant by design: influence is bought with hardware and electricity, not identities.",
    },
    chains: [
      { name: "Bitcoin", ticker: "BTC", layer: "L1", languages: ["Bitcoin Script"], l2: ["Lightning Network"],
        why: "Maximal security and censorship-resistance for a global store of value — throughput is deliberately traded away." },
      { name: "Litecoin", ticker: "LTC", layer: "L1", languages: ["Bitcoin Script"], l2: ["Lightning Network"],
        why: "A faster, lighter PoW payments chain using Scrypt to keep mining more accessible." },
      { name: "Dogecoin", ticker: "DOGE", layer: "L1", languages: ["Bitcoin Script"], l2: [],
        why: "Merge-mined with Litecoin for cheap, fast tips and payments while inheriting PoW security." },
    ],
  },
  {
    id: "pos",
    name: "Proof of Stake",
    acronym: "PoS",
    accent: "#627eea", // ethereum blue
    tagline: "Skin in the game, not gigawatts.",
    mechanism:
      "Validators lock up capital as a stake; the protocol picks block proposers by stake, and misbehaviour gets the stake slashed.",
    steps: [
      "A validator deposits (stakes) the chain's native coin into the protocol.",
      "For each slot, the protocol pseudo-randomly selects a proposer, weighted by stake size.",
      "The proposer builds and signs the next block; a committee of validators attests to it.",
      "Once enough attestations accumulate, the block reaches finality.",
      "Honest validators earn rewards; equivocating or offline validators get slashed.",
    ],
    trilemma: { scalability: 7, security: 8, decentralization: 6 },
    metrics: { blockTime: "~12 sec", tps: "~15–100", energy: "Very low" },
    security: {
      attack51:
        "Attacking the chain means acquiring and risking ~a third to a half of all staked value, which is then slashable.",
      sybil:
        "Sybil-resistant through economic stake: spinning up many validators still requires proportional capital.",
    },
    chains: [
      { name: "Ethereum", ticker: "ETH", layer: "L1", languages: ["Solidity", "Vyper"], l2: ["Arbitrum", "Optimism", "Polygon zkEVM", "Base"],
        why: "A world computer that needs sustainable security and a huge validator set — PoS enables both plus an L2-centric roadmap." },
      { name: "Cardano", ticker: "ADA", layer: "L1", languages: ["Plutus (Haskell)", "Aiken", "Marlowe"], l2: ["Hydra"],
        why: "Peer-reviewed Ouroboros PoS targets provable security and formal-methods-friendly contracts." },
      { name: "Polkadot", ticker: "DOT", layer: "L1", languages: ["ink! (Rust)", "Solidity"], l2: ["Parachains"],
        why: "Nominated PoS secures a relay chain that shares security across many specialised parachains." },
    ],
  },
  {
    id: "dpos",
    name: "Delegated Proof of Stake",
    acronym: "DPoS",
    accent: "#ff4d6d",
    tagline: "A blockchain democracy for speed.",
    mechanism:
      "Token holders vote for a small set of elected block producers who take turns forging blocks — trading some decentralisation for raw speed.",
    steps: [
      "Token holders continuously vote for delegates (block producers), weighted by their token balance.",
      "The top-N delegates are elected into the active producer set.",
      "Elected producers take turns, in a scheduled round-robin, to produce blocks.",
      "Blocks are confirmed quickly because only a small, known set must coordinate.",
      "Underperforming or malicious delegates get voted out and replaced.",
    ],
    trilemma: { scalability: 9, security: 7, decentralization: 4 },
    metrics: { blockTime: "~0.5–3 sec", tps: "~1,000–4,000", energy: "Very low" },
    security: {
      attack51:
        "Requires colluding or capturing a majority of the small elected producer set — easier than PoW/PoS but socially visible and vote-reversible.",
      sybil:
        "Sybil-resistant via stake-weighted voting; fake identities carry no voting power without tokens.",
    },
    chains: [
      { name: "EOS", ticker: "EOS", layer: "L1", languages: ["C++"], l2: [],
        why: "21 block producers deliver sub-second blocks for high-throughput dApps." },
      { name: "TRON", ticker: "TRX", layer: "L1", languages: ["Solidity"], l2: [],
        why: "27 super representatives make TRON cheap and fast for high-volume content and stablecoin transfers." },
      { name: "Steem", ticker: "STEEM", layer: "L1", languages: ["C++"], l2: [],
        why: "Fast, feeless DPoS suits a social platform where posting and voting must feel instant." },
    ],
  },
  {
    id: "pbft",
    name: "Practical Byzantine Fault Tolerance",
    acronym: "PBFT",
    accent: "#20c997",
    tagline: "Vote to agreement, tolerate traitors.",
    mechanism:
      "Known, permissioned nodes exchange votes across multiple rounds to agree on state, tolerating up to one-third faulty or malicious nodes.",
    steps: [
      "A primary node proposes an ordering for the next batch of requests (pre-prepare).",
      "Replicas broadcast 'prepare' messages to confirm they saw the same proposal.",
      "Once enough prepares match, replicas broadcast 'commit' messages.",
      "After a two-thirds quorum of commits, the request is executed with instant finality.",
      "If the primary is faulty, a view-change elects a new primary.",
    ],
    trilemma: { scalability: 8, security: 9, decentralization: 3 },
    metrics: { blockTime: "Instant finality", tps: "~1,000–10,000", energy: "Very low" },
    security: {
      attack51:
        "Safe as long as fewer than one-third of the known validators are Byzantine; no probabilistic reorg risk.",
      sybil:
        "Relies on identity/permissioning — Sybil resistance comes from membership control, not open participation.",
    },
    chains: [
      { name: "Hyperledger Fabric", ticker: "—", layer: "L1", languages: ["Go", "Java", "JavaScript (chaincode)"], l2: [],
        why: "Enterprise consortia need known participants, instant finality and privacy — PBFT-style ordering fits perfectly." },
      { name: "Zilliqa", ticker: "ZIL", layer: "L1", languages: ["Scilla"], l2: [],
        why: "Combines PoW (for Sybil resistance) with PBFT to reach consensus inside sharded committees at high TPS." },
    ],
  },
  {
    id: "poa",
    name: "Proof of Authority",
    acronym: "PoA",
    accent: "#9b8cff",
    tagline: "Reputation is the stake.",
    mechanism:
      "A pre-approved set of identified validators signs blocks; their real-world reputation, not capital or compute, is on the line.",
    steps: [
      "Validators are vetted and approved, tying a real identity to each node.",
      "Approved validators take turns signing new blocks on a fixed schedule.",
      "Because signers are trusted and few, blocks are produced quickly and cheaply.",
      "Any fraudulent block is attributable to a named validator.",
      "Misbehaving validators are removed and lose their reputation and privileges.",
    ],
    trilemma: { scalability: 9, security: 8, decentralization: 1 },
    metrics: { blockTime: "~1–5 sec", tps: "~1,000+", energy: "Negligible" },
    security: {
      attack51:
        "Only the approved validators can attack — mitigated by legal identity and reputational accountability rather than economics.",
      sybil:
        "Fully Sybil-resistant: you cannot join without passing identity approval.",
    },
    chains: [
      { name: "VeChain", ticker: "VET", layer: "L1", languages: ["Solidity"], l2: [],
        why: "Supply-chain enterprises want fast, predictable, low-cost blocks from known authority nodes." },
      { name: "Ethereum Görli/Testnets", ticker: "—", layer: "L1", languages: ["Solidity", "Vyper"], l2: [],
        why: "PoA testnets give developers a cheap, stable, fast environment without real staking economics." },
    ],
  },
  {
    id: "poh",
    name: "Proof of History",
    acronym: "PoH",
    accent: "#14f195", // solana green
    tagline: "A cryptographic clock for consensus.",
    mechanism:
      "A verifiable delay function stamps a trustless passage of time into the ledger, letting validators agree on order without waiting to talk.",
    steps: [
      "A sequential hash function runs continuously, each output feeding the next — an unforgeable timeline.",
      "Transactions and events are woven into this hash timeline at specific counts.",
      "The sequence proves that events happened in a definite order and spacing.",
      "Validators (using PoS) no longer need to message each other just to agree on time.",
      "Removing that coordination bottleneck unlocks extremely high throughput.",
    ],
    trilemma: { scalability: 10, security: 7, decentralization: 5 },
    metrics: { blockTime: "~0.4 sec", tps: "~2,000–65,000", energy: "Low" },
    security: {
      attack51:
        "Secured by an underlying PoS validator set; PoH itself only orders time, so stake attacks still apply.",
      sybil:
        "Sybil resistance comes from the paired PoS layer; high hardware demands also raise the entry bar.",
    },
    chains: [
      { name: "Solana", ticker: "SOL", layer: "L1", languages: ["Rust", "C", "Anchor"], l2: [],
        why: "Consumer-scale apps demand tens of thousands of TPS and sub-second blocks — PoH removes the timing bottleneck." },
    ],
  },
  {
    id: "poet",
    name: "Proof of Elapsed Time",
    acronym: "PoET",
    accent: "#00b4d8",
    tagline: "A fair lottery, sealed in silicon.",
    mechanism:
      "Each node waits a random time issued by trusted hardware; the shortest waiter wins the block — a lottery without the energy burn.",
    steps: [
      "Every node requests a random wait time from a Trusted Execution Environment (e.g. Intel SGX).",
      "The hardware guarantees the wait was random and actually observed.",
      "Nodes sleep for their assigned duration.",
      "The node with the shortest wait wakes first and proposes the block.",
      "Others verify the hardware attestation before accepting the block.",
    ],
    trilemma: { scalability: 8, security: 8, decentralization: 4 },
    metrics: { blockTime: "Configurable", tps: "~1,000s", energy: "Very low" },
    security: {
      attack51:
        "Fairness rests on trusted hardware; a compromised TEE or vendor is the main threat vector.",
      sybil:
        "Sybil resistance is enforced by attested hardware identities, typically in permissioned settings.",
    },
    chains: [
      { name: "Hyperledger Sawtooth", ticker: "—", layer: "L1", languages: ["Python", "Go", "JavaScript", "Rust"], l2: [],
        why: "Enterprises get PoW-like fairness with near-zero energy by leaning on secure hardware timers." },
    ],
  },
  {
    id: "poc",
    name: "Proof of Space / Capacity",
    acronym: "PoC",
    accent: "#84cc16",
    tagline: "Mine with storage, not with heat.",
    mechanism:
      "Miners pre-compute large datasets and store them on disk; whoever holds the winning plot for a block wins — using space instead of energy.",
    steps: [
      "Miners run a one-time 'plotting' step, filling hard drives with cryptographic hashes.",
      "When a new block challenge appears, miners scan their plots for the closest matching value.",
      "The miner with the best stored answer earns the right to create the block.",
      "More allocated storage means a higher probability of winning.",
      "Verification is cheap; only plotting and lookup use resources.",
    ],
    trilemma: { scalability: 6, security: 7, decentralization: 7 },
    metrics: { blockTime: "~18 sec (Chia)", tps: "~20", energy: "Low" },
    security: {
      attack51:
        "An attacker must control more storage than the honest network — cheaper than PoW hashpower but still capital-heavy.",
      sybil:
        "Sybil-resistant via committed disk space; fake nodes without plots have no chance of winning.",
    },
    chains: [
      { name: "Chia", ticker: "XCH", layer: "L1", languages: ["Chialisp"], l2: [],
        why: "Aims for a greener, commodity-hardware alternative to Bitcoin using farmed storage." },
      { name: "Burstcoin / Signum", ticker: "SIGNA", layer: "L1", languages: ["Java (smart contracts)"], l2: [],
        why: "Pioneered energy-light mining on everyday hard drives for accessible participation." },
    ],
  },
  {
    id: "pob",
    name: "Proof of Burn",
    acronym: "PoB",
    accent: "#ff6b35",
    tagline: "Destroy coins to earn the right to mine.",
    mechanism:
      "Miners permanently send coins to an unspendable address; that verifiable sacrifice grants proportional mining rights — a virtual, energy-free investment.",
    steps: [
      "A miner sends coins to a provably unspendable 'burn' address.",
      "The burn is recorded on-chain as an irreversible commitment.",
      "Mining rights are granted in proportion to the amount burned.",
      "Burners can then create blocks and earn ongoing rewards.",
      "Committed capital is destroyed rather than spent on hardware or power.",
    ],
    trilemma: { scalability: 4, security: 7, decentralization: 6 },
    metrics: { blockTime: "Varies", tps: "Low", energy: "Very low" },
    security: {
      attack51:
        "Dominating the chain requires burning more value than everyone else — costly and permanently sunk.",
      sybil:
        "Sybil-resistant because influence is tied to verifiably destroyed coins, not identities.",
    },
    chains: [
      { name: "Slimcoin", ticker: "SLM", layer: "L1", languages: ["Bitcoin Script"], l2: [],
        why: "Uses burning as a long-term energy-free commitment mechanism layered with PoW and PoS ideas." },
    ],
  },
];

/* Flat list of every blockchain, tagged with its consensus id — used by the
   compatibility matrix. Order groups chains loosely by family for readability. */
const BLOCKCHAINS = ALGORITHMS.flatMap((a) =>
  a.chains.map((c) => ({
    name: c.name,
    short: c.name.split(" ")[0].replace("Ethereum", "ETH-Test"),
    ticker: c.ticker,
    algoId: a.id,
    algoName: a.name,
    algoAcronym: a.acronym,
    accent: a.accent,
    layer: c.layer,
  }))
);

if (typeof window !== "undefined") {
  window.ALGORITHMS = ALGORITHMS;
  window.BLOCKCHAINS = BLOCKCHAINS;
}
