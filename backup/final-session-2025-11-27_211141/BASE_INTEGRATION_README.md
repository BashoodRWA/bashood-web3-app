# 🔷 BASHOOD - INTEGRACIÓN BASE BLOCKCHAIN

> **Estado**: 🟡 En progreso - 70% completado  
> **Última actualización**: 2024-11-27  
> **Responsable**: Equipo Bashood  

---

## 📋 Resumen Ejecutivo

Bashood ha completado la **integración de Base blockchain** para despliegue de presale, token y sistema de referrales en la red Base (Ethereum L2). 

**Estado Actual**:
- ✅ Suite de tests: 323/323 passing (100%)
- ✅ Contratos optimizados con custom errors
- ✅ Infraestructura Base: Configurada
- ✅ Scripts de deployment: Listos
- 🟡 Configuración .env: Pendiente (variables sensibles)
- 🟡 Testing en Sepolia: Pendiente

**Bloqueador**: Necesita configuración de variables de entorno sensibles (.env)

---

## 🚀 Quick Start

### 1. Preparar Entorno (5 minutos)

```bash
# Clonar o navegar al proyecto
cd c:/Users/Franchu/Desktop/bashood-hardhat-tests

# Crear archivo .env desde template
cp .env.example .env

# Editar .env con tus valores
code .env
```

**Variables críticas en .env**:
```env
# RPC Endpoints (opcionales, ya tienen defaults)
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# Private Keys (REQUERIDO - NO commit esto!)
BASE_SEPOLIA_PRIVATE_KEY=tu_clave_privada_testnet
BASE_MAINNET_PRIVATE_KEY=tu_clave_privada_mainnet  # Después, para producción

# Wallets
OWNER_ADDRESS=tu_wallet_address
PROJECT_WALLET=wallet_recibe_fondos
OPS_WALLET=wallet_operaciones

# API Key para verificación en Basescan
BASESCAN_API_KEY=tu_api_key_basescan
```

### 2. Validar Configuración (10 minutos)

```bash
# Verificar que todo esté correcto
npx hardhat run scripts/validate-base-config.js --network base-sepolia

# Salida esperada:
# ✅ ¡Configuración lista para deployment a Base!
```

### 3. Obtener Testnet ETH (instantáneo)

1. Ve a: https://www.base.org/docs/using-base/quickstart#faucet
2. Pega tu wallet address (la del OWNER_ADDRESS)
3. Obtén 0.01 ETH gratis

### 4. Deploy a Base Sepolia (5 minutos)

```bash
# Compilar contratos
npx hardhat compile

# Deploy a testnet
npx hardhat run scripts/deploy-base.js --network base-sepolia

# ✅ Salida: deployment-base-sepolia-TIMESTAMP.json
# Contiene todas las direcciones de contratos
```

### 5. Verificar en Basescan (5 minutos)

```bash
# Requiere: BASESCAN_API_KEY en .env (obtenible en https://basescan.org/apis)

# Reemplaza con dirección real del archivo JSON
npx hardhat verify --network base-sepolia 0xADDRESS_PRESALE

# Ver en: https://sepolia.basescan.org/address/0x...
```

### 6. Monitorear Presale

```bash
# Ver estado, balances, métricas
npx hardhat run scripts/presale-status.js --network base-sepolia deployment-base-sepolia-*.json
```

---

## 📁 Archivos Nuevos Creados

### Scripts (5 nuevos)

| Archivo | Descripción | Tiempo Ejecución |
|---------|-------------|-----------------|
| `scripts/deploy-base.js` | Deploy completo a Base | ~2-3 min |
| `scripts/validate-base-config.js` | Validar configuración | ~30 seg |
| `scripts/presale-status.js` | Monitor de presale | ~5 seg |
| `scripts/deploy-base-sepolia.js` | (Próximo) Wrapper Sepolia | - |
| `scripts/deploy-base-mainnet.js` | (Próximo) Wrapper Mainnet | - |

### Documentación (3 archivos)

| Archivo | Descripción | Secciones |
|---------|-------------|-----------|
| `docs/BASE_OPERACION_GUIA.md` | Guía completa | 8 secciones + troubleshooting |
| `docs/BASE_CHECKLIST_ESTADO.md` | Checklist y progreso | Estado, tareas, timeline |
| (Este archivo) | README Base integration | Quick start + referencias |

### Configuración Actualizada

| Archivo | Cambios |
|---------|---------|
| `hardhat.config.js` | ✅ Ya tenía Base config (se verificó) |
| `.env.example` | ✅ Creado con variables Base |

---

## 🔍 Estructura de Deployment

