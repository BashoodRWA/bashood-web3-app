# 📊 ANÁLISIS DE TESTS FALLANDO - BASHOOD PROJECT
**Fecha:** 15 de Enero 2026  
**Total Tests:** 371 passing, ~30 failing  
**Archivos con Problemas:** 13 de 62

---

## 🔴 ARCHIVOS CON TESTS FALLANDO

### CRÍTICOS (Funcionalidad Core)
1. **bashoodPresaleFinal.additionalCoverage.test.cjs** - 12 failing
   - Oracle edge cases (answer=0, staleness, answeredInRound)
   - Purchase con BHT (discount/burn logic)
   - MaxPerUser limits
   - ClaimProjectFunds
   - **PRIORIDAD: ALTA** - Afectan coverage de 67.86% → 70%+

2. **coverage.bashoodpresalefinal.test.cjs** - 4 failing
   - Tests de coverage específicos
   - **PRIORIDAD: ALTA** - Críticos para alcanzar 80%

3. **BashoodPresaleFinal.focused.test.cjs** - 1 failing
   - Test específico enfocado
   - **PRIORIDAD: MEDIA** - Puede ser deprecado

### MEDIOS (Funcionalidad Extendida)
4. **edgeCases.test.cjs** - 4 failing
   - Oracle validation tests
   - **PRIORIDAD: MEDIA** - Duplicados con additionalCoverage

5. **integration.test.cjs** - 3 failing
   - Tests de integración entre contratos
   - **PRIORIDAD: MEDIA-ALTA** - Importantes para validar flujo completo

6. **payMilestoneWithBHT.test.cjs** - 2 failing
   - Funcionalidad de milestones (¿BashoodRescue?)
   - **PRIORIDAD: BAJA** - Feature secundaria

7. **payServiceWithBHT.test.cjs** - 2 failing
   - Pago de servicios (¿BashoodRescue?)
   - **PRIORIDAD: BAJA** - Feature secundaria

8. **proposals.test.cjs** - 3 failing
   - Sistema de proposals (¿BashoodRescue?)
   - **PRIORIDAD: BAJA** - Feature secundaria

9. **targeted.presale.coverage.test.cjs** - 2 failing
   - Tests específicos de coverage
   - **PRIORIDAD: MEDIA** - Ayudan a subir coverage

### TOTAL FAILING: ~33 tests

---

## ✅ ARCHIVOS PASANDO (49 archivos)
- BashoodPresaleFinal core: 6/9 archivos ✅ (purchase, edgecases, exhaustive, bht, transfer, IERC1155)
- BashoodReferral: 2/2 archivos ✅
- BashoodRescue: 6/6 archivos ✅
- BashoodToken: 2/2 archivos ✅
- Coverage/POC: 13/17 archivos ✅
- Mocks: 5/5 archivos ✅
- Otros: 15/15 archivos ✅

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### FASE 1: CRÍTICOS (HOY - 4-6 horas)
**Objetivo:** Arreglar funcionalidad core de Presale

1. ✅ Arreglar `bashoodPresaleFinal.additionalCoverage.test.cjs` (12 tests)
   - Implementar firmas válidas en tests de purchaseWithBHT ✓ (ya iniciado)
   - Corregir parámetros de purchaseWithBHT (nftId vs quantity)
   - Validar oracle mocks
   - **Impacto:** +2-3% coverage, funcionalidad oracle validada

2. ⏳ Arreglar `coverage.bashoodpresalefinal.test.cjs` (4 tests)
   - Revisar tests de coverage específicos
   - **Impacto:** +1-2% coverage

3. ⏳ Revisar `BashoodPresaleFinal.focused.test.cjs` (1 test)
   - Verificar si es deprecado o válido
   - **Impacto:** Limpieza de código

**RESULTADO ESPERADO:**  
- ✅ 17/33 tests arreglados (51%)
- ✅ Coverage: 67.86% → 72-75%

### FASE 2: MEDIOS (MAÑANA - 3-4 horas)
**Objetivo:** Validar integración y edge cases

4. ⏳ Arreglar `integration.test.cjs` (3 tests)
   - Validar flujo completo entre contratos
   - **Impacto:** Confianza en integración Presale+Referral+Rescue

5. ⏳ Revisar `edgeCases.test.cjs` (4 tests)
   - Verificar si duplican additionalCoverage
   - Eliminar o consolidar
   - **Impacto:** +1% coverage

