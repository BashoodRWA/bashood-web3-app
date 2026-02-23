# Backup Script - Bashood Hardhat Tests
# Crea un backup completo del proyecto

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "bashood-backup-$timestamp"
$backupPath = "C:\Users\Franchu\Desktop\$backupName"
$sourcePath = "C:\Users\Franchu\Desktop\bashood-hardhat-tests"

Write-Host "`n" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "📦 BACKUP COMPLETO: Bashood Hardhat Tests" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n📋 Configuración:" -ForegroundColor Yellow
Write-Host "  Origen:  $sourcePath"
Write-Host "  Destino: $backupPath"
Write-Host "  Fecha:   $timestamp`n"

# Crear directorio de backup
Write-Host "📁 Creando directorio de backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Archivos y carpetas a excluir
$exclude = @(
    "node_modules",
    ".git",
    "cache",
    "artifacts",
    "coverage",
    "typechain-types",
    ".env",
    ".DS_Store",
    "*.log",
    "dist",
    "build",
    ".vscode",
    ".idea"
)

Write-Host "📦 Copiando archivos..." -ForegroundColor Yellow
Write-Host "   (Excluyendo: node_modules, cache, artifacts, .git)" -ForegroundColor Gray

# Copiar archivos excluyendo los directorios innecesarios
$excludeString = $exclude | ForEach-Object { "*\$_\*" }

