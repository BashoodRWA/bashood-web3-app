# ✅ MAINNET DEPLOYMENT CHECKLIST - FINAL
**Proyecto:** Bashood Presale System  
**Fecha:** 10 de diciembre de 2025  
**Branch:** `patch/rescue-pullpayment-2025-11-01`  
**Versión Contrato:** BashoodPresaleFinal v2.0 (optimizado)

---

## 🔴 CRITICAL - MUST FIX BEFORE MAINNET

### 1. Contract Size ✅ **COMPLETADO**
- [x] **BashoodPresaleFinal bajo límite 24KB**
  - Tamaño actual: **16,952 bytes** (31% margen de seguridad)
  - Límite máximo: 24,576 bytes
  - Reducción lograda: 7,550 bytes (-30.81%)
  - **Status:** ✅ APTO PARA MAINNET

### 2. Validación Oracle Chainlink ⚠️ **BLOQUEADO (No crítico)**
- [ ] **require(answeredInRound >= roundId) no ejecuta en tests**
  - Código presente en líneas 45 y 72 de `ChainlinkPriceFeed.sol`
  - Requiere verificación en testnet con oracle real
  - Intentos fallidos: disable optimizer, clean cache, remove events
  - **Workaround:** Otras validaciones funcionan (answer > 0, updatedAt, staleness)
  - **Acción:** Verificar manualmente en Sepolia antes de mainnet
  - **Riesgo:** BAJO (validaciones redundantes activas)

### 3. Tests de Funciones Removidas ⚠️ **REQUIERE LIMPIEZA**
- [ ] **64 tests failing de funciones removidas**
  - Tests de propuestas: `submitProposal`, `finalizeProposal`
  - Tests de pagos: `payServiceWithBHT`, `payMilestoneWithBHT`
  - Tests de delegación: `delegateRescue*`
  - **Acción requerida:** Mover a `test/deprecated/` o marcar como `.skip`
  - **Impacto:** No afecta funcionalidad core (264 tests passing)

---

## 🟠 HIGH PRIORITY - REQUIRED BEFORE MAINNET

### 4. Testnet Deployment & Smoke Tests
- [ ] **Desplegar en Sepolia testnet**
  - [ ] Deploy MockBHT (BashoodToken mock)
  - [ ] Deploy BashoodMultiToken (NFT ERC1155)
  - [ ] Deploy ReferralValidator
  - [ ] Deploy BashoodReferral
  - [ ] Deploy ChainlinkPriceFeed (conectar a Sepolia oracle)
  - [ ] Deploy BashoodPresaleFinal
  - [ ] Deploy BashoodRescue
  - [ ] Verificar contratos en Etherscan
  
- [ ] **Smoke Tests en Sepolia**
  - [ ] Comprar NFT con ETH (verificar oracle Chainlink)
  - [ ] Comprar NFT con BHT
  - [ ] Probar sistema de referidos
  - [ ] Ejecutar rescueUnsoldNFTs
  - [ ] Ejecutar emergencyWithdrawETH
  - [ ] Verificar tamaño real on-chain (esperado: ~17KB)
  - [ ] **Verificar manualmente answeredInRound >= roundId con Chainlink real**

### 5. Auditoría Externa Profesional
- [ ] **Contratar auditor reconocido**
  - Opciones recomendadas:
    - [ ] Trail of Bits (top tier, $40k-$50k)
    - [ ] OpenZeppelin (reputación sólida, $25k-$35k)
    - [ ] ConsenSys Diligence ($30k-$40k)
    - [ ] Cyfrin/CodeHawks (competitivo, $15k-$25k)
  
- [ ] **Scope de auditoría:**
  - [ ] BashoodPresaleFinal.sol
  - [ ] BashoodRescue.sol
  - [ ] BashoodMultiToken.sol
  - [ ] BashoodReferral.sol
  - [ ] ChainlinkPriceFeed.sol (oracles/)
  
- [ ] **Timeline:**
  - [ ] Auditoría: 2-4 semanas
  - [ ] Remediación de findings: 1-2 semanas
  - [ ] Re-audit: 1 semana

### 6. Documentación NatSpec
- [ ] **Completar comentarios NatSpec en contratos principales**
  - [ ] BashoodPresaleFinal.sol (@notice, @dev, @param, @return)
  - [ ] BashoodRescue.sol
  - [ ] BashoodMultiToken.sol
  - [ ] BashoodReferral.sol
  - [ ] ChainlinkPriceFeed.sol
  
- [ ] **Generar documentación HTML**
  - [ ] Ejecutar `hardhat docgen` o equivalente
  - [ ] Publicar docs en sitio web o repositorio

