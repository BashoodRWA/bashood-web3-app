# 🏗️ BASHOOD V1: TECHNICAL ARCHITECTURE OVERVIEW

**Documento Técnico Ejecutivo**  
**Fecha:** 17 Febrero 2026  
**Propósito:** Entender la arquitectura, flujos económicos y control administrativo EXACTOS

---

## 1️⃣ ARQUITECTURA GENERAL

### Contratos del Ecosistema

```
📦 BASHOOD ECOSYSTEM (4 contratos principales)

├─ BashoodToken.sol (266 líneas)
│  └─ ERC20 con burn + treasury fee automáticos
│
├─ BashoodPresaleFinal.sol (689 líneas)
│  └─ Presale NFT + pagos ETH/BHT + oracle Chainlink
│
├─ BashoodMultiToken.sol (118 líneas)
│  └─ ERC1155 para tokenización de activos RWA
│
└─ BashoodRescue.sol (170 líneas)
   └─ Custodia y emergency rescue de activos
```

### Rol de cada contrato

| Contrato | Propósito | Interacción con |
|----------|-----------|-----------------|
| **BashoodToken** | Token governance + utilidad | Presale (mint), Users (transfers), Treasury |
| **BashoodPresaleFinal** | Venta de NFTs | Token (pago), NFT (mint), Referral, Rescue |
| **BashoodMultiToken** | NFTs de activos RWA | Presale (mint), Marketplace (futuro) |
| **BashoodRescue** | Emergency recovery | Presale (rescate de NFTs/tokens) |

---

### Diagrama de Flujo (texto)

```
┌──────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO                             │
└──────────────────────────────────────────────────────────────┘

1️⃣ PRESALE FLOW:
   User (ETH) → BashoodPresaleFinal
                 ├→ NFT minted (BashoodMultiToken)
                 ├→ Referral bonus (if applicable)
                 └→ ETH to projectWallet

   User (BHT) → BashoodPresaleFinal
                 ├→ BHT burned (burnBps %)
                 ├→ NFT minted (BashoodMultiToken)
                 └→ Remaining BHT to presale

2️⃣ TOKEN TRANSFER FLOW:
   User A → transfer(100 BHT) → User B
   
   Split automático:
   ├→ 0.1 BHT burned (burnRate = 10 basis points)
   ├→ 0.5 BHT to treasuryWallet (treasuryFee = 50 basis points)
   └→ 99.4 BHT to User B

3️⃣ TREASURY FLOW:
   treasuryWallet (holds fees)
   
   Owner puede:
   ├→ sendToTreasury(amount) → mover tokens manualmente
   ├→ sendToStaking(amount) → enviar a staking (actualmente address(0))
   └→ periodicBurn(amount) → quemar adicional

   ⚠️ NO HAY distribución automática a holders

4️⃣ RESCUE FLOW (emergencia):
   BashoodRescue contract
   ├→ ADMIN: rescue NFTs/tokens no vendidos
   └→ EMERGENCY: withdraw ETH en emergencia
```

---

## 2️⃣ FLUJO ECONÓMICO EXACTO

### Caso A: Compra en Presale con ETH

```solidity
// Input: User envía 1 ETH
// Precio NFT: 0.01 ETH (ejemplo)

PASO 1: Usuario llama buyNFTWithETH(nftId, 0.01 ETH)
PASO 2: Chainlink oracle consulta precio ETH/USD
PASO 3: Validación:
        - msg.value == nftPriceETH ✓
        - presaleActive == true ✓
        - totalNFTsSold < maxNFTSupply ✓
        - maxPerUser no excedido ✓

PASO 4: Mint NFT
        nftContract.mint(user, nftId, 1)

PASO 5: Procesamiento ETH:
        - Si hay referral: 10% va a referrer
        - 90% (o 100%) va a projectWallet

RESULTADO:
├─ User recibe: 1 NFT (ERC1155)
├─ Project recibe: 0.01 ETH
└─ Referrer (si existe): 0.001 ETH
```

### Caso B: Compra en Presale con BHT

