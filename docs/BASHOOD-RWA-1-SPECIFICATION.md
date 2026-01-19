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

## Frequently Asked Questions (FAQ)

### 1. ¿Por qué no ERC-1155?

**Pregunta:** ERC-1155 permite múltiples tokens (fungibles y no fungibles) en un solo contrato. ¿Por qué BASHOOD-RWA-1 usa ERC-721 en lugar de ERC-1155?

**Respuesta:**

**Razones técnicas:**

1. **Identidad única de cada activo**: Cada máquina industrial es única (número de serie, historial de mantenimiento, depreciación individual). ERC-721 representa mejor esta unicidad que ERC-1155.

2. **Metadata granular**: Un EVOCONS EVOBLOCK #EVB-001-2024 tiene metadata completamente diferente a #EVB-002-2024, incluso siendo el mismo modelo. ERC-1155 está optimizado para tokens semi-fungibles (ej: 1000 tokens idénticos de "Common Sword" en un juego), no para activos con historiales operacionales únicos.

3. **Compatibilidad con marketplaces**: OpenSea, Rarible, y otros marketplaces NFT tienen mejor soporte para ERC-721. La visualización de metadata compleja (depreciación, telemetría, certificaciones) es más clara en interfaces ERC-721.

4. **Transferencias**: En ERC-721, `transferFrom()` mueve UN activo específico. En ERC-1155, `safeTransferFrom()` requiere especificar cantidad, añadiendo complejidad innecesaria cuando cada activo es único.

5. **Gas efficiency no es crítico**: ERC-1155 optimiza gas para batch minting (ej: mint 1000 tokens idénticos). En RWA industriales, raramente mints múltiples activos idénticos simultáneamente. El ahorro de gas no justifica la complejidad.

**¿Cuándo usaríamos ERC-1155?**

ERC-1155 sería apropiado para:
- **Materias primas fungibles**: 1000 toneladas de acero (tokens intercambiables)
- **Componentes estandarizados**: 500 paneles solares idénticos
- **Fractional shares**: 1000 shares de un asset (cada share es fungible)

**Solución híbrida:**

Para fractional ownership (ej: EVOCONS con 1000 shares), BASHOOD-RWA-1 usa:
- **1 ERC-721 token** = El activo físico (unique NFT con toda la metadata)
- **TokenizationStrategy.FRACTIONAL** = Indicador en metadata
- **Separate ERC-20 contract** (opcional) = Shares fungibles para trading secundario

Esto mantiene la identidad única del activo (ERC-721) mientras permite ownership fraccionado (ERC-20).

**Conclusión:** ERC-721 es superior para activos industriales únicos con metadata compleja y historiales operacionales individuales.

---

### 2. ¿Qué pasa si el oracle falla?

**Pregunta:** El sistema depende de Chainlink oracles para telemetría. ¿Qué sucede si el oracle deja de funcionar, reporta datos incorrectos, o la red de oracles es atacada?

**Respuesta:**

**Mecanismos de Failsafe Implementados:**

#### A. Fallback a Entrada Manual

```solidity
enum TelemetryProvider {
    EVOCONS_REALTIME,
    ICON_MAGWARE,
    APISCOR_CLOUD_GPS,
    CYBE_AUTO,
    MIGHTY_IOT,
    GENERIC_API,
    MANUAL_ENTRY  // ← Fallback cuando oracle falla
}
```

Si el oracle falla, el `ASSET_MANAGER_ROLE` puede:
1. Cambiar `TelemetryConfig.apiProvider` a `MANUAL_ENTRY`
2. Actualizar `updateUsageMetrics()` manualmente con datos del fabricante
3. El asset sigue operando (no queda "congelado")

#### B. Stale Data Detection

```solidity
function isStaleData(uint256 tokenId) public view returns (bool) {
    TelemetryConfig memory config = _telemetryConfig[tokenId];
    uint256 timeSinceUpdate = block.timestamp - config.lastTelemetryUpdate;
    
    // Si no hay update en 7 días, data está stale
    return timeSinceUpdate > 7 days;
}
```

**Respuesta si data está stale:**
- `calculateCurrentValue()` usa último valor conocido (no estima)
- Se emite evento `TelemetryStale(tokenId, daysSinceUpdate)`
- Dashboard muestra warning a inversores
- Se activa proceso de revisión manual

#### C. Data Validation Bounds

