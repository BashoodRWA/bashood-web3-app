# 🔐 BASHOOD-RWA-1 Backup & Recovery Guide

## Estado Actual del Proyecto

**Última actualización:** 19 Enero 2026  
**Estado:** ✅ Listo para aplicación a Base Builder Grant  
**Versión:** v1.0 (BASHOOD-RWA-1 Standard)

---

## 📋 Sistemas de Backup Implementados

### 1. Git Version Control (PRINCIPAL) ✅

**Estado:** Activo con 10+ commits  
**Ventajas:** 
- Control de versiones completo
- Historial de cambios
- Fácil reversión a cualquier commit
- Colaboración y sincronización

**Últimos commits importantes:**
```
38b1286 - docs: Crear GRANT_SUBMISSION_PACKAGE.md
2dde358 - docs: Actualizar grant con Estrategia de Transparencia Técnica
8d2699b - feat(implementation): BashoodRWAReference.sol complete
def49e4 - docs: Completar aplicación Base Builder Grant
17b11ea - feat(standard): BASHOOD-RWA-1 v1.0 - Interface + Schema + 5 NFTs
```

**Comandos útiles:**
```powershell
# Ver historial
git log --oneline -20

# Revertir a commit específico
git reset --hard [commit-hash]

# Crear tag para versión importante
git tag -a v1.0-grant-ready -m "Version lista para grant"

# Ver diferencias
git diff [commit1] [commit2]

# Recuperar archivo específico de commit anterior
git checkout [commit-hash] -- path/to/file
```

### 2. Backups Automáticos (Script PowerShell) ✅

**Ubicación:** `scripts/create-backup.ps1`

**Uso básico:**
```powershell
# Backup simple (carpeta)
.\scripts\create-backup.ps1

# Backup comprimido (ZIP)
.\scripts\create-backup.ps1 -Compress

# Backup en ubicación específica
.\scripts\create-backup.ps1 -BackupLocation "D:\Backups" -Compress
```

**Archivos respaldados:**
- ✅ Documentación completa (docs/)
- ✅ Contratos (contracts/standards/)
- ✅ Schemas (schemas/)
- ✅ NFT Metadata (metadata/industrial-collection/)
- ✅ Configuración (hardhat, package.json)
- ✅ Tests (test/standards/)
- ✅ Guía de submission (GRANT_SUBMISSION_PACKAGE.md)

**Formato de nombre:**
```
bashood-rwa-backup-2026-01-19-1430.zip
```

### 3. Archivos .bak (Puntuales) ⚠️

**Verificar existencia:**
```powershell
Get-ChildItem -Recurse -Filter "*.bak" | Select-Object Name, Length, LastWriteTime
```

**Nota:** Los backups .bak son menos confiables que Git o el script automatizado.

---

## 🚨 Escenarios de Recuperación

### Escenario 1: Archivo Corrupto Individual

**Problema:** Un archivo (ej. IBashoodRWA.sol) se corrompió o borró accidentalmente.

**Solución (desde Git):**
```powershell
# Ver último commit donde el archivo estaba bien
git log -- contracts/standards/IBashoodRWA.sol

# Restaurar desde commit específico
git checkout [commit-hash] -- contracts/standards/IBashoodRWA.sol

# O restaurar desde último commit
git checkout HEAD -- contracts/standards/IBashoodRWA.sol
```

**Solución (desde Backup ZIP):**
```powershell
# Expandir backup
Expand-Archive -Path "bashood-rwa-backup-*.zip" -DestinationPath "temp-restore"

# Copiar archivo específico
Copy-Item "temp-restore/contracts/standards/IBashoodRWA.sol" -Destination "contracts/standards/" -Force
```

### Escenario 2: Cambios Recientes Rompieron Todo

**Problema:** Los últimos cambios introdujeron errores críticos, necesitas volver a estado anterior.

**Solución (Git reset):**
```powershell
# Ver commits recientes
git log --oneline -10

# Volver a commit anterior (mantiene archivos modificados)
git reset --soft [commit-hash]

# Volver a commit anterior (descarta todos los cambios)
git reset --hard [commit-hash]

# Crear rama de respaldo antes de reset
git branch backup-before-reset
git reset --hard [commit-hash]
```

### Escenario 3: Pérdida Total del Proyecto

**Problema:** Disco duro falla, carpeta borrada, ransomware, etc.

**Solución (desde GitHub):**
```powershell
# Clonar repositorio (si subiste a GitHub)
git clone https://github.com/[TU_USUARIO]/bashood-hardhat-tests.git
cd bashood-hardhat-tests
npm install
npx hardhat compile
```

**Solución (desde Backup ZIP en nube):**
```powershell
# Si guardaste backup en OneDrive/Google Drive/Dropbox
Expand-Archive -Path "D:\OneDrive\Backups\bashood-rwa-backup-*.zip" -DestinationPath "C:\Recovery"
cd C:\Recovery\bashood-rwa-backup-*
npm install
npx hardhat compile
```

