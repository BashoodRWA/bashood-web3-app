# Gas Optimization Report

**Proyecto:** Bashood RWA Tokenization  
**Fecha:** 2026-02-16  
**Compilador:** Solidity 0.8.28 | Optimizer: ON (runs: 200) | viaIR: false  
**Red objetivo:** Polygon L2  

---

## 1. Tamaños de contratos deployados

| Contrato | Bytecode | % Límite (24 KB) | Estado |
|---|---|---|---|
| BashoodToken | 5.9 KB | 24.6% | ✅ OK |
| BashoodPresaleFinal | 18.7 KB | 77.9% | ⚠️ Cercano al límite |
| BashoodReferral | 2.6 KB | 10.8% | ✅ OK |
| MockNFT1155 | 4.6 KB | 19.2% | ✅ Solo test |

> **Nota:** BashoodPresaleFinal ocupa 77.9% del límite EIP-170 (24,576 bytes). Cualquier adición significativa de funcionalidad puede requerir splitting vía libraries o proxy.

---

## 2. Optimizaciones ya implementadas

| Técnica | Contrato | Impacto |
|---|---|---|
| Custom errors (`error InvalidBHTDeposit()`, etc.) | Presale, Token | ~200 gas/revert vs strings |
| `immutable` para variables de constructor | Presale (8 vars) | ~2,100 gas/read (SLOAD → PUSH) |
| Constantes privadas (`_MAX_BPS`, `_PRECISION`) | Presale | Sin SLOAD, inlined por compilador |
| `uint16` para BPS (`bhtDiscountBps`, `burnBps`) | Presale | Storage packing en un slot |
| `uint32` para `maxPriceStaleness` | Presale | Storage packing con uint16s |
| `SafeERC20` para transferencias externas | Presale | Protección contra tokens non-standard |
| `nonReentrant` solo en funciones con calls externos | Token, Presale, Referral | Sin overhead innecesario |
| `Math.mulDiv` para cálculos de precisión | Presale | Evita overflow sin `unchecked` |
| Optimizer habilitado (200 runs) | Todos | Balance deploy/runtime gas |

---

## 3. Oportunidades de optimización identificadas

### 3.1 Alta prioridad (>500 gas ahorro por tx)

#### A. Código duplicado en `_payServiceWithBHT` y `_payMilestoneWithBHT`
**Archivo:** BashoodPresaleFinal.sol, líneas 200-280  
**Problema:** Ambas funciones repiten la lógica de discount+burn+opsTransfer (>30 líneas idénticas).  
**Ahorro estimado:** ~800 gas deployment + código más mantenible  
**Solución:** Extraer a función interna `_discountBurnAndTransfer(address user, uint256 fiatQuoteUsd)`.

#### B. Doble lectura del oráculo en `purchaseWithBHT`
**Archivo:** BashoodPresaleFinal.sol  
**Problema:** `_calculateBhtAmounts()` lee `priceFeed.latestRoundData()`, pero si se llama `_bhtFromFiat()` en rutas de servicio/milestone, se lee dos veces.  
**Ahorro estimado:** ~2,600 gas (1 STATICCALL externo menos)  
**Solución:** Cachear el resultado del oráculo y pasarlo como parámetro.

#### C. String literals en `require` vs Custom Errors en BashoodToken
**Archivo:** BashoodToken.sol  
**Problema:** Usa custom errors definidos (lines 10-14) pero NO los usa en require: `require(amount > 0, "Amount must be > 0")`. Los strings cuestan ~200 gas extra por revert.  
**Ahorro estimado:** ~200 gas/revert × 12 requires = ~2,400 gas potencial  
**Solución:** Reemplazar `require(newWallet != address(0), "Invalid address")` → `if (newWallet == address(0)) revert InvalidTreasuryWallet()`.

#### D. String literals en BashoodPresaleFinal (parcial)
**Archivo:** BashoodPresaleFinal.sol  
**Problema:** Mezcla de custom errors (E10-E31 cortos) y strings largos ("Rescue NFT failed: ", "Not whitelisted", etc.).  
**Ahorro estimado:** ~100-200 gas por require con string  
**Solución:** Consistencia: convertir strings restantes a custom errors.

### 3.2 Media prioridad (100-500 gas ahorro)

