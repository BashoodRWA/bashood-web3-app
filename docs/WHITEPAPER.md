# BASHOOD Protocol — Whitepaper Técnico-Regulatorio

**Versión:** 1.0  
**Fecha:** 2 de marzo de 2026  
**Clasificación:** Público — Distribución controlada  
**Marco regulatorio de referencia:** Reglamento (UE) 2023/1114 (MiCA), Directiva MiFID II 2014/65/UE

---

> **Aviso legal obligatorio**  
> Este documento tiene carácter informativo y técnico. No constituye oferta, prospecto, recomendación de inversión ni instrumento financiero de ninguna naturaleza. Los tokens descritos en este documento no confieren derechos de propiedad, derechos contractuales, participación económica ni rendimiento distribuible sobre activo físico alguno. La clasificación regulatoria de cualquier emisión concreta es responsabilidad exclusiva del emisor y del asesor legal de cada operación. Bashood Technologies SL no presta servicios de inversión, no gestiona activos de terceros y no garantiza rentabilidades.

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Motivación](#2-contexto-y-motivación)
3. [El Estándar BASHOOD-RWA-1](#3-el-estándar-bashood-rwa-1)
4. [Arquitectura Técnica del Protocolo](#4-arquitectura-técnica-del-protocolo)
5. [El Token BHT: Utilidad y Separación Jurídica de RWA](#5-el-token-bht-utilidad-y-separación-jurídica-de-rwa)
6. [Modelo Económico del Protocolo](#6-modelo-económico-del-protocolo)
7. [Flujos Financieros Reales](#7-flujos-financieros-reales)
8. [Política de Staking y Distribución del Tesoro](#8-política-de-staking-y-distribución-del-tesoro)
9. [Política de Recompras](#9-política-de-recompras)
10. [Fuentes de Ingresos del Protocolo](#10-fuentes-de-ingresos-del-protocolo)
11. [Separación BHT vs BASHOOD-RWA-1: Marco Jurídico](#11-separación-bht-vs-bashood-rwa-1-marco-jurídico)
12. [Análisis MiCA: Clasificación y Exenciones](#12-análisis-mica-clasificación-y-exenciones)
13. [Análisis Howey Test](#13-análisis-howey-test)
14. [Gobernanza](#14-gobernanza)
15. [Seguridad y Auditoría](#15-seguridad-y-auditoría)
16. [Hoja de Ruta](#16-hoja-de-ruta)
17. [Conclusiones y Declaraciones de Responsabilidad](#17-conclusiones-y-declaraciones-de-responsabilidad)
18. [Apéndices Técnicos](#18-apéndices-técnicos)

---

## 1. Resumen Ejecutivo

Bashood Protocol es una infraestructura descentralizada desplegada en Base L2 (Ethereum Layer 2 de Coinbase) para la creación de **registros digitales estructurados de activos industriales físicos**. El protocolo implementa el estándar BASHOOD-RWA-1, una extensión del estándar ERC-721 diseñada específicamente para activos industriales de alto valor.

**Componentes principales del protocolo:**

| Componente | Descripción | Estado |
|---|---|---|
| BASHOOD-RWA-1 | Estándar NFT para registros industriales | ✅ Desplegado en testnet |
| BashoodRWAReference | Contrato Core UUPS, 22.93 KB | ✅ Auditado |
| OracleValuationModule | Actualizador canónico de valor vía Chainlink | ✅ Operativo |
| CertificationModule | Registro de compliance vigente | ✅ Operativo |
| InsuranceModule | Registro de pólizas vigentes | ✅ Operativo |
| BHT (BashoodToken) | Token de utilidad ERC-20 | ✅ Presale auditada |

**Posición regulatoria:** El protocolo está diseñado para operar bajo la exención NFT no fungibles del Artículo 2(3) del Reglamento (UE) 2023/1114 (MiCA). Los tokens BASHOOD-RWA-1 son registros digitales estructurados, no instrumentos financieros.

**Evidencia técnica verificable:** 5 activos industriales registrados en Base Sepolia, representando un valor de tasación total de $8.565M, con transacciones verificables en BaseScan.

---

## 2. Contexto y Motivación

### 2.1 La Deficiencia de los Estándares NFT Existentes

Los estándares ERC-721 y ERC-1155 son insuficientes para registros industriales porque carecen de:

1. **Modelos de depreciación por uso**: Los activos industriales deprecian por toneladas levantadas, metros extruidos, o ciclos de instalación, no exclusivamente por tiempo. Ningún estándar existente formaliza esto.

2. **Actualización de valor por oracle verificable**: El valor de mercado de un activo industrial cambia. Sin un mecanismo canónico de actualización on-chain basado en fuente externa verificable, el campo de valor es inservible para due-diligence.

3. **Registro de compliance vigente y auditable**: Las certificaciones (CE Mark, ISO 9001, UL 3401) tienen fecha de expiración y proceso de renovación. Un registro estático en el mint no refleja el estado real del activo.

4. **Registro de pólizas de seguro vigentes**: La cobertura de seguro de equipación industrial cambia. Incluso, puede caducar. No existía ningún estándar para registrar esto on-chain de forma auditable.

5. **Especificaciones técnicas estructuradas**: Capacidad de carga, velocidad, consumo energético, volumen de impresión — campos que son indispensables para cualquier due-diligence técnico sobre el activo.

### 2.2 El Problema del Mercado: Opacidad Operativa

Los activos industriales de alto valor (entre $250.000 y $5.000.000 por unidad) operan en un mercado caracterizado por:

- Documentación en papel o sistemas propietarios no interoperables
- Imposibilidad de verificar estado operativo, historial de mantenimiento y certificaciones de forma independiente
- Ausencia de un identificador único no fungible vinculado al activo físico individual
- Dependencia de intermediarios para valoración y transferencia

### 2.3 La Propuesta de Bashood

Bashood Protocol propone que la fuente de verdad de los datos estructurales y económicos de un activo industrial sea un registro on-chain verificable, auditable e inmutable, vinculado a fuentes externas verificables (Chainlink) para la valoración.

**Lo que el protocolo no propone:** El protocolo no promueve, instrumenta ni garantiza derechos de propiedad legal, participación económica ni rendimiento financiero derivados del registro. Estas capas, si el emisor de un activo decide implementarlas, requieren un marco contractual off-chain definido por el emisor bajo la regulación aplicable.

---

## 3. El Estándar BASHOOD-RWA-1

### 3.1 Definición Oficial

> **Un token BASHOOD-RWA-1 es un registro digital estructurado de un activo industrial físico.**

El token registra on-chain, en el momento del mint (inmutable) y de forma mutable post-mint para el valor de mercado:

| Categoría de dato | Cuándo se escribe | Mutabilidad |
|---|---|---|
| Identificación del activo (nombre, fabricante, modelo, nº serie) | Mint | Inmutable |
| Especificaciones técnicas (capacidad, velocidad, consumo) | Mint | Inmutable |
| Precio de compra original (CAPEX) | Mint | Inmutable |
| Modelo de depreciación | Mint | Inmutable |
| Valor de mercado tasado (`currentValue`) | Mint + post-mint vía OracleValuationModule | Mutable (solo oracle) |
| Métricas operativas (horas, toneladas, metros) | Mint + actualizaciones | Mutable (ASSET_MANAGER_ROLE) |

**Lo que el token explícitamente NO registra ni garantiza:**
- Título de propiedad ni derecho real sobre el activo físico
- Derecho contractual o crédito frente al emisor
- Participación económica ni rendimiento distribuible
- Garantía de vínculo jurídico entre el token y el activo off-chain

### 3.2 Categorías de Activos Soportadas

```
CONSTRUCTION_3D_PRINTER_GANTRY   — EVOCONS EVOBLOCK, ICON VULCAN
CONSTRUCTION_3D_PRINTER_MOBILE   — Apis Cor, CyBe RC
MODULAR_FACTORY_UV               — Mighty Buildings
HEAVY_VEHICLE                    — Excavadoras, grúas
ENERGY_EQUIPMENT                 — Generadores, transformadores
LOGISTICS_INFRASTRUCTURE         — Contenedores, almacenes
RAW_MATERIALS                    — Metales, minerales
REAL_ESTATE                      — Soporte heredado
```

El estándar fue diseñado a partir de investigación directa de 5 empresas líderes en robótica de construcción: EVOCONS (España), ICON (EEUU), Apis Cor (EEUU/UAE), CyBe Construction (Países Bajos), Mighty Buildings (EEUU).

### 3.3 Los Seis Modelos de Depreciación

La depreciación on-chain en BASHOOD-RWA-1 es la primera implementación de modelos de depreciación por uso industrialmente calibrados:

| Modelo | Variable | Caso de uso real | Valor máximo de vida |
|---|---|---|---|
| `LOAD_BASED` | Toneladas levantadas | EVOCONS EVOBLOCK | 500.000 ton |
| `EXTRUSION_BASED` | Metros de material | ICON VULCAN (Lavacrete) | Configurable |
| `SETUP_BASED` | Instalaciones en obra | Apis Cor | 2.000 setups |
| `TIME_BASED` | Horas de operación | Uso genérico | Configurable |
| `EFFICIENCY_BASED` | m³/día | CyBe RC | Configurable |
| `LINEAR` | Tiempo estándar | Uso genérico | Configurable |

### 3.4 Campos de Configuración de Tokenización (Metadatos Descriptivos)

El estándar incluye el struct `TokenizationConfig` con campos como `strategy`, `isFractional`, `totalShares`, `dailyLeaseRate`, `revenueSharePct`. 

**Naturaleza jurídica de estos campos:** Son **metadatos descriptivos** del modelo operativo real del activo. Su presencia en el registro on-chain no crea, por sí sola, ningún derecho económico. Su uso para instrumentar derechos económicos reales requiere un marco contractual off-chain adicional definido por el emisor, sujeto a la regulación aplicable en su jurisdicción.

---

## 4. Arquitectura Técnica del Protocolo

### 4.1 Stack Tecnológico

```
Red:           Base L2 (Ethereum L2 de Coinbase, Chain ID: 8453)
EVM target:    Paris (evm version)
Solidity:      ^0.8.28
Proxy pattern: UUPS (Universal Upgradeable Proxy Standard, EIP-1822)
Auth:          OpenZeppelin AccessControl (role-based)
Oracle:        Chainlink Price Feeds (AggregatorV3Interface)
```

### 4.2 Contratos Core del Protocolo M4

```
BashoodRWAReference.sol  (22.93 KB — 95.5% del límite EIP-170)
  ├── ERC721Upgradeable
  ├── AccessControlUpgradeable
  ├── UUPSUpgradeable
  └── Storage: _assetIdentification, _technicalSpecs, _financialData,
               _operationalMetrics, _certificationData, _insuranceData,
               _telemetryConfig, _tokenizationConfig, _tokenURIs

IBashoodRWA.sol          (437 líneas — interfaz canónica del estándar)
BashoodModuleBase.sol    (base abstracta para módulos externos)
IBashoodModule.sol       (interfaz de módulos)
```

### 4.3 Módulos Externos (Plan M4-F3)

El protocolo externaliza funcionalidades especializadas en módulos que se comunican con el Core a través de roles de AccessControl:

| Módulo | Rol en Core | Responsabilidad |
|---|---|---|
| `OracleValuationModule` | `ASSET_MANAGER_ROLE` | Único actualizador autorizado de `currentValue` |
| `CertificationModule` | `bytes32(0)` (read-only) | Registro de compliance y certificaciones vigentes |
| `InsuranceModule` | `bytes32(0)` (read-only) | Registro de pólizas de seguro vigentes |

**Regla de gobernanza económica (v0.9):** `ASSET_MANAGER_ROLE` nunca se otorga a EOAs (externally owned accounts) en producción. Solo `OracleValuationModule` puede tener este rol.

### 4.4 Modelo de Verdad del Protocolo

El protocolo implementa tres fuentes de verdad separadas e independientes:

**Verdad económica:**
```
Core.getFinancialData(tokenId).currentValue
  → Actualizado por: OracleValuationModule.pushValuation(tokenId)
  → Fuente de datos: Chainlink Price Feed configurado por emisor
  → Reason string: "ORACLE_REVALUATION" (producción) / "ADMIN_APPRAISAL" (emergencia)
```

**Verdad de compliance:**
```
CertificationModule.isCompliant(tokenId, [certTypes])
  → Core.getCertificationData(): flags del mint (inmutables, no usar para compliance actual)
  → certType: keccak256("CE_MARK"), keccak256("ISO_9001"), etc.
```

**Verdad de seguro:**
```
InsuranceModule.isInsured(tokenId)
  → Core.getInsuranceData(): datos del mint (inmutables, no usar para póliza actual)
  → policyId: keccak256(numeroPóliza)
```

### 4.5 Roles y Control de Acceso

| Rol | Hash | Titular en producción | Capacidad |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00...00` | Multisig governance | Gestión de roles |
| `ASSET_MANAGER_ROLE` | `keccak256(...)` | Solo OracleValuationModule | Actualizar `currentValue`, mint, configurar telemetría |
| `UPGRADER_ROLE` | `keccak256(...)` | Multisig governance | Aprobar actualizaciones UUPS |
| Certifier (CertModule) | N/A | Entidades auditoras acreditadas | Añadir/revocar certificaciones |
| Insurer (InsModule) | N/A | Aseguradoras acreditadas | Registrar/revocar pólizas |

> **Principio de mínimo privilegio**: Ningún EOA individual tiene capacidad de modificar el valor económico de un activo en producción. Toda actualizacion de `currentValue` pasa por `OracleValuationModule`, que actúa como cortafuegos técnico y registro de trazabilidad.

---

## 5. El Token BHT: Utilidad y Separación Jurídica de RWA

### 5.1 Naturaleza y Propósito del BHT

**BHT (BashoodToken)** es un token ERC-20 de utilidad del protocolo Bashood. Su propósito es funcional y técnico: reducir costos de transacción para participantes habituales del protocolo, habilitar participación en gobernanza y financiar el desarrollo continuado del protocolo.

**BHT no es:**
- Un instrumento de participación en los activos registrados mediante BASHOOD-RWA-1
- Un derecho sobre los ingresos generados por los activos off-chain
- Un valor mobiliario ni instrumento financiero en el sentido del Reglamento (UE) 2023/1114 o la Directiva 2014/65/UE

### 5.2 Utilidades Funcionales del BHT

| Utilidad | Descripción | Impacto económico |
|---|---|---|
| Descuento en fees del protocolo | Holders reciben hasta 60% de descuento en minting fees | Reduce coste operativo |
| Gobierno del protocolo | 1 BHT = 1 voto en decisiones de gobernanza | Participación no económica |
| Burn en transacciones | 0,1% de cada transacción se quema | Mecanismo deflacionario |
| Contribución al tesoro | 0,5% de cada transacción va al tesoro del protocolo | Sostenibilidad del protocolo |
| Referidos funcionales | 10% de fees como compensación por referidos activos | Incentivo basado en actividad |

### 5.3 Separación Jurídica Formal: BHT vs BASHOOD-RWA-1

Esta separación es la distinción jurídica más importante del protocolo:

```
BHT (BashoodToken ERC-20)
  └── Token de utilidad funcional del protocolo
  └── Descuento en fees + gobernanza + mecanismo deflacionario
  └── NINGUNA vinculación al rendimiento, propiedad o valor de activos RWA
  └── Valor derivado de: uso del protocolo, no de activos físicos

BASHOOD-RWA-1 (NFT ERC-721)
  └── Registro digital estructurado de activo industrial físico
  └── Contiene datos de identificación, specs técnicas, valor de mercado
  └── NINGÚN derecho financiero inherente al token en sí
  └── Cualquier derecho económico: responsabilidad del emisor, off-chain
```

**Consecuencia práctica:** La evolución del valor del BHT no está indexada ni correlacionada contractualmente con los activos registrados en BASHOOD-RWA-1. Un incremento en el número de activos registrados puede aumentar el uso del protocolo (y por tanto el valor funcional del BHT), pero esta relación es económica indirecta, no un derecho contractual directo.

### 5.4 Distribución de BHT

| Categoría | Porcentaje | Descripción |
|---|---|---|
| Preventa pública | 25% | Acceso inicial al token de utilidad |
| Ecosistema y comunidad | 20% | Incentivos a desarrolladores, partners |
| Equipo y fundadores | 15% | Vesting 2 años con cliff 6 meses |
| Reserva del protocolo | 20% | Desarrollo futuro, auditorías |
| Liquidez inicial | 10% | Pares en DEX en mainnet |
| Advisors | 5% | Con vesting |
| Reserva de emergencia | 5% | Bajo multisig |

---

## 6. Modelo Económico del Protocolo

### 6.1 Principios Económicos Fundamentales

El modelo económico del protocolo Bashood se basa en tres principios no negociables, adoptados como parte del BASHOOD_V1_PRINCIPIOS_PERMANENTES:

1. **Sin staking yield garantizado**: No existe un APY fijo o garantizado de ningún tipo. Las distribuciones del tesoro son variables, no garantizadas, y dependen de la actividad del protocolo y de la gobernanza.

2. **Sin participación en rendimiento de activos físicos**: El BHT no da derecho a participar en ingresos generados por los activos industriales registrados on-chain. Esos flujos, si existen, son relaciones contractuales off-chain entre el propietario del activo y terceros.

3. **Sin proyecciones de ROI como compromiso financiero**: Las estimaciones de actividad de protocolo son orientativas y no constituyen promesa de rentabilidad para ningún tenedor de BHT.

### 6.2 Mecanismos Deflacionarios

**Burn de transacción (0,1%):**
- En cada transacción del protocolo se destruye permanentemente el 0,1% del valor en BHT
- Mecanismo automático e irreversible
- No controlado por equipo ni gobernanza
- Reduce supply total circulante con el uso

**Contribución al tesoro (0,5%):**
- Alimenta el tesoro del protocolo
- Uso determinado por gobernanza DAO
- No distribuido automáticamente a holders
- Ver Sección 7 para flujos detallados

### 6.3 Incentivos de Referidos

El sistema de referidos de Bashood opera sobre actividad real probada:

```
Condición: El referido realiza al menos una transacción activa en el protocolo
Compensación: 10% de las fees generadas por el referido
Naturaleza: Incentivo por actividad, no distribución pasiva
Pago: En BHT, deducido de las fees del protocolo
```

Esta estructura es deliberadamente distinta de un "profit-sharing": la compensación se deriva de la actividad transaccional del referido, no de la apreciación de ningún activo.

---

## 7. Flujos Financieros Reales

### 7.1 Flujo de Fees de Minting (Registro de Activos)

```
Emisor llama mintAsset() con metadatos del activo
  ↓
Fee de minting (configurable por gobernanza, base: 0,5% del purchasePrice declarado)
  ├── 0,1%  → Burns inmediato (destrucción definitiva)
  ├── 0,2%  → Tesoro del protocolo (multisig governance)
  └── 0,2%  → Referidor activo (si existe) / Tesoro (si no hay referidor)
```

### 7.2 Flujo de Fees de Valoración (OracleValuationModule)

```
Cualquier cuenta llama pushValuation(tokenId)
  ↓
OracleValuationModule resuelve Chainlink feed del activo
  ↓
Escribe Core.updateAssetValue(tokenId, valor, "ORACLE_REVALUATION")
  ↓
Gas cost: pagado por caller (sin fee de protocolo adicional en v1.0)
```

### 7.3 Flujo del Tesoro del Protocolo

```
Ingresos del tesoro:
  ← Fees de minting (0,2% por registro)
  ← Fees de otras operaciones de protocolo
  ← Donaciones y grants (ej. Base Builder Grant)

Uso del tesoro (determinado por DAO):
  → Desarrollo ongoing del protocolo (smart contracts, módulos)
  → Auditorías de seguridad externas
  → Grants a herramientas del ecosistema
  → Buybacks de BHT (ver Sección 9)
  → Reserva de emergencia

NO va al tesoro, y el tesoro NO distribuye:
  ✗ Ingresos generados por los activos físicos registrados (son off-chain)
  ✗ Distribuciones automáticas a holders de BHT
  ✗ Rendimientos indexados a valor de activos
```

### 7.4 Flujo de Distribuciones del Protocolo

En caso de que la gobernanza DAO apruebe una distribución del tesoro:

```
Propuesta DAO (requiere quórum X% de BHT stakeado en gobernanza)
  ↓
Periodo de votación (7 días mínimo)
  ↓
Si aprobada: distribución a BHT stakeado en contrato de gobernanza
  ↓
Distribución proporcional al stake, no al valor de activos
Naturaleza: distribución de ingresos del protocolo, no de activos físicos
```

Esta distribución hipotética es radicalmente distinta de un dividendo sobre activos: su fuente son las fees del protocolo (actividad transaccional), no los ingresos generados por los activos industriales registrados on-chain.

---

## 8. Política de Staking y Distribución del Tesoro

### 8.1 Principio Rector

> No existe APY fijo ni garantizado de ningún tipo para holders de BHT.

La palabra "APY" está explícitamente prohibida en toda comunicación del protocolo como parte del BASHOOD_V1_PRINCIPIOS_PERMANENTES (versión del 17 de febrero de 2026).

### 8.2 Mecanismo de Governance Staking

El staking en Bashood v1.0 es **governance staking**, no yield staking:

| Característica | Estado |
|---|---|
| Propósito | Participar en votaciones de gobernanza |
| Lockup | Voluntario, sin penalización por retiro |
| Distribución automática | No existe en v1.0 |
| APY garantizado | No existe |
| Fuente de cualquier distribución futura | Fees del protocolo (actividad transaccional), aprobado por DAO |

### 8.3 Proceso de Activación de Distribuciones Futuras

Si en el futuro la gobernanza decide aprobar distribuciones del tesoro a participantes de staking, el protocolo seguirá este proceso:

1. Propuesta formal en el DAO con análisis regulatorio adjunto
2. Revisión legal independiente (obligatoria si la distribución supera €100.000)
3. Periodo de comentario público (14 días)
4. Votación DAO (quórum mínimo 10% de supply stakeado)
5. Timelock de implementación (48 horas mínimo)

**Limitación explícita:** Ninguna distribución del tesoro puede estar indexada, vinculada ni correlacionada contractualmente con el rendimiento de activos físicos registrados en BASHOOD-RWA-1. Esta limitación es constitucional del protocolo.

### 8.4 Lo Que los Participantes de Staking Reciben (v1.0)

- Poder de voto proporcional a su stake en decisiones de gobernanza
- Potencial elegibilidad para futuras distribuciones del tesoro (aprobadas por DAO, no garantizadas)
- Fee discounts adicionales en uso del protocolo (ver Tabla de utilidades BHT)

---

## 9. Política de Recompras

### 9.1 Mecanismo

El protocolo puede, por decisión de gobernanza DAO, usar parte del tesoro para recomprar BHT en el mercado secundario:

```
Condición de activación: Propuesta y aprobación DAO
Fuente de fondos: Tesoro del protocolo (fees acumuladas)
Destino de los tokens recomprados:
  → Burn (destrucción permanente) — opción A
  → Re-inyección en pool de liquidez — opción B
  → Reserva estratégica (governance treasury) — opción C
```

### 9.2 Límites

- Ningún buyback puede superar el 10% del tesoro en un bloque de 30 días sin aprobación específica de gobernanza
- Los buybacks no son garantizados ni programáticos
- No constituyen un compromiso de precio mínimo del token

### 9.3 Impacto Económico

Un buyback reduce el supply circulante o refuerza la liquidez disponible para participantes. No constituye una "distribución de beneficios" en el sentido del Artículo 4(1)(2) de la Directiva 2014/65/UE (MiFID II), ya que no implica un pago proporcional a tenedores.

---

## 10. Fuentes de Ingresos del Protocolo

### 10.1 Ingresos Operativos (v1.0)

| Fuente | Mecanismo | Estimación orientativa* |
|---|---|---|
| Fees de minting RWA | 0,5% del `purchasePrice` declarado por activo | Depende de adopción |
| Fees de consulta de módulos | Potencial fee futura (gobernanza decidirá) | No activo en v1.0 |
| Preventa de BHT | Venta inicial del token de utilidad | Event único |
| Grants y subvenciones | Base Builder Grant y otros | Puntual |

*Las estimaciones no son compromisos financieros. No existe garantía de alcanzar ningún nivel de ingresos.

### 10.2 Lo Que No Es Ingreso del Protocolo

Queda explícitamente fuera del modelo económico del protocolo:

- Los ingresos generados por los activos físicos cuyo registro se tokeniza (son ingresos off-chain del propietario del activo o del emisor)
- Cualquier apreciación del valor on-chain de los activos (`currentValue`) — ese dato refleja la tasación del activo, no un ingreso del protocolo
- Los pagos de alquiler o leasing de los activos (si el emisor ha configurado `MICRO_LEASING`, esos flujos son off-chain)

### 10.3 Sostenibilidad a Largo Plazo

El modelo de sostenibilidad del protocolo se basa en el crecimiento del número de activos registrados (que genera fees de minting) y en el volumen de transacciones secundarias (que genera fees de trading cuando el marketplace esté activo).

---

## 11. Separación BHT vs BASHOOD-RWA-1: Marco Jurídico

### 11.1 La Distinción Fundamental

Esta es la distinción jurídica más crítica del protocolo, con implicaciones regulatorias directas:

```
BHT Token (ERC-20):
  Régimen candidato:    Utility token (MiCA Art. 3.1.9)
  Respaldo:             Uso funcional del protocolo
  Derechos:             Governance, fee discounts, burn deflacionario
  Sin derechos sobre:   Activos físicos registrados, ingresos off-chain

NFT BASHOOD-RWA-1 (ERC-721):
  Régimen candidato:    Exención NFT único (MiCA Art. 2.3)
  Naturaleza:           Registro digital estructurado
  Derechos:             Propiedad del registro on-chain, transferibilidad
  Sin derechos sobre:   Activo físico, ingresos del activo, título legal
```

### 11.2 El Error a Evitar

El error regulatoriamente peligroso es **vincular el valor del BHT al rendimiento de los activos RWA**. Este protocolo evita expresamente ese vínculo:

```
❌ PROHIBIDO (viola principios del protocolo):
"Compra BHT → El protocolo tokeniza activos → Los activos generan ingresos → Tú cobras"

✅ CORRECTO (modelo del protocolo):
"BHT = herramienta de participación en el protocolo (governance + fee discounts)"
"NFT = registro digital del activo (sin derechos económicos inherentes)"
"Los ingresos de activos físicos son relaciones contractuales off-chain del emisor"
```

### 11.3 Vector de Howey: Lo Que Evita Esta Separación

El Howey Test (SEC v. W.J. Howey Co., 1946), adoptado por referencia en análisis MiCA, establece cuatro criterios para clasificar un activo como security:

1. Inversión de dinero — *BHT: presale implica pago*
2. En empresa común — *BHT: protocolo compartido*
3. Expectativa de beneficios — *BHT: ningún APY ni derecho económico prometido*
4. Derivados del esfuerzo de terceros — *BHT: gobernanza descentralizada, no equipo ejecutivo único*

La separación BHT-RWA rompe el tercer criterio: **no existe expectativa de beneficios prometidos contractualmente**. Las distribuciones del tesoro, si se aprueban, son una consecuencia de actividad del protocolo aprobada democráticamente, no una promesa.

---

## 12. Análisis MiCA: Clasificación y Exenciones

### 12.1 Marco Regulatorio Aplicable

El Reglamento (UE) 2023/1114 sobre mercados de criptoactivos (MiCA) entró en vigor el 29 de junio de 2023 y es plenamente aplicable desde el 30 de diciembre de 2024.

### 12.2 Clasificación del BHT (BashoodToken)

**Candidato: Token de Utilidad funcional (Art. 3.1.9 MiCA)**

Un token de utilidad proporciona acceso a un bien o servicio disponible o por venir. El BHT proporciona:
- Acceso a fee discounts en el protocolo (servicio disponible)
- Participación en gobernanza (servicio disponible)
- Mecanismo de burn deflacionario (funcionalidad técnica)

**Condiciones para mantener la clasificación de utility token (sin CASP):**
1. No debe ser admitido a cotización en un mercado regulado de valores
2. No debe conferir derechos económicos equivalentes a dividendos o participaciones en beneficios
3. Non debe ser emitido ni ofertado al público como instrumento de inversión
4. No debe estar vinculado a la evolución de activos de referencia que lo conviertan en asset-referenced token

El BHT, en su configuración actual, cumple estas condiciones.

**Obligaciones si se clasifica como utility token bajo MiCA:**
- Whitepaper MiCA obligatorio (este documento sirve como base, pero requiere adaptación formal)
- Notificación a la CNMV (si se oferta al público en España)
- No se requiere licencia de CASP para la emisión

### 12.3 Clasificación del NFT BASHOOD-RWA-1

**Candidato: Exención NFT único (Art. 2.3 MiCA)**

MiCA excluye de su ámbito los criptoactivos que sean "únicos y no fungibles con otros criptoactivos", cuando NO:
- Representen bienes o servicios financieros
- Sean emitidos en serie como instrumento de inversión

Las condiciones que el protocolo cumple para esta exención:

| Condición | Estado en el protocolo |
|---|---|
| No fungibilidad | Cada NFT representa un activo físico único ✅ |
| Sin mecanismo de estabilización | `currentValue` es tasación, no peg ✅ |
| No diseñado como instrumento financiero | Ver Sección 11, NatSpec IBashoodRWA.sol ✅ |
| Sin distribución de rendimientos por el protocolo | Flujos económicos son responsabilidad del emisor ✅ |

**Riesgo residual:**
Si un emisor concreto usa `TokenizationConfig` para implementar derechos económicos reales (revenue-share, fractional dividends), ese instrumento específico podría salir de la exención NFT y requerir análisis individual. El protocolo documenta explícitamente que esta responsabilidad es del emisor.

### 12.4 Escenario de Asset-Referenced Token (ART)

Si en el futuro el BHT o cualquier derivado se vincula contractualmente al valor de activos físicos subyacentes, caería bajo la categoría de Asset-Referenced Token (MiCA Art. 3.1.6), que requiere:
- Autorización de la autoridad competente
- Capital mínimo 350.000 EUR o 2% de tokens en circulación
- Reserva de activos de referencia verificable

El protocolo v1.0 no implementa ningún mecanismo de esa naturaleza. La prohibición de vincular BHT a rendimiento de activos RWA está formalizada en el protocolo.

---

## 13. Análisis Howey Test

### 13.1 Aplicación al BHT

| Criterio Howey | Análisis para BHT | Resultado |
|---|---|---|
| Inversión de dinero | Preventa implica pago en ETH/BHT | ✅ Aplica |
| En empresa común | Protocolo compartido por todos los usuarios | ✅ Aplica |
| Expectativa de beneficios | Sin APY garantizado, sin distribución automática, sin derecho sobre activos RWA | ⚠️ Debatible |
| Derivados del esfuerzo de terceros | Gobernanza descentralizada vía DAO, código open-source | ⚠️ Debatible |

**Evaluación:** Los criterios 3 y 4 son debatibles, no cumplidos taxativamente. La estructura del protocolo está diseñada para minimizar la exposición, pero ningún análisis externo garantiza la clasificación definitiva. Se recomienda opinión legal independiente antes de lanzar la preventa pública.

### 13.2 Elementos Protectores del BHT

1. **Sin APY ni yield**: Ningún documento del protocolo promete rentabilidad porcentual fija
2. **Sin vinculación a activos RWA**: El valor del BHT no está indexado ni correlacionado contractualmente con activos físicos
3. **Utilidad funcional preexistente**: Los descuentos de fees son funcionales desde el momento de lanzamiento (no promesas futuras)
4. **Gobernanza real**: El DAO determina distribuciones del tesoro de forma democrática, sin mandato ejecutivo unilateral
5. **Burn deflacionario técnico**: El mecanismo de burn es automático, no dirigido por el equipo

### 13.3 Aplicación al NFT BASHOOD-RWA-1

Un NFT BASHOOD-RWA-1, en su configuración base (sin `TokenizationConfig` activado por el emisor para rendimientos), no satisface el Howey Test:

| Criterio Howey | Análisis para NFT BASHOOD-RWA-1 |
|---|---|
| Inversión de dinero | Puede haber pago en el marketplace secundario |
| En empresa común | No: cada NFT es un activo distinto y único |
| Expectativa de beneficios | No hay promesa de ningún beneficio por el protocolo |
| Derivados del esfuerzo de terceros | No aplicable: el registro existe independientemente |

**Conclusión:** El NFT base no supera el Howey Test. Es un registro, no una inversión.

---

## 14. Gobernanza

### 14.1 Principios de Gobernanza

El protocolo Bashood opera bajo principios de gobernanza progresiva:

- **v1.0**: Multisig (Gnosis Safe, mínimo 3/5 firmas) para operaciones de admin
- **v1.5 (roadmap)**: Introducción de DAO on-chain con BHT como token de voto
- **v2.0 (roadmap)**: Gobernanza completamente descentralizada con timelock

### 14.2 Decisiones Bajo Gobernanza

| Decisión | Fase actual | Fase futura |
|---|---|---|
| Actualizaciones del Core (UUPS) | Multisig | DAO + Timelock 48h |
| Modificación de fee structure | Multisig | DAO |
| Activación de distribuciones del tesoro | Multisig | DAO (quórum 10%) |
| Buybacks | Multisig | DAO |
| Adición de nuevos módulos | Multisig | DAO |

### 14.3 Parámetros Inmutables del Protocolo

Los siguientes principios no pueden alterarse por ningún mecanismo de gobernanza sin un fork completo del protocolo (BASHOOD_V1_PRINCIPIOS_PERMANENTES):

1. BHT no se vincula contractualmente al rendimiento de activos RWA
2. Los NFT BASHOOD-RWA-1 no confieren por sí mismos derechos económicos sobre activos físicos
3. No se implementa staking con APY garantizado
4. La producción de `currentValue` pasa exclusivamente por OracleValuationModule

---

## 15. Seguridad y Auditoría

### 15.1 Estado de Auditoría

| Componente | Herramienta | Estado | Hallazgos críticos |
|---|---|---|---|
| BashoodPresaleFinal | Slither | ✅ Auditado | 0 críticos |
| BashoodToken (BHT) | Slither | ✅ Auditado | 0 críticos |
| BashoodRWAReference | Slither | ✅ Auditado | 0 críticos (warnings pre-existentes documentados) |
| Módulos M4-F3 | Test suite | ✅ 103/103 tests | — |
| Suite completa | Hardhat tests | ✅ 838 passing | 4 failing pre-existentes (`getDepreciation` — función eliminada) |

### 15.2 Cobertura de Tests

```
Statements:   97.3%
Branches:     70.75%
Functions:    100%
Lines:        97.3%
```

### 15.3 Medidas de Seguridad en el Core

- **UUPS con UPGRADER_ROLE**: Solo multisig puede aprobar actualizaciones
- **AccessControl de OpenZeppelin**: Roles auditados, no custom auth
- **Principio de mínimo privilegio**: `ASSET_MANAGER_ROLE` exclusivo para OracleValuationModule en producción
- **Reentrancy guards**: Aplicados en funciones de pago en presale
- **Validaciones Chainlink**: Staleness check, `answeredInRound >= roundId`, `answer > 0`

### 15.4 Tamaño de Contratos

| Contrato | Tamaño | Límite EIP-170 | Margen |
|---|---|---|---|
| BashoodRWAReference | 22.93 KB | 24.576 KB | 4,5% |
| BashoodPresaleFinal | 16.95 KB | 24.576 KB | 31% |
| BashoodToken | Optimizado | 24.576 KB | >50% |

---

## 16. Hoja de Ruta

### v1.0 — Actual (Base Sepolia Testnet)
- ✅ BASHOOD-RWA-1 completamente especificado e implementado
- ✅ 5 activos industriales registrados en testnet ($8.565M valor tasado)
- ✅ Módulos M4-F3 operativos (Oracle, Certification, Insurance)
- ✅ Definición oficial del token formalizada (MiCA-compliant)
- ✅ Gobernanza económica formalizada (v0.9-governance-decision)

### v1.1 — Q2 2026 (Base Mainnet)
- Despliegue en Base Mainnet con los 5 activos piloto verificados
- Activación de `OracleValuationModule` con feeds Chainlink de producción
- Multisig governance operativo (Gnosis Safe 3/5)
- Auditoría externa de seguridad completa

### v1.5 — Q3 2026
- Marketplace secundario de registros BASHOOD-RWA-1
- Módulo de `DepreciationTracker` (M4-F4)
- Introducción de governance voting con BHT

### v2.0 — Q4 2026 / Q1 2027
- DAO completamente operativo con timelock
- BASHOOD-RWA-2: integración de créditos de carbono ESG
- Puentes cross-chain (Base ↔ Ethereum mainnet)
- Primitivas DeFi (lending contra colateral RWA, sin derechos financieros del token base)

---

## 17. Conclusiones y Declaraciones de Responsabilidad

### 17.1 Estado del Protocolo

El protocolo Bashood es, en la fecha de este documento, una infraestructura técnica operativa en testnet para la creación de registros digitales estructurados de activos industriales. No es un fondo de inversión, no gestiona activos de terceros, y no promete rendimientos de ningún tipo.

### 17.2 Declaraciones Formales

1. **Sobre la naturaleza del token**: Los tokens BASHOOD-RWA-1 son registros digitales estructurados, no instrumentos financieros, no títulos de propiedad, no derechos contractuales sobre activos físicos.

2. **Sobre el BHT**: BHT es un token de utilidad funcional del protocolo. No está diseñado como instrumento financiero, valor mobiliario ni criptoactivo con derechos financieros en el sentido de MiCA o MiFID II, sin que esto constituya una autocalificación jurídica absoluta. La clasificación regulatoria definitiva corresponde a la autoridad competente.

3. **Sobre los flujos económicos**: Los ingresos generados por los activos físicos registrados on-chain son flujos económicos off-chain entre el propietario del activo y terceros. El protocolo no interviene, gestiona ni distribuye esos flujos.

4. **Sobre el modelo económico**: No existe garantía de rentabilidad, rendimiento, APY o distribución de beneficios para tenedores de BHT o de NFT BASHOOD-RWA-1.

5. **Sobre la responsabilidad del emisor**: Cualquier emisor que use el protocolo BASHOOD-RWA-1 para tokenizar activos físicos asume la responsabilidad exclusiva de: (a) establecer el marco contractual off-chain del token, (b) obtener las licencias regulatorias aplicables en su jurisdicción, y (c) clasificar correctamente su emisión bajo MiCA u otras normativas aplicables.

---

## 18. Apéndices Técnicos

### Apéndice A: Interfaces Canónicas

El estándar BASHOOD-RWA-1 está completamente especificado en:
- [contracts/standards/IBashoodRWA.sol](../contracts/standards/IBashoodRWA.sol) — Interfaz canónica (437 líneas)
- [docs/BASHOOD-RWA-1-SPECIFICATION.md](BASHOOD-RWA-1-SPECIFICATION.md) — Especificación técnica completa

### Apéndice B: Activos Registrados en Testnet

| Token ID | Activo | Fabricante | Valor USD | TX Mint (Base Sepolia) |
|---|---|---|---|---|
| 202 | EVOBLOCK Gantry System | EVOCONS | $1.200.000 | `0x05c53a71...` |
| 203 | VULCAN Printer | ICON | $1.600.000 | `0xedb0ccce...` |
| 204 | Mobile Construction Robot | Apis Cor | $325.000 | `0x963ec5b5...` |
| 205 | RC-9 Printer | CyBe Construction | $240.000 | `0x82683060...` |
| 206 | UV Factory Line | Mighty Buildings | $5.200.000 | `0x1520f691...` |
| **Total** | | | **$8.565.000** | |

### Apéndice C: Roles del Sistema

```
DEFAULT_ADMIN_ROLE  → Multisig governance (Gnosis Safe 3/5)
ASSET_MANAGER_ROLE  → OracleValuationModule exclusivamente
UPGRADER_ROLE       → Multisig governance
Certifier           → Entidades auditoras (gestión en CertificationModule)
Insurer             → Aseguradoras acreditadas (gestión en InsuranceModule)
```

### Apéndice D: Historial de Versiones del Protocolo

| Tag Git | Descripción |
|---|---|
| `v0.4` | BashoodModuleBase pattern hardening |
| `v0.5` | CertificationModule (39/39 tests) |
| `v0.6` | InsuranceModule (39/39 tests) |
| `v0.7-f3-interface-freeze` | F3 formal closure |
| `v0.8-truth-model-formalized` | Economic + compliance truth model |
| `v0.9-governance-decision` | Governance A/A3 decision |
| `v1.0-token-definition` | Official token definition (MiCA-compliant) |

### Apéndice E: Glosario

| Término | Definición en contexto Bashood |
|---|---|
| **currentValue** | Valor de mercado tasado del activo, 1e18 USD, actualizado por OracleValuationModule |
| **OracleValuationModule** | Único contrato autorizado a modificar `currentValue` en producción |
| **ASSET_MANAGER_ROLE** | Rol de AccessControl que permite escribir en datos económicos del Core |
| **Emisor** | Entidad o persona que llama `mintAsset()` para registrar un activo on-chain |
| **Registro** | El token NFT como unidad de información estructurada, sin derechos económicos inherentes |
| **Protocolo** | El conjunto de contratos inteligentes deployados en Base L2 |
| **Tesoro** | Contrato multisig que acumula fees del protocolo bajo control de gobernanza |

---

*Bashood Technologies SL — 2 de marzo de 2026*  
*Este whitepaper será actualizado antes de cualquier oferta pública. La versión vigente siempre estará disponible en el repositorio oficial del protocolo.*
