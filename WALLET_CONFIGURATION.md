# 🏦 CONFIGURACIÓN DE WALLETS - BASHOOD

**Fecha:** 4 de Febrero 2026  
**Red:** Base Sepolia (Testnet)  
**Estado:** ✅ Configuración Completa

---

## 📋 WALLETS CONFIGURADAS

### Wallet #1: DEVELOPMENT (45%)
```
Dirección Pública: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Clave Privada: [REDACTED — usar .env local, nunca commitear]
Rol: Deployer/Owner/Admin
Recibe: 45% de beneficios ($1,035,000 de $2.3M total)
```

⚠️ **IMPORTANTE:** Esta es la clave privada por defecto de Hardhat (Account #0)
- Es de dominio público (aparece en la documentación de Hardhat)
- **SOLO usar en testnet (Base Sepolia)**
- **NUNCA usar en mainnet con fondos reales**

---

### Wallet #2: OPERATIONS (25%)
```
Dirección Pública: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Rol: Recepción de fondos de operaciones
Recibe: 25% de beneficios ($575,000 de $2.3M total)
Uso:
  - Salarios del equipo
  - Gas fees operacionales
  - Infraestructura y servidores
  - Herramientas y software
```

✅ Solo dirección pública configurada (no se necesita clave privada para deployment)

---

### Wallet #3: MARKETING (20%)
```
Dirección Pública: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Rol: Recepción de fondos de marketing
Recibe: 20% de beneficios ($460,000 de $2.3M total)
Uso:
  - Campañas publicitarias
  - Community management
  - Influencers y partnerships
  - Diseño y contenido
```

✅ Solo dirección pública configurada (no se necesita clave privada para deployment)

---

### Wallet #4: TREASURY (10%)
```
Dirección Pública: 0xE4dE660B6EfD0241f827c0f17CEe721aC5F44afE
Rol: Recepción de fondos de tesorería/reserva
Recibe: 10% de beneficios ($230,000 de $2.3M total)
Uso:
  - Reserva de emergencia
  - Liquidez para DEX (Uniswap/SushiSwap)
  - Oportunidades estratégicas
  - Buffer para volatilidad
```

✅ Solo dirección pública configurada (no se necesita clave privada para deployment)

---

## 🔐 SEGURIDAD

### Para Testnet (Base Sepolia):
- ✅ Configuración actual es segura
- ✅ ETH de testnet no tiene valor real
- ✅ Puedes obtener ETH gratis de faucets
- ✅ Clave Hardhat es conocida públicamente (no es problema en testnet)

### Para Mainnet (Base Production):
❌ **NO usar esta configuración**
✅ **Crear nuevas wallets con:**
  - Gnosis Safe multi-sig (2-de-3 o 3-de-5)
  - Hardware wallets (Ledger/Trezor)
  - NUNCA compartir claves privadas
  - Auditoría profesional antes de deployment

---

## 📊 DISTRIBUCIÓN DE FONDOS

```
TOTAL RECAUDADO: 1,000 ETH ($2,300,000 USD)

├─ Development (45%) → 450 ETH → $1,035,000
│  └─ 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
│
├─ Operations (25%) → 250 ETH → $575,000
│  └─ 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
│
├─ Marketing (20%) → 200 ETH → $460,000
│  └─ 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
│
└─ Treasury (10%) → 100 ETH → $230,000
   └─ 0xE4dE660B6EfD0241f827c0f17CEe721aC5F44afE
```

---

## 🔄 FLUJO DE DEPLOYMENT

### 1. Pre-Deployment
```bash
# Verificar configuración
cat .env | grep WALLET

# Obtener ETH de testnet
# Visitar: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# O: https://faucet.quicknode.com/base/sepolia
```

### 2. Deployment PaymentSplitter
```bash
npx hardhat run scripts/deploy-payment-splitter.js --network base-sepolia
```

Resultado esperado:
```
BashoodPaymentSplitter deployed: 0x...
Shares: [45, 25, 20, 10]
Wallets:
  - Development: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  - Operations:  0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  - Marketing:   0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  - Treasury:    0xE4dE660B6EfD0241f827c0f17CEe721aC5F44afE
```

### 3. Deployment Completo
```bash
npx hardhat run scripts/deploy-bashood-complete.js --network base-sepolia
```

Contratos desplegados:
1. ✅ BashoodPaymentSplitter
2. ✅ BashoodToken (1B supply)
3. ✅ MockNFT1155
4. ✅ MockPriceFeed ($2,300 ETH/USD)
5. ✅ ReferralValidator
6. ✅ BashoodReferral
7. ✅ BashoodPresaleFinal
8. ✅ BashoodRescue

### 4. Post-Deployment Verification
```bash
# Verificar distribución
npx hardhat run scripts/verify-payment-splitter.js --network base-sepolia

# Verificar que wallets reciban fondos
# Hacer compra de prueba con 0.1 ETH
# Verificar que se distribuya 45/25/20/10
```

---

## ✅ CHECKLIST DE DEPLOYMENT

### Pre-Deployment
- [x] Configurar .env con PRIVATE_KEY
- [x] Configurar 4 direcciones públicas (DEVELOPMENT, OPERATIONS, MARKETING, TREASURY)
- [x] Verificar saldo ETH en wallet deployer (mínimo 0.5 ETH testnet)
- [ ] Configurar hardhat.config.js con Base Sepolia RPC
- [ ] Verificar que scripts tengan las variables correctas

### Durante Deployment
- [ ] Deploy BashoodPaymentSplitter con 4 wallets
- [ ] Verificar que shares sean [45, 25, 20, 10]
- [ ] Deploy BashoodToken (1B supply)
- [ ] Deploy BashoodPresaleFinal con PaymentSplitter como projectWallet
- [ ] Transferir 250M BHT a BashoodPresaleFinal
- [ ] Mintear 10,000 NFTs a BashoodPresaleFinal
- [ ] Configurar oracle price feed
- [ ] Activar presale

### Post-Deployment
- [ ] Verificar contratos en BaseScan
- [ ] Probar compra de NFT con 0.1 ETH
- [ ] Verificar que pendingWithdrawals acumule fondos
- [ ] Llamar claimProjectFunds() desde PaymentSplitter
- [ ] Verificar que fondos se dividan 45/25/20/10
- [ ] Llamar releaseAll() y verificar que wallets reciban ETH
- [ ] Documentar direcciones de contratos

---

## 🛠️ COMANDOS ÚTILES

### Ver saldo de una wallet
```bash
npx hardhat console --network base-sepolia
```
```javascript
const balance = await ethers.provider.getBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
console.log(ethers.formatEther(balance), "ETH");
```

### Ver pending funds en PaymentSplitter
```javascript
const splitter = await ethers.getContractAt("BashoodPaymentSplitter", "0x...");
const pending = await splitter.releasable("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
console.log("Operations pending:", ethers.formatEther(pending), "ETH");
```

### Distribuir fondos
```javascript
const splitter = await ethers.getContractAt("BashoodPaymentSplitter", "0x...");
await splitter.releaseAll(); // Distribuye a las 4 wallets
```

---

## 📝 NOTAS IMPORTANTES

1. **Solo 1 clave privada necesaria**: Wallet #1 para desplegar y administrar
2. **Las otras 3 wallets solo reciben**: No necesitan claves privadas para deployment
3. **PaymentSplitter divide automáticamente**: No hay reparto manual
4. **Testnet es seguro**: ETH de prueba sin valor real
5. **Mainnet requiere multi-sig**: Gnosis Safe con múltiples signers
6. **Hardhat key es pública**: NUNCA usar la clave por defecto de Hardhat en mainnet

---

## 🔗 RECURSOS

- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- BaseScan Sepolia: https://sepolia.basescan.org/
- Gnosis Safe: https://safe.global/
- Hardhat Docs: https://hardhat.org/hardhat-runner/docs/getting-started
- OpenZeppelin PaymentSplitter: https://docs.openzeppelin.com/contracts/4.x/api/finance#PaymentSplitter
