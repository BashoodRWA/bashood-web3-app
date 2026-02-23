# 🧪 Plan de Pruebas Exhaustivas - Base Sepolia Testnet

## Objetivo
Ejecutar **10,000+ pruebas** en testnet para validar completamente el sistema antes de mainnet.

---

## FASE 1: Configuración Pre-Deployment

### 1.1 Configurar 5 Wallets Metamask
```
□ TREASURY_WALLET (recibe 0.5% tax)
□ DEVELOPMENT_WALLET (PaymentSplitter 45%)
□ OPERATIONS_WALLET (PaymentSplitter 25%)
□ MARKETING_WALLET (PaymentSplitter 20%)
□ TREASURY_PS_WALLET (PaymentSplitter 10%)
```

**CRÍTICO**: Las 5 wallets deben ser DIFERENTES

### 1.2 Obtener Base Sepolia ETH
- Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Necesario: ~0.5 ETH para deployment
- Distribuir: 0.1 ETH a cada wallet de prueba (50+ wallets usuarios)

### 1.3 Crear .env.sepolia
```bash
cp .env.sepolia.example .env.sepolia
# Editar con tus wallets reales
```

---

## FASE 2: Deployment a Base Sepolia

### 2.1 Deploy Contracts
```bash
npx hardhat run scripts/deploy-complete.js --network baseSepolia
```

**Verificar output:**
- ✅ 6 contratos deployed
- ✅ NFTs minted a presale
- ✅ Presale authorized en Referral
- ✅ Rescue configurado
- ✅ Addresses guardadas en deployments/

### 2.2 Verificar en Basescan
```bash
# Ejecutar comandos del output
npx hardhat verify --network baseSepolia [ADDRESS] [ARGS]
```

**Resultado esperado:**
- ✅ 6 contratos verificados
- ✅ Source code público
- ✅ Read/Write contract disponible

### 2.3 Guardar Addresses
Crear archivo `ADDRESSES_SEPOLIA.json` con todas las addresses deployadas.

---

## FASE 3: 10,000+ Pruebas Exhaustivas

### 3.1 Purchase NFT Tests (3,000 pruebas)

#### 3.1.1 Purchases Normales (1,000 tests)
```javascript
// Script: test-scripts/01-normal-purchases.js

for (let i = 0; i < 1000; i++) {
  // Diferentes cantidades
  const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 NFTs
  const nftId = Math.floor(Math.random() * 3) + 1;    // ID 1-3
  
  const user = users[i % 50]; // Rotar 50 usuarios
  
  await presale.connect(user).purchase(
    nftId,
    quantity,
    referrerCode,
    signature
  );
  
  // Verificar balance NFT
  // Verificar ETH distribuido
  // Log progreso cada 100
}
```

**Métricas a verificar:**
- ✅ NFT balance correcto
- ✅ ETH distribuido 45/25/20/10
- ✅ Referral commission correcta
- ✅ totalNFTsSold actualizado
- ✅ Events emitidos

#### 3.1.2 Edge Cases (500 tests)
```
□ Purchase al límite maxPerUser
□ Purchase al límite maxPerTx
□ Purchase exactamente al límite de supply
□ Purchase justo antes de presaleEnd
□ Purchase con diferentes montos ETH
□ Purchase con overpayment (debe revertir)
□ Purchase con underpayment (debe revertir)
```

#### 3.1.3 Multi-User Concurrent (1,000 tests)
```javascript
// 10 usuarios comprando simultáneamente
// Repetir 100 veces

for (let round = 0; round < 100; round++) {
  const promises = [];
  
  for (let u = 0; u < 10; u++) {
    const user = users[round * 10 + u];
    promises.push(
      presale.connect(user).purchase(1, 1, ...).catch(e => {
        // Log esperado si excede supply
      })
    );
  }
  
  await Promise.all(promises);
  
  // Verificar consistency
  // totalNFTsSold nunca debe exceder maxSupply
}
```

#### 3.1.4 Referral System (500 tests)
```
□ 100 purchases con referrer válido
□ 100 purchases con referrer inválido (revertir)
□ 100 purchases sin referrer
□ 100 verify commission distribution
□ 100 verify referral stats
```

### 3.2 Token Transfer Tests (2,000 pruebas)

#### 3.2.1 Tax Verification (1,000 tests)
```javascript
// Diferentes montos de transfer
const amounts = [
  ethers.parseEther("1"),
  ethers.parseEther("10"),
  ethers.parseEther("100"),
  ethers.parseEther("1000"),
  ethers.parseEther("0.001")
];

for (let i = 0; i < 1000; i++) {
  const amount = amounts[i % amounts.length];
  
  const balanceBefore = await token.balanceOf(recipient);
  const treasuryBefore = await token.balanceOf(treasury);
  const totalSupplyBefore = await token.totalSupply();
  
  await token.connect(sender).transfer(recipient, amount);
  
  const balanceAfter = await token.balanceOf(recipient);
  const treasuryAfter = await token.balanceOf(treasury);
  const totalSupplyAfter = await token.totalSupply();
  
  // Verificar tax 0.6%
  const expectedReceived = amount * 9940n / 10000n; // 99.4%
  const expectedBurn = amount * 10n / 10000n;       // 0.1%
  const expectedTreasury = amount * 50n / 10000n;   // 0.5%
  
  assert(balanceAfter - balanceBefore === expectedReceived);
  assert(treasuryAfter - treasuryBefore === expectedTreasury);
  assert(totalSupplyBefore - totalSupplyAfter === expectedBurn);
}
```

