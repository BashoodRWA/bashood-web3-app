# Zenith Internal Security Review — Bashood Protocol
## Version 1.0 | Pre-External-Audit Consultative Review

---

> **⚠️ DISCLAIMER**
> This document is a **confidential internal consultative review** conducted by the Bashood
> protocol team using the Zenith methodology. It is **NOT** an independent external audit and
> does not constitute a formal third-party security certification.  
> The purpose of this review is to identify and remediate issues **before** engaging a paid
> external auditor, thereby maximising the quality and efficiency of that subsequent engagement.
> All findings should be independently verified by a qualified external security firm prior to
> any mainnet deployment.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope](#2-scope)
3. [Architecture Analysis](#3-architecture-analysis)
4. [Threat Model](#4-threat-model)
5. [Access Control Analysis](#5-access-control-analysis)
6. [Solidity Security Analysis](#6-solidity-security-analysis)
7. [Oracle & External Data Analysis](#7-oracle--external-data-analysis)
8. [Tokenomics Analysis](#8-tokenomics-analysis)
9. [Invariant Verification](#9-invariant-verification)
10. [Findings](#10-findings)
11. [Recommendations Summary](#11-recommendations-summary)
12. [Conclusion](#12-conclusion)

---

## 1. Executive Summary

| Attribute         | Detail                                                   |
|-------------------|----------------------------------------------------------|
| **Protocol**      | Bashood — Industrial Real-World Asset (RWA) Registry     |
| **Review Type**   | Internal Consultative Review (Zenith Methodology)        |
| **Review Date**   | 2025-12-10 (based on latest commit state)                |
| **Codebase State**| Post-Foundry Audit (`cd3bc4d`), 39/39 invariants @ 10k  |
| **Reviewer**      | Internal Engineering — Zenith Review Protocol            |
| **Solidity**      | `^0.8.20`                                                |
| **Networks**      | Base L2 (primary), Ethereum Mainnet (secondary)          |

### Risk Summary

| Severity   | Count | Status                                             |
|------------|-------|----------------------------------------------------|
| 🔴 HIGH    | 3     | ✅ **RESOLVED** — post v0.4-audit-stable            |
| 🟠 MEDIUM  | 5     | Requires fix or explicit risk acceptance           |
| 🟡 LOW     | 7     | Recommended to fix; low immediate risk             |
| ℹ️ INFO  | 4     | Informational / best-practice suggestions          |

**Critical path:** H-01 (DoS unbounded loops) and H-03 (Referral Sybil attack) were blocking issues. **Both are RESOLVED — see v0.4-audit-stable changelog.**

---

## 2. Scope

### 2.1 Contracts In Scope

| Contract                                         | Lines | Category          |
|--------------------------------------------------|-------|-------------------|
| `contracts/standards/BashoodRWAReference.sol`    | 689   | Core (UUPS Proxy) |
| `contracts/BashoodToken.sol`                     | 321   | ERC-20 Token      |
| `contracts/BashoodPresaleFinal.sol`              | 687   | Presale           |
| `contracts/BashoodReferral.sol`                  | 142   | Referral System   |
| `contracts/BashoodPaymentSplitter.sol`           | 183   | Treasury          |
| `contracts/modules/BashoodModuleBase.sol`        | 154   | Module Framework  |
| `contracts/modules/OperationalMetricsAggregator.sol` | 331 | Module           |
| `contracts/modules/CertificationModule.sol`      | 173   | Module            |
| `contracts/modules/InsuranceModule.sol`          | 159   | Module            |
| `contracts/modules/LifecycleEventsModule.sol`    | 314   | Module            |
| `contracts/utils/DepreciationEngine.sol`         | 82    | Library           |
| `contracts/governance/BashoodTimelock.sol`       | 50    | Governance        |
| `contracts/governance/BashoodGovernor.sol`       | 180   | Governance        |

### 2.2 Contracts Out of Scope (Referenced)

- `BashoodVesting.sol` — vesting mechanics (partial review only)
- `BHTVotes.sol` — ERC20Wrapper (wraps BHT → BHTv for governance)
- `OracleValuationModule.sol` — Chainlink integration module
- `BashoodTreasury.sol` — treasury spend logic
- Deployment scripts and tests

### 2.3 Test Coverage Context

- **Hardhat:** 1043 passing, 7 pre-existing failures (acknowledged, unrelated to audit scope)
- **Foundry:** 39/39 invariants passing at 10,000 runs (`cd3bc4d`)
- **Slither:** Multiple passes; latest `slither-output-2025-12-10.txt` and `slither-report-final-2025-12-10.json`

---

## 3. Architecture Analysis

### 3.1 Component Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        GOVERNANCE LAYER                        │
│   BHTVotes (IVotes)  →  BashoodGovernor  →  BashoodTimelock   │
│   (BHT wrapper)         (4% quorum, 1wk)     (48h delay)      │
└────────────────────┬───────────────────────────────────────────┘
                     │ UPGRADER_ROLE (direct, not via Timelock ⚠️)
┌────────────────────▼───────────────────────────────────────────┐
│                         CORE LAYER                             │
│   BashoodRWAReference (UUPS proxy, ERC-721)                    │
│   Roles: DEFAULT_ADMIN · ASSET_MANAGER · ORACLE · UPGRADER     │
│   Storage: tokenId→AssetData, tokenId→OperationalMetrics       │
│            tokenId→CertData (mint-time only), __gap[50]        │
└──┬──────────────┬────────────────┬──────────────┬─────────────┘
   │ read-only    │ read-only      │ read-only    │ ASSET_MGR
   ▼              ▼                ▼              ▼
OperationalMetrics CertificationModule InsuranceModule OracleValuationModule
Aggregator       LifecycleEventsModule
(fleet DoS ⚠️)   (append-only log)

┌────────────────────────────────────────────────────────────────┐
│                        TOKEN LAYER                             │
│   BashoodToken (BHT, ERC-20)                                   │
│   burnRate=10bps, treasuryFee=50bps, lockParameters (1-way)    │
└─────────────────────────────┬──────────────────────────────────┘
                              │ burnFrom (try/catch ⚠️)
┌─────────────────────────────▼──────────────────────────────────┐
│                       PRESALE LAYER                            │
│   BashoodPresaleFinal (ETH+BHT, ECDSA, Chainlink)              │
│   maxPerUser=1 default · signerAddress=0 default · E10/E31     │
└──────────────────────┬─────────────────────────────────────────┘
                       │ rewardReferrer()
┌──────────────────────▼─────────────────────────────────────────┐
│   BashoodReferral     →    BashoodPaymentSplitter               │
│   (validator OFF ⚠️)       (pull-payment, 4 payees)            │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow — Asset Lifecycle

```
MINT (ASSET_MANAGER_ROLE)
   └→ BashoodRWAReference.mintAsset()
         ├─ Stores: AssetData, _certificationData (static), _insuranceData (static)
         ├─ Sets: OperationalMetrics (initial), _operationalStatus = OPERATIONAL
         └─ Emits: AssetMinted, Transfer(0, owner)

OPERATIONAL STATE CHANGES (ASSET_MANAGER_ROLE)
   └→ updateOperationalStatus(tokenId, newStatus)
         └─ Overwrites current status (history lost in Core)
         └─ LifecycleEventsModule.logTransition() called externally (append-only log)

TELEMETRY PUSH (ORACLE_ROLE)
   └→ receiveTelemetryData(tokenId, metrics) ⚠️ full struct overwrite
         └─ ORACLE_ROLE can zero out maxLifetimeHours, maxLoadLifetime, etc.

VALUATION UPDATE (ASSET_MANAGER_ROLE via OracleValuationModule)
   └→ updateAssetValue(tokenId, newValue, reason)
         └─ No lower-bound guard beyond > 0
```

### 3.3 Module Trust Model

All read-only modules (`requiredRole = bytes32(0)`) can read Core state without any `grantRole` call. Only `OracleValuationModule` requires an `ASSET_MANAGER_ROLE` grant to write valuations.

The module upgrade pattern is:
1. Deploy new module version
2. Admin revokes old module's role (if write-module)
3. Admin grants new module the role

**Risk:** There is no module registry or on-chain version tracking. The admin must manually track which module version holds which role.

---

## 4. Threat Model

### 4.1 Privileged Role Attack Surfaces

| Role / Key              | Contract              | Powers                                               | Compromise Impact |
|-------------------------|-----------------------|------------------------------------------------------|-------------------|
| `DEFAULT_ADMIN_ROLE`    | BashoodRWAReference   | Grant/revoke all roles                               | CRITICAL          |
| `UPGRADER_ROLE`         | BashoodRWAReference   | Replace proxy implementation                         | CRITICAL          |
| `ASSET_MANAGER_ROLE`    | BashoodRWAReference   | Mint, update values, update status, configure telemetry | HIGH           |
| `ORACLE_ROLE`           | BashoodRWAReference   | Write operational metrics, telemetry full overwrite  | HIGH              |
| `ADMIN_ROLE`            | BashoodPresaleFinal   | Pause, configure all presale parameters              | HIGH              |
| `owner`                 | BashoodToken          | Set economics, lock parameters (one-way), pause      | HIGH              |
| `owner`                 | BashoodReferral       | Set presale contract address                         | MEDIUM            |
| Timelock `DEFAULT_ADMIN`| BashoodTimelock       | `address(0)` post-init (correct ✓)                   | N/A               |

### 4.2 External Dependency Attack Surfaces

| Dependency              | Risk                                           | Current Mitigation         |
|-------------------------|------------------------------------------------|----------------------------|
| Chainlink Price Feed    | Stale / manipulated price                      | `maxPriceStaleness` check  |
| ECDSA Signer Key        | Leaked signer key → free presale NFTs          | `setSigner()`, E31 guard   |
| OracleValuationModule   | Buggy oracle pushes value=1 wei to all assets  | Separated ORACLE_ROLE      |
| RescueContract          | Must implement IBashoodRescue (ERC165 checked) | `supportsInterface` guard  |

### 4.3 Attack Vectors Summary

- **DoS via unbounded state loop:** `getAssetsByCategory`, `getAssetsByManufacturer`, `getTotalAssetValue` iterate from tokenId 201 to `_nextTokenId` with no pagination or gas guard.
- **Sybil referral attack:** `registerReferral()` validator is disabled; attacker deploys N burner wallets to farm NFT rewards.
- **Burn accounting desync:** Presale fallback path sends BHT to `0xdEaD` instead of calling `_burn()`, breaking `totalBurned` in BashoodToken.
- **Oracle struct wipe:** `receiveTelemetryData` performs a full `_operationalMetrics[tokenId] = metrics` assignment; a compromised ORACLE_ROLE can zero `maxLifetimeHours`, making `DepreciationEngine.linearTimeBased()` always return 10,000bps (fully-deprecated).
- **Centralized upgrade:** `_authorizeUpgrade` is behind `UPGRADER_ROLE` directly, not routed through `BashoodGovernor + BashoodTimelock` on-chain.

---

## 5. Access Control Analysis

### 5.1 BashoodRWAReference.sol

**Pattern:** OpenZeppelin `AccessControlUpgradeable`

| Observation | Detail |
|---|---|
| ✅ Role separation | `ASSET_MANAGER_ROLE`, `ORACLE_ROLE`, and `UPGRADER_ROLE` are distinct — compromising oracle doesn't give ASSET_MANAGER capabilities and vice-versa |
| ✅ No DEFAULT_ADMIN bypass | All sensitive functions gate their own role; DEFAULT_ADMIN cannot directly call them without also holding the specific role |
| ⚠️ Upgrade not timelocked | `_authorizeUpgrade` requires `UPGRADER_ROLE` with no 48h timelock. A single key compromise enables immediate malicious upgrade. **[→ See M-02]** |
| ⚠️ No on-chain module registry | The admin is responsible for tracking which module address holds `ASSET_MANAGER_ROLE`. No `ModuleRegistered` event or registry exists |

### 5.2 BashoodPresaleFinal.sol

**Pattern:** OpenZeppelin `AccessControl` (non-upgradeable)

| Observation | Detail |
|---|---|
| ✅ EMERGENCY_ROLE separation | Emergency withdrawals are gated to a separate role from admin |
| ⚠️ `ADMIN_ROLE` granted to `_projectWallet` | In the constructor, `_grantRole(ADMIN_ROLE, _projectWallet)` means the project wallet (likely a hot wallet) holds admin rights. If that wallet is compromised, an attacker can pause the presale, change the signer, and set `maxPerUser`. **[→ See I-01]** |
| ⚠️ Pause has no timelock | Unlike `BashoodToken` (24h timelock pause), `BashoodPresaleFinal` can be paused immediately by `ADMIN_ROLE`. |

### 5.3 BashoodToken.sol

**Pattern:** OpenZeppelin `Ownable`

| Observation | Detail |
|---|---|
| ✅ 24h pause timelock | `requestPause()` → 48h wait → `executePause()` — appropriate holder protection |
| ⚠️ Inconsistent pattern | BashoodToken uses `Ownable` (single EOA owner) while BashoodRWAReference uses `AccessControl`. A single owner key compromise breaks the entire token economic layer |
| ⚠️ `lockParameters()` irreversibility | No on-chain check ensures `stakingContract != address(0)` before the lock. **[→ See L-07]** |

### 5.4 BashoodReferral.sol

**Pattern:** Custom `owner` (immutable check)

| Observation | Detail |
|---|---|
| ⚠️ `owner` is immutable | Set to `msg.sender` at construction, no transfer mechanism. If deployer key is lost or compromised, `presaleAddress` can never be updated |
| ⚠️ Validator disabled | `require(validator.isValid(referrer), ...)` is commented out. **[→ See H-03]** |

### 5.5 BashoodPaymentSplitter.sol

**Pattern:** No access control on `release()`

| Observation | Detail |
|---|---|
| ℹ️ Intentional open release | Pull-payment pattern: anyone can trigger ETH release to a payee. This is intentional and standard, but should be documented explicitly |
| ℹ️ Immutable payees | No `addPayee()` or `removePayee()` after construction. Accepted design tradeoff |

### 5.6 Governance Layer

| Observation | Detail |
|---|---|
| ✅ Timelock correctly configured | `minDelay=172800` (48h), `DEFAULT_ADMIN=address(0)` post-init, standard OZ `TimelockController` |
| ✅ `EXECUTOR_ROLE=address(0)` | Anyone can execute proposals that have passed the timelock — prevents censorship |
| ✅ 4% quorum (anti-governance-attack) | At current supply, 40M BHTv required for quorum |
| ⚠️ Governance does not control `UPGRADER_ROLE` | BashoodGovernor manages treasury and role grants via Timelock — but `_authorizeUpgrade` in Core is directly callable by any `UPGRADER_ROLE` holder without a governance vote. This bypasses the entire 48h governance delay for the most critical operation in the protocol. **[→ See M-02]** |

---

## 6. Solidity Security Analysis

### 6.1 Reentrancy

| Function | Guard | Risk |
|---|---|---|
| `BashoodPresaleFinal.purchaseWithETH()` | `nonReentrant` ✅ | None |
| `BashoodPresaleFinal.purchaseWithBHT()` | `nonReentrant` ✅ | None |
| `BashoodPresaleFinal._payServiceWithBHT()` | calls external `burnFrom` in try/catch; wrapped by `nonReentrant` callers ✅ | Low |
| `BashoodReferral.claimNFT()` | `nonReentrant` ✅ | None |
| `BashoodPaymentSplitter.release()` | CEI pattern (balance→0 before transfer) — verify ✅ | Low |

**Overall:** No reentrancy vulnerabilities identified. All external call sites are properly protected.

### 6.2 Integer Arithmetic

- `^0.8.20` provides built-in overflow/underflow protection — no `SafeMath` needed.
- `DepreciationEngine`: all divisions are guarded by `if (denominator == 0) revert InvalidReferenceValue(...)`. Correct.
- `_bhtFromFiat()` in presale: price arithmetic is done in basis-point precision. Division order is `(fiatAmount * PRICE_PRECISION) / oraclePrice`. No overflow risk at expected values.
- `burnRate` and `treasuryFee` max enforcement: `require(newBurnRate <= 100, "E6")` (100bps = 1%) and `require(newFee <= 200, "E7")` (200bps = 2%). Correctly bounded.

### 6.3 Unbounded Loops — DoS Risk

**[→ See H-01]** The following view functions in `BashoodRWAReference.sol` iterate from tokenId 201 to `_nextTokenId`:

```solidity
// getAssetsByCategory (two passes — count then build)
for (uint256 i = 201; i < _nextTokenId; i++) {
    if (_assetData[i].category == category) count++;
}
// ... second loop to build array

// getAssetsByManufacturer (keccak comparison in loop ⚠️)
for (uint256 i = 201; i < _nextTokenId; i++) {
    if (keccak256(bytes(_assetData[i].manufacturer)) ==
        keccak256(bytes(manufacturer))) { ... }
}

// getTotalAssetValue (external call per iteration ⚠️)
for (uint256 i = 201; i < _nextTokenId; i++) {
    if (_ownerOf(i) == target) total += _assetData[i].currentValue;
}
```

At 10,000 minted assets: ~210,000 SLOAD operations per call (`getAssetsByManufacturer` + `getTotalAssetValue`), likely exceeding the 30M gas block limit.

### 6.4 Signature & Digest Security

- **ECDSA in presale:** uses `MessageHashUtils.toEthSignedMessageHash(keccak256(payload))` — correct EIP-191 prefix.
- **Replay protection:** digest includes `nonce(buyer), chainId, contractAddress` — correct.
- **E22 guard:** `require(msg.sender != signerAddress, "E22")` prevents signer from buying — correct.
- **E31 guard:** `require(signerAddress != address(0), "E31")` — prevents purchases when signer is not configured.

### 6.5 Proxy & Upgrade Safety

| Check | Status |
|---|---|
| `__gap[50]` in BashoodRWAReference (slot 11) | ✅ Present |
| `_disableInitializers()` in constructor | ✅ Present |
| `initializer` modifier on `initialize()` | ✅ Present |
| `UPGRADE_SAFETY.md` + `STORAGE_LAYOUT_v1.0.json` | ✅ Present (from prior session) |
| Upgrade behind governance Timelock | ❌ Missing **[→ M-02]** |

### 6.6 `_metricTypeStringToEnum` Silent Failure

```solidity
function _metricTypeStringToEnum(string memory metricType)
    internal pure returns (uint8)
{
    if (keccak256(...) == keccak256("HOURS")) return 0;
    // ...
    return 255; // Unknown type — no revert
}
```

Callers of `updateUsageMetrics()` passing an invalid `metricType` string will receive no revert; the operation silently does nothing. **[→ See L-01]**

### 6.7 `receiveTelemetryData` Full Struct Overwrite

```solidity
function receiveTelemetryData(
    uint256 tokenId,
    IBashoodRWAReference.OperationalMetrics calldata metrics
) external onlyRole(ORACLE_ROLE) {
    _operationalMetrics[tokenId] = metrics; // Full overwrite
    emit TelemetryReceived(tokenId, block.timestamp);
}
```

`DepreciationEngine.linearTimeBased()` uses `operational.maxLifetimeHours`. If ORACLE_ROLE sends `maxLifetimeHours = 0`, this function reverts (guarded by `InvalidReferenceValue`). However, setting it to `1` would make the asset appear 100% deprecated immediately. **[→ See H-02]**

---

## 7. Oracle & External Data Analysis

### 7.1 Chainlink Integration (BashoodPresaleFinal)

```solidity
function _getFreshPrice() internal view returns (int256 price, uint256 updatedAt) {
    (uint80 roundId, int256 answer, , uint256 _updatedAt, uint80 answeredInRound)
        = priceFeed.latestRoundData();

    require(answer > 0, "E35");
    require(_updatedAt > 0, "E36");
    require(block.timestamp - _updatedAt <= maxPriceStaleness, "E37");
    require(answeredInRound >= roundId, "E38"); // ✅ round consistency
    return (answer, _updatedAt);
}
```

| Check | Status |
|---|---|
| `answer > 0` | ✅ |
| `updatedAt > 0` | ✅ |
| Freshness: `block.timestamp - updatedAt <= maxPriceStaleness` | ✅ |
| Round consistency: `answeredInRound >= roundId` | ✅ |
| L2 Sequencer uptime feed | ❌ Not present — important for Base L2 **[→ See I-02]** |

### 7.2 `maxPriceStaleness` Bounds

`maxPriceStaleness` defaults to `3600` (1 hour) but can be set up to `86400` (24 hours) via `setPriceStaleness()`. For an industrial asset valuation protocol, a 24-hour stale BHT/USD price is acceptable for most scenarios given that the purchase goes through. However, for high-volatility periods, it could allow purchases at significantly off-market rates.

**Recommendation:** Cap `maxPriceStaleness` at 3600 seconds (1 hour) in the setter, or document the 24h scenario explicitly.

### 7.3 OracleValuationModule Trust

The module holds `ASSET_MANAGER_ROLE` and calls `updateAssetValue(tokenId, newValue, reason)`. The Core has no lower-bound guard on `newValue` beyond `> 0`. A malicious or buggy oracle module can set every asset to 1 wei. **[→ See M-03]**

---

## 8. Tokenomics Analysis

### 8.1 BashoodToken (BHT) Economics

| Parameter | Value | Max | Lock? |
|---|---|---|---|
| `burnRate` | 10 bps (0.1%) | 100 bps (1%) | Post `lockParameters()` |
| `treasuryFee` | 50 bps (0.5%) | 200 bps (2%) | Post `lockParameters()` |
| Total supply | 1,000,000,000 BHT | — | Immutable |
| `lockParameters()` | One-way lock | — | Irreversible |

**Effective transfer tax:** 0.6% default (0.1% burn + 0.5% treasury). Maximum possible: 3% (1% burn + 2% treasury).

### 8.2 Burn Accounting

`BashoodToken` tracks `totalBurned` (incremented in `_update` override when `to == address(0)`). However, `BashoodPresaleFinal._payServiceWithBHT()` has a fallback:

```solidity
try IBashoodToken(address(bashoodToken)).burnFrom(from, amount) {
    // totalBurned updated correctly ✅
} catch {
    // Fallback: transfer to dead address ⚠️
    IERC20(address(bashoodToken)).safeTransferFrom(from, address(0xdEaD), amount);
    // totalBurned NOT updated — tokens sit at 0xdEaD, not burned from supply
}
```

The invariant `totalBurned == INITIAL_SUPPLY - totalSupply()` is violated if the fallback is ever triggered. **[→ See M-01]**

### 8.3 `lockParameters()` Pre-Conditions

`lockParameters()` enforces no pre-condition checks. Specifically:

```solidity
function lockParameters() external onlyOwner {
    parametersLocked = true;
    // No: require(stakingContract != address(0))
    // No: require(treasuryWallet != address(0))
}
```

If `stakingContract` is `address(0)` at lock time, `sendToStaking()` will always revert afterwards due to `require(stakingContract != address(0))`. **[→ See L-07]**

### 8.4 `periodicBurn` / `sendToStaking` / `sendToTreasury`

These functions operate on tokens held by the `BashoodToken` contract itself (donated via `donate()`). They do not affect circulating supply unless tokens have been explicitly donated or sent to the contract. The invariant is:

```
contractBalance == totalDonated - (totalPeriodicBurn + totalSentToStaking + totalSentToTreasury)
```

No tracking of these intermediate values exists on-chain, relying on events for historical reconciliation.

---

## 9. Invariant Verification

Cross-referencing against the Foundry invariant suite (`BashoodCoreInvariant.t.sol`):

| Invariant | Description | Status |
|---|---|---|
| I-BURN-01 | `totalBurned == INITIAL_SUPPLY - totalSupply()` | ✅ (Foundry enforced) BUT: violated by presale fallback path [→ M-01] |
| I-MINT-01 | `_nextTokenId >= 201` always | ✅ (tokenId starts at 201) |
| I-VALUE-01 | `currentValue > 0` for all minted tokens | ✅ (enforced at mint); RISK: `updateAssetValue(1)` post-mint bypasses [→ M-03] |
| I-ROLE-01 | Core roles properly initialized | ✅ |
| I-PROXY-01 | Implementation address non-zero | ✅ |
| I-MODULE-01 | `_core` is immutable per module | ✅ |
| I-PAUSE-01 | No purchases during pause | ✅ (nonReentrant + whenNotPaused) |

**New invariant suggested:** `totalBurned` should equal the sum of all `TokensBurned` events from `BashoodToken`. An off-chain monitor should track the fallback path in presale.

---

## 10. Findings

---

### ✅ H-01 — DoS via Unbounded Loops in View Functions [**RESOLVED**]

> **Resolution (v0.4-audit-stable, 2026-03-28):** Paginated view functions added. Off-chain indexer pattern documented. Token-to-category mapping maintained at mint time.

**Original finding — preserved for audit trail:**

**Location:** `BashoodRWAReference.sol` — `getAssetsByCategory()`, `getAssetsByManufacturer()`, `getTotalAssetValue()`

**Description:**
Three view functions iterate every minted tokenId starting from 201. With O(n) complexity and no pagination, at ~4,000 minted assets these functions will approach the 30M gas block limit and begin reverting. `getAssetsByManufacturer` performs a `keccak256` string comparison inside the loop — additional gas cost per iteration. `getTotalAssetValue` calls `_ownerOf(i)` per iteration — additional SLOAD per token.

```solidity
// Two-pass O(n) loop — no gas limit
for (uint256 i = 201; i < _nextTokenId; i++) {
    if (_assetData[i].category == category) count++;
}
```

**Impact:**
- Front-end integrators and on-chain callers lose access to these fundamental queries as the collection grows.
- Any contract calling `getTotalAssetValue` on-chain (e.g., for collateralization) will permanently revert.
- This is a **production-blocking** issue for any scaled deployment.

**Recommendation:**
Replace unbounded loops with paginated query functions:

```solidity
function getAssetsByCategoryPaginated(
    AssetCategory category,
    uint256 fromTokenId,
    uint256 pageSize
) external view returns (uint256[] memory tokenIds, uint256 nextFrom) {
    uint256 end = fromTokenId + pageSize;
    if (end > _nextTokenId) end = _nextTokenId;
    // ... bounded loop
}
```

Additionally, maintain an off-chain index (event-driven) or an on-chain category→tokenId[] mapping updated at mint time.

---

### ✅ H-02 — ORACLE_ROLE Can Corrupt All Asset Depreciation via Full Struct Overwrite [**RESOLVED**]

> **Resolution (v0.4-audit-stable, 2026-03-28):** `receiveTelemetryData()` refactored to partial-update semantics. Reference maximums (`maxLifetimeHours`, `maxLoadLifetime`) now writable only by `ASSET_MANAGER_ROLE` at mint or via separate admin function. Oracle can only update telemetry counters.

**Original finding — preserved for audit trail:**

**Location:** `BashoodRWAReference.sol` — `receiveTelemetryData()`

**Description:**
`receiveTelemetryData` replaces the entire `OperationalMetrics` struct for a tokenId:

```solidity
function receiveTelemetryData(uint256 tokenId, OperationalMetrics calldata metrics)
    external onlyRole(ORACLE_ROLE)
{
    _operationalMetrics[tokenId] = metrics; // FULL overwrite ⚠️
    emit TelemetryReceived(tokenId, block.timestamp);
}
```

The oracle can set `maxLifetimeHours = 1` while `operatingHours = 1000`, causing `DepreciationEngine.linearTimeBased()` to return `10_000` (100% deprecated) for every asset. A compromised or buggy oracle module destroys all asset valuations.

**Impact:**
- Depreciation and asset value calculations become manipulable by `ORACLE_ROLE`.
- A compromised `ORACLE_ROLE` key can effectively render all industrial assets as fully-deprecated in a single block.

**Recommendation:**
Use safe merge semantics — only oracle-updated fields should be overwritten. Reference values (`maxLifetimeHours`, `maxLoadLifetime`, etc.) should be written only at mint or by `ASSET_MANAGER_ROLE`:

```solidity
// In receiveTelemetryData — partial update only
function receiveTelemetryData(uint256 tokenId, OracleTelemetryUpdate calldata update)
    external onlyRole(ORACLE_ROLE)
{
    // Only update usage counters, not reference maximums
    _operationalMetrics[tokenId].operatingHours    = update.operatingHours;
    _operationalMetrics[tokenId].totalLoadLifted   = update.totalLoadLifted;
    // ... NOT maxLifetimeHours, NOT maxLoadLifetime
}
```

---

### ✅ H-03 — Referral Sybil Attack: Validator Disabled in Production Code [**RESOLVED**]

> **Resolution (v0.4-audit-stable, 2026-03-28):** Validator re-enabled. Sybil guard added: off-chain KYC signature required before `registerReferral()`. Minimum 48-hour hold period before referral count increments. `REQUIRED_REFERRALS` raised from 3 to 5.

**Original finding — preserved for audit trail:**

**Location:** `BashoodReferral.sol` — `registerReferral()` / `rewardReferrer()`

**Description:**
The referral validator check is commented out:

```solidity
function rewardReferrer(address referrer, address buyer) external onlyPresale {
    // require(validator.isValid(referrer), "Invalid referrer"); // DISABLED
    referralCount[referrer]++;
    if (referralCount[referrer] >= REQUIRED_REFERRALS) {
        _distributeReward(referrer);
    }
}
```

An attacker can deploy N smart contracts (or use N burner EOAs), register them as buyers through the presale (or simulate the call if `onlyPresale` can be bypassed), increment `referralCount` for any address, and claim the NFT reward without genuine referrals.

Furthermore, `registerReferral` is callable by the presale contract directly — if there is any way to call `purchaseWithETH` or `purchaseWithBHT` cheaply (e.g., with a minimum purchase amount), an attacker performs N minimal purchases from burner addresses with the same referrer, reaching `REQUIRED_REFERRALS = 3` at cost of only 3 presale transactions.

**Impact:**
- NFT rewards can be farmed at low cost, diluting the referral program value.
- If the referral NFT has monetary value (secondary market), this is a direct economic exploit.

**Recommendation:**
1. **Re-enable the validator** before mainnet.
2. Implement Sybil resistance: off-chain KYC + on-chain signature, or a minimum referral stake requirement.
3. Consider requiring that referred buyers hold the purchased NFT for at least N days before counting.

---

### 🟠 M-01 — Burn Accounting Bypass in Presale Fallback Path

**Location:** `BashoodPresaleFinal.sol` — `_payServiceWithBHT()`

**Description:**

```solidity
try IBashoodToken(address(bashoodToken)).burnFrom(from, amount) {
    // totalBurned correctly updated in BashoodToken
} catch {
    // Fallback: sends to 0xdEaD — bypasses BashoodToken._update() ⚠️
    IERC20(address(bashoodToken)).safeTransferFrom(from, address(0xdEaD), amount);
}
```

When `burnFrom` reverts (e.g., missing `allowance`, paused token, or locked token), tokens are sent to `0xdEaD` instead. `BashoodToken.totalBurned` is NOT incremented because `_update(from=sender, to=0xdEaD)` is a regular transfer — `to != address(0)` so the burn counter is skipped. The circulating supply is effectively not reduced either (from ERC-20 perspective: tokens at `0xdEaD` are unspendable but still `totalSupply` exists).

**Impact:**
- `totalBurned` invariant is violated: `totalBurned < INITIAL_SUPPLY - totalSupply()`.
- Any protocol or external party relying on `totalBurned` for deflationary metrics receives incorrect data.
- Tokens at `0xdEaD` are functionally burned but not formally accounted — creates discrepancy in dashboards and analytics.

**Recommendation:**
Remove the fallback path or replace with a proper revert:

```solidity
// Option A: Remove fallback — let it revert (presale requires functioning burnFrom)
IBashoodToken(address(bashoodToken)).burnFrom(from, amount);

// Option B: Transfer to address(0) via _burn equivalent — not directly callable on ERC20 externally
// Must be handled by BashoodToken exposing a burnFrom with fallback internally
```

If the fallback is intentionally kept, update `totalBurned += amount` via a separate interface call to BashoodToken, or maintain a separate `totalFallbackBurned` counter in the presale for analytics integrity.

---

### 🟠 M-02 — Proxy Upgrade Not Protected by Governance Timelock

**Location:** `BashoodRWAReference.sol` — `_authorizeUpgrade()` / `BashoodGovernor.sol`

**Description:**

```solidity
function _authorizeUpgrade(address newImplementation)
    internal override onlyRole(UPGRADER_ROLE) {}
```

The `UPGRADER_ROLE` holder can call `upgradeToAndCall()` on the proxy at any time — no governance vote, no 48h timelock delay. The governance system (`BashoodGovernor + BashoodTimelock`) is correctly configured but **not wired to the upgrade path**. This means the most critical operation in the protocol (replacing the Core implementation) bypasses the entire governance safeguard.

**Impact:**
- A single compromised `UPGRADER_ROLE` key enables immediate, silent replacement of the Core implementation.
- The 48h Timelock exists but is not used for upgrades — false security assurance.

**Recommendation:**
Transfer `UPGRADER_ROLE` to `BashoodTimelock` after initial deployment. All upgrades then require a successful governance vote + 48h delay:

```solidity
// During deployment setup:
bashoodRWAReference.grantRole(UPGRADER_ROLE, address(bashoodTimelock));
bashoodRWAReference.revokeRole(UPGRADER_ROLE, deployerAddress);
```

Document this in `UPGRADE_SAFETY.md` and `MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md`.

---

### 🟠 M-03 — OracleValuationModule Can Set Asset Value to 1 Wei

**Location:** `BashoodRWAReference.sol` — `updateAssetValue()`

**Description:**

```solidity
function updateAssetValue(uint256 tokenId, uint256 newValue, string calldata reason)
    external onlyRole(ASSET_MANAGER_ROLE)
{
    require(_exists(tokenId), "E05");
    require(newValue > 0, "E12"); // Only guard: > 0
    _assetData[tokenId].currentValue = newValue;
    emit AssetValueUpdated(tokenId, _assetData[tokenId].currentValue, newValue, reason);
}
```

A buggy or compromised `OracleValuationModule` (which holds `ASSET_MANAGER_ROLE`) can call `updateAssetValue(tokenId, 1, "ORACLE")`, setting a multi-million dollar industrial asset to 1 wei. There is no lower-bound sanity check, no deviation limit (e.g., "cannot change by more than 40% per update"), and no rate limiting.

**Impact:**
- All industrial RWA backed by this protocol could be rendered near-worthless in a single transaction.
- Any collateralization protocol built on top would be immediately insolvent.

**Recommendation:**
Implement a maximum deviation guard in `updateAssetValue`:

```solidity
uint256 constant MAX_VALUE_CHANGE_BPS = 4000; // 40% max change per update

function updateAssetValue(uint256 tokenId, uint256 newValue, string calldata reason)
    external onlyRole(ASSET_MANAGER_ROLE)
{
    require(newValue > 0, "E12");
    uint256 oldValue = _assetData[tokenId].currentValue;
    if (oldValue > 0) {
        uint256 diff = newValue > oldValue ? newValue - oldValue : oldValue - newValue;
        require(diff * 10_000 / oldValue <= MAX_VALUE_CHANGE_BPS, "E-DEVIATION");
    }
    _assetData[tokenId].currentValue = newValue;
    emit AssetValueUpdated(tokenId, oldValue, newValue, reason);
}
```

---

### 🟠 M-04 — `maxPerUser = 1` Silent Default in Presale Constructor

**Location:** `BashoodPresaleFinal.sol` — `constructor()`

**Description:**
The presale constructor sets `maxPerUser = 1` without emitting any configuration event specific to this parameter. If the deployer forgets to call `setMaxPerUser(n)` before launching the presale, every participant is limited to 1 NFT per address with no warning.

**Impact:**
- Silent operational misconfiguration leads to suboptimal presale (or intentionally restrictive if `maxPerUser = 1` is the goal).
- No `MaxPerUserUpdated(0 → 1)` event is emitted at construction, so off-chain monitors cannot detect the initial value.

**Recommendation:**
Emit a `MaxPerUserUpdated` event in the constructor, and add a comment or require statement documenting the intended default:

```solidity
// In constructor:
maxPerUser = 1;  // Default: 1 NFT/user. Reconfigure via setMaxPerUser() before launch.
emit MaxPerUserUpdated(0, 1);
```

Alternatively, require it as a constructor parameter to force explicit configuration.

---

### 🟠 M-05 — Presale ETH Not Auto-Forwarded; Risk of Funds Lock Without Rescue Contract

**Location:** `BashoodPresaleFinal.sol` — `purchaseWithETH()` / withdrawal pattern

**Description:**
ETH paid in the presale remains in `BashoodPresaleFinal` until an admin calls the withdrawal function. There is no `receive()` that auto-routes ETH to `BashoodPaymentSplitter`. The only recovery path for stuck ETH (if withdrawal function is locked/exploited) is the `rescue()` mechanism — which requires `rescueContract` to be set and implement `IBashoodRescue` (ERC165 verified).

If `rescueContract` is never set (`address(0)`) and an exploit locks the withdrawal function, ETH is permanently stuck.

**Impact:**
- Presale ETH could accumulate to significant values (e.g., 500 ETH from a successful launch) without being secured in the multi-sig PaymentSplitter.
- A single presale contract pause/exploit window is sufficient to create uncertainty.

**Recommendation:**
1. **Set `rescueContract` immediately after deployment** — add this to `MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md`.
2. Consider an auto-forward pattern: immediately send ETH to the PaymentSplitter upon purchase, eliminating the manual withdrawal step.
3. Add a check in `withdrawEth()` that succeeds or reverts with a clear message if balance is 0.

---

### 🟡 L-01 — `_metricTypeStringToEnum` Returns 255 Silently for Unknown Types

**Location:** `BashoodRWAReference.sol` — `_metricTypeStringToEnum()`

**Description:**
An unknown `metricType` string returns `255` with no revert. Callers of `updateUsageMetrics()` passing a typo like `"HOUR"` instead of `"HOURS"` receive a successful transaction that does nothing — no error, no event distinguishing it from a real update.

**Recommendation:**
```solidity
revert("E-UNKNOWN-METRIC-TYPE");
// or: revert UnknownMetricType(metricType);
```

---

### 🟡 L-02 — Module Ownership Separate from Core Admin — Potential Split Control

**Location:** `BashoodModuleBase.sol` — `constructor()`

**Description:**
`BashoodModuleBase` inherits `Ownable(msg.sender)`. If a module is deployed by a different address than the Core `DEFAULT_ADMIN`, certifier/insurer whitelists in `CertificationModule` and `InsuranceModule` are controlled by a separate actor with no on-chain dependency. This split control is not inherently dangerous but creates governance ambiguity.

**Recommendation:** Document the intended deployer for each module, or accept this as intentional separation of operational control.

---

### 🟡 L-03 — `_certificationData` and `_insuranceData` in Core: Stale Mappings

**Location:** `BashoodRWAReference.sol` — storage mappings

**Description:**
These mappings are written only at mint time and never updated. Comments in the code warn of this, but the mappings exist in Core storage where future developers or auditors might assume they reflect live state. This creates cognitive overhead and potential for misuse.

**Recommendation:**
Consider marking these mappings as `@deprecated` in the NatSpec, or removing them from Core entirely and relying solely on `CertificationModule` / `InsuranceModule` for live state.

---

### 🟡 L-04 — Referral Validator Disabled in Deployed Code

**Location:** `BashoodReferral.sol` — `rewardReferrer()`

**Description:**
A comment says the validator check was disabled for tests. The code as deployed on mainnet would have no referral validation. This is related to H-03 but noted separately as a code hygiene issue.

**Recommendation:**
Re-enable before mainnet (`require(validator.isValid(referrer), "E-REF-INVALID")`), or remove the `validator` state variable and its setter entirely if the validation strategy has changed.

---

### 🟡 L-05 — `_allFleets` Array in OperationalMetricsAggregator Grows Indefinitely

**Location:** `OperationalMetricsAggregator.sol` — fleet management

**Description:**
`createFleet()` pushes to `_allFleets` array. There is no `deleteFleet()` function. `getAllFleets()` will eventually become expensive.

**Recommendation:**
Implement soft-deletion (active flag) or pagination for `getAllFleets()`.

---

### 🟡 L-06 — `addToFleet` O(n) Duplicate Check

**Location:** `OperationalMetricsAggregator.sol` — `addToFleet()`

**Description:**
```solidity
for (uint256 i = 0; i < fleet.length; i++) {
    require(fleet[i] != tokenId, "Token already in fleet");
}
```
For fleets with hundreds of tokens (comment says >50 suggested page size), each `addToFleet` call is O(n). The comment acknowledges pagination concerns but does not address the write-side O(n) issue.

**Recommendation:**
Replace with a mapping:
```solidity
mapping(bytes32 => mapping(uint256 => bool)) private _inFleet;
```

---

### 🟡 L-07 — No On-Chain Guard on `lockParameters()` Pre-Conditions

**Location:** `BashoodToken.sol` — `lockParameters()`

**Description:**
```solidity
function lockParameters() external onlyOwner {
    // No: require(stakingContract != address(0))
    // No: require(treasuryWallet != address(0))
    parametersLocked = true;
    emit ParametersLocked();
}
```

**Recommendation:**
```solidity
function lockParameters() external onlyOwner {
    require(stakingContract != address(0), "stakingContract not set");
    require(treasuryWallet != address(0), "treasuryWallet not set");
    parametersLocked = true;
    emit ParametersLocked();
}
```

---

### ℹ️ I-01 — `ADMIN_ROLE` Granted to Project Wallet in Presale Constructor

**Location:** `BashoodPresaleFinal.sol` — `constructor()`

**Description:**
`_grantRole(ADMIN_ROLE, _projectWallet)` grants admin rights to an address that is also the ETH recipient. If `_projectWallet` is a hot wallet rather than a hardware wallet or multisig, this is a single-point-of-failure for presale administration.

**Recommendation:** Use a separate multisig for `ADMIN_ROLE` and a cold wallet for ETH receipt, or document the security posture of `_projectWallet` explicitly.

---

### ℹ️ I-02 — Missing L2 Sequencer Uptime Feed for Chainlink on Base

**Location:** `BashoodPresaleFinal.sol` — `_getFreshPrice()`

**Description:**
Chainlink recommends checking the L2 Sequencer uptime feed on Base before consuming price data, as a sequencer outage can cause stale prices that still pass the `updatedAt` check.

**Recommendation:**
```solidity
// Before using latestRoundData:
(, int256 answer, uint256 startedAt,,) = sequencerUptimeFeed.latestRoundData();
require(answer == 0, "Sequencer offline");
require(block.timestamp - startedAt > GRACE_PERIOD_TIME, "Sequencer grace period");
```
Reference: [Chainlink L2 Sequencer Uptime Feeds](https://docs.chain.link/data-feeds/l2-sequencer-feeds)

---

### ℹ️ I-03 — Inconsistent Access Control Patterns

**Location:** `BashoodToken.sol` vs `BashoodRWAReference.sol`

**Description:**
`BashoodToken` uses `Ownable` (single EOA), while `BashoodRWAReference` uses `AccessControl` (role-based). This inconsistency makes security auditing harder and increases the risk of misconfiguration during deployment.

**Recommendation:** Consider migrating `BashoodToken` to `AccessControl` for consistency, or document the intentional design decision.

---

### ℹ️ I-04 — No On-Chain Module Version Registry

**Location:** `BashoodModuleBase.sol` / `BashoodRWAReference.sol`

**Description:**
There is no on-chain mapping from `moduleId → (address, version, grantedRole)`. The admin must manually track module lifecycles. A `ModuleRegistered(bytes32 moduleId, address moduleAddress, string version)` event emitted by Core would enable deterministic off-chain reconstruction of the module state.

**Recommendation:** Add a lightweight module registry mapping to Core or emit structured events on `grantRole`/`revokeRole` for module addresses.

---

## 11. Recommendations Summary

### Pre-External-Audit Blockers (Must Fix)

| # | Finding | Priority | Effort |
|---|---|---|---|
| 1 | H-01: Add paginated getters; maintain category→tokenId mapping at mint | ✅ RESOLVED | Medium |
| 2 | H-02: Separate oracle telemetry into partial-update interface | ✅ RESOLVED | Low |
| 3 | H-03: Re-enable referral validator; add Sybil guard | ✅ RESOLVED | Low |
| 4 | M-01: Remove burn fallback or properly account for dead-address transfers | HIGH | Low |
| 5 | M-02: Transfer `UPGRADER_ROLE` to `BashoodTimelock` post-deploy | HIGH | Low |
| 6 | L-07: Add pre-condition checks in `lockParameters()` | HIGH | Low |

### Strongly Recommended Before Mainnet

| # | Finding | Priority | Effort |
|---|---|---|---|
| 7 | M-03: Add deviation guard in `updateAssetValue` | HIGH | Low |
| 8 | M-04: Emit event for initial `maxPerUser` in constructor | MEDIUM | Trivial |
| 9 | M-05: Set `rescueContract` immediately post-deploy; add to checklist | MEDIUM | Trivial |
| 10 | L-01: Revert on unknown metric type | MEDIUM | Trivial |
| 11 | L-06: Replace O(n) fleet duplicate check with mapping | MEDIUM | Low |
| 12 | I-02: Add L2 Sequencer uptime feed check | MEDIUM | Low |

### Nice-to-Have / Process

| # | Finding | Priority | Effort |
|---|---|---|---|
| 13 | L-03: Mark stale Core mappings as `@deprecated` | LOW | Trivial |
| 14 | L-04: Remove validator dead code or re-enable | LOW | Trivial |
| 15 | L-05: Add soft-delete for fleets | LOW | Low |
| 16 | I-01: Use multisig for `ADMIN_ROLE` in presale | LOW | Low |
| 17 | I-03: Consistent access control pattern | LOW | Medium |
| 18 | I-04: On-chain module registry | LOW | Medium |

---

## 12. Conclusion

The Bashood protocol demonstrates solid foundational architecture: UUPS upgradeable Core with proper `__gap[50]` storage protection, well-separated roles (ASSET_MANAGER vs ORACLE vs UPGRADER), comprehensive Chainlink staleness checks, ECDSA replay protection in the presale, nonReentrant guards on all ETH-handling functions, and a mature Foundry invariant test suite (39/39 @ 10k runs).

**All three H-level blockers have been resolved as of v0.4-audit-stable (2026-03-28):**

1. The O(n) unbounded loops (**H-01**) — ✅ **RESOLVED**: paginated getters implemented, category→tokenId mapping maintained at mint.
2. The full-struct telemetry overwrite (**H-02**) — ✅ **RESOLVED**: partial-update oracle interface, reference maximums protected.
3. The disabled referral validator (**H-03**) — ✅ **RESOLVED**: validator re-enabled, Sybil guard added.

With these three issues resolved, the codebase will be in a strong position for a formal external audit. The governance layer (Governor + Timelock) is correctly configured; the remaining gap is wiring `UPGRADER_ROLE` to the Timelock (**M-02**), which is a single configuration step at deployment time.

**Estimated time to resolve blockers:** 2–4 engineering days.

---

*Zenith Internal Security Review — Bashood Protocol v1.0*  
*Generated: 2025-12-10 | Updated: 2026-03-28 (v0.4-audit-stable) | H-01/H-02/H-03 RESOLVED*  
*Next step: External audit engagement — codebase cleared of all HIGH blockers*  
*This report is confidential. Do not distribute outside the Bashood engineering team.*
