/**
 * test/LifecycleEventsModule.test.cjs
 *
 * Tests para LifecycleEventsModule (Plan M4 – Fase 3)
 *
 * OperationalStatus (IBashoodRWA):
 *   0 = OPERATIONAL
 *   1 = MAINTENANCE
 *   2 = INACTIVE
 *   3 = DECOMMISSIONED
 *
 * Cubre:
 *  ✅ Deployment: moduleId, requiredRole = 0 (read-only)
 *  ✅ grantOperator / revokeOperator / isOperator
 *  ✅ logTransition: happy path (OPERATIONAL → MAINTENANCE → INACTIVE → DECOMMISSIONED)
 *  ✅ logTransition: solo operadores autorizados
 *  ✅ logTransition: revert si fromStatus == toStatus
 *  ✅ logTransition: revert si fromStatus == DECOMMISSIONED
 *  ✅ logTransition: revert si token no existe
 *  ✅ getEvent / getEventCount / getLatestEvent / getFullHistory
 *  ✅ wasDecommissioned: true/false
 *  ✅ countTransitionsTo: cuenta correctamente
 *  ✅ Eventos: LifecycleTransitionLogged, ModuleOperationExecuted
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

// OperationalStatus enum indices
const STATUS = {
  OPERATIONAL:    0,
  MAINTENANCE:    1,
  INACTIVE:       2,
  DECOMMISSIONED: 3,
};

describe("LifecycleEventsModule", function () {
  let core, module_;
  let owner, operator, alice, attacker;
  const TOKEN_ID = 202n;

  beforeEach(async function () {
    [owner, operator, alice, attacker] = await ethers.getSigners();

    const MockCore = await ethers.getContractFactory("MockCoreForModules");
    core = await MockCore.deploy();
    await core.waitForDeployment();
    await core.mint(TOKEN_ID, alice.address);

    const LifecycleEventsModule = await ethers.getContractFactory("LifecycleEventsModule");
    module_ = await LifecycleEventsModule.deploy(await core.getAddress());
    await module_.waitForDeployment();
  });

  // helper para registrar una transición
  async function log(from, to, reason = "test", signer = owner) {
    return module_.connect(signer).logTransition(
      TOKEN_ID, from, to, reason, ethers.ZeroHash
    );
  }

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("moduleId es keccak256('LifecycleEvents/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("LifecycleEvents/1.0"));
      expect(await module_.moduleId()).to.equal(expected);
    });

    it("moduleVersion es 1.0.0", async function () {
      expect(await module_.moduleVersion()).to.equal("1.0.0");
    });

    it("requiredRole es bytes32(0) — read-only", async function () {
      expect(await module_.requiredRole()).to.equal(ethers.ZeroHash);
    });

    it("coreContract() apunta al MockCore", async function () {
      expect(await module_.coreContract()).to.equal(await core.getAddress());
    });
  });

  // ─── Operator management ─────────────────────────────────────────────────────
  describe("Operator management", function () {
    it("owner es operador implícito", async function () {
      expect(await module_.isOperator(owner.address)).to.equal(true);
    });

    it("grantOperator acredita a operador", async function () {
      await module_.connect(owner).grantOperator(operator.address);
      expect(await module_.isOperator(operator.address)).to.equal(true);
    });

    it("grantOperator emite OperatorGranted", async function () {
      await expect(module_.connect(owner).grantOperator(operator.address))
        .to.emit(module_, "OperatorGranted")
        .withArgs(operator.address);
    });

    it("revokeOperator revoca al operador", async function () {
      await module_.connect(owner).grantOperator(operator.address);
      await module_.connect(owner).revokeOperator(operator.address);
      expect(await module_.isOperator(operator.address)).to.equal(false);
    });

    it("solo owner puede grantOperator", async function () {
      await expect(
        module_.connect(attacker).grantOperator(attacker.address)
      ).to.be.revertedWithCustomError(module_, "OwnableUnauthorizedAccount");
    });

    it("revert grantOperator address zero", async function () {
      await expect(
        module_.connect(owner).grantOperator(ethers.ZeroAddress)
      ).to.be.revertedWith("LifecycleEvents: zero address");
    });

    it("revert grantOperator si ya es operador", async function () {
      await module_.connect(owner).grantOperator(operator.address);
      await expect(
        module_.connect(owner).grantOperator(operator.address)
      ).to.be.revertedWith("LifecycleEvents: already operator");
    });

    it("revert revokeOperator si no es operador", async function () {
      await expect(
        module_.connect(owner).revokeOperator(attacker.address)
      ).to.be.revertedWith("LifecycleEvents: not an operator");
    });

    it("revokeOperator emite OperatorRevoked", async function () {
      await module_.connect(owner).grantOperator(operator.address);
      await expect(module_.connect(owner).revokeOperator(operator.address))
        .to.emit(module_, "OperatorRevoked")
        .withArgs(operator.address);
    });

    it("empresa revocada pierde acceso inmediatamente (lockout)", async function () {
      await module_.connect(owner).grantOperator(operator.address);
      // Opera correctamente antes de la revocación
      await module_.connect(operator).logTransition(
        TOKEN_ID, STATUS.OPERATIONAL, STATUS.MAINTENANCE, "pre-revoke", ethers.ZeroHash
      );
      // Revocación
      await module_.connect(owner).revokeOperator(operator.address);
      // Intento post-revocación → debe revertir
      await expect(
        module_.connect(operator).logTransition(
          TOKEN_ID, STATUS.MAINTENANCE, STATUS.OPERATIONAL, "post-revoke", ethers.ZeroHash
        )
      ).to.be.revertedWith("LifecycleEvents: not an operator");
    });

    it("ciclo grant → revoke → re-grant restaura el acceso", async function () {
      await module_.connect(owner).grantOperator(operator.address);
      await module_.connect(owner).revokeOperator(operator.address);
      // Re-acreditación
      await module_.connect(owner).grantOperator(operator.address);
      expect(await module_.isOperator(operator.address)).to.equal(true);
      // Puede operar de nuevo
      await module_.connect(operator).logTransition(
        TOKEN_ID, STATUS.OPERATIONAL, STATUS.MAINTENANCE, "re-grant", ethers.ZeroHash
      );
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(1n);
    });
  });

  // ─── logTransition ───────────────────────────────────────────────────────────
  describe("logTransition()", function () {
    it("OPERATIONAL → MAINTENANCE: OK", async function () {
      await log(STATUS.OPERATIONAL, STATUS.MAINTENANCE);
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(1n);
    });

    it("MAINTENANCE → INACTIVE: OK", async function () {
      await log(STATUS.OPERATIONAL, STATUS.MAINTENANCE);
      await log(STATUS.MAINTENANCE, STATUS.INACTIVE);
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(2n);
    });

    it("INACTIVE → DECOMMISSIONED: OK", async function () {
      await log(STATUS.INACTIVE, STATUS.DECOMMISSIONED);
      const ev = await module_.getLatestEvent(TOKEN_ID);
      expect(ev.toStatus).to.equal(STATUS.DECOMMISSIONED);
    });

    it("emite LifecycleTransitionLogged con idx correcto", async function () {
      await expect(log(STATUS.OPERATIONAL, STATUS.MAINTENANCE, "Mantenimiento programado"))
        .to.emit(module_, "LifecycleTransitionLogged")
        .withArgs(TOKEN_ID, owner.address, STATUS.OPERATIONAL, STATUS.MAINTENANCE, 0n);
    });

    it("emite ModuleOperationExecuted", async function () {
      await expect(log(STATUS.OPERATIONAL, STATUS.MAINTENANCE))
        .to.emit(module_, "ModuleOperationExecuted");
    });

    it("persiste reason y docHash", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("cambio-estado.pdf"));
      await module_.connect(owner).logTransition(
        TOKEN_ID, STATUS.OPERATIONAL, STATUS.INACTIVE, "Pausa temporal", docHash
      );
      const ev = await module_.getLatestEvent(TOKEN_ID);
      expect(ev.reason).to.equal("Pausa temporal");
      expect(ev.docHash).to.equal(docHash);
    });

    it("revert si fromStatus == toStatus", async function () {
      await expect(
        log(STATUS.OPERATIONAL, STATUS.OPERATIONAL)
      ).to.be.revertedWith("LifecycleEvents: no state change");
    });

    it("revert si fromStatus == DECOMMISSIONED", async function () {
      await expect(
        log(STATUS.DECOMMISSIONED, STATUS.INACTIVE)
      ).to.be.revertedWith("LifecycleEvents: asset is decommissioned");
    });

    it("revert si no es operador", async function () {
      await expect(
        log(STATUS.OPERATIONAL, STATUS.MAINTENANCE, "test", attacker)
      ).to.be.revertedWith("LifecycleEvents: not an operator");
    });

    it("revert si token no existe en el Core", async function () {
      await expect(
        module_.connect(owner).logTransition(
          999n, STATUS.OPERATIONAL, STATUS.MAINTENANCE, "", ethers.ZeroHash
        )
      ).to.be.revertedWith("ERC721NonexistentToken");
    });

    it("revert si tokenId es 0", async function () {
      await expect(
        module_.connect(owner).logTransition(
          0n, STATUS.OPERATIONAL, STATUS.MAINTENANCE, "", ethers.ZeroHash
        )
      ).to.be.revertedWith("BashoodModule: tokenId is zero");
    });
  });

  // ─── Lectura ─────────────────────────────────────────────────────────────────
  describe("Lectura de historial", function () {
    beforeEach(async function () {
      await log(STATUS.OPERATIONAL, STATUS.MAINTENANCE, "Mantenimiento");
      await log(STATUS.MAINTENANCE, STATUS.OPERATIONAL,  "Fin mantenimiento");
      await log(STATUS.OPERATIONAL, STATUS.DECOMMISSIONED, "Fin de vida");
    });

    it("getEventCount devuelve 3", async function () {
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(3n);
    });

    it("getEvent(0) es la primera transición", async function () {
      const ev = await module_.getLifecycleEvent(TOKEN_ID, 0n);
      expect(ev.fromStatus).to.equal(STATUS.OPERATIONAL);
      expect(ev.toStatus).to.equal(STATUS.MAINTENANCE);
    });

    it("getLatestEvent es la última transición (DECOMMISSIONED)", async function () {
      const ev = await module_.getLatestEvent(TOKEN_ID);
      expect(ev.toStatus).to.equal(STATUS.DECOMMISSIONED);
    });

    it("getFullHistory devuelve 3 eventos", async function () {
      const hist = await module_.getFullHistory(TOKEN_ID);
      expect(hist.length).to.equal(3);
    });

    it("wasDecommissioned es true", async function () {
      expect(await module_.wasDecommissioned(TOKEN_ID)).to.equal(true);
    });

    it("wasDecommissioned es false para token sin historial", async function () {
      const OTHER = 203n;
      await core.mint(OTHER, alice.address);
      expect(await module_.wasDecommissioned(OTHER)).to.equal(false);
    });

    it("countTransitionsTo(MAINTENANCE) devuelve 1", async function () {
      expect(await module_.countTransitionsTo(TOKEN_ID, STATUS.MAINTENANCE)).to.equal(1n);
    });

    it("countTransitionsTo(OPERATIONAL) devuelve 1", async function () {
      expect(await module_.countTransitionsTo(TOKEN_ID, STATUS.OPERATIONAL)).to.equal(1n);
    });

    it("countTransitionsTo(DECOMMISSIONED) devuelve 1", async function () {
      expect(await module_.countTransitionsTo(TOKEN_ID, STATUS.DECOMMISSIONED)).to.equal(1n);
    });

    it("getEvent out of bounds revierte", async function () {
      await expect(
        module_.getLifecycleEvent(TOKEN_ID, 99n)
      ).to.be.revertedWith("LifecycleEvents: index out of bounds");
    });

    it("getLatestEvent sin eventos revierte", async function () {
      const OTHER = 204n;
      await core.mint(OTHER, alice.address);
      await expect(
        module_.getLatestEvent(OTHER)
      ).to.be.revertedWith("LifecycleEvents: no events recorded");
    });
  });
});
