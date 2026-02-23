# 🦊 CONFIGURACIÓN DE METAMASK PARA BASE SEPOLIA

## Fecha: 5 de Febrero 2026
## Objetivo: Preparar 5 wallets para deployment en Base Sepolia testnet

---

## 📋 WALLETS NECESARIAS

Necesitas crear **5 wallets diferentes** en Metamask:

1. **Treasury Wallet** - Recibe fees del token (0.5%)
2. **Operations Wallet** - Recibe pagos del presale
3. **Development Wallet** - PaymentSplitter (45%)
4. **Marketing Wallet** - PaymentSplitter (20%)
5. **Treasury PS Wallet** - PaymentSplitter (10%)

⚠️ **CRÍTICO**: Todas deben ser direcciones DIFERENTES

---

## 🔧 PASO 1: Instalar Metamask

Si aún no tienes Metamask:

1. Ve a: https://metamask.io/download/
2. Click en **"Install MetaMask for Chrome"** (o tu navegador)
3. Sigue el wizard de instalación
4. **IMPORTANTE**: Guarda tu frase de recuperación (12 palabras) en un lugar seguro

---

## 🌐 PASO 2: Agregar Base Sepolia a Metamask

### Opción A: Automática (Recomendada)

1. Ve a: https://chainlist.org/
2. Busca: **"Base Sepolia"**
3. Click en **"Add to Metamask"**
4. Confirma en Metamask

### Opción B: Manual

1. Abre Metamask
2. Click en el selector de red (arriba)
3. Click en **"Add Network"** → **"Add a network manually"**
4. Ingresa estos datos:

```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

5. Click en **"Save"**

---

## 👛 PASO 3: Crear las 5 Wallets

### 3.1 Wallet 1: DEPLOYER (también será Treasury)

**Esta es tu wallet principal** (ya la tienes si instalaste Metamask)

1. Abre Metamask
2. Verás: **"Account 1"**
3. Click en el ícono de cuenta (arriba derecha)
4. **"Account details"** → Copia la dirección

```
✅ Wallet 1 (Deployer/Treasury): 0x...
```

### 3.2 Wallet 2: OPERATIONS

1. En Metamask, click en el ícono de cuenta
2. **"Create account"** (o **"Add account"**)
3. Nómbrala: **"Operations"**
4. Copia la dirección

```
✅ Wallet 2 (Operations): 0x...
```

### 3.3 Wallet 3: DEVELOPMENT

1. Click en el ícono de cuenta
2. **"Create account"**
3. Nómbrala: **"Development"**
4. Copia la dirección

```
✅ Wallet 3 (Development): 0x...
```

### 3.4 Wallet 4: MARKETING

1. Click en el ícono de cuenta
2. **"Create account"**
3. Nómbrala: **"Marketing"**
4. Copia la dirección

```
✅ Wallet 4 (Marketing): 0x...
```

### 3.5 Wallet 5: TREASURY PS (PaymentSplitter)

1. Click en el ícono de cuenta
2. **"Create account"**
3. Nómbrala: **"Treasury PS"**
4. Copia la dirección

```
✅ Wallet 5 (Treasury PS): 0x...
```

---

## 🔑 PASO 4: Exportar Private Keys

**Solo necesitas la private key del DEPLOYER** (Wallet 1) para Hardhat.

### ⚠️ ADVERTENCIA DE SEGURIDAD

- **NUNCA compartas tu private key**
- **NUNCA la subas a GitHub**
- Solo úsala para testnet (Base Sepolia)
- Para mainnet, usa una wallet nueva sin fondos importantes

### Exportar Private Key:

1. En Metamask, selecciona **Account 1** (Deployer)
2. Click en los 3 puntos (⋮) → **"Account details"**
3. Click en **"Show private key"**
4. Ingresa tu contraseña de Metamask
5. **Copia la private key** (empieza con 0x...)
6. Guárdala de forma segura (NO la compartas)

```
⚠️ DEPLOYER_PRIVATE_KEY: 0x... (guardar en .env)
```

---

## 💰 PASO 5: Obtener ETH en Base Sepolia

Necesitas **~0.3 ETH** en Base Sepolia para el deployment.

### Faucets de Base Sepolia:

#### 1. Alchemy Faucet (Recomendado)
- URL: https://www.alchemy.com/faucets/base-sepolia
- Cantidad: 0.5 ETH / día
- Requiere: Cuenta Alchemy (gratis)

#### 2. Base Sepolia Faucet (Coinbase)
- URL: https://portal.cdp.coinbase.com/products/faucet
- Cantidad: 0.1 ETH / día
- Requiere: Cuenta Coinbase

#### 3. QuickNode Faucet
- URL: https://faucet.quicknode.com/base/sepolia
- Cantidad: 0.05 ETH / día
- Requiere: Cuenta QuickNode (gratis)

### Proceso:

1. Ve a cualquiera de los faucets anteriores
2. Pega tu dirección de **Wallet 1 (Deployer)**: `0x...`
3. Completa el captcha/verificación
4. Click en **"Send ETH"**
5. Espera 1-2 minutos
6. Verifica en Metamask que recibiste ETH

**Repite en varios faucets** hasta tener al menos **0.3 ETH**.

---

## 📝 PASO 6: Configurar el .env

Crea/actualiza el archivo `.env` en la raíz del proyecto:

```bash
# Wallet del deployer (con ETH para pagar gas)
DEPLOYER_PRIVATE_KEY=0x... # ⚠️ Private key de Wallet 1

