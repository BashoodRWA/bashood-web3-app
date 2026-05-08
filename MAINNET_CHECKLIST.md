# Checklist MUST - Pre-Mainnet Deployment
**Proyecto:** Bashood Web3 App  
**Fecha:** 10 diciembre 2025  
**Contratos prioritarios:** BashoodRescue, BashoodPresaleFinal, BashoodMultiToken

---

## ✅ SEGURIDAD - Hallazgos Críticos

### 🔴 CRÍTICO - Reentrancy & Arbitrary Send ETH

- [ ] **BashoodRescue.emergencyWithdrawETH**
  - [ ] Añadir `ReentrancyGuard` y decorar función con `nonReentrant`
  - [ ] Mover emisión de evento ANTES de la llamada externa
  - [ ] Considerar implementar pull-payment pattern para mayor seguridad
  - [ ] Restringir destinatario a una wallet pre-configurada en lugar de parámetro arbitrary
  - [ ] PoC test verificado: `test/poc.bashoodrescue.reentrancy.test.js`

- [ ] **BashoodMultiToken.mintAllNFTs**
  - [ ] Actualizar estado (`nftOwners[i]`) ANTES de llamar a `_mint()`
  - [ ] Alternativa: migrar a `_mintBatch()` para reducir callbacks
  - [ ] Añadir `nonReentrant` si no se cambia el orden de operaciones
  - [ ] PoC test verificado: `test/poc.bashoodmultitoken.reentrancy.test.js`

- [ ] **BashoodPresaleFinal - Múltiples vectores**
  - [ ] Wrap `projectWallet.call{value: ...}` en try/catch en `purchaseWithETH`
  - [ ] Añadir `nonReentrant` a funciones de purchase
  - [ ] Validar y capturar reverts de `referral.rewardReferrer()` con try/catch
  - [ ] PoC test verificado: `test/poc.bashoodpresale.referralRevert.test.js`

### 🟡 ALTO - Oráculos y Price Feeds

- [ ] **ChainlinkPriceFeed - Valores ignorados**
  - [ ] Validar `answeredInRound >= roundId` para evitar datos stale
  - [ ] No ignorar valores de retorno de `latestRoundData()`
  - [ ] Implementar checks de `answer > 0` y dentro de rangos razonables
  - [ ] Documentar límites de staleness y máximo cambio de precio permitido
  - [ ] Tests de oráculos verificados: `test/oracles.*.test.js`

- [ ] **BashoodPresaleFinal - Oracle Usage**
  - [ ] Validar `block.timestamp - updatedAt <= maxPriceStaleness` en TODAS las llamadas
  - [ ] Añadir circuit-breaker si precio cambia más de X% entre llamadas
  - [ ] Implementar fallback oracle o modo de emergencia
  - [ ] Considerar usar Chainlink Data Streams para menor latencia

### 🟡 ALTO - Validaciones y Checks

- [ ] **Zero Address Validations**
  - [ ] Añadir checks de `!= address(0)` en TODOS los constructores y setters
  - [ ] Lista de funciones afectadas (ver Slither output):
    - `MockPresale.setRescueContract`
    - `MockTreasuryHandler.initialize/updateTreasuryWallet`
    - `TokenWrapperERC20.constructor`
    - `MockBHTRejecting/ReturnFalse` setters
    - `RejectingWallet.callWithdraw`

- [ ] **Access Control**
  - [ ] Verificar que TODOS los roles están correctamente asignados en deploy scripts
  - [ ] Documentar matriz de roles y permisos
  - [ ] Implementar timelock para operaciones críticas de admin
  - [ ] Añadir eventos para TODOS los cambios de roles
  - [ ] Verificar que `DEFAULT_ADMIN_ROLE` está protegido

---

## ✅ TESTING & COBERTURA

### Tests Unitarios

- [ ] **Cobertura mínima 95%+**
  - [ ] Ejecutar: `npx hardhat coverage`
  - [ ] Verificar cobertura de branches > 90%
  - [ ] Todos los edge cases cubiertos

- [ ] **PoC Tests Críticos Pasando**
  - [ ] `test/poc.bashoodrescue.reentrancy.test.js` ✓
  - [ ] `test/poc.bashoodpresale.referralRevert.test.js` ✓
  - [ ] `test/poc.bashoodmultitoken.reentrancy.test.js` ✓
  - [ ] Smoke tests suite completa pasando (261+ tests)

