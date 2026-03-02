# BASHOOD Protocol — Litepaper

**Versión:** 1.0  
**Fecha:** 2 de marzo de 2026  
**Red:** Base L2 (Ethereum Layer 2 de Coinbase)

---

> **Aviso:** Los tokens BASHOOD-RWA-1 son registros digitales estructurados de activos industriales físicos. No representan título de propiedad ni instrumento financiero. Los derechos económicos específicos de cualquier activo tokenizado son definidos por el emisor en un marco contractual separado. Consulte a un asesor legal antes de participar. Marco regulatorio de referencia: UE / MiCA (Reglamento 2023/1114).

---

## ¿Qué es Bashood?

Bashood es un protocolo descentralizado desplegado en Base L2 que permite crear **registros digitales verificables** de activos industriales físicos de alto valor.

Cuando una empresa registra una grúa de $1.2M en Bashood, el resultado es un NFT que contiene on-chain — de forma inmutable y verificable por cualquier persona — los datos de identificación del activo, sus especificaciones técnicas, su precio de compra original, y el valor de mercado actualizado periódicamente por un oracle Chainlink.

Ese registro no desaparece, no puede ser alterado arbitrariamente, no depende de ningún servidor centralizado, y puede transferirse a otro propietario en segundos.

---

## El Problema que Resuelve

Hoy, verificar el estado real de un activo industrial requiere:

- Documentación en papel dispersa en varios sistemas
- Depender de la honestidad del vendedor
- Pagar a intermediarios para obtener tasaciones
- Esperar semanas para completar una transferencia de titularidad documental

Para los propietarios de equipamiento industrial, esto significa:
- Dificultad para demostrar el estado de mantenimiento, certificaciones y cobertura de seguro de su activo
- Procesos lentos para transferir o apalancarse sobre el activo
- Fragmentación de la información histórica (valor, uso, mantenimiento) en sistemas incompatibles

---

## Cómo Funciona

El protocolo opera en tres capas:

### 1. El Registro (Core)

Cuando se registra un activo, la función `mintAsset` escribe en la blockchain de Base L2:

```
✅ Identificación: nombre, fabricante, modelo, nº serie, año, origen
✅ Especificaciones técnicas: capacidad, velocidad, consumo, volumen
✅ Datos económicos: precio de compra, valor actual, modelo de depreciación
✅ Métricas operativas: horas de uso, ciclos, mantenimientos
```

Estos datos son **inmutables después del mint**. Nadie puede cambiar el número de serie de una grúa una vez registrado.

### 2. La Valoración (OracleValuationModule)

El valor de mercado del activo (`currentValue`) se actualiza periódicamente a través de un oracle Chainlink configurado para ese tipo de activo. La actualización:

- La puede iniciar cualquier cuenta llamando `pushValuation(tokenId)`
- El oracle resuelve el precio del activo vía Chainlink
- El resultado se escribe en el Core con el reason `"ORACLE_REVALUATION"`
- El evento `AssetValueUpdated` queda registrado on-chain permanentemente

Cualquier auditor externo puede verificar el historial completo de valoraciones consultando los eventos del contrato.

> **Precisión:** El campo `currentValue` refleja una tasación orientativa basada en fuentes externas y no constituye precio garantizado de venta, valor liquidativo (NAV) ni valoración legal vinculante.

### 3. Los Módulos (Compliance y Seguro)

Dos módulos especializados completan el registro:

**CertificationModule:** Registro de certificaciones vigentes por activo  
`getCertification(tokenId, "CE_MARK")` devuelve si el activo tiene CE Mark activo hoy

**InsuranceModule:** Registro de la póliza de seguro vigente  
`isInsured(tokenId)` devuelve si el activo tiene cobertura activa

Ambos módulos son actualizados por entidades acreditadas (organismos certificadores, aseguradoras), no por el propietario del activo unilateralmente.

---

## El Estándar BASHOOD-RWA-1

Bashood no es solo un contrato — es un **estándar abierto** para registros de activos industriales en EVM.

Fue diseñado a partir de investigación directa sobre 5 empresas líderes en construcción industrial:

| Empresa | País | Tipo de activo | Aportación al estándar |
|---|---|---|---|
| EVOCONS | España | Grúas gantry de construcción | Modelo de depreciación por carga (500k ton.) |
| ICON | EEUU | Impresoras 3D Lavacrete (VULCAN) | Depreciación por metros extruidos |
| Apis Cor | EEUU / UAE | Robots de construcción móviles | GPS tracking, depreciación por instalaciones |
| CyBe Construction | Países Bajos | Impresoras 3D de mortero | Depreciación por m³/día de producción |
| Mighty Buildings | EEUU | Fábricas modulares UV | Integración ESG, depreciación lineal |

