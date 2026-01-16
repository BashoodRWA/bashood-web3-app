# BASHOOD-RWA-1: Standard for Industrial Real-World Asset Tokenization

## Abstract

BASHOOD-RWA-1 is a comprehensive standard for tokenizing industrial real-world assets (RWAs) on blockchain networks. This standard extends ERC-721 to include industry-specific metadata, depreciation models, telemetry integration, certification tracking, and multiple tokenization strategies. The standard is designed to support construction equipment, manufacturing machinery, energy infrastructure, and other high-value industrial assets.

## Motivation

Current NFT standards (ERC-721, ERC-1155) are insufficient for representing complex industrial assets because they lack:

1. **Asset-Specific Depreciation Models**: Industrial assets depreciate based on usage metrics (tons lifted, meters extruded, setup counts) rather than time alone
2. **Real-Time Telemetry Integration**: Equipment manufacturers provide APIs with live operational data (load, pressure, GPS location) that must be integrated on-chain
3. **Certification & Compliance Tracking**: Industrial assets require certifications (CE Mark, UL 3401, ISO 9001) with expiry dates and renewal tracking
4. **Multiple Tokenization Strategies**: Different assets require different ownership models (fractional, micro-leasing, revenue-share, performance bonds)
5. **Maintenance Scheduling**: Predictive maintenance based on operating hours and usage patterns
6. **Insurance Management**: Equipment breakdown insurance, inland marine coverage, and liability tracking

BASHOOD-RWA-1 solves these problems by providing a standardized interface that industrial companies can adopt to tokenize their assets on Base L2 and other EVM-compatible chains.

## Specification

### Asset Categories

```solidity
enum AssetCategory {
    CONSTRUCTION_3D_PRINTER_GANTRY,    // EVOCONS EVOBLOCK
    CONSTRUCTION_3D_PRINTER_MOBILE,     // Apis Cor, CyBe RC
    MODULAR_FACTORY_UV,                 // Mighty Buildings
    HEAVY_VEHICLE,                      // Excavators, cranes
    ENERGY_EQUIPMENT,                   // Generators, transformers
    LOGISTICS_INFRASTRUCTURE,           // Warehouses, conveyor systems
    RAW_MATERIALS,                      // Steel, lumber inventory
    REAL_ESTATE                         // Buildings, land
}
```

### Depreciation Models

The standard supports 6 depreciation models based on real industrial usage patterns:

#### 1. LOAD_BASED (EVOCONS)
Depreciation based on total weight lifted by gantry cranes or heavy equipment.

**Formula:**
```
Depreciation % = (totalLoadLifted / maxLoadCapacity) * 100
```

**Example:** EVOCONS EVOBLOCK with 500,000 ton lifetime capacity
- Current: 72,000 tons lifted
- Depreciation: 14.4%
- Remaining life: 85.6%

#### 2. EXTRUSION_BASED (ICON)
Depreciation based on linear meters of material extruded in 3D printing.

**Formula:**
```
Depreciation % = (metersExtruded / maxMetersExtruded) * 100
```

**Example:** ICON VULCAN with 150,000 meter lifetime
- Current: 28,500 meters extruded
- Depreciation: 19%
- Remaining life: 81%

#### 3. SETUP_BASED (Apis Cor)
Depreciation based on mobilization/setup events for mobile equipment.

**Formula:**
```
Depreciation % = (setupCount / maxSetups) * 100
```

**Example:** Apis Cor Mobile Robot with 2,000 setup lifetime
- Current: 42 setups
- Depreciation: 2.1%
- Remaining life: 97.9%

#### 4. EFFICIENCY_BASED (CyBe)
Depreciation based on output efficiency degradation over time.

**Formula:**
```
Depreciation % = (1 - currentEfficiency / baselineEfficiency) * 100
```

**Example:** CyBe RC with 10 m³/day baseline
- Current: 11.2 m³/day (112% efficiency)
- Depreciation: 0% (asset performing above baseline)

#### 5. LINEAR (Mighty Buildings)
Traditional time-based straight-line depreciation.

**Formula:**
```
Depreciation % = (operatingHours / maxLifetimeHours) * 100
```