### Escenario 4: Necesitas Versión Exacta para Grant

**Problema:** Aplicaste al grant, Base pide revisar código, pero mientras tanto seguiste desarrollando.

**Solución (Git tag):**
```powershell
# Crear tag AHORA (antes de aplicar)
git tag -a v1.0-grant-submission -m "Versión exacta enviada a Base Builder Grant - 19 Enero 2026"
git push origin v1.0-grant-submission

# Más tarde, volver a esa versión exacta
git checkout v1.0-grant-submission

# Ver todas las tags
git tag -l
```

### Escenario 5: Comparar Versiones

**Problema:** ¿Qué cambió entre la versión del grant y ahora?

**Solución (Git diff):**
```powershell
# Ver diferencias entre tag y commit actual
git diff v1.0-grant-submission HEAD

# Ver diferencias de archivo específico
git diff v1.0-grant-submission HEAD -- contracts/standards/IBashoodRWA.sol

# Ver lista de archivos modificados
git diff --name-only v1.0-grant-submission HEAD
```

---

## 📦 Checklist Pre-Grant (HACER AHORA)

Antes de aplicar al grant, asegúrate de tener backups completos:

- [ ] **Git commit con todo el trabajo actualizado**
  ```powershell
  git add .
  git commit -m "chore: Backup completo pre-grant submission"
  ```

- [ ] **Crear tag de versión**
  ```powershell
  git tag -a v1.0-grant-submission -m "BASHOOD-RWA-1 v1.0 - Grant submission version"
  ```

- [ ] **Backup ZIP local**
  ```powershell
  .\scripts\create-backup.ps1 -Compress
  ```

- [ ] **Subir a GitHub (recomendado)** ⭐
  ```powershell
  # Si no tienes remote configurado
  git remote add origin https://github.com/[TU_USUARIO]/bashood-hardhat-tests.git
  git push -u origin patch/rescue-pullpayment-2025-11-01
  git push origin v1.0-grant-submission
  ```

- [ ] **Copiar backup ZIP a ubicación segura**
  - OneDrive: `C:\Users\Franchu\OneDrive\Backups\`
  - Google Drive
  - Dropbox
  - Disco externo USB

- [ ] **Backup de package.json y package-lock.json**
  ```powershell
  Copy-Item package.json package.json.bak
  Copy-Item package-lock.json package-lock.json.bak
  ```

- [ ] **Exportar git log como referencia**
  ```powershell
  git log --oneline --graph --all > git-history-pre-grant.txt
  ```

---

## 🔄 Estrategia de Backup Recomendada

### Durante Desarrollo (Pre-Grant)
- **Commits frecuentes:** Cada feature completada
- **Backup ZIP:** Cada día de trabajo
- **GitHub push:** Al final del día

### Post-Grant (Si aprobado)
- **Commits:** Cada cambio importante
- **Backup ZIP:** Antes de refactorización mayor (librerías)
- **GitHub push:** Después de cada milestone
- **Tags:** v1.1-libraries, v1.1-tested, v1.1-deployed

### Pre-Production (Mainnet)
- **Git tags:** Versión exacta a deployar
- **Backup completo:** Código + ABIs + deployment scripts
- **Multiple locations:** GitHub + backup ZIP + cloud storage
- **Documentación:** Addresses de contratos deployados

---

## 📂 Estructura de Backups

```
Backups/
├── bashood-rwa-backup-2026-01-19-1430.zip (ACTUAL - pre-grant)
├── bashood-rwa-backup-2026-01-20-1000.zip (ejemplo diario)
├── bashood-rwa-backup-2026-02-01-v1.1.zip (post-refactorización)
└── RESTORE_INSTRUCTIONS.txt (en cada backup)
```

**Ubicaciones recomendadas:**
1. Local: `C:\Users\Franchu\Desktop\bashood-hardhat-tests\` (carpeta actual)
2. OneDrive: `C:\Users\Franchu\OneDrive\Backups\Bashood-RWA\`
3. GitHub: `https://github.com/[TU_USUARIO]/bashood-hardhat-tests`
4. External: USB drive o disco externo

---

## ⚡ Quick Commands Cheat Sheet

```powershell
# ===== BACKUP =====
.\scripts\create-backup.ps1 -Compress

# ===== GIT =====
git status                              # Ver cambios
git add .                               # Agregar todos los archivos
git commit -m "mensaje"                 # Commit
git log --oneline -10                   # Ver últimos 10 commits
git tag -a v1.0 -m "mensaje"            # Crear tag
git push origin main                    # Subir a GitHub
git push origin v1.0                    # Subir tag

# ===== RESTAURAR =====
git checkout HEAD -- archivo.sol        # Restaurar archivo
git reset --hard [commit-hash]          # Volver a commit
git checkout v1.0-grant-submission      # Ir a tag específico

# ===== VERIFICAR =====
npx hardhat compile                     # Compilar contratos
npm test                                # Ejecutar tests
git diff v1.0 v1.1                      # Comparar versiones
```