#### 3.2.2 transferFrom Tests (500 tests)
```
□ Approve + transferFrom con tax correcto
□ Allowance decrementado correctamente
□ Tax aplicado igual que transfer()
```

#### 3.2.3 Edge Cases (500 tests)
```
□ Transfer balance completo
□ Transfer 1 wei
□ Transfer a address(0) (debe revertir)
□ Transfer desde/a mismo address
□ Transfer durante pause (debe revertir)
```

### 3.3 Payment Distribution Tests (1,000 pruebas)

```javascript
// Verificar 45/25/20/10 split perfecto

for (let i = 0; i < 1000; i++) {
  const ethAmount = ethers.parseEther(String(Math.random() * 10));
  
  const splitterBalanceBefore = await ethers.provider.getBalance(splitter);
  
  // Enviar ETH al splitter (simulando purchases)
  await user.sendTransaction({
    to: splitter,
    value: ethAmount
  });
  
  const splitterBalanceAfter = await ethers.provider.getBalance(splitter);
  assert(splitterBalanceAfter - splitterBalanceBefore === ethAmount);
  
  // Release para cada payee
  for (const payee of [dev, ops, marketing, treasuryPS]) {
    const releasableBefore = await splitter.releasable(payee, ethers.ZeroAddress);
    
    if (releasableBefore > 0) {
      await splitter.release(payee, ethers.ZeroAddress);
    }
  }
  
  // Verificar split correcto (45/25/20/10)
}
```

### 3.4 Timelock Security Tests (100 pruebas)

#### 3.4.1 Pause Flow (25 tests)
```javascript
for (let i = 0; i < 25; i++) {
  // Request
  await token.requestPause();
  const pauseTime = await token.pauseRequestTime();
  
  // Verificar users pueden transferir durante 24h
  await token.connect(user1).transfer(user2, amount);
  
  // Advance 23h - debe seguir permitiendo
  await time.increase(23 * 3600);
  await token.connect(user1).transfer(user2, amount);
  
  // Advance 1h más (total 24h)
  await time.increase(3600 + 1);
  
  // Execute pause
  await token.executePause();
  
  // Verificar NO permite transfer
  await expect(
    token.connect(user1).transfer(user2, amount)
  ).to.be.revertedWithCustomError(token, "EnforcedPause");
}
```

#### 3.4.2 Unpause Flow (25 tests)
Similar al pause flow pero en reversa.

#### 3.4.3 Cancellation Tests (25 tests)
```
□ Cancel pause request antes de 24h
□ Verificar users pueden seguir operando
□ Cancel unpause request
```

#### 3.4.4 Security Tests (25 tests)
```
□ Non-owner no puede request
□ Non-owner no puede execute
□ Non-owner no puede cancel
□ Múltiples requests resetean timer
```

### 3.5 Rescue Mechanism Tests (100 pruebas)

```
□ Rescue ETH stuck (50 tests)
□ Rescue ERC20 stuck (25 tests)
□ Rescue ERC721 stuck (25 tests)
□ Only authorized addresses pueden rescue
□ Cannot rescue native tokens del contrato
```

### 3.6 Reentrancy Attack Tests (500 pruebas)

```javascript
// Deploy AttackContract
// Intentar reentrancy en:
□ presale.purchase() (100 tests)
□ token.donate() (100 tests)
□ splitter.release() (100 tests)
□ Otros puntos de entrada (200 tests)

// Verificar todos REVIERTAN
```

### 3.7 Temporal Attack Tests (500 pruebas)

```
□ Purchase antes de presaleStart (100 tests) → REVERT
□ Purchase después de presaleEnd (100 tests) → REVERT
□ Purchase exactamente en presaleStart (100 tests) → SUCCESS
□ Purchase exactamente en presaleEnd-1 (100 tests) → SUCCESS
□ Pause durante presale activa (100 tests) → BLOCK purchases
```

### 3.8 Gas Limit Scenarios (200 pruebas)

```
□ Purchase máximo NFTs en 1 tx (50 tests)
□ Release payment a todas las wallets (50 tests)
□ Batch transfers (50 tests)
□ Medir gas costs promedio (50 tests)
```

### 3.9 Multi-User Concurrent Stress (2,600 pruebas)

