# 🚀 PLAN FINAL PARA MAINNET DEPLOYMENT

## Fecha: 9 de Febrero 2026
## Estado: Pre-deployment

---

## 📊 ANÁLISIS DE ESTADO ACTUAL

### ✅ Completado (100%)

1. **Security Audit** ✅
   - 25/25 vectores de ataque bloqueados (100%)
   - Scripts: security-attack-tests.cjs, security-advanced-tests.cjs
   - Reporte: SECURITY_AUDIT_REPORT.md

2. **Payment Distribution** ✅
   - Distribución 45/25/20/10 validada
   - Tests básicos (16 ETH) y extremos (300 ETH) ejecutados
   - PaymentSplitter con releaseAll() funcionando
   - Scripts de monitoreo creados

3. **Burn Mechanism** ✅
   - Verificado: 0.1% burn + 0.5% fee = 0.6% total
   - Investigación completa con 4 escenarios
   - Reporte: Sección en SECURITY_AUDIT_REPORT.md

4. **Backup** ✅
   - BASHOOD-BACKUP-FINAL creado
   - 2,367 archivos (147.14 MB)
   - Verificado con CONTENIDO-VERIFICADO.txt

### ⚠️ ISSUES CRÍTICOS (Deben resolverse ANTES de mainnet)

#### 1. **CRÍTICO: BashoodPresaleFinal excede límite de 24KB**
```
Contract: BashoodPresaleFinal
Tamaño actual: 25.18 KB
Límite máximo: 24.58 KB (EIP-170)
Exceso: ~0.60 KB (600 bytes)

Status: ❌ NO DEPLOYABLE en mainnet
Prioridad: MÁXIMA
```

**Solución requerida**: Optimización de código (ver sección abajo)

#### 2. **BashoodRWAReference cerca del límite**
```
Contract: BashoodRWAReference
Tamaño actual: 23.33 KB
Límite máximo: 24.58 KB
Margen: 1.25 KB

Status: ⚠️ CERCA DEL LÍMITE
Prioridad: MEDIA
```

**Recomendación**: Monitorear después de optimizar BashoodPresaleFinal

#### 3. **7 Tests fallando**
```
ChainlinkPriceFeed.test.js: 4 tests
BashoodRWAReference.test.js: 3 tests

Status: ⚠️ TESTS ROJOS
Prioridad: ALTA (validar funcionalidad)
```

#### 4. **Configuración de wallets para producción**
```
Issue: treasury === operations en tests
Requerido: 5 wallets Metamask diferentes

Status: ⚠️ NO CONFIGURADO
Prioridad: ALTA
```

---

## 🔧 PLAN DE ACCIÓN (8 PASOS)

### PASO 1: Optimizar BashoodPresaleFinal (CRÍTICO - HOY)
**Objetivo**: Reducir de 25.18 KB a <24 KB (~1200 bytes)

**Técnicas de optimización**:

1. **Optimizador de Solidity** (300-500 bytes)
   ```javascript
   // hardhat.config.js
   solidity: {
     compilers: [{
       version: "0.8.20",
       settings: {
         optimizer: {
           enabled: true,
           runs: 200  // Reducir a 100 o 50 para más optimización
         }
       }
     }]
   }
   ```

2. **Eliminar strings largos** (200-400 bytes)
   - Usar custom errors en vez de require con strings
   - Ejemplo: `require(msg.value == price, "E01")` mejor que mensajes largos

3. **Refactorizar funciones largas** (200-300 bytes)
   - Extraer lógica común a funciones internas
   - Usar libraries externas para código compartido

4. **Remover código no usado** (100-200 bytes)
   - Eliminar funciones de debug/test
   - Remover imports innecesarios

5. **Usar uint96/uint128 en vez de uint256** (50-100 bytes)
   - Para variables que no necesitan 256 bits
   - Ejemplo: timestamps, counters pequeños

**Archivo a modificar**: `contracts/BashoodPresaleFinal.sol`

**Validación**:
```bash
npx hardhat compile
# Verificar que nuevo tamaño < 24 KB
```

---

### PASO 2: Verificar tests fallidos
**Objetivo**: Asegurar que toda la funcionalidad crítica está probada

**Tests a revisar**:
```bash
# ChainlinkPriceFeed (4 tests)
npx hardhat test test/poc.chainlinkpricefeed.staleRound.test.js

# BashoodRWAReference (3 tests)
npx hardhat test test/BashoodRWAReference.test.js
```

**Acción**:
- Si son tests de features no críticas: Documentar y postponer
- Si son tests de features críticas: Corregir antes de deployment

---

### PASO 3: Configurar wallets para mainnet
**Objetivo**: Definir 5 wallets Metamask separadas

**Wallets requeridas**:
```
1. TREASURY_WALLET (token fees)       → Metamask wallet 1
2. OPERATIONS_WALLET (presale sales)  → Metamask wallet 2
3. DEVELOPMENT_WALLET (45%)           → Metamask wallet 3
4. MARKETING_WALLET (20%)             → Metamask wallet 4
5. TREASURY_PS_WALLET (10%)           → Metamask wallet 5
```

