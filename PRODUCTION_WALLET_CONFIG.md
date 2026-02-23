# 🔧 CONFIGURACIÓN DE WALLETS PARA PRODUCCIÓN

## ⚠️ CRÍTICO: Separar Treasury y Operations Wallets

### Problema Detectado en Tests

Durante el security audit se detectó que los tests iniciales usaban la **misma wallet** para `operationsWallet` y `treasuryWallet`, causando confusión en el tracking de fees.

```javascript
// ❌ CONFIGURACIÓN INCORRECTA (test inicial)
const deployer = accounts[0];
operationsWallet = deployer;  // 0xf39...2266
treasuryWallet = deployer;    // 0xf39...2266 (MISMA DIRECCIÓN)

// Resultado: Imposible distinguir fees de ventas
```

---

## ✅ CONFIGURACIÓN CORRECTA PARA MAINNET

### 1. Definir Wallets Separadas

```javascript
// Wallets diferentes con propósitos específicos
const TREASURY_WALLET = "0x...";      // Recibe fees del token (0.5%)
const OPERATIONS_WALLET = "0x...";    // Recibe pagos de presale
const DEVELOPMENT_WALLET = "0x...";   // PaymentSplitter 45%
const MARKETING_WALLET = "0x...";     // PaymentSplitter 20%
const TREASURY_PS_WALLET = "0x...";   // PaymentSplitter 10%

// ⚠️ VALIDACIÓN CRÍTICA
assert(TREASURY_WALLET !== OPERATIONS_WALLET, 
  "Treasury y Operations DEBEN ser diferentes");
```

### 2. Deployment Correcto

```javascript
// PASO 1: Deploy BashoodToken con treasury dedicada
const BashoodToken = await ethers.getContractFactory("BashoodToken");
const bashoodToken = await BashoodToken.deploy(
  TREASURY_WALLET  // ← Wallet que recibirá el 0.5% de fees
);
await bashoodToken.waitForDeployment();

// PASO 2: Deploy BashoodPresale con ops dedicada
const BashoodPresale = await ethers.getContractFactory("BashoodPresaleFinal");
const bashoodPresale = await BashoodPresale.deploy(
  await bashoodToken.getAddress(),
  nftAddress,
  referralAddress,
  signerAddress,
  ethers.parseEther("0.1"),      // precio ETH
  ethers.parseUnits("25000", 18), // precio BHT
  presaleStart,
  presaleEnd,
  10000                           // max supply
);
await bashoodPresale.waitForDeployment();

// PASO 3: Configurar operations wallet (DIFERENTE a treasury)
await bashoodPresale.setOperationsWallet(OPERATIONS_WALLET);

// PASO 4: Deploy PaymentSplitter
const BashoodPaymentSplitter = await ethers.getContractFactory("BashoodPaymentSplitter");
const paymentSplitter = await BashoodPaymentSplitter.deploy(
  [DEVELOPMENT_WALLET, OPERATIONS_WALLET, MARKETING_WALLET, TREASURY_PS_WALLET],
  [45, 25, 20, 10]  // 45% + 25% + 20% + 10% = 100%
);

// PASO 5: Vincular PaymentSplitter al presale
await bashoodPresale.setPaymentSplitter(await paymentSplitter.getAddress());
```

---

## 📊 FLUJO DE FONDOS CON WALLETS SEPARADAS

### Compra con ETH

```
Usuario paga 10 ETH
    ↓
BashoodPresale recibe 10 ETH
    ↓
Se llama a claimProjectFunds()
    ↓
PaymentSplitter recibe 10 ETH
    ↓
Distribución automática:
├─ DEVELOPMENT: 4.5 ETH (45%)
├─ OPERATIONS:  2.5 ETH (25%)
├─ MARKETING:   2.0 ETH (20%)
└─ TREASURY_PS: 1.0 ETH (10%)
```

### Compra con BHT

```
Usuario paga 25,000 BHT
    ↓
BashoodToken.transferFrom(user, operations, 25000)
    ↓
Token aplica fees automáticamente:
├─ BURN:       25 BHT (0.1%) → Supply reduction
├─ TREASURY:  125 BHT (0.5%) → TREASURY_WALLET
└─ OPERATIONS: 24,850 BHT (99.4%) → OPERATIONS_WALLET
```

