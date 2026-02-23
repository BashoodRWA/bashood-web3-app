# Guía: Subir Imágenes NFT a IPFS (Pinata.cloud)

**Fecha:** 27 enero 2026  
**Objetivo:** Subir 5 imágenes RWA-202 a RWA-206 y obtener CIDs para metadata JSON  
**Plataforma:** Pinata.cloud (gratis, 1GB storage)

---

## Paso 1: Crear Cuenta Pinata.cloud (5 minutos)

### 1.1 Registro
1. Ir a: https://pinata.cloud
2. Click en "Sign Up" (esquina superior derecha)
3. Completar formulario:
   - Email: bashoodtoken@gmail.com (o tu email preferido)
   - Password: [crear contraseña segura]
   - Confirmar email (revisar inbox)

### 1.2 Verificación
- Pinata enviará email de confirmación
- Click en link de verificación
- Login a dashboard

**Plan recomendado:** Free tier (1GB, suficiente para 5 imágenes)

---

## Paso 2: Preparar Imágenes (3 minutos)

### 2.1 Crear Carpeta Local
```powershell
# Ejecutar en terminal PowerShell:
cd C:\Users\Franchu\Desktop\bashood-hardhat-tests
New-Item -ItemType Directory -Path ".\metadata\images" -Force
```

### 2.2 Mover/Renombrar Imágenes
Copiar las 5 imágenes generadas a `metadata\images\` con estos nombres:

```
metadata/images/
├── 202-rwa-orange.png    (Modular Construction Robot - gradiente naranja)
├── 203-rwa-blue.png      (High-Capacity Gantry Printer - gradiente azul)
├── 204-rwa-yellow.png    (Mobile Robotic Arm - gradiente amarillo-verde)
├── 205-rwa-green.png     (Track-Mounted System - gradiente verde)
└── 206-rwa-purple.png    (Modular Panel Factory - gradiente morado)
```

**IMPORTANTE:** 
- Formato: PNG (preferible) o JPG
- Tamaño ideal: 1024×1024 a 2048×2048 px
- Peso máximo: <2MB por imagen

### 2.3 Verificar Imágenes
```powershell
# Listar imágenes y tamaños:
Get-ChildItem .\metadata\images\ | Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}
```

**Output esperado:**
```
Name                  Size(KB)
----                  --------
202-rwa-orange.png    450.23
203-rwa-blue.png      478.91
204-rwa-yellow.png    442.67
205-rwa-green.png     455.12
206-rwa-purple.png    461.88
```

---

## Paso 3: Upload a IPFS (10 minutos)

### 3.1 Acceder a Pinata Dashboard
1. Login: https://app.pinata.cloud
2. Ir a "Files" (menú lateral izquierdo)
3. Click en "+ Upload" (botón superior derecho)
4. Seleccionar "File" (no "Folder")

### 3.2 Upload Imagen por Imagen

**OPCIÓN A: Upload Individual (recomendado para control)**

**Imagen 1: Token 202 (Modular Construction Robot)**
1. Upload: `202-rwa-orange.png`
2. Name: `bashood-rwa-202-modular-robot`
3. Click "Upload"
4. **COPIAR CID inmediatamente** (aparece en columna "CID")
   - Formato: `QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - Ejemplo: `QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`
5. Guardar CID en notepad/archivo temporal

**Repetir para imágenes 203-206:**

| Token | Archivo | Pinata Name | CID (copiar aquí) |
|-------|---------|-------------|-------------------|
| 202 | 202-rwa-orange.png | bashood-rwa-202-modular-robot | __________________ |
| 203 | 203-rwa-blue.png | bashood-rwa-203-gantry-printer | __________________ |
| 204 | 204-rwa-yellow.png | bashood-rwa-204-mobile-arm | __________________ |
| 205 | 205-rwa-green.png | bashood-rwa-205-track-system | __________________ |
| 206 | 206-rwa-purple.png | bashood-rwa-206-panel-factory | __________________ |

### 3.3 Verificar Upload Exitoso
En Pinata dashboard, cada imagen debe mostrar:
- ✅ Status: "Pinned"
- ✅ CID: `QmXXXX...` (44 caracteres)
- ✅ Size: ~450-500 KB
- ✅ Created: Today's date

### 3.4 Test de Acceso IPFS
Para cada CID, verificar acceso público:

**Gateway URL:**
```
https://gateway.pinata.cloud/ipfs/{CID}
```