**CRÍTICO**: `TREASURY_WALLET !== OPERATIONS_WALLET`

**Validación**:
```javascript
// Antes del deployment
assert(TREASURY_WALLET !== OPERATIONS_WALLET, "Deben ser diferentes");
```

**Archivo**: Crear `.env.mainnet` con las addresses

---

### PASO 4: Crear script de deployment final
**Objetivo**: Script de deployment automático con validaciones

**Características**:
- ✅ Validación de wallets (todas diferentes)
- ✅ Deployment secuencial (Token → NFT → Presale → PaymentSplitter)
- ✅ Configuración post-deployment
- ✅ Verificación en Basescan
- ✅ Logs detallados para auditoría

**Archivo**: `scripts/deploy-mainnet-final.cjs`

**Incluye**:
1. Pre-deployment checks (wallets, balance, gas price)
2. Deployment con try-catch
3. Post-deployment verification
4. Guardar addresses en archivo JSON
5. Instrucciones para verificación manual

---

### PASO 5: Deployment a Base Sepolia (Testnet)
**Objetivo**: Probar deployment completo en testnet

**Pre-requisitos**:
- ✅ Wallet con ETH suficiente (~0.3 ETH)
- ✅ RPC de Base Sepolia configurado
- ✅ Basescan API key

**Proceso**:
```bash
# 1. Verificar balance
npx hardhat run scripts/check-sepolia-balance.cjs --network baseSepolia

# 2. Deploy
npx hardhat run scripts/deploy-mainnet-final.cjs --network baseSepolia

# 3. Verificar contratos
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

**Testing en testnet**:
1. Compra con ETH (10 NFTs)
2. Compra con BHT (5 NFTs)
3. Claim de PaymentSplitter
4. Verificar distribución de fondos
5. Verificar burn/fee del token

---

### PASO 6: Testing exhaustivo en Sepolia
**Objetivo**: Validar TODAS las funcionalidades en testnet

**Test cases**:

1. **Presale ETH**
   - Compra 1 NFT
   - Compra maxPerUser (100 NFTs)
   - Intento de compra > maxPerUser (debe fallar)

2. **Presale BHT**
   - Compra 1 NFT
   - Verificar burn (0.1%)
   - Verificar fee (0.5%)
   - Verificar ops recibe 99.4%

3. **Payment Distribution**
   - claimProjectFunds()
   - releaseAll()
   - Verificar distribución 45/25/20/10

4. **Security**
   - Intentar ataques básicos (firma inválida, etc.)
   - Verificar que todo está bloqueado

5. **Price Oracle**
   - Compra con precio actualizado
   - Verificar staleness protection

**Checklist**:
- [ ] Compras ETH funcionan
- [ ] Compras BHT funcionan
- [ ] Burn/fee aplicado correctamente
- [ ] PaymentSplitter distribuye correctamente
- [ ] Ataques bloqueados
- [ ] Price oracle funcional
- [ ] Referral system funcional

---

### PASO 7: Preparación final para mainnet
**Objetivo**: Checklist completo antes de deployment

**Documentación**:
- [ ] MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md actualizado
- [ ] Addresses de wallets documentadas
- [ ] Private keys respaldadas en cold storage
- [ ] Plan de contingencia documentado

**Configuración**:
- [ ] Gas price óptimo analizado
- [ ] Balance ETH suficiente (~1 ETH)
- [ ] Basescan API key configurado
- [ ] RPC URL de mainnet configurado

**Contratos**:
- [ ] BashoodPresaleFinal < 24 KB ✅
- [ ] Todos los contratos compilados sin warnings
- [ ] Tests críticos pasando
- [ ] Security audit 100% ✅

**Wallets**:
- [ ] 5 wallets Metamask creadas
- [ ] Todas diferentes (validado)
- [ ] Addresses documentadas
- [ ] Multisig planeado para fase 2

---

### PASO 8: Deployment a Base Mainnet
**Objetivo**: Deployment final a producción

**Pre-deployment**:
```bash
# 1. Verificar configuración
cat .env.mainnet

# 2. Verificar balance
npx hardhat run scripts/check-mainnet-balance.cjs --network baseMainnet

# 3. Analizar gas price
# https://basescan.org/gastracker

# 4. PAUSA - Revisar TODO el checklist
```

**Deployment**:
```bash
# Ejecutar deployment
npx hardhat run scripts/deploy-mainnet-final.cjs --network baseMainnet

