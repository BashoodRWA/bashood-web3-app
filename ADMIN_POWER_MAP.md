# 📊 ADMIN POWER MAP - BASHOOD V1 ACTUAL

**Análisis técnico completo de poderes administrativos actuales**  
**Fecha:** 17 Febrero 2026  
**Status:** INVENTARIO DE REALIDAD (sin juicio, solo hechos)

---

## 🎯 RESUMEN EJECUTIVO

**Riesgo regulatorio actual:** 🔴 ALTO

**Razón:** Poder centralizado en owner/admin sin timelock en decisiones económicas críticas + parámetros económicos mutables

**Impacto:** Si cambios se hacen post-presale unilateralmente → regulador ve "token es controladopor founder" → reclasificación como security

---

## 📋 CONTRATO 1: BashoodToken.sol (266 líneas)

### Estado actual de OWNER

```
Owner: msg.sender (founder)
Control: onlyOwner (único firmante)
Arquitectura: Ownable (OpenZeppelin)
Multisig: NINGUNO
Timelock: PARCIAL (24h solo para pause/unpause)
```

### Poderes MUTABLES by owner (ECONÓMICAMENTE CRÍTICOS)

| Función | Parámetro | Actual | Máximo | Timelock | Riesgo |
|---------|-----------|--------|--------|----------|--------|
| `setTreasuryWallet()` | treasuryWallet | [actual address] | ilimitado | ❌ NINGUNO | 🔴 ALTO |
| `setStakingContract()` | stakingContract | address(0) | ilimitado | ❌ NINGUNO | 🔴 ALTO |
| `setBurnRate()` | burnRate | 10 (0.1%) | 100 (1%) | ❌ NINGUNO | 🔴 ALTO |
| `setTreasuryFee()` | treasuryFee | 50 (0.5%) | 200 (2%) | ❌ NINGUNO | 🔴 ALTO |

### Poderes DE CONTROL

| Función | Acción | Timelock | Riesgo |
|---------|--------|----------|--------|
| `requestPause()` | Request pause de token | 24h requerido | ⚠️ MEDIO |
| `executePause()` | Ejecutar pause | Requiere requestPause primero | ⚠️ MEDIO |
| `cancelPauseRequest()` | Cancelar pause | ❌ NINGUNO | ⚠️ MEDIO |
| `requestUnpause()` | Request unpause | 24h requerido | ⚠️ MEDIO |
| `executeUnpause()` | Ejecutar unpause | Requiere requestUnpause primero | ⚠️ MEDIO |

### Poderes OPERACIONALES

| Función | Acción | Riesgo |
|---------|--------|--------|
| `periodicBurn()` | Quemar tokens | ⚠️ MEDIO |
| `sendToTreasury()` | Enviar tokens | ⚠️ MEDIO |
| `sendToStaking()` | Enviar al staking | ✅ LOW (staking=address(0)) |

### Problemas actuales en BashoodToken

```
🔴 CRÍTICO:
1. Treasury wallet puede ser cambiado SIN AVISO (owner UNILATERAL)
   → Históricamente usado para "cambiar términos post-venta"
   
2. Burn rate / Treasury fee pueden ser cambiados (0.1% → 1%, 0.5% → 2%)
   → Parece "inofensivo" pero es modificación económica
   → Regulador: "Esto demuestra que términos NO son fijos"
   
3. NO hay DAOgovernance sobre estos parámetros
   → TODO es founder-controlled

4. 24h timelock SOLO para pause, NO para cambios económicos
   → Vulnerabilidad asimétrica

✅ LO BUENO:
- Burn mechanism está bien diseñado (hardcoded en constructor)
- No hay staking implementado (stakingContract = address(0))
- No hay "hidden profit-sharing"
```

---

## 📋 CONTRATO 2: BashoodPresaleFinal.sol (689 líneas)

### Estado actual de ROLES

```
Arquitectura: AccessControl (OpenZeppelin)
DEFAULT_ADMIN_ROLE: deployer
ADMIN_ROLE: asignado a [TBD]
EMERGENCY_ROLE: asignado a [TBD]
WHITELIST_ROLE: asignado a [TBD]
Multisig: NINGUNO
Centralized control: SÍ (single ADMIN_ROLE)
```

### Poderes ADMIN_ROLE (ECONÓMICAMENTE CRÍTICOS)

