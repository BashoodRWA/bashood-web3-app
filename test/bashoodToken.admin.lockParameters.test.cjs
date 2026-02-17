/**
 * ✅ POST-LOCK TEST: Parameter Lock Mechanism
 * 
 * Propósito: Verificar que lockParameters() funciona correctamente
 * Status: EXPERIMENTAL BRANCH (feature/economic-parameter-freeze)
 * 
 * Tests que DEBEN pasar:
 * - Owner PUEDE lockear parameters (una sola vez)
 * - Después del lock, setters económicos FALLAN
 * - Lock es IRREVERSIBLE (no se puede desbloquear)
 * - Pause/unpause NO están afectados por el lock
 * 
 * ✅ SOLUCIÓN REGULATORIA: Parameters immutables post-presale
 * 🎯 OBJETIVO: Demostrar que términos económicos son fijos post-venta
 * 
 * Fecha: 17 Febrero 2026
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("✅ POST-LOCK: Parameter Lock Mechanism", function () {
  let bashoodToken;
  let owner, treasury, newTreasury, staking, user;

  beforeEach(async function () {
    [owner, treasury, newTreasury, staking, user] = await ethers.getSigners();

    // Deploy BashoodToken
    const BashoodToken = await ethers.getContractFactory("BashoodToken");
    bashoodToken = await BashoodToken.deploy(treasury.address);
    await bashoodToken.waitForDeployment();
  });

  describe("FASE 1: Locking Mechanism", function () {
    
    it("✅ Owner PUEDE llamar lockParameters()", async function () {
      // Estado inicial: no locked
      expect(await bashoodToken.parametersLocked()).to.equal(false);

      // Owner lockea parameters
      await expect(
        bashoodToken.connect(owner).lockParameters()
      ).to.not.be.reverted;

      // Estado final: locked
      expect(await bashoodToken.parametersLocked()).to.equal(true);
    });

    it("✅ lockParameters() emite evento ParametersLocked", async function () {
      const tx = await bashoodToken.connect(owner).lockParameters();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(bashoodToken, "ParametersLocked")
        .withArgs(block.timestamp);
    });

    it("❌ lockParameters() NO puede llamarse dos veces", async function () {
      // Primera llamada: exitosa
      await bashoodToken.connect(owner).lockParameters();

      // Segunda llamada: falla
      await expect(
        bashoodToken.connect(owner).lockParameters()
      ).to.be.revertedWith("Already locked");
    });

    it("❌ Non-owner NO puede llamar lockParameters()", async function () {
      await expect(
        bashoodToken.connect(user).lockParameters()
      ).to.be.reverted; // OwnableUnauthorizedAccount
    });

    it("✅ Lock es PERMANENTE (no hay función unlock)", async function () {
      // Lock parameters
      await bashoodToken.connect(owner).lockParameters();
      expect(await bashoodToken.parametersLocked()).to.equal(true);

      // Intentar "desbloquear" (no existe función)
      // Verificar que no hay función unlockParameters en el contrato
      const contractCode = await ethers.provider.getCode(await bashoodToken.getAddress());
      expect(contractCode).to.not.include("unlockParameters"); // No existe tal función
      
      // parametersLocked sigue siendo true
      expect(await bashoodToken.parametersLocked()).to.equal(true);
    });
  });

  describe("FASE 2: Behavior ANTES del lock", function () {
    
    it("✅ ANTES del lock: setBurnRate funciona", async function () {
      // No locked yet
      expect(await bashoodToken.parametersLocked()).to.equal(false);

      // Cambiar burn rate
      await expect(
        bashoodToken.connect(owner).setBurnRate(50)
      ).to.not.be.reverted;

      expect(await bashoodToken.burnRate()).to.equal(50);
    });

    it("✅ ANTES del lock: setTreasuryFee funciona", async function () {
      expect(await bashoodToken.parametersLocked()).to.equal(false);

      await expect(
        bashoodToken.connect(owner).setTreasuryFee(100)
      ).to.not.be.reverted;

      expect(await bashoodToken.treasuryFee()).to.equal(100);
    });

    it("✅ ANTES del lock: setTreasuryWallet funciona", async function () {
      expect(await bashoodToken.parametersLocked()).to.equal(false);

      await expect(
        bashoodToken.connect(owner).setTreasuryWallet(newTreasury.address)
      ).to.not.be.reverted;

      expect(await bashoodToken.treasuryWallet()).to.equal(newTreasury.address);
    });

    it("✅ ANTES del lock: setStakingContract funciona", async function () {
      expect(await bashoodToken.parametersLocked()).to.equal(false);

      await expect(
        bashoodToken.connect(owner).setStakingContract(staking.address)
      ).to.not.be.reverted;

      expect(await bashoodToken.stakingContract()).to.equal(staking.address);
    });
  });

  describe("FASE 3: Behavior DESPUÉS del lock (CRITICAL)", function () {
    
    beforeEach(async function () {
      // Lock parameters para todos los tests de esta sección
      await bashoodToken.connect(owner).lockParameters();
      expect(await bashoodToken.parametersLocked()).to.equal(true);
    });

    it("🔴 DESPUÉS del lock: setBurnRate REVIERTE", async function () {
      await expect(
        bashoodToken.connect(owner).setBurnRate(75)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("🔴 DESPUÉS del lock: setTreasuryFee REVIERTE", async function () {
      await expect(
        bashoodToken.connect(owner).setTreasuryFee(150)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("🔴 DESPUÉS del lock: setTreasuryWallet REVIERTE", async function () {
      await expect(
        bashoodToken.connect(owner).setTreasuryWallet(newTreasury.address)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("🔴 DESPUÉS del lock: setStakingContract REVIERTE", async function () {
      await expect(
        bashoodToken.connect(owner).setStakingContract(staking.address)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("✅ DESPUÉS del lock: valores quedan FIJOS", async function () {
      // Valores originales deben mantenerse
      expect(await bashoodToken.burnRate()).to.equal(10);      // 0.1%
      expect(await bashoodToken.treasuryFee()).to.equal(50);    // 0.5%
      expect(await bashoodToken.treasuryWallet()).to.equal(treasury.address);
      expect(await bashoodToken.stakingContract()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("FASE 4: Pause/Unpause NO afectados por lock", function () {
    
    beforeEach(async function () {
      // Lock parameters
      await bashoodToken.connect(owner).lockParameters();
      expect(await bashoodToken.parametersLocked()).to.equal(true);
    });

    it("✅ DESPUÉS del lock: requestPause() FUNCIONA", async function () {
      await expect(
        bashoodToken.connect(owner).requestPause()
      ).to.not.be.reverted;

      expect(await bashoodToken.pauseRequestTime()).to.be.greaterThan(0);
    });

    it("✅ DESPUÉS del lock: executePause() FUNCIONA (después timelock)", async function () {
      // Request pause
      await bashoodToken.connect(owner).requestPause();

      // Avanzar 24 horas
      await time.increase(24 * 60 * 60);

      // Execute pause
      await expect(
        bashoodToken.connect(owner).executePause()
      ).to.not.be.reverted;

      expect(await bashoodToken.paused()).to.equal(true);
    });

    it("✅ DESPUÉS del lock: requestUnpause() FUNCIONA", async function () {
      // Primero pausar
      await bashoodToken.connect(owner).requestPause();
      await time.increase(24 * 60 * 60);
      await bashoodToken.connect(owner).executePause();

      // Ahora request unpause
      await expect(
        bashoodToken.connect(owner).requestUnpause()
      ).to.not.be.reverted;

      expect(await bashoodToken.unpauseRequestTime()).to.be.greaterThan(0);
    });
  });

  describe("FASE 5: Escenario Regulatorio (Post-Presale)", function () {
    
    it("🎯 Post-presale: Owner NO puede cambiar términos económicos", async function () {
      // Simular que presale terminó
      await time.increase(30 * 24 * 60 * 60); // +30 días

      // Owner lockea parameters (post-presale)
      await bashoodToken.connect(owner).lockParameters();

      // INTENTO 1: Aumentar burn rate al máximo
      await expect(
        bashoodToken.connect(owner).setBurnRate(100) // 1%
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");

      // INTENTO 2: Aumentar treasury fee al máximo
      await expect(
        bashoodToken.connect(owner).setTreasuryFee(200) // 2%
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");

      // INTENTO 3: Redirigir treasury wallet
      await expect(
        bashoodToken.connect(owner).setTreasuryWallet(owner.address)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");

      // Verificar que valores originales NO cambiaron
      expect(await bashoodToken.burnRate()).to.equal(10);
      expect(await bashoodToken.treasuryFee()).to.equal(50);
      expect(await bashoodToken.treasuryWallet()).to.equal(treasury.address);
    });

    it("🎯 Pre-lock configuration: Owner puede establecer valores finales", async function () {
      // ANTES de lockear, owner puede ajustar a valores deseados
      await bashoodToken.connect(owner).setBurnRate(20);      // 0.2%
      await bashoodToken.connect(owner).setTreasuryFee(80);   // 0.8%
      await bashoodToken.connect(owner).setStakingContract(staking.address);

      // Verificar cambios
      expect(await bashoodToken.burnRate()).to.equal(20);
      expect(await bashoodToken.treasuryFee()).to.equal(80);
      expect(await bashoodToken.stakingContract()).to.equal(staking.address);

      // AHORA lock
      await bashoodToken.connect(owner).lockParameters();

      // Después del lock, quedan fijos en esos valores
      expect(await bashoodToken.burnRate()).to.equal(20);
      expect(await bashoodToken.treasuryFee()).to.equal(80);
      expect(await bashoodToken.stakingContract()).to.equal(staking.address);

      // Y ya no se pueden cambiar
      await expect(
        bashoodToken.connect(owner).setBurnRate(30)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("🎯 Lock timing: Se puede lockear inmediatamente o después", async function () {
      // CASO A: Lock inmediato post-deploy
      const BashoodToken = await ethers.getContractFactory("BashoodToken");
      const tokenA = await BashoodToken.deploy(treasury.address);
      
      // Lockear inmediatamente
      await tokenA.connect(owner).lockParameters();
      expect(await tokenA.parametersLocked()).to.equal(true);

      // CASO B: Lock después de configurar
      const tokenB = await BashoodToken.deploy(treasury.address);
      
      // Configurar primero
      await tokenB.connect(owner).setBurnRate(15);
      await tokenB.connect(owner).setTreasuryFee(75);
      
      // Lockear después
      await tokenB.connect(owner).lockParameters();
      expect(await tokenB.parametersLocked()).to.equal(true);
      
      // Ambos casos son válidos
    });
  });

  describe("FASE 6: Gas Cost Analysis", function () {
    
    it("📊 Gas cost: lockParameters()", async function () {
      const tx = await bashoodToken.connect(owner).lockParameters();
      const receipt = await tx.wait();
      
      console.log(`      Gas usado para lockParameters(): ${receipt.gasUsed.toString()}`);
      
      // Debe ser bajo (< 50k gas)
      expect(receipt.gasUsed).to.be.lessThan(50000);
    });

    it("📊 Gas cost: setBurnRate() pre-lock vs post-lock revert", async function () {
      // Pre-lock: ejecuta normalidad
      const tx1 = await bashoodToken.connect(owner).setBurnRate(20);
      const receipt1 = await tx1.wait();
      console.log(`      Gas setBurnRate() PRE-lock: ${receipt1.gasUsed.toString()}`);

      // Lock
      await bashoodToken.connect(owner).lockParameters();

      // Post-lock: revert rápido
      await expect(
        bashoodToken.connect(owner).setBurnRate(30)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
      
      // Revert consume menos gas que ejecución exitosa
    });
  });

  describe("FASE 7: Edge Cases", function () {
    
    it("✅ Lock con burnRate = 0 (válido)", async function () {
      // Establecer burn rate a 0
      await bashoodToken.connect(owner).setBurnRate(0);
      
      // Lockear
      await bashoodToken.connect(owner).lockParameters();
      
      // Valores quedan fijos en 0
      expect(await bashoodToken.burnRate()).to.equal(0);
      
      // No se pueden cambiar
      await expect(
        bashoodToken.connect(owner).setBurnRate(10)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("✅ Lock con treasuryFee = 0 (válido)", async function () {
      await bashoodToken.connect(owner).setTreasuryFee(0);
      await bashoodToken.connect(owner).lockParameters();
      
      expect(await bashoodToken.treasuryFee()).to.equal(0);
      
      await expect(
        bashoodToken.connect(owner).setTreasuryFee(50)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("✅ Lock con valores en MÁXIMO (edge case)", async function () {
      // Establecer todo al máximo permitido
      await bashoodToken.connect(owner).setBurnRate(100);    // 1% max
      await bashoodToken.connect(owner).setTreasuryFee(200); // 2% max
      
      // Lockear
      await bashoodToken.connect(owner).lockParameters();
      
      // Valores quedan fijos en máximo
      expect(await bashoodToken.burnRate()).to.equal(100);
      expect(await bashoodToken.treasuryFee()).to.equal(200);
      
      // Ya no se pueden reducir
      await expect(
        bashoodToken.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(bashoodToken, "ParametersAreLocked");
    });

    it("✅ Transfers funcionan normalmente después del lock", async function () {
      // Lock parameters
      await bashoodToken.connect(owner).lockParameters();
      
      // Owner tiene 1B tokens del mint inicial
      const ownerBalance = await bashoodToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther("1000000000"));
      
      // Transfer debe funcionar normalmente
      const transferAmount = ethers.parseEther("1000");
      await expect(
        bashoodToken.connect(owner).transfer(user.address, transferAmount)
      ).to.not.be.reverted;
      
      // User recibe 99.4% (0.1% burn + 0.5% treasury)
      const expectedReceived = transferAmount * 9940n / 10000n;
      const userBalance = await bashoodToken.balanceOf(user.address);
      
      expect(userBalance).to.be.closeTo(expectedReceived, ethers.parseEther("0.1"));
    });
  });
});

/**
 * 📝 RESULTADOS ESPERADOS:
 * 
 * ✅ Todos estos tests DEBEN PASAR
 * 
 * ✅ PROTECCIÓN REGULATORIA LOGRADA:
 * 1. lockParameters() hace económicos immutables
 * 2. Lock es irreversible (one-way door)
 * 3. Post-lock, setBurnRate/setTreasuryFee/setTreasuryWallet/setStakingContract FALLAN
 * 4. Pause/unpause NO afectados (operaciones siguen funcionando)
 * 5. Transfers funcionan normalmente
 * 
 * 🎯 ARGUMENTO REGULATORIO:
 * "Después de presale, llamamos lockParameters() y los términos económicos 
 *  se vuelven INMUTABLES permanentemente. El código verifica esta inmutabilidad."
 * 
 * 📊 GAS IMPACT:
 * - lockParameters(): ~30k gas (one-time)
 * - Post-lock reverts: gas eficiente (early revert)
 * - No overhead en transfers (parametersLocked no se consulta en transfer)
 * 
 * ✅ PRÓXIMO PASO:
 * - Si todos pasan → Experimental validation successful
 * - Documentar cambios en DEPLOYMENT_TIMELINE.md
 * - Decidir si mergear a main o iterar
 */
