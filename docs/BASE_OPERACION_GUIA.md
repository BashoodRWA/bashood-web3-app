# 🔵 BASE BLOCKCHAIN - GUÍA DE CONFIGURACIÓN Y OPERACIÓN

## 1. CONFIGURACIÓN INICIAL

### 1.1 Preparar variables de entorno

Copia `.env.example` a `.env` en el root del proyecto:

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# === BASE NETWORK RPCS ===
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# === PRIVATE KEYS ===
BASE_SEPOLIA_PRIVATE_KEY=your_sepolia_private_key_here
BASE_MAINNET_PRIVATE_KEY=your_mainnet_private_key_here

# === WALLET ADDRESSES ===
OWNER_ADDRESS=0x...      # Dirección del owner del proyecto
PROJECT_WALLET=0x...     # Wallet que recibe fondos
OPS_WALLET=0x...         # Wallet de operaciones

# === API KEYS ===
BASESCAN_API_KEY=your_basescan_api_key_here
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here

# === DEPLOYMENT CONFIG ===
PRESALE_START_OFFSET=3600    # Cuántos segundos desde ahora comienza la presale
PRESALE_DURATION_DAYS=30      # Duración en días de la presale
MAX_NFT_SUPPLY=1000           # Supply máximo de NFTs
NFT_PRICE_ETH=0.1             # Precio del NFT en ETH
NFT_PRICE_BHT=100             # Precio del NFT en BHT

# === NETWORK SELECTION ===
DEFAULT_NETWORK=base-sepolia  # o base-mainnet para producción
```

### 1.2 Obtener RPC endpoints

**Base Sepolia (Testnet - RECOMENDADO PARA TESTING)**:
- Endpoint público: `https://sepolia.base.org`
- Chain ID: `84532`
- Faucet: https://www.base.org/docs/using-base/quickstart#faucet

**Base Mainnet (Producción)**:
- Endpoint público: `https://mainnet.base.org`
- Chain ID: `8453`
- Requiere ETH real para gas

### 1.3 Obtener claves privadas

⚠️ **IMPORTANTE**: Nunca commits tus claves privadas. Usar siempre variables de entorno.

Para generar una nueva wallet:

```bash
npm install -g ganache-cli
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('PrivateKey:', w.privateKey);"
```

### 1.4 Verificar conexión a Base

```bash
npx hardhat accounts --network base-sepolia
npx hardhat run scripts/check-base-connection.js --network base-sepolia
```

---

## 2. DEPLOYMENT A BASE

### 2.1 Pre-deployment Checklist

- [ ] `.env` configurado correctamente
- [ ] Wallet deployer tiene balance en Base (ETH para gas)
- [ ] Testnet: Use Base Sepolia para testing
- [ ] Mainnet: Use Base Mainnet solo después de testing completo
- [ ] Verificar hardhat.config.js tiene Base networks configurados

### 2.2 Deploy a Base Sepolia (Testnet)

```bash
# 1. Compilar contratos
npx hardhat compile

# 2. Deploy a Sepolia
npx hardhat run scripts/deploy-base.js --network base-sepolia

# Salida esperada:
# ✅ BashoodToken deployed to: 0x...
# ✅ MockNFT1155 deployed to: 0x...
# ✅ BashoodPresale deployed to: 0x...
# etc.
```

**El script generará un archivo** `deployment-base-sepolia-TIMESTAMP.json` con todas las direcciones.

### 2.3 Deploy a Base Mainnet (Producción)

```bash
# SOLO después de testing completo en Sepolia
npx hardhat run scripts/deploy-base.js --network base-mainnet
```

---

## 3. FLUJO DE OPERACIÓN EN BASE

### 3.1 Presale Workflow

```
1. SETUP
   ├─ Deploy contratos (deploy-base.js)
   ├─ Configurar presale (timestamps, precios)
   ├─ Transferir NFTs a presale contract
   └─ Activar presale

2. OPERACIÓN
   ├─ Usuarios compran NFTs con ETH o BHT
   ├─ Monitor gas prices (Base es ~100x más barato que Ethereum)
   ├─ Procesar pagos y emitir NFTs
   └─ Track presale metrics

3. FINALIZACIÓN
   ├─ Transferir fondos de presale a treasury
   ├─ Quemar/transferir NFTs no vendidos
   ├─ Pausar presale
   └─ Generar reporte final
```

### 3.2 Minting NFT Workflow

```bash
# Script para mintear NFTs en Base
# (ver section 4.2 para script)

npx hardhat run scripts/mint-nft-base.js --network base-sepolia \
  --presale-address 0x... \
  --amount 100 \
  --token-id 1
```

### 3.3 Operaciones Diarias

```bash
# Check presale status
npx hardhat run scripts/presale-status.js --network base-sepolia

# Get price feed data
npx hardhat run scripts/check-oracle.js --network base-sepolia

# Check NFT balances
npx hardhat run scripts/check-nft-balance.js --network base-sepolia

# Get presale metrics
npx hardhat run scripts/presale-metrics.js --network base-sepolia
```

---

## 4. SCRIPTS ÚTILES PARA BASE

### 4.1 Verificar conexión a Base