**Clave**: Con wallets separadas, puedes trackear:
- ✅ Cuánto BHT recibió operations (24,850)
- ✅ Cuánto BHT recibió treasury (125)
- ✅ Cuánto BHT se quemó (25)

---

## 🔍 VERIFICACIÓN POST-DEPLOYMENT

### Checklist de Validación

```javascript
// 1. Verificar que las wallets son diferentes
const tokenTreasury = await bashoodToken.treasuryWallet();
const presaleOps = await bashoodPresale.operationsWallet();

console.log("Treasury wallet (token):", tokenTreasury);
console.log("Operations wallet (presale):", presaleOps);

if (tokenTreasury === presaleOps) {
  throw new Error("⚠️ CRÍTICO: Treasury y Ops son la misma wallet!");
}

// 2. Verificar PaymentSplitter
const splitter = await bashoodPresale.paymentSplitter();
const info = await BashoodPaymentSplitter.attach(splitter).getDistributionInfo();

console.log("\n📊 PaymentSplitter Info:");
info.payees.forEach((payee, i) => {
  console.log(`  ${i + 1}. ${payee}: ${info.shares[i]} shares`);
});

// 3. Verificar que ninguna wallet se repite (excepto si es intencional)
const allWallets = [
  tokenTreasury,
  presaleOps,
  info.payees[0],  // Development
  info.payees[1],  // Operations (puede ser igual a presaleOps)
  info.payees[2],  // Marketing
  info.payees[3]   // Treasury PS
];

const uniqueWallets = [...new Set(allWallets)];
console.log(`\n🔢 Total wallets únicas: ${uniqueWallets.length}/${allWallets.length}`);

// Expected: Al menos 5 wallets diferentes
// (treasury del token debe ser diferente a todas las demás)
```

---

## 💰 EJEMPLO REAL: Compra de 1000 NFTs con BHT

### Cálculo Detallado

**Configuración**:
- Precio por NFT: 25,000 BHT
- Cantidad: 1,000 NFTs
- Precio total: 25,000,000 BHT

**Flujo de BHT**:

```
Usuario aprueba: 25,000,000 BHT
Usuario gasta:   25,000,000 BHT

BashoodToken aplica fees:
├─ Burn (0.1%):       25,000 BHT → 0x000...dEaD (supply reduction)
├─ Treasury (0.5%):  125,000 BHT → TREASURY_WALLET
└─ Neto a Ops:    24,850,000 BHT → OPERATIONS_WALLET

Total validado:  25,000,000 BHT ✅
```

**Balance final de wallets**:
```javascript
TREASURY_WALLET:    +125,000 BHT (fees acumulados)
OPERATIONS_WALLET: +24,850,000 BHT (ventas netas)
Total supply:       -25,000 BHT (burned permanentemente)
```

---

## 🎯 BENEFICIOS DE SEPARAR WALLETS

### 1. Claridad Contable
```
Treasury wallet:
  - Solo recibe fees del token (0.5%)
  - Fácil calcular total de fees: balance actual
  - Auditable en block explorer

Operations wallet:
  - Solo recibe ventas netas (después de fees)
  - Representa ingresos reales por ventas
  - Puede ser multisig diferente
```

### 2. Compliance y Reporting
```
Reporte mensual simplificado:

Ingresos por ventas BHT:  24,850,000 BHT (ops wallet)
Fees generados:              125,000 BHT (treasury wallet)
Tokens burned:                25,000 BHT (supply reduction)
────────────────────────────────────────────
Total movimientos:        25,000,000 BHT ✅
```

### 3. Flexibilidad de Permisos
```
Treasury wallet:
  - Puede ser multisig 3/5
  - Requiere aprobación para mover fondos
  - Solo para fees del token

Operations wallet:
  - Puede ser multisig 2/4
  - Más ágil para operaciones diarias
  - Recibe ventas del presale
```

### 4. Transparencia Pública
```
Usuarios pueden verificar en Etherscan/Basescan:

1. Ver treasury wallet del token:
   bashoodToken.treasuryWallet()
   → 0xTreasury...

2. Ver balance de fees:
   bashoodToken.balanceOf(treasuryWallet)
   → 125,000 BHT

3. Ver operations wallet del presale:
   bashoodPresale.operationsWallet()
   → 0xOperations...

4. Validar que son diferentes ✅
```

---

## ⚠️ RIESGOS DE NO SEPARAR

### Escenario: Treasury = Operations

