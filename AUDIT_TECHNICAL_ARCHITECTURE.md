# 🔧 AUDIT: TECHNICAL ARCHITECTURE ASSESSMENT

**Code-Level Regulatory Risk Analysis**  
**Fecha:** 17 Febrero 2026  
**Estado:** CONFIDENTIAL - Auditoría Interna  
**Objetivo:** Verificar si contratos implementan mecanismos que contradicen narrativa defensible

---

## ⚠️ EXECUTIVE SUMMARY

**Code Risk Level: MEDIO**

El código es **técnicamente limpio** de mecanismos de "profit distribution". Sin embargo, contiene **flexibilidad de parámetros post-sale** que crea riesgo regulatorio de "modificación de términos de inversión".

### Key Finding:
```
La narrativa puede defenderse en código.
El problema NO es "contratos distribuyen beneficios".
El problema ES "owner tiene poder para cambiar términos económicos después de la presale".
```

---

## 📋 AUDIT DETALLADO

### 1. REVISIÓN DE CONTRATOS PRINCIPALES

#### 🔍 BashoodToken.sol (266 líneas)

**Análisis:**

```solidity
// Burn mechanism
uint256 public burnRate = 10;        // 0.1% - HARDCODED en constructor

// Treasury fee
uint256 public treasuryFee = 50;     // 0.5% - HARDCODED en constructor

// En transfer():
uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
super._transfer(sender, recipient, sendAmount);
```

**¿Hay mecanismo de "profit distribution"?**

❌ NO. Los fees van directamente a:
- `burn` = quemados (no se redistribuyen)
- `treasuryWallet` = wallet específica (no multiplicado entre holders)

**¿Son los fees un "rendimiento de inversión"?**

⚠️ **POTENCIALMENTE PROBLEMÁTICO:**

```
Escenario 1 (SAFE):
- Si treasuryWallet es usada para desarrollo
- Y los fondos de desarrollo benefician al protocolo general (no a holders específicos)
- → Entonces NO es "profit sharing"

Escenario 2 (RIESGO):
- Si treasuryWallet distribuye fondos
- Bonuses, rewards, o dividends a holders
- → Entonces recurve a "expectativa de beneficio indirecto"
```

**¿Quién controla treasuryWallet?**

```solidity
function setTreasuryWallet(address newWallet) external onlyOwner {
    treasuryWallet = newWallet;
}
```

✅ **Es changeable, no hardcoded** - Auditar dónde va treasury realmente.

---

#### 🔍 BashoodPresaleFinal.sol (689 líneas)

**Parámetros Económicos Críticos:**

```solidity
address payable public immutable projectWallet;     // ✅ IMMUTABLE - OK
address public operationsWallet;                     // ⚠️ MUTABLE - RISK

uint16 public bhtDiscountBps;                        // ⚠️ MUTABLE - RISK
uint16 public burnBps;                               // ⚠️ MUTABLE - RISK

// Setters:
function setBHTDiscountBps(uint16 newBps) 
    external onlyRole(ADMIN_ROLE) { ... }

function setBurnBps(uint16 newBps) 
    external onlyRole(ADMIN_ROLE) { ... }

function setOperationsWallet(address newWallet) 
    external onlyRole(ADMIN_ROLE) { ... }
```

**🔴 CRITICAL FINDING:**

```
paymentTerms CAN BE CHANGED POST-SALE

Si alguien compra expecting:
├─ "BHT discount 20%"
├─ "Burn 15%"
└─ "Ops fees 65%"

El owner PUEDE cambiar a:
├─ "BHT discount 0%"
├─ "Burn 0%"
└─ "Ops fees 100%"

Esto es "modificación unilateral de términos"
= regulador lo ve como "investors' terms changed without consent"
```

**¿Hay mecanismo automático de "profit distribution"?**

```solidity
// NFT purchase:
function purchaseWithETH(...) {
    nftContract.safeTransferFrom(address(this), msg.sender, nftId, quantity, "");
    emit AssetPurchased(msg.sender, nftId, quantity, msg.value);
}

// NO hay:
// - Dividend redistribution
// - APY calculation
// - Automatic reward distribution
```

✅ **NO, no hay mecanismo automático.** El código es limpio en este sentido.

**Pero: ¿A quién van los fondos de presale?**

```solidity
// En purchaseWithETH:
// ETH simplemente se guarda en el contrato
// Al final, owner retira via rescue contract

// En purchaseWithBHT:
// BHT se send a operationsWallet o se burn
```

