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
    meta: {
      category: "Public · Permissionless",
      sybil: "Physical hardware + electricity",
      faultModel: "Honest majority of hashpower (>50%)",
      finality: "Probabilistic (deepens with confirmations)",
    },
    detail: {
      how: [
        "Every participating miner assembles a candidate block from the mempool — a coinbase transaction, a set of pending transactions, and a header committing to their Merkle root, the previous block hash, a timestamp, the difficulty target, and a nonce.",
        "Mining is a brute-force search: the miner repeatedly changes the nonce (and extra-nonce) and hashes the header, hunting for an output numerically below the target difficulty. Finding a valid hash is astronomically hard; verifying one is a single hash, so the rest of the network checks it near-instantly.",
        "The first miner to find a valid hash broadcasts the block. Honest nodes validate it and extend the chain with the most accumulated work (Nakamoto consensus). Ties and short forks resolve as the heavier branch wins; losing blocks become orphans/stales.",
      ],
      phases: [
        { t: "Mempool collection", d: "Nodes gather and prioritise unconfirmed transactions, usually by fee density." },
        { t: "Block template assembly", d: "Transactions are packed into a candidate block; the coinbase and Merkle root are fixed." },
        { t: "Proof search (hashing loop)", d: "Miners iterate the nonce, hashing the header until an output falls below the difficulty target." },
        { t: "Propagation", d: "The winning block is gossiped across the peer-to-peer network." },
        { t: "Validation & extension", d: "Peers cheaply verify the hash, transactions, and rules, then build on top of it." },
        { t: "Difficulty retarget", d: "Periodically (e.g. every 2016 blocks in Bitcoin, ~2 weeks) the target adjusts to hold block time roughly constant." },
      ],
      states: {
        label: "Block lifecycle",
        flow: ["candidate", "mined", "propagated", "confirmed (N deep)", "orphaned / stale"],
      },
      attacks: [
        { t: "51% attack", d: "An attacker who out-hashes the honest network can reorg recent blocks to double-spend or censor. For large chains the hardware and energy cost is prohibitive." },
        { t: "Selfish mining", d: "A miner withholding found blocks can, above a hashpower threshold, gain more than its fair share of rewards." },
        { t: "Eclipse attacks", d: "Isolating a node's peer connections can feed it a false view of the chain." },
        { t: "ASIC / pool centralisation", d: "Specialised hardware and large mining pools concentrate practical control despite open participation." },
      ],
      notes: [
        "Finality is never absolute — it grows with depth. The ~6-confirmation convention for Bitcoin reflects the exponentially shrinking odds of a reorg that deep.",
        "The difficulty-adjustment feedback loop is what keeps block time stable as global hashpower rises or falls; it is arguably the quietest but most important part of the design.",
      ],
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
    meta: {
      category: "Public · Permissionless",
      sybil: "Economic stake (locked capital)",
      faultModel: "Honest supermajority of stake (>2/3)",
      finality: "Deterministic checkpoint finality (economic)",
    },
    detail: {
      how: [
        "A validator deposits the chain's native asset into a staking contract and joins an activation queue. Once active, it becomes eligible to propose and attest to blocks.",
        "Time is divided into slots and epochs. For each slot a proposer is chosen pseudo-randomly, weighted by stake (Ethereum uses RANDAO for randomness). A committee of other validators attests to the proposed block.",
        "Attestations accumulate. Under a finality gadget such as Casper FFG, checkpoints that gather a two-thirds supermajority link become justified, then finalized — giving deterministic, economically-backed finality rather than the probabilistic settling of PoW.",
      ],
      phases: [
        { t: "Deposit & activation", d: "Stake is bonded and the validator waits in the activation queue." },
        { t: "Proposer selection", d: "A stake-weighted pseudo-random draw picks the slot's block proposer." },
        { t: "Block proposal", d: "The proposer builds and signs the block for its slot." },
        { t: "Attestation", d: "A committee votes on the head of the chain and the proposed block." },
        { t: "Justification & finalization", d: "Two-thirds attestation on checkpoints justifies then finalizes them." },
        { t: "Rewards, penalties & exit", d: "Honest work is rewarded; equivocation or downtime is slashed; validators can queue to exit." },
      ],
      states: {
        label: "Validator lifecycle (Ethereum-style)",
        flow: ["deposited", "pending / queued", "active", "exiting / slashed", "exited", "withdrawable"],
      },
      attacks: [
        { t: "Nothing-at-stake", d: "Historically validators could cheaply vote on every fork. Solved by slashing, which makes equivocation destroy the bond." },
        { t: "Long-range attack", d: "Old keys could rewrite deep history; mitigated by weak-subjectivity checkpoints that new nodes trust on sync." },
        { t: "Stake grinding", d: "Attempts to bias the randomness source in one's favour; countered by RANDAO/VDF hardening." },
        { t: "Stake concentration", d: "Wealth and liquid-staking providers can centralise influence — the 'rich get richer' critique." },
      ],
      notes: [
        "Slashing is the linchpin: it converts an abstract economic assumption into an enforceable penalty, turning capital-at-risk into real Sybil resistance.",
        "Weak subjectivity is the honest trade PoS makes for finality — a freshly syncing node must trust a recent checkpoint rather than deriving everything from genesis as in PoW.",
      ],
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
    meta: {
      category: "Public · Permissionless (representative)",
      sybil: "Token-weighted votes",
      faultModel: "Honest 2/3+1 of the elected producer set",
      finality: "Fast (BFT-style producer confirmation)",
    },
    detail: {
      how: [
        "Token holders continuously vote for delegates (block producers / witnesses), with voting power proportional to their token balance. Votes can be redirected at any time.",
        "The top-N candidates by votes form the active producer set for each round. Producers are shuffled into a schedule and take turns creating blocks in round-robin order.",
        "Because only a small, known set must coordinate, blocks confirm in sub-second time. Many DPoS chains layer a BFT step so that once 2/3 of producers confirm a block it becomes irreversible (the 'last irreversible block').",
      ],
      phases: [
        { t: "Continuous voting", d: "Holders stake votes toward delegates; standings update in real time." },
        { t: "Delegate election", d: "The top-N vote-getters become the active producers for the round." },
        { t: "Schedule shuffle", d: "Producers are randomised into a turn order to prevent predictable targeting." },
        { t: "Round-robin production", d: "Each producer forges its scheduled block in sequence." },
        { t: "BFT confirmation", d: "A 2/3 producer supermajority marks the block irreversible." },
        { t: "Rotation / recall", d: "Underperforming or malicious delegates are voted out and replaced." },
      ],
      states: {
        label: "Delegate lifecycle",
        flow: ["candidate", "elected (active)", "standby", "scheduled → produced / missed", "recalled"],
      },
      attacks: [
        { t: "Cartel collusion", d: "A colluding majority of the small producer set can censor or reorder — the central risk of DPoS." },
        { t: "Voter apathy", d: "Low participation lets a minority of tokens entrench the same producers." },
        { t: "Vote buying", d: "Producers can bribe holders with a share of rewards, distorting the election." },
        { t: "Attribution upside", d: "Any misbehaviour is publicly attributable and reversible by the vote, unlike a silent PoW/PoS attack." },
      ],
      notes: [
        "The producer count is the core tuning knob: fewer producers means faster coordination but weaker decentralisation, and vice-versa.",
        "Standby producers and continuous re-election give DPoS a social recovery path that purely cryptographic mechanisms lack.",
      ],
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
    meta: {
      category: "Enterprise · Permissioned",
      sybil: "Identity / membership control",
      faultModel: "n ≥ 3f + 1 — tolerates f Byzantine nodes",
      finality: "Deterministic & immediate on commit",
    },
    detail: {
      how: [
        "PBFT solves the Byzantine Generals Problem: reaching agreement when some participants may lie. Nodes are identified and permissioned, and one acts as the primary (leader) for the current view.",
        "A client request flows through a three-phase agreement — pre-prepare, prepare, commit — where replicas exchange signed messages and count matching votes to reach quorums. Once a replica collects a commit quorum it executes the request and replies.",
        "If the primary is slow or faulty, replicas trigger a view change to elect a new primary. Periodic checkpoints let nodes garbage-collect old messages and agree on a stable state.",
      ],
      phases: [
        { t: "Request", d: "A client sends an operation to the primary." },
        { t: "Pre-prepare", d: "The primary assigns a sequence number and broadcasts the request to all replicas." },
        { t: "Prepare", d: "Replicas broadcast prepare messages; collecting 2f matching marks the request 'prepared'." },
        { t: "Commit", d: "Replicas broadcast commit messages; a 2f+1 quorum makes it 'committed-local'." },
        { t: "Reply", d: "Each replica executes and replies; the client accepts on f+1 matching replies." },
        { t: "View change / checkpoint", d: "A faulty primary triggers re-election; stable checkpoints prune history." },
      ],
      states: {
        label: "Request state machine",
        flow: ["pre-prepared", "prepared", "committed-local", "executed", "(view-change)"],
      },
      attacks: [
        { t: "One-third bound", d: "Safety and liveness hold as long as fewer than n/3 nodes are Byzantine; beyond that, no guarantees." },
        { t: "O(n²) message overhead", d: "All-to-all voting means communication grows quadratically, capping practical network size." },
        { t: "Primary targeting", d: "The leader is a DoS focal point, mitigated by timeouts and view changes." },
        { t: "Closed membership", d: "Security depends entirely on the authority that admits nodes — there is no open Sybil resistance." },
      ],
      notes: [
        "PBFT is the ancestor of modern BFT consensus. Tendermint, HotStuff, IBFT, and SBFT all descend from it, mostly attacking its quadratic message cost.",
        "Because finality is immediate and deterministic, there are no forks or reorgs to reason about — a major operational simplification for enterprises.",
      ],
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
    meta: {
      category: "Enterprise · Permissioned",
      sybil: "Vetted legal identity",
      faultModel: "Honest majority of authorised signers",
      finality: "Fast · effectively immediate",
    },
    detail: {
      how: [
        "Validators are vetted and explicitly authorised through governance; each node is tied to a known real-world identity, so any fraud is directly attributable.",
        "Authorised signers seal blocks on a fixed schedule. In the Clique scheme, an 'in-turn' signer produces with priority weight, while 'out-of-turn' signers may step in after a small randomised delay if the scheduled signer is absent.",
        "Governance votes add or remove authorities. A misbehaving signer is deauthorised and loses both its privileges and its reputation — the entire deterrent of the scheme.",
      ],
      phases: [
        { t: "Authorisation", d: "Governance admits a vetted identity into the signer set." },
        { t: "Sealing schedule", d: "Signers are ordered; in-turn vs out-of-turn priority is assigned per slot." },
        { t: "Block sealing", d: "The scheduled authority signs and produces the block." },
        { t: "Propagation & acceptance", d: "Peers accept blocks signed by a currently-authorised key." },
        { t: "Governance vote", d: "Signers vote to add or evict authorities as needed." },
      ],
      states: {
        label: "Authority lifecycle",
        flow: ["proposed", "authorised (in-turn / out-of-turn)", "sealing", "deauthorised"],
      },
      attacks: [
        { t: "Authority compromise", d: "A stolen or coerced signer key is the primary threat; mitigated by fast eviction." },
        { t: "Collusion & censorship", d: "A majority of signers can censor, with only reputational — not economic — cost." },
        { t: "Central trust", d: "Unsuitable for permissionless settings: you must trust the admitting authority." },
        { t: "Full Sybil resistance", d: "Identity vetting makes fake nodes impossible, which is precisely why decentralisation is minimal." },
      ],
      notes: [
        "PoA can be seen as PoS with identity substituted for capital: the bond is a reputation that cannot be re-bought once burned.",
        "The two dominant implementations are Clique (Ethereum) and Aura (Parity), differing mainly in how they schedule signers and handle equivocation.",
      ],
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
    meta: {
      category: "Public · Permissionless (hybrid)",
      sybil: "Inherited from paired PoS layer",
      faultModel: "Honest supermajority of PoS stake",
      finality: "Fast optimistic confirmation → rooted",
    },
    detail: {
      how: [
        "A leader runs a sequential, non-parallelisable hash function (a verifiable delay function) where each output feeds the next, producing an unforgeable timeline. The count of hashes between two events proves how much time elapsed.",
        "A PoS-derived leader schedule rotates which validator produces during each slot. The active leader stamps incoming transactions into the hash sequence at specific counts, so their order is cryptographically fixed before any voting happens.",
        "Validators vote on the resulting chain using a BFT layer (Solana's Tower BFT applies lockouts to votes). Removing the need to negotiate time is what unlocks the extreme throughput; security still comes from the underlying stake.",
      ],
      phases: [
        { t: "Continuous hash sequence", d: "The leader generates an unbroken VDF timeline." },
        { t: "Leader schedule", d: "PoS determines which validator leads each slot." },
        { t: "Transaction stamping", d: "Incoming transactions are recorded at specific hash counts, fixing order." },
        { t: "Entry / block production", d: "Stamped entries are batched into blocks." },
        { t: "Voting (Tower BFT)", d: "Validators vote with exponential lockouts to confirm the chain." },
        { t: "Finalization (rooting)", d: "Sufficiently confirmed blocks become rooted and irreversible." },
      ],
      states: {
        label: "Slot & block states",
        flow: ["leader / validator (per slot)", "processed", "confirmed (optimistic)", "rooted"],
      },
      attacks: [
        { t: "Inherited stake attacks", d: "PoH only orders time; the money-at-risk model is standard PoS underneath." },
        { t: "Hardware centralisation", d: "Keeping up with the hash timeline demands fast, high-end servers, raising the participation barrier." },
        { t: "Liveness under load", d: "Extreme throughput has historically stressed the network into outages during congestion." },
        { t: "Leader dependence", d: "A faulty or offline leader forces the schedule to skip and recover." },
      ],
      notes: [
        "PoH is best understood as pre-consensus ordering: it does not decide truth, it decides sequence, which is the expensive part everyone else negotiates at runtime.",
        "It pairs with a stack of supporting innovations (leader schedules, Turbine block propagation, Gulf Stream mempool-forwarding) — PoH alone is not the whole story.",
      ],
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
    meta: {
      category: "Enterprise · Permissioned",
      sybil: "Attested hardware identity",
      faultModel: "Honest majority + trusted TEE",
      finality: "Configurable (typically fast)",
    },
    detail: {
      how: [
        "Developed by Intel, PoET has each node request a random wait time from a Trusted Execution Environment (TEE) such as Intel SGX. The enclave guarantees the timer was genuinely random and actually observed.",
        "Every node sleeps for its assigned duration. Whichever node's timer expires first wakes and claims the right to build the next block, attaching a hardware attestation as proof.",
        "Other nodes verify the attestation before accepting the block. Implementations such as Sawtooth add statistical fairness checks (a z-test) to detect nodes that win improbably often, catching a compromised enclave.",
      ],
      phases: [
        { t: "Enclave registration", d: "A node joins by proving a valid, attested SGX enclave." },
        { t: "Timer request", d: "The enclave issues a signed random wait time." },
        { t: "Wait", d: "The node sleeps for its assigned duration." },
        { t: "Claim", d: "The shortest waiter wakes and proposes the block with attestation." },
        { t: "Verify & fairness check", d: "Peers validate the attestation and run statistical anti-cheat tests." },
      ],
      states: {
        label: "Node states",
        flow: ["registered (attested)", "waiting (timer)", "won → proposing", "expired"],
      },
      attacks: [
        { t: "TEE compromise", d: "The whole model rests on trusted hardware; SGX vulnerabilities (Foreshadow, Plundervolt, etc.) are the core risk." },
        { t: "Vendor trust", d: "You must trust a single manufacturer's silicon and attestation service." },
        { t: "Enclave Sybil", d: "Fairness checks are needed because a broken enclave could forge many favourable timers." },
        { t: "Permissioned scope", d: "Realistically confined to enterprise deployments where hardware can be controlled." },
      ],
      notes: [
        "PoET's fairness statistically approximates PoW's lottery — same probabilistic winner selection, without the electricity.",
        "Sawtooth ships both a real PoET-SGX engine and a PoET-simulator for development environments without SGX hardware.",
      ],
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
    meta: {
      category: "Public · Permissionless",
      sybil: "Committed disk capacity",
      faultModel: "Honest majority of storage",
      finality: "Probabilistic (space + optional time proof)",
    },
    detail: {
      how: [
        "In a one-time plotting step, miners fill hard drives with large tables of cryptographic hashes (proofs of space). This is compute-heavy once, then cheap to reuse.",
        "For each block the network issues a challenge. Farmers scan their stored plots for the value that best answers it; more allocated storage means a higher probability of holding a winning answer.",
        "The best proof earns the right to create the block, and verification by the rest of the network is cheap. Chia pairs proofs of space with a proof of time (a VDF) so that blocks are also spaced correctly in wall-clock time.",
      ],
      phases: [
        { t: "Plotting", d: "A one-time pass writes proof tables to disk." },
        { t: "Challenge", d: "The network issues a per-block challenge value." },
        { t: "Scanning / lookup", d: "Farmers search their plots for a qualifying proof." },
        { t: "Proof submission", d: "The best-quality proof is broadcast." },
        { t: "Verify & create", d: "Peers cheaply verify; the winner builds the block (with a VDF time proof in Chia)." },
      ],
      states: {
        label: "Plot & farmer states",
        flow: ["plotting", "plotted / available", "idle → scanning", "winning proof"],
      },
      attacks: [
        { t: "51% storage", d: "An attacker must control more raw storage than the honest network — cheaper than PoW hashpower, still capital-heavy." },
        { t: "Plotting arms race", d: "Competition for space drives ever-larger farms, echoing PoW's hardware race." },
        { t: "Storage wear", d: "Constant plotting and re-plotting rapidly degrades SSDs, shifting cost from energy to e-waste." },
        { t: "Grinding on challenges", d: "Naïve designs allow re-plotting to bias outcomes; countered by pairing with a VDF." },
      ],
      notes: [
        "The family spans subtly different ideas: Proof of Capacity, Proof of Space, and Chia's Proof of Space and Time, which adds the VDF to fix timing.",
        "Its selling point is repurposing hardware people already own, but the SSD-attrition problem complicates the 'green' narrative.",
      ],
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
    meta: {
      category: "Public · Permissionless",
      sybil: "Verifiably destroyed capital",
      faultModel: "Honest majority of burned value",
      finality: "Depends on layered base mechanism",
    },
    detail: {
      how: [
        "A miner sends coins to a provably unspendable 'eater' address — a public, on-chain, irreversible commitment that anyone can verify but no one can recover.",
        "The protocol grants mining rights in proportion to the amount burned. Many designs decay burned weight over time, so miners must keep burning to stay competitive, mimicking the ongoing cost of PoW hardware.",
        "Holders of mining rights then produce blocks and earn ongoing rewards. Committed capital is destroyed rather than spent on electricity or silicon, making the mechanism energy-free by construction.",
      ],
      phases: [
        { t: "Burn transaction", d: "Coins are sent to a provably unspendable address." },
        { t: "On-chain record", d: "The burn is logged as a public, irreversible commitment." },
        { t: "Rights grant", d: "Mining power is assigned proportional to the burn (often with decay)." },
        { t: "Block production", d: "Rights-holders forge blocks and collect rewards." },
      ],
      states: {
        label: "Commitment states",
        flow: ["coins burned", "recorded on-chain", "rights active (decaying)", "expired"],
      },
      attacks: [
        { t: "Dominance cost", d: "Controlling the chain means permanently burning more value than everyone combined — a fully sunk expense." },
        { t: "Economic manipulation", d: "Artificial scarcity from burning can distort token economics." },
        { t: "External dependency", d: "Some designs require burning an established coin (e.g. Bitcoin) to bootstrap a new chain." },
        { t: "Sybil resistance", d: "Influence is tied to destroyed capital, which cannot be cheaply forged." },
      ],
      notes: [
        "PoB is arguably the purest 'skin in the game': the stake can never be recovered, even for a perfectly honest participant.",
        "It is distinct from modern fee-burning (e.g. Ethereum's EIP-1559), which destroys coins for monetary policy rather than to grant consensus rights.",
      ],
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
