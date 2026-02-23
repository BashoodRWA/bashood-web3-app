# 🎯 PLAN DE MEJORA DE COVERAGE - Target: 90%+ en TODAS las métricas

**Fecha:** 13 de Febrero 2026  
**Estado Actual:** 453 tests passing ✅  
**Coverage Global:** ~64% Stmts, ~52% Branch, ~65% Funcs, ~66% Lines

---

## 🔴 PRIORIDAD CRÍTICA - Contratos de Producción <75%

### 1. **BashoodPresaleFinal.sol** 
**Status:** Branch 69.7% ❌ (BLOQUEANTE)
- ✅ Stmts: 96.02%
- ❌ **Branch: 69.7%** (Target: 90%)
- ✅ Funcs: 97.37%
- ✅ Lines: 96.85%

**Líneas no cubiertas:** 434, 447, 459 (rescue delegation edge cases)

**Tests a crear:**
- [ ] Rescue delegation con rescueContract = address(0)
- [ ] Rescue delegation con revert en rescueContract
- [ ] Rescue delegation con success
- [ ] Edge cases en try/catch blocks
- [ ] Validaciones de error específicas para cada require
- [ ] Boundary conditions en amounts (0, max uint256)
- [ ] Timing edge cases (presale start/end exact timestamps)

**Impacto:** CRÍTICO - Contrato principal de venta

---

### 2. **BashoodRescue.sol**
**Status:** Branch 68.33% ❌ (CRÍTICO)
- ✅ Stmts: 97.5%
- ❌ **Branch: 68.33%** (Target: 90%)
- ✅ Funcs: 90.91%
- ✅ Lines: 97.78%

**Línea no cubierta:** 152 (emergencyWithdrawETH edge case)

**Tests a crear:**
- [ ] emergencyWithdrawETH con balance = 0
- [ ] emergencyWithdrawETH con max ETH amount
- [ ] authorize/revoke en secuencias complejas
- [ ] rescueERC20 con todos los edge cases de transfer
- [ ] rescueUnsoldNFTs con diferentes cantidades
- [ ] Multisig scenarios con firmas inválidas parciales
- [ ] Nonce replay attacks comprehensive

**Impacto:** CRÍTICO - Recovery de fondos

---

### 3. **BashoodPropertyNFT.sol**
**Status:** Branch 67.05% ❌ (ALTO)
- ✅ Stmts: 92.96%
- ❌ **Branch: 67.05%** (Target: 90%)
- ❌ Funcs: 89.29% (Target: 90%)
- ✅ Lines: 95.28%

**Líneas no cubiertas:** 395, 416, 434

**Tests a crear:**
- [ ] Property type validation edge cases
- [ ] Amenities array vari limits
- [ ] Status toggle comprehensive scenarios
- [ ] Query functions con colecciones vacías
- [ ] MAX_SUPPLY boundary testing
- [ ] Fee calculations con diferentes valores
- [ ] Pause/Unpause interaction con todas las funciones

**Impacto:** ALTO - NFT core functionality

---

### 4. **BashoodReferral.sol**
**Status:** Branch 82.35% ⚠️ (puede mejorar)
- ✅ Stmts: 95.65%
- ⚠️ **Branch: 82.35%** (Target: 90%)
- ❌ Funcs: 88.89% (Target: 90%)
- ✅ Lines: 97.14%

**Línea no cubierta:** 97

**Tests a crear:**
- [ ] Referral chains complejas (A→B→C→D)
- [ ] Edge case línea 97 específico
- [ ] Reward distribution con múltiples referidos simultáneos
- [ ] ClaimNFT con exactly required referrals
- [ ] SetPresaleContract security tests
- [ ] Referral validator edge cases

**Impacto:** ALTO - Sistema de referidos

---

### 5. **ChainlinkPriceFeed.sol**
**Status:** Branch 60%, Funcs 50% ❌❌ (CRÍTICO si se usa)
- ✅ Stmts: 87.5%
- ❌ **Branch: 60%** (Target: 90%)
- ❌ **Funcs: 50%** (Target: 90%)
- ⚠️ Lines: 79.31%

**Líneas no cubiertas:** 31, 32, 36, 37

**Tests a crear:**
- [ ] latestRoundData con updatedAt = 0
- [ ] latestRoundData con answer = 0
- [ ] latestRoundData con answeredInRound < roundId
- [ ] getLatestPrice todas las validaciones
- [ ] Stale price detection
- [ ] Round completeness validation
- [ ] Oracle failure scenarios

**Impacto:** CRÍTICO - Si se usa para pricing, BLOQUEANTE

---

## 🟡 PRIORIDAD ALTA - Optimización Coverage

### 6. **BashoodToken.sol**
**Status:** Branch 78.57% ⚠️
- ✅ Stmts: 100%
- ⚠️ **Branch: 78.57%** (Target: 90%)
- ✅ Funcs: 100%
- ✅ Lines: 100%