```solidity
function receiveTelemetryData(
    uint256 tokenId,
    bytes32 dataHash,
    OperationalMetrics calldata metrics
) external onlyRole(ORACLE_ROLE) {
    // Validación: valores deben estar en rangos razonables
    require(metrics.totalLoadLifted >= _lastMetrics[tokenId].totalLoadLifted, 
            "Load cannot decrease");
    require(metrics.metersExtruded >= _lastMetrics[tokenId].metersExtruded,
            "Extrusion cannot decrease");
    require(metrics.currentEfficiency <= 150, 
            "Efficiency cannot exceed 150%");
    
    // Validación de cambios extremos (flash attack prevention)
    uint256 change = metrics.totalLoadLifted - _lastMetrics[tokenId].totalLoadLifted;
    uint256 maxDailyChange = _specs[tokenId].maxWeight * 24; // Max 24 hours operation
    require(change <= maxDailyChange, "Unrealistic daily change");
    
    // Si pasa validación, actualizar
    _operationalMetrics[tokenId] = metrics;
}
```

**Esto previene:**
- Oracles maliciosos reportando valores absurdos
- Flash attacks manipulando valor del asset en 1 bloque
- Errores de API (ej: API retorna 0 por bug)

#### D. Multi-Oracle Consensus (Versión Futura)

**v1.1 (post-grant) implementará:**

```solidity
struct OracleConsensus {
    address[] oracles;          // [ChainlinkNode1, ChainlinkNode2, ChainlinkNode3]
    uint256 minimumResponses;   // Mínimo 2 de 3 deben responder
    uint256 tolerancePercent;   // Valores deben estar dentro del 5%
}

function receiveTelemetryDataConsensus(
    uint256 tokenId,
    uint256[] calldata values,  // [Oracle1Value, Oracle2Value, Oracle3Value]
    address[] calldata oracles
) external {
    require(values.length >= config.minimumResponses, "Insufficient responses");
    
    // Calcular mediana (resistente a 1 oracle malicioso)
    uint256 medianValue = calculateMedian(values);
    
    // Verificar que todos los valores estén dentro de tolerancia
    for (uint i = 0; i < values.length; i++) {
        uint256 deviation = abs(values[i] - medianValue) * 100 / medianValue;
        require(deviation <= config.tolerancePercent, "Oracle deviation too high");
    }
    
    // Usar mediana como valor confiable
    updateMetrics(tokenId, medianValue);
}
```

**Ventaja:** Si 1 de 3 oracles falla o es malicioso, el sistema sigue funcionando con los otros 2.

#### E. Emergency Pause

```solidity
function pauseTelemetry(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _telemetryConfig[tokenId].isPaused = true;
    emit TelemetryPaused(tokenId, block.timestamp);
}
```

**Casos de uso:**
- Oracle reporta datos claramente incorrectos
- API del fabricante está caído temporalmente
- Investigación de seguridad en curso

Mientras está pausado:
- No se aceptan updates de oracle
- Asset mantiene última valuación conocida
- Ownership transfers siguen funcionando
- Compliance checks siguen activos

#### F. Insurance Against Oracle Failure

**Propuesta para v1.2:**

Integración con **Chainlink BUILD Program** que provee:
- **Oracle uptime guarantees** (99.9% SLA)
- **Economic guarantees**: Chainlink staking pool cubre pérdidas por oracle failure
- **Fallback oracles**: Automatic failover si primary oracle cae

**Conclusión:** El sistema tiene 6 capas de protección contra oracle failure. En el peor caso (oracle completamente caído), el asset revierte a entrada manual mientras se resuelve el problema.

---

### 3. ¿Quién responde legalmente?

**Pregunta:** Si un inversor pierde dinero porque el contrato tiene un bug, o porque los datos del oracle eran incorrectos, o porque el asset físico fue mal representado, ¿quién es legalmente responsable? ¿El protocolo, el asset manager, el fabricante, los desarrolladores?

**Respuesta:**

**Contexto Legal:**

BASHOOD-RWA-1 es un **protocolo open-source** (CC0 license), similar a ERC-721 o Uniswap. El código en sí no tiene responsabilidad legal. La responsabilidad recae en las **entidades que usan el protocolo** para tokenizar assets.

#### A. Estructura Legal Recomendada (Por Asset)

Cada asset tokenizado debería tener una **entidad legal específica**:

**Ejemplo: EVOCONS EVOBLOCK #001**