**Ejemplo:**
```
https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

Abrir en navegador → debe mostrar la imagen ✅

---

## Paso 4: Guardar CIDs (2 minutos)

### 4.1 Crear Archivo de Registro
```powershell
# Crear archivo con CIDs
@"
# IPFS CIDs - Bashood RWA NFTs
# Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm")
# Gateway: https://gateway.pinata.cloud/ipfs/

Token 202 (Modular Robot - Orange):
CID: PEGAR_AQUÍ
URL: https://gateway.pinata.cloud/ipfs/PEGAR_AQUÍ

Token 203 (Gantry Printer - Blue):
CID: PEGAR_AQUÍ
URL: https://gateway.pinata.cloud/ipfs/PEGAR_AQUÍ

Token 204 (Mobile Arm - Yellow):
CID: PEGAR_AQUÍ
URL: https://gateway.pinata.cloud/ipfs/PEGAR_AQUÍ

Token 205 (Track System - Green):
CID: PEGAR_AQUÍ
URL: https://gateway.pinata.cloud/ipfs/PEGAR_AQUÍ

Token 206 (Panel Factory - Purple):
CID: PEGAR_AQUÍ
URL: https://gateway.pinata.cloud/ipfs/PEGAR_AQUÍ
"@ | Out-File -FilePath ".\IPFS_CIDS.txt" -Encoding UTF8

notepad .\IPFS_CIDS.txt
```

### 4.2 Completar Archivo
- Pegar cada CID copiado de Pinata
- Completar URLs (reemplazar "PEGAR_AQUÍ")
- Guardar archivo

---

## Paso 5: Actualizar Metadata JSON (automático)

**Una vez tengas los 5 CIDs, avísame y ejecutaré:**

```javascript
// Script automático para actualizar metadata
const fs = require('fs');

const cids = {
  202: "QmXXXXX...", // Pegar CID real
  203: "QmYYYYY...", // Pegar CID real
  204: "QmZZZZZ...", // Pegar CID real
  205: "QmAAAAA...", // Pegar CID real
  206: "QmBBBBB..."  // Pegar CID real
};

// Actualizar cada JSON
for (const [token, cid] of Object.entries(cids)) {
  const filePath = `./metadata/industrial-collection/${token}.json`;
  const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  metadata.image = `ipfs://${cid}`;
  
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  console.log(`✅ Token ${token}: ipfs://${cid}`);
}
```

---

## Troubleshooting

### Problema 1: "Upload Failed"
**Causas:**
- Imagen >10MB (reducir tamaño)
- Conexión interrumpida (reintentar)
- Límite free tier (verificar quota)

**Solución:**
```powershell
# Reducir tamaño si necesario:
# Install-Module -Name ImageResize (si no instalado)
# Resize-Image -InputPath ".\metadata\images\202-rwa-orange.png" -Width 1024 -Height 1024
```

### Problema 2: CID No Aparece
**Solución:**
- Refrescar página Pinata
- Ir a "Files" → buscar por nombre
- CID está en columna "CID" (no "Hash")

### Problema 3: Imagen No Se Ve en Gateway
**Causas:**
- Propagación IPFS (esperar 1-2 minutos)
- Gateway saturado (probar alternativo)

**Gateways alternativos:**
```
https://ipfs.io/ipfs/{CID}
https://cloudflare-ipfs.com/ipfs/{CID}
https://gateway.pinata.cloud/ipfs/{CID}
```

---

## Checklist Final

Antes de continuar, verificar:

- [ ] 5 imágenes subidas a Pinata
- [ ] 5 CIDs copiados (formato `QmXXXX...`)
- [ ] Archivo IPFS_CIDS.txt completado
- [ ] Testear 5 URLs en navegador (todas funcionan)
- [ ] Imágenes visibles públicamente
- [ ] CIDs guardados en lugar seguro

**Cuando tengas los 5 CIDs, pégalos en el chat y continuaré automáticamente con:**
1. Actualizar metadata JSON
2. Configurar hardhat.config.js (Base Sepolia)
3. Deploy BashoodRWAReference.sol
4. Mintear 5 NFTs

---

## Recursos Adicionales

**Pinata Documentation:**
- https://docs.pinata.cloud/quickstart

**IPFS Basics:**
- https://docs.ipfs.tech/concepts/what-is-ipfs/

**NFT Metadata Standard:**
- https://docs.opensea.io/docs/metadata-standards

---

**PRÓXIMO PASO:** Ejecutar Paso 1 (crear cuenta Pinata) y avisarme cuando tengas los 5 CIDs.
