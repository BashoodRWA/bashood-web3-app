# 📄 Documentación Doosan DX360 - Archivos HTML para PDF

## 🎯 Propósito

Esta carpeta contiene los 5 documentos principales del piloto Doosan DX360 en formato HTML, listos para convertir a PDF desde tu navegador.

## 📁 Archivos Disponibles

1. **00_INDICE_MAESTRO.html** (22 KB)
   - Índice general del proyecto
   - Workflow recomendado
   - Lista de datos faltantes

2. **01_PROPUESTA_TOKENIZACION.html** (25 KB)
   - Documento comercial principal
   - Explicaciones simples para el propietario
   - Modelo financiero 60/40
   - FAQ completo
   - ✅ **ENVIAR AL PROPIETARIO** después de la llamada

3. **02_DUE_DILIGENCE_CHECKLIST.html** (34 KB)
   - 46 preguntas específicas (P1-P46)
   - Sistema de puntuación (max 100 puntos)
   - Red flags (criterios de rechazo)
   - ✅ **IMPRIMIR Y LLEVAR A LA LLAMADA**

4. **03_GUION_LLAMADA.html** (29 KB)
   - Script estructurado 7 fases (90 minutos)
   - Preguntas técnicas, financieras, legales
   - Templates de respuesta según scoring
   - ⚠️ **SOLO USO INTERNO** (NO enviar al propietario)

5. **04_TERMINOS_CONTRACTUALES_BORRADOR.html** (31 KB)
   - Borrador contrato tokenización
   - 9 secciones (partes, derechos, económico, blockchain, legal)
   - ⚠️ **Requiere revisión legal profesional**
   - ⚠️ **Enviar solo tras aprobación inicial**

6. **index.html** (8 KB)
   - Página índice con enlaces a todos los documentos
   - Instrucciones de conversión a PDF

## 🖨️ Cómo Convertir a PDF

### Método 1: Manual (Recomendado - Mejor Calidad)

1. **Abrir archivo HTML:**
   - Doble clic en `index.html` (se abre en navegador)
   - O ejecutar: `ABRIR_TODOS.bat` (abre todos de una vez)

2. **Imprimir a PDF:**
   - Presionar `Ctrl+P` (Windows/Linux) o `Cmd+P` (Mac)
   - En "Destino" seleccionar: **"Guardar como PDF"**
   - Ajustar configuración:
     - Márgenes: Predeterminados
     - Escala: 100%
     - Fondo de gráficos: ✅ Activado (importante para ver colores)
   - Clic en "Guardar"
   - Guardar con el mismo nombre del archivo HTML

3. **Repetir para cada documento necesario**

### Método 2: Script Batch (Windows)

```bash
# Ejecutar desde esta carpeta:
ABRIR_TODOS.bat
```

Esto abrirá todos los documentos en ventanas separadas del navegador. Luego presiona `Ctrl+P` en cada una.

## 🎨 Navegadores Recomendados

- ✅ **Chrome/Edge (Chromium):** Mejor calidad, renderizado perfecto
- ✅ **Firefox:** Buena calidad, alternativa válida
- ⚠️ **Safari:** Aceptable, puede tener problemas con algunos estilos
- ❌ **Internet Explorer:** NO soportado

## 📋 Guía de Uso por Documento

### Antes de la Llamada con el Propietario

1. **IMPRIMIR:**
   - `02_DUE_DILIGENCE_CHECKLIST.pdf` → Llevar impreso a la llamada
   - `03_GUION_LLAMADA.pdf` → Tener abierto en laptop durante llamada

2. **REVISAR:**
   - Leer completamente el guion de llamada (40 páginas)
   - Familiarizarse con las 46 preguntas
   - Practicar explicación tokenización (30 segundos)

### Durante la Llamada (90 minutos)

1. **SEGUIR:** Guion fase por fase (no improvisar)
2. **ANOTAR:** Respuestas en checklist impreso
3. **CALCULAR:** Puntuación en tiempo real (max 100 puntos)
4. **DECIDIR:** 
   - ≥80 puntos → APROBAR (continuar due diligence)
   - 60-79 puntos → CONDICIONAL (resolver vacíos)
   - <60 puntos → RECHAZAR (explicar honestamente)

### Después de la Llamada (24 horas)

1. **ENVIAR EMAIL:**
   - NDA (pedir firma)
   - `01_PROPUESTA_TOKENIZACION.pdf` (documento comercial)
   - Lista documentación requerida (de checklist)
   - Plazo: 7 días para recibir documentación

2. **SI SCORING ≥80 PUNTOS:**
   - Incluir también `04_TERMINOS_CONTRACTUALES_BORRADOR.pdf`
   - Indicar que es borrador sujeto a revisión legal
   - Solicitar feedback del propietario

## 📊 Sistema de Puntuación (Due Diligence)

