# 🔨 Foundry Setup Guide - Bashood Protocol

## Estado Actual

✅ **Hardhat-Foundry plugin instalado**  
✅ **foundry.toml configurado**  
✅ **Directorio test/foundry/ creado**  
⏳ **Foundry binaries pendientes de instalación**

---

## Instalación de Foundry (Windows)

### Opción 1: Foundryup (Recomendado)

```powershell
# Usar WSL (Windows Subsystem for Linux)
wsl --install
wsl
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Opción 2: Scoop (Alternativa Windows)

```powershell
# Instalar Scoop si no lo tienes
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Foundry
scoop install foundry
```

### Opción 3: Descarga Manual

1. Ir a: https://github.com/foundry-rs/foundry/releases
2. Descargar: `foundry_nightly_x86_64-pc-windows-msvc.zip`
3. Extraer a: `C:\Users\<TuUsuario>\.foundry\bin`
4. Agregar al PATH: `$env:Path += ";C:\Users\<TuUsuario>\.foundry\bin"`

### Verificación

```powershell
forge --version
cast --version
anvil --version
```

---

## Configuración Actual (foundry.toml)

```toml
[profile.default]
src = 'contracts'
out = 'out'
libs = ['node_modules', 'lib']
test = 'test/foundry'
cache_path = 'cache_forge'
solc_version = '0.8.28'
optimizer = true
optimizer_runs = 10
via_ir = false
evm_version = 'paris'

[profile.default.fuzz]
runs = 10000                    # 🎯 10,000 iteraciones de fuzzing
max_test_rejects = 100000

[profile.default.invariant]
runs = 256                      # 256 secuencias de llamadas
depth = 15                      # 15 llamadas por secuencia
fail_on_revert = true          # Falla si encuentra revert
```

---

## Próximos Pasos

### 1. Crear Tests de Invariantes

**Archivo**: `test/foundry/Invariants.t.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/BashoodPresaleFinal.sol";

contract InvariantPresaleTest is Test {
    BashoodPresaleFinal public presale;
    
    // INVARIANTE 1: Total NFTs vendidos nunca excede maxSupply
    function invariant_totalNFTsSoldNeverExceedsMax() public {
        assertLe(presale.totalNFTsSold(), presale.maxNFTSupply());
    }
    
    // INVARIANTE 2: Conservación de fondos ETH
    function invariant_ETHConservation() public {
        uint256 expected = presale.nftPriceETH() * presale.totalNFTsSold();
        // Comparar con balance del PaymentSplitter
    }
    
    // INVARIANTE 3: User purchases respetan maxPerUser
    function invariant_userPurchasesRespectLimit() public {
        // Iterar usuarios y verificar límite
    }
    
    // INVARIANTE 4: BHT accounting (burn + ops = discounted)
    function invariant_BHTAccountingConservation() public {
        // Verificar que no se pierden tokens en los cálculos
    }
}
```

### 2. Crear Tests de Fuzzing

**Archivo**: `test/foundry/Fuzz.t.sol`

```solidity
contract FuzzPresaleTest is Test {
    // FUZZ: purchaseWithETH con cantidad y precio variables
    function testFuzz_purchaseWithETH(uint256 quantity) public {
        vm.assume(quantity > 0 && quantity <= maxPerUser);
        // Ejecutar compra con cantidad fuzzed
    }
    
    // FUZZ: Service payments con fiatQuote variable
    function testFuzz_payServiceWithBHT(uint256 fiatQuoteUsd) public {
        vm.assume(fiatQuoteUsd > 0 && fiatQuoteUsd < 1e24);
        // Testear con diferentes cantidades
    }
}
```

### 3. Ejecutar Tests

```bash
# Compilar contratos
forge build

# Tests normales
forge test

# Fuzzing (10,000 runs)
forge test --match-test testFuzz

# Invariants (exhaustivo)
forge test --match-test invariant

# Con verbosidad
forge test -vvv

# Cobertura
forge coverage
```

---

## Beneficios Esperados

### Fuzzing (10,000 runs)
✅ **Detección automática** de edge cases  
✅ **Cobertura exhaustiva** de rangos numéricos  
✅ **Bugs que tests manuales no encuentran**  

### Invariant Testing
✅ **Certeza matemática** de propiedades core  
✅ **Nivel institucional** de auditoría  
✅ **Informe auditable** para inversores/exchanges  

### Reportes Generados
- `forge test` → Output con 10,000+ casos pasados
- `forge coverage` → Cobertura línea por línea
- Certificación: "✅ 10,000 fuzzing runs - 0 failures"

---

## Integración con Hardhat

```javascript
// hardhat.config.js (YA CONFIGURADO)
require("@nomicfoundation/hardhat-foundry");

// Los contratos en artifacts/ serán compatibles con Foundry
```

**Workflow híbrido:**
1. Tests Hardhat (JS) → Lógica de negocio
2. Tests Foundry (Solidity) → Fuzzing + Invariantes
3. Despliegue Hardhat → Production

---

## Comandos Útiles

```bash
# Inicializar dependencias Forge
forge install foundry-rs/forge-std

# Compilar solo con Foundry
forge build

# Gas report detallado
forge test --gas-report

# Snapshot de gas (optimizaciones)
forge snapshot

# Debugger interactivo
forge test --debug <test-name>
```

---

## Próxima Acción Requerida

⚠️ **INSTALAR FOUNDRY MANUALMENTE**

Elige una opción arriba y ejecuta:
```powershell
forge --version
```

Cuando veas la versión, ejecuta:
```bash
forge install foundry-rs/forge-std --no-commit
```

Luego continuamos con la creación de tests de invariantes.

---

**Estado**: 🟡 Configuración lista, esperando instalación de binaries
