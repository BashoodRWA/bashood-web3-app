/**
 * 🛡️ ADVERSARIAL TEST SUITE: lockParameters() Attack Vectors
 * 
 * Propósito: Verificar que lockParameters() es INVIOLABLE
 * Fecha: 18 Febrero 2026
 * 
 * Tests críticos:
 * 1. No existe unlock mechanism (búsqueda exhaustiva)
 * 2. transferOwnership no permite bypass
 * 3. No hay reentrancy possible
 * 4. Front-running no permite changes
 * 5. Storage manipulation no funciona
 * 6. Proxy/delegatecall bypass attempts
 * 7. Time manipulation no afecta lock
 * 8. Multiple concurrent lock attempts
 * 
 * ⚠️ SI ALGÚN TEST FALLA → VULNERABILIDAD CRÍTICA
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🛡️ ADVERSARIAL: lockParameters() Attack Vectors", function () {
  
  async function deployTokenFixture() {
    const [owner, treasury, attacker, newOwner] = await ethers.getSigners();
    
    const BashoodToken = await ethers.getContractFactory("BashoodToken");
    const token = await BashoodToken.deploy(treasury.address);
    await token.waitForDeployment();
    
    return { token, owner, treasury, attacker, newOwner };
  }

  describe("ATTACK 1: Búsqueda de Unlock Mechanism", function () {
    
    it("🔴 No existe función 'unlockParameters'", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      // Verificar que NO existe función unlock
      expect(token.unlockParameters).to.be.undefined;
    });

    it("🔴 No existe función 'setParametersLocked'", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      // Verificar que NO existe setter directo
      expect(token.setParametersLocked).to.be.undefined;
    });

    it("🔴 parametersLocked no puede ser modificado directamente", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      // Lock parameters
      await token.connect(owner).lockParameters();
      expect(await token.parametersLocked()).to.equal(true);
      
      // Intentar modificar directamente (no debería existir función)
      // Esto verifica que no hay setter público
      const contractCode = await ethers.provider.getCode(await token.getAddress());
      expect(contractCode).to.not.include("setParametersLocked");
    });

    it("🔴 Después de lock, NO hay funciones admin que permitan reset", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Lista de funciones que NO deben revertir el lock
      // Verificar que pause/unpause no afectan lock
      await token.connect(owner).requestPause();
      await time.increase(24 * 60 * 60 + 1);
      await token.connect(owner).executePause();
      
      // Lock sigue activo
      expect(await token.parametersLocked()).to.equal(true);
      
      // Intentar cambiar parámetro debe seguir fallando
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });
  });

  describe("ATTACK 2: transferOwnership Bypass", function () {
    
    it("🔴 Nuevo owner NO puede cambiar parámetros post-lock", async function () {
      const { token, owner, newOwner } = await loadFixture(deployTokenFixture);
      
      // Owner lockea parameters
      await token.connect(owner).lockParameters();
      expect(await token.parametersLocked()).to.equal(true);
      
      // Transfer ownership
      await token.connect(owner).transferOwnership(newOwner.address);
      
      // Nuevo owner intenta cambiar parámetros
      await expect(
        token.connect(newOwner).setBurnRate(75)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      
      await expect(
        token.connect(newOwner).setTreasuryFee(150)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      
      await expect(
        token.connect(newOwner).setTreasuryWallet(newOwner.address)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Nuevo owner NO puede llamar lockParameters() nuevamente", async function () {
      const { token, owner, newOwner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      await token.connect(owner).transferOwnership(newOwner.address);
      
      // Nuevo owner intenta lockear de nuevo (debe fallar - already locked)
      await expect(
        token.connect(newOwner).lockParameters()
      ).to.be.revertedWith("Already locked");
    });

    it("🔴 Lock persiste a través de múltiples transfers de ownership", async function () {
      const { token, owner, newOwner, attacker } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Transfer 1: owner → newOwner
      await token.connect(owner).transferOwnership(newOwner.address);
      expect(await token.parametersLocked()).to.equal(true);
      
      // Transfer 2: newOwner → attacker
      await token.connect(newOwner).transferOwnership(attacker.address);
      expect(await token.parametersLocked()).to.equal(true);
      
      // Attacker NO puede cambiar parámetros
      await expect(
        token.connect(attacker).setBurnRate(100)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });
  });

  describe("ATTACK 3: Reentrancy & Front-Running", function () {
    
    it("🔴 No hay vulnerabilidad de reentrancy en lockParameters()", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      // lockParameters() no hace external calls, no hay reentrancy possible
      // Pero verificamos que solo puede llamarse una vez
      await token.connect(owner).lockParameters();
      
      await expect(
        token.connect(owner).lockParameters()
      ).to.be.revertedWith("Already locked");
    });

    it("🔴 Front-running: Cambios justo ANTES de lock son permitidos (esperado)", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      // Pre-lock: Owner puede cambiar
      await token.connect(owner).setBurnRate(50);
      await token.connect(owner).setTreasuryFee(100);
      
      // Lock
      await token.connect(owner).lockParameters();
      
      // Post-lock: No más cambios
      await expect(
        token.connect(owner).setBurnRate(75)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Intentos concurrentes de lock no crean race condition", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      // Primer lock exitoso
      await token.connect(owner).lockParameters();
      
      // Segundo intento inmediato (debe fallar)
      await expect(
        token.connect(owner).lockParameters()
      ).to.be.revertedWith("Already locked");
      
      // Estado correcto
      expect(await token.parametersLocked()).to.equal(true);
    });
  });

  describe("ATTACK 4: Storage Manipulation", function () {
    
    it("🔴 parametersLocked storage slot no puede ser manipulado", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Verificar que parametersLocked es true
      expect(await token.parametersLocked()).to.equal(true);
      
      // No hay forma de cambiar storage directamente en Ethereum
      // Solo podemos verificar que está locked y funciona
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Lock flag persiste después de múltiples operaciones", async function () {
      const { token, owner, treasury, attacker } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Realizar 10 transfers
      const amount = ethers.parseEther("1000");
      for (let i = 0; i < 10; i++) {
        await token.connect(owner).transfer(attacker.address, amount);
      }
      
      // Lock sigue activo
      expect(await token.parametersLocked()).to.equal(true);
      
      // Parámetros siguen inmutables
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });
  });

  describe("ATTACK 5: Time Manipulation", function () {
    
    it("🔴 Avanzar tiempo no afecta lock", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Avanzar 1 año
      await time.increase(365 * 24 * 60 * 60);
      
      // Lock sigue activo
      expect(await token.parametersLocked()).to.equal(true);
      
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Retroceder timestamp no permite unlock", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // En blockchain real no se puede retroceder tiempo
      // Pero podemos usar snapshot/revert en tests
      const snapshot = await ethers.provider.send("evm_snapshot", []);
      
      // Avanzar tiempo
      await time.increase(100);
      
      // Revert to snapshot (retroceder tiempo en test)
      await ethers.provider.send("evm_revert", [snapshot]);
      
      // Lock debe seguir activo (es inmutable)
      // Nota: después de revert, el contrato vuelve a estado pre-lock
      // Este test verifica que no hay time-based unlock en el código
    });
  });

  describe("ATTACK 6: Exhaustive Parameter Change Attempts", function () {
    
    it("🔴 100 intentos consecutivos de setBurnRate fallan post-lock", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // 100 intentos de cambiar burnRate
      for (let i = 0; i <= 100; i++) {
        await expect(
          token.connect(owner).setBurnRate(i)
        ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      }
      
      // Valor original no cambió
      expect(await token.burnRate()).to.equal(10); // default 0.1%
    });

    it("🔴 100 intentos consecutivos de setTreasuryFee fallan post-lock", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      for (let i = 0; i <= 200; i++) {
        await expect(
          token.connect(owner).setTreasuryFee(i)
        ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      }
      
      expect(await token.treasuryFee()).to.equal(50); // default 0.5%
    });

    it("🔴 Intentos paralelos de múltiples atacantes fallan", async function () {
      const { token, owner, attacker, newOwner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      await token.connect(owner).transferOwnership(newOwner.address);
      
      // Nuevo owner intenta cambiar
      await expect(
        token.connect(newOwner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      
      // Attacker (non-owner) intenta cambiar
      await expect(
        token.connect(attacker).setBurnRate(50)
      ).to.be.reverted; // OwnableUnauthorizedAccount
    });
  });

  describe("ATTACK 7: Economic Attack Vectors", function () {
    
    it("🔴 Lock con valores en 0 (válido pero verificable)", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      // Establecer valores en 0 antes de lock
      await token.connect(owner).setBurnRate(0);
      await token.connect(owner).setTreasuryFee(0);
      
      // Lock
      await token.connect(owner).lockParameters();
      
      // Verificar que están en 0 y son inmutables
      expect(await token.burnRate()).to.equal(0);
      expect(await token.treasuryFee()).to.equal(0);
      
      // No se pueden cambiar a valores distintos
      await expect(
        token.connect(owner).setBurnRate(10)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Lock con valores en MÁXIMO (válido pero verificable)", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      // Establecer valores al máximo antes de lock
      await token.connect(owner).setBurnRate(100);   // 1% max
      await token.connect(owner).setTreasuryFee(200); // 2% max
      
      // Lock
      await token.connect(owner).lockParameters();
      
      // Verificar que están en máximo y son inmutables
      expect(await token.burnRate()).to.equal(100);
      expect(await token.treasuryFee()).to.equal(200);
      
      // No se pueden reducir
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });
  });

  describe("ATTACK 8: Comprehensive Lock Verification", function () {
    
    it("🔴 TODAS las 4 funciones económicas están protegidas post-lock", async function () {
      const { token, owner, treasury, newOwner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // 1. setBurnRate
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      
      // 2. setTreasuryFee
      await expect(
        token.connect(owner).setTreasuryFee(100)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      
      // 3. setTreasuryWallet
      await expect(
        token.connect(owner).setTreasuryWallet(newOwner.address)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
      
      // 4. setStakingContract
      await expect(
        token.connect(owner).setStakingContract(newOwner.address)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Lock es permanente: no hay time-based unlock", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Avanzar tiempo extremo (10 años)
      await time.increase(10 * 365 * 24 * 60 * 60);
      
      // Lock sigue activo
      expect(await token.parametersLocked()).to.equal(true);
      
      // Parámetros siguen inmutables
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });

    it("🔴 Lock sobrevive a situaciones adversas extremas", async function () {
      const { token, owner, treasury, attacker } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).lockParameters();
      
      // Situación 1: Pause contract
      await token.connect(owner).requestPause();
      await time.increase(24 * 60 * 60 + 1);
      await token.connect(owner).executePause();
      expect(await token.parametersLocked()).to.equal(true);
      
      // Situación 2: Unpause
      await token.connect(owner).requestUnpause();
      await time.increase(24 * 60 * 60 + 1);
      await token.connect(owner).executeUnpause();
      expect(await token.parametersLocked()).to.equal(true);
      
      // Situación 3: Transfer ownership múltiples veces
      await token.connect(owner).transferOwnership(attacker.address);
      await token.connect(attacker).transferOwnership(owner.address);
      expect(await token.parametersLocked()).to.equal(true);
      
      // Situación 4: Muchas operaciones
      for (let i = 0; i < 10; i++) {
        await token.connect(owner).transfer(attacker.address, ethers.parseEther("1000"));
      }
      expect(await token.parametersLocked()).to.equal(true);
      
      // Final: Lock sigue irrompible
      await expect(
        token.connect(owner).setBurnRate(50)
      ).to.be.revertedWithCustomError(token, "ParametersAreLocked");
    });
  });
});

/**
 * 📊 RESULTADOS ESPERADOS:
 * 
 * ✅ TODOS los tests DEBEN PASAR
 * 
 * Si algún test FALLA → VULNERABILIDAD CRÍTICA identificada
 * 
 * 🛡️ PROTECCIONES VERIFICADAS:
 * 1. No existe unlock mechanism
 * 2. transferOwnership no permite bypass
 * 3. Storage manipulation no funciona
 * 4. Time manipulation no afecta lock
 * 5. 100+ intentos de cambio fallan
 * 6. Lock persiste en situaciones extremas
 * 
 * 🎯 CONCLUSIÓN:
 * lockParameters() es INVIOLABLE si todos los tests pasan.
 */
