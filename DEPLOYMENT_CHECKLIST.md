# ✅ CHECKLIST DE DEPLOYMENT - BASHOOD PRESALE

**Network**: Base Sepolia (Testnet) → Base Mainnet  
**Fecha**: 4 Febrero 2026  
**Tokenomics**: 0.1 ETH = 25,000 BHT | Presale 250M BHT | Target $2.3M

---

## 🎯 PRE-DEPLOYMENT (Preparación)

### Wallets y Seguridad

```
✅ Wallet 1 - Development (45%)
   Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Private key: Configurada en .env
   
✅ Wallet 2 - Operations (25%)
   Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Private key: Configurada en .env
   
✅ Wallet 3 - Marketing (20%)
   Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
   Private key: Configurada en .env
   
⚠️ Wallet 4 - Treasury (10%)
   Address: PENDIENTE
   Status: FALTA CREAR/PROPORCIONAR
   Acción requerida: Crear wallet o proporcionar clave privada
```

### Fondos para Gas

```
Base Sepolia (Testnet):
□ Wallet 1: 0.5 ETH (deployment gas)
□ Obtener ETH gratis: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

Base Mainnet (Producción):
□ Wallet 1: 0.1 ETH estimado (~$230 para gas)
□ Comprar ETH y bridgear a Base: https://bridge.base.org
```

### Variables de Entorno

```
✅ .env creado con claves privadas
✅ DEVELOPMENT_WALLET configurado
✅ OPERATIONS_WALLET configurado
✅ MARKETING_WALLET configurado
□ TREASURY_WALLET configurado (FALTA)
□ BASE_SEPOLIA_RPC configurado
□ BASE_MAINNET_RPC configurado (opcional: Alchemy)
□ BASESCAN_API_KEY configurado (para verificación)
```

### Archivos y Configuración

```
✅ contracts/BashoodPaymentSplitter.sol
✅ scripts/deploy-payment-splitter.js
✅ scripts/deploy-bashood-complete.js
✅ .env con wallets configuradas
□ .gitignore incluye .env
□ Compilación limpia: npx hardhat compile
```

---

## 🧪 DEPLOYMENT EN TESTNET (Base Sepolia)

### Paso 1: Verificar Configuración

```bash
# Verificar que todas las wallets están configuradas
□ node -e "require('dotenv').config(); console.log('Dev:', process.env.DEVELOPMENT_WALLET); console.log('Ops:', process.env.OPERATIONS_WALLET); console.log('Mkt:', process.env.MARKETING_WALLET); console.log('Trs:', process.env.TREASURY_WALLET);"

# Verificar balances
□ npx hardhat run scripts/check-balances.js --network base-sepolia
```

### Paso 2: Deploy PaymentSplitter (Solo)

```bash
□ npx hardhat run scripts/deploy-payment-splitter.js --network base-sepolia

Verificar output:
□ PaymentSplitter address guardada
□ 4 wallets configuradas correctamente
□ Distribución 45/25/20/10 verificada
□ Test con 1 ETH exitoso (testnet)
```

### Paso 3: Deploy Ecosistema Completo

```bash
□ npx hardhat run scripts/deploy-bashood-complete.js --network base-sepolia

Verificar cada paso:
□ STEP 0: Wallets configuradas
□ STEP 1: PaymentSplitter deployed
□ STEP 2: BashoodToken deployed (1B supply)
□ STEP 3: NFT Contract deployed
□ STEP 4: Chainlink Oracle deployed
□ STEP 5: Referral System deployed
□ STEP 6: BashoodPresaleFinal deployed
□ STEP 7: BashoodRescue deployed
□ STEP 8: Presale configured
   □ Price feed set
   □ Operations wallet set
   □ Signer set
   □ Presale activated
   □ 250M BHT transferred
   □ NFTs minted
   □ NFT ID #1 allowed
□ STEP 9: PaymentSplitter verified
```

### Paso 4: Testing en Testnet

```bash
# Test 1: Compra con ETH
□ Usuario compra con 0.1 ETH
□ Recibe 25,000 BHT
□ ETH va a PaymentSplitter
□ Verificar distribución: 0.045 + 0.025 + 0.020 + 0.010 ETH

# Test 2: Compra con BHT
□ Usuario compra con 100 BHT
□ Descuento 15% aplicado (85 BHT real)
□ BHT se quema parcialmente
□ Usuario recibe NFT

# Test 3: Liberar fondos del PaymentSplitter
□ Llamar releaseAll()
□ Verificar fondos en 4 wallets
□ Development: 45%
□ Operations: 25%
□ Marketing: 20%
□ Treasury: 10%

# Test 4: Funciones de emergencia
□ pausar presale
□ reactivar presale
□ rescue de tokens si necesario
```

### Paso 5: Verificación de Contratos

```bash
# Verificar en Basescan Testnet
□ PaymentSplitter verificado
□ BashoodToken verificado
□ BashoodPresaleFinal verificado
□ BashoodRescue verificado

# Comando (reemplazar ADDRESS):
npx hardhat verify --network base-sepolia ADDRESS "constructor_args"
```

---

## 🚀 DEPLOYMENT EN MAINNET (Base Mainnet)

### Pre-Mainnet Checklist

```
CRÍTICO - Verificar antes de mainnet:
□ Todas las wallets son DIFERENTES (no usar deployer para todo)
□ Treasury wallet creada y configurada
□ Hardware wallets configurados (Ledger/Trezor recomendado)
□ Testnet deployment exitoso y testeado
□ Auditoría de seguridad completada (recomendado)
□ Multisig configurado para wallets importantes
□ Backup de .env en password manager
□ Plan de rollback documentado
```

### Paso 1: Fondos en Mainnet

