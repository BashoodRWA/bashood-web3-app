<#
install-docker.ps1

Script de asistencia para instalar/activar Docker Desktop en Windows con backend WSL2.

INSTRUCCIONES:
- Ejecuta PowerShell como Administrador.
- Navega a la carpeta del repo y ejecuta:
    powershell -ExecutionPolicy Bypass -File .\scripts\install-docker.ps1

El script intentará:
  1) Detectar si tiene privilegios de administrador.
  2) Habilitar las features WSL y VirtualMachinePlatform (si no están habilitadas).
  3) Intentar ejecutar `wsl --install` para instalar WSL y una distro por defecto (si procede).
  4) Asegurar que WSL se establezca a versión 2.
  5) Descargar el instalador de Docker Desktop (versión estable) en %TEMP% y lanzarlo.

NOTAS DE SEGURIDAD:
- El instalador de Docker Desktop se descarga desde el servidor oficial. Revisa la URL si lo deseas.
- El script no realiza instalaciones silenciosas por defecto: lanzará el instalador para que lo ejecutes interactuando con el instalador GUI.

#>

function Assert-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Error "Se requieren privilegios de administrador. Abre PowerShell como Administrador e intenta de nuevo."; exit 1
    }
}

function Enable-Feature-IfNeeded([string]$featureName) {
    try {
        $state = (dism.exe /online /Get-FeatureInfo /FeatureName:$featureName) 2>$null | Out-String
        if ($state -match 'State : Enabled') {
            Write-Host "Feature $featureName ya está habilitada." -ForegroundColor Green
        } else {
            Write-Host "Habilitando feature: $featureName ..." -ForegroundColor Yellow
            dism.exe /online /enable-feature /featurename:$featureName /all /norestart | Out-Null
            Write-Host "Feature $featureName habilitada. Será necesario reiniciar si el instalador lo solicita." -ForegroundColor Green
        }
    } catch {
        Write-Warning "No he podido consultar la feature $featureName con dism.exe: $_"
    }
}

Assert-Admin

Write-Host "--- Instalación/activación de requisitos para Docker Desktop (WSL2) ---" -ForegroundColor Cyan

# 1) Habilitar WSL y VirtualMachinePlatform si es necesario
Enable-Feature-IfNeeded -featureName Microsoft-Windows-Subsystem-Linux
Enable-Feature-IfNeeded -featureName VirtualMachinePlatform

# 2) Intentar instalar WSL (solo si el comando existe y no está instalado)
try {
    $wslVersion = wsl.exe -v 2>$null
    Write-Host "WSL detectado (comando wsl disponible)." -ForegroundColor Green
} catch {
    Write-Host "Intentando instalar WSL (requiere Windows 10/11 con soporte)." -ForegroundColor Yellow
    try {
        wsl --install
        Write-Host "wsl --install ejecutado. Reinicia el sistema si el comando lo indica." -ForegroundColor Green
    } catch {
        Write-Warning "No se pudo ejecutar 'wsl --install'. Si tienes un Windows antiguo, instala manualmente el kernel WSL2: https://learn.microsoft.com/windows/wsl/install-manual"
    }
}

# 3) Forzar WSL 2 como default
try {
    wsl --set-default-version 2
    Write-Host "WSL default set to version 2." -ForegroundColor Green
} catch {
    Write-Warning "No se pudo establecer WSL v2 por defecto. Asegúrate de que el kernel de WSL2 esté instalado y reinicia si corresponde. Consulta: https://learn.microsoft.com/windows/wsl/install"
}

# 4) Descargar Docker Desktop Installer al TEMP y lanzarlo
$installerUrl = 'https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe'
$tempPath = [IO.Path]::Combine($env:TEMP, 'DockerDesktopInstaller.exe')

Write-Host "Descargando Docker Desktop desde: $installerUrl" -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $installerUrl -OutFile $tempPath -UseBasicParsing -ErrorAction Stop
    Write-Host "Instalador descargado en: $tempPath" -ForegroundColor Green
} catch {
    Write-Warning "Fallo en la descarga del instalador: $_. Intenta descargar manualmente desde https://www.docker.com/get-started"
}

if (Test-Path $tempPath) {
    Write-Host "Lanzando el instalador de Docker Desktop. Sigue las indicaciones del instalador y asegúrate de elegir 'Use the WSL 2 based engine' en las opciones." -ForegroundColor Yellow
    Start-Process -FilePath $tempPath -Verb RunAs
    Write-Host "Instalador lanzado. Espera a que acabe la instalación y abre Docker Desktop." -ForegroundColor Green
} else {
    Write-Warning "No se descargó el instalador. Descarga manualmente desde https://www.docker.com/get-started y ejecuta como administrador." 
}

Write-Host "--- Pasos finales ---" -ForegroundColor Cyan
Write-Host "1) Reinicia el equipo si el instalador/WSL lo solicita." -ForegroundColor White
Write-Host "2) Abre Docker Desktop, habilita integración WSL para tu distro (Settings → Resources → WSL Integration)." -ForegroundColor White
Write-Host "3) Verifica desde PowerShell (no admin) con: docker --version ; docker info" -ForegroundColor White
Write-Host "Si quieres, cuando Docker esté listo ejecuta 'docker --version' y dime, yo volveré a lanzar Slither y procesaré el reporte." -ForegroundColor Cyan