**Problema 1 - Contabilidad Confusa**:
```
Usuario compra 1 NFT con 25,000 BHT

Deployer (treasury = ops) recibe: 24,975 BHT

Pregunta: ¿De dónde vienen los 24,975 BHT?
  - ¿24,850 de venta + 125 de fee? ✅ (correcto pero invisible)
  - ¿24,975 de venta sin fees? ❌ (parece que no hay fees)
  
Imposible distinguir sin revisar events detalladamente.
```

**Problema 2 - Auditoría Complicada**:
```
Auditor: "¿Cuántos fees se generaron este mes?"
Equipo: "Necesitamos revisar todos los events Transfer del token..."

vs.

Con wallets separadas:
Auditor: "¿Cuántos fees se generaron?"
Equipo: "Balance de treasury wallet: 125,000 BHT" ✅
```

**Problema 3 - Reportes Fiscales**:
```
Sin separación:
  Ingreso total: ???
  Fees del token: ???
  Ventas netas: ???
  
  Requiere análisis manual de cada transacción.

Con separación:
  Treasury balance: 125,000 BHT (fees)
  Ops balance: 24,850,000 BHT (ventas)
  
  Reportes automáticos ✅
```

---

## 📝 CHECKLIST PRE-DEPLOYMENT MAINNET

- [ ] **Treasury wallet** definida y verificada
- [ ] **Operations wallet** definida y verificada
- [ ] **Development wallet** definida (PaymentSplitter 45%)
- [ ] **Marketing wallet** definida (PaymentSplitter 20%)
- [ ] **Treasury PS wallet** definida (PaymentSplitter 10%)
- [ ] Validar: `treasury !== operations`
- [ ] Validar: `treasury !== development`
- [ ] Validar: `treasury !== marketing`
- [ ] Validar: `treasury !== treasuryPS`
- [ ] Todas las wallets tienen owners conocidos
- [ ] Private keys respaldadas en cold storage
- [ ] Documentación de wallets compartida con equipo
- [ ] Monitor de balances configurado (usar scripts de monitoreo)

**Nota**: Multisig se implementará en fase 2 para reducir costos iniciales

---

## 🚀 DEPLOYMENT SCRIPT RECOMENDADO

```javascript
// scripts/deploy-production.js

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYING TO MAINNET - Base Chain");
  
  // ============================================
  // CONFIGURACIÓN DE WALLETS
  // ============================================
  
  const TREASURY_WALLET = process.env.TREASURY_WALLET;
  const OPERATIONS_WALLET = process.env.OPERATIONS_WALLET;
  const DEVELOPMENT_WALLET = process.env.DEVELOPMENT_WALLET;
  const MARKETING_WALLET = process.env.MARKETING_WALLET;
  const TREASURY_PS_WALLET = process.env.TREASURY_PS_WALLET;
  const SIGNER_WALLET = process.env.SIGNER_WALLET;
  
  // Validaciones críticas
  if (!TREASURY_WALLET || !OPERATIONS_WALLET) {
    throw new Error("❌ TREASURY_WALLET y OPERATIONS_WALLET son requeridas");
  }
  
  if (TREASURY_WALLET === OPERATIONS_WALLET) {
    throw new Error("⚠️ CRÍTICO: Treasury y Operations DEBEN ser diferentes");
  }
  
  console.log("\n📋 Configuración de Wallets:");
  console.log(`  Treasury (token):    ${TREASURY_WALLET}`);
  console.log(`  Operations (presale): ${OPERATIONS_WALLET}`);
  console.log(`  Development (45%):    ${DEVELOPMENT_WALLET}`);
  console.log(`  Marketing (20%):      ${MARKETING_WALLET}`);
  console.log(`  Treasury PS (10%):    ${TREASURY_PS_WALLET}`);
  console.log(`  Signer:               ${SIGNER_WALLET}`);
  
  // Continuar con deployment...
  // [resto del código de deployment]
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
```

---

## � SCRIPTS DE MONITOREO Y CLAIM

### 1. Monitor de PaymentSplitter

Verifica balances y fondos pendientes de claim:

```bash
# Monitoreo único
npx hardhat run scripts/monitor-payment-splitter.cjs --network baseSepolia

# Monitoreo continuo (actualiza cada 30 segundos)
npx hardhat run scripts/monitor-payment-splitter.cjs --network baseSepolia -- --watch
```

**Muestra**:
- Balance total del contrato
- Fondos disponibles para claim por wallet
- Fondos ya distribuidos
- Porcentajes de distribución

