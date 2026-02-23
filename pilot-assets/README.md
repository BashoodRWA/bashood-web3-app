# 📁 Documentación Piloto Doosan DX360 - Índice Maestro

**Fecha creación:** 20 Febrero 2026  
**Proyecto:** Bashood RWA - Activo Piloto  
**Status:** Fase preparación negociación

---

## 📊 Resumen Ejecutivo

Se ha preparado documentación completa para negociar tokenización de excavadora Doosan DX360 como activo piloto del proyecto Bashood RWA.

**Objetivo:** Validar modelo tokenización RWA con activo industrial real antes de escalar a múltiples activos.

**Enfoque:** Profesional, transparente, basado en datos reales (no especulación).

---

## 📄 Documentos Creados

### 1. [doosan-dx360-config.json](doosan-dx360-config.json)
**Tipo:** Configuración técnica (JSON)  
**Contenido:**
- Especificaciones técnicas completas
- Datos operativos (horas, consumo, producción)
- Estructura costes detallada
- Escenarios ingresos (bajo/medio/alto)
- Parámetros tokenización (40%)
- Objetivos validación

**Uso:** Base de datos técnica para simulaciones y contratos.

---

### 2. [scripts/simulate-doosan-dx360.cjs](../scripts/simulate-doosan-dx360.cjs)
**Tipo:** Script simulación financiera (Node.js)  
**Contenido:**
- Simulación 12 meses operación
- 3 escenarios: bajo/medio/alto
- Cálculo ROI holders
- Distribución 60/40 (propietario/holders)
- Análisis breakeven
- Evaluación riesgo

**Ejecución:**
```bash
node scripts/simulate-doosan-dx360.cjs
```

**Resultados clave:**
- Escenario MEDIO (€12k/mes): ROI 17% → VIABLE
- Escenario ALTO (€15k/mes): ROI 41% → ÓPTIMO
- Escenario BAJO (€8k/mes): Pérdida → NO VIABLE

---

### 3. [DUE_DILIGENCE_CHECKLIST.md](DUE_DILIGENCE_CHECKLIST.md) ⭐
**Tipo:** Checklist exhaustivo  
**Longitud:** 45 páginas  
**Contenido:**

#### Secciones principales:
1. **Datos del Activo (Técnicos)**
   - Identificación (modelo, año, serie)
   - Especificaciones técnicas
   - Condición física (horas, estado, averías)
   - Combustible (consumo, precio)

2. **Datos Financieros**
   - Valoración activo
   - Historial operativo ingresos (6 meses)
   - Estructura costes reales
   - Breakeven analysis

3. **Documentación Legal**
   - Propiedad y titularidad
   - Situación fiscal propietario
   - Licencias y autorizaciones
   - Seguros

4. **Datos del Propietario**
   - Información contacto
   - Motivación y expectativas

5. **Análisis Viabilidad**
   - Checklist mínima aprobar (10 items)
   - Red flags rechazo inmediato
   - Scoring final (max 100 puntos)

6. **Guión Llamada Inicial**
   - Estructura 60-90 min
   - Preguntas específicas por sección
   - Plantillas respuestas

**Uso crítico:** 
- Llevar IMPRESO en llamada con propietario
- Ir marcando respuestas en tiempo real
- NO proceder si <80 puntos scoring

---

### 4. [PROPUESTA_TOKENIZACION.md](PROPUESTA_TOKENIZACION.md) ⭐
**Tipo:** Documento comercial para propietario  
**Longitud:** 30 páginas  
**Contenido:**

#### Secciones:
1. **Resumen Ejecutivo**
   - Qué es tokenización RWA (analogías simples)
   - Beneficios para propietario
   - Qué cambia vs qué NO cambia

2. **Modelo Financiero Propuesto**
   - Valoración activo (€150k)
   - Tokenización 40%
   - Distribución beneficios 60/40
   - Simulación 3 escenarios

3. **Estructura Legal y Seguridad**
   - OPCIÓN A: Propiedad directa (simple)
   - OPCIÓN B: SPV (profesional)
   - Garantías mutuas
   - Protecciones legales

4. **Transparencia y Reporting**
   - Reportes mensuales (10 min/mes)
   - Datos requeridos
   - Publicación on-chain

5. **Timeline Propuesto**
   - Fase 1: Due diligence (2-3 semanas)
   - Fase 2: Estructura legal (3-4 semanas)
   - Fase 3: Piloto testnet (1 mes)
   - Fase 4: Mainnet (si exitoso)

6. **Beneficios Inmediatos**
   - Liquidez sin venta (€60k)
   - Reducción riesgo concentrado
   - Valorización potencial
   - Marca y credibilidad

7. **FAQ (14 preguntas)**
   - ¿Pierdo control? NO
   - ¿Qué pasa si avería? Protocolo
   - ¿Puedo deshacer? SÍ (condiciones)
   - ¿Es legal España? SÍ (MiCA)
   - Etc.