| Puntos | Decisión | Acción |
|--------|----------|--------|
| **80-100** | ✅ APROBAR | Continuar con due diligence completa, solicitar documentación, iniciar legal |
| **60-79** | 🟡 CONDICIONAL | Identificar vacíos específicos, dar plazo resolución (7-14 días), re-evaluar |
| **<60** | ❌ RECHAZAR | Explicar razones honestamente, no proceder, agradecer tiempo |

### Distribución Puntos (Total 100):

- **Ingresos verificables (30):** ≥€15k/mes = 30, €12-15k = 20, <€12k = 0
- **Estado activo (20):** Excelente 8+/10 = 20, Bueno 6-8/10 = 15, Malo <6/10 = 0
- **Documentación (15):** 100% = 15, 80% = 10, <80% = 0
- **Propietario confiable (15):** Transparente = 15, Parcial = 8, No = 0
- **Legal limpio (10):** Sin problemas = 10, Dudas = 5, Problemas = 0
- **Historial operativo (10):** >1 año = 10, 6-12 meses = 7, <6 meses = 3

## 🔴 Red Flags (Rechazo Inmediato)

Si detectas CUALQUIERA de estos, puntuar automáticamente <60 (rechazar):

1. ❌ Propietario NO es dueño legal (alquilado, leasing, embargo)
2. ❌ Activo inoperativo >6 meses sin mantenimiento
3. ❌ Deudas/embargos pendientes sobre el activo
4. ❌ Ingresos NO verificables (sin facturas, sin clientes, "efectivo")
5. ❌ Propietario rechaza transparencia (no quiere mostrar documentación)
6. ❌ Daños estructurales graves (motor fundido, chasis roto, >€50k reparación)
7. ❌ Odómetro adulterado o no funcional
8. ❌ Sin seguro vigente o sin renovación próxima
9. ❌ Operador sin certificación (ilegal operar)
10. ❌ Expectativas irreales (pide €200k por activo de €150k)

## 📋 Datos Críticos Faltantes (Solicitar en Llamada)

### CRÍTICOS (sin estos NO proceder):
- [ ] Año fabricación
- [ ] Número serie / bastidor (VIN)
- [ ] Horas operativas (horómetro actual)
- [ ] Facturas ingresos últimos 6 meses
- [ ] Factura compra original
- [ ] Póliza seguro vigente (PDF completo)
- [ ] Certificado libre cargas/embargos (Registro Bienes Muebles)

### IMPORTANTES (afectan decisión):
- [ ] Consumo combustible real (facturas gasoil 6 meses)
- [ ] Historial mantenimiento (facturas taller 2 años)
- [ ] Fotos detalladas (20+ ángulos: motor, hydraulics, cabina, chasis, bucket, neumáticos)
- [ ] Contratos clientes vigentes/futuros (3-6 meses)
- [ ] Situación fiscal propietario (al corriente con Hacienda)

### DESEABLES (mejoran análisis):
- [ ] Tasación profesional externa (<1 año)
- [ ] Análisis aceite motor (indica desgaste interno)
- [ ] Historial horómetro mensual (Excel 12 meses)
- [ ] Certificado operador maquinaria (licencia vigente)

## 🗓️ Próximos Pasos

1. ✅ **HOY:** Revisar todos los documentos HTML/PDF
2. ✅ **MAÑANA:** Investigar propietario (LinkedIn, empresa, Google)
3. ⏳ **2-3 DÍAS:** Programar llamada (90 minutos, video preferible)
4. ⏳ **DURANTE LLAMADA:** Ejecutar guion fases 1-7, scoring
5. ⏳ **POST-LLAMADA (24h):** Enviar email con propuesta + NDA
6. ⏳ **7-14 DÍAS:** Recibir documentación del propietario
7. ⏳ **14 DÍAS POST-LLAMADA:** Decisión final (aprobar/condicional/rechazar)

**Si APROBADO (≥80 puntos):**
- Contratar abogado blockchain + comercial (€2-15k según estructura)
- Elegir estructura legal:
  - OPTION A: Contrato directo (€2k, más rápido, menos profesional)
  - OPTION B: SPV España/Malta (€15k, más lento, más profesional) ← RECOMENDADO
- Piloto testnet (1 mes, Base Sepolia)
- Deploy mainnet (si piloto exitoso)

## 📞 Contacto

**Proyecto:** Bashood RVA  
**Website:** https://bashood.io  
**Email:** contacto@bashood.io  
**Blockchain:** Base (Ethereum L2)

---

**Preparado:** Diciembre 2024  
**Versión:** 1.0  
**Confidencialidad:** ⚠️ Estos documentos contienen información privilegiada del proyecto. NO compartir públicamente.

## ⚠️ Disclaimer Legal

El documento `04_TERMINOS_CONTRACTUALES_BORRADOR.html` es un **BORRADOR** para negociación. **NO tiene validez legal** sin revisión por abogado profesional especializado en:
- Derecho mercantil
- Blockchain y criptoactivos
- Contratación internacional (si aplica)

**Costo legal estimado:** €2,000-€5,000 (directo) o €10,000-€15,000 (SPV)

---

✅ **Documentación completada y lista para negociación**