### Tests de Integración

- [ ] **Flujos end-to-end**
  - [ ] Presale completa: compra con ETH → mint NFT → reward referral
  - [ ] Presale completa: compra con BHT → burn tokens → mint NFT
  - [ ] Rescue flow: transfer NFT a rescue → rescue → transfer a destino
  - [ ] Emergency scenarios: pause, unpause, emergency withdraw
  - [ ] Oracle failure scenarios: stale price, precio = 0, spike extremo

- [ ] **Gas Optimization Tests**
  - [ ] Verificar límites de gas para `mintAllNFTs` (actualmente ~848k gas)
  - [ ] Optimizar loops y storage writes
  - [ ] Considerar batch operations donde sea posible

### Auditorías Automatizadas

- [ ] **Slither - Issues Resueltos**
  - [ ] Re-ejecutar: `slither . --json slither-final-report.json`
  - [ ] Verificar que hallazgos HIGH están resueltos o documentados
  - [ ] Crear whitelist para false-positives conocidos
  - [ ] Generar informe comparativo antes/después

- [ ] **Otras Herramientas**
  - [ ] Mythril: `myth analyze contracts/BashoodPresaleFinal.sol`
  - [ ] Echidna (fuzzing): configurar y ejecutar 10k+ casos
  - [ ] Manticore (symbolic execution) para funciones críticas

---

## ✅ CÓDIGO & ARQUITECTURA

### Smart Contract Best Practices

- [ ] **OpenZeppelin Contracts**
  - [ ] Actualizar a última versión estable (actualmente 5.4.0)
  - [ ] Verificar compatibilidad de todas las importaciones
  - [ ] Usar versiones auditadas y sin vulnerabilidades conocidas

- [ ] **Solidity Version**
  - [ ] Consolidar a una sola versión (recomendado: ^0.8.28)
  - [ ] Eliminar usos de versiones antiguas (^0.8.7, ^0.8.19, etc.)
  - [ ] Revisar bugs conocidos: https://solidity.readthedocs.io/en/latest/bugs.html

- [ ] **Naming Conventions**
  - [ ] Parámetros privados con underscore: `_paramName`
  - [ ] Constantes en UPPER_CASE_WITH_UNDERSCORES
  - [ ] Funciones en mixedCase
  - [ ] Revisar lista de Slither naming violations

- [ ] **Events**
  - [ ] Emitir eventos para TODOS los cambios de estado críticos
  - [ ] Indexar parámetros importantes (max 3 por evento)
  - [ ] Añadir evento faltante: `TaxHandler.initialize` (setTaxRate)

### Documentación de Código

- [ ] **NatSpec Completo**
  - [ ] Todas las funciones públicas/external documentadas
  - [ ] @param para todos los parámetros
  - [ ] @return para valores de retorno
  - [ ] @notice para usuarios finales
  - [ ] @dev para detalles técnicos

- [ ] **README Técnico**
  - [ ] Arquitectura del sistema
  - [ ] Diagramas de flujo (ya existen en `docs/`)
  - [ ] Instrucciones de deployment
  - [ ] Configuración de oráculos y parámetros

---

## ✅ DEPLOYMENT & CONFIGURACIÓN

### Scripts de Deployment

- [ ] **Deploy Scripts Validados**
  - [ ] `scripts/deploy.js` revisado y testeado en testnet
  - [ ] `scripts/deploy-referral.js` validado
  - [ ] Verificar orden de deployment correcto
  - [ ] Verificar inicialización de contratos (constructor args)

- [ ] **Parámetros de Configuración**
  - [ ] `maxPriceStaleness`: valor apropiado para mainnet (ej: 3600s)
  - [ ] `nftPriceETH` y `nftPriceBHT`: valores definitivos confirmados
  - [ ] Direcciones de wallets: `operationsWallet`, `projectWallet`, `treasury`
  - [ ] Roles iniciales: `ADMIN_ROLE`, `EMERGENCY_ROLE`, `MINTER_ROLE`
  - [ ] Límites: `maxPerUser`, `maxNFTSupply`, etc.

### Testnet Deployment