**Tests a crear:**
- [ ] Fee calculations edge cases (burnRate + treasuryFee combinados)
- [ ] Transfer con balance exactly = amount + fees
- [ ] Donate con amounts muy pequeños
- [ ] Timelock cancellation en diferentes estados
- [ ] Staking contract interactions completas

**Impacto:** MEDIO - Ya tiene buena cobertura

---

### 7. **BashoodMultiToken.sol**
**Status:** Branch 75%, Funcs 80% ⚠️
- ✅ Stmts: 92%
- ⚠️ **Branch: 75%** (Target: 90%)
- ⚠️ **Funcs: 80%** (Target: 90%)
- ✅ Lines: 93.55%

**Líneas no cubiertas:** 43, 47

**Tests a crear:**
- [ ] mintAllNFTs edge cases completos
- [ ] buyTokens con diferentes amounts
- [ ] withdrawFunds scenarios completos
- [ ] Role management (MINTER_ROLE)
- [ ] Batch operations
- [ ] Lines 43, 47 coverage específico

**Impacto:** MEDIO - Legacy/deprecated contract

---

### 8. **TaxHandler.sol**
**Status:** Branch 64.29% ❌
- ✅ Stmts: 100%
- ❌ **Branch: 64.29%** (Target: 90%)
- ✅ Funcs: 100%
- ✅ Lines: 100%

**Tests a crear:**
- [ ] calculateTax con todos los tier boundaries
- [ ] Edge cases en límites de tiers
- [ ] Tax rate changes scenarios
- [ ] Initialization variations

**Impacto:** BAJO - Si se va a usar

---

### 9. **ComplianceRegistry.sol**
**Status:** TODO BAJO ❌❌❌
- ❌ Stmts: 66.67%
- ❌ **Branch: 40%**
- ⚠️ Funcs: 75%
- ❌ Lines: 66.67%

**Líneas no cubiertas:** 21, 22, 32, 33

**Tests a crear:**
- [ ] setRoot scenarios completos
- [ ] verify con merkle proofs válidos/inválidos
- [ ] Root = bytes32(0) edge case
- [ ] Proof arrays vacíos
- [ ] Access control completo

**Impacto:** BAJO - Solo si se usa TokenWrapper

---

### 10. **TokenWrapperERC20.sol**
**Status:** Branch 66.67% ❌
- ✅ Stmts: 100%
- ❌ **Branch: 66.67%** (Target: 90%)
- ✅ Funcs: 100%
- ✅ Lines: 100%

**Tests a crear:**
- [ ] Wrap/unwrap edge cases
- [ ] Compliance registry integration completa
- [ ] Amount = 0 scenarios
- [ ] Max amounts scenarios

**Impacto:** BAJO - Solo si se usa

---

## 📊 RESUMEN DE TAREAS

### Contratos BLOQUEANTES para mainnet:
1. ❌ **BashoodPresaleFinal** - Branch 69.7% → 90%+ (20+ tests)
2. ❌ **BashoodRescue** - Branch 68.33% → 90%+ (15+ tests)
3. ❌ **ChainlinkPriceFeed** - Branch 60%, Funcs 50% → 90%+ (12+ tests)

### Contratos de ALTA prioridad:
4. ❌ **BashoodPropertyNFT** - Branch 67.05% → 90%+ (15+ tests)
5. ⚠️ **BashoodReferral** - Branch 82.35% → 90%+ (8+ tests)

### Contratos de optimización:
6. ⚠️ **BashoodToken** - Branch 78.57% → 90%+ (10+ tests)
7. ⚠️ **BashoodMultiToken** - Branch 75%, Funcs 80% → 90%+ (8+ tests)
8. ❌ **TaxHandler** - Branch 64.29% → 90%+ (6+ tests)
9. ❌ **ComplianceRegistry** - Todo bajo → 90%+ (8+ tests)
10. ❌ **TokenWrapperERC20** - Branch 66.67% → 90%+ (5+ tests)

---

## 🚀 ESTRATEGIA DE EJECUCIÓN

### Fase 1: Contratos Críticos (Prioridad 1-3)
**Total tests a crear:** ~47 tests  
**Tiempo estimado:** 2-3 horas  
**Objetivo:** Resolver BLOQUEANTES para mainnet

### Fase 2: Contratos Alta Prioridad (Prioridad 4-5)
**Total tests a crear:** ~23 tests  
**Tiempo estimado:** 1-2 horas  
**Objetivo:** Coverage 90%+ en NFT y Referrals

### Fase 3: Optimización (Prioridad 6-10)
**Total tests a crear:** ~37 tests  
**Tiempo estimado:** 2 horas  
**Objetivo:** Coverage 90%+ global

---

## 📈 MÉTRICAS OBJETIVO

**Antes:**
- Statements: 64%
- Branches: 52%
- Functions: 65%
- Lines: 66%

**Después (Target):**
- Statements: **90%+**
- Branches: **90%+**
- Functions: **90%+**
- Lines: **90%+**

**Total tests a crear:** ~107 nuevos tests  
**Tests actuales:** 453 passing  
**Tests finales estimados:** 560+ tests
