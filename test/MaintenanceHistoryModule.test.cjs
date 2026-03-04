/**
 * test/MaintenanceHistoryModule.test.cjs
 *
 * Tests para MaintenanceHistoryModule (Plan M4 – Fase 3)
 *
 * Cubre:
 *  ✅ Deployment: moduleId, moduleVersion, requiredRole = bytes32(0) (read-only)
 *  ✅ grantRecorder / revokeRecorder / isRecorder
 *  ✅ logEvent: happy path, múltiples eventos
 *  ✅ logEvent: solo recorders autorizados
 *  ✅ logEvent: validaciones (empty type, token inexistente)
 *  ✅ getEvent / getEventCount / getLatestEvent / getFullHistory
 *  ✅ getTotalMaintenanceCost: suma acumulada
 *  ✅ Eventos: MaintenanceEventLogged, ModuleOperationExecuted
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MaintenanceHistoryModule", function () {
  let core, module_;
  let owner, recorder, alice, attacker;
  const TOKEN_ID = 202n;

  beforeEach(async function () {
    [owner, recorder, alice, attacker] = await ethers.getSigners();

    const MockCore = await ethers.getContractFactory("MockCoreForModules");
    core = await MockCore.deploy();
    await core.waitForDeployment();
    await core.mint(TOKEN_ID, alice.address);

    const MaintenanceHistoryModule = await ethers.getContractFactory("MaintenanceHistoryModule");
    module_ = await MaintenanceHistoryModule.deploy(await core.getAddress());
    await module_.waitForDeployment();
  });

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("moduleVersion es 1.0.0", async function () {
      expect(await module_.moduleVersion()).to.equal("1.0.0");
    });

    it("moduleId es keccak256('MaintenanceHistory/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("MaintenanceHistory/1.0"));
      expect(await module_.moduleId()).to.equal(expected);
    });

    it("requiredRole es bytes32(0) — read-only", async function () {
      expect(await module_.requiredRole()).to.equal(ethers.ZeroHash);
    });

    it("coreContract() apunta al MockCore", async function () {
      expect(await module_.coreContract()).to.equal(await core.getAddress());
    });
  });

  // ─── Recorder management ─────────────────────────────────────────────────────
  describe("Recorder management", function () {
    it("owner es recorder implícito", async function () {
      expect(await module_.isRecorder(owner.address)).to.equal(true);
    });

    it("grantRecorder acredita a recorder", async function () {
      await module_.connect(owner).grantRecorder(recorder.address);
      expect(await module_.isRecorder(recorder.address)).to.equal(true);
    });

    it("grantRecorder emite RecorderGranted", async function () {
      await expect(module_.connect(owner).grantRecorder(recorder.address))
        .to.emit(module_, "RecorderGranted")
        .withArgs(recorder.address);
    });

    it("revokeRecorder revoca a recorder", async function () {
      await module_.connect(owner).grantRecorder(recorder.address);
      await module_.connect(owner).revokeRecorder(recorder.address);
      expect(await module_.isRecorder(recorder.address)).to.equal(false);
    });

    it("solo owner puede grantRecorder", async function () {
      await expect(
        module_.connect(attacker).grantRecorder(attacker.address)
      ).to.be.revertedWithCustomError(module_, "OwnableUnauthorizedAccount");
    });

    it("revert si grantRecorder de address zero", async function () {
      await expect(
        module_.connect(owner).grantRecorder(ethers.ZeroAddress)
      ).to.be.revertedWith("MaintenanceHistory: zero address");
    });

    it("revert si ya es recorder", async function () {
      await module_.connect(owner).grantRecorder(recorder.address);
      await expect(
        module_.connect(owner).grantRecorder(recorder.address)
      ).to.be.revertedWith("MaintenanceHistory: already recorder");
    });

    it("revert si revokeRecorder de alguien que no lo es", async function () {
      await expect(
        module_.connect(owner).revokeRecorder(attacker.address)
      ).to.be.revertedWith("MaintenanceHistory: not a recorder");
    });
  });

  // ─── logEvent ────────────────────────────────────────────────────────────────
  describe("logEvent()", function () {
    const ONE_ETH = ethers.parseEther("1");

    beforeEach(async function () {
      await module_.connect(owner).grantRecorder(recorder.address);
    });

    it("registra un evento de mantenimiento correctamente", async function () {
      await module_.connect(recorder).logEvent(
        TOKEN_ID, "PREVENTIVE", ONE_ETH, 0, ethers.ZeroHash, "Revisión anual"
      );
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(1n);
    });

    it("emite MaintenanceEventLogged con idx=0", async function () {
      await expect(
        module_.connect(recorder).logEvent(
          TOKEN_ID, "PREVENTIVE", ONE_ETH, 0, ethers.ZeroHash, ""
        )
      )
        .to.emit(module_, "MaintenanceEventLogged")
        .withArgs(TOKEN_ID, recorder.address, "PREVENTIVE", 0n);
    });

    it("emite ModuleOperationExecuted", async function () {
      await expect(
        module_.connect(recorder).logEvent(
          TOKEN_ID, "CORRECTIVE", 0n, 0, ethers.ZeroHash, ""
        )
      ).to.emit(module_, "ModuleOperationExecuted");
    });

    it("registra múltiples eventos e incrementa índice", async function () {
      await module_.connect(recorder).logEvent(TOKEN_ID, "PREVENTIVE", ONE_ETH, 0, ethers.ZeroHash, "1");
      await module_.connect(recorder).logEvent(TOKEN_ID, "CORRECTIVE", ONE_ETH * 2n, 0, ethers.ZeroHash, "2");
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(2n);
    });

    it("persiste performedBy correctamente", async function () {
      await module_.connect(recorder).logEvent(
        TOKEN_ID, "MAJOR_OVERHAUL", 0n, 0, ethers.ZeroHash, ""
      );
      const ev = await module_.getLatestEvent(TOKEN_ID);
      expect(ev.performedBy).to.equal(recorder.address);
    });

    it("persiste maintenanceType, cost y docHash", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("informe-mantenimiento.pdf"));
      await module_.connect(recorder).logEvent(
        TOKEN_ID, "CORRECTIVE", ONE_ETH * 5n, 9999999, docHash, "Notas"
      );
      const ev = await module_.getLatestEvent(TOKEN_ID);
      expect(ev.maintenanceType).to.equal("CORRECTIVE");
      expect(ev.cost).to.equal(ONE_ETH * 5n);
      expect(ev.docHash).to.equal(docHash);
      expect(ev.nextDate).to.equal(9999999n);
    });

    it("revert si no es recorder", async function () {
      await expect(
        module_.connect(attacker).logEvent(TOKEN_ID, "PREVENTIVE", 0n, 0, ethers.ZeroHash, "")
      ).to.be.revertedWith("MaintenanceHistory: not a recorder");
    });

    it("revert si maintenanceType está vacío", async function () {
      await expect(
        module_.connect(recorder).logEvent(TOKEN_ID, "", 0n, 0, ethers.ZeroHash, "")
      ).to.be.revertedWith("MaintenanceHistory: empty type");
    });

    it("revert si token no existe en el Core", async function () {
      await expect(
        module_.connect(recorder).logEvent(999n, "PREVENTIVE", 0n, 0, ethers.ZeroHash, "")
      ).to.be.revertedWith("ERC721NonexistentToken");
    });

    it("revert si tokenId es 0", async function () {
      await expect(
        module_.connect(recorder).logEvent(0n, "PREVENTIVE", 0n, 0, ethers.ZeroHash, "")
      ).to.be.revertedWith("BashoodModule: tokenId is zero");
    });
  });

  // ─── Lectura de historial ────────────────────────────────────────────────────
  describe("Lectura de historial", function () {
    const COST_1 = ethers.parseEther("2");
    const COST_2 = ethers.parseEther("3.5");

    beforeEach(async function () {
      await module_.connect(owner).logEvent(TOKEN_ID, "PREVENTIVE", COST_1, 0, ethers.ZeroHash, "Primero");
      await module_.connect(owner).logEvent(TOKEN_ID, "CORRECTIVE", COST_2, 0, ethers.ZeroHash, "Segundo");
    });

    it("getEventCount devuelve 2", async function () {
      expect(await module_.getEventCount(TOKEN_ID)).to.equal(2n);
    });

    it("getEvent(0) devuelve el primer evento", async function () {
      const ev = await module_.getMaintenanceEvent(TOKEN_ID, 0n);
      expect(ev.maintenanceType).to.equal("PREVENTIVE");
    });

    it("getEvent(1) devuelve el segundo evento", async function () {
      const ev = await module_.getMaintenanceEvent(TOKEN_ID, 1n);
      expect(ev.maintenanceType).to.equal("CORRECTIVE");
    });

    it("getLatestEvent devuelve el segundo", async function () {
      const ev = await module_.getLatestEvent(TOKEN_ID);
      expect(ev.maintenanceType).to.equal("CORRECTIVE");
    });

    it("getFullHistory devuelve array de 2 elementos", async function () {
      const hist = await module_.getFullHistory(TOKEN_ID);
      expect(hist.length).to.equal(2);
    });

    it("getTotalMaintenanceCost es la suma de los dos costes", async function () {
      const total = await module_.getTotalMaintenanceCost(TOKEN_ID);
      expect(total).to.equal(COST_1 + COST_2);
    });

    it("getTotalMaintenanceCost es 0 para token sin eventos", async function () {
      const OTHER = 203n;
      await core.mint(OTHER, alice.address);
      expect(await module_.getTotalMaintenanceCost(OTHER)).to.equal(0n);
    });

    it("getEvent con index out of bounds revierte", async function () {
      await expect(
        module_.getMaintenanceEvent(TOKEN_ID, 99n)
      ).to.be.revertedWith("MaintenanceHistory: index out of bounds");
    });

    it("getLatestEvent sin eventos revierte", async function () {
      const OTHER = 204n;
      await core.mint(OTHER, alice.address);
      await expect(
        module_.getLatestEvent(OTHER)
      ).to.be.revertedWith("MaintenanceHistory: no events recorded");
    });
  });
});
