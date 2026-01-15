# 🚀 GUÍA DE CONFIGURACIÓN PARA PRODUCCIÓN - BASHOOD

**Fecha:** 3 de Diciembre de 2025  
**Audiencia:** DevOps, Deployment Team  
**Nivel:** Crítico - Deployment a Mainnet

---

## ⚠️ ADVERTENCIAS CRÍTICAS

> 🔴 **NUNCA uses private keys de software wallets en mainnet con fondos reales**  
> 🔴 **SIEMPRE usa hardware wallets (Ledger/Trezor) para mainnet**  
> 🔴 **VERIFICA triple vez todas las configuraciones antes de desplegar**  
> 🔴 **REALIZA backups de TODAS las claves antes de deployment**

---

## 📋 TABLA DE CONTENIDOS

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Hardware Wallets](#configuración-de-hardware-wallets)
3. [Configuración de RPC Providers](#configuración-de-rpc-providers)
4. [Configuración de API Keys](#configuración-de-api-keys)
5. [Verificación de Configuración](#verificación-de-configuración)
6. [Deployment Checklist](#deployment-checklist)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 1. REQUISITOS PREVIOS

### Hardware Necesario

- [ ] **Ledger Nano S/X** o **Trezor Model T** (mínimo 2 unidades)
- [ ] Cables USB de respaldo
- [ ] Computadora con USB ports funcionales
- [ ] Almacenamiento seguro para seed phrases (caja fuerte, banco)

### Software Necesario

```bash
# Verificar versiones
node --version  # v20+
npm --version   # v9+
npx hardhat --version  # v2.26.3+
```

### Conocimientos Requeridos

- [ ] Experiencia con hardware wallets
- [ ] Comprensión de gas fees y optimization
- [ ] Conocimiento de Hardhat y deployment scripts
- [ ] Familiaridad con Basescan y contract verification

---

## 2. CONFIGURACIÓN DE HARDWARE WALLETS

### Paso 1: Inicializar Hardware Wallets

#### Ledger Setup

1. **Actualizar Firmware**
   ```
   - Conectar Ledger a computadora
   - Abrir Ledger Live
   - Ir a Manager → Actualizar firmware
   - Seguir instrucciones en pantalla
   ```

2. **Instalar Ethereum App**
   ```
   - Abrir Ledger Live → Manager
   - Buscar "Ethereum"
   - Click "Install"
   - Habilitar "Contract Data" y "Display Token Info"
   ```

3. **Derivar Addresses**
   ```
   - Abrir Ethereum app en Ledger
   - Conectar a Hardhat usando @ledgerhq/hw-app-eth
   - Derivar direcciones m/44'/60'/0'/0/0 (deployer)
   - Derivar direcciones m/44'/60'/0'/0/1 (admin)
   - Derivar direcciones m/44'/60'/0'/0/2 (emergency)
   - Derivar direcciones m/44'/60'/0'/0/3 (operations)
   ```

#### Configuración en Hardhat

Actualizar `hardhat.config.js`:

```javascript
// PRODUCTION CONFIGURATION - Use Ledger
const { LedgerSigner } = require("@nomicfoundation/hardhat-ledger");

// ... existing config ...

networks: {
  "base-mainnet": {
    url: process.env.BASE_MAINNET_RPC,
    // NO private keys! Se conectará a Ledger
    ledgerAccounts: [
      "0xYOUR_DEPLOYER_ADDRESS",  // Derivation path m/44'/60'/0'/0/0
      "0xYOUR_ADMIN_ADDRESS",     // Derivation path m/44'/60'/0'/0/1
      "0xYOUR_EMERGENCY_ADDRESS", // Derivation path m/44'/60'/0'/0/2
      "0xYOUR_OPERATIONS_ADDRESS" // Derivation path m/44'/60'/0'/0/3
    ],
    chainId: 8453,
    gasPrice: 1000000000 // 1 gwei
  }
}
```

### Paso 2: Verificar Addresses

```bash
# Script para verificar addresses de Ledger
npx hardhat run scripts/verify-ledger-addresses.js
```

### Paso 3: Fondear Wallets

| Wallet | Propósito | Balance Mínimo (Base) |
|--------|-----------|----------------------|
| Deployer | Deployment de contratos | 0.1 ETH |
| Admin | Operaciones admin | 0.02 ETH |
| Emergency | Emergencias | 0.02 ETH |
| Operations | Operaciones diarias | 0.05 ETH |

```bash
# Verificar balances
npx hardhat run scripts/check-balances.js --network base-mainnet
```

---

## 3. CONFIGURACIÓN DE RPC PROVIDERS

### Opción A: Alchemy (RECOMENDADO)

1. **Crear Cuenta**
   - Ir a https://www.alchemy.com/
   - Sign up con email corporativo
   - Verificar email

2. **Crear App**
   ```
   - Dashboard → Create App
   - Name: "Bashood Production"
   - Chain: Base
   - Network: Base Mainnet
   - Click "Create App"
   ```

3. **Obtener API Key**
   ```
   - Click en app creada
   - Copy HTTP URL
   - Formato: https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
   ```

4. **Configurar en .env**
   ```bash
   BASE_MAINNET_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
   BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
   ```

5. **Configurar Alertas**
   ```
   - Dashboard → Monitoring
   - Enable "Rate Limit Alerts"
   - Enable "Error Rate Alerts"
   - Set email notifications
   ```

### Opción B: Infura

```bash
# Similar a Alchemy
INFURA_PROJECT_ID=your_project_id
BASE_MAINNET_RPC=https://base-mainnet.infura.io/v3/${INFURA_PROJECT_ID}
```

### Validación de RPC

```bash
# Test RPC connection
curl https://base-mainnet.g.alchemy.com/v2/YOUR_KEY \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Expected response: {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

---

## 4. CONFIGURACIÓN DE API KEYS

### Basescan API Key

**Propósito:** Verificar contratos automáticamente en Basescan

1. **Crear Cuenta**
   - Ir a https://basescan.org/
   - Sign Up → Verificar email

2. **Generar API Key**
   ```
   - Login → My Account
   - API Keys → Add
   - Name: "Bashood Contract Verification"
   - Copy API Key
   ```

3. **Configurar**
   ```bash
   # .env
   BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
   ```

4. **Verificar**
   ```bash
   # Test API key
   curl "https://api.basescan.org/api?module=account&action=balance&address=0x0000000000000000000000000000000000000000&apikey=YOUR_KEY"
   ```

### CoinMarketCap API Key (Opcional)

**Propósito:** Obtener precios USD para gas reporting

```bash
# .env
COINMARKETCAP_API_KEY=your_cmc_api_key

# Enable gas reporting
REPORT_GAS=true
```

---

## 5. VERIFICACIÓN DE CONFIGURACIÓN

### Script de Verificación Completa

```bash
# Ejecutar verificación completa
npx hardhat run scripts/verify-production-setup.js --network base-mainnet
```

Esto verifica:
- ✅ Hardware wallet conectado
- ✅ RPC endpoints funcionando
- ✅ Balances suficientes
- ✅ API keys válidos
- ✅ Gas prices razonables
- ✅ Chainlink oracles accesibles

### Verificación Manual

```bash
# 1. Verificar variables de entorno
node -e "require('dotenv').config(); console.log({
  rpc: process.env.BASE_MAINNET_RPC ? '✅' : '❌',
  basescan: process.env.BASESCAN_API_KEY ? '✅' : '❌'
})"

# 2. Verificar compilación
npx hardhat compile

# 3. Verificar tests
npx hardhat test

# 4. Verificar tamaño de contratos
npx hardhat size-contracts

# 5. Verificar wallets
npx hardhat run scripts/verify-wallets.js --network base-mainnet
```

---

## 6. DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] **Auditoría externa completada y aprobada**
- [ ] **Todos los tests passing (323/323)**
- [ ] **Slither sin hallazgos críticos**
- [ ] **Hardware wallets configurados y probados**
- [ ] **RPC providers configurados con alertas**
- [ ] **Balances verificados (suficiente ETH)**
- [ ] **Backup de todas las seed phrases**
- [ ] **Plan de rollback documentado**
- [ ] **Equipo de emergencia en standby**

### Deployment Steps

```bash
# 1. Última verificación
npx hardhat run scripts/verify-wallets.js --network base-mainnet

# 2. Dry run (estimate gas)
HARDHAT_NETWORK=base-mainnet npx hardhat run scripts/deploy-base.js --dry-run

# 3. Deployment REAL
npx hardhat run scripts/deploy-base.js --network base-mainnet

# El script preguntará confirmación en cada paso
# Ledger pedirá confirmar cada transacción en pantalla

# 4. Guardar addresses
# El script genera: deployment-base-mainnet-TIMESTAMP.json

# 5. Verificar contratos en Basescan
npx hardhat verify --network base-mainnet CONTRACT_ADDRESS

# 6. Verificar ownership y roles
npx hardhat run scripts/verify-deployed-contracts.js --network base-mainnet
```

### Durante Deployment

**NUNCA:**
- ❌ Desconectar Ledger durante transacción
- ❌ Aprobar transacciones sin verificar en pantalla
- ❌ Deployar sin backup de addresses
- ❌ Continuar si algo parece extraño

**SIEMPRE:**
- ✅ Verificar address de contrato en Ledger
- ✅ Verificar gas price es razonable (<10 gwei en Base)
- ✅ Guardar transaction hashes
- ✅ Esperar confirmaciones (mínimo 3)
- ✅ Verificar en Basescan después de cada tx

---

## 7. POST-DEPLOYMENT

### Verificaciones Inmediatas

```bash
# 1. Verificar ownership de todos los contratos
npx hardhat run scripts/verify-ownership.js --network base-mainnet

# 2. Verificar roles en AccessControl
npx hardhat run scripts/verify-roles.js --network base-mainnet

# 3. Verificar configuraciones
npx hardhat run scripts/verify-config.js --network base-mainnet

# 4. Probar funciones básicas con cantidades mínimas
npx hardhat run scripts/smoke-test.js --network base-mainnet
```

### Configurar Monitoring

#### Tenderly Setup

1. **Crear Proyecto**
   ```
   - Ir a https://tenderly.co/
   - Create Project "Bashood Production"
   - Add contracts (import from Basescan)
   ```

2. **Configurar Alerts**
   ```
   Alerts a configurar:
   - Failed transactions
   - Large value transfers (>1 ETH)
   - Emergency function calls
   - Unusual gas consumption
   - Balance drops below threshold
   ```

#### OpenZeppelin Defender

```bash
# Configurar Defender para:
# - Automated relayers
# - Sentinel monitoring
# - Admin actions logging
# - Autotask scheduling
```

### Documentación Post-Deployment

Crear archivo: `deployment-mainnet-YYYY-MM-DD.md`

```markdown
# Deployment Report - Base Mainnet

**Date:** [DATE]
**Deployer:** [ADDRESS]
**Network:** Base Mainnet (chainId: 8453)

## Contract Addresses

- BashoodToken: 0x...
- BashoodMultiToken: 0x...
- BashoodPresaleFinal: 0x...
- BashoodRescue: 0x...
- BashoodReferral: 0x...
- ChainlinkPriceFeed: 0x...

## Transaction Hashes

- Deploy Token: 0x...
- Deploy MultiToken: 0x...
[...]

## Gas Costs

- Total Gas Used: X ETH
- Average Gas Price: Y gwei
- Total Cost (USD): $Z

## Verification Links

- [BashoodToken on Basescan](...)
- [BashoodPresale on Basescan](...)
[...]

## Post-Deployment Checks

- [x] Ownership verified
- [x] Roles assigned
- [x] Configuration validated
- [x] Smoke tests passed
- [x] Monitoring configured
```

---

## 8. TROUBLESHOOTING

### Error: "insufficient funds for gas * price + value"

**Solución:**
```bash
# Verificar balance
cast balance YOUR_ADDRESS --rpc-url $BASE_MAINNET_RPC

# Fondear wallet si es necesario
# Enviar ETH desde exchange a deployer address
```

### Error: "nonce too low"

**Solución:**
```bash
# Reset nonce en hardhat.config.js
// O esperar y reintentar
```

### Error: "Ledger device: UNKNOWN_ERROR (0x6a80)"

**Solución:**
```
1. Desconectar y reconectar Ledger
2. Cerrar Ledger Live
3. Abrir Ethereum app en Ledger
4. Habilitar "Contract Data" en Settings
5. Reintentar
```

### Error: "Contract verification failed"

**Solución:**
```bash
# Verificar manualmente con constructor args
npx hardhat verify --network base-mainnet \
  --constructor-args arguments.js \
  CONTRACT_ADDRESS

# arguments.js:
module.exports = [
  "0xADMIN_ADDRESS",
  "0xEMERGENCY_ADDRESS"
];
```

### RPC Rate Limiting

**Solución:**
```javascript
// hardhat.config.js
networks: {
  "base-mainnet": {
    url: process.env.BASE_MAINNET_RPC,
    timeout: 60000, // 60s timeout
    accounts: [...],
    // Add delay between requests
    deploymentDelay: 2000 // 2 seconds
  }
}
```

---

## 📞 CONTACTOS DE EMERGENCIA

### Equipo Técnico

- **Lead Developer:** [NAME] - [EMAIL] - [PHONE]
- **DevOps:** [NAME] - [EMAIL] - [PHONE]
- **Security:** [NAME] - [EMAIL] - [PHONE]

### Proveedores

- **Alchemy Support:** support@alchemy.com
- **Basescan Support:** support@basescan.org
- **Ledger Support:** support.ledger.com

### Procedimiento de Emergencia

1. **Detectar problema** → Llamar Lead Developer
2. **Evaluar severidad** → Critical = Pause contracts
3. **Ejecutar rollback** → Si es necesario
4. **Comunicar** → Usuarios, equipo, stakeholders
5. **Post-mortem** → Documentar y aprender

---

## ✅ CHECKLIST FINAL

Antes de deployment a mainnet, confirmar:

- [ ] Auditoría externa completada (Trail of Bits/OZ/Consensys)
- [ ] Testing exhaustivo en Base Sepolia (mínimo 2 semanas)
- [ ] Hardware wallets configurados y probados
- [ ] Backups de seed phrases en 3+ ubicaciones seguras
- [ ] RPC providers configurados con monitoreo
- [ ] API keys obtenidos y verificados
- [ ] Balances verificados (suficiente para deployment + buffer)
- [ ] Equipo de emergencia briefed y en standby
- [ ] Plan de rollback documentado y probado
- [ ] Monitoring tools configurados (Tenderly/Defender)
- [ ] Legal/compliance verificado
- [ ] Insurance policy activa (si aplica)
- [ ] Public announcement preparado
- [ ] Support tickets system listo
- [ ] Post-deployment checklist impreso

---

**Última Actualización:** 3 de Diciembre de 2025  
**Versión:** 1.0  
**Próxima Revisión:** Pre-deployment mainnet

