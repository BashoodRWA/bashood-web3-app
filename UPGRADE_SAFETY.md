# UPGRADE SAFETY REPORT — v1.0-mainnet-freeze
**Bashood Protocol · Base L2 · Generado: 2026-03-04**

---

## Resumen Ejecutivo

| Verificación | Resultado |
|---|---|
| 1. `__gap` en BashoodRWAReference | ✅ **PASS** — slot 11, 50 slots reservados |
| 2. OZ `validateImplementation(UUPS)` | ✅ **PASS** — sin variables de estado inválidas |
| 3. Storage layout exportado | ✅ **PASS** — `STORAGE_LAYOUT_v1.0.json` (32.3 KB) |
| 4. Escalada de privilegios módulos → Core | ✅ **PASS** — ningún módulo puede llamar funciones de administración |
| 5. Protección `_authorizeUpgrade` | ✅ **PASS** — exclusivo `UPGRADER_ROLE` |

**Veredicto: BashoodRWAReference está listo para auditoría externa.**

---

## 1. Storage Layout Seguro para Upgrades

### Variables propias de BashoodRWAReference (slots 0–10 + gap)

| Slot | Variable | Tipo | Notas |
|------|----------|------|-------|
| 0 | `_nextTokenId` | `uint256` | Contador de token IDs |
| 1 | `_assetIdentification` | `mapping(uint256 → AssetIdentification)` | Datos de identificación del activo |
| 2 | `_technicalSpecs` | `mapping(uint256 → TechnicalSpecs)` | Especificaciones técnicas |
| 3 | `_financialData` | `mapping(uint256 → FinancialData)` | Datos financieros |
| 4 | `_operationalMetrics` | `mapping(uint256 → OperationalMetrics)` | Métricas operativas |
| 5 | `_certificationData` | `mapping(uint256 → CertificationData)` | Datos de certificación |
| 6 | `_telemetryConfig` | `mapping(uint256 → TelemetryConfig)` | Configuración de telemetría |
| 7 | `_tokenizationConfig` | `mapping(uint256 → TokenizationConfig)` | Configuración de tokenización |
| 8 | `_insuranceData` | `mapping(uint256 → InsuranceData)` | Datos de seguro |
| 9 | `_tokenURIs` | `mapping(uint256 → string)` | URIs por token |
| 10 | `_baseTokenURI` | `string` | URI base |
| **11** | **`__gap`** | **`uint256[50]`** | **Reserva para upgrades futuros** |

### Regla de upgrade

> Para cada nueva variable de estado añadida en BashoodRWAReference v1.1+:
> - Añadir la variable ANTES de `__gap`
> - Reducir `__gap` de `uint256[50]` a `uint256[49]`, `[48]`, etc.
> - Nunca re-ordenar ni eliminar variables existentes.
> - Validar siempre con: `npx hardhat run scripts/export-storage-layout.cjs --no-compile`
>   y comparar contra `STORAGE_LAYOUT_v1.0.json`

### Constructor protegido

```solidity
/// @custom:oz-upgrades-unsafe-allow constructor
constructor() {
    _disableInitializers();
}
```
`_disableInitializers()` garantiza que la implementación no puede ser inicializada directamente.

### UUPS Authorization

```solidity
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
{}
```
Solo cuentas con `UPGRADER_ROLE` (asignado únicamente al `admin` en `initialize()`) pueden aprobar upgrades. No es accesible desde ningún módulo externo.

---

## 2. Storage Layout de Referencia

El archivo `STORAGE_LAYOUT_v1.0.json` contiene:
- Layout completo generado por `solc 0.8.28` con `outputSelection: storageLayout`
- Resultado de `@openzeppelin/hardhat-upgrades validateImplementation({ kind: "uups" })`
- Mapa slot → variable para todos los contratos de la jerarquía de herencia

**Procedimiento para futuros upgrades:**

```bash
# 1. Aplicar cambios en el contrato de implementación
# 2. Validar antes de desplegar:
npx hardhat run scripts/export-storage-layout.cjs --no-compile
# 3. Comparar STORAGE_LAYOUT_{nueva-version}.json contra STORAGE_LAYOUT_v1.0.json
# 4. Verificar que slots 0–10 son idénticos y el gap decrementó correctamente
```

---

## 3. Revisión de Privilegios: Módulos → Core

### Modelo de seguridad de módulos

El patrón Bashood (`BashoodModuleBase`) establece las siguientes garantías:

```
Módulo
  ├── _core: address (immutable — nunca cambia)
  ├── _requiredRole: bytes32 (inmutable)
  └── Solo puede llamar funciones expuestas en su ICoreForXxx minimal interface
Core (BashoodRWAReference)
  ├── Todas las escrituras: onlyRole(ASSET_MANAGER_ROLE) o onlyRole(ORACLE_ROLE)
  ├── Upgrade: onlyRole(UPGRADER_ROLE)
  └── Roles Admin: onlyRole(DEFAULT_ADMIN_ROLE)
```