⚠️ **El flujo no está documentado en contratos.** El dónde-van-los-fondos depende de operationsWallet que ES MUTABLE.

---

#### 🔍 BashoodMultiToken.sol (ERC1155)

**Análisis:**

```solidity
mapping(address => uint256) public contributions;    // Tracks contributions
mapping(uint256 => address) public nftOwners;        // Tracks NFT owners

// NO hay:
function claimRewards() { ... }  // ❌
function getAPY() { ... }        // ❌
function distributeEarnings() { ... } // ❌
```

✅ **CLEAN.** No hay mecanismo de rewards o distribución.

---

### 2. ANÁLISIS DE FLUJOS CRÍTICOS

#### Flujo 1: ¿A dónde van los fondos de presale?

```solidity
// EVENT en purchaseWithETH:
emit AssetPurchased(msg.sender, nftId, quantity, msg.value);
// ETH se queda en address(this) - donde termina?

// Presale finaliza via:
function endPresale() external onlyRole(ADMIN_ROLE) { ... }

// Luego... ¿retiro?
function rescueERC20(...) external onlyRole(ADMIN_ROLE) {
    // Rescata fondos via rescue contract
}
```

⚠️ **RIESGO:** "Rescue" mecanismo no es claro. Parece que admin tiene poder total sobre fondos.

---

#### Flujo 2: BHT y Fee Distribution

```solidity
// En purchaseWithBHT:
if (burnAmount > 0) {
    bashoodToken.burnFrom(msg.sender, burnAmount);  // QUEMADO
}
if (opsAmount > 0) {
    bashoodToken.transferFrom(msg.sender, operationsWallet, opsAmount); // A WALLET
}
```

✅ **LIMPIO.** Quemado o enviado a operationsWallet (que es mutable, pero claro).

---

### 3. MATRIZ DE RIESGO TÉCNICO

| Elemento | Código Status | Riesgo Regulatorio | Crítico |
|----------|---|---|---|
| Burn mechanism (0.1%) | Hardcoded en constructor | ✅ OK | ✅ |
| Treasury fee (0.5%) | Hardcoded en constructor | ✅ OK | ✅ |
| Profit distribution | ❌ NO EXISTE | ✅ OK | ✅ |
| APY mechanism | ❌ NO EXISTE | ✅ OK | ✅ |
| Staking rewards | ❌ NO EXISTE | ✅ OK | ✅ |
| **bhtDiscountBps mutability** | ⚠️ Changeable via ADMIN | 🔴 RIESGO | ⚠️ |
| **burnBps mutability** | ⚠️ Changeable via ADMIN | 🔴 RIESGO | ⚠️ |
| **operationsWallet mutability** | ⚠️ Changeable via ADMIN | 🔴 RIESGO | ⚠️ |
| **treasuryWallet mutability** | ⚠️ Changeable via ADMIN | 🔴 RIESGO | ⚠️ |
| Oracle usage | Chainlink ETH/USD | ✅ OK | ✅ |
| NFT ownership | Clear (mapping) | ✅ OK | ✅ |
| Roles (Ownable) | ADMIN_ROLE + others | ⚠️ Centralized | ⚠️ |
| Upgradeability | ❌ NO PROXIES | ✅ OK | ✅ |
| Reentrancy protection | ReentrancyGuard | ✅ OK | ✅ |

---

## 🚨 CRITICAL FINDINGS - IMMUTABILITY vs MUTABILITY

### ❌ Hallazgo #1: Owner puede cambiar términos económicos

**Código actual:**

```solidity
// En BashoodToken.sol:
burnRate = 10;  // 0.1% - SI EST CHANGEABLE
treasuryFee = 50; // 0.5% - SI ES CHANGEABLE

// En BashoodPresaleFinal.sol:
bhtDiscountBps; // CHANGEABLE
burnBps; // CHANGEABLE
operationsWallet; // CHANGEABLE

// Via:
function setBurnRate(uint256 newRate) external onlyOwner { ... }
function setOperationsWallet(address newWallet) external onlyRole(ADMIN_ROLE) { ... }
```

**Regulatorio Risk:**

```
"Investor bought expecting X terms.
 Admin changed terms to Y.
 Investor didn't consent."

Esta es la "modificación unilateral de términos de inversión"
que reguladores ven como red flag para securities.
```

**¿Es esto un problema crítico?**

