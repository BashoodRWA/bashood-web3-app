# Backup de Mejoras del Sistema de Oráculos - Bashood
## Fecha: 20 de Noviembre, 2025
## Rama: patch/rescue-pullpayment-2025-11-01

### Resumen de Modificaciones
Este backup contiene todas las mejoras implementadas en el sistema de oráculos de BashoodPresaleFinal para abordar los hallazgos de auditoría M-01, M-02, M-03.

### Archivos Modificados

#### 1. BashoodPresaleFinal.sol - Mejoras de Oráculos

**Ubicación:** `contracts/BashoodPresaleFinal.sol`

**Modificaciones realizadas:**

1. **Configuración de staleness configurable (líneas ~165-170):**
```solidity
/// @notice Configure maximum price staleness tolerance
/// @param newStaleness Maximum age in seconds for oracle prices
function setMaxPriceStaleness(uint32 newStaleness) external onlyRole(ADMIN_ROLE) {
    require(newStaleness > 0 && newStaleness <= 86400, "Invalid staleness: 1s-24h");
    maxPriceStaleness = newStaleness;
    emit MaxPriceStalenessChanged(newStaleness);
}
```

2. **Función helper para validación robusta de oráculos (líneas ~175-185):**
```solidity
/// @notice Get fresh and validated price from oracle
/// @dev Implements comprehensive staleness and validity checks
/// @return price Latest validated price from oracle
function _getFreshPrice() internal view returns (uint256 price) {
    require(address(priceFeed) != address(0), "PriceFeed not set");
    
    (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
    
    // Comprehensive validation following Chainlink best practices
    require(answer > 0, "Oracle: Invalid price");
    require(updatedAt > 0, "Oracle: Invalid timestamp");
    require(block.timestamp - updatedAt <= maxPriceStaleness, "Oracle: Price too stale");
    require(answeredInRound >= roundId, "Oracle: Incomplete round");
    require(startedAt > 0, "Oracle: Round not started");
    
    return uint256(answer);
}
```

3. **Uso simplificado en submitProposal (línea ~114):**
```solidity
// Validate oracle price using robust helper function
uint256 currentPrice = _getFreshPrice();
```

#### 2. Tests Completos del Sistema de Oráculos

**Ubicación:** `test/oracle.validation.fixed.test.js`

**Contenido completo de tests:**
```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployPresale } = require("./helpers/presaleHelpers");

describe("BashoodPresaleFinal - Oracle Validation Tests", function () {
    let bashoodToken, bashoodPresale, mockPriceFeed, bashoodNFT, bashoodReferral;
    let owner, buyer, other;

    beforeEach(async function () {
        ({ owner, buyer, presale: bashoodPresale, bht: bashoodToken } = await deployPresale());
        other = buyer; // Usar buyer como other para compatibilidad

        // Mock Chainlink Aggregator  
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("100", 8)); // decimals, $100 
        await mockPriceFeed.waitForDeployment();

        // Set the price feed
        await bashoodPresale.connect(owner).setPriceFeed(await mockPriceFeed.getAddress());
        
        // Set a non-zero staleness (required by the contract)
        await bashoodPresale.connect(owner).setMaxPriceStaleness(3600);
        
        // Set operations wallet
        await bashoodPresale.connect(owner).setOperationsWallet(other.address);
    });

    describe("Oracle Configuration", function () {
        it("Should set max price staleness correctly", async function () {
            const newStaleness = 7200; // 2 horas
            await bashoodPresale.connect(owner).setMaxPriceStaleness(newStaleness);
            expect(await bashoodPresale.maxPriceStaleness()).to.equal(newStaleness);
        });

        it("Should emit MaxPriceStalenessChanged event", async function () {
            const newStaleness = 1800; // 30 minutos
            await expect(bashoodPresale.connect(owner).setMaxPriceStaleness(newStaleness))
                .to.emit(bashoodPresale, "MaxPriceStalenessChanged")
                .withArgs(newStaleness);
        });

        it("Should reject staleness outside valid range", async function () {
            await expect(bashoodPresale.connect(owner).setMaxPriceStaleness(0))
                .to.be.revertedWith("Invalid staleness: 1s-24h");
            
            await expect(bashoodPresale.connect(owner).setMaxPriceStaleness(86401)) // > 24 horas
                .to.be.revertedWith("Invalid staleness: 1s-24h");
        });

        it("Should only allow admin to set staleness", async function () {
            await expect(bashoodPresale.connect(buyer).setMaxPriceStaleness(1800))
                .to.be.reverted;
        });
    });

    describe("Oracle Price Validation", function () {
        it("Should accept fresh price data", async function () {
            // Mock fresh data
            await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
            
            // Should not revert when submitting proposal with fresh data
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal(buyer.address, 1000, deposit)
            ).to.not.be.reverted;
        });

        it("Should reject stale price data", async function () {
            // Set short staleness period
            await bashoodPresale.connect(owner).setMaxPriceStaleness(60); // 1 minuto
            
            // Update price and fast-forward time to make it stale
            await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
            await time.increase(120); // 2 minutos después
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal(buyer.address, 1000, deposit)
            ).to.be.revertedWith("Oracle: Price too stale");
        });

        it("Should reject zero price data", async function () {
            // Mock zero price
            await mockPriceFeed.setAnswer(0);
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal(buyer.address, 1000, deposit)
            ).to.be.revertedWith("Oracle: Invalid price");
        });

        it("Should reject negative price data", async function () {
            // Mock negative price
            await mockPriceFeed.setAnswer(-ethers.parseUnits("100", 8));
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal(buyer.address, 1000, deposit)
            ).to.be.revertedWith("Oracle: Invalid price");
        });
    });
});
```