```solidity
// Input: User envía 1000 BHT
// Precio NFT: 1000 BHT con descuento 500 bps (5%)
// Effective price: 950 BHT

PASO 1: Usuario aprueba allowance(presale, 1000 BHT)
PASO 2: Usuario llama buyNFTWithBHT(nftId)
PASO 3: Presale verifica descuento:
        effectivePrice = nftPriceBHT * (10000 - bhtDiscountBps) / 10000
        effectivePrice = 1000 * 9500 / 10000 = 950 BHT

PASO 4: Presale calcula burn:
        burnAmount = effectivePrice * burnBps / 10000
        burnAmount = 950 * [burnBps] / 10000

PASO 5: Transfer BHT:
        - bashoodToken.transferFrom(user, presale, effectivePrice)
        
PASO 6: Burn BHT:
        - bashoodToken.burnFrom(presale, burnAmount)
        
PASO 7: Mint NFT:
        - nftContract.mint(user, nftId, 1)

RESULTADO:
├─ User recibe: 1 NFT
├─ User paga: 950 BHT (con descuento 5%)
├─ Burned: [burnAmount] BHT
└─ Presale retiene: 950 - burnAmount BHT
```

### Caso C: Transfer de BHT entre usuarios

```solidity
// Input: User A transfiere 100 BHT a User B

PASO 1: User A llama transfer(UserB, 100)

PASO 2: Cálculo automático de fees:
        burnAmount = 100 * 10 / 10000 = 0.1 BHT
        feeAmount  = 100 * 50 / 10000 = 0.5 BHT
        sendAmount = 100 - 0.1 - 0.5 = 99.4 BHT

PASO 3: Ejecución:
        - _burn(UserA, 0.1)        → totalSupply reduce
        - _transfer(UserA, treasury, 0.5) → treasury acumula
        - _transfer(UserA, UserB, 99.4)   → UserB recibe

PASO 4: Eventos:
        - TokensBurned(UserA, 0.1)
        - FeeToTreasury(UserA, 0.5)
        - Transfer(UserA, UserB, 99.4)

RESULTADO:
├─ UserA balance: -100 BHT
├─ UserB balance: +99.4 BHT
├─ Treasury balance: +0.5 BHT
├─ Total supply: -0.1 BHT (quemado)
└─ totalBurned counter: +0.1
    totalToTreasury counter: +0.5
```

---

## 3️⃣ MAPA DE PODER ADMINISTRATIVO

### A. BashoodToken.sol - Funciones onlyOwner

| Función | Parámetro | Actual | Límites | Consecuencia |
|---------|-----------|--------|---------|--------------|
| `setTreasuryWallet()` | address | [deployer choice] | ninguno | Cambiar destino de fees |
| `setStakingContract()` | address | address(0) | ninguno | Activar staking futuro |
| `setBurnRate()` | uint256 | 10 (0.1%) | max 100 (1%) | Aumentar burn |
| `setTreasuryFee()` | uint256 | 50 (0.5%) | max 200 (2%) | Aumentar fee |
| `periodicBurn()` | uint256 | N/A | balance del owner | Quemar tokens extra |
| `sendToTreasury()` | uint256 | N/A | balance del owner | Mover tokens |
| `sendToStaking()` | uint256 | N/A | balance del owner | Enviar a staking (si existe) |
| `requestPause()` | - | - | - | Iniciar timelock 24h |
| `executePause()` | - | - | requiere requestPause | Pausar token |
| `cancelPauseRequest()` | - | - | - | Cancelar pause |
| `requestUnpause()` | - | - | - | Iniciar timelock 24h |
| `executeUnpause()` | - | - | requiere requestUnpause | Reanudar token |
| `cancelUnpauseRequest()` | - | - | - | Cancelar unpause |

**Total funciones owner:** 13

**Funciones sin timelock (inmediatas):** 10  
**Funciones con timelock (24h):** 3 (pause/unpause)

---

### B. BashoodPresaleFinal.sol - Funciones onlyRole