```
Estructura Legal:
┌─────────────────────────────────────────────────────┐
│ EVOCONS EVOBLOCK SPV #001 SL (España)              │
│ - CIF: B12345678                                    │
│ - Registered: Barcelona, Spain                      │
│ - Purpose: Ownership vehicle para EVOBLOCK #001    │
│ - Directors: EVOCONS + Asset Manager                │
└─────────────────────────────────────────────────────┘
          |
          | owns
          ↓
┌─────────────────────────────────────────────────────┐
│ Physical Asset: EVOCONS EVOBLOCK System             │
│ - Serial: EVB-001-2024                              │
│ - Location: Barcelona Construction Hub              │
│ - Insured: AXA ($1.2M coverage)                     │
└─────────────────────────────────────────────────────┘
          |
          | represented by
          ↓
┌─────────────────────────────────────────────────────┐
│ NFT Token #202 (on Base L2)                        │
│ - Standard: BASHOOD-RWA-1                           │
│ - Owner: 0x1234... (SPV address)                    │
│ - Fractional: 1000 shares                           │
└─────────────────────────────────────────────────────┘
          |
          | shares owned by
          ↓
┌─────────────────────────────────────────────────────┐
│ Investors (1000 shareholders)                       │
│ - KYC/AML compliant (Reg D exemption USA)           │
│ - Accredited investors only (EU MiCA compliant)     │
│ - Shareholder agreement (legal contract off-chain)  │
└─────────────────────────────────────────────────────┘
```

**Responsabilidades por Entidad:**

1. **EVOCONS (Manufacturer)**
   - Garantía del equipment físico
   - Precision de telemetry API data
   - Certificaciones válidas (CE Mark, ISO 9001)
   - **NO responsable** de smart contract bugs

2. **SPV #001 SL (Legal Entity)**
   - Ownership legal del asset físico
   - Compliance con regulaciones españolas
   - Insurance payments
   - Distribution de revenue a shareholders
   - **Responsable** de accuracy de metadata en NFT

3. **Asset Manager (ASSET_MANAGER_ROLE)**
   - Updates de maintenance records
   - Accuracy de financial data
   - Compliance con shareholder agreement
   - **NO responsable** de smart contract bugs

4. **Protocolo BASHOOD-RWA-1 (Open-Source)**
   - CC0 license (no warranty)
   - Community-maintained
   - **NO responsable** de uso del protocolo por terceros

5. **Bashood Protocol Team (Grant Recipients)**
   - Development del standard
   - Security audits (post-grant)
   - Documentation
   - **NO responsable** de assets específicos tokenizados por terceros

#### B. Disclaimers Legales (En Metadata y UI)

**En collection.json:**

```json
{
  "legal": {
    "disclaimer": "This NFT represents fractional ownership in EVOCONS EVOBLOCK SPV #001 SL (CIF: B12345678), a Spanish limited liability company. The NFT does NOT represent direct ownership of the physical asset. Investors are subject to the Shareholder Agreement dated January 1, 2026. This is a security token subject to Regulation D (USA) and MiCA (EU). Accessible only to accredited investors.",
    "jurisdiction": "Spain (primary), EU (MiCA compliant)",
    "disputeResolution": "Arbitration in Barcelona, Spain per Shareholder Agreement Section 12",
    "protocolLiability": "BASHOOD-RWA-1 is an open-source protocol (CC0 license). The protocol developers are NOT liable for losses incurred through use of this standard. See https://bashood.com/legal/protocol-disclaimer"
  }
}
```

**En UI (Before Purchase):**

```
⚠️  IMPORTANT LEGAL NOTICE

You are purchasing shares in EVOCONS EVOBLOCK SPV #001 SL, NOT the physical 
asset directly. This is a SECURITY TOKEN subject to:

✓ Accredited investor requirements (Reg D / MiCA)
✓ Lock-up period: 12 months
✓ Jurisdictional restrictions (no USA non-accredited)
✓ Shareholder Agreement (binding legal contract)

RISKS:
- Smart contract bugs (audited but not guaranteed)
- Oracle failure (telemetry data may be delayed/incorrect)
- Asset damage/loss (insured but deductibles apply)
- Regulatory changes (token may become non-transferable)
- Liquidity risk (secondary market not guaranteed)

By clicking "I Understand," you acknowledge reading the Shareholder Agreement 
and accept all risks.

[I Understand] [Cancel]
```

#### C. Insurance Coverage

**Layers of Protection:**

1. **Physical Asset Insurance** (Required)
   - Provider: AXA, Allianz, FM Global
   - Coverage: Equipment breakdown, theft, damage
   - Amount: 100% of asset value
   - Beneficiary: SPV (legal entity)