⚠️ **DEPENDE:**
- Si términos cambian ANTES de presale → OK (aún no hay inversión)
- Si términos cambian DESPUÉS de presale → RIESGO (breach of terms)
- Si hay GOVERNANCE CONTROL (DAO vote) antes de cambiar → OK (consent mechanism)
- Si hay FULL OWNER CONTROL → RIESGO (unilateral modification)

---

### ❌ Hallazgo #2: "Rescue" mecanismo es opaco

**Código:**

```solidity
function emergencyWithdrawETH() 
    external onlyRole(EMERGENCY_ROLE) nonReentrant {
    require(rescueContract != address(0), "Rescue required");
    try IBashoodRescue(rescueContract).emergencyWithdrawETH() {
        // success
    } catch { ... }
}
```

⚠️ **Pregunta regulatoria:** ¿Dónde van esos fondos?

Si respuesta es "a admin wallet sin transparencia" → RIESGO.
Si respuesta es "a treasury para reinversión en protocolo" → OK.

---

### ⚠️ Hallazgo #3: No hay límite máximo de cambios

```solidity
// Puede cambiar a:
burnBps = 0;           // Sin burn
bhtDiscountBps = 0;    // Sin descuento
burnBps = 10000;       // 100% burn (imposible)

// Sin validación de límites o timelock
```

**Mejor práctica:**

```solidity
// DEBERÍA ser:
function setBurnRate(uint256 newRate) external onlyOwner {
    require(newRate <= 100, "Max 1%");  // CAP
    require(block.timestamp >= lastChangeTime + 30 days, "Timelock"); // DELAY
    burnRate = newRate;
}
```

---

## ✅ ELEMENTS THAT ARE ACTUALLY SAFE

✅ **No hay staking rewards implementado**
- Narrative menciona "APY 8-12%"
- Código NO lo implementa
- Es puro lenguaje problemático, no problema técnico

✅ **No hay profit distribution**
- Funds van a burn (eliminado de economía) o treasury (operacional)
- NO hay automática redistribución a holders
- NO hay "rendimiento de inversión"

✅ **Burn es explícito y claro**
- 0.1% en cada transfer
- Es deflationary, beneficia a todo el protocolo
- NO es secret fee

✅ **Oracle solo para ETH/USD**
- NO está usando precios de NFTs o "asset performance"
- NO está acoplado a valuación de activos físicos
- Es limpio

✅ **Sin proxies = sin upgrades ocultos**
- No hay posibilidad de cambiar código de contrato post-deploy
- Cambios solo via parámetros (los mencionados arriba)

---

## 📊 SUMMARY: CODE vs NARRATIVE

| Elemento | Código | Narrativa | Mismatch |
|----------|--------|-----------|----------|
| Staking APY 8-12% | ❌ NO implementado | ✅ Documentado | ❌ YES - problema big |
| Profit distribution | ❌ NO existe | ⚠️ Implícito | ❌ YES - narrativa mala |
| Burn 0.1% | ✅ Implementado | ✅ Documentado | ✅ OK |
| Fee distribution | ✅ Claro (burn+treasury) | ❌ Vago | ❌ YES - narrativa vaga |
| Oracle usage | ✅ Solo ETH/USD | ❌ Podría implicar asset valuation | ❌ YES - narrativa engañosa |
| Parámetro mutability | ⚠️ SÍ changeable | ❌ NO mencionado | ❌ YES - riesgo hidden |

---

## 🎯 CRITICAL ACTION ITEMS

### ISSUE #1: Immutability de Parámetros Económicos

**Current Risk:** Owner puede cambiar términos post-sale sin governance

**Solution Option A (Hardcode):**
```solidity
// Hacer inmutable
uint256 public immutable burnRate = 10;  // 0.1%
uint256 public immutable treasuryFee = 50; // 0.5%

// Remove setters, use constructor only
```

**Solution Option B (Timelock):**
```solidity
// Agregar delay entre cambios
uint256 public lastBurnRateChange;
uint256 public constant CHANGE_DELAY = 30 days;

function setBurnRate(uint256 newRate) external onlyOwner {
    require(block.timestamp >= lastBurnRateChange + CHANGE_DELAY, "Timelock");
    burnRate = newRate;
    lastBurnRateChange = block.timestamp;
}
```