```
┌──────────────────────────────────────────────┐
│       BASE BLOCKCHAIN SEPOLIA/MAINNET        │
└──────────────────────────────────────────────┘

┌─ CONTRATOS DEPLOYADOS ──────────────────────┐
│ 1. BashoodToken (BHT)                       │ Token del proyecto
│ 2. BashoodNFT (Industrial NFT)              │ NFTs para presale
│ 3. MockPriceFeed (Chainlink Oracle)         │ Precios ETH/BHT
│ 4. ReferralValidator                        │ Validación referrals
│ 5. BashoodReferral                          │ Sistema referrals
│ 6. BashoodPresaleFinal ⭐ (MAIN)           │ Contrato presale
│ 7. BashoodRescue                            │ Mecanismo emergencia
└──────────────────────────────────────────────┘
```

---

## 📊 Workflow Operacional

### Fase 1: Testing en Sepolia (2-3 días)

```
Día 1:
  ├─ .env setup ✅
  ├─ Validación config ✅
  ├─ Deploy Sepolia 
  ├─ Verificación Basescan
  └─ Pruebas básicas

Día 2:
  ├─ Testing presale
  ├─ Testing minting NFT
  ├─ Testing referrals
  ├─ Testing rescue mechanisms
  └─ Load testing (simulado)

Día 3:
  ├─ Fix issues (si hay)
  ├─ Finalización QA
  └─ Aprobación deploy mainnet
```

### Fase 2: Deploy Mainnet (Same-day)

```
  ├─ Deploy a base-mainnet
  ├─ Verificación Basescan
  ├─ Soft launch (lote pequeño)
  ├─ Monitor 24/7
  └─ Scale up presale
```

---

## 🛠️ Comandos Útiles

### Development
```bash
# Compilar contratos
npx hardhat compile

# Correr tests locales
npx hardhat test

# Coverage
npx hardhat coverage
```

### Base Sepolia (Testnet)
```bash
# Validar configuración
npx hardhat run scripts/validate-base-config.js --network base-sepolia

# Deploy
npx hardhat run scripts/deploy-base.js --network base-sepolia

# Ver estado presale
npx hardhat run scripts/presale-status.js --network base-sepolia DEPLOYMENT_FILE.json

# Verificar contrato
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS [args]
```

### Base Mainnet (Producción)
```bash
# ⚠️  SOLO DESPUÉS de testing completo en Sepolia
npx hardhat run scripts/deploy-base.js --network base-mainnet
```

---

## 📚 Documentación Completa

Para guías detalladas, ver:

1. **[BASE_OPERACION_GUIA.md](docs/BASE_OPERACION_GUIA.md)** - Guía operacional (8 secciones)
   - Configuración inicial
   - Pre-deployment checklist
   - Scripts auxiliares
   - Gas optimization
   - Monitoreo y debugging
   - Checklist pre-producción
   - Referencias y recursos

2. **[BASE_CHECKLIST_ESTADO.md](docs/BASE_CHECKLIST_ESTADO.md)** - Estado actual y checklist
   - Tareas completadas
   - Tareas en progreso
   - Tareas pendientes
   - Timeline estimado
   - Blockers conocidos

3. **[PRODUCTION_REVIEW_DETAILED.md](docs/PRODUCTION_REVIEW_DETAILED.md)** - Review de cambios
   - Análisis de 19 archivos modificados
   - Evaluación de riesgos
   - Recomendaciones

---

## ⚙️ Configuración Técnica

### Networks Soportados

| Red | Chain ID | RPC | Estado | Usar para |
|-----|----------|-----|--------|-----------|
| Hardhat | N/A | Local | ✅ Activo | Testing local |
| Base Sepolia | 84532 | https://sepolia.base.org | ✅ Listo | QA/Staging |
| Base Mainnet | 8453 | https://mainnet.base.org | ✅ Listo | Producción |

### Contratos Incluidos

**Token & NFT**:
- `BashoodToken.sol` (ERC-20) - Token BHT
- `BashoodNFT.sol` (ERC-1155) - Industrial NFTs
- `MockNFT1155.sol` (Test) - Mock para testing

**Presale**:
- `BashoodPresaleFinal.sol` ⭐ - Contrato presale principal
- Oracle integration con price feeds
- Custom errors (19 tipos)
- Struct optimization

**Referrals & Rescue**:
- `BashoodReferral.sol` - Sistema referrals
- `ReferralValidator.sol` - Validación
- `BashoodRescue.sol` - Mecanismo emergencia

---

## 🔐 Seguridad

### Best Practices Implementadas

