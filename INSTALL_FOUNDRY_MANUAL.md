# 🔧 Instalación Manual de Foundry - Windows

## ⚠️ Instalación Automática Fallida

Los métodos automáticos no funcionaron. Procede con **instalación manual**:

---

## ✅ MÉTODO RECOMENDADO: Foundryup via WSL

### Paso 1: Instalar WSL (si no lo tienes)

```powershell
# En PowerShell como Administrador
wsl --install
```

**Reinicia el PC** después de la instalación.

### Paso 2: Abrir WSL e instalar Foundry

```bash
# En terminal WSL
wsl

# Instalar Foundry
curl -L https://foundry.paradigm.xyz | bash

# Cargar foundry en PATH
source ~/.bashrc

# Actualizar a última versión
foundryup
```

### Paso 3: Verificar instalación

```bash
forge --version
cast --version
anvil --version
chisel --version
```

### Paso 4: Volver a Windows y usar desde WSL

```powershell
# En PowerShell (Windows)
cd C:\Users\Franchu\Desktop\bashood-hardhat-tests

# Compilar con Foundry via WSL
wsl forge build

# Ejecutar tests
wsl forge test

# Fuzzing
wsl forge test --match-test testFuzz -vvv

# Invariants
wsl forge test --match-test invariant -vvv
```

---

## 🔄 ALTERNATIVA: Descarga Manual de Binaries

### Opción 1: Desde Releases de GitHub

1. Ve a: https://github.com/foundry-rs/foundry/releases
2. Busca el asset: `foundry_nightly_x86_64-pc-windows-msvc.zip`
3. Descarga y extrae en: `C:\foundry\bin\`
4. Agrega al PATH del sistema:
   - Buscar "Variables de entorno"
   - Editar "Path" de Usuario
   - Agregar: `C:\foundry\bin`
5. Reiniciar PowerShell
6. Verificar: `forge --version`

### Opción 2: Usar Binaries Pre-compilados

```powershell
# Descargar binaries uno por uno
$foundryDir = "C:\foundry\bin"
New-Item -Path $foundryDir -ItemType Directory -Force

# URLs de binaries (actualiza con versión más reciente)
$baseUrl = "https://github.com/foundry-rs/foundry/releases/download/nightly-<FECHA>"

# Descargar cada binary
Invoke-WebRequest -Uri "$baseUrl/forge.exe" -OutFile "$foundryDir\forge.exe"
Invoke-WebRequest -Uri "$baseUrl/cast.exe" -OutFile "$foundryDir\cast.exe"
Invoke-WebRequest -Uri "$baseUrl/anvil.exe" -OutFile "$foundryDir\anvil.exe"
Invoke-WebRequest -Uri "$baseUrl/chisel.exe" -OutFile "$foundryDir\chisel.exe"

# Agregar al PATH
$env:Path += ";$foundryDir"
[System.Environment]::SetEnvironmentVariable("Path", "$foundryDir;" + [System.Environment]::GetEnvironmentVariable("Path", "User"), "User")
```

---

## 🎯 Después de Instalar Foundry

### 1. Instalar dependencias de testing

```bash
# En el directorio del proyecto
forge install foundry-rs/forge-std --no-commit
```

### 2. Compilar contratos

```bash
forge build
```

### 3. Ejecutar tests (cuando estén creados)

```bash
# Tests normales
forge test

# Con verbosidad
forge test -vvv

# Solo fuzzing
forge test --match-test testFuzz

# Solo invariants
forge test --match-test invariant

# Cobertura
forge coverage
```

---

## 🔍 Verificación Final

Después de instalar, ejecuta:

```powershell
forge --version
# Debe mostrar: forge 0.x.x (...)

cast --version
# Debe mostrar: cast 0.x.x (...)

anvil --version
# Debe mostrar: anvil 0.x.x (...)
```

---

## 📝 Próximos Pasos (después de instalar)

1. ✅ Verificar `forge --version`
2. ⏳ Instalar `forge-std`: `forge install foundry-rs/forge-std --no-commit`
3. ⏳ Compilar: `forge build`
4. ⏳ Crear Invariant Tests
5. ⏳ Crear Fuzzing Tests
6. ⏳ Ejecutar 10,000 runs de fuzzing
7. ⏳ Generar informe de cobertura

---

## ❓ Problemas Comunes

### Error: "forge no reconocido"
- Verifica que `C:\foundry\bin` o `~/.foundry/bin` esté en PATH
- Reinicia PowerShell/Terminal
- En WSL: `source ~/.bashrc`

### Error: "Permission denied"
- Ejecuta PowerShell como Administrador
- En WSL: usa `chmod +x` en los binaries

### Compilación falla
- Verifica `solc_version = '0.8.28'` en foundry.toml
- Ejecuta: `forge build --force`

---

**Estado Actual**: ⏳ Esperando instalación manual de Foundry

**Cuando completes la instalación**, ejecuta:
```bash
forge --version
forge install foundry-rs/forge-std --no-commit
forge build
```

Y continuamos con la creación de tests de invariantes.
