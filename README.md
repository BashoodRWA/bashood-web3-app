# 🏗️ Bashood - Industrial Asset Tokenization Platform

<div align="center">

![Bashood Logo](https://img.shields.io/badge/Bashood-Industrial_Tokenization-blue?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity)
![Base](https://img.shields.io/badge/Base-Blockchain-0052FF?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-442_passing-success?style=for-the-badge)
![Coverage](https://img.shields.io/badge/Coverage-70.75%25-yellow?style=for-the-badge)

**Democratizando el acceso a activos industriales de alto valor mediante tokenización en Base L2**

[🚀 Quick Start](#-quick-start) • [📖 Documentación](#-documentación) • [🏗️ Arquitectura](#️-arquitectura) • [🔒 Seguridad](#-seguridad)

</div>

---

## 🎯 El Problema que Resolvemos

### **Barreras Tradicionales en Inversión Industrial**

Los activos industriales de alto valor (maquinaria pesada, equipos mineros, grúas industriales) representan oportunidades de inversión sólidas, pero enfrentan barreras críticas:

| 🚧 Problema | 💡 Solución Bashood |
|-------------|---------------------|
| **Capital Alto** - $100k-$500k por equipo, inaccesible para inversores retail | **Fraccionamiento** - NFTs permiten inversión desde $100 |
| **Liquidez Nula** - Revender equipos toma meses, mercados fragmentados | **Mercado 24/7** - Trading instantáneo en exchanges descentralizados |
| **Opacidad** - Documentación en papel, difícil verificar propiedad/historial | **Transparencia** - Registro inmutable on-chain, trazabilidad completa |
| **Costos Intermediarios** - Brokers cobran 10-15% en comisiones | **Directo** - Smart contracts eliminan intermediarios |
| **Acceso Geográfico** - Limitado a inversores locales | **Global** - Acceso desde cualquier wallet compatible |

### **Nuestra Solución: Tokenización Híbrida Multi-Capa**

Bashood combina **activos físicos reales** con **tecnología blockchain** para crear un mercado eficiente, transparente y accesible:

```
Activo Físico → NFT ERC1155 → Presale Smart Contract → Inversores Globales
   ($250k)         (1 NFT)     (ETH/BHT payments)      (desde $100)
```

**Estado**: ✅ Listo para deployment en Base Sepolia  
**Tests**: 442/446 passing (99.1%) ✅  
**Coverage**: 70.75% branches, 97.3% statements, 100% functions  
**Seguridad**: 0 vulnerabilidades críticas (Slither audited)  
**Última actualización**: 15 Enero 2026

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

| Contrato | Responsabilidad | Tamaño | LOC |
|----------|----------------|--------|-----|
| 🏛️ **BashoodPresaleFinal** | Core del sistema de presale | 16.9 KB | 735 |
| 💰 **BashoodToken (BHT)** | Token de utilidad ERC20 | Optimizado | 280 |
| 🎨 **BashoodMultiToken** | NFTs de activos (ERC1155) | Optimizado | 450 |
| 🤝 **BashoodReferral** | Sistema de referidos | Ligero | 180 |
| 🚨 **BashoodRescue** | Mecanismos de emergencia | Seguro | 220 |
| 📊 **ChainlinkPriceFeed** | Oracle de precios | Confiable | 95 |

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
function _getFreshPrice() internal view returns (uint256) {
    (uint80 roundId, int256 answer, , uint256 updatedAt, ) = 
        priceFeed.latestRoundData();
    
    // Validación 1: Precio positivo
    require(answer > 0, "Invalid price");
    
    // Validación 2: No stale (máx 1 hora)
    require(block.timestamp - updatedAt <= maxPriceStaleness);
    
    // Validación 3: RoundId secuencial (evita manipulación)
    require(roundId > lastRoundId);
    
    return uint256(answer);
}
```

### **4. Seguridad Multi-Capa**

| Capa | Mecanismo | Implementación |
|------|-----------|----------------|
| 🛡️ **Reentrancy** | Guards en todas las funciones públicas | `nonReentrant` modifier |
| 🔐 **Access Control** | Sistema de roles granular | `ADMIN_ROLE`, `OPERATOR_ROLE`, `EMERGENCY_ROLE` |
| ⏸️ **Pause** | Emergency stop | `Pausable` de OpenZeppelin |
| 🚫 **Whitelist** | KYC/AML compliance | Merkle tree signatures |
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
# Tests unitarios (442 passing)
npm test                          # Todos los tests
npm test -- test/BashoodPresaleFinal.test.cjs  # Test específico

# Coverage detallado
npm run coverage                  # Genera reporte HTML en coverage/

# Tests de seguridad
npm run security:slither          # Análisis estático
npm run forge:fuzz                # Fuzzing con Foundry
npm run echidna:presale           # Property-based testing
```

### **Métricas de Calidad**

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Tests Passing** | 442/446 (99.1%) | ✅ Excelente |
| **Branch Coverage** | 70.75% | ✅ Bueno |
| **Statement Coverage** | 97.3% | ✅ Excelente |
| **Function Coverage** | 100% | ✅ Perfecto |
| **Vulnerabilidades Críticas** | 0 | ✅ Seguro |
| **Gas Optimization** | Custom errors, struct packing | ✅ Optimizado |

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

| Contrato | Descripción | Tamaño | Audit |
|----------|-------------|--------|-------|
| [`BashoodPresaleFinal.sol`](contracts/BashoodPresaleFinal.sol) | Sistema principal de presale con pagos ETH/BHT | 16.9 KB | ✅ |
| [`BashoodToken.sol`](contracts/BashoodToken.sol) | Token ERC20 de utilidad (BHT) con burn | Optimizado | ✅ |
| [`BashoodMultiToken.sol`](contracts/BashoodMultiToken.sol) | NFTs ERC1155 representando activos industriales | Optimizado | ✅ |
| [`BashoodReferral.sol`](contracts/BashoodReferral.sol) | Sistema de referidos multinivel | Ligero | ✅ |
| [`BashoodRescue.sol`](contracts/BashoodRescue.sol) | Mecanismos de rescate y emergencia | Seguro | ✅ |

### **Oracle & Helpers**

| Contrato | Descripción |
|----------|-------------|
| [`ChainlinkPriceFeed.sol`](contracts/oracles/ChainlinkPriceFeed.sol) | Oracle Chainlink para ETH/USD con validaciones |
| [`BashoodPropertyNFT.sol`](contracts/BashoodPropertyNFT.sol) | NFT ERC721 para propiedades inmobiliarias |

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
- ✅ Desarrollo de smart contracts core
- ✅ Suite de tests (442 tests, 70.75% coverage)
- ✅ Auditoría de seguridad (Slither, Foundry, Echidna)
- ✅ Optimización de gas (custom errors, struct packing)
- ✅ Integración Chainlink oracle
- ✅ Sistema de referidos multinivel

### **Q2 2026** 🔄 En Progreso
- 🔄 Deployment en Base Sepolia testnet
- 🔄 Testing con usuarios beta (100 testers)
- 🔄 Integración frontend Web3
- 🔄 Documentación de API para integradores
- ⏳ Auditoría externa (CertiK/OpenZeppelin)

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

---

## 🧪 Testing & Seguridad

```bash
# Tests unitarios (323 tests)
npm test

# Coverage (67.41%)
npm run coverage

# Análisis estático de seguridad
npm run security:slither

# Tests de fuzzing
npm run forge:fuzz
```

**Ver documentación de seguridad**: [SECURITY-README.md](SECURITY-README.md)

---

## 📚 Documentación

### Deployment & Operaciones
- 📘 [BASE_INTEGRATION_README.md](BASE_INTEGRATION_README.md) - Guía de integración Base
- 🔐 [scripts/CONFIGURE_SECURITY_README.md](scripts/CONFIGURE_SECURITY_README.md) - Configuración de seguridad
- 📋 [MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md](MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md) - Checklist mainnet

### Seguridad & Análisis
- 🛡️ [SECURITY-README.md](SECURITY-README.md) - Framework de seguridad multi-capa
- 🔍 [ANALISIS_SEGURIDAD_EDGE_CASES.md](ANALISIS_SEGURIDAD_EDGE_CASES.md) - Análisis de edge cases
- 📊 [COVERAGE_REPORT.md](COVERAGE_REPORT.md) - Reporte de cobertura

### Testing & Desarrollo
- 🧪 [SESION_TESTS_2026-01-15_PART2.md](SESION_TESTS_2026-01-15_PART2.md) - Tests adicionales
- 📐 [CONTRACT_SIZE_OPTIMIZATION.md](CONTRACT_SIZE_OPTIMIZATION.md) - Optimización de tamaño

---

## ⚙️ Características

### Tokenización de Activos Industriales
- ✅ NFTs representan maquinaria real ($100k-$500k por unidad)
- ✅ Presale con pagos en ETH o BHT (token nativo)
- ✅ Sistema de referidos integrado
- ✅ Oracle Chainlink para precios en tiempo real
- ✅ Mecanismos de rescate y emergencia

### Seguridad
- ✅ Validaciones oracle (staleness, price limits)
- ✅ Whitelist KYC/AML configurable
- ✅ Límites anti-ballena (maxPerUser)
- ✅ Access control basado en roles
- ✅ Reentrancy guards
- ✅ Custom errors (optimización gas)

### Redes Soportadas
- 🔷 **Base Sepolia** (testnet) - Chain ID: 84532
- 🔷 **Base Mainnet** (producción) - Chain ID: 8453
- 🔧 **Hardhat Local** (desarrollo)

---

## 🔄 Workflow Completo de Deployment

### 1. Preparación (5 minutos)
```bash
cp .env.example .env
# Editar .env con:
# - BASE_SEPOLIA_PRIVATE_KEY
# - OWNER_ADDRESS
# - PROJECT_WALLET
# - BASESCAN_API_KEY
```

### 2. Validación (30 segundos)
```bash
npx hardhat run scripts/validate-base-config.js --network base-sepolia
```

### 3. Deploy (2-3 minutos)
```bash
npx hardhat run scripts/deploy-base.js --network base-sepolia
# Output: deployment-base-sepolia-{timestamp}.json
```

### 4. Configuración de Seguridad (2 minutos)
```bash
PRESALE_ADDRESS=0x... npx hardhat run scripts/configure-presale-security.js --network base-sepolia
```

### 5. Verificación (5 minutos)
```bash
npx hardhat verify --network base-sepolia 0xPRESALE_ADDRESS
```

### 6. Monitoreo
```bash
npx hardhat run scripts/presale-status.js --network base-sepolia deployment-*.json
```

**Tiempo total**: ~15 minutos

---

## 💰 Estimación de Costos (Base)

| Operación | Gas | ETH @ 1 gwei | USD @ $3000/ETH |
|-----------|-----|--------------|------------------|
| Deploy completo | ~2.5M | 0.0025 | $7.50 |
| Compra NFT (ETH) | ~120k | 0.00012 | $0.36 |
| Compra NFT (BHT) | ~150k | 0.00015 | $0.45 |
| Transferencia | ~40k | 0.00004 | $0.12 |

**Ahorro vs Ethereum L1**: ~95% en costos de gas

---

## 🐛 Troubleshooting

### Error: "insufficient funds"
🔧 Obtén testnet ETH: https://www.base.org/docs/using-base/quickstart#faucet

### Error: "invalid private key"
🔧 Verifica formato en .env (con o sin "0x")

### Error: "contract not verified"
🔧 Obtén BASESCAN_API_KEY: https://basescan.org/apis

**Más troubleshooting**: Ver [BASE_INTEGRATION_README.md#troubleshooting](BASE_INTEGRATION_README.md)

---

## 📊 Estado del Proyecto

```
✅ Contratos: 100% (16.9 KB, optimizado)
✅ Tests: 323/323 passing
✅ Coverage: 67.41% branch
✅ Seguridad: Slither 0 issues críticos
✅ Optimización: Custom errors, struct packing
✅ Scripts: Deploy, configure, monitor
🟡 Testnet: Pendiente deployment
⬜ Mainnet: Después de testing
```

---

## 📞 Recursos

- 📘 [Documentación Base](https://docs.base.org/)
- 🔍 [Base Sepolia Explorer](https://sepolia.basescan.org/)
- 🔍 [Base Mainnet Explorer](https://basescan.org/)
- 💬 [Discord Base](https://discord.gg/buildonbase)
- 🚰 [Base Faucet](https://www.base.org/docs/using-base/quickstart#faucet)

---

## ⚠️ Notas Importantes

- 🔴 **NUNCA** commitear `.env` con private keys
- 🟡 **SIEMPRE** testear en Sepolia antes de mainnet
- 🟢 **GUARDAR** deployment JSONs en lugar seguro
- 🔵 **CONFIGURAR** seguridad antes de activar presale

---

## 📜 Licencia

MIT License - Ver contratos individuales para detalles

---

**Bashood Industrial Asset Tokenization Platform**  
*Democratizando el acceso a activos industriales de alto valor*