---

## 🛡️ Protección Adicional

### GitHub (Recomendado) ⭐⭐⭐

**Ventajas:**
- ✅ Backup automático en la nube
- ✅ Accesible desde cualquier lugar
- ✅ Historial completo
- ✅ Colaboración fácil
- ✅ GRATIS para repositorios públicos/privados

**Setup:**
```powershell
# 1. Crear repo en GitHub.com
# 2. Configurar remote
git remote add origin https://github.com/[TU_USUARIO]/bashood-hardhat-tests.git

# 3. Subir todo
git push -u origin patch/rescue-pullpayment-2025-11-01

# 4. Subir tags
git push origin --tags
```

**Importante:** Si el repo es público, asegúrate de NO incluir:
- ❌ `.env` con private keys
- ❌ API keys de Alchemy/Infura
- ❌ Mnemonic phrases
- ✅ Ya tienes `.gitignore` configurado correctamente

### OneDrive / Google Drive

**Setup automático:**
```powershell
# Crear script para backup diario a OneDrive
$script = @'
# Auto-backup diario
cd C:\Users\Franchu\Desktop\bashood-hardhat-tests
.\scripts\create-backup.ps1 -BackupLocation "C:\Users\Franchu\OneDrive\Backups\Bashood-RWA" -Compress

# Limpiar backups antiguos (mantener últimos 7 días)
Get-ChildItem "C:\Users\Franchu\OneDrive\Backups\Bashood-RWA\bashood-rwa-backup-*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item -Force
'@

$script | Out-File "C:\Users\Franchu\Desktop\backup-diario.ps1" -Encoding UTF8
```

**Programar tarea (Windows Task Scheduler):**
```powershell
# Ejecutar diariamente a las 11 PM
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Users\Franchu\Desktop\backup-diario.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 11PM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Bashood-RWA-Backup" -Description "Backup diario del proyecto BASHOOD-RWA-1"
```

---

## ✅ Verificación de Backups

### Test de Recuperación (Hacer 1 vez al mes)

```powershell
# 1. Crear backup de prueba
.\scripts\create-backup.ps1 -BackupLocation "C:\Temp\test-restore" -Compress

# 2. Simular pérdida (renombrar carpeta actual)
Rename-Item contracts contracts.OLD

# 3. Restaurar desde backup
Expand-Archive -Path "C:\Temp\test-restore\bashood-rwa-backup-*.zip" -DestinationPath "C:\Temp\restored"
Copy-Item "C:\Temp\restored\contracts" -Destination . -Recurse -Force

# 4. Verificar que funciona
npx hardhat compile

# 5. Si todo OK, limpiar
Remove-Item contracts.OLD -Recurse -Force
Remove-Item C:\Temp\test-restore -Recurse -Force
Remove-Item C:\Temp\restored -Recurse -Force
```

---

## 📞 Soporte

**Si pierdes acceso al proyecto:**
1. Verificar GitHub primero (más reciente)
2. Verificar OneDrive/Google Drive
3. Buscar backups ZIP locales
4. Último recurso: Reconstruir desde documentación en GRANT_SUBMISSION_PACKAGE.md

**Archivos MÁS críticos (en orden de importancia):**
1. `BASE_BUILDER_GRANT_APPLICATION.md` - Aplicación del grant
2. `IBashoodRWA.sol` - El estándar (interface)
3. `BashoodRWAReference.sol` - PoC funcional
4. `bashood-rwa-v1.schema.json` - Schema metadata
5. `metadata/industrial-collection/*.json` - 5 NFTs ($10.485M)
6. `BASHOOD-RWA-1-SPECIFICATION.md` - Spec técnica

**Nota:** Con estos 6 archivos puedes reconstruir el proyecto completo.

---

## 🎯 Resumen Ejecutivo

**Estado actual:**
- ✅ Git con 10+ commits (backup principal)
- ✅ Script de backup automatizado (`create-backup.ps1`)
- ✅ Backup ZIP creado hoy (19 Enero 2026)
- ⚠️ Recomendación: Subir a GitHub AHORA (antes de aplicar a grant)

**Próximos pasos:**
1. Crear tag `v1.0-grant-submission`
2. Push a GitHub (incluir tag)
3. Backup ZIP a OneDrive/Google Drive
4. Aplicar al grant con confianza

**Protección total:**
- Git (local) + GitHub (cloud) + Backup ZIP (local) + OneDrive/Drive (cloud) = 4 capas de protección ✅

---

**Última actualización:** 19 Enero 2026  
**Versión documento:** 1.0  
**Mantenido por:** Bashood Protocol Team