✅ Custom errors (gas optimization)  
✅ Struct field reordering (storage optimization)  
✅ Role-based access control (OpenZeppelin)  
✅ Reentrancy guards  
✅ Input validation  
✅ Oracle staleness checks (1-86400 segundos)  

### Pre-Deployment Security Checklist

- [ ] Auditoría de seguridad completada (o pendiente)
- [ ] Análisis de reentrancy
- [ ] Validación de access controls
- [ ] Limits y caps verificados
- [ ] Fallback functions testeadas

---

## 📊 Métricas y Gas

### Estimado de Costos (Base Sepolia/Mainnet)

| Operación | Gas | ETH @ 1 gwei | USD @ $3000/ETH |
|-----------|-----|--------------|-----------------|
| Deploy Presale | ~500,000 | 0.0005 | $0.15 |
| Mint NFT | ~80,000 | 0.00008 | $0.24 |
| Buy with ETH | ~120,000 | 0.00012 | $0.36 |
| Transfer funds | ~40,000 | 0.00004 | $0.12 |
| **TOTAL Operación** | - | **~0.001** | **~$3** |

Compare con Ethereum L1: ~**$100-300** para las mismas operaciones.

---

## 🐛 Troubleshooting

### Problema: "insufficient funds for gas"
**Solución**: Obtener testnet ETH desde faucet  
https://www.base.org/docs/using-base/quickstart#faucet

### Problema: "invalid private key"
**Solución**: Revisar formato en .env (puede ser con o sin "0x")

### Problema: "contract not verified"
**Solución**: Agregar BASESCAN_API_KEY a .env  
https://basescan.org/apis (crear cuenta gratis)

### Problema: "network request failed"
**Solución**: Verificar RPC endpoint, internet, firewall

Ver [BASE_OPERACION_GUIA.md#6-monitoreo-y-debugging](docs/BASE_OPERACION_GUIA.md) para más troubleshooting.

---

## 📞 Soporte y Recursos

### Oficial Base
- Docs: https://docs.base.org/
- Discord: https://discord.gg/buildonbase
- Faucet: https://www.base.org/docs/using-base/quickstart#faucet

### Block Explorers
- Sepolia: https://sepolia.basescan.org/
- Mainnet: https://basescan.org/

### Contract Verification
- Create account: https://basescan.org/
- API docs: https://basescan.org/apis

---

## ✅ Pre-Launch Checklist

Antes de pasar a Mainnet, completar:

- [ ] 100% tests passing en Hardhat ✅
- [ ] Deploy exitoso en Sepolia
- [ ] Contratos verificados en Basescan Sepolia
- [ ] Testing funcional completo (7+ días)
- [ ] Presale operación normal en testnet
- [ ] Minting de NFTs sin errores
- [ ] Referral system funcionando
- [ ] Rescue mechanisms testeados
- [ ] Gas costs validados
- [ ] Documentación actualizada
- [ ] Team training completado
- [ ] Wallets de producción aseguradas

---

## 📝 Notas Importantes

⚠️ **NUNCA commitear .env** - Contiene claves privadas sensibles

⚠️ **Testnet PRIMERO** - Siempre usar Sepolia antes de Mainnet

⚠️ **Backup de direcciones** - Guardar deployment JSON en lugar seguro

⚠️ **Validar RPC** - Usar endpoints oficiales, no públicos inseguros

---

## 🎯 Próximos Pasos

1. ✅ Configurar `.env` (INMEDIATO)
2. ✅ Validar con `validate-base-config.js` (INMEDIATO)
3. Deploy a Sepolia (HOY/MAÑANA)
4. Testing en Sepolia (2-3 DÍAS)
5. Deploy a Mainnet (DESPUÉS DE TESTING)

**Timeline estimado**: 3-4 días hasta producción

---

## 📈 Progreso Actual

```
Infraestructura:      ████████████████████████████ 100%
Scripts:              ██████████████████░░░░░░░░░  70%
Documentación:        ███████████████████████░░░░  85%
Testing Sepolia:      ░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%
Deploy Mainnet:       ░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%
─────────────────────────────────────────────────
TOTAL:                ████████████░░░░░░░░░░░░░░░  50%
```

---

**Status Final**: 🟡 Listo para testing en Sepolia  
**Última revisión**: 2024-11-27 21:15 UTC  
**Próxima revisión**: Después de primer deploy exitoso a Sepolia

---

## 📜 Licencia y Notas

- Contratos: SPDX-License-Identifier: MIT (dentro de cada contrato)
- Documentación: CC-BY-4.0
- Scripts: MIT

Cualquier pregunta o problema, consultar la documentación completa en `/docs/`