El estándar define 6 modelos de depreciación industriales (load-based, extrusion-based, setup-based, time-based, efficiency-based, linear) y soporta 8 categorías de activos.

---

## Los 5 Activos Piloto

En Base Sepolia (testnet de producción), el protocolo tiene registrados 5 activos reales:

| Activo | Fabricante | Valor registrado | Verificable en |
|---|---|---|---|
| EVOBLOCK Gantry System | EVOCONS | $1.200.000 | BaseScan token #202 |
| VULCAN Printer | ICON | $1.600.000 | BaseScan token #203 |
| Mobile Construction Robot | Apis Cor | $325.000 | BaseScan token #204 |
| RC-9 Concrete Printer | CyBe Construction | $240.000 | BaseScan token #205 |
| UV Factory Line | Mighty Buildings | $5.200.000 | BaseScan token #206 |
| **Total registrado** | | **$8.565.000** | |

Cualquier persona puede verificar estos registros on-chain en BaseScan sin crear ninguna cuenta ni conectar wallet.

---

## El Token BHT

**BHT (BashoodToken)** es el token de utilidad del protocolo. Su propósito es funcional:

| Para qué sirve el BHT | Cómo funciona |
|---|---|
| Reducir el coste de usar el protocolo | Holders reciben hasta 60% de descuento en fees de registro |
| Participar en la gobernanza | 1 BHT = 1 voto en decisiones del protocolo |
| Mecanismo deflacionario | El 0,1% de cada transacción se quema permanentemente |

**Lo que BHT no es:**
- No es una participación en el rendimiento de los activos registrados
- No garantiza rendimiento de ningún tipo
- No es un instrumento de inversión

El BHT no representa participación en activos físicos, no otorga derechos sobre ingresos generados por dichos activos y no debe interpretarse como instrumento de inversión.

El valor del BHT depende exclusivamente de su adopción como herramienta funcional dentro del protocolo. No existe garantía ni correlación contractual entre el crecimiento del protocolo y el precio del token.

---

## Tecnología

### Base L2 — Por Qué Importa

Bashood se despliega en Base L2, la blockchain Layer 2 de Coinbase:

- **Coste**: ~$0.01 por transacción vs. $20–50 en Ethereum mainnet
- **Velocidad**: Finalidad en <2 segundos
- **Seguridad**: Hereda el consenso de Ethereum mainnet
- **Compatibilidad**: Totalmente compatible con herramientas EVM estándar

Para registros de activos industriales, estas propiedades son críticas: un empresa que registra 1.000 equipos al año pagaría ~$50 en fees de transacción en Base L2, vs. miles de dólares en mainnet.

### Chainlink — Valoración Verificable

El protocolo usa Chainlink Price Feeds para actualizar el valor de mercado de los activos. Chainlink es el estándar de la industria para datos on-chain verificables:

- El feed de datos es externcamente auditable (cualquiera puede ver la fuente)
- El mecanismo de actualización es abierto (cualquiera puede iniciar una valoración)
- El historial es inmutable (los eventos `AssetValueUpdated` no pueden borrarse)

### OpenZeppelin — Seguridad Probada

La arquitectura de control de acceso, el patrón de proxy actualizaable (UUPS) y los contratos base usan OpenZeppelin, el estándar de seguridad más ampliamente auditado del ecosistema Ethereum.

---

## Marco Regulatorio

Bashood fue diseñado con el marco UE/MiCA como referencia desde el inicio.

**Posición de los NFT BASHOOD-RWA-1:**  
Candidatos a la exención de NFT no fungibles del Artículo 2(3) del Reglamento (UE) 2023/1114 (MiCA), condicionado a que cada emisión concreta mantenga las condiciones de unicidad y ausencia de derechos financieros incorporados.

**Posición del BHT:**  
Token de utilidad funcional diseñado para acceso y participación en el protocolo. No incorpora derechos financieros ni promesas de rendimiento. La clasificación regulatoria definitiva corresponde a la autoridad competente.

**Lo que esto significa en la práctica:**
- No prometemos rentabilidades ni rendimientos
- El protocolo no gestiona ni distribuye ingresos de activos físicos
- Cualquier derecho económico sobre un activo específico es responsabilidad del emisor de ese activo