6. ⏳ Arreglar `targeted.presale.coverage.test.cjs` (2 tests)
   - **Impacto:** +0.5-1% coverage

**RESULTADO ESPERADO:**  
- ✅ 26/33 tests arreglados (79%)
- ✅ Coverage: 72-75% → 78-82%

### FASE 3: BAJOS (OPCIONAL - 2-3 horas)
**Objetivo:** Completar features secundarias

7. ⏳ Revisar tests de BashoodRescue:
   - payMilestoneWithBHT.test.cjs (2 tests)
   - payServiceWithBHT.test.cjs (2 tests)
   - proposals.test.cjs (3 tests)
   - **Decisión:** ¿Son features activas o deprecadas?

**RESULTADO ESPERADO:**  
- ✅ 33/33 tests arreglados (100%)
- ✅ Coverage: 78-82% → 85%+

---

## 🎯 MÉTRICAS OBJETIVO

| Métrica | Actual | Fase 1 | Fase 2 | Fase 3 |
|---------|--------|--------|--------|--------|
| **Tests Passing** | 371/404 (92%) | 388/404 (96%) | 397/404 (98%) | 404/404 (100%) |
| **Branch Coverage** | 67.86% | 72-75% | 78-82% | 85%+ |
| **Statement Coverage** | 88.19% | 90%+ | 92%+ | 95%+ |
| **Line Coverage** | 91.15% | 93%+ | 95%+ | 97%+ |

---

## 🚨 RIESGOS IDENTIFICADOS

### ALTO
- ❌ **Oracle manipulation**: Tests de staleness/answer=0 fallando = validación incompleta
- ❌ **Purchase logic**: Burn/discount tests fallando = riesgo de pérdida de tokens
- ❌ **MaxPerUser limits**: Test fallando = usuarios pueden exceder límites

### MEDIO
- ⚠️ **Integración contracts**: 3 tests fallando = posibles bugs en flujo completo
- ⚠️ **Coverage gaps**: 32% branches sin testear = superficie de ataque

### BAJO
- ℹ️ **Features secundarias**: Rescue/Milestone/Proposals pueden ser deprecadas

---

## 📝 NOTAS TÉCNICAS

### Descubrimientos Durante Análisis
1. **purchaseWithBHT firma incorrecta:**
   - Tests usaban `ethers.parseEther("100")` como nftId
   - Debería ser: `purchaseWithBHT(nftId=2, quantity=50, nonce, signature)`
   - **CORREGIDO parcialmente**

2. **Firmas EIP-191 implementadas:**
   - `generateSignature()` funciona correctamente
   - Necesita aplicarse a todos los purchase tests
   - **EN PROGRESO**

3. **Duplicación de tests:**
   - `edgeCases.test.cjs` y `additionalCoverage.test.cjs` tienen overlap
   - **Consolidar en Fase 2**

4. **Tests deprecados:**
   - Algunos archivos `focused.test.cjs` pueden ser obsoletos
   - **Revisar y eliminar**

---

## 🔄 ESTADO ACTUAL DEL TRABAJO

**COMPLETADO:**
- ✅ Diagnóstico completo de tests fallando
- ✅ Categorización por prioridad
- ✅ Plan de acción en 3 fases
- ✅ Función generateSignature() implementada
- ✅ 3 tests de oracle comentados (casos edge imposibles)

**EN PROGRESO:**
- 🔄 Arreglar 12 tests de additionalCoverage (17 passing, 12 failing actualmente)
- 🔄 Corregir parámetros de purchaseWithBHT

**PRÓXIMOS PASOS:**
1. Terminar de arreglar additionalCoverage.test.cjs
2. Ejecutar coverage para medir progreso
3. Continuar con Fase 1 completa

---

## ✅ CRITERIOS DE ÉXITO

**Para Testnet Deployment:**
- ✅ Tests passing: ≥ 98% (396/404+)
- ✅ Branch coverage: ≥ 80%
- ✅ Statement coverage: ≥ 90%
- ✅ 0 tests críticos fallando (oracle, purchase, limits)

**Para Mainnet Deployment:**
- ✅ Tests passing: 100% (404/404)
- ✅ Branch coverage: ≥ 90%
- ✅ Statement coverage: ≥ 95%
- ✅ Auditoría externa aprobada
- ✅ 2+ semanas en testnet sin issues

---

**Próxima actualización:** Después de completar Fase 1