**Example:** Mighty Buildings with 175,200 hour lifetime (20 years)
- Current: 4,800 hours
- Depreciation: 2.7%
- Remaining life: 97.3%

#### 6. TIME_BASED
Age-based depreciation independent of usage.

**Formula:**
```
Depreciation % = (currentAge / totalLifespan) * annualDepreciationRate
```

### Tokenization Strategies

#### 1. FULL_OWNERSHIP
Traditional single-owner NFT model. One token represents 100% ownership.

**Use case:** High-value unique assets (factories, buildings)

#### 2. FRACTIONAL
Ownership divided into shares. One NFT represents the asset, but ownership is split.

**Use case:** EVOCONS EVOBLOCK (1000 shares at $1,200 each)
- Total: $1.2M asset
- Min investment: $1,200
- Revenue share: 85% to investors

#### 3. MICRO_LEASING
Daily/weekly/monthly leasing with tokenized revenue distribution.

**Use case:** Apis Cor Mobile Robot
- Daily rate: $1,500
- Weekly rate: $9,500
- Monthly rate: $35,000
- Annual revenue: $720k

#### 4. PERFORMANCE_BOND
Investors receive bonuses when asset exceeds performance thresholds.

**Use case:** CyBe RC
- Baseline: 10 m³/day
- Bonus threshold: 12 m³/day
- Bonus rate: +5% to investors
- Current: 11.2 m³/day (approaching bonus)

#### 5. REVENUE_SHARE
Percentage of revenue distributed to token holders.

**Use case:** ICON VULCAN
- Revenue per home: $45,000
- Homes per month: 2.5
- Annual revenue: $1.35M
- Share to investors: 88%

### Telemetry Integration

Industrial assets provide real-time data through manufacturer APIs:

```solidity
struct TelemetryConfig {
    bool hasRealTimeAPI;
    address oracleAddress;        // Chainlink oracle contract
    TelemetryProvider apiProvider;
    bytes32 apiKeyHash;
}

enum TelemetryProvider {
    EVOCONS_REALTIME,     // currentLoad, totalLoadLifted (realtime)
    ICON_MAGWARE,         // metersExtruded, lavacretePSI (proprietary B2B)
    APISCOR_CLOUD_GPS,    // GPS location, setupCount (cloud-based)
    CYBE_AUTO,            // m³/day, pumpPressure (auto-metering)
    MIGHTY_IOT,           // panelsProduced, carbonSaved (IoT)
    GENERIC_API,
    MANUAL_ENTRY
}
```

**Oracle Integration:**
- Chainlink nodes fetch data from manufacturer APIs
- Data verified and written on-chain via `receiveTelemetryData()`
- Auto-updates operational metrics and triggers events

### Certification Tracking

```solidity
struct CertificationData {
    bool ceMark;          // CE Mark (Europe)
    bool ul3401;          // UL 3401 (USA 3D printed structures)
    bool iso9001;         // Quality management
    bool iso14001;        // Environmental management
    bool ibcCompliant;    // International Building Code
    bool oshaCompliant;   // OSHA safety standards
}
```

**Compliance Function:**
```solidity
function isCompliant(uint256 tokenId) external view returns (bool);
```

Returns `true` if all required certifications are valid and not expired.

### Insurance Management

```solidity
struct InsuranceData {
    string provider;           // "AXA", "Allianz", "FM Global"
    string policyNumber;
    InsuranceType insuranceType;
    uint256 coverageAmount;
    uint256 annualPremium;
    uint256 expiryDate;
}

enum InsuranceType {
    EQUIPMENT_BREAKDOWN,  // Stationary equipment (2-3% of CAPEX)
    INLAND_MARINE,        // Mobile equipment in transit (2-3%)
    COMPREHENSIVE,        // Factories, full coverage (1-2%)
    LIABILITY_ONLY
}
```

### Events

