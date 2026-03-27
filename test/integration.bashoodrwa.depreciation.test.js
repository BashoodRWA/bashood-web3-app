const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("BashoodRWAReference - Depreciation Integration", function () {
  let rwa, admin, user;

  beforeEach(async function () {
    [admin, user] = await ethers.getSigners();
    const BashoodRWAReference = await ethers.getContractFactory("BashoodRWAReference");

    // Usar deployProxy para inicializar correctamente
    rwa = await upgrades.deployProxy(
      BashoodRWAReference,
      ["BashoodRWA", "BRWA", "ipfs://base/", admin.address],
      { initializer: "initialize", kind: "uups" }
    );

    await rwa.waitForDeployment();
  });

  it("debe calcular depreciación LOAD_BASED correctamente", async function () {
    // Crear structs completos
    const identification = {
      name: "EVOCONS Block",
      category: 0,
      manufacturer: "EVOCONS",
      model: "EVOBLOCK",
      serialNumber: "SN-001",
      yearManufactured: 2020,
      countryOfOrigin: "US"
    };
    const specs = [
      3000, // loadCapacity
      40, // displacementSpeed
      15, // powerConsumption
      0, // printVolumeX
      0, // printVolumeY
      0, // printVolumeZ
      6000, // materialPSI
      30, // setupTimeMinutes
      true, // autoLubrication
      false, // gpsTracking
      100 // cubicMetersPerDay
    ];
    const financials = {
      purchasePrice: 1000000,
      currentValue: 1000000,
      residualValuePct: 10,
      lastAppraisalDate: Math.floor(Date.now() / 1000),
      depModel: 0, // LOAD_BASED
      annualMaintenancePct: 5,
      insurancePremiumPct: 2
    };
    const operational = {
      status: 1, // OPERATIONAL
      operatingHours: 0,
      maxLifetimeHours: 0,
      totalLoadLifted: 72000,
      maxLoadLifetime: 500000,
      metersExtruded: 0,
      maxMetersLifetime: 0,
      setupCount: 0,
      maxSetups: 0,
      cubicMetersPerDay: 0,
      lastMaintenanceDate: 0,
      nextMaintenanceDate: 0,
      maintenanceIntervalHours: 0
    };
    const metadataURI = "ipfs://example-metadata-uri";

    // Agregar token usando mintAsset
    const tx = await rwa.mintAsset(admin.address, identification, specs, financials, operational, metadataURI);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => {
        try { return rwa.interface.parseLog(log); }
        catch { return null; }
      })
      .find(e => e && e.name === "AssetMinted");
    const tokenId = event.args.tokenId;

    // Obtener depreciación real
    const dep = await rwa.getDepreciationPercentage(tokenId);
    console.log("Depreciation real:", dep.toString());

    // Comparar con valor esperado
    const expectedDep = 1440; // Ejemplo: 72,000 / 500,000 = 14.4% = 1440 bps
    expect(dep).to.equal(expectedDep);
  });
});
