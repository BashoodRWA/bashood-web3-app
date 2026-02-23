const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepreciationEngine", function () {
  let engine;

  before(async function () {
    // Solo desplegamos el mock, Hardhat linkea la librería automáticamente
    const MockFactory = await ethers.getContractFactory("DepreciationModelMock");
    engine = await MockFactory.deploy();
  });

  describe("LOAD_BASED", function () {
    it("debe calcular correctamente la depreciación estándar", async function () {
      // Ejemplo: 72,000 / 500,000 = 14.4% = 1440 bps
      expect(await engine.loadBased(72000, 500000)).to.equal(1440);
    });
    it("debe devolver 0 si totalLoadLifted es 0", async function () {
      expect(await engine.loadBased(0, 500000)).to.equal(0);
    });
    it("debe devolver 10,000 si totalLoadLifted >= maxLoadCapacity", async function () {
      expect(await engine.loadBased(500000, 500000)).to.equal(10000);
      expect(await engine.loadBased(600000, 500000)).to.equal(10000);
    });
    it("debe revertir si maxLoadCapacity es 0", async function () {
      await expect(engine.loadBased(1000, 0)).to.be.revertedWithCustomError(engine, "InvalidReferenceValue");
    });
  });

  describe("EXTRUSION_BASED", function () {
    it("debe calcular correctamente la depreciación proporcional", async function () {
      // Ejemplo: 500 / 2000 = 25% = 2500 bps
      expect(await engine.extrusionBased(500, 2000)).to.equal(2500);
    });
    it("debe devolver 0 si metersExtruded es 0", async function () {
      expect(await engine.extrusionBased(0, 2000)).to.equal(0);
    });
    it("debe devolver 10,000 si metersExtruded >= maxMetersExtruded", async function () {
      expect(await engine.extrusionBased(2000, 2000)).to.equal(10000);
      expect(await engine.extrusionBased(2500, 2000)).to.equal(10000);
    });
    it("debe revertir si maxMetersExtruded es 0", async function () {
      await expect(engine.extrusionBased(100, 0)).to.be.revertedWithCustomError(engine, "InvalidReferenceValue");
    });
  });

  describe("SETUP_BASED", function () {
    it("debe calcular correctamente la depreciación proporcional", async function () {
      // Ejemplo: 100 / 2000 = 5% = 500 bps
      expect(await engine.setupBased(100, 2000)).to.equal(500);
    });
    it("debe devolver 0 si setupCount es 0", async function () {
      expect(await engine.setupBased(0, 2000)).to.equal(0);
    });
    it("debe devolver 10,000 si setupCount >= maxSetups", async function () {
      expect(await engine.setupBased(2000, 2000)).to.equal(10000);
      expect(await engine.setupBased(2500, 2000)).to.equal(10000);
    });
    it("debe revertir si maxSetups es 0", async function () {
      await expect(engine.setupBased(1, 0)).to.be.revertedWithCustomError(engine, "InvalidReferenceValue");
    });
  });

  describe("LINEAR", function () {
    it("debe calcular correctamente la depreciación proporcional", async function () {
      // Ejemplo: 500 / 2000 = 25% = 2500 bps
      expect(await engine.linearTimeBased(500, 2000)).to.equal(2500);
    });
    it("debe devolver 0 si operatingHours es 0", async function () {
      expect(await engine.linearTimeBased(0, 2000)).to.equal(0);
    });
    it("debe devolver 10,000 si operatingHours >= maxLifetimeHours", async function () {
      expect(await engine.linearTimeBased(2000, 2000)).to.equal(10000);
      expect(await engine.linearTimeBased(2500, 2000)).to.equal(10000);
    });
    it("debe revertir si maxLifetimeHours es 0", async function () {
      await expect(engine.linearTimeBased(1, 0)).to.be.revertedWithCustomError(engine, "InvalidReferenceValue");
    });
  });

  // Modelos deshabilitados: EFFICIENCY_BASED y TIME_BASED
});