# Guardar addresses INMEDIATAMENTE
# Verificar en Basescan que todo se deployó correctamente
```

**Post-deployment inmediato**:
1. Verificar contratos en Basescan
2. Guardar addresses en archivo seguro
3. Transferir ownership a multisig (si aplica)
4. Configurar frontend con addresses
5. Ejecutar smoke tests

**Validación en mainnet**:
1. Compra de prueba con ETH (0.1 ETH = 1 NFT)
2. Compra de prueba con BHT (25,000 BHT)
3. Verificar burn/fee
4. Verificar PaymentSplitter
5. Monitorear por 24 horas

---

## 📝 ARCHIVOS A CREAR/ACTUALIZAR

### Nuevos archivos:
1. `scripts/optimize-bashood-presale.md` - Guía de optimización
2. `scripts/deploy-mainnet-final.cjs` - Script de deployment
3. `.env.mainnet` - Configuración de mainnet
4. `MAINNET_ADDRESSES.json` - Addresses deployadas
5. `POST_DEPLOYMENT_CHECKLIST.md` - Validación post-deployment

### Actualizar:
1. `hardhat.config.js` - Optimizer settings
2. `contracts/BashoodPresaleFinal.sol` - Optimizaciones
3. `MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md` - Checklist actualizado
4. `PRODUCTION_WALLET_CONFIG.md` - Addresses finales

---

## 🎯 TIMELINE ESTIMADO

### Día 1-2: Optimización (CRÍTICO)
- ⏱️ 4-6 horas
- Optimizar BashoodPresaleFinal de 25.18 KB → <24 KB
- Compilar y validar
- Re-ejecutar security tests

### Día 3: Tests y configuración
- ⏱️ 3-4 horas
- Revisar 7 tests fallidos
- Crear 5 wallets Metamask
- Documentar addresses

### Día 4: Deployment testnet
- ⏱️ 2-3 horas
- Deployment a Base Sepolia
- Testing exhaustivo
- Validación completa

### Día 5: Preparación mainnet
- ⏱️ 2-3 horas
- Revisar checklist completo
- Backup final
- Preparar scripts

### Día 6: Mainnet deployment
- ⏱️ 1-2 horas deployment + 24h monitoreo
- Deployment a Base Mainnet
- Verificación
- Monitoreo inicial

**Total estimado**: 5-6 días de trabajo

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: BashoodPresaleFinal no se puede optimizar a <24 KB
**Probabilidad**: Baja (20%)
**Impacto**: Alto
**Mitigación**: 
- Dividir contrato en 2 partes (BashoodPresaleCore + BashoodPresaleExtension)
- Usar proxy pattern (más complejo, más gas)

### Riesgo 2: Tests fallidos revelan bugs críticos
**Probabilidad**: Media (30%)
**Impacto**: Alto
**Mitigación**:
- Analizar tests ANTES de deployment
- Corregir bugs encontrados
- Re-ejecutar security audit si es necesario

### Riesgo 3: Gas price muy alto en mainnet
**Probabilidad**: Media (40%)
**Impacto**: Medio
**Mitigación**:
- Monitorear gas price en https://basescan.org/gastracker
- Deployar en horas de bajo tráfico (madrugada UTC)
- Tener ETH extra por si acaso

### Riesgo 4: Error en deployment de mainnet
**Probabilidad**: Baja (15%)
**Impacto**: Crítico
**Mitigación**:
- Testing exhaustivo en Sepolia primero
- Deployment script con validaciones
- Plan de rollback documentado

---

## 📊 MÉTRICAS DE ÉXITO

### Pre-deployment:
- [x] Security audit: 100% (25/25) ✅
- [ ] Contract size: BashoodPresaleFinal < 24 KB
- [ ] Tests passing: >95%
- [ ] Wallets configured: 5 different addresses

### Post-deployment testnet:
- [ ] 10 compras ETH exitosas
- [ ] 10 compras BHT exitosas
- [ ] Burn/fee working correctly
- [ ] PaymentSplitter distribution correct
- [ ] No vulnerabilities found

### Post-deployment mainnet:
- [ ] Contracts verified on Basescan
- [ ] First purchase successful
- [ ] Burn/fee applied correctly
- [ ] PaymentSplitter working
- [ ] No critical issues in 24h

---

## 🚀 PRÓXIMA ACCIÓN INMEDIATA

**PASO 1**: Optimizar BashoodPresaleFinal

```bash
# 1. Analizar código actual
code contracts/BashoodPresaleFinal.sol

# 2. Aplicar optimizaciones (ver guía detallada abajo)

# 3. Compilar y verificar tamaño
npx hardhat compile

# 4. Validar que funcionalidad no se rompió
npx hardhat test test/BashoodPresaleFinal.test.js
```

**Meta**: Reducir de 25.18 KB a <24 KB (objetivo: 23.5 KB para margen)

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Security 100%
- [PRODUCTION_WALLET_CONFIG.md](./PRODUCTION_WALLET_CONFIG.md) - Wallets config
- [PAYMENT_DISTRIBUTION_REPORT.md](./PAYMENT_DISTRIBUTION_REPORT.md) - Distribution tests
- [MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md](./MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md) - Checklist

**Backup**: BASHOOD-BACKUP-FINAL (C:\Users\Franchu\Desktop\)

---

**Última actualización**: 9 de Febrero 2026  
**Status**: ⚠️ BLOQUEADO por tamaño de contrato  
**Próxima acción**: Optimizar BashoodPresaleFinal  
**ETA para mainnet**: 5-6 días (si optimización exitosa)
