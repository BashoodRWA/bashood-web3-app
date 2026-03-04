# BashoodCore – Definición Formal del Límite Funcional y Arquitectónico

**Plan M4 – Fase 3**  
**Fecha:** 2 de marzo de 2026

---

## 1. Identidad del módulo

| Campo               | Valor                                      |
|---------------------|--------------------------------------------|
| Nombre              | BashoodCore (`BashoodRWAReference`)        |
| Estándar            | BASHOOD-RWA-1                              |
| Contrato base       | `ERC721Upgradeable`, `AccessControlUpgradeable`, `UUPSUpgradeable` |
| Patrón de actualización | UUPS proxy                            |
| Versión actual      | 1.0.0                                      |

---

## 2. Responsabilidades exclusivas del Core

El Core es responsable de:

1. **Ciclo de vida del activo NFT**
   - Inicialización del contrato (`initialize`)
   - Acuñación de activos industriales (`mintAsset`)
   - Gestión del identificador de token (`_nextTokenId`)

2. **Almacenamiento canónico del activo**  
   El Core es el único titular de los datos de estado por token:
   - `AssetIdentification` — identidad física y documental del activo
   - `TechnicalSpecs` — especificaciones técnicas
   - `FinancialData` — datos financieros (precio, valor actual, reservas)
   - `OperationalMetrics` — métricas de uso en tiempo real
   - `CertificationData` — cumplimiento normativo
   - `TelemetryConfig` — configuración de oráculos Chainlink
   - `TokenizationConfig` — estrategia de tokenización
   - `InsuranceData` — datos de seguro

3. **Gestión de valor y depreciación (coordinación)**
   - Actualización de valor por evento externo (`updateAssetValue`)
   - Cálculo de valor actual por deprecación delegado a `DepreciationEngine` (`calculateCurrentValue`, `getDepreciationPercentage`)
   - Valor residual y vida remanente (`getResidualValue`, `getRemainingLifePercentage`)

4. **Actualizaciones operacionales**
   - Registro de mantenimiento (`recordMaintenance`)
   - Actualización de métricas de uso (`updateUsageMetrics`)

5. **Control de acceso**
   - Roles: `DEFAULT_ADMIN_ROLE`, `ASSET_MANAGER_ROLE`, `ORACLE_ROLE`, `UPGRADER_ROLE`

---

## 3. Límite explícito: lo que el Core NO hace

| Responsabilidad                            | Módulo externo responsable     |
|--------------------------------------------|-------------------------------|
| Cálculo aritmético de depreciación         | `DepreciationEngine`          |
| Validación de feeds de precios (oráculos)  | `ChainlinkPriceFeed` / `IPriceFeed` |
| Lógica de distribución de ingresos         | Módulo futuro (Fase 3+)       |
| Gestión de fracciones de propiedad         | Módulo futuro (Fase 3+)       |
| Seguimiento de rendimiento ESG             | Módulo futuro (Fase 3+)       |

---

## 4. Dependencias actuales del Core

```
BashoodRWAReference
 ├── IBashoodRWA               (interfaz de tipos y enums)
 └── DepreciationEngine        (librería interna de cálculo)
```

---

## 5. Principios de diseño del límite

- **Alta cohesión:** el Core agrupa únicamente lo que tiene autoridad directa sobre el estado del activo.
- **Bajo acoplamiento:** la lógica de cálculo es externa (`DepreciationEngine`) y no modifica estado.
- **Compatibilidad de almacenamiento:** el layout de storage no varía entre fases para garantizar la seguridad del proxy UUPS.
- **Interfaz pública estable:** las firmas públicas no cambian; la refactorización es interna.

---

## 6. Candidatos a externalización en Fase 3

1. Lógica de tasación por oráculo (actualmente acoplada al Core vía `FinancialData`).
2. Gestión y registro de certificaciones (`CertificationData`).
3. Configuración y lectura de telemetría (`TelemetryConfig`).

Cada candidato será evaluado por impacto en storage layout antes de su migración.

---

**Este documento es el contrato formal de responsabilidades del BashoodCore para las fases siguientes.**