# Wallets receptoras (solo direcciones públicas)
TREASURY_WALLET=0x...      # Wallet 1 (recibe fees del token 0.5%)
OPERATIONS_WALLET=0x...    # Wallet 2 (recibe pagos del presale)
DEVELOPMENT_WALLET=0x...   # Wallet 3 (PaymentSplitter 45%)
MARKETING_WALLET=0x...     # Wallet 4 (PaymentSplitter 20%)
TREASURY_PS_WALLET=0x...   # Wallet 5 (PaymentSplitter 10%)

# Signer para presale (puede ser la misma que deployer)
SIGNER_WALLET=0x...        # Wallet 1 (firma nonces del presale)

# RPC URLs
BASE_SEPOLIA_RPC=https://sepolia.base.org

# Block Explorer (para verificar contratos)
BASESCAN_API_KEY=         # Opcional, obtener en basescan.org
```

### ⚠️ Validación Crítica:

```bash
# Ejecuta esto para validar que las wallets son diferentes:
TREASURY_WALLET !== OPERATIONS_WALLET ✅
TREASURY_WALLET !== DEVELOPMENT_WALLET ✅
TREASURY_WALLET !== MARKETING_WALLET ✅
TREASURY_WALLET !== TREASURY_PS_WALLET ✅
```

---

## ✅ PASO 7: Verificar Configuración

Ejecuta este script para verificar todo:

```javascript
// scripts/verify-wallet-config.cjs
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n🔍 VERIFICANDO CONFIGURACIÓN DE WALLETS\n");
  
  const TREASURY = process.env.TREASURY_WALLET;
  const OPERATIONS = process.env.OPERATIONS_WALLET;
  const DEVELOPMENT = process.env.DEVELOPMENT_WALLET;
  const MARKETING = process.env.MARKETING_WALLET;
  const TREASURY_PS = process.env.TREASURY_PS_WALLET;
  
  console.log("📋 Direcciones configuradas:");
  console.log(`  Treasury:    ${TREASURY}`);
  console.log(`  Operations:  ${OPERATIONS}`);
  console.log(`  Development: ${DEVELOPMENT}`);
  console.log(`  Marketing:   ${MARKETING}`);
  console.log(`  Treasury PS: ${TREASURY_PS}\n`);
  
  // Validar que son diferentes
  const wallets = [TREASURY, OPERATIONS, DEVELOPMENT, MARKETING, TREASURY_PS];
  const unique = new Set(wallets);
  
  if (unique.size !== wallets.length) {
    console.log("❌ ERROR: Hay wallets duplicadas!");
    process.exit(1);
  }
  
  console.log("✅ Todas las wallets son diferentes\n");
  
  // Verificar balance del deployer
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("💰 Balance del deployer:");
  console.log(`  Address: ${deployer.address}`);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH\n`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  ADVERTENCIA: Balance bajo. Necesitas al menos 0.3 ETH");
    console.log("   Visita faucets de Base Sepolia\n");
  } else {
    console.log("✅ Balance suficiente para deployment\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Ejecuta:
```bash
npx hardhat run scripts/verify-wallet-config.cjs --network baseSepolia
```

---

## 🎯 CHECKLIST FINAL

Antes de hacer el deployment, verifica:

- [ ] Metamask instalado y configurado
- [ ] Base Sepolia agregada a Metamask
- [ ] 5 wallets creadas y nombradas
- [ ] Private key del deployer exportada
- [ ] Al menos 0.3 ETH en wallet del deployer
- [ ] Archivo .env configurado correctamente
- [ ] Todas las wallets son diferentes (validado)
- [ ] Script de verificación ejecutado exitosamente

---

## 🚀 PRÓXIMOS PASOS

Una vez completado este setup:

1. ✅ Verificar configuración con `verify-wallet-config.cjs`
2. ✅ Compilar contratos: `npx hardhat compile`
3. ✅ Ejecutar deployment: `npx hardhat run scripts/deploy-baseSepolia.cjs --network baseSepolia`
4. ✅ Verificar contratos en Basescan
5. ✅ Probar compras en testnet

---

## 📚 RECURSOS

- **Metamask**: https://metamask.io/
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Chainlist**: https://chainlist.org/
- **Alchemy Faucet**: https://www.alchemy.com/faucets/base-sepolia
- **Base Docs**: https://docs.base.org/

---

## ⚠️ SEGURIDAD - IMPORTANTE

### Para Testnet (Base Sepolia):
- ✅ Puedes usar wallets de prueba
- ✅ ETH de faucets (sin valor real)
- ✅ Exportar private keys está OK

### Para Mainnet (Base):
- ❌ NUNCA uses las mismas wallets de testnet
- ❌ NUNCA compartas private keys
- ❌ NUNCA subas .env a GitHub
- ✅ Considera usar hardware wallet (Ledger/Trezor)
- ✅ Usa wallets multisig para fondos importantes
- ✅ Haz auditoría de seguridad profesional

---

**Última actualización**: 5 de Febrero 2026  
**Network**: Base Sepolia (Testnet)  
**Status**: ✅ Listo para configuración  
**Siguiente paso**: Crear wallets y obtener ETH de faucets