---

## 🟡 MEDIUM PRIORITY - RECOMMENDED BEFORE MAINNET

### 7. Análisis de Seguridad Adicional
- [x] **Slither analysis**
  - Resultado actual: 0 high/medium/low issues ✅
  - Baseline comparación: 202 issues (Sept 2025) → 0 issues (Dic 2025)
  
- [ ] **Mythril analysis**
  - [ ] Ejecutar scan de mythril en contratos principales
  - [ ] Revisar vulnerabilidades de reentrancy, overflow, etc.
  
- [ ] **Echidna/Foundry fuzzing**
  - [ ] Setup fuzzing tests para funciones críticas
  - [ ] purchaseWithETH / purchaseWithBHT
  - [ ] rescueUnsoldNFTs / emergencyWithdrawETH

### 8. Gas Optimization Review
- [ ] **Análisis de gas costs**
  - Función | Gas Actual | Optimización Posible
  - `purchaseWithETH` | ~198k | ✅ Try/catch añade 15k (aceptable)
  - `purchaseWithBHT` | ~180k | ✅ Optimizado
  - `emergencyWithdrawETH` | ~52k | ✅ Pull-payment pattern
  - `claimProjectFunds` | N/A | Requiere medición
  
- [ ] **Verificar no hay optimizaciones obvias perdidas**
  - [ ] Usar `calldata` en lugar de `memory` donde sea posible
  - [ ] Packed storage variables (uint16, uint32 juntos)
  - [ ] Unchecked blocks para aritmética segura

### 9. Frontend Integration Testing
- [ ] **Verificar ABI compatibility**
  - [ ] Exportar ABIs actualizados
  - [ ] Verificar funciones removidas no se usan en frontend
  - [ ] Actualizar interfaces TypeScript/JavaScript
  
- [ ] **Tests de integración E2E**
  - [ ] Flujo completo de compra NFT
  - [ ] Sistema de referidos
  - [ ] Manejo de errores y reverts

---

## 🟢 LOW PRIORITY - NICE TO HAVE

### 10. Monitoreo y Alertas Post-Deployment
- [ ] **Setup Tenderly monitoring**
  - [ ] Alertas de transacciones fallidas
  - [ ] Monitoring de eventos críticos
  - [ ] Dashboard de métricas
  
- [ ] **Defender (OpenZeppelin) o similar**
  - [ ] Automated security monitoring
  - [ ] Pausable controls
  - [ ] Admin actions logging

### 11. Documentación Adicional
- [ ] **README actualizado**
  - [ ] Deployment instructions
  - [ ] Contract addresses (mainnet)
  - [ ] Architecture diagrams
  
- [ ] **CHANGELOG.md**
  - [ ] Documentar funciones removidas
  - [ ] Justificación de contract size optimization
  - [ ] Breaking changes en ABI

### 12. Contingency Plans
- [ ] **Plan de pausa de emergencia**
  - [ ] Procedimiento para pausar contratos
  - [ ] Multisig setup para EMERGENCY_ROLE
  - [ ] Comunicación a usuarios
  
- [ ] **Upgrade path (si fuera necesario)**
  - [ ] Estrategia de migración de datos
  - [ ] Nuevo deployment vs proxy pattern
  - [ ] Timeline estimado

---

## 📊 MÉTRICAS ACTUALES

### Contratos Principales
| Contrato | Tamaño | Límite | Margen | Estado |
|----------|--------|--------|--------|--------|
| BashoodPresaleFinal | 16,952 bytes | 24,576 bytes | 31.03% | ✅ OK |
| BashoodMultiToken | 8,023 bytes | 24,576 bytes | 67.35% | ✅ OK |
| BashoodRescue | 5,468 bytes | 24,576 bytes | 77.75% | ✅ OK |
| BashoodReferral | 2,770 bytes | 24,576 bytes | 88.73% | ✅ OK |
| ChainlinkPriceFeed | 1,420 bytes | 24,576 bytes | 94.22% | ✅ OK |

### Tests
| Categoría | Cantidad | Status |
|-----------|----------|--------|
| PoC Seguridad | 4/4 passing | ✅ |
| Suite Completa | 264 passing | ✅ |
| Pending | 30 | ⚠️ |
| Failing (funciones removidas) | 64 | ⚠️ Requiere limpieza |

### Seguridad (Slither)
- **Issues Críticos:** 0 ✅
- **Issues Altos:** 0 ✅
- **Issues Medios:** 0 ✅
- **Issues Bajos:** 0 ✅
- **Informational:** 0 ✅

---

## 🎯 CRITERIOS DE APROBACIÓN MAINNET

