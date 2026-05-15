# Metadata BashoodPresaleNFT — Instrucciones Pinata

## Archivos generados

| Archivo | Tier ID | Activo | Supply | Jurisdicción |
|---|---|---|---|---|
| `tier-1.json` | 1 | Excavadora Doosan DX360LC | 500 NFTs | ES |
| `tier-2.json` | 2 | Planta Solar 5MW | 100 NFTs | AE |
| `tier-3.json` | 3 | Impresora 3D EVOCONS EVOBLOCK | 200 NFTs | ES |

---

## Pasos antes de subir a Pinata

### 1. Sustituir imágenes (OBLIGATORIO)

En cada JSON hay un campo `"image"` con valor `"ipfs://PENDIENTE_SUSTITUIR_CON_CID_IMAGEN/..."`.

Debes:
1. Subir cada imagen a Pinata primero (PNG o WEBP, mínimo 400x400px recomendado 1000x1000px)
2. Copiar el CID que devuelve Pinata
3. Reemplazar en el JSON: `"ipfs://TU_CID_REAL/nombre-imagen.png"`

### 2. Añadir el legal_hash real (OBLIGATORIO para despliegue)

El campo `"legal_hash"` en el JSON es solo informativo/display.  
El hash que importa **on-chain** es el parámetro `legalDocHash` en `defineAsset()`.

Para obtenerlo:
```bash
# PowerShell — SHA-256 del documento PDF firmado
Get-FileHash -Algorithm SHA256 ".\documento-legal-tier-1.pdf" | Select-Object Hash
# Resultado: "A1B2C3..." → en Solidity: bytes32(0xA1B2C3...)
```

Actualiza el campo `"legal_hash"` en el JSON con el resultado (formato `"0x..."`)

---

## Subida a Pinata

### Opción A — Drag & Drop (más simple)
1. Ir a [https://app.pinata.cloud/pinmanager](https://app.pinata.cloud/pinmanager)
2. "+ Upload" → "Folder"
3. Subir esta carpeta `metadata/presale-nft/` entera
4. Pinata genera UN solo CID para la carpeta completa

El CID de la carpeta será la base URI. Los JSON quedarán en:
```
ipfs://<CID_CARPETA>/tier-1.json
ipfs://<CID_CARPETA>/tier-2.json
ipfs://<CID_CARPETA>/tier-3.json
```

### Opción B — Archivos individuales
Subir cada JSON por separado → cada uno tiene su propio CID.

---

## Integración en defineAsset()

Una vez tengas los CIDs, el script de despliegue llama:

```javascript
// Tier 1 — Excavadora
await nft.defineAsset(
  1,
  "Doosan DX360LC",
  "HEAVY_VEHICLE",
  "ES",
  500,
  "0xSHA256_DEL_DOCUMENTO_LEGAL_TIER1",
  "ipfs://<CID_CARPETA>/tier-1.json"
);

// Tier 2 — Planta Solar
await nft.defineAsset(
  2,
  "Planta Solar 5MW Abu Dhabi",
  "ENERGY_EQUIPMENT",
  "AE",
  100,
  "0xSHA256_DEL_DOCUMENTO_LEGAL_TIER2",
  "ipfs://<CID_CARPETA>/tier-2.json"
);

// Tier 3 — Impresora 3D EVOCONS
await nft.defineAsset(
  3,
  "EVOCONS EVOBLOCK",
  "CONSTRUCTION_3D_PRINTER_GANTRY",
  "ES",
  200,
  "0xSHA256_DEL_DOCUMENTO_LEGAL_TIER3",
  "ipfs://<CID_CARPETA>/tier-3.json"
);
```

---

## Verificación post-subida

Antes de usar los CIDs en producción, verifica que los JSONs son accesibles:
```
https://ipfs.io/ipfs/<CID>/tier-1.json
https://gateway.pinata.cloud/ipfs/<CID>/tier-1.json
```