2. **Smart Contract Insurance** (Recommended for v1.1)
   - Providers: Nexus Mutual, InsurAce, Unslashed Finance
   - Coverage: Smart contract exploits, oracle failures
   - Amount: Up to $1M per asset
   - Premium: ~2-3% annually

3. **D&O Insurance** (For Asset Managers)
   - Coverage: Director & Officer liability
   - Protects: Asset managers from shareholder lawsuits
   - Amount: $500k - $2M

#### D. Regulatory Compliance

**USA:**
- **Regulation D (Rule 506(c))**: Accredited investors only
- **Form D filing**: With SEC within 15 days of first sale
- **Blue Sky Laws**: State-by-state exemptions
- **FinCEN**: Not classified as "virtual currency" (security token)

**EU:**
- **MiCA (Markets in Crypto-Assets)**: Registered crypto-asset service provider
- **Prospectus Regulation**: Exemption if <€5M raised
- **AML/KYC**: Full identity verification required

**España:**
- **CNMV registration**: If offering to Spanish investors
- **Ley de Sociedades de Capital**: SPV governance

#### E. ¿Qué pasa en caso de Dispute?

**Escenario 1: Smart Contract Bug**

- **Ejemplo**: Bug en `calculateCurrentValue()` reporta valor incorrecto
- **Responsable**: Bashood Protocol Team (si pre-audit), Auditor (si post-audit)
- **Remedio**: Emergency pause, fix + upgrade contract, compensate affected users
- **Insurance**: Smart contract insurance cubre pérdidas

**Escenario 2: Oracle Data Incorrecta**

- **Ejemplo**: Chainlink oracle reporta 100,000 tons lifted (real: 72,000)
- **Responsable**: Chainlink (oracle provider), EVOCONS (si API data incorrecta)
- **Remedio**: Manual correction, dispute en Chainlink, oracle bond slashing
- **Insurance**: Chainlink BUILD program economic guarantees

**Escenario 3: Asset Físico Mal Representado**

- **Ejemplo**: Metadata dice "CE Mark válido" pero certificación expiró
- **Responsable**: Asset Manager (responsable de updates), SPV (ownership entity)
- **Remedio**: Shareholder lawsuit contra SPV directors, insurance claim
- **Insurance**: D&O insurance cubre defensa legal

**Escenario 4: Asset Destruido (Total Loss)**

- **Ejemplo**: EVOCONS EVOBLOCK destruido en incendio
- **Responsable**: N/A (accidente cubierto por insurance)
- **Remedio**: 
  1. Insurance payout a SPV ($1.2M)
  2. SPV liquida y distribuye a shareholders
  3. NFT marcado como `AssetStatus.DECOMMISSIONED`
  4. Investors reciben pro-rata share del insurance payout

#### F. Cláusulas del Shareholder Agreement

**Sección clave: "Limitation of Liability"**

```
12. LIMITATION OF LIABILITY

12.1 The Protocol Developers (Bashood Protocol Team) are NOT parties to this 
Agreement and have NO liability for:
  a) Smart contract bugs or exploits
  b) Oracle failures or incorrect data
  c) Loss of private keys by Shareholders
  d) Regulatory changes affecting token transferability

12.2 The SPV's liability is LIMITED to the value of the Asset plus insurance 
proceeds. Directors are NOT personally liable except in cases of fraud or 
gross negligence.

12.3 Shareholders WAIVE any claims against:
  a) BASHOOD-RWA-1 protocol (open-source, no warranty)
  b) Base L2 network (blockchain infrastructure)
  c) Chainlink oracle network (data provider)
  d) OpenSea / marketplaces (listing platforms)

12.4 EXCLUSIVE REMEDY: Shareholders' sole remedy for any dispute is:
  a) Arbitration in Barcelona, Spain (CIAM rules)
  b) Recovery limited to Shareholder's pro-rata ownership
  c) No class actions permitted
```

**Conclusión:** La responsabilidad legal está claramente asignada a través de:
1. **Legal entities** (SPVs) que son dueños de assets físicos
2. **Insurance coverage** (physical + smart contract + D&O)
3. **Shareholder agreements** (contractos off-chain vinculantes)
4. **Regulatory compliance** (Reg D, MiCA, CNMV)
5. **Protocol disclaimers** (CC0 license, no warranty)

El protocolo en sí (BASHOOD-RWA-1) es infrastructure neutral. La responsabilidad legal recae en las entidades que usan el protocolo para tokenizar assets específicos, similar a cómo HTTP no es responsable del contenido web.

---

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