### 2. Claim Individual

Cada wallet reclama sus fondos:

```bash
# Configurar en .env:
# PAYMENT_SPLITTER_ADDRESS=0x...
# PRIVATE_KEY=0x... (de la wallet que va a reclamar)

npx hardhat run scripts/claim-payment-splitter.cjs --network baseSepolia
```

**Proceso**:
1. Verifica fondos disponibles para la wallet
2. Muestra monto a reclamar
3. Ejecuta release()
4. Muestra ETH recibido y gas pagado

### 3. Release All (Distribuir a todos)

Owner distribuye a todas las wallets de una vez:

```bash
npx hardhat run scripts/release-all-payment-splitter.cjs --network baseSepolia
```

**Ventajas**:
- Distribuye a todos los payees en una transacción
- Más eficiente si vas a pagar el gas de todos
- Útil para distribuciones programadas

**Desventaja**:
- Gas más alto (50k por payee × 4 = ~200k gas)

---

## 🔧 CONFIGURACIÓN DE .ENV

```bash
# Wallet que ejecuta el deployment
DEPLOYER_PRIVATE_KEY=0x...

# Direcciones de las wallets receptoras
TREASURY_WALLET=0x...
OPERATIONS_WALLET=0x...
DEVELOPMENT_WALLET=0x...
MARKETING_WALLET=0x...
TREASURY_PS_WALLET=0x...
SIGNER_WALLET=0x...

# Después del deployment, agregar:
PAYMENT_SPLITTER_ADDRESS=0x...
BASHOOD_TOKEN_ADDRESS=0x...
BASHOOD_PRESALE_ADDRESS=0x...

# RPC URLs
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# Block explorers
BASESCAN_API_KEY=...
```

---

## 📅 PROCESO RECOMENDADO DE CLAIM

### Opción A: Claim Manual (cada wallet por separado)

**Ventajas**:
- Cada wallet paga su propio gas
- Flexibilidad fiscal (cada uno decide cuándo recibir)
- Más descentralizado

**Proceso**:
1. Monitorear balance: `monitor-payment-splitter.cjs`
2. Cuando hay fondos disponibles, cada wallet ejecuta:
   ```bash
   npx hardhat run scripts/claim-payment-splitter.cjs --network baseSepolia
   ```
3. Verificar distribución: `monitor-payment-splitter.cjs`

### Opción B: Release All (owner distribuye)

**Ventajas**:
- Una sola transacción
- Distribución programada/automática
- Más simple para el equipo

**Proceso**:
1. Owner ejecuta periódicamente (ej: cada semana):
   ```bash
   npx hardhat run scripts/release-all-payment-splitter.cjs --network baseSepolia
   ```
2. Todas las wallets reciben sus fondos automáticamente

### Recomendación Inicial

Para simplificar operaciones y reducir coordinación:
- **Usar Release All** ejecutado por owner semanalmente
- Cada wallet solo necesita verificar que recibió fondos
- Menos gestión de private keys de múltiples wallets
- Más predecible para contabilidad

---

## 📚 DOCUMENTACIÓN ADICIONAL

**Ver también**:
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Security audit completo (100% score)
- [PAYMENT_DISTRIBUTION_REPORT.md](./PAYMENT_DISTRIBUTION_REPORT.md) - Tests de PaymentSplitter
- [MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md](./MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md) - Checklist completo

**Scripts de testing**:
- `scripts/final-burn-verification.cjs` - Prueba con wallets separadas ✅
- `scripts/test-payment-distribution.cjs` - Tests de distribución básica
- `scripts/test-payment-distribution-extreme.cjs` - Tests con 300 ETH
- `scripts/security-attack-tests.cjs` - 15 ataques básicos
- `scripts/security-advanced-tests.cjs` - 10 ataques avanzados

**Scripts de producción**:
- `scripts/monitor-payment-splitter.cjs` - **Monitor de balances** 📊
- `scripts/claim-payment-splitter.cjs` - **Claim individual** 💰
- `scripts/release-all-payment-splitter.cjs` - **Distribuir a todos** 🎯

---

**Última actualización**: 5 de Febrero 2026  
**Status**: ✅ CRÍTICO - Implementar antes de mainnet deployment  
**Verificado por**: GitHub Copilot Security Audit  
**Multisig**: Fase 2 (reducir costos iniciales)
