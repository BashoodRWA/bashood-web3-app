"use strict";
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compartidos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonicalización RFC 8785 mínima para tests:
 *   - Claves ordenadas lexicográficamente (recursivo)
 *   - Sin whitespace
 *   - Sin campos null/undefined
 */
function canonicalize(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const sorted = Object.keys(value)
      .sort()
      .filter((k) => value[k] !== null && value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`);
    return "{" + sorted.join(",") + "}";
  }
  throw new Error(`Non-serializable: ${typeof value}`);
}

function computeMetadataHash(jsonObject) {
  const canonical = canonicalize(jsonObject);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

// Structs de activo reutilizables (valores realistas, escalados a 1e18 para financials)
const IDENTIFICATION = {
  name: "Doosan DX360LC-7",
  category: 3, // HEAVY_VEHICLE (uint8)
  manufacturer: "Doosan Infracore",
  model: "DX360LC-7",
  serialNumber: "TRLU8841320",
  yearManufactured: 2021,
  countryOfOrigin: "KR",
};

const SPECS = [
  36000,  // loadCapacity (kg)
  3,      // displacementSpeed (m/min)
  220,    // powerConsumption (kW)
  0, 0, 0, // printVolume (n/a)
  0,      // materialPSI
  0,      // setupTimeMinutes
  false,  // autoLubrication
  true,   // gpsTracking
  0,      // cubicMetersPerDay
];

const FINANCIALS = {
  purchasePrice: ethers.parseUnits("320000", 18), // $320 000 USD × 1e18
  currentValue:  ethers.parseUnits("285000", 18), // $285 000 USD × 1e18
  residualValuePct: 15,
  lastAppraisalDate: Math.floor(Date.now() / 1000),
  depModel: 3, // TIME_BASED
  annualMaintenancePct: 300, // 3.00% en basis points
  insurancePremiumPct:  200, // 2.00% en basis points
};

const OPERATIONAL = {
  status: 0, // OPERATIONAL
  operatingHours: 1200,
  maxLifetimeHours: 20000,
  totalLoadLifted: 0,
  maxLoadLifetime: 0,
  metersExtruded: 0,
  maxMetersLifetime: 0,
  setupCount: 0,
  maxSetups: 0,
  cubicMetersPerDay: 0,
  lastMaintenanceDate: 0,
  nextMaintenanceDate: 0,
  maintenanceIntervalHours: 500,
};

const METADATA_URI = "ipfs://QmDoosanDX360LC7MetadataHash";

// JSON canónico de ejemplo (subconjunto representativo del schema BASHOOD-RWA-1.0)
const SAMPLE_JSON = {
  assetClass: "MACHINERY",
  financials: {
    annualMaintenancePct: 3,
    currency: "USD",
    depreciationModel: "TIME_BASED",
    purchasePrice: 320000,
    residualValuePct: 15,
  },
  identification: {
    countryOfOrigin: "KR",
    manufacturer: "Doosan Infracore",
    model: "DX360LC-7",
    serialNumber: "TRLU8841320",
    yearManufactured: 2021,
  },
  name: "Doosan DX360LC-7",
  schemaVersion: "BASHOOD-RWA-1.0",
};

// ─────────────────────────────────────────────────────────────────────────────

describe("BashoodRWAReferenceV2 — Metadata Integrity", function () {
  let rwa, admin, assetManager, user;

  beforeEach(async function () {
    [admin, assetManager, user] = await ethers.getSigners();

    const V2Factory = await ethers.getContractFactory("BashoodRWAReferenceV2");

    rwa = await upgrades.deployProxy(
      V2Factory,
      ["BashoodRWA-V2", "BRWAv2", "ipfs://base/", admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await rwa.waitForDeployment();

    // assetManager recibe el rol necesario para mintear
    const ASSET_MANAGER_ROLE = await rwa.ASSET_MANAGER_ROLE();
    await rwa.connect(admin).grantRole(ASSET_MANAGER_ROLE, assetManager.address);
  });

  // ─── version() ────────────────────────────────────────────────────────────

  describe("version()", function () {
    it("devuelve BASHOOD-RWA-2.0.0", async function () {
      expect(await rwa.version()).to.equal("BASHOOD-RWA-2.0.0");
    });
  });

  // ─── mintAssetV2 — happy path ─────────────────────────────────────────────

  describe("mintAssetV2 — happy path", function () {
    it("minta con éxito y almacena el hash correcto", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);

      const tx = await rwa
        .connect(assetManager)
        .mintAssetV2(
          user.address,
          IDENTIFICATION,
          SPECS,
          FINANCIALS,
          OPERATIONAL,
          METADATA_URI,
          hash
        );
      const receipt = await tx.wait();

      // Verificar eventos
      const mintedEvent = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      expect(mintedEvent).to.not.be.null;

      const hashEvent = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "MetadataHashStored");
      expect(hashEvent).to.not.be.null;
      expect(hashEvent.args.hash).to.equal(hash);

      const tokenId = mintedEvent.args.tokenId;

      // Verificar owner
      expect(await rwa.ownerOf(tokenId)).to.equal(user.address);
    });

    it("getMetadataHash devuelve el hash almacenado", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      const tx = await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      const tokenId = event.args.tokenId;

      expect(await rwa.getMetadataHash(tokenId)).to.equal(hash);
    });

    it("tokenURI devuelve la URI correcta tras mintAssetV2", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      const tx = await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      const tokenId = event.args.tokenId;

      expect(await rwa.tokenURI(tokenId)).to.equal(METADATA_URI);
    });

    it("los datos de identificación son recuperables tras el mint", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      const tx = await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      const tokenId = event.args.tokenId;

      const id = await rwa.getAssetIdentification(tokenId);
      expect(id.manufacturer).to.equal(IDENTIFICATION.manufacturer);
      expect(id.model).to.equal(IDENTIFICATION.model);
      expect(id.serialNumber).to.equal(IDENTIFICATION.serialNumber);
    });

    it("los datos financieros son recuperables tras el mint", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      const tx = await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      const tokenId = event.args.tokenId;

      const fin = await rwa.getFinancialData(tokenId);
      expect(fin.purchasePrice).to.equal(FINANCIALS.purchasePrice);
      expect(fin.residualValuePct).to.equal(FINANCIALS.residualValuePct);
    });

    it("el índice de categoría se actualiza correctamente", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash);

      const tokens = await rwa.getAssetsByCategory(3); // HEAVY_VEHICLE
      expect(tokens.length).to.be.greaterThan(0);
    });
  });

  // ─── mintAssetV2 — validaciones de entrada ────────────────────────────────

  describe("mintAssetV2 — validación de parámetros", function () {
    it("revierte con bytes32(0) como hash", async function () {
      await expect(
        rwa.connect(assetManager).mintAssetV2(
          user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(rwa, "MetadataHashRequired");
    });

    it("revierte con address(0) como receptor", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      await expect(
        rwa.connect(assetManager).mintAssetV2(
          ethers.ZeroAddress, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash
        )
      ).to.be.revertedWithCustomError(rwa, "InvalidRecipient");
    });

    it("revierte con purchasePrice == 0", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      const badFin = { ...FINANCIALS, purchasePrice: 0n };
      await expect(
        rwa.connect(assetManager).mintAssetV2(
          user.address, IDENTIFICATION, SPECS, badFin, OPERATIONAL, METADATA_URI, hash
        )
      ).to.be.revertedWithCustomError(rwa, "InvalidPurchasePrice");
    });

    it("revierte si lo llama una cuenta sin ASSET_MANAGER_ROLE", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);
      await expect(
        rwa.connect(user).mintAssetV2(
          user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash
        )
      ).to.be.reverted;
    });
  });

  // ─── verifyMetadata ───────────────────────────────────────────────────────

  describe("verifyMetadata", function () {
    let tokenId;
    let storedHash;

    beforeEach(async function () {
      storedHash = computeMetadataHash(SAMPLE_JSON);
      const tx = await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, storedHash);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      tokenId = event.args.tokenId;
    });

    it("retorna true cuando el hash coincide", async function () {
      expect(await rwa.verifyMetadata(tokenId, storedHash)).to.equal(true);
    });

    it("revierte con 'mismatch' cuando se proporciona un hash incorrecto", async function () {
      const wrongHash = computeMetadataHash({ ...SAMPLE_JSON, name: "TAMPERED" });
      await expect(rwa.verifyMetadata(tokenId, wrongHash))
        .to.be.revertedWithCustomError(rwa, "MetadataHashMismatch");
    });

    it("revierte si el token no tiene hash almacenado (minteado con V1)", async function () {
      // Mintear con V1 mintAsset (sin hash)
      const txV1 = await rwa
        .connect(assetManager)
        .mintAsset(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, "ipfs://v1uri");
      const receiptV1 = await txV1.wait();
      const eventV1 = receiptV1.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      const v1TokenId = eventV1.args.tokenId;

      await expect(rwa.verifyMetadata(v1TokenId, storedHash))
        .to.be.revertedWithCustomError(rwa, "TokenHasNoStoredHash");
    });
  });

  // ─── getMetadataHash — tokens sin hash (V1) ──────────────────────────────

  describe("getMetadataHash — token minteado con V1", function () {
    it("devuelve bytes32(0) para tokens sin hash", async function () {
      const txV1 = await rwa
        .connect(assetManager)
        .mintAsset(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, "ipfs://v1uri");
      const receiptV1 = await txV1.wait();
      const event = receiptV1.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");
      const tokenId = event.args.tokenId;

      expect(await rwa.getMetadataHash(tokenId)).to.equal(ethers.ZeroHash);
    });
  });

  // ─── canonicalización determinista ───────────────────────────────────────

  describe("canonicalización — determinismo del hash", function () {
    it("JSON con claves desordenadas produce el mismo hash", async function () {
      // El mismo objeto con claves en distinto orden
      const jsonA = {
        schemaVersion: "BASHOOD-RWA-1.0",
        name: "Test",
        assetClass: "MACHINERY",
      };
      const jsonB = {
        assetClass: "MACHINERY",
        name: "Test",
        schemaVersion: "BASHOOD-RWA-1.0",
      };
      expect(computeMetadataHash(jsonA)).to.equal(computeMetadataHash(jsonB));
    });

    it("JSON con un campo extra produce hash distinto", async function () {
      const jsonA = { name: "Asset", assetClass: "ENERGY" };
      const jsonB = { name: "Asset", assetClass: "ENERGY", extra: "field" };
      expect(computeMetadataHash(jsonA)).to.not.equal(computeMetadataHash(jsonB));
    });

    it("JSON con valor modificado produce hash distinto", async function () {
      const jsonA = { ...SAMPLE_JSON };
      const jsonB = { ...SAMPLE_JSON, name: "TAMPERED ASSET" };
      expect(computeMetadataHash(jsonA)).to.not.equal(computeMetadataHash(jsonB));
    });
  });

  // ─── compatibilidad retroactiva con V1 ───────────────────────────────────

  describe("compatibilidad retroactiva — V1 mintAsset sigue funcionando", function () {
    it("mintAsset (V1) minta correctamente sin almacenar hash", async function () {
      const tx = await rwa
        .connect(assetManager)
        .mintAsset(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, "ipfs://legacyuri");
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");

      expect(event).to.not.be.null;
      const tokenId = event.args.tokenId;
      expect(await rwa.ownerOf(tokenId)).to.equal(user.address);
      expect(await rwa.getMetadataHash(tokenId)).to.equal(ethers.ZeroHash);
    });

    it("tokens V1 y V2 tienen IDs secuenciales correlativos", async function () {
      const hash = computeMetadataHash(SAMPLE_JSON);

      const txV1 = await rwa
        .connect(assetManager)
        .mintAsset(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, "ipfs://v1");
      const receiptV1 = await txV1.wait();
      const eventV1 = receiptV1.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");

      const txV2 = await rwa
        .connect(assetManager)
        .mintAssetV2(user.address, IDENTIFICATION, SPECS, FINANCIALS, OPERATIONAL, METADATA_URI, hash);
      const receiptV2 = await txV2.wait();
      const eventV2 = receiptV2.logs
        .map((l) => { try { return rwa.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "AssetMinted");

      const idV1 = BigInt(eventV1.args.tokenId);
      const idV2 = BigInt(eventV2.args.tokenId);
      expect(idV2).to.equal(idV1 + 1n);
    });
  });
});
