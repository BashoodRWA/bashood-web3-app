const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("BashoodRWAReference - Depreciation Integration (EXTRUSION_BASED, SETUP_BASED, LINEAR)", function () {
  let rwa, admin;

  beforeEach(async function () {
    [admin] = await ethers.getSigners();
    const BashoodRWAReference = await ethers.getContractFactory("BashoodRWAReference");
    rwa = await upgrades.deployProxy(
      BashoodRWAReference,
      ["BashoodRWA", "BRWA", "ipfs://base/", admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await rwa.waitForDeployment();
  });

  it("depreciación EXTRUSION_BASED correcta", async function () {
    const identification = {
      name: "ICON Vulcan",
      category: 0,
      manufacturer: "ICON",
      model: "VULCAN",
      serialNumber: "SN-002",
      yearManufactured: 2021,
      countryOfOrigin: "US"
    };
    const specs = [3000,40,15,0,0,0,6000,30,true,false,100];
    const financials = {
      purchasePrice: 1600000,
      currentValue: 1600000,
      residualValuePct: 15,
      lastAppraisalDate: Math.floor(Date.now() / 1000),
      depModel: 1, // EXTRUSION_BASED
      annualMaintenancePct: 3,
      insurancePremiumPct: 2
    };
    const operational = {
      status: 1,
      operatingHours: 0,
      maxLifetimeHours: 0,
      totalLoadLifted: 0,
      maxLoadLifetime: 0,
      metersExtruded: 50000,
      maxMetersLifetime: 50000,
      setupCount: 0,
      maxSetups: 0,
      cubicMetersPerDay: 0,
      lastMaintenanceDate: 0,
      nextMaintenanceDate: 0,
      maintenanceIntervalHours: 0
    };
    const metadataURI = "ipfs://example-metadata-uri";
    const tx = await rwa.mintAsset(admin.address, identification, specs, financials, operational, metadataURI);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return rwa.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "AssetMinted");
    const tokenId = event.args.tokenId;
    const dep = await rwa.getDepreciationPercentage(tokenId);
    expect(dep).to.equal(10000); // 100% depreciación
  });

  it("depreciación SETUP_BASED correcta", async function () {
    const identification = {
      name: "Apis Cor Setup",
      category: 0,
      manufacturer: "Apis Cor",
      model: "SETUP",
      serialNumber: "SN-003",
      yearManufactured: 2022,
      countryOfOrigin: "UAE"
    };
    const specs = [3000,40,15,0,0,0,6000,30,true,false,100];
    const financials = {
      purchasePrice: 900000,
      currentValue: 900000,
      residualValuePct: 12,
      lastAppraisalDate: Math.floor(Date.now() / 1000),
      depModel: 2, // SETUP_BASED
      annualMaintenancePct: 2,
      insurancePremiumPct: 1
    };
    const operational = {
      status: 1,
      operatingHours: 0,
      maxLifetimeHours: 0,
      totalLoadLifted: 0,
      maxLoadLifetime: 0,
      metersExtruded: 0,
      maxMetersLifetime: 0,
      setupCount: 100,
      maxSetups: 100,
      cubicMetersPerDay: 0,
      lastMaintenanceDate: 0,
      nextMaintenanceDate: 0,
      maintenanceIntervalHours: 0
    };
    const metadataURI = "ipfs://example-metadata-uri";
    const tx = await rwa.mintAsset(admin.address, identification, specs, financials, operational, metadataURI);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return rwa.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "AssetMinted");
    const tokenId = event.args.tokenId;
    const dep = await rwa.getDepreciationPercentage(tokenId);
    expect(dep).to.equal(10000); // 100% depreciación
  });

  it("depreciación LINEAR correcta", async function () {
    const identification = {
      name: "Mighty Buildings Linear",
      category: 0,
      manufacturer: "Mighty Buildings",
      model: "LINEAR",
      serialNumber: "SN-004",
      yearManufactured: 2023,
      countryOfOrigin: "US"
    };
    const specs = [3000,40,15,0,0,0,6000,30,true,false,100];
    const financials = {
      purchasePrice: 1200000,
      currentValue: 1200000,
      residualValuePct: 10,
      lastAppraisalDate: Math.floor(Date.now() / 1000),
      depModel: 5, // LINEAR
      annualMaintenancePct: 2,
      insurancePremiumPct: 1
    };
    const operational = {
      status: 1,
      operatingHours: Number(1),
      maxLifetimeHours: Number(1),
      totalLoadLifted: Number(0),
      maxLoadLifetime: Number(0),
      metersExtruded: Number(0),
      maxMetersLifetime: Number(0),
      setupCount: Number(0),
      maxSetups: Number(0),
      cubicMetersPerDay: Number(0),
      lastMaintenanceDate: Number(0),
      nextMaintenanceDate: Number(0),
      maintenanceIntervalHours: Number(0)
    };
    const metadataURI = "ipfs://example-metadata-uri";
    const tx = await rwa.mintAsset(admin.address, identification, specs, financials, operational, metadataURI);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return rwa.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "AssetMinted");
    const tokenId = event.args.tokenId;
    const dep = await rwa.getDepreciationPercentage(tokenId);
    expect(dep).to.equal(10000); // 100% depreciación
  });
});
