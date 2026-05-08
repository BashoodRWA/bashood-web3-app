# Oracles runbook

Resumen rápido
- Location: `contracts/oracles/` contains adapter and `contracts/mocks/` contains test mocks.
- Purpose: provide a minimal Chainlink adapter with staleness and sanity checks for presale price reads.

Operational notes
- Price feeds (AggregatorV3) do not require LINK funding for reads (only gas).
- Services that require LINK/subscriptions: VRF, Functions/AnyAPI, and some Automation subscription models.

Feed validation
- Staleness: ensure `updatedAt != 0` and `block.timestamp - updatedAt <= stalenessThreshold`.
- answeredInRound: ensure `answeredInRound != 0` (and optionally >= roundId if present).
- Sanity: `answer > 0` and `maxChangePct` to block large jumps.
- Decimals: adapter returns feed decimals; document and normalize in calling code if needed.

Operational runbook (funding/monitoring)
1. Identify chain and official feed addresses (e.g., Chainlink ETH/USD per network).
2. Owner of adapter must be multisig/timelock. If ownership changes are required, follow multisig process.
3. Monitoring: set up alerts for:
   - feed not updating (no new updatedAt within expected window)
   - unexpected price jumps (off-chain sanity checks)
   - low LINK balance for services that need it (VRF/functions)
4. Funding VRF/Functions: use project multisig to top up subscriptions; store subscription IDs & contacts in `addresses/` per network.

Merge requirements
- All unit tests with mocks must pass in CI.
- Security review from at least one smart-contract reviewer.
- Ops sign-off for ownership & funding runbook.