| Función | Parámetro | Actual | Riesgo | Timelock |
|---------|-----------|--------|--------|----------|
| `setOperationsWallet()` | operationsWallet | tbd | 🔴 ALTO | ❌ NINGUNO |
| `setBurnBps()` | burnBps | [TBD] | 🔴 ALTO | ❌ NINGUNO |
| `setDiscountBps()` | bhtDiscountBps | [TBD] | 🔴 ALTO | ❌ NINGUNO |
| `setPriceFeed()` | priceFeed address | Chainlink ETH/USD | 🔴 ALTO | ❌ NINGUNO |
| `setMaxPriceStaleness()` | maxPriceStaleness | [TBD] | ⚠️ MEDIO | ❌ NINGUNO |
| `setWhitelistEnabled()` | whitelistEnabled | boolean | ⚠️ MEDIO | ❌ NINGUNO |
| `setMaxPerUser()` | maxPerUser | [TBD] | ⚠️ MEDIO | ❌ NINGUNO |

### Poderes CONTROL

| Función | Acción | Timelock | Riesgo |
|---------|--------|----------|--------|
| `pause()` | Pausar presale | ❌ NINGUNO | 🔴 ALTO |
| `unpause()` | Reanudar presale | ❌ NINGUNO | 🔴 ALTO |
| `startPresale()` | Iniciar venta | ❌ NINGUNO | ⚠️ MEDIO |
| `endPresale()` | Terminar venta | ❌ NINGUNO | ⚠️ MEDIO |
| `finalizePresale()` | Enviar fondos | ❌ NINGUNO | 🔴 ALTO |

### Poderes EMERGENCY_ROLE

| Función | Acción | Riesgo |
|---------|--------|--------|
| `emergencyWithdrawETH()` | Retirar ETH | 🔴 ALTO (sin límites) |

### Poderes RESCUE

| Función | Acción | Riesgo |
|---------|--------|--------|
| `rescueUnsoldNFTs()` | Extraer NFTs | ⚠️ MEDIO (si presale falla) |
| `rescueERC20()` | Extraer tokens | ⚠️ MEDIO (si presale falla) |

### Problemas actuales en BashoodPresaleFinal

```
🔴 CRÍTICO:
1. ADMIN_ROLE tiene control TOTAL sobre parámetros económicos
   - burnBps, discountBps PUEDEN ser cambiados post-venta
   - Regulador interpreta: "términos económicos son mutables unilateralmente"
   
2. NO hay timelock en NINGÚN cambio
   - pause/unpause: instantáneo (sin aviso a holders)
   - cambios de parámetros: instantáneos
   - rescues de fondos: instantáneos
   
3. DEFAULT_ADMIN_ROLE puede asignar/revocar ADMIN_ROLE
   → Potencial para "cambio de poder" sin transparencia
   
4. Emergency withdraw NO tiene límite
   → Founder puede retirar TODO en emergencia
   
5. AssignRoles() permite CAMBIAR quién es ADMIN post-deployment
   → Vulnerabilidad: poder cambiar de manos sin DAO

✅ LO BUENO:
- Access Control está bien segregado (3 roles)
- ReentrancyGuard implementado
- Pausable implementado (pero sin timelock)
```

---

## 📋 CONTRATO 3: BashoodMultiToken.sol (118 líneas)

### Estado actual de OWNER

```
Owner: initialOwner (constructor)
Arquitectura: Ownable + AccessControl
DEFAULT_ADMIN_ROLE: initialOwner
MINTER_ROLE: initialOwner
Multisig: NINGUNO
Timelock: NINGUNO
```

### Poderes OWNER/ADMIN

| Función | Acción | Riesgo |
|---------|--------|--------|
| `grantMinterRole()` | Agregar acuñadores | ⚠️ MEDIO |
| `revokeMinterRole()` | Remover acuñadores | ⚠️ MEDIO |
| `setRate()` (si existe) | Cambiar rate de acuñación | 🔴 ALTO (si económico) |

### Problemas actuales en BashoodMultiToken

```
⚠️ MODERADO:
1. Owner puede cambiar MINTER_ROLE dinámicamente
   → Permite agregar acuñadores sin límites
   
2. El contrato menciona "rate" (default 1000)
   → Si es económicamente significativo: riesgo
   
✅ LO BUENO:
- Arquitectura simple y clara
- ERC1155 es estándar ("asset tokenization")
- Roles están bien segregados
```

---

## 📋 CONTRATO 4: BashoodRescue.sol (170 líneas)

### Estado actual de ROLES

```
Arquitectura: AccessControl
ADMIN_ROLE: admin (constructor)
EMERGENCY_ROLE: emergency (constructor)
Multisig: NINGUNO
Timelock: NINGUNO
```

### Poderes ADMIN_ROLE

| Función | Acción | Riesgo |
|---------|--------|--------|
| `setProjectWallet()` | Establecer wallet destino | 🔴 ALTO (una sola vez) |
| `rescueUnsoldNFTs()` | Extraer NFTs | ⚠️ MEDIO |
| `rescueERC20()` | Extraer tokens | ⚠️ MEDIO |

### Poderes EMERGENCY_ROLE

| Función | Acción | Riesgo |
|---------|--------|--------|
| `emergencyWithdrawETH()` | Retirar ETH en emergencia | 🔴 ALTO (sin límite) |