**Solution Option C (DAO Governance):**
```solidity
// Requerir votación DAO
function setBurnRate(uint256 newRate) external {
    require(daoGovernance.hasVotedFor(msg.sender, "BurnRateChange"), "Need DAO vote");
    burnRate = newRate;
}
```

**RECOMENDACIÓN:** Opción A (Hardcode) o Opción B (Timelock)
- A si esperas mantener esto privado
- B si quieres transparencia + tiempo para stakeholders de responder

---

### ISSUE #2: Clarificar Fund Flows en Documentación

**Agregar a whitepaper:**

```markdown
## Treasury & Fund Flow

Fondos recolectados en presale van a:

1. **projectWallet** (ETH de presale)
   - Uso: Desarrollo, infraestructura, operaciones
   - Control: Immutable address
   - Transparencia: Publicada en cada transacción

2. **operationsWallet** (BHT de presale + fees)
   - Uso: Operaciones diarias, pagos
   - Control: Mutable (subject to governance if DAO enabled)
   - Transparencia: Audit trail en blockchain

3. **Burn (0.1%.nft + 0.5% treasury fee)**
   - Escenario 1: Enviado a 0x0000...
   - Escenario 2: Retenido en contrato (registros en totalBurned)

NO hay distribución de ganancias a token holders.
```

---

### ISSUE #3: Governance para Cambios Futuros

**Si quieres permitir cambios (ej: parámetros optimizados):**

```solidity
// Implementar timelock + event logging
mapping(address => uint256) public lastParameterChange;
uint256 public constant PARAMETER_CHANGE_DELAY = 14 days;

event BurnRateChangeProposed(uint256 newRate, uint256 executeTime);

function proposeBurnRateChange(uint256 newRate) external onlyOwner {
    require(newRate <= 100, "Max 1%");
    emit BurnRateChangeProposed(newRate, block.timestamp + PARAMETER_CHANGE_DELAY);
    lastParameterChange[msg.sender] = block.timestamp;
}

function executeBurnRateChange(uint256 newRate) external onlyOwner {
    require(block.timestamp >= lastParameterChange[msg.sender] + PARAMETER_CHANGE_DELAY);
    burnRate = newRate;
}
```

---

## 📝 CODE QUALITY ASSESSMENT

**Positivos:**
- ✅ ReentrancyGuard usado en funciones críticas
- ✅ AccessControl implementado (roles + ADMIN_ROLE)
- ✅ Pausable para emergencias
- ✅ Oracle staleness checks en place
- ✅ Signature verification anti-replay

**Negativos:**
- ❌ Parámetros económicos demasiado flexibles
- ❌ Fund withdrawal "rescue" mechanisms opaco
- ❌ No hay limits en algunos setters

---

## 🎯 CONFIDENCE LEVEL

**Confidence on Technical Safety:** ⚠️ **CONDITIONAL**

```
✅ LO QUE ES REALMENTE LIMPIO:
- No hay profit distribution implementado
- No hay staking rewards implementado
- Burn es explícito
- Oracle es simple (solo ETH/USD)
- Sin upgrades ocultos (no proxies)

❌ LO QUE REQUIERE ATENCIÓN:
- Mutability de parámetros → owner control demasiado
- "Rescue" mecanismo → opaco
- Falta de timelock → cambios sin notice
- Fund flows → no documentado en código
```

**Veredicto:** El código está **limpio de mecanismos de profit-sharing**. El problema NO es técnico, es **parámetros-control demasiado permisivos** para owner.

**Solution:** Hacer algunos parámetros inmutables O agregar timelock + governance.

---

## 🔄 NEXT STEPS

1. **Decision Point:** ¿Qué hacer con mutability de parámetros?
   - [ ] Opción A: Hardcode (inmutable)
   - [ ] Opción B: Timelock + transparency
   - [ ] Opción C: DAO governance

2. **Documentation:** Descrevir fund flows explícitamente

3. **Legal Review:** Cruzar estos hallazgos con abogado

4. **Update Contracts:** Si es necesario, refactorizar

---

## 📋 INTEGRATION WITH ECONOMIC ASSESSMENT

**Economic Assessment encontró:**
- ❌ Narrativa problemática (APY, Viviendas 3D, etc)

**Technical Assessment encontró:**
- ✅ Código limpio (sin profit distribution)
- ⚠️ Parámetros flexibles (owner control)

**Síntesis:**
= Problema NO es técnico, es narrativo + governance

= Solución: Corregir narrativa + agregar governance/timelock a parámetros

