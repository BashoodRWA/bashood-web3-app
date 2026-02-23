# ✅ Foundry Instalado y Configurado

## 🎯 Estado Actual

- ✅ WSL Ubuntu instalado
- ✅ Foundry v1.3.5-stable instalado
- ✅ forge-std v1.11.0 instalado
- ✅ Compilación exitosa (0 errores, solo warnings de estilo)

---

## 📝 Comandos Foundry para Usar

### Compilación

```bash
# Compilar contratos
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge build"

# Compilar con tamaños
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge build --sizes"

# Forzar recompilación
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge build --force"
```

### Testing (cuando tengamos tests)

```bash
# Ejecutar todos los tests
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge test"

# Tests con verbosidad
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge test -vvv"

# Solo fuzzing tests
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge test --match-test testFuzz"

# Solo invariant tests
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge test --match-test invariant"

# Test específico
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge test --match-test testNombreEspecifico -vvv"
```

### Cobertura

```bash
# Generar reporte de cobertura
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge coverage"

# Cobertura en formato LCOV
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge coverage --report lcov"
```

### Gas Reports

```bash
# Reporte de gas
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge test --gas-report"
```

### Snapshot (comparar gas)

```bash
# Crear snapshot de gas
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge snapshot"

# Comparar con snapshot anterior
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge snapshot --diff"
```

---

## 🔍 Verificar Tamaños de Contratos

El comando más útil después de compilar:

```bash
wsl bash -c "cd /mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests && ~/.foundry/bin/forge build --sizes | grep -E 'BashoodPresaleFinal|BashoodToken|BashoodPropertyNFT|BashoodReferral'"
```

---

## 📂 Estructura del Proyecto

```
bashood-hardhat-tests/
├── contracts/           ← Contratos Solidity
├── test/
│   ├── hardhat/        ← Tests de Hardhat (existentes)
│   └── foundry/        ← Tests de Foundry (PRÓXIMOS)
├── lib/
│   └── forge-std/      ← Librería de testing Foundry ✅
├── out/                ← Artifacts compilados por Foundry
├── cache_forge/        ← Cache de Foundry
└── foundry.toml        ← Configuración Foundry ✅
```

---

## 🎯 Próximos Pasos

1. ✅ Foundry instalado
2. ✅ Compilación exitosa
3. ⏳ Crear Invariant Tests (6 reglas)
4. ⏳ Crear Fuzzing Tests (10,000 runs)
5. ⏳ Ejecutar y verificar tests
6. ⏳ Generar informe de certificación

---

## 💡 Tips

- **WSL PATH**: El proyecto está en `/mnt/c/Users/Franchu/Desktop/bashood-hardhat-tests`
- **Foundry binaries**: `~/.foundry/bin/forge`, `~/.foundry/bin/cast`, `~/.foundry/bin/anvil`
- **Warnings**: Los warnings de estilo (screaming-snake-case, mixed-case, etc.) son normales y no afectan funcionalidad
- **Compilación rápida**: Foundry compila en ~250ms vs Hardhat ~40s

---

## 🏆 Configuración Actual

**foundry.toml**:
```toml
[profile.default.fuzz]
runs = 10000                    # 10,000 iteraciones de fuzzing
max_test_rejects = 100000

[profile.default.invariant]
runs = 256                      # 256 secuencias de llamadas
depth = 15                      # 15 llamadas por secuencia
fail_on_revert = true
```

**Esto significa**: 
- Fuzzing: 10,000 casos de prueba por función
- Invariants: 256 × 15 = **3,840 llamadas totales** para verificar reglas matemáticas

---

**¿Listo para crear los tests de invariantes?**