Para proceder con deployment a mainnet, TODOS estos criterios deben cumplirse:

### Criterios Técnicos MUST
- [x] ✅ Contract size < 24KB (BashoodPresaleFinal: 16.9KB)
- [x] ✅ Slither 0 critical/high issues
- [x] ✅ Tests PoC seguridad passing (4/4)
- [ ] ⏳ Testnet deployment exitoso
- [ ] ⏳ Smoke tests en testnet passing
- [ ] ⏳ Auditoría externa completada
- [ ] ⏳ Remediación de findings aplicada

### Criterios Operacionales MUST
- [ ] ⏳ Multisig wallet configurado para ADMIN_ROLE
- [ ] ⏳ Multisig wallet configurado para EMERGENCY_ROLE
- [ ] ⏳ Oracle Chainlink validado en testnet
- [ ] ⏳ Gas costs medidos y aprobados
- [ ] ⏳ Frontend integrado y testeado
- [ ] ⏳ Plan de contingencia documentado

### Criterios de Documentación MUST
- [x] ✅ Contract size optimization documentado
- [ ] ⏳ NatSpec completo en contratos principales
- [ ] ⏳ README actualizado con addresses mainnet
- [ ] ⏳ Deployment guide documentado

---

## 📅 TIMELINE ESTIMADO

| Fase | Duración | Status |
|------|----------|--------|
| ✅ Contract size optimization | Completado | ✅ |
| ⏳ Cleanup tests deprecated | 1 día | Pendiente |
| ⏳ Testnet deployment | 2-3 días | Pendiente |
| ⏳ NatSpec documentation | 3-4 días | Pendiente |
| ⏳ Auditoría externa | 2-4 semanas | Pendiente |
| ⏳ Remediación findings | 1-2 semanas | Pendiente |
| ⏳ Final testing & verification | 1 semana | Pendiente |
| 🎯 **MAINNET DEPLOYMENT** | **~6-8 semanas** | Estimado |

---

## 🚨 RIESGOS IDENTIFICADOS

### Riesgo Alto ⚠️
1. **Oracle Chainlink validation**
   - `answeredInRound >= roundId` no ejecuta en tests
   - **Mitigación:** Validación manual en testnet con oracle real
   - **Fallback:** Otras validaciones activas (answer > 0, updatedAt, staleness)

### Riesgo Medio ⚠️
2. **Funciones removidas**
   - 64 tests failing, posible confusión en futuro
   - **Mitigación:** Documentación clara, código comentado disponible
   
3. **Contract size cerca límite histórico**
   - Aunque ahora 31% margen, futuras features podrían acercar al límite
   - **Mitigación:** Arquitectura modular, contratos satélite para nuevas features

### Riesgo Bajo ⚠️
4. **Gas costs try/catch referral**
   - +15k gas overhead aceptable pero monitoreable
   - **Mitigación:** Documentado, puede optimizarse en v2 si necesario

---

## ✅ SIGN-OFF REQUERIDOS

Antes de mainnet deployment, los siguientes roles deben aprobar:

- [ ] **Tech Lead/Architect** - Revisión técnica completa
- [ ] **Security Lead** - Aprobación post-auditoría
- [ ] **Product Owner** - Funcionalidad cumple requirements
- [ ] **DevOps Lead** - Infrastructure y monitoring listo
- [ ] **Legal/Compliance** - Review regulatorio (si aplica)

---

## 📝 NOTAS FINALES

### Cambios Mayores desde Baseline
1. ✅ Contract size reducido 30.81% (24.5KB → 16.9KB)
2. ✅ Funciones no-core removidas (propuestas, pagos, delegación)
3. ✅ Try/catch en referral calls (seguridad mejorada)
4. ✅ Slither issues resueltos (202 → 0)
5. ✅ Zero-address validations añadidas
6. ✅ Solidity version consolidado (^0.8.20/^0.8.28)

### Recursos Adicionales
- **Backup pre-optimization:** `backup/pre-library-refactor_2025-12-10_200411`
- **Documentación detallada:** `CONTRACT_SIZE_OPTIMIZATION.md`
- **Slither reports:** `slither-report-full-2025-12-10.json`
- **PoC tests:** `test/poc.*.test.js`

### Contactos Clave
- **Auditorías:** [Pendiente selección auditor]
- **Oracle Support:** Chainlink documentation
- **Emergency Contact:** [Configurar multisig admins]

---

**VERSIÓN:** 1.0  
**ÚLTIMA ACTUALIZACIÓN:** 10 de diciembre de 2025  
**PRÓXIMA REVISIÓN:** Después de testnet deployment

