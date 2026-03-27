/**
 * test/OracleValuationModule.test.cjs
 *
 * Suite adversarial completa para OracleValuationModule.
 *
 * Cubre todas las ramas del contrato:
 *   ✅ Constructor: core cero revierte, _fetchRole llamado correctamente
 *   ✅ IBashoodModule: moduleId, moduleVersion, requiredRole, coreContract
 *   ✅ setStalenessThreshold: umbral muy bajo revierte, válido OK, solo owner
 *   ✅ resolveValue: feed cero revierte, precio negativo, updatedAt=0, ronda stale
 *   ✅ resolveValue: threshold exceeded, dec < 18, dec = 18, dec > 18
 *   ✅ pushValuation: tokenId=0 revierte, sin oracle configurado revierte
 *   ✅ pushValuation: válido → emite eventos + llama updateAssetValue en core
 *   ✅ Invariante: updateAssetValue siempre recibe "ORACLE_REVALUATION"
 */
"use strict";

const { expect } = require("chai");
const { ethers }  = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

describe("OracleValuationModule", function () {
  let core, ovm, feed;
  let owner, stranger;
  const TOKEN_ID = 7n;

  beforeEach(async function () {
    [owner, stranger] = await ethers.getSigners();

    // Deploy mock core
    const MockCore = await ethers.getContractFactory(
      "contracts/mocks/MockCoreForOracleValuation.sol:MockCoreForOracleValuation"
    );
    core = await MockCore.deploy();
    await core.waitForDeployment();

    // Deploy price feed mock (8 decimals, $2000 answer)
    const MockPriceFeed = await ethers.getContractFactory(
      "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
    );
    feed = await MockPriceFeed.deploy(8, ethers.parseUnits("2000", 8));
    await feed.waitForDeployment();

    // Deploy OracleValuationModule
    const OVM = await ethers.getContractFactory("OracleValuationModule");
    ovm = await OVM.deploy(await core.getAddress());
    await ovm.waitForDeployment();
  });

  // Helper: configurar telemetry con el feed por defecto
  async function configureFeed(tokenId, feedAddr) {
    await core.setTelemetryConfig(tokenId, {
      hasRealTimeAPI: false,
      oracleAddress: feedAddr ?? await feed.getAddress(),
      apiProvider: "TEST",
      apiKeyHash: ethers.ZeroHash,
      lastTelemetryUpdate: 0,
    });
  }

  // ── Constructor ────────────────────────────────────────────────────────
  describe("constructor", function () {
    it("revierte con core = address(0)", async function () {
      const OVM = await ethers.getContractFactory("OracleValuationModule");
      await expect(OVM.deploy(ethers.ZeroAddress)).to.be.reverted;
    });

    it("queda enlazado al core correcto", async function () {
      expect(await ovm.coreContract()).to.equal(await core.getAddress());
    });
  });

  // ── IBashoodModule identity ────────────────────────────────────────────
  describe("IBashoodModule", function () {
    it("moduleId es keccak256('OracleValuation/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("OracleValuation/1.0"));
      expect(await ovm.moduleId()).to.equal(expected);
    });

    it("moduleVersion es '1.0.0'", async function () {
      expect(await ovm.moduleVersion()).to.equal("1.0.0");
    });

    it("requiredRole es ASSET_MANAGER_ROLE del Core", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("ASSET_MANAGER_ROLE"));
      expect(await ovm.requiredRole()).to.equal(expected);
    });
  });

  // ── setStalenessThreshold ──────────────────────────────────────────────
  describe("setStalenessThreshold()", function () {
    it("revierte si threshold < 60 segundos", async function () {
      await expect(ovm.setStalenessThreshold(59))
        .to.be.revertedWith("OracleValuation: threshold too low");
    });

    it("revierte si threshold = 0", async function () {
      await expect(ovm.setStalenessThreshold(0))
        .to.be.revertedWith("OracleValuation: threshold too low");
    });

    it("acepta threshold = 60 (mínimo exacto)", async function () {
      await expect(ovm.setStalenessThreshold(60))
        .to.emit(ovm, "StalenessThresholdUpdated")
        .withArgs(60n);
      expect(await ovm.stalenessThreshold()).to.equal(60n);
    });

    it("acepta threshold largo (24h)", async function () {
      await expect(ovm.setStalenessThreshold(86400))
        .to.emit(ovm, "StalenessThresholdUpdated");
    });

    it("solo owner puede cambiar threshold", async function () {
      await expect(ovm.connect(stranger).setStalenessThreshold(3600))
        .to.be.reverted;
    });
  });

  // ── resolveValue ───────────────────────────────────────────────────────
  describe("resolveValue()", function () {
    it("revierte con feed = address(0)", async function () {
      await expect(ovm.resolveValue(ethers.ZeroAddress))
        .to.be.revertedWith("OracleValuation: zero feed address");
    });

    it("revierte si answer <= 0 (negativo)", async function () {
      await feed.setAnswer(-1);
      await expect(ovm.resolveValue(await feed.getAddress()))
        .to.be.revertedWith("OracleValuation: non-positive price");
    });

    it("revierte si answer = 0", async function () {
      await feed.setAnswer(0);
      await expect(ovm.resolveValue(await feed.getAddress()))
        .to.be.revertedWith("OracleValuation: non-positive price");
    });

    it("revierte si updatedAt = 0 (ronda no completada)", async function () {
      await feed.setAnswerWithTimestamp(ethers.parseUnits("2000", 8), 0);
      await expect(ovm.resolveValue(await feed.getAddress()))
        .to.be.revertedWith("OracleValuation: stale updatedAt=0");
    });

    it("revierte si answeredInRound < roundId (ronda incompleta)", async function () {
      await feed.setAnsweredInRound(0);
      await expect(ovm.resolveValue(await feed.getAddress()))
        .to.be.revertedWith("OracleValuation: stale round");
    });

    it("revierte si precio supera staleness threshold", async function () {
      // Bajar threshold a 60 segundos
      await ovm.setStalenessThreshold(60);
      // Poner timestamp muy antiguo
      const staleTs = (await time.latest()) - 120;
      await feed.setAnswerWithTimestamp(ethers.parseUnits("2000", 8), staleTs);
      await expect(ovm.resolveValue(await feed.getAddress()))
        .to.be.revertedWith("OracleValuation: staleness threshold exceeded");
    });

    it("normaliza correctamente con 8 decimales → 1e18", async function () {
      const rawAnswer = 2000_00000000n; // $2000 con 8 decimales
      await feed.setAnswer(rawAnswer);
      const scaled = await ovm.resolveValue(await feed.getAddress());
      const expected = rawAnswer * (10n ** 10n); // multiplicar por 10^(18-8)
      expect(scaled).to.equal(expected);
    });

    it("normaliza correctamente con 18 decimales (identidad)", async function () {
      const MockPriceFeed = await ethers.getContractFactory(
        "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
      );
      const feed18 = await MockPriceFeed.deploy(18, ethers.parseUnits("2000", 18));
      await feed18.waitForDeployment();
      const rawAnswer = ethers.parseUnits("2000", 18);
      const scaled = await ovm.resolveValue(await feed18.getAddress());
      expect(scaled).to.equal(rawAnswer);
    });

    it("normaliza correctamente con 20 decimales → divide por 100", async function () {
      const MockPriceFeed = await ethers.getContractFactory(
        "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
      );
      const feed20 = await MockPriceFeed.deploy(20, ethers.parseUnits("2000", 20));
      await feed20.waitForDeployment();
      const scaled = await ovm.resolveValue(await feed20.getAddress());
      const expected = ethers.parseUnits("2000", 18);
      expect(scaled).to.equal(expected);
    });
  });

  // ── pushValuation ──────────────────────────────────────────────────────
  describe("pushValuation()", function () {
    it("revierte con tokenId = 0", async function () {
      await expect(ovm.pushValuation(0n))
        .to.be.revertedWith("BashoodModule: tokenId is zero");
    });

    it("revierte si no hay oracle configurado para el token", async function () {
      // Token sin configurar → oracleAddress = address(0)
      await expect(ovm.pushValuation(TOKEN_ID))
        .to.be.revertedWith("OracleValuation: no oracle configured for token");
    });

    it("pushValuation válida emite ValuationPushed", async function () {
      await configureFeed(TOKEN_ID);
      await expect(ovm.pushValuation(TOKEN_ID))
        .to.emit(ovm, "ValuationPushed");
    });

    it("pushValuation válida emite ModuleOperationExecuted", async function () {
      await configureFeed(TOKEN_ID);
      await expect(ovm.pushValuation(TOKEN_ID))
        .to.emit(ovm, "ModuleOperationExecuted")
        .withArgs(TOKEN_ID, owner.address);
    });

    it("pushValuation llama updateAssetValue en el core", async function () {
      await configureFeed(TOKEN_ID);
      await ovm.pushValuation(TOKEN_ID);
      expect(await core.updateCallCount()).to.equal(1n);
      expect(await core.lastUpdatedTokenId()).to.equal(TOKEN_ID);
    });

    it("invariante: reason siempre es 'ORACLE_REVALUATION'", async function () {
      await configureFeed(TOKEN_ID);
      await ovm.pushValuation(TOKEN_ID);
      expect(await core.lastUpdatedReason()).to.equal("ORACLE_REVALUATION");
    });

    it("valor enviado al core coincide con resolveValue()", async function () {
      await configureFeed(TOKEN_ID);
      const expected = await ovm.resolveValue(await feed.getAddress());
      await ovm.pushValuation(TOKEN_ID);
      expect(await core.lastUpdatedValue()).to.equal(expected);
    });

    it("feed stale en pushValuation revierte antes de escribir en core", async function () {
      await ovm.setStalenessThreshold(60);
      const staleTs = (await time.latest()) - 120;
      await feed.setAnswerWithTimestamp(ethers.parseUnits("2000", 8), staleTs);
      await configureFeed(TOKEN_ID);
      await expect(ovm.pushValuation(TOKEN_ID))
        .to.be.revertedWith("OracleValuation: staleness threshold exceeded");
      // El core no debe haber recibido la llamada
      expect(await core.updateCallCount()).to.equal(0n);
    });

    it("múltiples tokens se valúan independientemente", async function () {
      const TOKEN_B = 99n;
      await configureFeed(TOKEN_ID);
      await configureFeed(TOKEN_B);
      await ovm.pushValuation(TOKEN_ID);
      await ovm.pushValuation(TOKEN_B);
      expect(await core.updateCallCount()).to.equal(2n);
      expect(await core.lastUpdatedTokenId()).to.equal(TOKEN_B);
    });
  });
});