| Rol | Función | Parámetro | Consecuencia |
|-----|---------|-----------|--------------|
| **ADMIN_ROLE** | `setOperationsWallet()` | address | Cambiar wallet operaciones |
| **ADMIN_ROLE** | `setPriceFeed()` | address | Cambiar oracle Chainlink |
| **ADMIN_ROLE** | `setMaxPriceStaleness()` | uint32 | Límite staleness oracle |
| **ADMIN_ROLE** | `setBurnBps()` | uint16 | Cambiar % burn en BHT payment |
| **ADMIN_ROLE** | `setDiscountBps()` | uint16 | Cambiar descuento BHT |
| **ADMIN_ROLE** | `pause()` | - | Pausar presale (inmediato) |
| **ADMIN_ROLE** | `unpause()` | - | Reanudar presale (inmediato) |
| **ADMIN_ROLE** | `startPresale()` | - | Activar presale |
| **ADMIN_ROLE** | `endPresale()` | - | Terminar presale |
| **ADMIN_ROLE** | `finalizePresale()` | - | Enviar fondos a proyecto |
| **ADMIN_ROLE** | `setWhitelistEnabled()` | bool | Activar/desactivar whitelist |
| **ADMIN_ROLE** | `setMaxPerUser()` | uint256 | Cambiar límite por usuario |
| **ADMIN_ROLE** | `setSigner()` | address | Cambiar signer whitelist |
| **ADMIN_ROLE** | `setRescueContract()` | address | Asignar contrato rescue |
| **ADMIN_ROLE** | `rescueUnsoldNFTs()` | nftId, to, amount | Extraer NFTs no vendidos |
| **ADMIN_ROLE** | `rescueERC20()` | token, to, amount | Extraer tokens |
| **ADMIN_ROLE** | `assignRoles()` | admin, emergency, whitelist | Asignar roles |
| **EMERGENCY_ROLE** | `emergencyWithdrawETH()` | - | Retirar TODO el ETH |

**Total funciones ADMIN_ROLE:** 17  
**Total funciones EMERGENCY_ROLE:** 1

**Funciones sin timelock:** TODAS (18)

---

### C. BashoodMultiToken.sol - Funciones onlyOwner/onlyRole

| Rol | Función | Parámetro | Consecuencia |
|-----|---------|-----------|--------------|
| **onlyOwner** | `mintAllNFTs()` | - | Acuñar 30 NFTs iniciales |
| **MINTER_ROLE** | `mint()` | to, id, amount | Acuñar NFT individual |
| **MINTER_ROLE** | `mintBatch()` | to, ids, amounts | Acuñar NFTs batch |
| **DEFAULT_ADMIN_ROLE** | `grantMinterRole()` | address | Dar permisos minter |
| **DEFAULT_ADMIN_ROLE** | `revokeMinterRole()` | address | Quitar permisos minter |

**Total funciones:** 5  
**Funciones sin timelock:** TODAS

---

### D. BashoodRescue.sol - Funciones onlyRole

| Rol | Función | Parámetro | Consecuencia |
|-----|---------|-----------|--------------|
| **ADMIN_ROLE** | `setProjectWallet()` | address payable | Establecer wallet (1 vez) |
| **ADMIN_ROLE** | `rescueUnsoldNFTs()` | nft, id, to, amount | Extraer NFTs custodiados |
| **ADMIN_ROLE** | `rescueERC20()` | token, to, amount | Extraer tokens custodiados |
| **EMERGENCY_ROLE** | `emergencyWithdrawETH()` | - | Programar retiro ETH |
| **[authorized]** | `claimEmergencyWithdrawal()` | - | Reclamar ETH programado |

**Total funciones:** 5  
**Funciones sin timelock:** TODAS (pull-payment pattern reduce riesgo)

---

## 4️⃣ PUNTOS INMUTABLES (HARDCODED)

### ✅ Lo que NO PUEDE cambiar después de deploy

#### BashoodToken.sol

```solidity
// IMMUTABLE DESDE CONSTRUCTOR:
string public name = "BashoodToken"
string public symbol = "BHT"
uint256 public totalSupply = 1,000,000,000 * 1e18 (inicial)
uint256 public constant DENOMINATOR = 10000
uint256 public constant PAUSE_DELAY = 24 hours

// LÍMITES HARDCODED:
uint256 private constant _MAX_BURN_RATE = 100     // 1% max
uint256 private constant _MAX_TREASURY_FEE = 200  // 2% max

// MECANISMO DE BURN:
→ Es automático en transfer/transferFrom
→ No se puede "apagar" el burn (solo reducir a 0)
→ Cálculo: (amount * burnRate) / DENOMINATOR
```

