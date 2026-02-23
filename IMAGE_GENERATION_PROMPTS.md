# Prompts para Generación de Imágenes NFT - Bashood Industrial Collection

## Estilo General (aplicar a todos)

```
Professional industrial photography, high-end product shot, clean background, 
soft studio lighting, photorealistic, 8k resolution, sharp focus, 
no text, no logos, no watermarks, no brand names visible
```

---

## Token 202: Modular Construction Robot

### Prompt Completo

```
A large modular construction robot with metallic silver and industrial orange accents, 
gantry-style framework with linear rails, robotic arms with precision nozzles, 
mounted on a concrete platform, modern construction site background slightly blurred, 
professional industrial photography, clean composition, studio lighting, 
photorealistic render, 8k, sharp focus, no text, no logos, isometric 3/4 view, 
cinematic quality, industrial blue sky background
```

### Características Visuales Clave
- Estructura modular visible (12×18×9m aproximado)
- Rails lineales tipo gantry
- Color: Plateado/gris metálico con detalles naranja industrial
- Perspectiva: 3/4 isométrica mostrando profundidad
- Fondo: Sitio construcción difuminado o cielo industrial

### Alternativa Midjourney

```
modular construction gantry robot, metallic silver frame, orange industrial details, 
linear rail system, robotic precision arms, concrete base, construction site background, 
professional product photography, studio lighting, photorealistic, 8k, --ar 1:1 --v 6
```

---

## Token 203: High-Capacity Gantry Printer HG-3000

### Prompt Completo

```
A massive industrial 3D printer with large gantry frame structure, 
extrusion head suspended by precision rails, industrial blue and white color scheme, 
heavy-duty steel construction, partially completed concrete structure visible below, 
professional industrial photography, dramatic lighting from above, 
photorealistic, 8k resolution, sharp focus, no text, no logos, 
side angle showing full height, clean industrial background
```

### Características Visuales Clave
- Gantry masivo (11.5m × 11.5m footprint)
- Cabezal de extrusión visible
- Color: Azul industrial + blanco/gris
- Estructura de acero robusta
- Altura visible (4.2m)
- Muestra capacidad de alto volumen

### Alternativa Midjourney

```
large format 3D construction printer, massive gantry frame, blue industrial color, 
extrusion system, steel structure, concrete printing in progress, 
professional photography, dramatic industrial lighting, photorealistic, 8k, --ar 1:1 --v 6
```

---

## Token 204: Mobile Robotic Arm Portable MRA-500

### Prompt Completo

```
A compact mobile robotic arm on wheeled base, articulated 6-axis arm design, 
sleek modern industrial design, yellow and black safety colors, 
portable construction 3D printer, fits on truck bed visible in background, 
professional product photography, soft even lighting, photorealistic, 8k, 
sharp focus, no text, no logos, 3/4 front view, studio environment with subtle shadows
```

### Características Visuales Clave
- Diseño compacto y portátil
- Brazo articulado (6 ejes visible)
- Color: Amarillo advertencia + negro
- Base con ruedas/movilidad evidente
- Tamaño: Claramente transportable (4.2m × 1.6m)
- Cabezal de impresión en extremo del brazo

### Alternativa Midjourney

```
compact mobile robotic arm, 6-axis articulated design, yellow and black colors, 
wheeled portable base, construction printer head, truck-transportable size, 
professional product shot, studio lighting, photorealistic, 8k, --ar 1:1 --v 6
```

---

## Token 205: Track-Mounted Fast-Cure System TM-2400

### Prompt Completo

```
A track-based mobile construction printer, industrial green and grey colors, 
tank-like tracked base for rough terrain, compact vertical printing system, 
fast-cure nozzle assembly, weatherproof industrial design, 
outdoor construction environment slightly blurred, professional photography, 
natural daylight, photorealistic, 8k resolution, sharp focus, no text, no logos, 
side profile showing track system clearly, rugged industrial aesthetic
```

### Características Visuales Clave
- Orugas tipo tanque (track system)
- Color: Verde industrial + gris
- Diseño robusto para terreno irregular
- Sistema de impresión vertical compacto
- Tamaño medio (3.8m × 1.9m)
- Aspecto resistente/weatherproof

