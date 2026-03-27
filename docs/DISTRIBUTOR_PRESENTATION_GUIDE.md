# GUÍA DE PRESENTACIÓN PARA DISTRIBUIDORES BASHOOD

**Documento Oficial v2.0**  
**Actualizado:** 4 de marzo de 2026  
**Confidencialidad:** Uso interno — distribuidores y partners autorizados

---

> **Nota de posicionamiento:** Este documento describe BASHOOD como infraestructura de protocolo para la digitalización de activos industriales reales (RWA). Los tokens BASHOOD-RWA-1 son registros digitales verificables de activos físicos, no instrumentos financieros ni participaciones económicas. Los flujos económicos derivados del uso de cualquier activo tokenizado son gestionados off-chain entre el operador y los titulares legales del activo, dentro del vehículo legal que corresponda.

---

## ÍNDICE RÁPIDO

1. [Elevator Pitch (30 segundos)](#elevator-pitch)
2. [Descripción del Protocolo](#descripción-completa)
3. [Servicios de Infraestructura](#servicios-ofrecidos)
4. [Sectores y Activos Objetivo](#sectores-objetivo)
5. [Arquitectura RWA](#arquitectura-rwa)
6. [Tecnología y Protocolo](#tecnología)
7. [Casos de Uso](#casos-de-uso)
8. [Ventajas Competitivas](#ventajas-competitivas)
9. [Participantes del Ecosistema](#participantes)
10. [Para Operadores de Activos](#para-operadores)
11. [Para Fabricantes](#para-fabricantes)
12. [Preguntas Frecuentes](#faq)
13. [Datos Técnicos Clave](#datos-técnicos)
14. [Próximos Pasos](#próximos-pasos)

---

## ELEVATOR PITCH (30 SEGUNDOS) {#elevator-pitch}

> **BASHOOD es una infraestructura blockchain para digitalizar activos industriales de alto valor y su ciclo de vida operativo.**
>
> Cuando una empresa registra una impresora 3D industrial de $1.2M en BASHOOD, el resultado es un registro digital inmutable — verificable por cualquier parte — que contiene:
> - Identificación y especificaciones técnicas del activo
> - Valoración actualizada vía oráculo Chainlink
> - Historial de inspecciones, mantenimiento y ciclo de vida
> - Estado de certificaciones y cobertura de seguro vigentes
>
> El protocolo provee la **capa de referencia digital** del activo. Los acuerdos económicos sobre ese activo se estructuran off-chain, en vehículos legales apropiados para cada jurisdicción.

---

## DESCRIPCIÓN DEL PROTOCOLO {#descripción-completa}

### ¿Qué es BASHOOD?

**BASHOOD** es un **protocolo de infraestructura RWA (Real World Assets)** desplegado en Base L2. Permite a fabricantes, operadores y emisores crear registros digitales verificables, auditables e interoperables de activos industriales físicos de alto valor.

**BASHOOD no es:**
- Una plataforma de inversión
- Un gestor de activos
- Un marketplace de participaciones financieras

**BASHOOD es:**
- Una capa de registro y referencia digital del activo
- Una infraestructura de telemetría y valoración on-chain
- Un conjunto de módulos de lifecycle (inspection, maintenance, certification, insurance)
- Un protocolo abierto sobre el que emisores y operadores construyen sus propios productos

### Misión

Proveer la infraestructura técnica estándar para que el ecosistema industrial pueda emitir, gestionar y verificar activos tokenizados con el máximo nivel de trazabilidad y transparencia.

### Problema que Resuelve

| Barrera Actual | Solución BASHOOD |
|----------------|------------------|
| Documentación en papel dispersa en múltiples sistemas | Registro on-chain inmutable y verificable por cualquier parte |
| Historial de mantenimiento y certificaciones no auditables | Módulos `InspectionModule`, `MaintenanceHistoryModule`, `CertificationModule` |
| Valoración del activo dependiente de intermediarios | OracleValuationModule vía Chainlink — verificable on-chain |
| Estado del activo opaco para financiadores, aseguradoras y compradores | NFT BASHOOD-RWA-1 como digital twin del activo físico |
| Transferencia de titularidad documental lenta | Transferencia del token de referencia en segundos (titularidad legal: off-chain) |

### Propuesta de Valor Técnica

- **BASHOOD-RWA-1:** Estándar técnico open-source para tokenizar activos industriales en EVM
- **6 modelos de depreciación:** Basados en uso real (carga, extrusión, setups, horas, eficiencia, lineal)
- **Telemetría on-chain:** Integración con APIs de fabricantes vía Chainlink Oracle
- **Módulos de lifecycle:** Inspection, Maintenance, LifecycleEvents, OperationalMetrics, Certification, Insurance
- **Diseñado para compatibilidad regulatoria:** Marco MiCA (UE) como referencia de diseño desde el inicio

---

## SERVICIOS DE INFRAESTRUCTURA {#servicios-ofrecidos}

### 1. Tokenización de Activos Industriales (TaaS)

**Para fabricantes y emisores de RWA:**
- Emisión de NFT ERC-721 conforme al estándar BASHOOD-RWA-1
- Metadata técnica completa almacenada en IPFS descentralizado
- Smart contracts de registro y lifecycle desplegados en Base L2
- Integración opcional con oráculo de telemetría (Chainlink)

**Entregables:**
- Auditoría y validación de especificaciones técnicas
- Generación de metadata IPFS verificable
- Deploy del contrato en Base Sepolia (testnet) y Base Mainnet
- Dashboard de administración del activo

**Precio:** Por proyecto, según complejidad del activo

---

### 2. Oracle Valuation Module

**Para operadores que requieren valoración actualizada:**
- Integración con Chainlink Price Feeds configurados por tipo de activo
- Actualización de `currentValue` del activo verificable on-chain
- Historial completo de valoraciones inmutable (eventos `AssetValueUpdated`)
- Cualquier parte puede verificar la fuente del dato de valoración

**Precisión:** El valor refleja una tasación orientativa a partir de fuentes externas. No constituye valoración legal vinculante ni precio garantizado de venta.

---

### 3. Lifecycle Modules

Módulos especializados que extienden el registro base del activo:

| Módulo | Función |
|--------|---------|
| **CertificationModule** | Registro de certificaciones vigentes (CE Mark, ISO, etc.) |
| **InsuranceModule** | Registro de póliza de seguro activa por activo |
| **InspectionModule** | Historial cronológico de inspecciones técnicas (PASS/FAIL/CONDITIONAL) |
| **MaintenanceHistoryModule** | Log append-only de eventos de mantenimiento y costes acumulados |
| **LifecycleEventsModule** | Historial de transiciones de estado operativo (OPERATIONAL/MAINTENANCE/INACTIVE/DECOMMISSIONED) |
| **OperationalMetricsAggregator** | Agregación cross-asset y consultas de flota (lee Core en tiempo real) |

Todos los módulos son contratos externos que no modifican el Core — el activo base es inmutable.

---

### 4. Integración API y Telemetría

**Para fabricantes con sistemas de telemetría propios:**
- Conexión de API REST del fabricante con nodo Chainlink dedicado
- Actualización periódica de métricas operativas on-chain (horas de uso, ciclos, eficiencia)
- Datos anonimizados y agregables para análisis de flota
- NDA para protección de IP técnica del fabricante

**Valor para el fabricante:** datos agregados de uso real → mejora de producto, mantenimiento predictivo, optimización de supply chain.

---

### 5. Compliance Services

**Para emisores que requieren soporte regulatorio:**
- Documentación técnica para due diligence legal (MiCA, VARA, otros)
- Integración KYC/AML en whitelist on-chain (via Presale contract)
- Reporting automatizado de métricas del activo para auditorías
- Soporte en structuring del vehículo legal off-chain (SPV, etc.) — en coordinación con asesor legal externo

**Precio:** Desde $15,000 proyecto base. Soporte legal externo no incluido.

---

## SECTORES Y ACTIVOS OBJETIVO {#sectores-objetivo}

### Sector Primario: Construcción con Impresión 3D y Robótica

#### 1. Impresoras 3D Gantry (Pórtico Fijo)

**Activos de referencia:**
- EVOCONS EVOBLOCK (España) — valor de registro: $1.2M
- ICON VULCAN (USA) — valor de registro: $1.6M

**Características del activo:**
- Sistema de instalación permanente
- Área de impresión: 300–1.000 m²
- Producción: 30–100 m³/semana
- Vida útil de referencia: 500.000 tons de carga levantada
- **Modelo de depreciación:** LOAD_BASED (toneladas)

**Especificaciones técnicas registrables:**
```
Altura de impresión: 3–8 metros
Velocidad de extrusión: 100–300 mm/s
Precisión: ±2–5 mm
Materiales: hormigón, mortero, composites
Potencia: 50–150 kW
Personal requerido: 2–4 operarios
```

---

#### 2. Impresoras 3D Móviles (Robots Portátiles)

**Activos de referencia:**
- Apis Cor Mobile Robot (UAE) — valor de registro: $325k
- CyBe RC Track Robot (Países Bajos) — valor de registro: $240k

**Características del activo:**
- Portátil; setup en ~48 minutos
- GPS tracking integrado
- Vida útil de referencia: 2.000 setups
- **Modelo de depreciación:** SETUP_BASED (configuraciones)

**Especificaciones técnicas registrables:**
```
Área de impresión: 100–400 m²
Peso del sistema: 2–8 tons
Transporte: contenedor 20ft
Velocidad de setup: 30–90 min
Personal requerido: 2–3 operarios
```

---

#### 3. Fábricas Modulares UV

**Activo de referencia:**
- Mighty Buildings Factory Line (USA) — valor de registro: $5.2M

**Características del activo:**
- Producción de paneles prefabricados por curado UV
- Zero waste, carbon negative
- **Modelo de depreciación:** LINEAR

**Especificaciones técnicas registrables:**
```
Output: 500–2.000 paneles/mes
Dimensiones de paneles: 2×4 metros
Certificaciones: LEED, Passive House
Superficie de planta: 5.000–20.000 m²
Personal requerido: 15–40 operarios
```

---

### Activos Secundarios (Roadmap)

| Categoría | Ejemplos | Valor Típico | Timeline |
|-----------|----------|--------------|----------|
| Vehículos pesados | Excavadoras, grúas | $200k–$800k | Q3 2026 |
| Equipos de energía | Generadores, transformadores | $500k–$2M | Q4 2026 |
| Infraestructura logística | Contenedores, almacenes modulares | $100k–$5M | 2027 |
| Créditos de carbono | Activos ESG certificados | Variable | 2027 |

---

## ARQUITECTURA RWA {#arquitectura-rwa}

BASHOOD provee las capas técnicas del stack RWA. Las capas legales y económicas son responsabilidad del emisor y de los asesores jurídicos de cada jurisdicción.

```
┌─────────────────────────────────────────────────────────────┐
│                  CAPA LEGAL / OFF-CHAIN                     │
│                                                             │
│   SPV / Vehículo Legal ←→ Titular Legal del Activo Físico  │
│   Derechos económicos definidos en contrato off-chain       │
│   Custodia del activo físico: responsabilidad del operador  │
└──────────────────────────┬──────────────────────────────────┘
                           │ referencia
┌──────────────────────────▼──────────────────────────────────┐
│              TOKEN REFERENCE LAYER (BASHOOD)                │
│                                                             │
│   BashoodRWAReference (ERC-721 UUPS)                        │
│   - Identificación inmutable del activo                     │
│   - Especificaciones técnicas on-chain                      │
│   - Estado operativo actual (OPERATIONAL / MAINTENANCE /    │
│     INACTIVE / DECOMMISSIONED)                              │
│   - Métricas operativas actuales (horas, ciclos, carga)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐
│ ORACLE LAYER  │ │ LIFECYCLE     │ │ COMPLIANCE LAYER     │
│               │ │ MODULES       │ │                      │
│ Chainlink     │ │               │ │ CertificationModule  │
│ Price Feeds   │ │ Inspection    │ │ InsuranceModule      │
│               │ │ Maintenance   │ │                      │
│ OracleValuat- │ │ Lifecycle     │ │ KYC/AML Whitelist    │
│ ionModule     │ │ Events        │ │ (Presale)            │
│               │ │               │ │                      │
│ currentValue  │ │ Metrics       │ │                      │
│ actualizado   │ │ Aggregator    │ │                      │
└───────────────┘ └───────────────┘ └──────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                BASE L2 BLOCKCHAIN                           │
│  Chain ID: 8453 | EVM: cancun | Gas: ~$0.01/tx             │
└─────────────────────────────────────────────────────────────┘
```

### Flujos Económicos: Off-Chain

Los flujos de ingresos derivados del uso operativo del activo (alquiler, operación, servicios) son gestionados **fuera del protocolo**, entre el operador del activo y los titulares legales correspondientes, a través del vehículo legal que éstos hayan constituido (SPV, contrato de arrendamiento, etc.).

BASHOOD registra el estado técnico y operativo del activo. No ejecuta ni distribuye flujos económicos entre participantes.

### Fees de Infraestructura del Protocolo

Los únicos ingresos del protocolo son:

| Concepto | Modelo |
|----------|--------|
| Emisión / tokenización de activo | Fee por unidad tokenizada |
| SaaS de gestión y lifecycle | Fee mensual por activo activo |
| Oracle telemetría | Fee por actualización Chainlink |
| Compliance services | Fee por proyecto |
| BHT utility token | Fee discount para holders; acceso a gobernanza |

---

## TECNOLOGÍA Y PROTOCOLO {#tecnología}

### BASHOOD como RWA Infrastructure Protocol

```
┌─────────────────────────────────────────────────────────┐
│              INTEGRADORES / FRONTENDS                   │
│  Plataformas de emisores, gestores de activos,          │
│  portales de operadores, APIs de fabricantes            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│           SMART CONTRACTS (Base Blockchain)             │
│                                                         │
│  BashoodRWAReference ──── OracleValuationModule         │
│  (Core: estado actual)    (Chainlink Price Feed)        │
│         │                                               │
│  ┌──────┴──────────────────────────────────────┐        │
│  │           LIFECYCLE MODULES                │        │
│  │  InspectionModule  MaintenanceHistoryModule │        │
│  │  LifecycleEventsModule  MetricsAggregator   │        │
│  │  CertificationModule  InsuranceModule       │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
│  BashoodToken (BHT) ── BHTVotes ── BashoodGovernor      │
│  BashoodPresaleFinal ── BashoodPaymentSplitter          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  BASE L2 BLOCKCHAIN                     │
│  Coinbase infrastructure | ~$0.01/tx | 2s finality      │
│  Hereda seguridad de Ethereum mainnet                   │
└─────────────────────────────────────────────────────────┘
```

### Especificaciones Técnicas del Protocolo

**Blockchain:**
- Network: Base L2 (Optimistic Rollup)
- Chain ID: 8453 (Mainnet) / 84532 (Sepolia testnet)
- EVM target: cancun
- Mainnet: Q2 2026 | Testnet: ✅ Operativo en Base Sepolia

**Smart Contracts:**
- Lenguaje: Solidity 0.8.28
- Estándar activo: BASHOOD-RWA-1 (ERC-721 extendido)
- Patrón de actualización: UUPS Upgradeable Proxy (EIP-1967)
- Análisis estático: Slither 0.11.3 — 0 vulnerabilidades críticas en contratos de producción
- Tests: 197 passing (Hardhat + Forge), 0 failing
- Fuzzing: 25 invariant tests passing (256 runs × 3.840 calls cada uno)

**Costes operativos estimados en Base L2:**
- Mint de activo: ~650.000 gas (~$0.65)
- Transferencia: ~80.000 gas (~$0.08)
- Update de estado: ~120.000 gas (~$0.12)
- Log de mantenimiento: ~90.000–130.000 gas

**Almacenamiento:**
- Metadata: IPFS descentralizado (Pinata gateway)
- On-chain: hash de metadata + datos críticos de identificación + métricas operativas

---

### Estándar BASHOOD-RWA-1

**6 Modelos de Depreciación Industrial:**

```solidity
enum DepreciationModel {
    LOAD_BASED,        // ej. grúas: toneladas levantadas
    EXTRUSION_BASED,   // ej. impresoras 3D: metros de material
    SETUP_BASED,       // ej. robots móviles: configuraciones de sitio
    TIME_BASED,        // ej. maquinaria pesada: horas de operación
    EFFICIENCY_BASED,  // ej. CyBe: m³/día de producción
    LINEAR             // estándar: tiempo calendario
}
```

**8 Categorías de Activos:**

```solidity
enum AssetCategory {
    CONSTRUCTION_3D_PRINTER_GANTRY,
    CONSTRUCTION_3D_PRINTER_MOBILE,
    MODULAR_FACTORY_UV,
    HEAVY_VEHICLE,
    ENERGY_EQUIPMENT,
    LOGISTICS_INFRASTRUCTURE,
    RAW_MATERIALS,
    REAL_ESTATE
}
```

**Estados Operativos del Activo:**

```solidity
enum OperationalStatus {
    OPERATIONAL,      // activo en uso
    MAINTENANCE,      // en mantenimiento programado
    INACTIVE,         // fuera de servicio temporalmente
    DECOMMISSIONED    // retirado permanentemente (estado terminal)
}
```

### Integración Oracle Chainlink

```
API Fabricante → Nodo Chainlink → OracleValuationModule → BashoodRWAReference

Ejemplo EVOCONS EVOBLOCK:
1. API telemetría envía: {"loadLifted": 1250, "uptime": 98.5}
2. Chainlink verifica y firma el dato
3. OracleValuationModule actualiza currentValue on-chain
4. Evento AssetValueUpdated emitido — auditable por cualquier parte
```

Frecuencia de actualización configurable:
- Telemetría: cada 1 hora (según feed configurado)
- Valoración: cada 24 horas (según staleness threshold)
- Lifecycle events: on-demand (por operador autorizado)

---

## CASOS DE USO {#casos-de-uso}

### Caso 1: Fabricante que Digitaliza su Flota

**Perfil:** EVOCONS — fabricante español de sistemas Gantry de construcción 3D

**Situación actual:**
- 95% de las constructoras no pueden adquirir el equipo ($1.2M upfront)
- El fabricante no tiene visibilidad del estado real de sus equipos una vez vendidos
- El historial de mantenimiento depende de documentación en papel

**Con BASHOOD:**

```
1. Tokenización:
   → 5 unidades EVOBLOCK registradas en blockchain
   → Cada activo tiene digital twin verificable on-chain

2. Telemetría:
   → API EVOCONS conectada vía Chainlink
   → Métricas de uso en tiempo real: carga, uptime, eficiencia
   → Datos para mantenimiento predictivo y mejora de diseño

3. Historial auditable:
   → InspectionModule: historial de inspecciones pre/post uso
   → MaintenanceHistoryModule: log de servicios con costes acumulados
   → CertificationModule: estado de certificaciones CE/ISO vigentes

4. Visibilidad para financiadores y aseguradoras:
   → Cualquier parte puede verificar el estado real del activo on-chain
   → InsuranceModule: cobertura vigente registrada y auditable
```

**Resultado:** El fabricante tiene visibilidad completa del ciclo de vida de sus activos, puede demostrar el estado técnico a financiadores y aseguradoras, y amplía el mercado accesible a operadores que estructuran la financiación off-chain.

---

### Caso 2: Operador de Activos que Requiere Transparencia

**Perfil:** Empresa gestora de flota de robots de construcción (múltiples unidades, múltiples proyectos)

**Situación actual:**
- Historial de cada activo disperso en sistemas incompatibles
- Dificultad para demostrar estado de mantenimiento a clientes y aseguradoras
- Valoración actualizada requiere tasadores externos costosos

**Con BASHOOD:**

```
1. Registro centralizado verificable:
   → Todos los activos de la flota registrados en Base L2
   → Estado operativo actual de cada activo visible on-chain

2. OperationalMetricsAggregator:
   → Consulta agregada de métricas de flota completa
   → activeRatio, distribución de estados, totales de horas/carga

3. Valoración automática:
   → OracleValuationModule actualiza currentValue vía Chainlink
   → Historial completo de valoraciones on-chain para due diligence

4. Compliance:
   → CertificationModule: estado CE Mark, ISO 9001, etc.
   → InsuranceModule: póliza vigente verificable por cualquier parte
```

---

### Caso 3: Integrador / Plataforma que Construye sobre BASHOOD

**Perfil:** Plataforma que desea lanzar un product de RWA industrial sobre infraestructura existente

**Situación actual:**
- Construir infraestructura de registro de activos from scratch es costoso y lento
- Los estándares técnicos para activos industriales no están establecidos

**Con BASHOOD:**

```
1. Estándar abierto:
   → BASHOOD-RWA-1 es open-source y extensible
   → Interfaces IBashoodRWA, IBashoodModule como base
   → ERC-721 UUPS upgradeable: actualizable sin redeploy

2. Módulos plug-and-play:
   → Todos los lifecycle modules son contratos externos
   → El integrador despliega solo los módulos que necesita
   → Core BashoodRWAReference: nunca modificado, siempre compatible

3. Interoperabilidad:
   → Compatible con cualquier frontend EVM estándar
   → API REST disponible para integraciones ERP (SAP, Oracle, NetSuite)
   → Compatible con mercados secundarios regulados cuando aplique

4. Gobernanza del protocolo:
   → Cambios de estándar sujetos a gobernanza on-chain (BHT/BHTVotes)
   → Actualizaciones predecibles para integradores
```

---

## VENTAJAS COMPETITIVAS {#ventajas-competitivas}

### BASHOOD vs Otros Protocolos RWA

| Aspecto | Centrifuge | Goldfinch | Ondo Finance | **BASHOOD** |
|---------|------------|-----------|--------------|-------------|
| **Sector** | Real estate | Préstamos PyME | Treasury bonds | **Robótica industrial** |
| **Modelo de depreciación** | Lineal | N/A | N/A | **6 modelos por uso real** |
| **Telemetría on-chain** | No | No | No | **Sí (Chainlink)** |
| **Lifecycle modules** | No | No | No | **Sí (6 módulos)** |
| **Gobernanza on-chain** | Parcial | No | Parcial | **Sí (BHT/Governor/Timelock)** |
| **Estándar abierto** | Parcial | No | No | **Sí (BASHOOD-RWA-1)** |
| **Análisis fuzzing** | N/D | N/D | N/D | **197 tests, invariant testing** |

### Ventajas Técnicas del Protocolo

1. **Primer estándar RWA para activos industriales:** BASHOOD-RWA-1, open-source, extensible
2. **Coste de operación ultra-bajo:** Base L2 ~$0.01/tx vs $20–50 en Ethereum mainnet
3. **Arquitectura upgradeable:** UUPS proxy — sin redeploy para actualizaciones
4. **Modularidad:** Core inmutable + módulos externos plug-and-play
5. **Gobernanza descentralizada:** BashoodGovernor + BashoodTimelock on-chain
6. **Seguridad verificada:** Slither 0.11.3, Forge invariant fuzzing (256 runs × 3.840 calls)

### Por qué Base L2

- Coste por transacción: ~$0.01 (vs $20–50 en mainnet Ethereum)
- Finalidad: <2 segundos
- Seguridad: hereda consenso de Ethereum mainnet (Optimistic Rollup)
- Infraestructura: Coinbase — grado institucional
- Compatible con todo el ecosistema de herramientas EVM estándar

---

## PARTICIPANTES DEL ECOSISTEMA {#participantes}

BASHOOD está diseñado para cuatro tipos de participantes. Ninguno de ellos es un "inversor retail en activos industriales".

### 1. Emisores de RWA

**Quiénes son:** Fabricantes, propietarios de activos, gestores de flota que desean tokenizar activos físicos.

**Qué obtienen:**
- Registro on-chain verificable de sus activos
- Digital twin con telemetría y lifecycle tracking
- Infraestructura de compliance (certificaciones, seguros)
- Herramienta para demostrar estado técnico a financiadores y aseguradoras

**Acceso:** Directo a BASHOOD como emisor. Acuerdo de integración requerido.

---

### 2. Operadores de Activos

**Quiénes son:** Empresas que operan, gestionan o dan servicio a los activos tokenizados.

**Qué obtienen:**
- Visibilidad en tiempo real del estado de la flota
- Historial auditable de inspecciones y mantenimiento
- Notificaciones de vencimiento de certificaciones y seguros
- API para integración con sistemas propios (ERP, CMMS)

**Acceso:** Via API del protocolo o integración directa con contratos.

---

### 3. Custodios y Vehículos Legales (SPV)

**Quiénes son:** Entidades que estructuran el vehículo legal off-chain para el activo tokenizado.

**Qué obtienen:**
- Base técnica verificable para due diligence
- Historial on-chain de valoraciones, estado operativo y compliance
- Referencia estándar para documentación legal del activo

**Nota:** La construcción del vehículo legal (SPV, contrato de arrendamiento, participación en ingresos) es responsabilidad del custodio y su asesor legal. BASHOOD provee la capa técnica, no la estructura legal ni financiera.

---

### 4. Mercados Secundarios Regulados

**Quiénes son:** Plataformas, brokers o exchanges que operan bajo licencia y desean integrar activos tokenizados como subyacente.

**Qué obtienen:**
- Datos técnicos estandarizados y verificables del activo (BASHOOD-RWA-1)
- Oracle de valoración actualizado on-chain
- Historial de lifecycle para due diligence
- Interoperabilidad con infraestructura EVM estándar

**Nota:** Cualquier estructuración de participación económica en activos se realiza a través del vehículo legal del mercado correspondiente, bajo su propia licencia regulatoria. BASHOOD no opera como mercado, broker ni plataforma de inversión.

---

## PARA OPERADORES DE ACTIVOS {#para-operadores}

### Servicios de Gestión Operativa

**1. Registro y digitalización del activo**

- Tokenización conforme al estándar BASHOOD-RWA-1
- Metadata técnica completa en IPFS
- Digital twin vinculado al activo físico desde el día 1

**Referencia de costes operativos en Base L2:**
- Registro inicial: ~$0.65 por activo (650k gas)
- Update de estado: ~$0.12 por operación
- Log de mantenimiento: ~$0.09–$0.13 por registro

---

**2. Acceso a tecnología industrial sin adquisición directa**

Los operadores que requieren acceso temporal a equipamiento pueden estructurar acuerdos de uso con el propietario del activo a través del vehículo legal correspondiente.

BASHOOD provee el registro técnico del activo que facilita esa negociación — estado de mantenimiento, certificaciones, historial de uso — pero no ejecuta ni media en el acuerdo económico.

---

**3. Especificaciones operativas de referencia**

**Sistemas Gantry (ej. EVOCONS EVOBLOCK):**
```
Área: 300–1.000 m² | Producción: 30–100 m³/semana
Altura: 3–8m | Materiales: hormigón, mortero, composites
Personal: 2–4 operarios certificados
Capacitación: 2 días on-site (incluida en integración)
```

**Robots Móviles (ej. Apis Cor, CyBe):**
```
Área: 100–400 m² | Setup: 30–90 min
Transporte: contenedor 20ft | Personal: 2–3 operarios
Depreciación: por número de configuraciones de sitio
```

**Fábricas Modulares UV (ej. Mighty Buildings):**
```
Output: 500–2.000 paneles/mes | Dimensiones: 2×4m
Certificaciones requeridas: LEED, Passive House
Personal: 15–40 operarios según escala
```

### Certificaciones y Cumplimiento

- ISO 9001 (Quality Management) — requerido
- ISO 14001 (Environmental) — recomendado
- CE Mark (UE) / UL 3401 (USA) — según jurisdicción

---

## PARA FABRICANTES {#para-fabricantes}

### Por qué Integrar BASHOOD-RWA-1

**1. Visibilidad real del ciclo de vida de tus activos**

Una vez que el equipo está en campo, el fabricante pierde visibilidad sobre cómo se usa realmente. Con BASHOOD y la integración de telemetría:

```python
# Datos agregados disponibles (anonimizados por defecto)
{
  "usage_patterns": {
    "peak_hours": "06:00-14:00",
    "avg_load_per_day": 12.5,   # toneladas
    "materials_most_used": "Mortar 60%, Concrete 30%, Other 10%"
  },
  "maintenance_predictive": {
    "component_wear": "Extruder nozzle 78% lifetime used",
    "next_service_recommended": "2026-04-15"
  },
  "geographic_performance": {
    "Spain":    {"efficiency": "94%", "uptime": "92%"},
    "UAE":      {"efficiency": "89%", "uptime": "88%"}
  }
}
```

Resultado: mejora de diseño de producto, reducción de garantías, optimización de pieza de repuesto.

---

**2. Ampliar el mercado accesible**

Con el activo tokenizado y su historial técnico verificable:
- Financiadores pueden hacer due diligence del activo sin auditoría presencial
- Aseguradoras pueden verificar estado de mantenimiento on-chain
- Operadores pueden demostrar el estado del activo a clientes finales

El fabricante sigue siendo el referente técnico del activo. BASHOOD provee la infraestructura de visibilidad.

---

**3. Proceso de integración**

**Fase 1: Onboarding (2–4 semanas)**

```
Semana 1: Auditoría técnica del activo
   → Especificaciones validadas y documentadas
   → Definición del modelo de depreciación aplicable
   → Documentación legal del activo verificada

Semana 2–3: Desarrollo del smart contract
   → Customización del modelo BASHOOD-RWA-1 al activo
   → Integración de API de telemetría (si aplica)
   → Deploy en Base Sepolia y pruebas end-to-end

Semana 4: Launch en Base Mainnet
   → Metadata IPFS generada y fijada
   → Dashboard de administración entregado
   → NDA de datos de telemetría firmado
```

**Fase 2: Operación continua**

```
Diario:      telemetría → Chainlink → on-chain update
Semanal:     reporting de estado de flota
Mensual:     reconciliación de métricas y mantenimiento predictivo
On-demand:   lifecycle events, inspecciones, cambios de estado
```

---

### Modelos de Fee de Infraestructura

**Opción A: Fee Flat**
```
Setup inicial: $25.000
Fee mensual SaaS: $500/activo
Fee de telemetría: incluido
BASHOOD fee: 0% sobre ingresos del activo
```

**Opción B: Fee por uso**
```
Setup inicial: $0
BASHOOD fee: 2.5% sobre fees de infraestructura cobrados por el protocolo
(No sobre los ingresos del activo — esos son off-chain)
```

**Opción C: Híbrido** (recomendado para integraciones complejas)
```
Setup inicial: $10.000
Fee mensual SaaS: $250/activo
Fee de telemetría: $50/activo/mes
```

---

### Partners Piloto

| Fabricante | País | Activo | Status |
|------------|------|--------|--------|
| EVOCONS | España | EVOBLOCK Gantry | ✅ Piloto técnico activo |
| ICON | USA | VULCAN Printer | En conversaciones |
| Apis Cor | UAE | Mobile Robot | En conversaciones |
| CyBe | Países Bajos | RC Track Robot | En conversaciones |
| Mighty Buildings | USA | Factory UV Line | En conversaciones |

---

## PREGUNTAS FRECUENTES {#faq}

### Sobre el Protocolo

**P: ¿Es BASHOOD una plataforma de inversión?**  
R: No. BASHOOD es infraestructura técnica de protocolo para registro, valoración y lifecycle tracking de activos industriales. Los flujos económicos derivados del uso de un activo tokenizado son gestionados off-chain, entre el operador y los titulares legales, en el vehículo legal que éstos hayan constituido.

**P: ¿Qué blockchain utilizan?**  
R: Base L2 — infraestructura de Coinbase. Coste ~$0.01/tx, finalidad <2 segundos, seguridad heredada de Ethereum mainnet.

**P: ¿Cuándo se despliega en mainnet?**  
R: Q2 2026. Actualmente operativo en Base Sepolia testnet.

**P: ¿Es BASHOOD compatible con MiCA u otras regulaciones?**  
R: El protocolo está diseñado para compatibilidad regulatoria, tomando el marco UE/MiCA como referencia desde el inicio. La clasificación regulatoria definitiva de cualquier producto construido sobre BASHOOD depende de su estructura específica y debe ser evaluada por asesor legal independiente.

---

### Sobre el Token BHT

**P: ¿Para qué sirve el BHT?**  
R: BHT (BashoodToken) es el token de utilidad del protocolo con tres funciones concretas:
- Descuento en fees de registro e infraestructura (hasta 60%)
- Participación en gobernanza on-chain (1 BHT = 1 voto via BHTVotes)
- Mecanismo deflacionario: 0.1% de cada transacción se quema permanentemente

**P: ¿El BHT da derechos sobre los activos tokenizados?**  
R: No. BHT no representa participación en activos físicos, no otorga derechos sobre ingresos generados por esos activos, y no es un instrumento de inversión. Su valor depende exclusivamente de su adopción como herramienta de acceso y gobernanza del protocolo.

**P: ¿El BHT garantiza rendimientos?**  
R: No. El BHT no garantiza ni promete rendimientos de ningún tipo. No existe garantía contractual entre el crecimiento del protocolo y el precio del token.

---

### Sobre los NFTs BASHOOD-RWA-1

**P: ¿Un NFT BASHOOD-RWA-1 me da propiedad del activo físico?**  
R: No. El token es un registro digital del activo — un digital twin — no un título de propiedad. La propiedad legal del activo físico es una relación off-chain entre el propietario y el ordenamiento jurídico de su país.

**P: ¿Se pueden transferir los tokens?**  
R: Sí, como cualquier NFT ERC-721. La transferencia del token de referencia no implica la transferencia de la propiedad legal del activo físico, que se gestiona off-chain.

**P: ¿Quién puede verificar los registros?**  
R: Cualquier persona puede verificar los registros on-chain en BaseScan sin crear ninguna cuenta ni conectar wallet. El código es completamente open-source.

---

### Para Operadores

**P: ¿Necesito conocimientos de blockchain para operar?**  
R: No para las funciones básicas. El protocolo dispone de API REST y dashboards de gestión. Para integraciones avanzadas con ERP, se requiere soporte técnico del equipo de integración.

**P: ¿Qué pasa si necesito actualizar las especificaciones del activo?**  
R: Los datos de identificación son inmutables post-mint. Las métricas operativas y el estado son actualizables por roles autorizados. Si hay un error en los datos fundacionales, se requiere un proceso documentado de corrección con evidencia técnica.

---

### Para Fabricantes

**P: ¿Pierdo control técnico sobre mis activos?**  
R: No. El fabricante mantiene control técnico, mantenimiento y certificaciones. BASHOOD gestiona la capa de registro digital, no la operación del equipo.

**P: ¿Qué datos de mi API son compartidos?**  
R: Solo métricas operativas agregadas y anonimizadas. La IP técnica del fabricante está protegida por NDA. Los datos granulares son propiedad del fabricante.

**P: ¿Compatible con mi ERP existente?**  
R: Sí. API REST disponible para integración con SAP, Oracle, NetSuite, etc.

---

## DATOS TÉCNICOS CLAVE {#datos-técnicos}

### Activos Tokenizados (Live en Base Sepolia Testnet)

Los siguientes registros son instalaciones piloto en testnet, utilizados para validar el protocolo. Los valores indicados son los valores de registro del activo físico de referencia.

| Token ID | Activo | Fabricante | Valor de Registro | Verificable en |
|----------|--------|------------|-------------------|----------------|
| 202 | EVOBLOCK Gantry | EVOCONS | $1.200.000 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0x05c53a716b86838b1f155b0629062e53531762a88e496757f5c26c79c4de226a) |
| 203 | VULCAN Printer | ICON | $1.600.000 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0xedb0ccce4135ea92e765d24fdf66a37425f08760cab8898acac9d275eecb20e5) |
| 204 | Mobile Robot | Apis Cor | $325.000 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0x963ec5b5067689fa7c5b6e2e9f58b16a4991088c0a440b57e8253edba91087bc) |
| 205 | RC Printer | CyBe | $240.000 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0x8268306e8a4cb841dd936b91cecf649292682903adb603f2a3dcfb1e10d962bf) |
| 206 | Factory Line | Mighty Buildings | $5.200.000 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0x1520f6917f7452c19a53fbaba62e66583529aa93a4fcaf48756bcfecdc89a5e1) |

*Nota: Los valores de registro son los precios de adquisición originales del activo físico, registrados en el momento del mint. No representan valoración de mercado actual ni precio de venta.*

---

### Smart Contracts

**Testnet — Base Sepolia (operativo):**
- BashoodRWAReference: `0x25e686Ccd10846C1Da16e204D1334640F07d4d96`
- [Ver en Basescan](https://sepolia.basescan.org/address/0x25e686Ccd10846C1Da16e204D1334640F07d4d96)

**Mainnet — Base (Q2 2026):**
- BashoodRWAReference: TBD (pendiente auditoría externa)
- BashoodPresaleFinal: TBD
- BashoodToken (BHT): TBD

---

### Métricas del Protocolo

**Estado del desarrollo (4 de marzo de 2026):**
- Solidity 0.8.28 | EVM: cancun | Optimizador: activado
- Contratos de producción compilados: 193
- Test suite Hardhat: 197 passing, 0 failing
- Forge invariant tests: 25 passing (256 runs × 3.840 calls c/u)
- Forge fuzz tests: 5 suites, 1.000 runs cada uno
- Seguridad: Slither 0.11.3 — 0 vulnerabilidades críticas en contratos de producción
- Patrón de actualización: UUPS (EIP-1967) en BashoodRWAReference y BashoodToken

**Módulos M4 (lifecycle):**
- InspectionModule: 35 tests
- MaintenanceHistoryModule: 32 tests
- LifecycleEventsModule: 33 tests
- OperationalMetricsAggregator: 33 tests

---

### Roadmap Técnico

**Q2 2026 — Mainnet Launch**
- Deploy en Base Mainnet con auditoría de seguridad externa
- Activación de oracle Chainlink de producción para los 5 activos piloto
- Apertura del registro a primeros emisores externos
- KYC/AML integration (Civic/Persona)

**Q3 2026 — Lifecycle Infrastructure**
- Activación de todos los módulos M4 en producción
- API de telemetría para fabricantes piloto
- Gobernanza DAO operativa (BHT/BHTVotes/Governor)
- Documentación BASHOOD-RWA-2 (draft)

**Q4 2026 — Compliance y Ecosistema**
- Custodia institucional (Fireblocks integration)
- Interoperabilidad con mercados secundarios regulados
- Módulos de carbon credits (BASHOOD-RWA-2 draft)
- Insurance protocol integration (Nexus Mutual / Uno Re)

**2027 — Expansión**
- Multi-chain: Arbitrum, Optimism
- Expansión de sectores (vehículos pesados, energía, infraestructura logística)
- Mantenimiento predictivo vía AI sobre datos de telemetría agregados

---

## PRÓXIMOS PASOS {#próximos-pasos}

### Para Distribuidores y Partners

**Acción inmediata:**
1. Explorar registros piloto en [Base Sepolia testnet](https://sepolia.basescan.org/address/0x25e686Ccd10846C1Da16e204D1334640F07d4d96)
2. Revisar documentación técnica: WHITEPAPER.md y BASHOOD-RWA-1-SPECIFICATION.md
3. Agendar sesión de onboarding con el equipo BASHOOD

**Training disponible:**
- Sesión 1: Arquitectura del protocolo (2 horas)
- Sesión 2: Demo técnica en testnet (1 hora)
- Sesión 3: Casos de uso sector específico (1 hora)

**Fees de referencia distribuidores:**
- Emisores referidos: fee por proyecto (estructura a acordar)
- Operadores referidos: fee por integración SaaS completada
- Fabricantes referidos: fee flat + fee mensual del contrato SaaS

---

### Para Emisores Potenciales

**Proceso de integración:**
1. NDA + call técnica exploratoria
2. Auditoría técnica del activo (2 semanas)
3. Desarrollo y customización smart contract (3 semanas)
4. Deploy testnet + validación (1 semana)
5. Pilot program (3 meses)
6. Deploy mainnet + launch

**Contacto:**
- Email: issuers@bashood.com
- LinkedIn: [BASHOOD Protocol](https://linkedin.com/company/bashood)
- Agendar: [calendly.com/bashood](https://calendly.com/bashood)

---

### Para Operadores de Activos

**Proceso:**
1. Call exploratoria (30 min)
2. Evaluación de activos a integrar
3. Propuesta técnica + comercial
4. Integración piloto (4–6 semanas)

**Contacto:**
- Email: operators@bashood.com
- WhatsApp: +34 XXX XXX XXX

---

### Para Fabricantes

**Proceso:**
1. NDA
2. Auditoría técnica del activo (2 semanas)
3. Negociación de términos
4. Desarrollo del smart contract (3 semanas)
5. Pilot program (3 meses) → Full launch

**Contacto:**
- Email: manufacturers@bashood.com

---

## CONTACTO Y SOPORTE

**Oficinas:**
- España: Madrid (HQ)
- USA: Delaware (entidad legal)
- UAE: Dubai (operaciones MENA)

**Soporte técnico:**
- Email: support@bashood.com
- Discord: #soporte (24/7)
- GitHub: github.com/bashood (código open-source)

**Redes:**
- Twitter/X: @BashoodRWA
- LinkedIn: BASHOOD Protocol
- GitHub: github.com/bashood

---

## DISCLAIMER LEGAL

*Este documento es exclusivamente informativo y está destinado a distribuidores y partners autorizados de BASHOOD.*

*Nada en este documento constituye oferta pública de valores, solicitud de inversión, promesa de rendimiento, ni participación en beneficios derivados de activos físicos o del protocolo.*

*Los tokens BASHOOD-RWA-1 son registros digitales estructurados de activos industriales físicos. No representan título de propiedad sobre el activo físico ni instrumento financiero. Los derechos económicos específicos de cualquier activo tokenizado son definidos por el emisor en un marco contractual separado, off-chain, bajo su responsabilidad.*

*BHT es un token de utilidad funcional para acceso y gobernanza del protocolo. No incorpora derechos financieros ni promesas de rendimiento.*

*La compatibilidad regulatoria de cualquier producto construido sobre BASHOOD depende de su estructura específica y de la jurisdicción aplicable. El receptor de este documento es responsable de obtener asesoramiento legal independiente.*

*Última actualización: 4 de marzo de 2026*  
*Versión: 2.0 — Confidencial para distribuidores y partners autorizados*

---

*Para documentación técnica completa: WHITEPAPER.md y BASHOOD-RWA-1-SPECIFICATION.md*  
*Código fuente: repositorio oficial (open-source)*  
*Bashood Technologies SL — 2026*

---

**© 2026 BASHOOD Protocol. Todos los derechos reservados.**
