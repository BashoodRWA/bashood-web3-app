/**
 * ⚠️ BASELINE TEST: Admin Parameter Mutability (COMPORTAMIENTO ACTUAL)
 * 
 * Propósito: Documentar el comportamiento ACTUAL del contrato antes de cambios
 * Status: EXPERIMENTAL BRANCH (feature/economic-parameter-freeze)
 * 
 * Estos tests DEBEN pasar porque demuestran la realidad actual:
 * - Owner PUEDE cambiar burnRate inmediatamente
 * - Owner PUEDE cambiar treasuryFee inmediatamente
 * - Owner PUEDE cambiar treasuryWallet inmediatamente
 * - Owner PUEDE cambiar stakingContract inmediatamente
 * 
 * ❌ PROBLEMA REGULATORIO: Parámetros económicos son mutables post-deploy
 * ✅ SOLUCIÓN PROPUESTA: lockParameters() para hacerlos immutables post-presale
 * 
 * Fecha: 17 Febrero 2026
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🔍 BASELINE: Admin Parameter Mutability (ACTUAL)", function () {
  let bashoodToken;
  let owner, treasury, newTreasury, staking, user;

  beforeEach(async function () {
    [owner, treasury, newTreasury, staking, user] = await ethers.getSigners();

    // Deploy BashoodToken (solo acepta treasuryWallet)
    const BashoodToken = await ethers.getContractFactory("BashoodToken");
    bashoodToken = await BashoodToken.deploy(treasury.address);
    await bashoodToken.waitForDeployment();
  });

  describe("COMPORTAMIENTO ACTUAL: Parámetros Mutables", function () {
    
    it("✅ Owner PUEDE cambiar burnRate sin restricción", async function () {
      // Estado inicial
      const initialBurnRate = await bashoodToken.burnRate();
      expect(initialBurnRate).to.equal(10); // 0.1%

      // Owner cambia burn rate
      await expect(
        bashoodToken.connect(owner).setBurnRate(50) // 0.5%
      ).to.not.be.reverted;

      // Verificar cambio
      const newBurnRate = await bashoodToken.burnRate();
      expect(newBurnRate).to.equal(50);
    });

    it("✅ Owner PUEDE cambiar burnRate MÚLTIPLES veces", async function () {
      // Cambio 1: 0.1% → 0.3%
      await bashoodToken.connect(owner).setBurnRate(30);
      expect(await bashoodToken.burnRate()).to.equal(30);

      // Cambio 2: 0.3% → 0.7%
      await bashoodToken.connect(owner).setBurnRate(70);
      expect(await bashoodToken.burnRate()).to.equal(70);

      // Cambio 3: 0.7% → 1% (máximo)
      await bashoodToken.connect(owner).setBurnRate(100);
      expect(await bashoodToken.burnRate()).to.equal(100);
    });

    it("✅ Owner PUEDE cambiar burnRate incluso al MÁXIMO (1%)", async function () {
      await expect(
        bashoodToken.connect(owner).setBurnRate(100) // 1% máximo
      ).to.not.be.reverted;

      expect(await bashoodToken.burnRate()).to.equal(100);
    });

    it("✅ Owner PUEDE cambiar treasuryFee sin restricción", async function () {
      // Estado inicial
      const initialFee = await bashoodToken.treasuryFee();
      expect(initialFee).to.equal(50); // 0.5%

      // Owner cambia treasury fee
      await expect(
        bashoodToken.connect(owner).setTreasuryFee(100) // 1%
      ).to.not.be.reverted;

      // Verificar cambio
      const newFee = await bashoodToken.treasuryFee();
      expect(newFee).to.equal(100);
    });

    it("✅ Owner PUEDE cambiar treasuryFee MÚLTIPLES veces", async function () {
      // Cambio 1: 0.5% → 1%
      await bashoodToken.connect(owner).setTreasuryFee(100);
      expect(await bashoodToken.treasuryFee()).to.equal(100);

      // Cambio 2: 1% → 2% (máximo)
      await bashoodToken.connect(owner).setTreasuryFee(200);
      expect(await bashoodToken.treasuryFee()).to.equal(200);

      // Cambio 3: 2% → 0.3%
      await bashoodToken.connect(owner).setTreasuryFee(30);
      expect(await bashoodToken.treasuryFee()).to.equal(30);
    });

    it("✅ Owner PUEDE cambiar treasuryWallet inmediatamente", async function () {
      // Estado inicial
      const initialTreasury = await bashoodToken.treasuryWallet();
      expect(initialTreasury).to.equal(treasury.address);

      // Owner cambia treasury wallet
      await expect(
        bashoodToken.connect(owner).setTreasuryWallet(newTreasury.address)
      ).to.not.be.reverted;

      // Verificar cambio
      const newTreasuryAddress = await bashoodToken.treasuryWallet();
      expect(newTreasuryAddress).to.equal(newTreasury.address);
    });

    it("✅ Owner PUEDE cambiar stakingContract inmediatamente", async function () {
      // Estado inicial
      const initialStaking = await bashoodToken.stakingContract();
      expect(initialStaking).to.equal(ethers.ZeroAddress); // address(0)

      // Owner establece staking contract
      await expect(
        bashoodToken.connect(owner).setStakingContract(staking.address)
      ).to.not.be.reverted;

      // Verificar cambio
      const newStaking = await bashoodToken.stakingContract();
      expect(newStaking).to.equal(staking.address);
    });

    it("✅ Cambios son INMEDIATOS (sin timelock)", async function () {
      const blockBefore = await time.latest();

      // Cambiar burn rate
      await bashoodToken.connect(owner).setBurnRate(75);

      const blockAfter = await time.latest();
      
      // Diferencia de tiempo debe ser mínima (segundos, no horas)
      const timeDiff = blockAfter - blockBefore;
      expect(timeDiff).to.be.lessThan(60); // < 1 minuto

      // Y el cambio ya está efectivo
      expect(await bashoodToken.burnRate()).to.equal(75);
    });

    it("✅ Owner puede hacer CASCADA de cambios en misma transacción", async function () {
      // Múltiples cambios seguidos (simulando batch)
      await bashoodToken.connect(owner).setBurnRate(80);
      await bashoodToken.connect(owner).setTreasuryFee(150);
      await bashoodToken.connect(owner).setTreasuryWallet(newTreasury.address);

      // Todos los cambios son efectivos
      expect(await bashoodToken.burnRate()).to.equal(80);
      expect(await bashoodToken.treasuryFee()).to.equal(150);
      expect(await bashoodToken.treasuryWallet()).to.equal(newTreasury.address);
    });
  });

  describe("COMPORTAMIENTO ACTUAL: Non-owner NO puede cambiar", function () {
    
    it("❌ User NO puede cambiar burnRate", async function () {
      await expect(
        bashoodToken.connect(user).setBurnRate(50)
      ).to.be.reverted; // OwnableUnauthorizedAccount
    });

    it("❌ User NO puede cambiar treasuryFee", async function () {
      await expect(
        bashoodToken.connect(user).setTreasuryFee(100)
      ).to.be.reverted;
    });

    it("❌ User NO puede cambiar treasuryWallet", async function () {
      await expect(
        bashoodToken.connect(user).setTreasuryWallet(user.address)
      ).to.be.reverted;
    });

    it("❌ User NO puede cambiar stakingContract", async function () {
      await expect(
        bashoodToken.connect(user).setStakingContract(user.address)
      ).to.be.reverted;
    });
  });

  describe("LÍMITES ACTUALES: Validación de rangos", function () {
    
    it("❌ Owner NO puede exceder burnRate máximo (100 bps = 1%)", async function () {
      await expect(
        bashoodToken.connect(owner).setBurnRate(101) // 1.01%
      ).to.be.revertedWith("Max 1% burn");
    });

    it("❌ Owner NO puede exceder treasuryFee máximo (200 bps = 2%)", async function () {
      await expect(
        bashoodToken.connect(owner).setTreasuryFee(201) // 2.01%
      ).to.be.revertedWith("Max 2% fee");
    });

    it("❌ Owner NO puede establecer treasuryWallet como address(0)", async function () {
      await expect(
        bashoodToken.connect(owner).setTreasuryWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("⚠️ RIESGO REGULATORIO: Escenario post-presale", function () {
    
    it("🔴 Problema: Owner puede cambiar términos DESPUÉS de presale", async function () {
      // Simular que pasó presale (tiempo avanzado)
      await time.increase(30 * 24 * 60 * 60); // +30 días

      // Owner TODAVÍA puede cambiar burn rate
      await expect(
        bashoodToken.connect(owner).setBurnRate(100) // Aumentar a máximo
      ).to.not.be.reverted;

      // Owner TODAVÍA puede cambiar treasury fee
      await expect(
        bashoodToken.connect(owner).setTreasuryFee(200) // Aumentar a máximo
      ).to.not.be.reverted;

      // Verificar cambios son efectivos
      expect(await bashoodToken.burnRate()).to.equal(100);
      expect(await bashoodToken.treasuryFee()).to.equal(200);
    });

    it("🔴 Problema: Owner puede redirigir treasury wallet post-presale", async function () {
      // Simular presale completada
      await time.increase(30 * 24 * 60 * 60);

      // Owner cambia treasury wallet a su propia dirección
      await expect(
        bashoodToken.connect(owner).setTreasuryWallet(owner.address)
      ).to.not.be.reverted;

      // Ahora todas las fees van al owner en lugar de treasury DAO
      expect(await bashoodToken.treasuryWallet()).to.equal(owner.address);
    });

    it("🔴 Problema: No hay event de 'timelock pending' para cambios económicos", async function () {
      // Cambiar burn rate
      const tx = await bashoodToken.connect(owner).setBurnRate(75);
      const receipt = await tx.wait();

      // Buscar eventos relacionados con timelock
      const timelockEvents = receipt.logs.filter(log => {
        try {
          const parsed = bashoodToken.interface.parseLog(log);
          return parsed?.name.includes("Request") || parsed?.name.includes("Pending");
        } catch (e) {
          return false;
        }
      });

      // NO hay eventos de timelock para cambios económicos
      expect(timelockEvents.length).to.equal(0);

      // Comparar con pause (que SÍ tiene timelock)
      // (pause tiene requestPause → 24h → executePause)
    });
  });

  describe("📊 COMPARACIÓN: Pause SÍ tiene timelock, setters NO", function () {
    
    it("✅ PAUSE tiene timelock de 24 horas", async function () {
      // Request pause
      await bashoodToken.connect(owner).requestPause();

      // NO se puede ejecutar inmediatamente
      await expect(
        bashoodToken.connect(owner).executePause()
      ).to.be.revertedWith("Timelock active");

      // Avanzar 24 horas
      await time.increase(24 * 60 * 60);

      // Ahora SÍ se puede ejecutar
      await expect(
        bashoodToken.connect(owner).executePause()
      ).to.not.be.reverted;
    });

    it("🔴 SETTERS NO tienen timelock (inmediatos)", async function () {
      // setBurnRate es INMEDIATO (sin request/execute pattern)
      await expect(
        bashoodToken.connect(owner).setBurnRate(75)
      ).to.not.be.reverted;

      // Cambio ya es efectivo (no hay "requestSetBurnRate")
      expect(await bashoodToken.burnRate()).to.equal(75);
    });
  });
});

/**
 * 📝 RESULTADOS ESPERADOS:
 * 
 * ✅ Todos estos tests DEBEN PASAR (demuestran comportamiento actual)
 * 
 * 🔴 RIESGO REGULATORIO IDENTIFICADO:
 * 1. Owner puede cambiar burnRate post-presale (0.1% → 1%)
 * 2. Owner puede cambiar treasuryFee post-presale (0.5% → 2%)
 * 3. Owner puede redirigir treasuryWallet post-presale
 * 4. Cambios son INMEDIATOS (sin timelock, sin DAO vote)
 * 5. No hay mecanismo de "parameter lock" post-deployment
 * 
 * ✅ PRÓXIMO PASO:
 * - Si estos tests pasan → Baseline validado
 * - Implementar lockParameters() en branch experimental
 * - Crear tests que verifiquen que después de lock, cambios FALLAN
 * - Comparar gas, seguridad, y decidir si mergear
 * 
 * 🎯 OBJETIVO FINAL:
 * Post-presale: Parameters deben ser IMMUTABLES o requerir DAO vote
 */