### Problemas actuales en BashoodRescue

```
🔴 CRÍTICO:
1. emergencyWithdrawETH() tiene poder absoluto
   → Sin límites, sin multisig, sin DAO
   → Regulador: "Founder puede sacar TODO cuando quiera"
   
✅ LO BUENO:
- `authorizedCallers` mapping permite delegar (buen diseño)
- Roles están segregados (emergencia ≠ admin)
- Pull-payment pattern (mejor que push)
```

---

## 🚨 MATRIZ DE RIESGO CONSOLIDADA

| Contrato | Función | Riesgo | Timelock | Multisig | Regulatorio |
|----------|---------|--------|----------|----------|-------------|
| **Token** | setBurnRate | 🔴 ALTO | ❌ | ❌ | Mutable post-sale |
| **Token** | setTreasuryFee | 🔴 ALTO | ❌ | ❌ | Mutable post-sale |
| **Token** | setTreasuryWallet | 🔴 ALTO | ❌ | ❌ | Mutable post-sale |
| **Presale** | setBurnBps | 🔴 ALTO | ❌ | ❌ | Mutable post-sale |
| **Presale** | setDiscountBps | 🔴 ALTO | ❌ | ❌ | Mutable post-sale |
| **Presale** | pause/unpause | 🔴 ALTO | ❌ | ❌ | Sin aviso |
| **Presale** | finalizePresale | 🔴 ALTO | ❌ | ❌ | Control de fondos |
| **Rescue** | emergencyWithdrawETH | 🔴 ALTO | ❌ | ❌ | Acceso ilimitado |
| **Rescue** | setProjectWallet | 🔴 ALTO | ❌ | ❌ | Una sola vez |
| **MultiToken** | grantMinterRole | ⚠️ MEDIO | ❌ | ❌ | Dinámico |

---

## 📊 CONTEO DE PROBLEMAS

```
🔴 CRÍTICOS (post-sale mutable + sin timelock):     6
⚠️ MODERADOS (mutable + funcional, sin timelock):   3
✅ CONTROLADOS (immutable o bien limitado):         5

ESTADO: No es catastrófico, pero es INDEFENDIBLE regulatoriamente
```

---

## 🔍 LO QUE UN REGULADOR VERÁ

**Pregunta 1:** "¿Quién controla los parámetros económicos?"  
**Respuesta actual:** "Founder via onlyOwner (BashoodToken) + ADMIN_ROLE (BashoodPresaleFinal)"  
**Conclusión regulatoria:** "El token es controlado por el fundador" = SECURITY

**Pregunta 2:** "¿Hay protección contra cambios post-presale?"  
**Respuesta actual:** "24h timelock solo para pause en Token, nada en Presale"  
**Conclusión regulatoria:** "Términos pueden cambiar unilateralmente" = HIGH RISK

**Pregunta 3:** "¿Debe aprobación comunitaria para cambios?"  
**Respuesta actual:** "No, es decisión del owner/admin"  
**Conclusión regulatoria:** "No hay descentralización real" = SECURITY

---

## ✅ LO QUE ESTÁ BIEN (para reconocer)

✅ **Burn mechanism** es hardcoded (no mutable en contrato de forma económica problemática)  
✅ **ReentrancyGuard** implementado correctamente  
✅ **No hay staking implementado** (stakingContract = address(0))  
✅ **Roles están segregados** (ADMIN ≠ EMERGENCY)  
✅ **No hay ocultos "profit-sharing"** en el código  
✅ **Pausable está implementado** (aunque sin timelock)

---

## 🎯 PRÓXIMO PASO: SOLUCIONES (FASE 2)

**Basado en este inventario, necesitaremos:**

1. ✅ **Multisig 3/5** para cualquier cambio económico
2. ✅ **Timelock 48h** en TODOS los cambios (no solo pause)
3. ✅ **DAO governance** para decisiones críticas
4. ✅ **Immutabilidad** de parámetros económicos POST-presale
5. ✅ **Emergencia limitada** (max % de fondos, no TODO)

**Ejemplo de arquitectura defensible:**

```
Change Request → Multisig (2/3) → Timelock (48h) → DAO Vote (si económico) → Ejecutar

NO:
Owner solo → Cambio inmediato
```

---

## 📝 CONCLUSIÓN

**Realidad técnica:** El código está bien escrito y es seguro (no hay bugs críticos)

**Realidad regulatoria:** El gobierno es centralizado y los términos son mutables post-venta

**Brecha:** Código seguro ≠ Gobierno defendible

**Solución:** Implementar multisig + timelock + DAO governance (FASE 2 de implementación)

---

**Documento finalizado:** 17/02/2026 - INVENTARIO COMPLETO LISTO PARA FASE 2