### Matriz de privilegios por módulo

| Módulo | requiredRole | Llamadas al Core | Escribe en Core |
|--------|-------------|-----------------|-----------------|
| `OracleValuationModule` | `ASSET_MANAGER_ROLE` | `getTelemetryConfig()`, `updateAssetValue()` | ✅ Sí — gateado por `ASSET_MANAGER_ROLE` |
| `InspectionModule` | `ASSET_MANAGER_ROLE` (declarado) | `ownerOf()` | ❌ No — solo lectura |
| `CertificationModule` | `bytes32(0)` — read-only | `ownerOf()` | ❌ No — solo lectura |
| `InsuranceModule` | `bytes32(0)` — read-only | `ownerOf()` | ❌ No — solo lectura |
| `MaintenanceHistoryModule` | `bytes32(0)` — read-only | `ownerOf()` | ❌ No — solo lectura |
| `LifecycleEventsModule` | `bytes32(0)` — read-only | `ownerOf()` | ❌ No — solo lectura |
| `OperationalMetricsAggregator` | `bytes32(0)` — read-only | `ownerOf()`, `getOperationalMetrics()` | ❌ No — solo lectura |

### Garantías verificadas

1. **Ningún módulo puede llamar `grantRole` ni `revokeRole`** sobre el Core.
   - `IBashoodModule.sol` lo documenta explícitamente como invariante.
   - Ninguna interfaz minimal (`ICoreForXxx`) expone funciones de administración de roles.

2. **Ningún módulo puede llamar `_authorizeUpgrade`** (función `internal`; no expuesta en ninguna interfaz).

3. **`OracleValuationModule.updateAssetValue`** — única escritura al Core.
   - El Core aplica `onlyRole(ASSET_MANAGER_ROLE)` independientemente del llamante.
   - El módulo debe recibir `grantRole(ASSET_MANAGER_ROLE, address(module))` explícitamente del admin.
   - El módulo NO puede auto-asignarse roles.

4. **Core inmutable desde la perspectiva del módulo**: `_core` es `immutable` en `BashoodModuleBase`. Un módulo desplegado no puede apuntar a otro Core.

5. **Un módulo comprometido NO escala privilegios**: incluso si un módulo es comprometido, el atacante sólo puede llamar las funciones de la minimal interface. No puede:
   - Revocar roles de otros
   - Otorgar roles a sí mismo
   - Modificar datos no relacionados con su función
   - Hacer upgrade del Core

### Vector de riesgo residual

| Vector | Mitigación |
|--------|-----------|
| Admin entrega `ASSET_MANAGER_ROLE` a un módulo malicioso | Fuera del scope del protocolo (control operativo del admin) |
| Reentrancy en `OracleValuationModule.pushValuation` | `updateAssetValue` no envía ETH; OZ ReentrancyGuard no necesario pero el patrón CEI se sigue (emit antes de call) |
| Storage collision en UUPS proxy | Prevenido con `__gap[50]` + `validateImplementation` PASS |

---

## 4. Checklist Pre-Auditoría

- [x] `__gap[50]` añadido a BashoodRWAReference (slot 11)
- [x] `_disableInitializers()` en constructor
- [x] `_authorizeUpgrade` solo accesible con `UPGRADER_ROLE`
- [x] `STORAGE_LAYOUT_v1.0.json` generado y guardado
- [x] OZ `validateImplementation(UUPS)` → PASS
- [x] Ningún módulo con acceso de escritura no autorizado al Core
- [x] Interfaces minimales (`ICoreForXxx`) no exponen `grantRole`/`revokeRole`/`upgradeToAndCall`
- [x] `BashoodModuleBase._core` es `immutable` (no puede redirigirse)
- [x] `scripts/export-storage-layout.cjs` disponible para validación continua
- [ ] Proporcionar `STORAGE_LAYOUT_v1.0.json` al auditor externo
- [ ] Antes de cada upgrade: ejecutar script + comparar layouts

---

## 5. Comandos de Verificación

```bash
# Compilar (siempre primero)
npx hardhat compile --force

# Exportar y validar storage layout
npx hardhat run scripts/export-storage-layout.cjs --no-compile

# Tests de regresión
npx hardhat test --no-compile

# Análisis estático
python -m slither . --exclude-dependencies \
  --filter-paths "backup/,contracts/test/,contracts/mocks/" \
  --compile-force-framework hardhat

# Forge fuzzing/invariants
forge test
```

---

*Generado por: GitHub Copilot — Sesión pre-auditoría v1.0-mainnet-freeze*
*Fecha: 2026-03-04 · Solidity 0.8.28 · Base L2 (Cancun)*