#### 3. Tests Simplificados del Sistema

**Ubicación:** `test/oracle.simple.test.js`

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Oracle System - Direct Function Tests", function () {
    let mockPriceFeed;

    beforeEach(async function () {
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("100", 8));
        await mockPriceFeed.waitForDeployment();
    });

    it("Should work with fresh price data", async function () {
        const result = await mockPriceFeed.latestRoundData();
        expect(result[1]).to.equal(ethers.parseUnits("100", 8)); // answer
        expect(result[3]).to.be.gt(0); // updatedAt should be > 0
    });

    it("Should update price correctly", async function () {
        await mockPriceFeed.setAnswer(ethers.parseUnits("200", 8));
        const result = await mockPriceFeed.latestRoundData();
        expect(result[1]).to.equal(ethers.parseUnits("200", 8));
    });
});
```

### Problemas Identificados y Soluciones

#### 1. Problema: Contract Size Limit
**Error:** `Contract code size is 24693 bytes and exceeds 24576 bytes`

**Causa:** Las modificaciones del sistema de oráculos agregaron código adicional que supera el límite de Spurious Dragon.

**Soluciones propuestas:**
1. Aumentar optimización del compilador
2. Usar librerías para funciones auxiliares
3. Simplificar código duplicado

#### 2. Problema: Constructor Parameters
**Error:** `incorrect number of arguments to constructor`

**Causa:** BashoodPresaleFinal requiere 9 parámetros en el constructor, pero los tests simplificados solo pasaban 3.

**Solución:** Usar el helper `deployPresale()` existente que maneja correctamente todos los parámetros.

#### 3. Problema: Mock Contract Compatibility
**Error:** Múltiples contratos MockPriceFeed disponibles

**Solución:** Usar la ruta completa `contracts/mocks/MockPriceFeed.sol:MockPriceFeed` con constructor `(decimals, answer)`.

### Estado Actual
- ✅ Código de oráculos implementado en BashoodPresaleFinal.sol
- ✅ Tests completos creados
- ❌ Tests fallan por tamaño de contrato
- 🔄 Pendiente: Optimización de compilador o refactorización

### Próximos Pasos Recomendados
1. Implementar optimización agresiva del compilador
2. Considerar separar funcionalidades en librerías
3. Ejecutar tests simplificados para validar lógica
4. Documentar las mejoras en el informe de auditoría

### Archivos de Respaldo
- `contracts/BashoodPresaleFinal.sol` (con modificaciones)
- `test/oracle.validation.fixed.test.js` (tests completos)
- `test/oracle.simple.test.js` (tests simplificados)
- `test/mockpricefeed.test.js` (validación de mock)

### Comandos para Restaurar
```bash
# Para ejecutar tests específicos
npx hardhat test test/oracle.simple.test.js
npx hardhat test test/mockpricefeed.test.js

# Para verificar compilación
npx hardhat compile

# Para limpiar y recompilar
npx hardhat clean
npx hardhat compile
```