```
□ 0.1 ETH en wallet de deployment (gas)
□ ETH en Base Mainnet (bridgeado desde Ethereum)
□ Verificar precio de gas antes de deploy
□ Considerar gas price strategy (esperar momento bajo)
```

### Paso 2: Deploy en Mainnet

```bash
# ⚠️ DOBLE VERIFICACIÓN antes de ejecutar
□ Revisar .env - wallets correctas
□ Verificar network: base-mainnet
□ Gas price aceptable

# Deploy
□ npx hardhat run scripts/deploy-bashood-complete.js --network base-mainnet

# GUARDAR TODAS LAS ADDRESSES INMEDIATAMENTE
```

### Paso 3: Verificación Post-Deployment

```
□ Verificar contratos en Basescan
□ Verificar PaymentSplitter distribution
□ Verificar tokenomics (25k BHT por 0.1 ETH)
□ Verificar presale activa
□ Verificar 250M BHT en presale contract
```

### Paso 4: Testing en Mainnet (con fondos reales)

```
⚠️ USAR MONTOS PEQUEÑOS PRIMERO

Test 1: Compra mínima (0.01 ETH)
□ Comprar con 0.01 ETH
□ Verificar 2,500 BHT recibidos
□ Verificar distribución en PaymentSplitter

Test 2: Liberar fondos
□ Llamar releaseAll() o release(wallet)
□ Verificar fondos llegan a 4 wallets
□ Verificar porcentajes correctos
```

---

## 📊 POST-DEPLOYMENT

### Monitoreo y Alertas

```
□ Configurar alerts para transacciones grandes
□ Monitorear balance de presale (250M BHT)
□ Tracking de ventas en tiempo real
□ Dashboard de distribución de fondos
□ Alertas de eventos críticos
```

### Documentación

```
□ Guardar deployment.json con todas las addresses
□ Documentar en README las addresses de contratos
□ Actualizar docs/DEPLOYMENT.md con info real
□ Compartir addresses públicas con equipo
□ Backup de configuración en múltiples lugares
```

### Marketing y Lanzamiento

```
□ Anunciar addresses de contratos oficiales
□ Verificar contratos en Basescan (badge verificado)
□ Publicar tokenomics oficial
□ Instrucciones para usuarios (cómo comprar)
□ FAQ de preventa
□ Support channels activos
```

### Seguridad Post-Launch

```
□ Transferir ownership a multisig
□ Revocar permisos innecesarios
□ Timelock para cambios críticos
□ Bug bounty program activado
□ Monitoring 24/7 primeras 48h
□ Plan de respuesta a incidentes
```

---

## 🔥 CONTINGENCIAS - QUÉ HACER SI...

### ❌ Deployment falla a mitad

```
Acciones:
1. NO reintentar inmediatamente
2. Revisar error en consola
3. Verificar qué contratos se deployaron
4. Decidir: ¿redeploy todo? ¿continuar desde checkpoint?
5. Documentar issue antes de siguiente intento
```

### ❌ PaymentSplitter no distribuye correctamente

```
Verificar:
1. Wallets configuradas (4 diferentes addresses)
2. Shares suman 100 (45+25+20+10)
3. Fondos están en el splitter (no enviados manualmente)
4. Llamar releaseAll() para forzar distribución

Rollback:
1. Deploy nuevo PaymentSplitter con config correcta
2. Update presale.setProjectWallet(newSplitter)
```

### ❌ Usuario no puede comprar

```
Debug checklist:
1. Presale activa? (presaleActive = true)
2. Timestamp correcto? (entre start y end)
3. NFT ID allowed? (allowNftId llamado)
4. Suficiente BHT/NFTs en contrato?
5. Precio correcto enviado (0.1 ETH)?
6. Whitelist activa y usuario no está?
```

### ❌ BHT no se transfiere correctamente

```
Verificar:
1. 250M BHT en presale contract
2. Presale tiene approval si necesario
3. Fees del token no bloquean (0.1% burn ok)
4. No hay locks/vesting aplicados
```

---

## 📝 ADDRESSES DE DEPLOYMENT

### Testnet (Base Sepolia)

```
PaymentSplitter:     [PENDING]
BashoodToken:        [PENDING]
BashoodPresaleFinal: [PENDING]
BashoodRescue:       [PENDING]
NFT Contract:        [PENDING]
PriceFeed:           [PENDING]
Referral:            [PENDING]
```

### Mainnet (Base)

```
PaymentSplitter:     [PENDING - MAINNET]
BashoodToken:        [PENDING - MAINNET]
BashoodPresaleFinal: [PENDING - MAINNET]
BashoodRescue:       [PENDING - MAINNET]
NFT Contract:        [PENDING - MAINNET]
PriceFeed:           [PENDING - MAINNET]
Referral:            [PENDING - MAINNET]
```

---

## ⚠️ BLOCKER ACTUAL

```
🚫 FALTA WALLET #4 - TREASURY

Necesitas proporcionar:
- Private key de Treasury wallet
- O generar nueva wallet

Opciones:
1. Generar nueva: npx hardhat run scripts/generate-wallet.js
2. Usar wallet existente: Proporcionar private key
3. Crear Gnosis Safe: https://safe.base.org

Una vez tengas la 4ª wallet:
1. Actualizar .env con PRIVATE_KEY_TREASURY
2. Actualizar .env con TREASURY_WALLET (address)
3. Proceder con deployment
```

---

**Estado actual**: ⚠️ 3 de 4 wallets configuradas  
**Siguiente paso**: Crear/proporcionar Treasury wallet  
**Después**: Deploy en Base Sepolia para testing

**¿Quieres que genere una nueva wallet para Treasury o tienes una existente?**