```javascript
// Simular carga real de mainnet

const CONCURRENT_USERS = 50;
const ROUNDS = 52; // 50 * 52 = 2,600 tests

for (let round = 0; round < ROUNDS; round++) {
  const operations = [];
  
  // 50% purchases
  for (let i = 0; i < 25; i++) {
    operations.push(
      presale.connect(users[i]).purchase(...).catch(e => log(e))
    );
  }
  
  // 25% token transfers
  for (let i = 0; i < 12; i++) {
    operations.push(
      token.connect(users[i]).transfer(...).catch(e => log(e))
    );
  }
  
  // 25% releases
  for (let i = 0; i < 13; i++) {
    operations.push(
      splitter.release(...).catch(e => log(e))
    );
  }
  
  await Promise.allSettled(operations);
  
  // Verificar invariants después de cada round
  await verifyInvariants();
  
  console.log(`Round ${round + 1}/${ROUNDS} - ✅`);
}
```

---

## FASE 4: Validación Final

### 4.1 Invariant Verification
Después de las 10,000+ pruebas, verificar:

```javascript
✅ totalNFTsSold <= maxSupply (siempre)
✅ ETH en PaymentSplitter = sum(purchases) (conservación)
✅ Token totalSupply correcto (considerando burns)
✅ Treasury balance = sum(0.5% de transfers)
✅ PaymentSplitter shares = 100% (10000 bps)
✅ Ningún ETH stuck en presale
✅ Rescue contract siempre configurado
```

### 4.2 Gas Cost Analysis
```
Operación                  | Gas Promedio | Gas Máximo
---------------------------|--------------|------------
purchase(1 NFT)            | ~150k        | ~200k
purchase(5 NFTs)           | ~300k        | ~400k
token.transfer()           | ~80k         | ~120k
splitter.release()         | ~50k         | ~80k
requestPause()             | ~49k         | ~50k
executePause()             | ~48k         | ~50k
```

### 4.3 Contract State Snapshot
Guardar estado final:
```json
{
  "totalPurchases": 3000,
  "totalNFTsSold": {
    "1": 500,
    "2": 300,
    "3": 200
  },
  "totalETHDistributed": "30.5 ETH",
  "totalTokenTransfers": 2000,
  "totalBurned": "0.1 ETH worth BHT",
  "treasuryCollected": "0.5 ETH worth BHT",
  "uniqueUsers": 52,
  "totalGasUsed": "~50,000,000",
  "errorsEncountered": 0
}
```

---

## FASE 5: Multisig & Mainnet Prep

### 5.1 Deploy Gnosis Safe (Base Sepolia)
```
□ Crear Safe 2-of-3
□ Agregar signers
□ Test multisig operations
```

### 5.2 Transfer Ownership
```bash
# BashoodToken
await token.transferOwnership(SAFE_ADDRESS);

# BashoodPresaleFinal
await presale.transferOwnership(SAFE_ADDRESS);

# Verificar desde multisig
```

### 5.3 Test Admin Operations via Multisig
```
□ requestPause desde multisig
□ executePause después de 24h
□ executeUnpause
□ setBurnRate desde multisig
□ Rescue operation desde multisig
```

---

## Criterios de Éxito

Para aprobar testnet y proceder a mainnet:

✅ **10,000+ pruebas ejecutadas sin errores críticos**
✅ **0 invariant violations**
✅ **Gas costs aceptables (<500k worst case)**
✅ **Contract sizes < 24 KB todos**
✅ **Timelock probado con delays reales (24h)**
✅ **Multisig operacional**
✅ **Todos los contratos verificados en Basescan**
✅ **PaymentSplitter 45/25/20/10 perfecto**
✅ **Tax 0.6% exacto en todas las pruebas**
✅ **Rescue mechanism funcional**

---

## Timeline Estimado

```
Día 1: Configurar wallets + Deploy testnet
Día 2-3: Pruebas normales (3,000 purchases + 2,000 transfers)
Día 4: Payment distribution + timelock (1,100 pruebas)
Día 5: Security tests (1,100 pruebas)
Día 6-7: Stress tests (2,800 pruebas concurrentes)
Día 8: Validación final + multisig setup
Día 9: Test con multisig
Día 10: Revisión y decisión go/no-go mainnet
```

---

## Comandos Útiles

```bash
# Deploy
npx hardhat run scripts/deploy-complete.js --network baseSepolia

# Verify
npx hardhat verify --network baseSepolia [ADDRESS] [ARGS]

# Run test suite
npx hardhat test test-scripts/01-normal-purchases.js --network baseSepolia

# Check balances
npx hardhat run scripts/check-balances.js --network baseSepolia

# Monitor events
npx hardhat run scripts/monitor-events.js --network baseSepolia
```

---

## Siguiente Acción

**AHORA MISMO:**
1. Configurar 5 wallets diferentes en Metamask
2. Obtener Base Sepolia ETH del faucet
3. Crear .env.sepolia con tus addresses
4. Ejecutar deployment

¿Listo? 🚀