```solidity
event AssetMinted(
    uint256 indexed tokenId,
    AssetCategory category,
    string manufacturer,
    uint256 purchasePrice,
    address indexed owner
);

event AssetValueUpdated(
    uint256 indexed tokenId,
    uint256 oldValue,
    uint256 newValue,
    uint256 timestamp
);

event MaintenanceRecorded(
    uint256 indexed tokenId,
    uint256 cost,
    uint256 timestamp,
    string description
);

event TelemetryDataReceived(
    uint256 indexed tokenId,
    string metricName,
    uint256 value,
    uint256 timestamp
);

event PerformanceBonusTriggered(
    uint256 indexed tokenId,
    uint256 bonusAmount,
    uint256 timestamp
);

event AssetLeased(
    uint256 indexed tokenId,
    address indexed lessee,
    uint256 duration,
    uint256 totalCost,
    uint256 timestamp
);
```

### Core Functions

```solidity
// Minting
function mintAsset(
    address to,
    AssetIdentification memory identification,
    TechnicalSpecs memory specs,
    FinancialData memory financial,
    OperationalMetrics memory operational,
    CertificationData memory certification,
    TelemetryConfig memory telemetry,
    TokenizationConfig memory tokenization,
    InsuranceData memory insurance,
    string memory metadataURI
) external returns (uint256);

// Value Management
function calculateCurrentValue(uint256 tokenId) external view returns (uint256);
function getDepreciationPercentage(uint256 tokenId) external view returns (uint256);
function updateAssetValue(uint256 tokenId, uint256 newValue) external;

// Operational Updates
function updateUsageMetrics(
    uint256 tokenId,
    uint256 operatingHours,
    uint256 totalLoadLifted,
    uint256 metersExtruded,
    uint256 setupCount,
    uint256 cubicMetersPerDay
) external;

function recordMaintenance(
    uint256 tokenId,
    uint256 cost,
    string memory description
) external;

function requiresMaintenance(uint256 tokenId) external view returns (bool);

// Telemetry
function receiveTelemetryData(
    uint256 tokenId,
    string memory metricName,
    uint256 value
) external;

// Tokenization Strategies
function leaseAsset(uint256 tokenId, address lessee, uint256 duration) external;
function triggerPerformanceBonus(uint256 tokenId, uint256 bonusAmount) external;

// Compliance
function isCompliant(uint256 tokenId) external view returns (bool);
function updateCertification(uint256 tokenId, CertificationData memory certification) external;
```

## Rationale

### Why 6 Depreciation Models?

Real industrial assets do not depreciate uniformly. Our research of 5 construction robotics companies revealed:

- **EVOCONS (Spain)**: Gantry cranes depreciate based on total load lifted (tons)
- **ICON (USA)**: 3D printers depreciate based on material extruded (linear meters)
- **Apis Cor (UAE)**: Mobile robots depreciate based on setup/teardown cycles
- **CyBe (Netherlands)**: Equipment performance degrades over time (efficiency-based)
- **Mighty Buildings (USA)**: Factory infrastructure uses traditional linear depreciation

A single depreciation model would be inaccurate for all asset types.

### Why Multiple Tokenization Strategies?

Different investors have different risk profiles:

- **Fractional ownership**: Long-term investors seeking asset appreciation
- **Micro-leasing**: Income investors wanting daily/weekly cash flow
- **Performance bonds**: Sophisticated investors betting on operational efficiency
- **Revenue share**: Investors wanting exposure to construction industry growth

### Why Chainlink Oracle Integration?

Manufacturer APIs (EVOCONS, ICON, Apis Cor, CyBe, Mighty Buildings) provide real-time operational data. Chainlink oracles enable:

1. **Trust minimization**: Decentralized oracle network vs single data source
2. **Automation**: Auto-update asset values based on usage
3. **Transparency**: All data updates visible on-chain
4. **Interoperability**: Works across Base, Ethereum, other chains

### Why Certification Tracking?

Industrial assets require legal certifications to operate:

- **CE Mark**: Required for equipment sold in Europe
- **UL 3401**: Required for 3D-printed structures in USA
- **ISO 9001/14001**: Quality and environmental standards
- **IBC**: International Building Code compliance
- **OSHA**: Safety compliance

Expired certifications = asset cannot operate = value = 0. The standard enforces compliance checks.

## Backwards Compatibility