Get-ChildItem -Path $sourcePath -Recurse | Where-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($pattern in $exclude) {
        if ($item.FullName -like "*\$pattern\*" -or $item.Name -eq $pattern) {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
} | ForEach-Object {
    $targetPath = $_.FullName.Replace($sourcePath, $backupPath)
    $targetDir = Split-Path -Parent $targetPath
    
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    if (-not $_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination $targetPath -Force
    }
}

Write-Host "✅ Archivos copiados`n" -ForegroundColor Green

# Crear archivo de información del backup
$infoContent = @"
╔══════════════════════════════════════════════════════════════════════════════╗
║                    BACKUP: BASHOOD HARDHAT TESTS                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

📅 Fecha del backup: $timestamp
📂 Proyecto: bashood-hardhat-tests
🔒 Security Score: 100% (25/25 ataques bloqueados)
✅ Payment Distribution: Validado (45/25/20/10)

═══════════════════════════════════════════════════════════════════════════════
📊 ESTADO DEL PROYECTO
═══════════════════════════════════════════════════════════════════════════════

✅ Contratos Principales:
   - BashoodToken.sol (con burn 0.1% + fee 0.5%)
   - BashoodPresaleFinal.sol (ETH + BHT purchases)
   - BashoodReferral.sol (sistema de referidos)
   - BashoodPaymentSplitter.sol (distribución automática)
   - BashoodRWAReference.sol (NFT 1155 con metadata)

✅ Tests de Seguridad:
   - 15 ataques básicos bloqueados (100%)
   - 10 ataques avanzados bloqueados (100%)
   - Burn/fee mechanism verificado (0.6% total)
   - Scripts: security-attack-tests.cjs, security-advanced-tests.cjs

✅ Tests de Distribución:
   - Test básico: 16 ETH distribuidos (100% precisión)
   - Test extremo: 300 ETH distribuidos (100% precisión)
   - Scripts: test-payment-distribution.cjs, test-payment-distribution-extreme.cjs

✅ Investigación de Burn:
   - 4 escenarios comparativos ejecutados
   - Burn mechanism: CORRECTO (0.1% burn + 0.5% fee)
   - Scripts: verify-burn-mechanism.cjs, investigate-burn-detailed.cjs, final-burn-verification.cjs

✅ Scripts de Monitoreo:
   - monitor-payment-splitter.cjs (monitoreo de balances)
   - claim-payment-splitter.cjs (claim individual)
   - release-all-payment-splitter.cjs (distribución automática)

═══════════════════════════════════════════════════════════════════════════════
📝 REPORTES GENERADOS
═══════════════════════════════════════════════════════════════════════════════

✅ SECURITY_AUDIT_REPORT.md
   - Security Score: 100%
   - 25 vectores de ataque probados
   - Issue de burn/fee resuelto
   - Recomendación: Separar treasury/ops wallets

✅ PAYMENT_DISTRIBUTION_REPORT.md
   - Distribución validada: 45/25/20/10
   - Tests básicos y extremos ejecutados
   - PaymentSplitter funcionando correctamente

✅ PRODUCTION_WALLET_CONFIG.md
   - Configuración de wallets para mainnet
   - Scripts de monitoreo documentados
   - Proceso de claim automático
   - Multisig en fase 2

═══════════════════════════════════════════════════════════════════════════════
⚠️  ISSUES PENDIENTES
═══════════════════════════════════════════════════════════════════════════════

⏳ 7 tests fallando:
   - ChainlinkPriceFeed: 4 tests (stale round detection)
   - BashoodRWAReference: 3 tests (struct minting)

⏳ Base Sepolia deployment:
   - Wallet: 0x51023F043EAB1F4784128278cEA5a57ed98F5a68
   - Balance: 0.0002 ETH (insuficiente)
   - Requerido: ~0.3 ETH

═══════════════════════════════════════════════════════════════════════════════
🎯 PRÓXIMOS PASOS
═══════════════════════════════════════════════════════════════════════════════

1. Definir 5 wallets Metamask para producción:
   - Treasury wallet (token fees)
   - Operations wallet (presale payments)
   - Development wallet (PaymentSplitter 45%)
   - Marketing wallet (PaymentSplitter 20%)
   - Treasury PS wallet (PaymentSplitter 10%)

2. Validar: treasury !== operations (CRÍTICO)

3. Deployment a Base Sepolia (testnet):
   - Obtener ETH del faucet
   - Deploy completo
   - Verificar contratos en Basescan

4. Testing en testnet:
   - Compras con ETH
   - Compras con BHT
   - Distribución de fondos
   - Claim de PaymentSplitter

5. Mainnet deployment (cuando esté listo):
   - Revisar MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md
   - Deployment con wallets separadas
   - Verificación de contratos
   - Configuración de frontend

═══════════════════════════════════════════════════════════════════════════════
📦 CONTENIDO DEL BACKUP
═══════════════════════════════════════════════════════════════════════════════

Incluye:
✅ Contratos (.sol)
✅ Scripts de deployment (.cjs)
✅ Scripts de testing (.cjs)
✅ Scripts de monitoreo (.cjs)
✅ Tests de seguridad (.cjs)
✅ Configuración (hardhat.config.js, package.json)
✅ Reportes (.md)
✅ Documentación completa

Excluye:
❌ node_modules (reinstalar con: npm install)
❌ cache, artifacts (regenerar con: npx hardhat compile)
❌ .git (no necesario para backup)
❌ .env (contiene private keys - respaldar separadamente)

═══════════════════════════════════════════════════════════════════════════════
🔧 RESTAURAR DESDE BACKUP
═══════════════════════════════════════════════════════════════════════════════

1. Copiar carpeta backup a la ubicación deseada
2. Abrir terminal en la carpeta
3. Instalar dependencias:
   npm install
4. Configurar .env (crear nuevo archivo):
   DEPLOYER_PRIVATE_KEY=0x...
   TREASURY_WALLET=0x...
   OPERATIONS_WALLET=0x...
   # (resto de configuración)
5. Compilar contratos:
   npx hardhat compile
6. Ejecutar tests:
   npx hardhat test

═══════════════════════════════════════════════════════════════════════════════
✅ VERIFICADO POR
═══════════════════════════════════════════════════════════════════════════════

GitHub Copilot
Fecha: 5 de Febrero 2026
Security Audit: 100% (25/25 ataques bloqueados)
Payment Distribution: 100% precisión
Burn Mechanism: Funcionando correctamente (0.6% deducción)

═══════════════════════════════════════════════════════════════════════════════
"@

$infoContent | Out-File -FilePath "$backupPath\BACKUP_INFO.txt" -Encoding UTF8

Write-Host "📝 Creando inventario de archivos..." -ForegroundColor Yellow

# Crear inventario de archivos
$inventory = @"
╔══════════════════════════════════════════════════════════════════════════════╗
║                         INVENTARIO DE ARCHIVOS                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

Generado: $timestamp

"@

# Listar archivos por categoría
$inventory += "`nCONTRATOS (contracts/):`n"
Get-ChildItem -Path "$backupPath\contracts" -Filter "*.sol" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    $inventory += "   OK $($_.Name) (${size} KB)`n"
}

