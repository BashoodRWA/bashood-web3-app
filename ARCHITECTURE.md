# Arquitectura del Proyecto Bashood

## Estado: Cerrada para BashoodPresaleFinal (2026-03-23)

---

## 1. Contrato principal — BashoodPresaleFinal.sol

### Responsabilidad
Orquestador de presale. Gestiona el flujo de compra (ETH y BHT), ciclo de vida de la presale, integración con oracle Chainlink, sistema de referidos y mecanismos de rescue.

### Estado del bytecode

| Métrica | Valor | Fecha |
|---|---|---|
| Bytecode desplegado | 18,306 bytes (17.88 KB) | 2026-03-23 |
| Límite EVM (EIP-170) | 24,576 bytes (24.0 KB) | — |
| Margen disponible | 6,270 bytes (6.12 KB) | 2026-03-23 |
| Optimizer | `runs: 10`, `enabled: true` | — |
| EVM target | `cancun` | — |

### Regla de tamaño
Un PR que incremente el bytecode de BashoodPresaleFinal.sol más de **512 bytes (~0.5 KB)** requiere revisión de arquitectura antes de mergear. Medir con:
```powershell
$j = Get-Content "artifacts/contracts/BashoodPresaleFinal.sol/BashoodPresaleFinal.json" | ConvertFrom-Json
[math]::Round((($j.deployedBytecode.Length - 2) / 2) / 1024, 2)
```

---

## 2. Regla de congelación del contrato principal

> **BashoodPresaleFinal.sol está cerrado para nueva lógica de negocio.**

### Lo que PUEDE cambiar en el contrato
- Correcciones de seguridad identificadas en audit externo
- Ajuste de parámetros admin (setters ya existentes)
- Cambios mínimos de interfaz requeridos por el auditor

### Lo que NO puede entrar en el contrato
- Nueva lógica de cálculo (descuentos, conversiones de precio, fees)
- Nuevos flujos de compra o pago
- Nuevas estructuras de datos (mappings, arrays, structs)
- Integraciones con nuevos protocolos externos
- Cualquier función que no existía en la versión auditada

### Dónde va la nueva funcionalidad
```
Nueva funcionalidad
        │
        ├─ Cálculos/validaciones  → library en contracts/libraries/
        ├─ Módulo de dominio      → contracts/modules/  (patrón existente)
        └─ Contrato auxiliar      → invocado por BashoodPresaleFinal mediante interfaz
```

---

## 3. Lógica interna actual (no externalizada — decisión deliberada)

La siguiente lógica vive dentro del contrato y **no se moverá a libraries antes del audit externo**. Razonamiento: refactorizar hacia libraries introduce superficie de error nueva (contexto `msg.sender`, delegatecall semantics, rounding cross-context) que requeriría re-verificación completa del test suite. El ciclo correcto es:

```
Estado actual → Testnet → Audit externo → Opción B si auditor lo recomienda
```

| Función interna | Descripción |
|---|---|
| `_getOracleData()` | Validación única del oracle Chainlink (staleness, roundId, answer) |
| `_bhtFromFiat()` | Conversión fiat USD → BHT usando decimales del feed |
| `_calculateBhtAmounts()` | Descuento + burn + ops split para compras BHT |
| `_transferAndBurnBHT()` | Burn con fallback a transfer-to-dead si burnFrom falla |
| `_verifySignature()` | EIP-191 + ECDSA recover contra signerAddress |
| `_isContract()` | Assembly extcodesize para validación de direcciones en constructor |
| `_payServiceWithBHT()` | Implementación interna de pago de servicio |
| `_payMilestoneWithBHT()` | Implementación interna de pago de milestone |

---

## 4. Módulos externos (contracts/modules/)

Los módulos siguen el patrón: **contratos independientes con ownership, invocados por BashoodNFTCore o integraciones externas — nunca llamados desde BashoodPresaleFinal.**

| Módulo | Responsabilidad | Estado |
|---|---|---|
| `MaintenanceHistoryModule.sol` | Historial de mantenimiento por token (RWA) | ✅ Productivo |
| `InspectionModule.sol` | Historial de inspección por token (RWA) | ✅ Productivo |
| `CertificationModule.sol` | Certificaciones por token | ✅ Productivo |
| `OracleValuationModule.sol` | Valoración oracle por token | ✅ Productivo |
| `DepreciationEngine.sol` | Motor de depreciación | ✅ Productivo |
| `FeeDiscountModule.sol` | Descuentos de fees | ✅ Productivo |
| `LifecycleEventsModule.sol` | Eventos de ciclo de vida | ✅ Productivo |

### Invariantes de módulos (Phase 8, 2026)
- Whitelist **per-token**: `mapping(uint256 => mapping(address => bool))` — una empresa autorizada para el token A no puede escribir en el token B.
- Rate-limiting: `maxWritesPerEpoch = 20`, `epochDuration = 1 hour` — mitigación de Storage DoS.
- Owner siempre exento del rate-limit.

---

## 5. Contratos de infraestructura

| Contrato | Responsabilidad |
|---|---|
| `BashoodReferral.sol` | Sistema de referidos, inmutable en presale |
| `BashoodRWAReference.sol` | ERC721 RWA core con módulos |
| `BashoodRescue.sol` | Rescue de fondos, ERC165-verificado desde presale |
| `AggregatorV3Interface.sol` | Interfaz Chainlink ETH/USD |

---

## 6. Test suite — estado en fecha de congelación

| Suite | Tests | Estado |
|---|---|---|
| Hardhat | 1054 passing | ✅ 0 failing |
| Forge (10k fuzz runs, 10 suites) | 117 passing | ✅ 0 failed |

Cualquier PR que reduzca el número de tests sin justificación documentada es bloqueado.

---

## 7. Lo que falta antes de mainnet (no es arquitectura — es proceso)

1. **Audit externo** — ConsenSys Diligence / OpenZeppelin / Spearbit. Contratar con el código en este estado exacto.
2. **Infraestructura multi-sig** — Gnosis Safe 3-of-5 en Base Sepolia antes de testnet público.
3. **Despliegue testnet** — Base Sepolia con scripts de deploy documentados.
4. **Timelock** — para funciones admin críticas (`setBurnBps`, `setDiscountBps`, `setPriceFeed`).

---

## 8. Log de decisiones arquitectónicas

| Fecha | Decisión | Alternativa descartada | Razón |
|---|---|---|---|
| 2026-03-23 | Congelar BashoodPresaleFinal en estado monolítico | Refactorizar a libraries (Opción B) | Refactorizar pre-audit introduce riesgo sin beneficio hasta que el auditor valide la lógica actual |
| 2026-03-23 | Consolidar validación oracle en `_getOracleData()` | Mantener duplicación en `_bhtFromFiat` + `_calculateBhtAmounts` | DRY, −384 bytes bytecode, todos los mensajes de revert preservados |
| 2026-03-23 | No limpiar rescue (try/catch con string concat) | Simplificar a custom errors | Tests explícitamente comprueban el mensaje concatenado — cambio rompería suite |
| Phase 8 | Rate-limiting por epoch en módulos RWA | Sin límite | Mitigación de Storage DoS Medium finding |
| Phase 8 | Whitelist per-token en módulos | Whitelist global | Empresa A no debe poder escribir en token de empresa B |
