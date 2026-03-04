/**
 * test/OperationalMetricsAggregator.test.cjs
 *
 * Tests para OperationalMetricsAggregator (Plan M4 – Fase 3)
 *
 * OperationalStatus: 0=OPERATIONAL, 1=MAINTENANCE, 2=INACTIVE, 3=DECOMMISSIONED
 *
 * Cubre:
 *  ✅ Deployment: moduleId, requiredRole = 0 (read-only), coreContract
 *  ✅ createFleet / getFleetName / getAllFleets
 *  ✅ addToFleet / getFleetMembers / removeFromFleet
 *  ✅ aggregateFleet: suma de operatingHours, totalLoadLifted, metersExtruded
 *  ✅ aggregateFleet: conteo por status (activeCount, maintenanceCount, ...)
 *  ✅ aggregateTokens: consulta ad-hoc sin flota
 *  ✅ activeRatio: porcentaje de activos OPERATIONAL
 *  ✅ getRawMetrics: métricas raw desde Core
 *  ✅ Validaciones: fleet not found, token ya en flota, fleet exists
 *  ✅ Eventos: FleetCreated, TokenAddedToFleet, TokenRemovedFromFleet
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

const STATUS = {
  OPERATIONAL:    0,
  MAINTENANCE:    1,
  INACTIVE:       2,
  DECOMMISSIONED: 3,
};

// Helper: construye OperationalMetrics como tuple para Solidity
function makeMetrics({
  status           = STATUS.OPERATIONAL,
  operatingHours   = 0n,
  totalLoadLifted  = 0n,
  metersExtruded   = 0n,
} = {}) {
  return [
    status,          // OperationalStatus
    operatingHours,  // uint256
    0n,              // maxLifetimeHours
    totalLoadLifted, // uint256 totalLoadLifted
    0n,              // maxLoadLifetime
    metersExtruded,  // uint256 metersExtruded
    0n,              // maxMetersLifetime
    0,               // uint32 setupCount
    0,               // uint32 maxSetups
    0,               // uint16 cubicMetersPerDay
    0,               // uint32 lastMaintenanceDate
    0,               // uint32 nextMaintenanceDate
    0,               // uint16 maintenanceIntervalHours
  ];
}

describe("OperationalMetricsAggregator", function () {
  let core, aggregator;
  let owner, alice, attacker;

  const TOKEN_A = 202n;
  const TOKEN_B = 203n;
  const TOKEN_C = 204n;

  const FLEET_ID   = ethers.keccak256(ethers.toUtf8Bytes("EVOCONS_FLEET"));
  const FLEET_NAME = "EVOCONS_FLEET";

  beforeEach(async function () {
    [owner, alice, attacker] = await ethers.getSigners();

    const MockCore = await ethers.getContractFactory("MockCoreForModules");
    core = await MockCore.deploy();
    await core.waitForDeployment();

    // Mint tokens en el Core
    await core.mint(TOKEN_A, alice.address);
    await core.mint(TOKEN_B, alice.address);
    await core.mint(TOKEN_C, alice.address);

    // Configurar métricas
    await core.setMetrics(TOKEN_A, makeMetrics({ status: STATUS.OPERATIONAL, operatingHours: 1000n, totalLoadLifted: 500n }));
    await core.setMetrics(TOKEN_B, makeMetrics({ status: STATUS.MAINTENANCE, operatingHours: 2000n, metersExtruded: 300n }));
    await core.setMetrics(TOKEN_C, makeMetrics({ status: STATUS.INACTIVE, operatingHours: 3000n }));

    const Aggregator = await ethers.getContractFactory("OperationalMetricsAggregator");
    aggregator = await Aggregator.deploy(await core.getAddress());
    await aggregator.waitForDeployment();
  });

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("moduleId es keccak256('OperationalMetricsAggregator/1.0')", async function () {
      const expected = ethers.keccak256(
        ethers.toUtf8Bytes("OperationalMetricsAggregator/1.0")
      );
      expect(await aggregator.moduleId()).to.equal(expected);
    });

    it("moduleVersion es 1.0.0", async function () {
      expect(await aggregator.moduleVersion()).to.equal("1.0.0");
    });

    it("requiredRole es bytes32(0) — read-only", async function () {
      expect(await aggregator.requiredRole()).to.equal(ethers.ZeroHash);
    });

    it("coreContract() apunta al MockCore", async function () {
      expect(await aggregator.coreContract()).to.equal(await core.getAddress());
    });
  });

  // ─── createFleet ─────────────────────────────────────────────────────────────
  describe("createFleet()", function () {
    it("crea una flota correctamente", async function () {
      await aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME);
      expect(await aggregator.getFleetName(FLEET_ID)).to.equal(FLEET_NAME);
    });

    it("emite FleetCreated", async function () {
      await expect(aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME))
        .to.emit(aggregator, "FleetCreated")
        .withArgs(FLEET_ID, FLEET_NAME);
    });

    it("aparece en getAllFleets", async function () {
      await aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME);
      const fleets = await aggregator.getAllFleets();
      expect(fleets).to.include(FLEET_ID);
    });

    it("revert si fleetId es bytes32(0)", async function () {
      await expect(
        aggregator.connect(owner).createFleet(ethers.ZeroHash, FLEET_NAME)
      ).to.be.revertedWith("Aggregator: zero fleetId");
    });

    it("revert si name está vacío", async function () {
      await expect(
        aggregator.connect(owner).createFleet(FLEET_ID, "")
      ).to.be.revertedWith("Aggregator: empty name");
    });

    it("revert si la flota ya existe", async function () {
      await aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME);
      await expect(
        aggregator.connect(owner).createFleet(FLEET_ID, "otro")
      ).to.be.revertedWith("Aggregator: fleet already exists");
    });

    it("solo owner puede crear flotas", async function () {
      await expect(
        aggregator.connect(attacker).createFleet(FLEET_ID, FLEET_NAME)
      ).to.be.revertedWithCustomError(aggregator, "OwnableUnauthorizedAccount");
    });
  });

  // ─── addToFleet / removeFromFleet ────────────────────────────────────────────
  describe("addToFleet() / removeFromFleet()", function () {
    beforeEach(async function () {
      await aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME);
    });

    it("añade tokens a la flota", async function () {
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A);
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_B);
      const members = await aggregator.getFleetMembers(FLEET_ID);
      expect(members.length).to.equal(2);
    });

    it("emite TokenAddedToFleet", async function () {
      await expect(aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A))
        .to.emit(aggregator, "TokenAddedToFleet")
        .withArgs(FLEET_ID, TOKEN_A);
    });

    it("revert si token ya está en la flota", async function () {
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A);
      await expect(
        aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A)
      ).to.be.revertedWith("Aggregator: token already in fleet");
    });

    it("revert addToFleet si token no existe en el Core", async function () {
      await expect(
        aggregator.connect(owner).addToFleet(FLEET_ID, 999n)
      ).to.be.revertedWith("ERC721NonexistentToken");
    });

    it("removeFromFleet elimina el token", async function () {
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A);
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_B);
      await aggregator.connect(owner).removeFromFleet(FLEET_ID, TOKEN_A);
      const members = await aggregator.getFleetMembers(FLEET_ID);
      expect(members.length).to.equal(1);
    });

    it("emite TokenRemovedFromFleet", async function () {
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A);
      await expect(aggregator.connect(owner).removeFromFleet(FLEET_ID, TOKEN_A))
        .to.emit(aggregator, "TokenRemovedFromFleet")
        .withArgs(FLEET_ID, TOKEN_A);
    });

    it("revert removeFromFleet si token no está en la flota", async function () {
      await expect(
        aggregator.connect(owner).removeFromFleet(FLEET_ID, TOKEN_A)
      ).to.be.revertedWith("Aggregator: token not in fleet");
    });
  });

  // ─── aggregateFleet ──────────────────────────────────────────────────────────
  describe("aggregateFleet()", function () {
    beforeEach(async function () {
      await aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME);
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A); // OPERATIONAL, 1000h, 500 load
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_B); // MAINTENANCE, 2000h, 300m
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_C); // INACTIVE, 3000h
    });

    it("tokenCount es 3", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.tokenCount).to.equal(3n);
    });

    it("totalOperatingHours es 6000h", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.totalOperatingHours).to.equal(6000n);
    });

    it("totalLoadLifted es 500", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.totalLoadLifted).to.equal(500n);
    });

    it("totalMetersExtruded es 300", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.totalMetersExtruded).to.equal(300n);
    });

    it("activeCount (OPERATIONAL) es 1", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.activeCount).to.equal(1n);
    });

    it("maintenanceCount es 1", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.maintenanceCount).to.equal(1n);
    });

    it("inactiveCount es 1", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.inactiveCount).to.equal(1n);
    });

    it("decommissionedCount es 0", async function () {
      const m = await aggregator.aggregateFleet(FLEET_ID);
      expect(m.decommissionedCount).to.equal(0n);
    });

    it("revert si la flota no existe", async function () {
      const BAD_FLEET = ethers.keccak256(ethers.toUtf8Bytes("INEXISTENTE"));
      await expect(
        aggregator.aggregateFleet(BAD_FLEET)
      ).to.be.revertedWith("Aggregator: fleet not found");
    });
  });

  // ─── aggregateTokens (ad-hoc) ────────────────────────────────────────────────
  describe("aggregateTokens()", function () {
    it("agrega TOKEN_A y TOKEN_B correctamente", async function () {
      const m = await aggregator.aggregateTokens([TOKEN_A, TOKEN_B]);
      expect(m.tokenCount).to.equal(2n);
      expect(m.totalOperatingHours).to.equal(3000n); // 1000 + 2000
    });

    it("array vacío devuelve ceros", async function () {
      const m = await aggregator.aggregateTokens([]);
      expect(m.tokenCount).to.equal(0n);
      expect(m.totalOperatingHours).to.equal(0n);
    });
  });

  // ─── activeRatio ─────────────────────────────────────────────────────────────
  describe("activeRatio()", function () {
    beforeEach(async function () {
      await aggregator.connect(owner).createFleet(FLEET_ID, FLEET_NAME);
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_A); // OPERATIONAL
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_B); // MAINTENANCE
      await aggregator.connect(owner).addToFleet(FLEET_ID, TOKEN_C); // INACTIVE
    });

    it("1/3 activos OPERATIONAL = 33%", async function () {
      // (1 * 100) / 3 = 33 (truncado)
      expect(await aggregator.activeRatio(FLEET_ID)).to.equal(33n);
    });

    it("flota vacía devuelve 0", async function () {
      const EMPTY_FLEET = ethers.keccak256(ethers.toUtf8Bytes("EMPTY"));
      await aggregator.connect(owner).createFleet(EMPTY_FLEET, "Empty");
      expect(await aggregator.activeRatio(EMPTY_FLEET)).to.equal(0n);
    });
  });

  // ─── getRawMetrics ────────────────────────────────────────────────────────────
  describe("getRawMetrics()", function () {
    it("devuelve el status configurado para TOKEN_A", async function () {
      const m = await aggregator.getRawMetrics(TOKEN_A);
      expect(m.status).to.equal(STATUS.OPERATIONAL);
      expect(m.operatingHours).to.equal(1000n);
    });

    it("devuelve el status configurado para TOKEN_B", async function () {
      const m = await aggregator.getRawMetrics(TOKEN_B);
      expect(m.status).to.equal(STATUS.MAINTENANCE);
    });

    it("revert si tokenId es 0", async function () {
      await expect(
        aggregator.getRawMetrics(0n)
      ).to.be.revertedWith("BashoodModule: tokenId is zero");
    });
  });
});