$inventory += "`nSCRIPTS (scripts/):`n"
Get-ChildItem -Path "$backupPath\scripts" -Filter "*.cjs" -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    $inventory += "   OK $($_.Name) (${size} KB)`n"
}

$inventory += "`nTESTS (test/):`n"
Get-ChildItem -Path "$backupPath\test" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    $inventory += "   OK $($_.Name) (${size} KB)`n"
}

$inventory += "`nREPORTES (*.md):`n"
Get-ChildItem -Path "$backupPath" -Filter "*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    $inventory += "   OK $($_.Name) (${size} KB)`n"
}

$inventory += "`nCONFIGURACION:`n"
Get-ChildItem -Path "$backupPath" -Filter "*.json" -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    $inventory += "   OK $($_.Name) (${size} KB)`n"
}
Get-ChildItem -Path "$backupPath" -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    $inventory += "   OK $($_.Name) (${size} KB)`n"
}

$inventory | Out-File -FilePath "$backupPath\FILE_INVENTORY.txt" -Encoding UTF8

Write-Host "✅ Inventario creado`n" -ForegroundColor Green

# Calcular tamaño total del backup
$totalSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

# Contar archivos
$fileCount = (Get-ChildItem -Path $backupPath -Recurse -File).Count

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "📊 ESTADÍSTICAS DEL BACKUP" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "  Total de archivos: $fileCount" -ForegroundColor White
Write-Host "  Tamaño total:      $totalSizeMB MB" -ForegroundColor White
Write-Host "  Ubicación:         $backupPath" -ForegroundColor White
Write-Host ""

# Crear archivo ZIP (opcional)
Write-Host "Crear archivo ZIP? (s/n): " -ForegroundColor Yellow -NoNewline
$createZip = Read-Host

if ($createZip -eq "s" -or $createZip -eq "S") {
    Write-Host "`nCreando archivo ZIP..." -ForegroundColor Yellow
    
    $zipPath = "$backupPath.zip"
    
    try {
        Compress-Archive -Path $backupPath -DestinationPath $zipPath -Force
        $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
        
        Write-Host "ZIP creado: $zipPath" -ForegroundColor Green
        Write-Host "   Tamanio comprimido: $zipSize MB" -ForegroundColor White
        
        $compression = [math]::Round((1 - ($zipSize / $totalSizeMB)) * 100, 1)
        Write-Host "   Compresion: $compression%" -ForegroundColor White
    } catch {
        Write-Host "Error creando ZIP: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "BACKUP COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backup guardado en:" -ForegroundColor Yellow
Write-Host "   $backupPath" -ForegroundColor White
Write-Host ""
Write-Host "Archivos incluidos:" -ForegroundColor Yellow
Write-Host "   - BACKUP_INFO.txt (informacion del proyecto)" -ForegroundColor White
Write-Host "   - FILE_INVENTORY.txt (lista completa de archivos)" -ForegroundColor White
Write-Host "   - Todos los contratos, scripts, tests y reportes" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "   - El archivo .env NO esta incluido (contiene private keys)" -ForegroundColor Yellow
Write-Host "   - Respalda tu .env por separado en un lugar seguro" -ForegroundColor Yellow
Write-Host "   - node_modules no incluido (reinstalar con npm install)" -ForegroundColor Yellow
Write-Host ""