### Alternativa Midjourney

```
track-mounted construction printer, industrial green color, tank-like tracks, 
compact vertical printing system, rugged weatherproof design, 
outdoor construction site, professional photography, natural light, photorealistic, 
8k, --ar 1:1 --v 6
```

---

## Token 206: Modular Panel Production Unit MPU-8000

### Prompt Completo

```
A large-scale modular factory installation with UV curing lights visible, 
white and tech blue color scheme, clean room aesthetic, multiple printing stations, 
panel production line visible, modern sustainable manufacturing facility, 
professional industrial photography, bright clean lighting, photorealistic, 
8k resolution, sharp focus, no text, no logos, aerial 45-degree angle, 
futuristic industrial environment, solar panels on roof visible
```

### Características Visuales Clave
- Instalación de fábrica completa (30m × 20m)
- Color: Blanco limpio + azul tecnológico
- Luces UV visibles (moradas/azules)
- Línea de producción modular
- Estética limpia/sostenible
- Paneles en proceso de fabricación

### Alternativa Midjourney

```
modular factory production line, UV curing lights, white and tech blue colors, 
clean room manufacturing, panel production stations, sustainable facility design, 
solar roof, professional aerial photography, bright lighting, photorealistic, 
8k, --ar 1:1 --v 6
```

---

## Configuración Recomendada por Herramienta

### **Midjourney:**
- Aspect ratio: `--ar 1:1` (NFT standard)
- Version: `--v 6` (latest)
- Quality: `--q 2` (high quality)
- Style: `--style raw` (más fotorealista)

Ejemplo comando completo:
```
/imagine modular construction gantry robot, metallic silver frame, 
orange industrial details, linear rail system, robotic precision arms, 
concrete base, professional product photography, studio lighting, 
photorealistic, 8k --ar 1:1 --v 6 --q 2 --style raw
```

### **DALL-E 3:**
- Usar prompts completos directamente
- Pedir explícitamente: "no text, no watermarks, no logos"
- Resolución: 1024×1024 (cuadrado para NFT)

### **Stable Diffusion:**
- Model: SDXL o Realistic Vision
- Negative prompt: `text, watermark, logo, brand name, signature, blurry, low quality`
- Steps: 30-50
- CFG Scale: 7-9
- Sampler: DPM++ 2M Karras

### **Leonardo.ai:**
- Preset: "Photoreal"
- Dimensions: 1024×1024
- Prompt magic strength: High
- Agregar negative prompt

---

## Checklist Post-Generación

Antes de subir a IPFS, verificar cada imagen:

- [ ] ✅ Sin texto visible
- [ ] ✅ Sin logos o marcas
- [ ] ✅ Sin watermarks
- [ ] ✅ Resolución mínima 1024×1024
- [ ] ✅ Formato: PNG o JPG
- [ ] ✅ Peso: < 2MB (optimizar si es mayor)
- [ ] ✅ Estilo coherente con colección
- [ ] ✅ Representa características técnicas del activo

---

## Paleta de Colores Recomendada (Coherencia Visual)

| Token | Color Primario | Color Secundario | Estética |
|-------|---------------|------------------|----------|
| 202   | Plateado metálico | Naranja industrial | Modular/robusto |
| 203   | Azul industrial | Blanco/gris | Masivo/potente |
| 204   | Amarillo advertencia | Negro | Compacto/móvil |
| 205   | Verde industrial | Gris oscuro | Rugoso/todoterreno |
| 206   | Blanco limpio | Azul tech | Limpio/futurista |

---

## Notas Finales

**Importante:** 
- Todas las imágenes deben ser **originales generadas por IA** (no fotos de productos reales)
- Esto garantiza **licencia completa** sin restricciones
- Evitar cualquier similitud con productos comerciales existentes
- Mantener estética **profesional industrial** pero claramente **ficticia**

**Licencia de las imágenes generadas:**
- Midjourney: Uso comercial permitido con plan paid
- DALL-E 3: Propiedad completa del usuario
- Stable Diffusion: Dominio público (CC0)
- Leonardo.ai: Uso comercial con plan paid

Recomendación: Usar **Stable Diffusion (CC0)** para máxima libertad legal.