**Uso:** 
- Enviar por email POST-llamada
- Acompañar con simulación financiera
- Base educación propietario

---

### 5. [GUION_LLAMADA.md](GUION_LLAMADA.md) ⭐⭐⭐
**Tipo:** Guion detallado llamada  
**Longitud:** 40 páginas  
**Contenido:**

#### Estructura llamada (90 minutos):

**FASE 0: Pre-Llamada (Preparación)**
- Checklist antes de llamar
- Investigación previa propietario

**FASE 1: Introducción (10 min)**
- Saludo y contexto
- Explicación rápida tokenización (30 seg)
- Estructura llamada

**FASE 2: Validación Técnica (20 min)**
- 15 preguntas específicas:
  * P1-P5: Identificación activo
  * P6-P10: Estado operativo
  * P11-P15: Estado técnico
  * P16-P19: Combustible

**FASE 3: Validación Financiera (25 min)**
- 20 preguntas específicas:
  * P20-P25: Ingresos históricos
  * P26-P28: Estructura costes
  * Cálculo rentabilidad en vivo

**FASE 4: Documentación Legal (10 min)**
- 11 preguntas específicas:
  * P29-P31: Propiedad
  * P32-P35: Seguros y permisos
  * P36-P38: Situación fiscal

**FASE 5: Expectativas (10 min)**
- 8 preguntas específicas:
  * P39-P42: Motivación
  * P43-P46: Comprensión modelo

**FASE 6: Simulación Financiera (10 min)**
- Mostrar números reales
- Tabla con distribución

**FASE 7: Próximos Pasos (10 min)**
- Decisión: APROBAR / CONDICIONAL / RECHAZAR
- Templates comunicación según decisión
- Documentación enviar post-llamada

**Extras:**
- Scorecard viabilidad (100 puntos)
- Red flags checklist
- Plantilla notas durante llamada

**Uso crítico:**
- Seguir PASO A PASO durante llamada
- Ir anotando respuestas (numeradas P1-P46)
- NO improvisar (guion probado)

---

### 6. [TERMINOS_CONTRACTUALES_BORRADOR.md](TERMINOS_CONTRACTUALES_BORRADOR.md)
**Tipo:** Borrador contrato  
**Longitud:** 35 páginas  
**⚠️ ADVERTENCIA:** NO vinculante, requiere revisión legal profesional

#### Secciones:

1. **Partes Contractuales**
   - PROPIETARIO
   - TOKENIZADOR (Bashood)
   - HOLDERS (inversionistas)

2. **Objeto del Contrato**
   - Activo a tokenizar (identificación)
   - Porcentaje tokenizado (40%)
   - Tokens emitidos (100k BHT-DX360)

3. **Derechos y Obligaciones**
   - Derechos PROPIETARIO (5 categorías)
   - Obligaciones PROPIETARIO (5 categorías)
   - Derechos HOLDERS (4 categorías)
   - Obligaciones HOLDERS (3 categorías)
   - Responsabilidades TOKENIZADOR (3 categorías)

4. **Distribución Económica**
   - Modelo distribución mensual
   - Costes deducibles (✅ permitidos / ❌ prohibidos)
   - Fondo reserva obligatorio (€5k)

5. **Condiciones Especiales**
   - Duración contrato (3 años + renovación)
   - Derecho preferente compra
   - Transferencia activo físico
   - Siniestro total / pérdida activo
   - Incumplimiento contrato

6. **Aspectos Técnicos Blockchain**
   - Smart contracts
   - Treasury fee (0.5%)
   - Burn mechanism (0.1%)

7. **Regulación y Compliance**
   - Clasificación token (utility)
   - KYC/AML
   - Fiscal

8. **Resolución Disputas**
   - Mediación
   - Arbitraje
   - Rescisión fuerza mayor

**Uso:** 
- Base negociación términos finales
- Enviar a abogado para redacción legal
- NO firmar sin revisión profesional

---

### 7. [doosan-dx360-simulation-results.json](doosan-dx360-simulation-results.json)
**Tipo:** Resultados simulación (JSON)  
**Contenido:**
- 3 escenarios completos
- 12 meses detallados por escenario
- ROI, yields, distribuciones
- Configuración usada

**Uso:** Adjuntar en email propietario (datos técnicos).

---

## 🎯 Flujo de Trabajo Recomendado

### Antes de la Llamada (2-3 días):

1. ✅ **Investigar propietario**
   - LinkedIn, web empresa
   - Google nombre + "excavadora" / "construcción"
   - Identificar tipo negocio

2. ✅ **Preparar materiales**
   - Imprimir DUE_DILIGENCE_CHECKLIST.md
   - Tener GUION_LLAMADA.md abierto
   - Preparar simulador Excel (opcional)

