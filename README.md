# 🏗️ Bashood - Industrial Asset Tokenization Platform

> Sistema de presale para tokenización de activos industriales (maquinaria pesada, excavadoras, grúas) como NFTs en Base blockchain.

**Estado**: ✅ Listo para deployment en Base Sepolia  
**Tests**: 323/323 passing ✅  
**Coverage**: 67.41% branch coverage  
**Última actualización**: 15 Enero 2026

---

## 🚀 Quick Start

### Para Deployment en Base

```bash
# 1. Configurar entorno
cp .env.example .env
code .env  # Editar con tus valores

# 2. Validar configuración
npx hardhat run scripts/validate-base-config.js --network base-sepolia

# 3. Deploy contratos
npx hardhat run scripts/deploy-base.js --network base-sepolia

# 4. Configurar seguridad (CRÍTICO)
PRESALE_ADDRESS=0x... npx hardhat run scripts/configure-presale-security.js --network base-sepolia
```

**Ver guía completa**: [BASE_INTEGRATION_README.md](BASE_INTEGRATION_README.md)

---

## 📦 Contratos Principales

| Contrato | Descripción | Tamaño |
|----------|-------------|--------|
| **BashoodPresaleFinal** ⭐ | Presale de NFTs con pagos ETH/BHT | 16.9 KB |
| **BashoodToken** | Token ERC20 del proyecto (BHT) | - |
| **BashoodMultiToken** | NFTs ERC1155 (activos industriales) | - |
| **BashoodReferral** | Sistema de referidos | - |
| **BashoodRescue** | Mecanismo de emergencia | - |
| **ChainlinkPriceFeed** | Oracle para precios ETH/BTC | - |

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