#### BashoodPresaleFinal.sol

```solidity
// IMMUTABLE DESDE CONSTRUCTOR:
IERC20 public immutable bashoodToken       // address fijo
IERC1155 public immutable nftContract      // address fijo
BashoodReferral public immutable referralContract  // address fijo
address payable public immutable projectWallet     // address fijo
address public immutable deployer          // address fijo

uint256 public immutable nftPriceETH       // precio fijo
uint256 public immutable nftPriceBHT       // precio fijo
uint256 public immutable presaleStart      // timestamp fijo
uint256 public immutable presaleEnd        // timestamp fijo
uint256 public immutable maxNFTSupply      // supply cap fijo

// LÍMITES HARDCODED:
uint256 private constant _MAX_BPS = 10000
```

#### BashoodMultiToken.sol

```solidity
// IMMUTABLE DESDE CONSTRUCTOR:
address public owner                       // initialOwner
uint256 public constant BASHOOD_TOKEN = 1  // ID fijo
uint256 public constant BASHOOD_NFT = 2    // ID fijo
uint256 private constant _MAX_NFT_COUNT = 30  // max 30 NFTs

// MECANISMO FIJO:
→ mintAllNFTs() solo puede ejecutarse UNA VEZ
→ nftCounter se incrementa irreversiblemente
```

#### BashoodRescue.sol

```solidity
// IMMUTABLE DESDE CONSTRUCTOR:
→ ADMIN_ROLE y EMERGENCY_ROLE establecidos en constructor
→ NO hay función para cambiar roles raíz sin DEFAULT_ADMIN_ROLE

// LIMITACIÓN ADICIONAL:
setProjectWallet() solo puede ejecutarse UNA VEZ
→ require(projectWallet == address(0), "Rescue: wallet already set")
```

---

### ⚠️ Lo que SÍ PUEDE cambiar (mutable)

#### BashoodToken.sol - MUTABLE

```
✗ treasuryWallet → puede redirigir fees a otra address
✗ stakingContract → puede activarse staking futuro
✗ burnRate → puede aumentarse hasta 1% (de 0.1% actual)
✗ treasuryFee → puede aumentarse hasta 2% (de 0.5% actual)
```

#### BashoodPresaleFinal.sol - MUTABLE

```
✗ operationsWallet → puede cambiar
✗ priceFeed → puede cambiar oracle
✗ burnBps → puede cambiar % burn BHT
✗ bhtDiscountBps → puede cambiar descuento BHT
✗ maxPriceStaleness → puede cambiar staleness limit
✗ whitelistEnabled → puede activar/desactivar
✗ maxPerUser → puede cambiar límite compra
✗ signerAddress → puede cambiar signer whitelist
✗ rescueContract → puede asignar/cambiar
```

#### BashoodMultiToken.sol - MUTABLE

```
✗ rate → puede cambiar (aunque en V1 parece no usarse económicamente)
✗ MINTER_ROLE → puede asignarse a otras addresses
```

---

## 📊 RESUMEN EJECUTIVO

```
CONTRATOS:             4 principales
FUNCIONES TOTAL:       41 administrativas
FUNCIONES onlyOwner:   13 (BashoodToken)
FUNCIONES onlyRole:    28 (Presale + MultiToken + Rescue)

TIMELOCK ACTUAL:       Solo en pause/unpause Token (24h)
TIMELOCK EN ECONÓMICO: NINGUNO (0 funciones protegidas)
MULTISIG ACTUAL:       NINGUNO

PARÁMETROS MUTABLES:   16 económicos
PARÁMETROS INMUTABLES: 14 hardcoded

RIESGO REGULATORIO:    🔴 ALTO (términos mutables post-venta sin DAO)
```

---

## 🎯 CONCLUSIÓN TÉCNICA

**Arquitectura es sólida, pero gobierno es centralizado.**

**Problema:** Owner/Admin puede cambiar 16 parámetros económicos sin timelock ni DAO.

**Solución necesaria:** Multisig + Timelock + DAO governance (Fase 2 de implementación).

---

**Documento finalizado:** 17/02/2026 - LISTO PARA DISEÑO DE MEJORAS