#### E. `unchecked` para operaciones seguras
**Archivo:** BashoodToken.sol, líneas 81-83  
```solidity
uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
uint256 sendAmount = amount - burnAmount - feeAmount;
```
**Problema:** El compilador 0.8.x añade overflow checks. Estos cálculos no pueden overflow porque `burnRate <= 100` y `treasuryFee <= 200` (verificados en setters).  
**Ahorro estimado:** ~120 gas por transfer  
**Solución:** Envolver en `unchecked { }`.

#### F. Storage reads repetidos
**Archivo:** BashoodToken.sol, `transfer()` y `transferFrom()`  
**Problema:** `burnRate`, `treasuryFee` y `treasuryWallet` se leen de storage múltiples veces (el compilador puede o no optimizar esto).  
**Ahorro estimado:** ~200 gas (2 SLOAD menos)  
**Solución:** Cachear en variables locales:
```solidity
uint256 _burnRate = burnRate;
uint256 _treasuryFee = treasuryFee;
address _treasury = treasuryWallet;
```

#### G. `++i` vs contadores manuales
**Archivo:** BashoodReferral.sol, línea 84  
**Problema:** `referralCount[referrer]++` usa post-increment.  
**Ahorro:** ~5 gas (marginal, pero un patrón recomendado en auditorías).

### 3.3 Baja prioridad (informativo)

#### H. `calldata` ya usado correctamente
Los parámetros `bytes calldata signature` y `bytes calldata data` ya usan `calldata` en lugar de `memory`. ✅

#### I. Events con indexed
Los eventos críticos ya tienen `indexed` en las direcciones. ✅

#### J. Storage layout packing
`bhtDiscountBps` (uint16) + `burnBps` (uint16) + `maxPriceStaleness` (uint32) + `operationsWallet` (address) ocupan 2 slots. Podrían compactarse a 1 slot reordenando, pero el ahorro es mínimo en Polygon L2.

---

## 4. Gas estimado por función principal (Polygon L2)

| Función | Gas estimado | USD (30 gwei, MATIC $0.40) | Nota |
|---|---|---|---|
| `BashoodToken.transfer()` | ~85,000 | ~$0.001 | Incluye burn + fee + 3 transfers |
| `BashoodToken.transferFrom()` | ~90,000 | ~$0.001 | + allowance check |
| `purchaseWithETH()` | ~180,000 | ~$0.002 | Oracle + signature + NFT transfer |
| `purchaseWithBHT()` | ~220,000 | ~$0.003 | Oracle + BHT burn + NFT transfer |
| `claimNFT()` | ~95,000 | ~$0.001 | NFT mint |
| `registerReferral()` | ~50,000 | ~$0.001 | 2 SSTORE |
| Deploy BashoodPresaleFinal | ~4,800,000 | ~$0.058 | Una sola vez |
| Deploy BashoodToken | ~1,580,000 | ~$0.019 | Una sola vez |

> **Nota:** En Polygon L2, el gas es extremadamente barato (~0.001-0.003 USD por tx). Las optimizaciones de gas tienen más impacto en la huella del contrato que en costos operacionales.

---

## 5. Recomendaciones priorizadas

### Hacer ahora (bajo riesgo, alto impacto):
1. **[C]** Reemplazar strings por custom errors en BashoodToken — ya tiene los errors definidos
2. **[E]** Añadir `unchecked` en cálculos de transfer — operación segura por constraints

### Hacer antes de mainnet (medio riesgo):
3. **[A]** Refactorizar código duplicado service/milestone — reduce bytecode de Presale
4. **[F]** Cachear storage reads en transfer/transferFrom

### Considerar (bajo impacto en L2):
5. **[B]** Cachear lectura del oráculo — relevante si gas sube
6. **[D]** Consistencia custom errors en Presale
7. **[J]** Reordenar storage layout

---

## 6. Resumen

| Métrica | Actual | Potencial optimizado |
|---|---|---|
| BashoodToken bytecode | 5.9 KB | ~5.5 KB (-7%) |
| BashoodPresaleFinal bytecode | 18.7 KB | ~17.5 KB (-6%) |
| transfer() gas | ~85,000 | ~84,680 (-0.4%) |
| purchaseWithETH() gas | ~180,000 | ~177,400 (-1.4%) |

**Conclusión:** Los contratos ya implementan las optimizaciones más importantes (custom errors, immutable, optimizer). Las mejoras restantes son incrementales y tienen impacto mínimo en Polygon L2 donde el gas cuesta fracciones de centavo. La prioridad es mantener legibilidad y seguridad sobre microoptimizaciones.
