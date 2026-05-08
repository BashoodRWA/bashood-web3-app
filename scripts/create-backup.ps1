# BASHOOD-RWA-1 Backup Script
# Crea un backup completo del proyecto con timestamp

param(
    [string]$BackupLocation = ".",
    [switch]$Compress
)

$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$backupName = "bashood-rwa-backup-$timestamp"
$backupDir = Join-Path $BackupLocation $backupName

Write-Host "`n🔐 BASHOOD-RWA-1 BACKUP SCRIPT" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Crear directorio de backup
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "✅ Directorio creado: $backupDir`n" -ForegroundColor Green

# Archivos y carpetas críticas
$criticalItems = @(
    # Documentación
    'docs/BASE_BUILDER_GRANT_APPLICATION.md',
    'docs/BASHOOD-RWA-1-SPECIFICATION.md',
    'docs/README-STANDARD.md',
    'docs/CONTRACT_SIZE_CHALLENGE.md',
    'GRANT_SUBMISSION_PACKAGE.md',
    
    # Contratos
    'contracts/standards/IBashoodRWA.sol',
    'contracts/standards/BashoodRWAReference.sol',
    
    # Schemas y metadata
    'schemas/bashood-rwa-v1.schema.json',
    'metadata/industrial-collection/',
    
    # Configuración
    'hardhat.config.cjs',
    'hardhat.config.js',
    'package.json',
    'package-lock.json',
    
    # Tests (si existen)
    'test/standards/BashoodRWA.test.js'
)

Write-Host "📋 COPIANDO ARCHIVOS CRÍTICOS:" -ForegroundColor Yellow

$copiedCount = 0
$totalSize = 0

foreach ($item in $criticalItems) {
    if (Test-Path $item) {
        $destination = Join-Path $backupDir $item
        $destinationDir = Split-Path -Parent $destination
        
        # Crear estructura de directorios
        if (-not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        
        # Copiar archivo o carpeta
        Copy-Item -Path $item -Destination $destination -Recurse -Force
        
        # Calcular tamaño
        if (Test-Path $item -PathType Container) {
            $size = (Get-ChildItem -Path $item -Recurse -File | Measure-Object -Property Length -Sum).Sum
            Write-Host "  ✅ $item (carpeta) - $([math]::Round($size/1KB, 2)) KB" -ForegroundColor Green
        } else {
            $size = (Get-Item $item).Length
            Write-Host "  ✅ $item - $([math]::Round($size/1KB, 2)) KB" -ForegroundColor Green
        }
        
        $totalSize += $size
        $copiedCount++
    } else {
        Write-Host "  ⚠️  $item - No encontrado (omitido)" -ForegroundColor DarkYellow
    }
}

Write-Host "`n📊 RESUMEN DEL BACKUP:" -ForegroundColor Cyan
Write-Host "  Archivos/carpetas copiados: $copiedCount" -ForegroundColor White
Write-Host "  Tamaño total: $([math]::Round($totalSize/1MB, 2)) MB`n" -ForegroundColor White

# Git log (últimos 10 commits)
Write-Host "📜 ÚLTIMOS COMMITS (para referencia):" -ForegroundColor Yellow
git log --oneline -10 | Out-File -FilePath (Join-Path $backupDir "git-history.txt") -Encoding UTF8
git log --oneline -10
Write-Host ""

# Comprimir si se solicita
if ($Compress) {
    Write-Host "🗜️  COMPRIMIENDO BACKUP..." -ForegroundColor Cyan
    $zipPath = "$backupDir.zip"
    Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force
    
    $zipSize = (Get-Item $zipPath).Length
    Write-Host "✅ Archivo comprimido: $zipPath" -ForegroundColor Green
    Write-Host "   Tamaño comprimido: $([math]::Round($zipSize/1MB, 2)) MB`n" -ForegroundColor White
    
    # Eliminar carpeta descomprimida
    Remove-Item -Path $backupDir -Recurse -Force
    Write-Host "🗑️  Carpeta temporal eliminada (solo queda .zip)`n" -ForegroundColor DarkGray
}

Write-Host "✅ BACKUP COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

# Instrucciones de restauración
$instructions = @"
INSTRUCCIONES DE RESTAURACIÓN
==============================

1. DESDE CARPETA:
   - Copiar contenido de '$backupName' de vuelta al proyecto
   - Verificar que todos los archivos estén en su lugar

2. DESDE ZIP (si comprimiste):
   - Expandir archivo: Expand-Archive -Path '$backupName.zip' -DestinationPath .
   - Copiar archivos de vuelta al proyecto

3. VERIFICACIÓN:
   - npx hardhat compile (verificar compilación)
   - git status (verificar cambios)
   
4. GIT COMO BACKUP:
   - Último commit: $(git log -1 --oneline)
   - Para revertir: git reset --hard [commit-hash]
   - Para ver cambios: git log --oneline

ARCHIVOS CRÍTICOS RESPALDADOS:
- BASE_BUILDER_GRANT_APPLICATION.md (aplicación grant)
- IBashoodRWA.sol (interface estándar)
- BashoodRWAReference.sol (PoC 806 líneas)
- bashood-rwa-v1.schema.json (schema metadata)
- 5 NFT metadata files ($10.485M)
- Toda la documentación técnica

FRECUENCIA RECOMENDADA:
- Antes de cambios importantes: Crear backup manual
- Diario durante desarrollo: Git commits
- Pre-deploy: Backup completo + git tag

UBICACIÓN DE ESTE BACKUP:
$(if ($Compress) { "$zipPath" } else { "$backupDir" })
"@

$instructions | Out-File -FilePath (Join-Path (if ($Compress) { Split-Path $zipPath } else { $backupDir }) "RESTORE_INSTRUCTIONS.txt") -Encoding UTF8

Write-Host "📝 Instrucciones de restauración guardadas`n" -ForegroundColor Cyan
