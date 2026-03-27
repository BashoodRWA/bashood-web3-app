/**
 * test/InspectionModule.test.cjs
 *
 * Tests para InspectionModule (Plan M4 – Fase 3)
 *
 * Cubre:
 *  ✅ Deployment: moduleId, moduleVersion, coreContract, requiredRole
 *  ✅ grantInspector / revokeInspector / isInspector
 *  ✅ recordInspection: happy path PASS, FAIL, CONDITIONAL
 *  ✅ recordInspection: solo inspectores autorizados
 *  ✅ recordInspection: validaciones (empty type, result > 2, token inexistente)
 *  ✅ getInspection / getInspectionCount / getLatestInspection
 *  ✅ passedLatestInspection: PASS, FAIL, sin inspecciones
 *  ✅ getAllInspections: orden cronológico
 *  ✅ Eventos: InspectionRecorded, ModuleOperationExecuted
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

const RESULT_PASS        = 0;
const RESULT_FAIL        = 1;
const RESULT_CONDITIONAL = 2;
const INSPECTION_VISUAL  = ethers.keccak256(ethers.toUtf8Bytes("VISUAL"));
const INSPECTION_FULL    = ethers.keccak256(ethers.toUtf8Bytes("FULL"));

describe("InspectionModule", function () {
  let core, module_;
  let owner, inspector, alice, attacker;
  const TOKEN_ID = 202n;

  beforeEach(async function () {
    [owner, inspector, alice, attacker] = await ethers.getSigners();

    const MockCore = await ethers.getContractFactory("MockCoreForModules");
    core = await MockCore.deploy();
    await core.waitForDeployment();

    // Mint token en el mock core
    await core.mint(TOKEN_ID, alice.address);

    const InspectionModule = await ethers.getContractFactory("InspectionModule");
    module_ = await InspectionModule.deploy(await core.getAddress());
    await module_.waitForDeployment();
  });

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("coreContract() apunta al MockCore", async function () {
      expect(await module_.coreContract()).to.equal(await core.getAddress());
    });

    it("moduleVersion es 1.0.0", async function () {
      expect(await module_.moduleVersion()).to.equal("1.0.0");
    });

    it("moduleId es keccak256('Inspection/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("Inspection/1.0"));
      expect(await module_.moduleId()).to.equal(expected);
    });

    it("requiredRole es ASSET_MANAGER_ROLE", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("ASSET_MANAGER_ROLE"));
      expect(await module_.requiredRole()).to.equal(expected);
    });

    it("owner del módulo es el deployer", async function () {
      expect(await module_.owner()).to.equal(owner.address);
    });
  });

  // ─── Inspector management ────────────────────────────────────────────────────
  describe("Inspector management", function () {
    it("owner es inspector implícito", async function () {
      expect(await module_.isInspector(TOKEN_ID, owner.address)).to.equal(true);
    });

    it("grantInspector acredita a inspector", async function () {
      await module_.connect(owner).grantInspector(TOKEN_ID, inspector.address);
      expect(await module_.isInspector(TOKEN_ID, inspector.address)).to.equal(true);
    });

    it("grantInspector emite InspectorGranted", async function () {
      await expect(module_.connect(owner).grantInspector(TOKEN_ID, inspector.address))
        .to.emit(module_, "InspectorGranted")
        .withArgs(inspector.address);
    });

    it("revokeInspector revoca a inspector", async function () {
      await module_.connect(owner).grantInspector(TOKEN_ID, inspector.address);
      await module_.connect(owner).revokeInspector(TOKEN_ID, inspector.address);
      expect(await module_.isInspector(TOKEN_ID, inspector.address)).to.equal(false);
    });

    it("revokeInspector emite InspectorRevoked", async function () {
      await module_.connect(owner).grantInspector(TOKEN_ID, inspector.address);
      await expect(module_.connect(owner).revokeInspector(TOKEN_ID, inspector.address))
        .to.emit(module_, "InspectorRevoked")
        .withArgs(inspector.address);
    });

    it("solo owner puede grantInspector", async function () {
      await expect(
        module_.connect(attacker).grantInspector(TOKEN_ID, attacker.address)
      ).to.be.revertedWithCustomError(module_, "OwnableUnauthorizedAccount");
    });

    it("revert si grantInspector de address zero", async function () {
      await expect(
        module_.connect(owner).grantInspector(TOKEN_ID, ethers.ZeroAddress)
      ).to.be.revertedWith("InspectionModule: zero address");
    });

    it("revert si ya es inspector", async function () {
      await module_.connect(owner).grantInspector(TOKEN_ID, inspector.address);
      await expect(
        module_.connect(owner).grantInspector(TOKEN_ID, inspector.address)
      ).to.be.revertedWith("InspectionModule: already inspector");
    });

    it("revert si revokeInspector de alguien que no lo es", async function () {
      await expect(
        module_.connect(owner).revokeInspector(TOKEN_ID, attacker.address)
      ).to.be.revertedWith("InspectionModule: not an inspector");
    });
  });

  // ─── recordInspection ────────────────────────────────────────────────────────
  describe("recordInspection()", function () {
    beforeEach(async function () {
      await module_.connect(owner).grantInspector(TOKEN_ID, inspector.address);
    });

    it("registra inspección PASS correctamente", async function () {
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, "OK"
      );
      expect(await module_.getInspectionCount(TOKEN_ID)).to.equal(1n);
    });

    it("registra inspección FAIL correctamente", async function () {
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_FULL, RESULT_FAIL, ethers.ZeroHash, "Fallo estructural"
      );
      const rec = await module_.getLatestInspection(TOKEN_ID);
      expect(rec.result).to.equal(RESULT_FAIL);
    });

    it("registra inspección CONDITIONAL correctamente", async function () {
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_FULL, RESULT_CONDITIONAL, ethers.ZeroHash, ""
      );
      const rec = await module_.getLatestInspection(TOKEN_ID);
      expect(rec.result).to.equal(RESULT_CONDITIONAL);
    });

    it("emite InspectionRecorded con idx=0 en la primera", async function () {
      await expect(
        module_.connect(inspector).recordInspection(
          TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, ""
        )
      )
        .to.emit(module_, "InspectionRecorded")
        .withArgs(TOKEN_ID, inspector.address, INSPECTION_VISUAL, RESULT_PASS, 0n);
    });

    it("emite ModuleOperationExecuted", async function () {
      await expect(
        module_.connect(inspector).recordInspection(
          TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, ""
        )
      ).to.emit(module_, "ModuleOperationExecuted");
    });

    it("incrementa el índice correctamente", async function () {
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, "1"
      );
      await expect(
        module_.connect(inspector).recordInspection(
          TOKEN_ID, INSPECTION_FULL, RESULT_FAIL, ethers.ZeroHash, "2"
        )
      )
        .to.emit(module_, "InspectionRecorded")
        .withArgs(TOKEN_ID, inspector.address, INSPECTION_FULL, RESULT_FAIL, 1n);
    });

    it("revert si no es inspector", async function () {
      await expect(
        module_.connect(attacker).recordInspection(
          TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, ""
        )
      ).to.be.revertedWith("InspectionModule: not an inspector");
    });

    it("revert si inspectionType es bytes32(0)", async function () {
      await expect(
        module_.connect(inspector).recordInspection(
          TOKEN_ID, ethers.ZeroHash, RESULT_PASS, ethers.ZeroHash, ""
        )
      ).to.be.revertedWith("InspectionModule: empty type");
    });

    it("revert si result > 2", async function () {
      await expect(
        module_.connect(inspector).recordInspection(
          TOKEN_ID, INSPECTION_VISUAL, 3, ethers.ZeroHash, ""
        )
      ).to.be.revertedWith("InspectionModule: invalid result");
    });

    it("revert si tokenId no existe en el Core", async function () {
      const NONEXISTENT = 999n;
      await expect(
        module_.connect(owner).recordInspection(
          NONEXISTENT, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, ""
        )
      ).to.be.revertedWith("ERC721NonexistentToken");
    });

    it("revert si tokenId es 0", async function () {
      await expect(
        module_.connect(inspector).recordInspection(
          0n, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, ""
        )
      ).to.be.revertedWith("BashoodModule: tokenId is zero");
    });
  });

  // ─── Lectura ─────────────────────────────────────────────────────────────────
  describe("Lectura de historial", function () {
    beforeEach(async function () {
      await module_.connect(owner).grantInspector(TOKEN_ID, inspector.address);
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, "Primera"
      );
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_FULL, RESULT_FAIL, ethers.ZeroHash, "Segunda"
      );
    });

    it("getInspectionCount devuelve 2", async function () {
      expect(await module_.getInspectionCount(TOKEN_ID)).to.equal(2n);
    });

    it("getInspection(0) devuelve la primera", async function () {
      const rec = await module_.getInspection(TOKEN_ID, 0n);
      expect(rec.inspectionType).to.equal(INSPECTION_VISUAL);
      expect(rec.result).to.equal(RESULT_PASS);
    });

    it("getInspection(1) devuelve la segunda", async function () {
      const rec = await module_.getInspection(TOKEN_ID, 1n);
      expect(rec.result).to.equal(RESULT_FAIL);
    });

    it("getLatestInspection devuelve la segunda (FAIL)", async function () {
      const rec = await module_.getLatestInspection(TOKEN_ID);
      expect(rec.result).to.equal(RESULT_FAIL);
    });

    it("passedLatestInspection es false si la última fue FAIL", async function () {
      expect(await module_.passedLatestInspection(TOKEN_ID)).to.equal(false);
    });

    it("passedLatestInspection es true si la última fue PASS", async function () {
      await module_.connect(inspector).recordInspection(
        TOKEN_ID, INSPECTION_VISUAL, RESULT_PASS, ethers.ZeroHash, "Corrección OK"
      );
      expect(await module_.passedLatestInspection(TOKEN_ID)).to.equal(true);
    });

    it("passedLatestInspection es false si no hay inspecciones", async function () {
      const OTHER_TOKEN = 203n;
      await core.mint(OTHER_TOKEN, alice.address);
      expect(await module_.passedLatestInspection(OTHER_TOKEN)).to.equal(false);
    });

    it("getAllInspections devuelve array de 2 elementos", async function () {
      const all = await module_.getAllInspections(TOKEN_ID);
      expect(all.length).to.equal(2);
    });

    it("getInspection con index out of bounds revierte", async function () {
      await expect(
        module_.getInspection(TOKEN_ID, 99n)
      ).to.be.revertedWith("InspectionModule: index out of bounds");
    });

    it("getLatestInspection sin inspecciones revierte", async function () {
      const OTHER = 204n;
      await core.mint(OTHER, alice.address);
      await expect(
        module_.getLatestInspection(OTHER)
      ).to.be.revertedWith("InspectionModule: no inspections recorded");
    });
  });
});