BASHOOD-RWA-1 is fully compatible with ERC-721. Any wallet, marketplace, or protocol that supports ERC-721 can interact with BASHOOD-RWA-1 tokens. The additional functionality is optional and backward-compatible.

**Standard ERC-721 functions:**
- `balanceOf()`, `ownerOf()`, `transferFrom()`, `approve()`, `setApprovalForAll()`

**BASHOOD-RWA-1 extensions:**
- `calculateCurrentValue()`, `getDepreciationPercentage()`, `isCompliant()`, etc.

## Security Considerations

### 1. Oracle Manipulation
**Risk:** Malicious oracles could report false telemetry data to inflate/deflate asset values.

**Mitigation:**
- Use Chainlink decentralized oracle networks (multiple nodes)
- Implement data validation (values must be within reasonable bounds)
- Time-weighted averages to prevent flash manipulation
- Emergency pause functionality

### 2. Certification Expiry
**Risk:** Assets continue operating with expired certifications, creating liability.

**Mitigation:**
- `isCompliant()` function checks certification expiry dates
- Automatic status change to `INACTIVE` when certifications expire
- Events emitted when certifications need renewal

### 3. Access Control
**Risk:** Unauthorized parties update asset data, mint fake assets, or manipulate values.

**Mitigation:**
- Role-based access control (RBAC) using OpenZeppelin AccessControl
- `ASSET_MANAGER_ROLE`: Can mint assets, record maintenance
- `ORACLE_ROLE`: Can update telemetry data
- `UPGRADER_ROLE`: Can upgrade contract (UUPS proxy pattern)
- Multi-sig admin for critical operations

### 4. Upgrade Safety
**Risk:** Malicious contract upgrades could steal funds or corrupt data.

**Mitigation:**
- UUPS (Universal Upgradeable Proxy Standard) pattern
- Upgrades require `UPGRADER_ROLE` (multi-sig controlled)
- Time-lock on upgrades (24-48 hour delay)
- Transparent upgrade process with governance

### 5. Insurance Claims
**Risk:** Asset destroyed/damaged but insurance payout not reflected on-chain.

**Mitigation:**
- Insurance data stored on-chain (provider, policy number, coverage)
- Asset status can be set to `DECOMMISSIONED` after total loss
- Integration with DeFi insurance protocols (future work)

## Reference Implementation

A complete reference implementation is available at:
- **Repository**: https://github.com/bashood/bashood-rwa-standard
- **Contract**: `BashoodRWAReference.sol`
- **Deployment**: Base Sepolia (testnet)

## Test Assets

The standard includes metadata for 5 real industrial assets:

| ID | Company | Asset | Price | Depreciation | Strategy |
|----|---------|-------|-------|--------------|----------|
| 202 | EVOCONS | EVOBLOCK Gantry | $1.2M | Load-based (14.4%) | Fractional (1000 shares) |
| 203 | ICON | VULCAN Printer | $1.6M | Extrusion (19%) | Revenue Share (88%) |
| 204 | Apis Cor | Mobile Robot | $325k | Setup (2.1%) | Micro-Leasing ($1.5k/day) |
| 205 | CyBe | RC Track Robot | $240k | Efficiency (0%) | Performance Bond (+5%) |
| 206 | Mighty Buildings | UV Factory | $5.2M | Linear (2.7%) | Fractional (5200 shares) |

**Total Value:** $8.565M tokenized

## Future Extensions

### BASHOOD-RWA-2 (Planned)
- Carbon credit integration for ESG assets
- Automated yield distribution to fractional owners
- Cross-chain asset bridging (Base ↔ Ethereum ↔ Polygon)
- DeFi primitives (lending against RWA collateral)

### BASHOOD-RWA-3 (Research)
- AI-powered predictive maintenance
- Dynamic insurance premiums based on usage
- Reputation system for asset managers
- Decentralized asset appraisal network

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

---

**Authors:**
- Bashood Protocol Team
- Research contributors: EVOCONS, ICON, Apis Cor, CyBe Construction, Mighty Buildings

**Version:** 1.0.0  
**Status:** Draft  
**Date:** January 16, 2026  
**Network:** Base L2 (Optimistic Rollup)