```bash
# Script: scripts/check-base-connection.js
cat > scripts/check-base-connection.js << 'EOF'
const hre = require("hardhat");

async function main() {
  console.log("Checking Base connection...");
  const provider = hre.ethers.provider;
  
  const blockNumber = await provider.getBlockNumber();
  const gasPrice = await provider.getGasPrice();
  const networkName = hre.network.name;
  
  console.log("✅ Connected to:", networkName);
  console.log("📦 Block number:", blockNumber);
  console.log("⛽ Gas price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
}

main().catch(console.error);
EOF

npx hardhat run scripts/check-base-connection.js --network base-sepolia
```

### 4.2 Mintear NFTs

```bash
# Script: scripts/mint-nft-base.js
cat > scripts/mint-nft-base.js << 'EOF'
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Cargar deployment info
  const deploymentFile = process.argv[4];
  const deployment = require(deploymentFile);
  
  const nftContract = await hre.ethers.getContractAt(
    "contracts/mocks/MockNFT1155.sol:MockNFT1155",
    deployment.contracts.mockNFT
  );
  
  console.log("Minting NFTs to presale...");
  const tx = await nftContract.mint(
    deployment.contracts.bashoodPresale,
    1,  // tokenId
    100, // amount
    "0x"
  );
  
  await tx.wait();
  console.log("✅ NFTs minted");
}

main().catch(console.error);
EOF
```

### 4.3 Verificar contratos en Basescan

```bash
# Después de deployment, verificar en Basescan
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS

# Ejemplo:
npx hardhat verify --network base-sepolia 0x1234567890123456789012345678901234567890

# Con constructor args:
npx hardhat verify --network base-sepolia 0x1234567890123456789012345678901234567890 \
  "0xOwnerAddress" \
  "0xTokenAddress" \
  "0xReferralAddress"
```

---

## 5. GAS OPTIMIZATION EN BASE

### 5.1 Ventajas de Base

| Métrica | Base | Ethereum |
|---------|------|----------|
| Gas Price | ~0.01 gwei | 20-50 gwei |
| Tx Cost | $0.01 - $0.10 | $5 - $50 |
| Confirmación | ~2 segundos | ~13 segundos |
| Final | Inmediato | 15-20 bloques |

### 5.2 Estimaciones de costo en Base Sepolia

```bash
# Check current gas prices
curl -s https://sepolia.base.org | jq .

# Presale TX costs (aproximado):
# - Mint NFT: 0.0001 ETH ($0.0003)
# - Set presale params: 0.00005 ETH ($0.00015)
# - Transfer tokens: 0.00008 ETH ($0.00024)
```

---

## 6. MONITOREO Y DEBUGGING

### 6.1 Revisar transacciones en Basescan

```
Sepolia: https://sepolia.basescan.org/
Mainnet: https://basescan.org/

Buscar:
- Tx hash
- Contract address
- Wallet address
```

### 6.2 Debug con Hardhat

```bash
# Habilitar debug logging
DEBUG=* npx hardhat run scripts/deploy-base.js --network base-sepolia

# Run script con revert tracing
npx hardhat run scripts/deploy-base.js --network base-sepolia --show-stack-traces
```

### 6.3 Common Issues

| Problema | Solución |
|----------|----------|
| "insufficient funds for gas" | Verificar balance en wallet deployer |
| "invalid private key" | Revisar formato en .env (sin 0x prefix si es necessary) |
| "network request failed" | Verificar RPC endpoint, internet connection |
| "contract not verified" | Usar: `npx hardhat verify --network base-sepolia ...` |
| "reverted: ..." | Check error messages en presale contract logs |

---

## 7. CHECKLIST FINAL PRE-PRODUCCIÓN

### Antes de ir a Base Mainnet

- [ ] Contratos deployados y testeados en Base Sepolia
- [ ] Presale completamente funcional en testnet
- [ ] Minting de NFTs validado
- [ ] Referral system operativo
- [ ] Oracle/price feed funcionando
- [ ] Rescue mechanisms testeados
- [ ] Contracts verificados en Basescan Sepolia
- [ ] Gas prices confirmadas en mainnet
- [ ] Documentación interna actualizada
- [ ] Team training completado
- [ ] Wallets de producción seguras (cold storage, multisig)
- [ ] Backup de contratos y deployment info
- [ ] Audit de seguridad completado (si es necesario)
- [ ] Monitoring setup listo

### Antes del primer deployment a Mainnet

```bash
# Final verification
npx hardhat run scripts/check-base-connection.js --network base-mainnet
npx hardhat verify --network base-mainnet PRESALE_ADDRESS [args...]

# Confirm
echo "✅ Ready for mainnet deployment"
```

---

## 8. REFERENCIAS Y RECURSOS

**Documentation**:
- https://docs.base.org/
- https://docs.base.org/using-base/quick-start
- https://basescan.org/

**Tools**:
- Basescan (Block Explorer): https://basescan.org/
- Base Faucet (Testnet): https://www.base.org/docs/using-base/quickstart#faucet

**Community**:
- Base Discord: https://discord.gg/buildonbase
- GitHub: https://github.com/base-org

---

**Last Updated**: 2024-11-27
**Status**: ✅ Ready for Base integration
