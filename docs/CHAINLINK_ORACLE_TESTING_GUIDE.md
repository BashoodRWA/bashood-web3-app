# 🔗 GUÍA COMPLETA: TESTING ORÁCULOS CHAINLINK

**Proyecto:** BASHOOD-RWA-1  
**Fecha:** 2 Febrero 2026  
**Problema Actual:** `answeredInRound >= roundId` no ejecuta en tests locales  
**Objetivo:** Testing exhaustivo de oráculos Chainlink en entorno real

---

## 📋 ÍNDICE

1. [Situación Actual](#situación-actual)
2. [Opciones de Testing Chainlink](#opciones-de-testing-chainlink)
3. [Solución Recomendada](#solución-recomendada)
4. [Implementación Paso a Paso](#implementación-paso-a-paso)
5. [Chainlink Testnet Integration](#chainlink-testnet-integration)
6. [Testing Automatizado con Foundry](#testing-automatizado-con-foundry)
7. [Chainlink Automation Testing](#chainlink-automation-testing)
8. [Referencias y Recursos](#referencias-y-recursos)

---

## 🔴 SITUACIÓN ACTUAL

### Problema Identificado

**Ubicación:** [MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md](../MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md#L18-L26)

```solidity
// contracts/oracles/ChainlinkPriceFeed.sol líneas 45, 72
require(answeredInRound >= roundId, "stale: answeredInRound < roundId");
```

**Estado:**
- ✅ Código presente en contrato
- ❌ **No ejecuta en tests locales** (MockPriceFeed custom)
- ⚠️ Otras validaciones funcionan (`answer > 0`, `updatedAt`, staleness)
- 🎯 **Solución:** Verificar en testnet con Chainlink real

### Arquitectura Actual

```
BASHOOD Project
  ├── ChainlinkPriceFeed.sol (wrapper con validaciones)
  │   └── IPriceFeed interface (AggregatorV3Interface compatible)
  │       
  ├── MockPriceFeed.sol (tests locales)
  │   └── ❌ NO replica comportamiento Chainlink 100%
  │
  └── Test: debug.chainlinkpricefeed.test.js
      └── ❌ Solo detecta que NO revierte (workaround)
```

**Limitaciones MockPriceFeed:**
- ✅ Replica `latestRoundData()` básico
- ❌ No replica lógica real de `answeredInRound` vs `roundId`
- ❌ No simula multi-round updates realistas
- ❌ No simula stale data conditions reales

---

## 🎯 OPCIONES DE TESTING CHAINLINK

### Opción 1: Chainlink Price Feeds (Testnets) ✅ **RECOMENDADO**

**Ventajas:**
- ✅ **Oráculos Chainlink reales** (comportamiento 100% idéntico a mainnet)
- ✅ **Gratuito** (no requiere LINK tokens)
- ✅ **Fácil integración** (direcciones públicas documentadas)
- ✅ **Múltiples pares** (ETH/USD, BTC/USD, etc.)
- ✅ **Histórico real** (puedes ver rounds antiguos)

**Testnets Disponibles:**

| Red | ChainID | ETH/USD Feed | Faucet |
|-----|---------|--------------|--------|
| **Base Sepolia** | 84532 | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` | [Chainlink Faucet](https://faucets.chain.link/base-sepolia) |
| Ethereum Sepolia | 11155111 | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | [Alchemy](https://sepoliafaucet.com/) |
| Polygon Mumbai | 80001 | `0x0715A7794a1dc8e42615F059dD6e406A6594651A` | [Polygon Faucet](https://faucet.polygon.technology/) |
| Avalanche Fuji | 43113 | `0x31CF013A08c6Ac228C94551d535d5BAfE19c602a` | [Avax Faucet](https://core.app/tools/testnet-faucet/) |

**Documentación Oficial:**
- Base Sepolia: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1#base-sepolia
- Ethereum Sepolia: https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet

### Opción 2: MockV3Aggregator Oficial de Chainlink ✅ **PARA TESTS LOCALES**

**Ventajas:**
- ✅ **Mock oficial** de Chainlink (comportamiento verificado)
- ✅ Mejor que MockPriceFeed custom
- ✅ Permite simular edge cases (stale data, rounds inconsistentes)
- ✅ Usado en contratos Chainlink oficiales

**Instalación:**
```bash
npm install --save-dev @chainlink/contracts
```

**Uso:**
```solidity
// En tests Hardhat
import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";

// Deploy
MockV3Aggregator mockFeed = new MockV3Aggregator(
    8,                           // decimals
    200000000000                 // initial answer (2000 USD × 10^8)
);

// Simular nuevo round
mockFeed.updateRoundData(
    2,                          // roundId
    200000000000,               // answer
    block.timestamp,            // startedAt
    block.timestamp,            // updatedAt
    2                           // answeredInRound (mismo que roundId = válido)
);

// Simular stale data
mockFeed.updateRoundData(
    3,                          // roundId actual
    200500000000,               // answer
    block.timestamp,            // startedAt
    block.timestamp,            // updatedAt
    2                           // answeredInRound < roundId = STALE ❌
);
```

### Opción 3: Foundry Forking (Mainnet Real) ✅ **PARA CI/CD**

**Ventajas:**
- ✅ **Fork mainnet real** (datos históricos reales)
- ✅ Zero configuración oracles (usa mainnet directamente)
- ✅ Perfecto para CI/CD (GitHub Actions)
- ✅ Replay ataques históricos

**Configuración `foundry.toml`:**
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["node_modules", "lib"]

# Fork mainnet Base
[rpc_endpoints]
base_mainnet = "https://mainnet.base.org"
base_sepolia = "https://sepolia.base.org"

[profile.fork]
fork_url = "${BASE_MAINNET_RPC_URL}"
fork_block_number = 12345678  # Bloque específico para reproducibilidad
```

**Test Foundry:**
```solidity
// test/foundry/ChainlinkOracle.t.sol
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../contracts/oracles/ChainlinkPriceFeed.sol";

contract ChainlinkOracleTest is Test {
    ChainlinkPriceFeed priceFeed;
    
    // Base Mainnet ETH/USD feed
    address constant CHAINLINK_ETH_USD = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    
    function setUp() public {
        // Fork Base mainnet
        vm.createSelectFork(vm.envString("BASE_MAINNET_RPC_URL"));
        
        // Deploy wrapper con feed real
        priceFeed = new ChainlinkPriceFeed(CHAINLINK_ETH_USD);
    }
    
    function testRealChainlinkPrice() public {
        (int256 price, uint8 decimals, uint256 updatedAt) = priceFeed.getLatestPrice();
        
        assertGt(price, 0, "Price should be positive");
        assertEq(decimals, 8, "Should be 8 decimals");
        assertGt(updatedAt, 0, "UpdatedAt should be set");
        
        // Verificar rango realista (ETH entre $500-$10k)
        uint256 priceUSD = uint256(price) / (10 ** decimals);
        assertGt(priceUSD, 500, "ETH should be > $500");
        assertLt(priceUSD, 10000, "ETH should be < $10k");
    }
    
    function testAnsweredInRoundValidation() public view {
        // Con oracle real, esta validación SÍ ejecuta
        AggregatorV3Interface feed = AggregatorV3Interface(CHAINLINK_ETH_USD);
        
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        
        // Estas validaciones PASAN con oracle real
        assertTrue(answeredInRound >= roundId, "Oracle should not be stale");
        assertGt(updatedAt, block.timestamp - 1 hours, "Price updated within 1h");
    }
}
```

**Ejecutar:**
```bash
# Export RPC (puedes usar RPC público)
export BASE_MAINNET_RPC_URL="https://mainnet.base.org"

# Run tests con fork
forge test --fork-url $BASE_MAINNET_RPC_URL -vvv
```

### Opción 4: Chainlink Local Node ⚠️ **NO RECOMENDADO**

**Ventajas:**
- ✅ Control total del oracle
- ✅ Testing sin depender de testnet

**Desventajas:**
- ❌ **Complejidad extrema** (Docker, Postgres, External Adapters)
- ❌ Requiere LINK tokens (incluso localmente)
- ❌ No replica comportamiento mainnet 100%
- ❌ Mantenimiento constante

**Veredicto:** Solo para proyectos que desarrollan Chainlink nodes.

---

## ✅ SOLUCIÓN RECOMENDADA

### Estrategia Híbrida (Best Practice)

```
┌─────────────────────────────────────────────────────────────┐
│ NIVEL 1: Tests Locales (Rápido, Desarrollo)                │
│ ----------------------------------------------------------- │
│ • MockV3Aggregator oficial Chainlink                       │
│ • Hardhat tests con edge cases                             │
│ • Coverage: 100% branches                                   │
│ • Tiempo: ~30 segundos                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ NIVEL 2: Testnet Integration (Realista, Pre-Deploy)        │
│ ----------------------------------------------------------- │
│ • Base Sepolia con Chainlink ETH/USD real                  │
│ • Smoke tests manuales                                      │
│ • Verifica answeredInRound con oracle real                 │
│ • Tiempo: ~5 minutos                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ NIVEL 3: Mainnet Fork (Exacto, CI/CD)                      │
│ ----------------------------------------------------------- │
│ • Foundry fork Base mainnet                                 │
│ • GitHub Actions automated tests                            │
│ • Replay conditions reales                                  │
│ • Tiempo: ~2 minutos                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ NIVEL 4: Mainnet Deploy (Producción)                       │
│ ----------------------------------------------------------- │
│ • Chainlink ETH/USD mainnet                                 │
│ • Monitoring 24/7 (Tenderly, Defender)                     │
│ • Uptime SLA monitoring                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ IMPLEMENTACIÓN PASO A PASO

### PASO 1: Instalar MockV3Aggregator Oficial

```bash
# Instalar Chainlink contracts
npm install --save-dev @chainlink/contracts

# Verificar instalación
ls node_modules/@chainlink/contracts/src/v0.8/tests/
# Debería mostrar: MockV3Aggregator.sol
```

### PASO 2: Crear Test Mejorado con MockV3Aggregator

**Archivo:** `test/chainlink.oracle.comprehensive.test.js`

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Chainlink Oracle - Comprehensive Testing", function () {
    let priceFeed;
    let mockAggregator;
    let owner;

    const DECIMALS = 8;
    const INITIAL_PRICE = ethers.parseUnits("2000", DECIMALS); // $2000 USD

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Deploy MockV3Aggregator OFICIAL de Chainlink
        const MockV3Aggregator = await ethers.getContractFactory(
            "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol:MockV3Aggregator"
        );
        mockAggregator = await MockV3Aggregator.deploy(DECIMALS, INITIAL_PRICE);

        // Deploy nuestro wrapper
        const ChainlinkPriceFeed = await ethers.getContractFactory(
            "contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed"
        );
        priceFeed = await ChainlinkPriceFeed.deploy(await mockAggregator.getAddress());
    });

    describe("✅ Valid Oracle Responses", function () {
        it("should accept valid price with answeredInRound == roundId", async function () {
            // Simular update válido
            const currentBlock = await ethers.provider.getBlock("latest");
            await mockAggregator.updateRoundData(
                1,                          // roundId
                INITIAL_PRICE,              // answer
                currentBlock.timestamp,     // startedAt
                currentBlock.timestamp,     // updatedAt
                1                           // answeredInRound (igual a roundId)
            );

            const [price, decimals, updatedAt] = await priceFeed.getLatestPrice();
            expect(price).to.equal(INITIAL_PRICE);
            expect(decimals).to.equal(DECIMALS);
        });

        it("should accept answeredInRound > roundId (multi-aggregator scenario)", async function () {
            const currentBlock = await ethers.provider.getBlock("latest");
            await mockAggregator.updateRoundData(
                5,                          // roundId
                INITIAL_PRICE,              // answer
                currentBlock.timestamp,     // startedAt
                currentBlock.timestamp,     // updatedAt
                6                           // answeredInRound MAYOR (válido)
            );

            await expect(priceFeed.getLatestPrice()).to.not.be.reverted;
        });
    });

    describe("❌ Stale Data Detection", function () {
        it("should REVERT when answeredInRound < roundId", async function () {
            const currentBlock = await ethers.provider.getBlock("latest");
            
            // Simular STALE data
            await mockAggregator.updateRoundData(
                10,                         // roundId actual
                INITIAL_PRICE,              // answer
                currentBlock.timestamp,     // startedAt
                currentBlock.timestamp,     // updatedAt
                8                           // answeredInRound < roundId ❌
            );

            await expect(priceFeed.getLatestPrice())
                .to.be.revertedWith("stale: answeredInRound < roundId");
        });

        it("should REVERT when updatedAt is too old", async function () {
            const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 segundos atrás
            
            await mockAggregator.updateRoundData(
                1,
                INITIAL_PRICE,
                oldTimestamp,
                oldTimestamp,               // updatedAt antiguo
                1
            );

            // Avanzar tiempo en blockchain
            await ethers.provider.send("evm_increaseTime", [400]);
            await ethers.provider.send("evm_mine");

            await expect(priceFeed.getLatestPrice())
                .to.be.revertedWith("stale");
        });

        it("should REVERT when answeredInRound is 0", async function () {
            const currentBlock = await ethers.provider.getBlock("latest");
            
            await mockAggregator.updateRoundData(
                1,
                INITIAL_PRICE,
                currentBlock.timestamp,
                currentBlock.timestamp,
                0                           // answeredInRound = 0 ❌
            );

            await expect(priceFeed.getLatestPrice())
                .to.be.revertedWith("invalid: answeredInRound=0");
        });
    });

    describe("🔒 Sanity Checks", function () {
        it("should REVERT when price is 0 or negative", async function () {
            const currentBlock = await ethers.provider.getBlock("latest");
            
            await mockAggregator.updateRoundData(
                1,
                0,                          // answer = 0 ❌
                currentBlock.timestamp,
                currentBlock.timestamp,
                1
            );

            await expect(priceFeed.getLatestPrice())
                .to.be.revertedWith("invalid: answer<=0");
        });

        it("should REVERT when price change > maxChangePct", async function () {
            const currentBlock = await ethers.provider.getBlock("latest");
            
            // Primera llamada válida (establece lastValidAnswer)
            await mockAggregator.updateRoundData(1, INITIAL_PRICE, currentBlock.timestamp, currentBlock.timestamp, 1);
            await priceFeed.getLatestPrice();

            // Segunda llamada: +60% cambio (límite default 50%)
            const hugeIncrease = INITIAL_PRICE * 160n / 100n; // +60%
            await mockAggregator.updateRoundData(2, hugeIncrease, currentBlock.timestamp + 1, currentBlock.timestamp + 1, 2);

            await expect(priceFeed.getLatestPrice())
                .to.be.revertedWith("change too large");
        });
    });

    describe("⚙️ Configuration Changes", function () {
        it("should update staleness threshold", async function () {
            await priceFeed.setStalenessThreshold(600); // 10 minutos
            expect(await priceFeed.stalenessThreshold()).to.equal(600);
        });

        it("should update max change percentage", async function () {
            await priceFeed.setMaxChangePct(75); // 75% max
            expect(await priceFeed.maxChangePct()).to.equal(75);
        });

        it("should update feed address", async function () {
            const newMock = await (await ethers.getContractFactory(
                "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol:MockV3Aggregator"
            )).deploy(DECIMALS, INITIAL_PRICE);

            await priceFeed.setFeed(await newMock.getAddress());
            expect(await priceFeed.feed()).to.equal(await newMock.getAddress());
        });
    });
});
```

**Ejecutar:**
```bash
npx hardhat test test/chainlink.oracle.comprehensive.test.js
```

### PASO 3: Deploy y Testing en Base Sepolia

**Script:** `scripts/test-chainlink-sepolia.js`

```javascript
const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 Testing Chainlink Oracle on Base Sepolia...\n");

    // Base Sepolia Chainlink ETH/USD feed
    const CHAINLINK_ETH_USD_SEPOLIA = "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";

    // Deploy wrapper
    const ChainlinkPriceFeed = await ethers.getContractFactory(
        "contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed"
    );
    console.log("📦 Deploying ChainlinkPriceFeed...");
    const priceFeed = await ChainlinkPriceFeed.deploy(CHAINLINK_ETH_USD_SEPOLIA);
    await priceFeed.waitForDeployment();
    console.log(`✅ Deployed at: ${await priceFeed.getAddress()}\n`);

    // Test getLatestPrice()
    console.log("🧪 Testing getLatestPrice()...");
    try {
        const tx = await priceFeed.getLatestPrice();
        const receipt = await tx.wait();
        console.log(`✅ Transaction successful: ${receipt.hash}`);
        
        // Read return values from events or state
        const [price, decimals, updatedAt] = await priceFeed.peekLatestPrice();
        console.log(`   Price: ${ethers.formatUnits(price, decimals)} USD`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Updated At: ${new Date(Number(updatedAt) * 1000).toISOString()}\n`);
    } catch (error) {
        console.error(`❌ getLatestPrice() failed: ${error.message}\n`);
    }

    // Test direct aggregator read
    console.log("🔍 Reading Chainlink Aggregator directly...");
    const aggregator = await ethers.getContractAt(
        "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface",
        CHAINLINK_ETH_USD_SEPOLIA
    );

    const [roundId, answer, startedAt, updatedAt, answeredInRound] = await aggregator.latestRoundData();
    console.log(`   Round ID: ${roundId}`);
    console.log(`   Answer: ${answer} (${ethers.formatUnits(answer, 8)} USD)`);
    console.log(`   Started At: ${new Date(Number(startedAt) * 1000).toISOString()}`);
    console.log(`   Updated At: ${new Date(Number(updatedAt) * 1000).toISOString()}`);
    console.log(`   Answered In Round: ${answeredInRound}`);
    console.log(`   ✅ answeredInRound >= roundId: ${answeredInRound >= roundId}\n`);

    // Historical rounds
    console.log("📊 Reading last 5 rounds...");
    for (let i = 0; i < 5; i++) {
        const targetRound = BigInt(roundId) - BigInt(i);
        try {
            const [rid, ans, , upd, air] = await aggregator.getRoundData(targetRound);
            console.log(`   Round ${rid}: $${ethers.formatUnits(ans, 8)} | answeredInRound=${air} | ${air >= rid ? "✅" : "⚠️"}`);
        } catch (err) {
            console.log(`   Round ${targetRound}: ❌ Not found`);
        }
    }

    console.log("\n✅ Chainlink Oracle testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

**Configuración Hardhat:**

```javascript
// hardhat.config.cjs (añadir network)
module.exports = {
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532
    }
  }
};
```

**Ejecutar:**
```bash
# Exportar private key (wallet con ETH en Sepolia)
export PRIVATE_KEY="0xTU_PRIVATE_KEY_AQUI"

# Deploy y test
npx hardhat run scripts/test-chainlink-sepolia.js --network baseSepolia
```

### PASO 4: Foundry Fork Tests (CI/CD)

**Archivo:** `test/foundry/ChainlinkIntegration.t.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../contracts/oracles/ChainlinkPriceFeed.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ChainlinkIntegrationTest is Test {
    ChainlinkPriceFeed priceFeed;
    
    // Base Mainnet Chainlink feeds
    address constant ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    address constant BTC_USD_FEED = 0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F;
    
    function setUp() public {
        // Fork Base mainnet en bloque específico
        vm.createSelectFork(
            vm.envString("BASE_MAINNET_RPC_URL"),
            10000000  // Bloque específico para reproducibilidad
        );
        
        priceFeed = new ChainlinkPriceFeed(ETH_USD_FEED);
    }
    
    function testRealChainlinkAnsweredInRound() public {
        // Esta es la prueba CRÍTICA que falla en mocks
        AggregatorV3Interface feed = AggregatorV3Interface(ETH_USD_FEED);
        
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        
        // Con oracle REAL, estas validaciones PASAN
        assertGt(updatedAt, 0, "updatedAt should be set");
        assertGt(answer, 0, "Price should be positive");
        assertGt(answeredInRound, 0, "answeredInRound should be set");
        assertTrue(answeredInRound >= roundId, "Oracle should not be stale");
        
        emit log_named_uint("Round ID", roundId);
        emit log_named_int("Price", answer);
        emit log_named_uint("Answered In Round", answeredInRound);
        emit log_string(answeredInRound >= roundId ? "✅ Valid" : "❌ Stale");
    }
    
    function testPriceFeedValidations() public {
        // Test nuestro wrapper con oracle real
        (int256 price, uint8 decimals, uint256 updatedAt) = priceFeed.getLatestPrice();
        
        assertGt(price, 0, "Price should be positive");
        assertEq(decimals, 8, "Should be 8 decimals");
        assertGt(updatedAt, 0, "UpdatedAt should be set");
        
        // Precio realista (ETH $500-$10k)
        uint256 priceUSD = uint256(price) / (10 ** decimals);
        assertGt(priceUSD, 500, "ETH > $500");
        assertLt(priceUSD, 10000, "ETH < $10k");
        
        emit log_named_decimal_uint("ETH Price (USD)", uint256(price), decimals);
    }
    
    function testStalenessProtection() public {
        // Configurar staleness muy bajo
        priceFeed.setStalenessThreshold(1); // 1 segundo
        
        // Avanzar tiempo
        vm.warp(block.timestamp + 10);
        
        // Debería revertir por staleness
        vm.expectRevert("stale");
        priceFeed.getLatestPrice();
    }
    
    function testMultiplePriceFeeds() public {
        // ETH/USD
        ChainlinkPriceFeed ethFeed = new ChainlinkPriceFeed(ETH_USD_FEED);
        (int256 ethPrice,,) = ethFeed.getLatestPrice();
        
        // BTC/USD
        ChainlinkPriceFeed btcFeed = new ChainlinkPriceFeed(BTC_USD_FEED);
        (int256 btcPrice,,) = btcFeed.getLatestPrice();
        
        // BTC debería ser más caro que ETH
        assertGt(btcPrice, ethPrice, "BTC should be > ETH");
        
        emit log_named_decimal_uint("ETH", uint256(ethPrice), 8);
        emit log_named_decimal_uint("BTC", uint256(btcPrice), 8);
    }
}
```

**GitHub Actions CI:**

```yaml
# .github/workflows/chainlink-tests.yml
name: Chainlink Oracle Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  chainlink-fork-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      
      - name: Install dependencies
        run: |
          npm install
          forge install
      
      - name: Run Chainlink Fork Tests
        env:
          BASE_MAINNET_RPC_URL: ${{ secrets.BASE_MAINNET_RPC_URL }}
        run: |
          forge test --fork-url $BASE_MAINNET_RPC_URL --match-contract ChainlinkIntegrationTest -vvv
      
      - name: Generate coverage report
        run: |
          forge coverage --fork-url $BASE_MAINNET_RPC_URL --report lcov
```

---

## 📚 CHAINLINK TESTNET INTEGRATION

### Price Feeds Disponibles (Base Sepolia)

| Par | Dirección | Decimales | Heartbeat |
|-----|-----------|-----------|-----------|
| **ETH/USD** | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` | 8 | 60s |
| **BTC/USD** | `0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298` | 8 | 60s |
| **LINK/USD** | `0xb113F5A928BCfF189C998ab20d753a47F9dE5A61` | 8 | 60s |
| **USDC/USD** | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` | 8 | 86400s |

**Explorer:** https://sepolia.basescan.org/

### Script de Verificación Testnet

```javascript
// scripts/verify-chainlink-feeds.js
const FEEDS = {
    "ETH/USD": "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    "BTC/USD": "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
    "LINK/USD": "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
};

async function main() {
    for (const [pair, address] of Object.entries(FEEDS)) {
        console.log(`\n📊 ${pair} (${address})`);
        
        const feed = await ethers.getContractAt("AggregatorV3Interface", address);
        
        try {
            const [roundId, answer, , updatedAt, answeredInRound] = await feed.latestRoundData();
            const decimals = await feed.decimals();
            
            console.log(`   Price: $${ethers.formatUnits(answer, decimals)}`);
            console.log(`   Decimals: ${decimals}`);
            console.log(`   Round: ${roundId}`);
            console.log(`   Answered In Round: ${answeredInRound}`);
            console.log(`   Updated: ${new Date(Number(updatedAt) * 1000).toISOString()}`);
            console.log(`   Status: ${answeredInRound >= roundId ? "✅ Fresh" : "⚠️ Stale"}`);
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }
}

main();
```

---

## 🎯 TESTING AUTOMATIZADO CON FOUNDRY

### Configuración Completa

**1. Instalar Foundry (si no está instalado):**

```bash
# Windows (PowerShell)
irm https://sh.rustup.rs | iex
cargo install --git https://github.com/foundry-rs/foundry foundry-cli anvil chisel --bins --locked

# Verificar
forge --version
```

**2. Inicializar Foundry en proyecto:**

```bash
# Crear foundry.toml
cat > foundry.toml << 'EOF'
[profile.default]
src = "contracts"
out = "out"
libs = ["node_modules", "lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
via_ir = false

[rpc_endpoints]
base_mainnet = "${BASE_MAINNET_RPC_URL}"
base_sepolia = "https://sepolia.base.org"

[profile.ci]
fuzz = { runs = 10000 }
invariant = { runs = 1000 }
EOF
```

**3. Instalar dependencias Foundry:**

```bash
# Instalar Chainlink contracts
forge install smartcontractkit/chainlink --no-commit

# Instalar OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Instalar Forge Standard Library
forge install foundry-rs/forge-std --no-commit

# Crear remappings
forge remappings > remappings.txt
```

**4. Ejecutar tests:**

```bash
# Tests locales (sin fork)
forge test -vvv

# Tests con fork Base Sepolia
forge test --fork-url https://sepolia.base.org -vvv

# Tests con fork Base Mainnet
export BASE_MAINNET_RPC_URL="https://mainnet.base.org"
forge test --fork-url $BASE_MAINNET_RPC_URL -vvv

# Solo tests de Chainlink
forge test --match-contract Chainlink -vvv

# Coverage
forge coverage --fork-url https://sepolia.base.org
```

---

## 🚀 CHAINLINK AUTOMATION TESTING

### Testing Chainlink Keepers/Automation

Si planeas usar Chainlink Automation para distribución automática de revenue:

**1. Implementar Keeper-Compatible Contract:**

```solidity
// contracts/revenue/RevenueDistributorKeeper.sol
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

contract RevenueDistributorKeeper is AutomationCompatibleInterface {
    uint256 public lastDistribution;
    uint256 public distributionInterval = 30 days;
    
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastDistribution) > distributionInterval;
        performData = "";
    }
    
    function performUpkeep(bytes calldata) external override {
        require((block.timestamp - lastDistribution) > distributionInterval, "Too soon");
        
        // Distribuir revenue
        _distributeRevenue();
        
        lastDistribution = block.timestamp;
    }
    
    function _distributeRevenue() internal {
        // Lógica de distribución
    }
}
```

**2. Registrar en Chainlink Automation UI:**

- Base Sepolia: https://automation.chain.link/base-sepolia
- Conectar wallet
- New Upkeep → Custom Logic
- Pegar dirección contrato
- Fund con LINK (faucet: https://faucets.chain.link/base-sepolia)

**3. Test Automation localmente:**

```javascript
// test/chainlink-automation.test.js
describe("Chainlink Automation", function() {
    it("should trigger upkeep after interval", async function() {
        const keeper = await deploy("RevenueDistributorKeeper");
        
        // Verificar upkeep NO necesario inicialmente
        let [needed] = await keeper.checkUpkeep("0x");
        expect(needed).to.be.false;
        
        // Avanzar 31 días
        await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        
        // Ahora SÍ necesita upkeep
        [needed] = await keeper.checkUpkeep("0x");
        expect(needed).to.be.true;
        
        // Ejecutar upkeep
        await keeper.performUpkeep("0x");
        
        // Verificar distribución ejecutada
        const lastDist = await keeper.lastDistribution();
        expect(lastDist).to.be.gt(0);
    });
});
```

---

## 📖 REFERENCIAS Y RECURSOS

### Documentación Oficial Chainlink

- **Price Feeds:** https://docs.chain.link/data-feeds/price-feeds
- **Base Network Feeds:** https://docs.chain.link/data-feeds/price-feeds/addresses?network=base
- **Automation (Keepers):** https://docs.chain.link/chainlink-automation/introduction
- **MockV3Aggregator:** https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/tests/MockV3Aggregator.sol

### Herramientas Testing

- **Hardhat:** https://hardhat.org/
- **Foundry:** https://book.getfoundry.sh/
- **Tenderly:** https://tenderly.co/ (monitoring & debugging)
- **OpenZeppelin Defender:** https://defender.openzeppelin.com/ (automation monitoring)

### Faucets

- **Base Sepolia:** https://faucets.chain.link/base-sepolia
- **Ethereum Sepolia:** https://sepoliafaucet.com/
- **LINK Faucet:** https://faucets.chain.link/

### Chainlink Market Status

- **Real-time Feeds Status:** https://data.chain.link/
- **Base Mainnet Feeds:** https://data.chain.link/base/mainnet
- **Base Sepolia Feeds:** https://data.chain.link/base/testnet

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Tests Locales Mejorados (1-2 días)

- [ ] Instalar `@chainlink/contracts`
- [ ] Reemplazar `MockPriceFeed` por `MockV3Aggregator` oficial
- [ ] Crear `test/chainlink.oracle.comprehensive.test.js`
- [ ] Test case: `answeredInRound < roundId` revierte ✅
- [ ] Test case: `answeredInRound >= roundId` pasa ✅
- [ ] Test case: staleness timeout
- [ ] Test case: price change limits
- [ ] Cobertura: 100% branches ChainlinkPriceFeed.sol

### Fase 2: Testnet Integration (3-5 días)

- [ ] Configurar `hardhat.config.cjs` con Base Sepolia
- [ ] Obtener ETH testnet (faucet)
- [ ] Deploy ChainlinkPriceFeed en Sepolia
- [ ] Script `test-chainlink-sepolia.js`
- [ ] Verificar `answeredInRound >= roundId` con oracle REAL ✅
- [ ] Smoke test: 10+ llamadas sin revert
- [ ] Verificar Etherscan (contract verification)

### Fase 3: Foundry Fork Tests (2-3 días)

- [ ] Instalar Foundry toolchain
- [ ] Crear `foundry.toml` configuración
- [ ] Instalar deps: `forge install smartcontractkit/chainlink`
- [ ] Crear `test/foundry/ChainlinkIntegration.t.sol`
- [ ] Test con fork Base Mainnet
- [ ] Integrar en GitHub Actions CI
- [ ] Coverage report automático

### Fase 4: Mainnet Deployment (Post-Audit)

- [ ] Auditoría externa (Trail of Bits/Certik)
- [ ] Deploy ChainlinkPriceFeed a Base Mainnet
- [ ] Configurar Tenderly monitoring
- [ ] Configurar OpenZeppelin Defender alerts
- [ ] Uptime monitoring (99.9% SLA)
- [ ] Incident response runbook

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Para Resolver Issue Actual

**1. Testnet Verification (MÁS RÁPIDO - 1 hora):**

```bash
# Terminal
export PRIVATE_KEY="0xTU_KEY"
npx hardhat run scripts/test-chainlink-sepolia.js --network baseSepolia
```

**Resultado esperado:** ✅ `answeredInRound >= roundId` PASA con oracle real

**2. MockV3Aggregator Integration (MÁS COMPLETO - 4 horas):**

```bash
# Instalar
npm install --save-dev @chainlink/contracts

# Ejecutar nuevos tests
npx hardhat test test/chainlink.oracle.comprehensive.test.js
```

**Resultado esperado:** ✅ 100% coverage con edge cases reales

**3. Foundry Fork (PARA CI/CD - 1 día):**

```bash
# Setup
forge install smartcontractkit/chainlink
export BASE_MAINNET_RPC_URL="https://mainnet.base.org"

# Test
forge test --fork-url $BASE_MAINNET_RPC_URL --match-contract ChainlinkIntegration -vvv
```

**Resultado esperado:** ✅ Tests contra oracles mainnet reales

---

**Documento creado:** 2 Febrero 2026  
**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Proyecto:** BASHOOD-RWA-1  
**Issue:** Chainlink `answeredInRound >= roundId` validation testing  

**Status:** 📘 GUÍA COMPLETA LISTA PARA IMPLEMENTACIÓN