3. ✅ **Revisar documentos**
   - Leer PROPUESTA_TOKENIZACION.md completo
   - Memorizar FAQ principales
   - Practicar explicación tokenización (30 seg)

---

### Durante la Llamada (90 min):

1. ✅ **Seguir GUION_LLAMADA.md** (fases 1-7)
2. ✅ **Anotar respuestas P1-P46** en checklist
3. ✅ **Calcular scoring final** (sección 7)
4. ✅ **Decidir:** APROBAR / CONDICIONAL / RECHAZAR

---

### Post-Llamada (24 horas):

1. ✅ **Enviar email resumen** con:
   - Puntos clave discutidos
   - NDA para firma
   - PROPUESTA_TOKENIZACION.md (PDF)
   - DUE_DILIGENCE_CHECKLIST.md (lista docs)
   - doosan-dx360-simulation-results.json

2. ✅ **Deadline:** 7 días para envío documentación

3. ✅ **Programar reunión seguimiento:** 14 días

---

### Due Diligence (14 días):

1. ✅ **Recibir documentación**
   - Facturas 6 meses
   - Póliza seguro
   - Factura compra
   - Fotos activo
   - Otros (ver checklist 7.1)

2. ✅ **Validar scoring final** (≥80 aprobar)

3. ✅ **Decisión GO/NO-GO**

---

### Si APROBADO (30-60 días):

1. ✅ **Redacción contrato legal**
   - Base: TERMINOS_CONTRACTUALES_BORRADOR.md
   - Contratar abogado especializado
   - Negociar términos finales

2. ✅ **Estructura legal**
   - Setup SPV (si opción B)
   - O contrato directo (si opción A)

3. ✅ **Piloto testnet**
   - Deploy contratos testnet
   - Simular 1 mes operación real
   - Validar distribuciones

4. ✅ **Mainnet** (si exitoso)
   - Deploy contratos mainnet
   - Tokenización real
   - Primera distribución beneficios

---

## 📊 Datos Críticos que FALTAN

**Según due diligence checklist, necesitamos:**

### CRÍTICOS (sin estos NO proceder):
- [ ] Año fabricación excavadora
- [ ] Número serie / bastidor
- [ ] Horas operativas actuales (horómetro)
- [ ] Facturas ingresos últimos 6 meses
- [ ] Factura compra original
- [ ] Póliza seguro vigente
- [ ] Certificado libre cargas/embargos

### IMPORTANTES (afectan decisión):
- [ ] Consumo combustible real (facturas)
- [ ] Historial mantenimiento (facturas taller)
- [ ] Estado físico validado (inspección o fotos)
- [ ] Contratos clientes vigentes/futuros
- [ ] Costes reales vs estimados
- [ ] Situación fiscal propietario

### DESEABLES (mejoran análisis):
- [ ] Tasación profesional reciente
- [ ] Análisis aceite motor
- [ ] Historial horómetro mensual
- [ ] Certificado operador

---

## ✅ Checklist Pre-Negociación Completada

| Documento | Status | Uso |
|-----------|--------|-----|
| **Configuración técnica** | ✅ Creado | Base datos simulaciones |
| **Script simulación** | ✅ Creado + Ejecutado | Validar viabilidad financiera |
| **Due diligence checklist** | ✅ Creado | Recolectar datos llamada |
| **Propuesta tokenización** | ✅ Creado | Educar propietario |
| **Guion llamada** | ✅ Creado | Conducir negociación |
| **Términos contractuales** | ✅ Borrador | Base contrato legal |
| **Resultados simulación** | ✅ Generados | Adjuntar propuesta |

---

## 🎯 Próximos Pasos Inmediatos

### AHORA:
1. ✅ Revisar GUION_LLAMADA.md completo
2. ✅ Imprimir DUE_DILIGENCE_CHECKLIST.md
3. ✅ Practicar explicación tokenización (30 seg)

### ANTES DE LLAMAR:
4. ⏳ Investigar propietario (LinkedIn, web)
5. ⏳ Preparar simulador Excel (opcional)
6. ⏳ Revisar FAQ PROPUESTA_TOKENIZACION.md

### DURANTE LLAMADA:
7. ⏳ Seguir guion fase por fase
8. ⏳ Anotar respuestas P1-P46
9. ⏳ Calcular scoring final

### POST-LLAMADA:
10. ⏳ Enviar email con materiales
11. ⏳ Seguimiento recepción documentación
12. ⏳ Decisión final GO/NO-GO

---

## 📞 Información de Contacto

**Proyecto:** Bashood RWA  
**Email:** contacto@bashood.io  
**Documentación:** GitHub/IPFS (post-mainnet)

---

**Preparado por:** Bashood Team  
**Fecha:** 20 Febrero 2026  
**Versión:** 1.0  
**Status:** Listo para negociación
