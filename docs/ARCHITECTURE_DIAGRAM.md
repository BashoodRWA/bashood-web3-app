# BASHOOD-RWA-1 Architecture Diagram

**Purpose:** Visual representation of the industrial RWA tokenization system for Base Builder Grant application.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Physical World"
        EVOCONS[EVOCONS EVOBLOCK<br/>$1.2M Gantry Crane<br/>72,000 tons lifted]
        ICON[ICON VULCAN<br/>$1.6M 3D Printer<br/>28,500 meters extruded]
        APISCOR[Apis Cor Mobile Robot<br/>$325k<br/>42 setups]
        CYBE[CyBe RC Track Robot<br/>$240k<br/>11.2 m³/day]
        MIGHTY[Mighty Buildings Factory<br/>$5.2M<br/>4,800 hours]
    end
    
    subgraph "Telemetry Layer"
        EVAPI[EVOCONS API<br/>realtime load data]
        ICONAPI[ICON Magware<br/>extrusion metrics]
        APIS_API[Apis Cor Cloud<br/>GPS + setup count]
        CYBE_API[CyBe Auto-Meter<br/>m³/day output]
        MIGHTY_API[Mighty IoT<br/>panels produced]
    end
    
    subgraph "Oracle Layer v1.0"
        CHAINLINK[Chainlink Oracle<br/>receiveTelemetryData]
        MANUAL[Manual Entry Fallback<br/>ASSET_MANAGER_ROLE]
        STALE[Stale Data Detection<br/>>7 days warning]
    end
    
    subgraph "Smart Contracts - Base L2"
        INTERFACE[IBashoodRWA.sol<br/>Standard Interface<br/>428 lines]
        REFERENCE[BashoodRWAReference.sol<br/>Reference Implementation<br/>806 lines<br/>⚠️ 28KB size]
        
        subgraph "Core Functions"
            MINT[mintAsset<br/>6 depreciation models]
            VALUE[calculateCurrentValue<br/>real-time valuation]
            MAINT[recordMaintenance<br/>operational tracking]
            TELEM[receiveTelemetryData<br/>oracle integration]
        end
    end
    
    subgraph "NFT Metadata - IPFS"
        NFT202[Token #202<br/>EVOCONS<br/>1000 fractional shares]
        NFT203[Token #203<br/>ICON<br/>Revenue share 88%]
        NFT204[Token #204<br/>Apis Cor<br/>Micro-leasing $1.5k/day]
        NFT205[Token #205<br/>CyBe<br/>Performance bond +5%]
        NFT206[Token #206<br/>Mighty<br/>5200 fractional shares]
    end
    
    subgraph "DeFi Integration (Future)"
        AAVE[Aave v4<br/>RWA Collateral]
        COMPOUND[Compound<br/>Lending]
        UNISWAP[Uniswap<br/>Fractional Liquidity]
    end
    
    %% Connections
    EVOCONS -->|sensors| EVAPI
    ICON -->|sensors| ICONAPI
    APISCOR -->|sensors| APIS_API
    CYBE -->|sensors| CYBE_API
    MIGHTY -->|sensors| MIGHTY_API
    
    EVAPI -->|HTTP request| CHAINLINK
    ICONAPI -->|HTTP request| CHAINLINK
    APIS_API -->|HTTP request| CHAINLINK
    CYBE_API -->|HTTP request| CHAINLINK
    MIGHTY_API -->|HTTP request| CHAINLINK
    
    CHAINLINK -->|on-chain update| TELEM
    MANUAL -->|backup path| TELEM
    
    TELEM --> VALUE
    VALUE --> NFT202
    VALUE --> NFT203
    VALUE --> NFT204
    VALUE --> NFT205
    VALUE --> NFT206
    
    INTERFACE -.implements.-> REFERENCE
    REFERENCE --> MINT
    REFERENCE --> VALUE
    REFERENCE --> MAINT
    REFERENCE --> TELEM
    
    NFT202 -.future.-> AAVE
    NFT203 -.future.-> COMPOUND
    NFT204 -.future.-> UNISWAP
    
    style REFERENCE fill:#ff6b6b
    style CHAINLINK fill:#4ecdc4
    style NFT202 fill:#95e1d3
    style NFT203 fill:#95e1d3
    style NFT204 fill:#95e1d3
    style NFT205 fill:#95e1d3
    style NFT206 fill:#95e1d3
```

---

## Depreciation Models (6 Types)

```mermaid
graph LR
    subgraph "Usage-Based Models"
        LOAD[LOAD_BASED<br/>EVOCONS<br/>tons lifted / max capacity]
        EXTR[EXTRUSION_BASED<br/>ICON<br/>meters / max meters]
        SETUP[SETUP_BASED<br/>Apis Cor<br/>setups / max setups]
        EFF[EFFICIENCY_BASED<br/>CyBe<br/>output vs baseline]
    end
    
    subgraph "Time-Based Models"
        LINEAR[LINEAR<br/>Mighty Buildings<br/>hours / lifetime]
        TIME[TIME_BASED<br/>age / lifespan]
    end
    
    ASSET[Industrial Asset] --> LOAD
    ASSET --> EXTR
    ASSET --> SETUP
    ASSET --> EFF
    ASSET --> LINEAR
    ASSET --> TIME
    
    LOAD --> DEPR[Current Depreciation %]
    EXTR --> DEPR
    SETUP --> DEPR
    EFF --> DEPR
    LINEAR --> DEPR
    TIME --> DEPR
    
    DEPR --> CURRENT_VALUE[Current Asset Value]
    
    style DEPR fill:#ffd93d
    style CURRENT_VALUE fill:#6bcf7f
```

---

## Tokenization Strategies (5 Types)

```mermaid
graph TB
    ASSET[Industrial Asset<br/>$1M - $5M value]
    
    ASSET --> FULL[FULL_OWNERSHIP<br/>1 NFT = 100% ownership<br/>Ex: Factories]
    ASSET --> FRAC[FRACTIONAL<br/>1000 shares @ $1.2k<br/>Ex: EVOCONS]
    ASSET --> LEASE[MICRO_LEASING<br/>Daily/Weekly/Monthly<br/>Ex: Apis Cor $1.5k/day]
    ASSET --> PERF[PERFORMANCE_BOND<br/>Bonus if efficiency >120%<br/>Ex: CyBe +5%]
    ASSET --> REV[REVENUE_SHARE<br/>88% to investors<br/>Ex: ICON]
    
    FULL --> INV1[Institutional Investor]
    FRAC --> INV2[1000 Retail Investors]
    LEASE --> INV3[Daily Cash Flow Seekers]
    PERF --> INV4[Sophisticated Investors]
    REV --> INV5[Passive Income Investors]
    
    style FRAC fill:#95e1d3
    style LEASE fill:#95e1d3
    style PERF fill:#95e1d3
    style REV fill:#95e1d3
```

---

## Oracle Resilience Roadmap (v1.0 → v2.0)

```mermaid
timeline
    title Oracle Evolution Roadmap
    
    section v1.0 Current
        Manual Fallback : MANUAL_ENTRY provider
        Stale Detection : >7 days warning
        Single Oracle : Chainlink primary
    
    section v1.1 - 3-6 months
        Circuit Breaker : 20% max change
        Grace Period : Pause liquidations
        Multi-Sig Governance : 5 of 9 guardians
    
    section v1.2 - 6-12 months
        Multi-Oracle : Chainlink + Functions + Direct API
        Consensus : 2 of 3 must agree (±5%)
        UMA Disputes : Human-in-the-loop resolution
    
    section v2.0 - 12-18 months
        ZK-Proofs : Machine-generated proofs
        Edge Validation : RISC Zero verifier
        99.99% Uptime : Production-grade
```

---

## Contract Size Challenge & Solution

```mermaid
graph TB
    subgraph "Current State v1.0"
        REF[BashoodRWAReference.sol<br/>806 lines<br/>⚠️ 28KB compiled]
        LIMIT[EVM Deployment Limit<br/>24KB Spurious Dragon]
        
        REF -->|exceeds| LIMIT
        LIMIT --> BLOCK[❌ Cannot Deploy<br/>❌ Tests Fail]
    end
    
    subgraph "Solution - Base Builder Grant"
        GRANT[$12,500 Funding]
        
        GRANT --> TASK1[Week 1-2: Library Extraction<br/>$5,000]
        GRANT --> TASK2[Week 2: Testing Infrastructure<br/>$3,000]
        GRANT --> TASK3[Week 3: Deployment<br/>$1,500]
        GRANT --> TASK4[Week 4: Documentation<br/>$2,000]
    end
    
    subgraph "Refactored v1.1"
        CORE[BashoodRWACore.sol<br/>~400 lines<br/>~12KB]
        LIB1[DepreciationLib.sol<br/>~200 lines<br/>~6KB]
        LIB2[TelemetryLib.sol<br/>~150 lines<br/>~4KB]
        LIB3[ValidationLib.sol<br/>~100 lines<br/>~3KB]
        
        CORE -.uses.-> LIB1
        CORE -.uses.-> LIB2
        CORE -.uses.-> LIB3
        
        CORE --> SUCCESS[✅ <24KB<br/>✅ Deployable<br/>✅ Tests Pass]
    end
    
    TASK1 --> LIB1
    TASK1 --> LIB2
    TASK1 --> LIB3
    TASK2 --> SUCCESS
    TASK3 --> DEPLOY[Deploy to Base Sepolia]
    TASK4 --> DOCS[Tutorial + Integration Guide]
    
    style BLOCK fill:#ff6b6b
    style SUCCESS fill:#6bcf7f
    style GRANT fill:#ffd93d
```

---

## Data Flow: Telemetry → Valuation → NFT Update

```mermaid
sequenceDiagram
    participant Machine as EVOCONS EVOBLOCK
    participant API as EVOCONS API
    participant Oracle as Chainlink Node
    participant Contract as BashoodRWAReference
    participant NFT as Token #202 Metadata
    participant Investor as 1000 Shareholders
    
    Machine->>API: Lift 1000 tons (sensor data)
    API->>API: Update totalLoadLifted: 72,000 → 73,000
    
    Oracle->>API: HTTP request (every 1 hour)
    API-->>Oracle: {totalLoadLifted: 73,000, timestamp: now}
    
    Oracle->>Contract: receiveTelemetryData(tokenId=202, value=73,000)
    
    Contract->>Contract: Validate bounds (no decrease, <2x change)
    Contract->>Contract: Update _operationalMetrics[202]
    Contract->>Contract: calculateCurrentValue()
    
    Note over Contract: Depreciation: 73,000 / 500,000 = 14.6%<br/>Current Value: $1.2M × (1 - 0.146) = $1,024,800
    
    Contract->>Contract: emit AssetValueUpdated(202, $1,024,800)
    Contract->>NFT: Update metadata (off-chain indexer)
    
    NFT-->>Investor: New valuation visible on OpenSea
    Investor->>Investor: Share value: $1,024,800 / 1000 = $1,024.80
```

---

## Security Architecture (Multi-Layer Defense)

```mermaid
graph TB
    subgraph "Layer 1: Access Control"
        ADMIN[DEFAULT_ADMIN_ROLE<br/>Multi-sig 5-of-9]
        ASSET_MGR[ASSET_MANAGER_ROLE<br/>Mint assets, record maintenance]
        ORACLE_ROLE[ORACLE_ROLE<br/>Update telemetry]
        UPGRADER[UPGRADER_ROLE<br/>UUPS upgrades]
    end
    
    subgraph "Layer 2: Data Validation"
        BOUNDS[Bounds Checking<br/>Values cannot decrease]
        RATE[Rate Limiting<br/>Max 20% change per hour]
        ANOMALY[Anomaly Detection<br/>>3σ from mean]
    end
    
    subgraph "Layer 3: Oracle Resilience"
        STALE[Stale Data Detection<br/>>7 days]
        FALLBACK[Manual Entry Fallback<br/>ASSET_MANAGER can override]
        PAUSE[Emergency Pause<br/>ADMIN can halt]
    end
    
    subgraph "Layer 4: Upgrade Safety"
        TIMELOCK[48-hour Timelock<br/>On upgrades]
        GOVERNANCE[Multi-sig Approval<br/>Required for changes]
    end
    
    subgraph "Layer 5: Insurance"
        PHYSICAL[Physical Insurance<br/>AXA $1.2M coverage]
        SMART_CONTRACT[Smart Contract Insurance<br/>Nexus Mutual (planned)]
        CHAINLINK_BUILD[Chainlink BUILD<br/>Economic guarantees]
    end
    
    ADMIN --> BOUNDS
    ASSET_MGR --> BOUNDS
    ORACLE_ROLE --> BOUNDS
    
    BOUNDS --> RATE
    RATE --> ANOMALY
    
    ANOMALY --> STALE
    STALE --> FALLBACK
    FALLBACK --> PAUSE
    
    PAUSE --> TIMELOCK
    TIMELOCK --> GOVERNANCE
    
    GOVERNANCE --> PHYSICAL
    PHYSICAL --> SMART_CONTRACT
    SMART_CONTRACT --> CHAINLINK_BUILD
    
    style ADMIN fill:#4ecdc4
    style PAUSE fill:#ff6b6b
    style GOVERNANCE fill:#ffd93d
```

---

## Grant Funding Allocation

```mermaid
pie title Budget Breakdown ($12,500)
    "Smart Contract Refactoring" : 5000
    "Testing Infrastructure (90%+ coverage)" : 3000
    "Documentation & Tutorials" : 2000
    "Base Sepolia Deployment + 5 NFTs" : 1500
    "Security Audit (Partial)" : 1000
```

---

## Post-Grant Funding Strategy

```mermaid
graph LR
    subgraph "Phase 1 - Q1 2026"
        BUILDER[Base Builder Grant<br/>$12.5k<br/>✅ Application Ready]
        RETRO[Optimism RetroPGF<br/>$50k<br/>70% probability]
        GITCOIN[Gitcoin Grants<br/>$20k<br/>80% probability]
    end
    
    subgraph "Phase 2 - Q2-Q3 2026"
        ECO[Base Ecosystem Fund<br/>$100k<br/>95% probability]
        CHAINLINK[Chainlink BUILD<br/>$50k oracle credits<br/>90% probability]
        EVOCONS[EVOCONS Partnership<br/>$50k co-development<br/>80% probability]
    end
    
    subgraph "Phase 3 - Q4 2026+"
        AAVE[Aave Grants DAO<br/>$30k<br/>50% probability]
        CDTI[CDTI Spain<br/>$82.5k grant+loan<br/>60% probability]
        REVENUE[Revenue Bootstrapping<br/>$120k over 6 months<br/>90% probability]
    end
    
    BUILDER --> ECO
    RETRO --> CHAINLINK
    GITCOIN --> EVOCONS
    
    ECO --> AAVE
    CHAINLINK --> CDTI
    EVOCONS --> REVENUE
    
    BUILDER -.enables.-> v11[v1.1 Circuit Breaker]
    ECO -.enables.-> v12[v1.2 Multi-Oracle]
    AAVE -.enables.-> v13[v1.3 DeFi Integration]
    REVENUE -.enables.-> v20[v2.0 ZK-Proofs]
    
    style BUILDER fill:#6bcf7f
    style ECO fill:#95e1d3
    style REVENUE fill:#ffd93d
```

---

## Integration with Base L2 Ecosystem

```mermaid
graph TB
    subgraph "BASHOOD-RWA-1 Standard"
        STANDARD[Open-Source Standard<br/>CC0 License<br/>Anyone can use]
    end
    
    subgraph "Base L2 Benefits"
        LOW_GAS[Low Gas Costs<br/>$0.01 per txn]
        FAST[2-second Finality<br/>Real-time updates]
        COINBASE[Coinbase Ecosystem<br/>Fiat on-ramps]
        OPTIMISM[Superchain Member<br/>Cross-L2 composability]
    end
    
    subgraph "Use Cases on Base"
        TOKENIZE[Asset Tokenization<br/>$10.485M pilot]
        LEND[DeFi Lending<br/>Aave/Compound collateral]
        TRADE[Secondary Market<br/>OpenSea/Uniswap]
        FRAC[Fractional Ownership<br/>1000 shares @ $1.2k]
    end
    
    subgraph "Competitive Advantages"
        FIRST[First Industrial RWA<br/>on Base L2]
        OPEN[Open Standard<br/>Network effects]
        ORACLE[Oracle Integration<br/>Chainlink + Pyth]
        TRANSPARENT[Full Transparency<br/>24KB challenge documented]
    end
    
    STANDARD --> LOW_GAS
    STANDARD --> FAST
    STANDARD --> COINBASE
    STANDARD --> OPTIMISM
    
    LOW_GAS --> TOKENIZE
    FAST --> LEND
    COINBASE --> TRADE
    OPTIMISM --> FRAC
    
    TOKENIZE --> FIRST
    LEND --> OPEN
    TRADE --> ORACLE
    FRAC --> TRANSPARENT
    
    style STANDARD fill:#4ecdc4
    style FIRST fill:#6bcf7f
```

---

## Asset Lifecycle on Base L2

```mermaid
stateDiagram-v2
    [*] --> MINTED: mintAsset() called
    
    MINTED --> ACTIVE: Asset operational
    ACTIVE --> ACTIVE: receiveTelemetryData() updates
    ACTIVE --> MAINTENANCE: requiresMaintenance() = true
    
    MAINTENANCE --> ACTIVE: recordMaintenance() completed
    
    ACTIVE --> GRACE_PERIOD: Oracle stale (>7 days)
    GRACE_PERIOD --> ACTIVE: Oracle restored
    GRACE_PERIOD --> PAUSED: ADMIN pauses
    
    PAUSED --> ACTIVE: ADMIN unpauses
    
    ACTIVE --> COMPLIANT: All certifications valid
    ACTIVE --> NON_COMPLIANT: Certification expired
    
    NON_COMPLIANT --> INACTIVE: isCompliant() = false
    INACTIVE --> COMPLIANT: updateCertification()
    COMPLIANT --> ACTIVE: Resume operations
    
    ACTIVE --> DECOMMISSIONED: Total loss / End of life
    DECOMMISSIONED --> [*]: Insurance payout to shareholders
    
    note right of MINTED
        Initial State:
        - Metadata on IPFS
        - NFT minted on Base L2
        - Ownership transferred
    end note
    
    note right of ACTIVE
        Normal Operations:
        - Telemetry updates hourly
        - Value calculated real-time
        - Revenue distributions
    end note
    
    note right of GRACE_PERIOD
        Oracle Failure Protection:
        - Liquidations paused
        - Manual entry allowed
        - Investor warnings sent
    end note
    
    note right of DECOMMISSIONED
        End of Life:
        - Insurance claim processed
        - NFT status: DECOMMISSIONED
        - Shareholders receive payout
    end note
```

---

## Diagram Usage

**For Grant Application:**
1. Copy Mermaid code blocks into GitHub README.md (auto-renders)
2. Screenshot diagrams for PDF submissions
3. Use as visual aids in pitch presentations

**For Documentation:**
- High-Level Architecture: System overview
- Depreciation Models: How value calculation works
- Oracle Resilience: Security & reliability
- Contract Size Challenge: Transparency about current state

**For Investors:**
- Asset Lifecycle: How their NFT operates
- Data Flow: Where telemetry comes from
- Funding Strategy: Growth roadmap

---

**Rendering:** All diagrams use Mermaid.js syntax, which renders automatically on:
- GitHub (in .md files)
- GitLab
- Notion
- Obsidian
- VS Code (with Mermaid extension)

**Export Options:**
- PNG: Use Mermaid Live Editor (https://mermaid.live)
- SVG: For scalable graphics
- PDF: Print from browser after rendering

---

**Last Updated:** January 20, 2026  
**Version:** 1.0 (for Base Builder Grant)  
**License:** CC0 (Public Domain)