- [ ] **Sepolia/Goerli Testing**
  - [ ] Deploy completo en testnet
  - [ ] Ejecutar flujos end-to-end en testnet
  - [ ] Verificar contratos en Etherscan
  - [ ] Interactuar vía UI (si existe frontend)
  - [ ] Monitorear eventos y logs

- [ ] **Configuración de Oráculos**
  - [ ] Configurar price feeds de Chainlink en testnet
  - [ ] Verificar que devuelven precios realistas
  - [ ] Probar escenarios de precio stale/cero

---

## ✅ AUDITORÍA EXTERNA

### Pre-Auditoría

- [ ] **Preparar Documentación**
  - [ ] Architecture overview
  - [ ] Known issues and mitigations
  - [ ] Areas of concern para auditores
  - [ ] Test coverage report

- [ ] **Code Freeze**
  - [ ] Crear tag/release de versión a auditar
  - [ ] No cambios durante auditoría sin aprobación

### Post-Auditoría

- [ ] **Implementar Recomendaciones**
  - [ ] Resolver TODOS los hallazgos CRITICAL y HIGH
  - [ ] Documentar decisiones sobre MEDIUM/LOW/INFO
  - [ ] Re-test después de cambios
  - [ ] Obtener sign-off del auditor

---

## ✅ OPERACIONES & MONITOREO

### Configuración de Monitoreo

- [ ] **Defender/Forta/Tenderly**
  - [ ] Configurar alertas para transacciones críticas
  - [ ] Monitor de balance de contratos
  - [ ] Alertas de funciones de emergency
  - [ ] Dashboard de métricas clave

- [ ] **Multisig Configuration**
  - [ ] Configurar Gnosis Safe para admin operations
  - [ ] Mínimo 3/5 o 4/6 firmas requeridas
  - [ ] Documentar procedimientos de firma

### Procedimientos de Emergencia

- [ ] **Incident Response Plan**
  - [ ] Documentar pasos para pause/unpause
  - [ ] Procedimiento de emergency withdrawal
  - [ ] Contactos y escalation path
  - [ ] Bug bounty program configurado

- [ ] **Upgrade Path (si es upgradeable)**
  - [ ] Proxy pattern documentado
  - [ ] Proceso de upgrade testeado en testnet
  - [ ] Timelock configurado para upgrades

---

## ✅ LEGAL & COMPLIANCE

- [ ] **Terms of Service**
  - [ ] Disclaimer de riesgos
  - [ ] Limitación de responsabilidad
  - [ ] Jurisdicción y ley aplicable

- [ ] **KYC/AML (si aplica)**
  - [ ] Verificar requisitos regulatorios
  - [ ] Implementar límites si es necesario

---

## ✅ FINAL CHECKS

- [ ] **Code Review Completo**
  - [ ] Peer review por al menos 2 desarrolladores senior
  - [ ] Sign-off de tech lead
  - [ ] Security review sign-off

- [ ] **Deployment Checklist**
  - [ ] Dry-run de deployment en fork de mainnet
  - [ ] Gas prices y costs estimados
  - [ ] Plan de comunicación para usuarios
  - [ ] Post-deployment verification script

- [ ] **Backup & Recovery**
  - [ ] Backup de private keys en múltiples ubicaciones seguras
  - [ ] Recovery procedures documentados
  - [ ] Access control lists actualizadas

---

## 📊 Métricas de Éxito

**Pre-Mainnet:**
- [ ] 0 hallazgos CRITICAL en auditoría final
- [ ] 0 hallazgos HIGH sin mitigar
- [ ] 95%+ test coverage
- [ ] 100% PoC tests passing
- [ ] Gas optimization: funciones críticas < 500k gas

**Post-Mainnet (primeras 48h):**
- [ ] 0 reverts inesperados
- [ ] Monitoreo 24/7 activo
- [ ] Equipo de respuesta en standby

---

## 🔗 Referencias y Recursos

- Slither Reports: `slither-report-after-poc-2025-09-22.json`
- PoC Tests: `test/poc.*`
- Propuestas de Parches: `pr/proposal-*.md`
- Documentación Técnica: `docs/`
- Coverage Report: `coverage/index.html`

---

**Última Actualización:** 10 diciembre 2025  
**Responsable:** [Nombre del Tech Lead]  
**Próxima Revisión:** [Fecha antes de mainnet deployment]
