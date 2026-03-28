# Bashood — Industrial Asset Tokenization Platform

![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat-square&logo=solidity)
![Base](https://img.shields.io/badge/Base-L2-0052FF?style=flat-square)
![HH Tests](https://img.shields.io/badge/Hardhat-1277_passing-success?style=flat-square)
![Forge Tests](https://img.shields.io/badge/Forge-117_passing_(10k_fuzz)-success?style=flat-square)
![Bytecode](https://img.shields.io/badge/BashoodPresaleFinal-17.23_KB-blue?style=flat-square)
![Audit Score](https://img.shields.io/badge/Audit_Score-92%25-brightgreen?style=flat-square)
![Architecture](https://img.shields.io/badge/Architecture-FROZEN-orange?style=flat-square)

Plataforma de tokenización de activos industriales (maquinaria pesada, equipos mineros, grúas) como NFTs en Base L2. Los tokens representan **registros digitales estructurados** de activos físicos — no títulos de propiedad ni instrumentos financieros.

---

## 🎯 El Problema que Resolvemos

### **Barreras Tradicionales en Inversión Industrial**

Los activos industriales de alto valor (maquinaria pesada, equipos mineros, grúas industriales) representan oportunidades de inversión sólidas, pero enfrentan barreras críticas:

| 🚧 Problema | 💡 Solución Bashood |
|-------------|---------------------|
| **Acceso limitado** - $100k-$500k por equipo, fuera del alcance de la mayoría | **Registro accesible** - Participación desde $100 (modelo económico específico definido por el emisor) |
| **Liquidez Nula** - Revender equipos toma meses, mercados fragmentados | **Mercado 24/7** - Trading instantáneo en exchanges descentralizados |
| **Opacidad** - Documentación en papel, difícil verificar estado e historial | **Transparencia** - Registro inmutable on-chain, trazabilidad completa |
| **Costos Intermediarios** - Brokers cobran 10-15% en comisiones | **Directo** - Smart contracts eliminan intermediarios |
| **Acceso Geográfico** - Limitado a participantes locales | **Global** - Acceso desde cualquier wallet compatible |

### **Nuestra Solución: Registro Digital Estructurado de Activos Industriales**

Bashood combina **activos físicos reales** con **tecnología blockchain** para crear un registro verificable, transparente y accesible:

```
Activo Físico → Registro NFT (BASHOOD-RWA-1) → Smart Contract → Participantes Globales
   ($250k)          (ERC-721, 1 token)         (ETH/BHT)      (acceso desde $100)
```

> ⚖️ **Definición oficial del token (v1.0, marco UE/MiCA):** Cada token BASHOOD-RWA-1 es un **registro digital estructurado** de un activo industrial físico. No representa título de propiedad, derecho contractual ni rendimiento distribuible sobre el activo. No está diseñado como instrumento financiero en el sentido de MiCA (Reglamento UE 2023/1114) o MiFID II. Cualquier vínculo jurídico entre el token y el activo off-chain, así como la clasificación regulatoria de cada emisión, es responsabilidad exclusiva del emisor. Ver [BASHOOD-RWA-1-SPECIFICATION.md](docs/BASHOOD-RWA-1-SPECIFICATION.md) y [IBashoodRWA.sol](contracts/standards/IBashoodRWA.sol).

**Estado**: 🔜 Pendiente deployment en Base Sepolia (audit externo previo requerido)
**Tests Hardhat**: 1277 passing, 0 failing ✅
**Tests Foundry**: 117 passing, 0 failed — 10 suites, 10k fuzz runs ✅
**BashoodPresaleFinal bytecode**: 17.23 KB (margen: 7.35 KB vs límite 24 KB) ✅
**Audit Score**: 92% (36 PASS / 3 WARN / 0 FAIL) — tag v0.4-audit-stable ✅
**Seguridad**: C-005/C-006/C-004 resueltos. 9 riesgos documentados (KR-001..KR-009) ✅
**Arquitectura**: BashoodPresaleFinal FROZEN — sin nueva lógica de negocio ✅
**Última actualización**: 28 marzo 2026

---

## 🏗️ Arquitectura

### **Stack Tecnológico**

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE PRESENTACIÓN                     │
│  Frontend (Web3) → Wallet (MetaMask/Coinbase) → Base RPC    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE SMART CONTRACTS                     │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ BashoodPresale   │←→│ BashoodMultiToken│ (NFTs)         │
│  │  - ETH payments  │  │  - ERC1155       │                │
│  │  - BHT payments  │  │  - Industrial    │                │
│  │  - Whitelist     │  │    Assets        │                │
│  │  - Referrals     │  └──────────────────┘                │
│  └──────────────────┘           ↑                           │
│          ↓                      │                           │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  BashoodToken    │  │ ChainlinkOracle  │                │
│  │  - ERC20 (BHT)   │  │  - ETH/USD       │                │
│  │  - Burn mech.    │  │  - Staleness     │                │
│  └──────────────────┘  └──────────────────┘                │
│          ↓                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ BashoodReferral  │  │  BashoodRescue   │                │
│  │  - Rewards       │  │  - Emergency     │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      BASE L2 BLOCKCHAIN                      │
│  - Gas fees ~$0.01 (95% cheaper than Ethereum L1)          │
│  - 2 second blocks, instant finality                        │
│  - EVM compatible, Solidity 0.8.28                          │
└─────────────────────────────────────────────────────────────┘
```

### **Contratos Principales**

| Contrato | Bytecode | Responsabilidad |
|---|---|---|
| `BashoodPresaleFinal.sol` | **17.23 KB** — FROZEN | Orquestador de presale (ETH + BHT, oracle, referidos, rescue) |
| `BashoodRWAReference.sol` | 23.14 KB | ERC-721 RWA core con sistema de módulos |
| `BashoodGovernor.sol` | 16.63 KB | Governance on-chain |
| `BashoodMultiToken.sol` | 7.50 KB | NFTs ERC-1155 (activos industriales) |
| `BashoodToken.sol` | 6.05 KB | Token ERC-20 de utilidad (BHT) con burn |
| `BashoodTimelock.sol` | 6.21 KB | Timelock para operaciones admin críticas |
| `BashoodRescue.sol` | 5.08 KB | Mecanismos de rescate y emergencia |
| `BashoodReferral.sol` | 2.79 KB | Sistema de referidos |

### **Módulos RWA (contracts/modules/)**

Contratos independientes invocados por `BashoodRWAReference` mediante interfaz. Nunca desde `BashoodPresaleFinal`.

| Módulo | Bytecode | Responsabilidad |
|---|---|---|
| `MaintenanceHistoryModule.sol` | 6.09 KB | Historial de mantenimiento por token (per-token auth + rate-limit) |
| `LifecycleEventsModule.sol` | 5.53 KB | Eventos de ciclo de vida por token |
| `InspectionModule.sol` | 5.52 KB | Historial de inspección por token (per-token auth + rate-limit) |
| `InsuranceModule.sol` | 4.34 KB | Póliza de seguro vigente por token |
| `CertificationModule.sol` | 3.63 KB | Estado de compliance y certificaciones |
| `OracleValuationModule.sol` | 3.57 KB | Valor de mercado vía Chainlink (único con `ASSET_MANAGER_ROLE`) |
| `FeeDiscountModule.sol` | 2.23 KB | Descuentos de fees |

> **Regla arquitectónica:** `BashoodPresaleFinal` está cerrado para nueva lógica de negocio. Ver [ARCHITECTURE.md](ARCHITECTURE.md).

---

### **Modelo de Tokens — ERC-1155 (Presale) vs ERC-721 (RWA)**

> ⚠️ El protocolo utiliza **dos estándares de token distintos con propósitos ortogonales**. No existe ni existirá conversión automática entre ellos.

| | `BashoodMultiToken` (ERC-1155) | `BashoodRWAReference` (ERC-721) |
|---|---|---|
| **Estándar** | ERC-1155 semi-fungible | ERC-721 no fungible |
| **Propósito** | Token de participación en presale | Registro digital estructurado de un activo industrial real |
| **Quién lo minta** | `BashoodPresaleFinal` (MINTER_ROLE) al comprar | `ASSET_MANAGER_ROLE` contra un activo físico verificado |
| **Cantidad total** | Fija: 30 NFTs (BASHOOD_NFT, tokenId=2) | Ilimitada: 1 token por activo individual registrado |
| **Valor referenciado** | Precio de presale en ETH/BHT | Valoración de mercado del activo vía Chainlink oracle |
| **Derechos que representa** | Los que el emisor defina off-chain en los T&C de la presale | Registro inmutable de identificación, specs y valor del activo |
| **Transferible** | ✅ Sí (ERC-1155 `safeTransferFrom`) | ✅ Sí (ERC-721 `transferFrom`) |
| **Convertible en el otro** | ❌ No — no hay mecanismo de redención on-chain | ❌ No — independiente de presale |

> Los ERC-1155 de presale y los ERC-721 RWA son tokens con ciclos de vida **completamente independientes**. Que un usuario haya comprado en la presale no le confiere automáticamente ningún derecho sobre ningún activo registrado en `BashoodRWAReference`. Cualquier vínculo entre ambos es responsabilidad contractual off-chain del emisor.

---

### **Flujo de Compra de NFT**

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐     ┌─────────┐
│ Usuario  │────→│ Presale       │────→│ Oracle       │────→│ Mint    │
│          │     │ - Validate    │     │ - Get Price  │     │ NFT     │
│ ETH/BHT  │     │ - Check limit │     │ - Validate   │     │ ERC1155 │
└──────────┘     └───────────────┘     └──────────────┘     └─────────┘
                         │                                        │
                         ↓                                        ↓
                 ┌───────────────┐                        ┌──────────┐
                 │ Referral      │                        │ Transfer │
                 │ - Reward      │                        │ to User  │
                 └───────────────┘                        └──────────┘
```

---

## ⚙️ Características Técnicas

### **1. Sistema de Pagos Híbrido**

```solidity
// Compra con ETH nativo
function purchaseWithETH(uint256 nftId, uint256 quantity) external payable {
    // Oracle: Obtener precio en tiempo real
    uint256 ethPrice = oracle.getLatestPrice();
    
    // Validar: Anti-whale limits
    require(userPurchases[msg.sender] + quantity <= maxPerUser);
    
    // Distribuir: 90% project, 10% operations
    _distributePayments(msg.value);
    
    // Mint: NFT al comprador
    nft.mint(msg.sender, nftId, quantity);
}

// Compra con BHT token (con descuento)
function purchaseWithBHT(uint256 nftId, uint256 quantity) external {
    // Descuento: 15% off con BHT
    uint256 bhtAmount = _calculateBHTAmount(nftId, quantity);
    
    // Burn: 10% del BHT se quema (deflacionario)
    token.burnFrom(msg.sender, burnAmount);
    
    // Transfer: 90% a tesorería
    token.transferFrom(msg.sender, treasury, remainingAmount);
    
    // Mint: NFT al comprador
    nft.mint(msg.sender, nftId, quantity);
}
```

### **2. Sistema de Referidos**

- ✅ Recompensas automáticas: 5% en BHT tokens
- ✅ Multinivel: Hasta 3 niveles de profundidad
- ✅ Validación KYC: Solo referrers verificados
- ✅ Anti-abuse: Rate limits y cooldowns

### **3. Oráculo Chainlink Robusto**

```solidity
// Único punto de validación oracle — _bhtFromFiat() y _calculateBhtAmounts() delegan aquí
function _getOracleData() internal view returns (int256 answer, uint8 decimals_) {
    require(maxPriceStaleness > 0, "Staleness req");
    require(address(priceFeed) != address(0), "PriceFeed req");
    (uint80 roundId, int256 _answer, , uint256 updatedAt, uint80 answeredInRound) =
        priceFeed.latestRoundData();
    require(_answer > 0, "Invalid price");
    require(updatedAt > 0, "Price too stale");
    require(block.timestamp - updatedAt <= maxPriceStaleness, "Price too stale");
    require(answeredInRound >= roundId, "Incomplete round"); // evita datos de ronda incompleta
    return (_answer, priceFeed.decimals());
}
```

### **4. Seguridad Multi-Capa**

| Capa | Mecanismo | Implementación |
|------|-----------|----------------|
| 🛡️ **Reentrancy** | Guards en todas las funciones públicas | `nonReentrant` modifier |
| 🔐 **Access Control** | Sistema de roles granular | `ADMIN_ROLE`, `EMERGENCY_ROLE`, `WHITELIST_ROLE` |
| ⏸️ **Pause** | Emergency stop | `Pausable` de OpenZeppelin |
| 🚫 **Whitelist** | KYC/AML configurable | `WHITELIST_ROLE` vía AccessControl |
| 🐋 **Anti-Whale** | Límites por usuario | `maxPerUser` configurable |
| 📊 **Oracle** | Validación precio/staleness | 3 checks redundantes |
| 💸 **Rescue** | Fondos atrapados | `BashoodRescue` contract |

---

## 🚀 Quick Start

### **Opción 1: Instalación desde Cero**

```bash
# 1. Clonar repositorio
git clone https://github.com/bashood/bashood-hardhat-tests.git
cd bashood-hardhat-tests

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
code .env  # Editar con tus valores

# 4. Compilar contratos
npx hardhat compile

# 5. Ejecutar tests
npm test

# 6. Ver coverage
npm run coverage
```

### **Opción 2: Deployment en Base Testnet**

```bash
# 1. Configurar entorno (.env)
BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here
OWNER_ADDRESS=0x...
PROJECT_WALLET=0x...
BASESCAN_API_KEY=your_api_key_here

# 2. Obtener testnet ETH
# Visita: https://www.base.org/docs/using-base/quickstart#faucet

# 3. Validar configuración
npx hardhat run scripts/validate-base-config.js --network base-sepolia

# 4. Deploy contratos
npx hardhat run scripts/deploy-base.js --network base-sepolia
# Output: deployment-base-sepolia-{timestamp}.json

# 5. Configurar seguridad (CRÍTICO)
PRESALE_ADDRESS=0x... npx hardhat run scripts/configure-presale-security.js --network base-sepolia

# 6. Verificar en Basescan
npx hardhat verify --network base-sepolia 0xPRESALE_ADDRESS

# 7. Monitorear estado
npx hardhat run scripts/presale-status.js --network base-sepolia deployment-*.json
```

**⏱️ Tiempo total**: ~15 minutos  
**💰 Costo estimado**: ~$7.50 USD (gas en Base Sepolia es gratis)

**Ver guía completa**: [BASE_INTEGRATION_README.md](BASE_INTEGRATION_README.md)

---

## 🧪 Testing & Calidad de Código

### **Suite de Tests Completa**

```bash
# Tests unitarios (1277 Hardhat + 117 Foundry)
npx hardhat test                  # Todos los tests Hardhat
forge test --fuzz-runs 10000      # Todos los tests Foundry con fuzzing
npm test -- test/BashoodPresaleFinal.test.cjs  # Test específico Hardhat

# Coverage detallado
npm run coverage                  # Genera reporte HTML en coverage/

# Tests de seguridad
npm run security:slither          # Análisis estático
npm run forge:fuzz                # Fuzzing con Foundry
npm run echidna:presale           # Property-based testing
```

### **Métricas de Calidad**

| Métrica | Valor | Estado |
|---|---|---|
| **Tests Hardhat** | 1277 passing, 0 failing | ✅ |
| **Tests Foundry** | 117 passing, 0 failed (10k fuzz) | ✅ |
| **BashoodPresaleFinal bytecode** | 17.23 KB (margen 7.35 KB) | ✅ |
| **Audit pipeline** | 92% score — 36 PASS / 3 WARN / 0 FAIL (v0.4-audit-stable) | ✅ |
| **Vulnerabilidades críticas** | C-005/C-006 resueltos, 9 riesgos conocidos documentados | ✅ |
| **Arquitectura** | FROZEN — sin nueva lógica en contrato principal | ✅ |

### **Análisis de Seguridad**

```bash
# Slither (análisis estático)
npm run security:slither
# Output: slither-report-final-2025-12-10.json

# Foundry Fuzzing (10,000 runs)
forge test --match-test testFuzz -vvv --runs 10000

# Echidna (property testing)
echidna test/echidna/BashoodEchidna.sol --contract BashoodTokenEchidnaTest
```

**Reportes disponibles**:
- 📄 [SECURITY-README.md](SECURITY-README.md) - Framework de seguridad
- 📊 [COVERAGE_REPORT.md](COVERAGE_REPORT.md) - Análisis de cobertura
- 🔍 [SLITHER_SECURITY_REPORT_2025-12-03.md](SLITHER_SECURITY_REPORT_2025-12-03.md) - Audit Slither

---

## 📦 Contratos del Ecosistema

### **Core Contracts**

| Contrato | Bytecode | Descripción |
|---|---|---|
| [`BashoodPresaleFinal.sol`](contracts/BashoodPresaleFinal.sol) | 17.23 KB — **FROZEN** | Orquestador de presale con pagos ETH/BHT, oracle, referidos, rescue |
| [`BashoodRWAReference.sol`](contracts/BashoodRWAReference.sol) | 23.14 KB | ERC-721 RWA core con sistema de módulos |
| [`BashoodToken.sol`](contracts/BashoodToken.sol) | 6.05 KB | Token ERC-20 de utilidad (BHT) con burn |
| [`BashoodMultiToken.sol`](contracts/BashoodMultiToken.sol) | 7.50 KB | NFTs ERC-1155 representando activos industriales |
| [`BashoodReferral.sol`](contracts/BashoodReferral.sol) | 2.79 KB | Sistema de referidos |
| [`BashoodRescue.sol`](contracts/BashoodRescue.sol) | 5.08 KB | Mecanismos de rescate y emergencia |

### **Oracle & Helpers**

| Contrato | Descripción |
|---|---|
| [`AggregatorV3Interface.sol`](contracts/AggregatorV3Interface.sol) | Interfaz Chainlink ETH/USD |
| [`BashoodPropertyNFT.sol`](contracts/BashoodPropertyNFT.sol) | NFT ERC-721 para propiedades inmobiliarias |

### **Protocolo RWA — Módulos Externos (Plan M4-F3)**

| Módulo | Rol en Core | Responsabilidad única |
|--------|-------------|----------------------|
| [`OracleValuationModule`](contracts/modules/OracleValuationModule.sol) | `ASSET_MANAGER_ROLE` | Actualizador canónico del valor de mercado vía Chainlink |
| [`CertificationModule`](contracts/modules/CertificationModule.sol) | `bytes32(0)` (read-only) | Estado de compliance vigente (certType bytes32, n certs/token) |
| [`InsuranceModule`](contracts/modules/InsuranceModule.sol) | `bytes32(0)` (read-only) | Póliza de seguro vigente (1 póliza activa por token) |

---

## 📊 Modelo de Verdad del Protocolo RWA

> **Regla crítica para integradores y auditores externos:**
> Hay tres fuentes de verdad diferentes según lo que se consulte.

### Verdad Económica (valor de mercado)

```
Fuente autoritativa: Core.getFinancialData(tokenId).currentValue

Actualizador autorizado en producción:
  OracleValuationModule.pushValuation(tokenId)
  → Lee feed Chainlink configurado en Core.getTelemetryConfig(tokenId).oracleAddress
  → Normaliza a 1e18
  → Escribe Core.updateAssetValue(tokenId, value, "ORACLE_REVALUATION")

PROHIBIDO en producción:
  Core.updateAssetValue() llamado directamente por EOA o contrato arbitrario.
  Solo se permite en emergencia documentada con reason = "ADMIN_APPRAISAL".
```

### Verdad de Compliance (certificaciones)

```
Core.getCertificationData(tokenId)
  → Flags booleanos establecidos en el MINT del activo (inmutables)
  → ceMark, ul3401, iso9001, iso14001, ibcCompliant, oshaCompliant
  → Nunca se actualiza tras el mint

CertificationModule.getCertification(tokenId, certType)
CertificationModule.isCompliant(tokenId, [certType, ...])
  → Estado de compliance VIGENTE y auditable
  → certType = keccak256("CE_MARK") | keccak256("ISO_9001") | ...
  → Fuente autoritativa para due-diligence on-chain
```

### Verdad de Seguro (póliza activa)

```
Core.getInsuranceData(tokenId)
  → Datos de seguro establecidos en el MINT del activo (inmutables)
  → Nunca se actualiza tras el mint

InsuranceModule.getPolicy(tokenId)
InsuranceModule.isInsured(tokenId)
  → Póliza VIGENTE y auditable
  → policyId = keccak256(policyNumber)
  → Fuente autoritativa para cobertura actual
```

### Resumen para auditores

| ¿Qué quiero saber? | Fuente correcta | NUNCA usar |
|---|---|---|
| Valor de mercado actual | `Core.currentValue` (vía `getFinancialData`) | Calcular fuera del Core |
| ¿Está certificado hoy? | `CertificationModule.isCompliant()` | `Core.getCertificationData()` |
| ¿Está asegurado hoy? | `InsuranceModule.isInsured()` | `Core.getInsuranceData()` |
| Historial de valor | Eventos `AssetValueUpdated` (on-chain log) | Storage directamente |

---

```solidity
interface IBashoodRescue {
    function rescueUnsoldNFTs(address nft, uint256 id, address to, uint256 amount) external;
    function rescueERC20(address token, address to, uint256 amount) external;
    function emergencyWithdrawETH() external;
}

interface IAggregatorV3 {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}
```

---

## 💰 Economía del Token (BHT)

### **Tokenomics**

```
Total Supply: 1,000,000,000 BHT
├─ 40% (400M) - Presale pública
├─ 25% (250M) - Equipo y desarrollo (2 años vesting)
├─ 20% (200M) - Liquidez DEX
├─ 10% (100M) - Marketing y partnerships
└─  5% ( 50M) - Reserva de seguridad
```

### **Mecanismos Deflacionarios**

| Acción | Burn Rate | Impacto |
|--------|-----------|---------|
| **Compra con BHT** | 10% quemado | Reduce supply gradualmente |
| **Transferencias** | 0.5% quemado | Incentiva holding |
| **Pagos de servicios** | 15% quemado | Deflación agresiva |

### **Utilidad del Token**

✅ **Descuento en presale**: 15% off al pagar con BHT  
✅ **Governance**: Votación en decisiones del proyecto  
✅ **Staking**: Recompensas por lockear BHT  
✅ **Acceso premium**: Features exclusivos en plataforma  
✅ **Referidos**: Pago de comisiones en BHT  

---
---

## 📚 Documentación Completa

### **Para Desarrolladores**

| Documento | Descripción |
|-----------|-------------|
| 📘 [BASE_INTEGRATION_README.md](BASE_INTEGRATION_README.md) | Guía completa de deployment en Base |
| 🔐 [CONFIGURE_SECURITY_README.md](scripts/CONFIGURE_SECURITY_README.md) | Configuración de seguridad post-deployment |
| 🛡️ [SECURITY-README.md](SECURITY-README.md) | Framework de seguridad multi-capa |
| 📊 [COVERAGE_REPORT.md](COVERAGE_REPORT.md) | Análisis detallado de cobertura de tests |
| 🔍 [SLITHER_SECURITY_REPORT.md](SLITHER_SECURITY_REPORT_2025-12-03.md) | Audit estático con Slither |

### **Para Operaciones**

| Documento | Descripción |
|-----------|-------------|
| ✅ [MAINNET_DEPLOYMENT_CHECKLIST.md](MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md) | Checklist completo para mainnet |
| 🚨 [INCIDENT_REPORT.md](INCIDENT_REPORT.md) | Template para reportar incidentes |
| 📈 [PRODUCTION_REVIEW.md](PRODUCTION_REVIEW_DETAILED.md) | Revisión de producción detallada |
| 🔄 [DEPLOY.md](DEPLOY.md) | Proceso de deployment paso a paso |

### **Arquitectura y Diseño**

```
docs/
├─ architecture/
│  ├─ system-design.md          # Diseño general del sistema
│  ├─ smart-contract-flow.md    # Flujos de interacción
│  └─ security-model.md         # Modelo de seguridad
├─ api/
│  ├─ presale-api.md            # API del contrato de presale
│  ├─ token-api.md              # API del token BHT
│  └─ nft-api.md                # API de NFTs
└─ guides/
   ├─ user-guide.md             # Guía para usuarios finales
   ├─ integration-guide.md      # Guía para integradores
   └─ troubleshooting.md        # Solución de problemas comunes
```

---

## 🌍 Redes Soportadas

| Red | Chain ID | RPC | Explorer | Estado |
|-----|----------|-----|----------|--------|
| **Base Sepolia** (Testnet) | 84532 | `https://sepolia.base.org` | [BaseScan Sepolia](https://sepolia.basescan.org/) | ✅ Activo |
| **Base Mainnet** | 8453 | `https://mainnet.base.org` | [BaseScan](https://basescan.org/) | 🔜 Próximo |
| **Hardhat Local** | 31337 | `http://127.0.0.1:8545` | - | ✅ Development |

### **Costos Comparativos**

| Operación | Base L2 | Ethereum L1 | Ahorro |
|-----------|---------|-------------|--------|
| Deploy completo | ~$7.50 | ~$1,500 | **99.5%** |
| Compra NFT (ETH) | ~$0.36 | ~$75 | **99.5%** |
| Compra NFT (BHT) | ~$0.45 | ~$90 | **99.5%** |
| Transfer NFT | ~$0.12 | ~$25 | **99.5%** |

**Base L2 es ~200x más barato que Ethereum L1**

---

## 🛠️ Scripts Disponibles

### **Development**

```bash
npm test                    # Ejecutar todos los tests
npm run coverage            # Generar reporte de coverage
npm run compile             # Compilar contratos
```

### **Deployment**

```bash
npm run deploy:sepolia      # Deploy en Base Sepolia
npm run deploy:mainnet      # Deploy en Base Mainnet
npm run verify:contracts    # Verificar en Basescan
```

### **Seguridad**

```bash
npm run security:slither    # Análisis Slither
npm run security:all        # Suite completa de seguridad
npm run forge:fuzz          # Fuzzing con Foundry
npm run echidna:presale     # Property testing
```

### **Utilidades**

```bash
npm run presale:status      # Ver estado de presale
npm run validate:config     # Validar configuración
npm run generate:report     # Generar reporte de seguridad
```

---

## 🗺️ Roadmap

### **Q1 2026** ✅ Completado
- ✅ Smart contracts core + módulos RWA (8 módulos)
- ✅ 1277 tests Hardhat + 117 Foundry (10k fuzz runs)
- ✅ Hallazgos H-01/H-02/H-03 resueltos
- ✅ Rate-limiting y scope per-token en módulos RWA
- ✅ Consolidación oracle en `_getOracleData()` — eliminación duplicación
- ✅ Arquitectura BashoodPresaleFinal FROZEN + ARCHITECTURE.md
- ✅ Governance: BashoodTimelock + BashoodGovernor on-chain + Gnosis Safe 3-of-5
- ✅ Pipeline de audit profesional: 7 tareas modulares (gas, coverage, slither, regulatory, custom, known-risks, report)
- ✅ Fixes de seguridad: C-005 SafeERC20, C-006 abi.encode, C-004 guard overflow
- ✅ 9 riesgos conocidos documentados (KR-001..KR-009) — tag: **v0.4-audit-stable** (92%)

### **Q2 2026** ⏳ En curso
- ⏳ Audit externo (ConsenSys Diligence / OpenZeppelin / Spearbit)
- ⏳ Deployment en Base Sepolia (post-audit externo)
- ⏳ Frontend web3 (Vite + React + wagmi v2)
- ⏳ Activación presale en mainnet

### **Q3 2026** 📋 Planificado
- ⏳ Deployment en Base Mainnet
- ⏳ Listado en DEXs (Uniswap, Aerodrome)
- ⏳ Tokenización de primeros 10 activos reales
- ⏳ Integración con custodios físicos
- ⏳ Dashboard de analytics

### **Q4 2026** 🚀 Futuro
- 💡 Marketplace secundario de NFTs
- 💡 Staking de BHT con rewards
- 💡 Governance descentralizada (DAO)
- 💡 Expansión a otras cadenas (Arbitrum, Optimism)
- 💡 Bridge cross-chain

---

## 🐛 Troubleshooting

### **Errores Comunes**

<details>
<summary><b>Error: "insufficient funds for gas"</b></summary>

**Solución**:  
1. Verifica que tengas ETH en tu wallet para pagar gas
2. En testnet, obtén ETH gratis: https://www.base.org/docs/using-base/quickstart#faucet
3. Verifica el balance: `cast balance 0xYOUR_ADDRESS --rpc-url $BASE_SEPOLIA_RPC`

</details>

<details>
<summary><b>Error: "invalid private key format"</b></summary>

**Solución**:  
1. Verifica que tu `.env` tenga el formato correcto:
   ```
   BASE_SEPOLIA_PRIVATE_KEY=0x1234...  # CON 0x
   # o
   BASE_SEPOLIA_PRIVATE_KEY=1234...    # SIN 0x
   ```
2. NO incluyas espacios ni comillas
3. La key debe tener 64 caracteres hexadecimales

</details>

<details>
<summary><b>Error: "contract size exceeds 24576 bytes"</b></summary>

**Solución**:  
1. El optimizer ya está habilitado en `hardhat.config.js`
2. Verifica que estés compilando con `npx hardhat compile --force`
3. Si persiste, revisa [CONTRACT_SIZE_OPTIMIZATION.md](CONTRACT_SIZE_OPTIMIZATION.md)

</details>

<details>
<summary><b>Tests failing con "Oracle price stale"</b></summary>

**Solución**:  
1. Verifica que el mock oracle esté configurado correctamente
2. En tests, usa `await time.increase(3600)` antes de llamadas que requieren oracle
3. Revisa `maxPriceStaleness` en el contrato (default: 1 hora)

</details>

### **Debugging Avanzado**

```bash
# Ver gas usado por función
npx hardhat test --trace

# Debug paso a paso
npx hardhat test --logs

# Ver storage slots
npx hardhat flatten contracts/BashoodPresaleFinal.sol

# Analizar bytecode
npx hardhat verify --list-networks
```

**Más ayuda**: Abre un [Issue en GitHub](https://github.com/bashood/bashood-hardhat-tests/issues)

---

## 📞 Recursos y Comunidad

### **Documentación Oficial**

- 📘 [Base Documentation](https://docs.base.org/)
- 🔗 [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds)
- 🛠️ [Hardhat Docs](https://hardhat.org/docs)
- 🦄 [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### **Explorers**

- 🔍 [Base Sepolia Explorer](https://sepolia.basescan.org/)
- 🔍 [Base Mainnet Explorer](https://basescan.org/)

### **Faucets**

- 🚰 [Base Sepolia Faucet](https://www.base.org/docs/using-base/quickstart#faucet)
- 🚰 [Chainlink Faucet](https://faucets.chain.link/base-sepolia)

### **Comunidad**

- 💬 [Discord Base](https://discord.gg/buildonbase)
- 🐦 [Twitter @BuildOnBase](https://twitter.com/buildonbase)
- 📧 Email: contact@bashood.com
- 🌐 Website: https://bashood.com (próximamente)

---

## 🤝 Contribuir

¿Quieres contribuir al proyecto? ¡Genial! Sigue estos pasos:

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### **Guías de Contribución**

- ✅ Sigue el style guide de Solidity
- ✅ Agrega tests para nuevo código
- ✅ Documenta funciones públicas con NatSpec
- ✅ Mantén coverage >70%
- ✅ Pasa los checks de Slither

---

## ⚠️ Disclaimer & Notas Legales

### **Seguridad**

🔴 **NUNCA** commitear archivos `.env` con private keys  
🟡 **SIEMPRE** testear exhaustivamente en testnet antes de mainnet  
🟢 **GUARDAR** deployment JSONs y addresses en lugar seguro  
🔵 **CONFIGURAR** seguridad (roles, pausable, rescue) antes de activar presale  

### **Riesgo**

⚠️ Los smart contracts son **experimentales** y pueden contener vulnerabilidades  
⚠️ Invertir en criptomonedas conlleva **alto riesgo** de pérdida de capital  
⚠️ No garantizamos rentabilidad ni protección contra volatilidad  
⚠️ DYOR (Do Your Own Research) antes de invertir  

### **Auditoría**

✅ Análisis estático con Slither (0 vulnerabilidades críticas)  
✅ Property testing con Echidna  
✅ Fuzzing con Foundry (10,000 runs)  
⏳ Auditoría externa pendiente (CertiK/OpenZeppelin)  

**Este software se proporciona "TAL CUAL" sin garantías de ningún tipo.**

---

## 📜 Licencia

Este proyecto está licenciado bajo **MIT License**.

```
MIT License

Copyright (c) 2026 Bashood

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[...]
```

Ver [LICENSE](LICENSE) para el texto completo.

---

<div align="center">

## 🏗️ **Bashood - Democratizando Activos Industriales** 🏗️

**Construido con ❤️ sobre Base L2**

[![Base](https://img.shields.io/badge/Built_on-Base-0052FF?style=for-the-badge)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.0-FFF04D?style=for-the-badge)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.4.0-4E5EE4?style=for-the-badge)](https://openzeppelin.com/)

[⭐ Star en GitHub](https://github.com/bashood/bashood-hardhat-tests) • [🐛 Reportar Bug](https://github.com/bashood/bashood-hardhat-tests/issues) • [💡 Sugerir Feature](https://github.com/bashood/bashood-hardhat-tests/issues/new)

</div>