---

## Quién Puede Usar el Protocolo

### Propietarios de activos industriales
Pueden crear un registro on-chain permanente y verificable de su maquinaria. Útil para demostrar el estado del activo a compradores, financiadores, aseguradoras o socios.

### Empresas de mantenimiento y certificación
Pueden actualizar el estado de compliance del activo directamente on-chain como entidades certificadores acreditadas, creando un historial auditable.

### Aseguradoras y organismos de seguro
Pueden registrar la póliza vigente del activo on-chain, eliminando la dependencia de documentación en papel.

### Desarrolladores y protocolos DeFi
Pueden construir sobre el estándar BASHOOD-RWA-1 como base de datos de referencia para activos industriales. El código es open-source.

### Integradores y distribuidores
Pueden conectar plataformas de gestión de equipos al protocolo mediante las interfaces canónicas del estándar.

---

## Estado Actual y Próximos Pasos

### Ahora mismo
- ✅ Protocolo completo desplegado en Base Sepolia testnet
- ✅ 5 activos industriales piloto verificados on-chain
- ✅ 838 tests passing (0 errores críticos)
- ✅ Módulos Oracle, Certification e Insurance operativos
- ✅ Definición oficial del token (MiCA v1.0) formalizada

### Q2 2026 — Mainnet
- Despliegue en Base Mainnet
- Activación de oracle Chainlink de producción para los 5 activos piloto
- Auditoría externa de seguridad
- Apertura del registro a nuevos emisores

### Q3 2026 — Ecosistema
- Marketplace secundario de registros
- Módulo de seguimiento de depreciación en tiempo real
- Introducción de governance voting con BHT

### Q4 2026 — DAO
- Gobernanza on-chain completamente operativa
- Extensiones del estándar (BASHOOD-RWA-2: créditos de carbono)

---

## Preguntas Frecuentes

**¿Bashood me da propiedad de los activos industriales?**  
No. Un token BASHOOD-RWA-1 es un registro digital del activo, no un título de propiedad. La propiedad legal del activo físico es una relación off-chain entre el propietario y el ordenamiento jurídico de su país.

**¿Gano dinero comprando BASHOOD-RWA-1 NFTs?**  
El protocolo no promete ni garantiza rendimientos de ningún tipo. Si un emisor específico configura derechos económicos sobre su activo tokenizado, esos derechos son definidos en un contrato off-chain separado, bajo responsabilidad del emisor.

**¿Para qué sirve el BHT si no da derechos sobre los activos?**  
BHT reduce el coste de usar el protocolo (hasta 60% de descuento en fees), permite participar en la gobernanza del protocolo, y tiene un mecanismo deflacionario por burn en transacciones. Su utilidad es funcional en el protocolo.

**¿Es legal en España / UE?**  
El protocolo está diseñado con el marco MiCA (Reglamento UE 2023/1114) como referencia. Sin embargo, no ofrecemos asesoramiento legal. La clasificación regulatoria de cualquier participación específica depende de las circunstancias concretas y debe ser evaluada por un asesor legal independiente.

**¿Participar en Bashood es una inversión?**  
No. Participar en Bashood implica utilizar un protocolo tecnológico. Ninguna acción dentro del protocolo garantiza ni promete rendimientos, beneficios financieros ni participación en resultados económicos derivados de activos físicos o del propio protocolo.

**¿Puedo verificar los activos yo mismo?**  
Sí. Los 5 activos piloto están en Base Sepolia (tokens #202–#206) y son verificables en BaseScan sin crear ninguna cuenta. El código es completamente open-source.

**¿Quién actualiza el valor de los activos?**  
El `OracleValuationModule`, que es el único contrato autorizado a actualizar el valor (`currentValue`) de cualquier activo registrado. Lee el precio desde un feed Chainlink verificable. Los administradores humanos no pueden modificar el valor directamente en producción.

---

---

> **Aviso final:** Nada en este documento debe interpretarse como oferta de inversión, promesa de rendimiento o participación en beneficios derivados de activos físicos o del propio protocolo.

*Para documentación técnica completa, ver [WHITEPAPER.md](WHITEPAPER.md) y [BASHOOD-RWA-1-SPECIFICATION.md](BASHOOD-RWA-1-SPECIFICATION.md).*  
*Código fuente: repositorio oficial del protocolo (open-source).*  
*Bashood Technologies SL — 2 de marzo de 2026*
