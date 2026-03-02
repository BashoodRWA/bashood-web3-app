/**
 * CertificationModule – Test suite
 *
 * Plan M4 – Fase 3: segundo módulo externo del protocolo Bashood.
 *
 * Cobertura:
 *   · Identidad e inmutables (coreContract, moduleId, moduleVersion, requiredRole)
 *   · constructor – address(0) revierte
 *   · grantCertifier / revokeCertifier / isCertifier
 *   · addCertification – happy path, renovación, validaciones, eventos
 *   · revokeCertification – happy path, cert no activa, no certifier
 *   · getCertification – datos correctos, cert no existente devuelve defaults
 *   · isActive – vigente, sin expiración, expirada, revocada
 *   · isCompliant – todas activas, una falta, una expirada, array vacío
 *   · requiredRole = bytes32(0) → no se requiere grantRole en el Core
 *   · Escenario end-to-end: mint → certif → compliant → revoke → no compliant
 */

const { expect }  = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de struct para mintAsset
// ──────────────────────────────────────────────────────────────────────────────

const makeIdentification = (overrides = {}) => ({
  name:             "Test Printer",
  category:         0,
  manufacturer:     "EVOCONS",
  model:            "EVOBLOCK",
  serialNumber:     "SN-CERT-001",
  yearManufactured: 2022,
  countryOfOrigin:  "ES",
  ...overrides,
});

const makeSpecs = () => [3000, 40, 15, 0, 0, 0, 6000, 30, true, false, 100];

const makeFinancials = () => ({
  purchasePrice:        ethers.parseEther("500000"),
  currentValue:         ethers.parseEther("500000"),
  residualValuePct:     10,
  lastAppraisalDate:    Math.floor(Date.now() / 1000),
  depModel:             0,
  annualMaintenancePct: 5,
  insurancePremiumPct:  2,
});

const makeOperational = () => ({
  status:                   0,
  operatingHours:           0,
  maxLifetimeHours:         0,
  totalLoadLifted:          0,
  maxLoadLifetime:          500000,
  metersExtruded:           0,
  maxMetersLifetime:        0,
  setupCount:               0,
  maxSetups:                0,
  cubicMetersPerDay:        0,
  lastMaintenanceDate:      0,
  nextMaintenanceDate:      0,
  maintenanceIntervalHours: 0,
});

// certType bytes32 canónicos para tests
const CE_MARK  = ethers.keccak256(ethers.toUtf8Bytes("CE_MARK"));
const ISO_9001 = ethers.keccak256(ethers.toUtf8Bytes("ISO_9001"));
const ISO_14001 = ethers.keccak256(ethers.toUtf8Bytes("ISO_14001"));

const DOC_HASH = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmTestHash"));
const ZERO_HASH = ethers.ZeroHash;

// ──────────────────────────────────────────────────────────────────────────────
// Suite principal
// ──────────────────────────────────────────────────────────────────────────────

describe("CertificationModule", function () {
  let admin, certifier, stranger;
  let core, module_;
  let tokenId;

  beforeEach(async function () {
    [admin, certifier, stranger] = await ethers.getSigners();

    // ── Deploy Core (UUPS proxy) ──
    const CoreFactory = await ethers.getContractFactory("BashoodRWAReference");
    core = await upgrades.deployProxy(
      CoreFactory,
      ["BashoodRWA", "BRWA", "ipfs://base/", admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await core.waitForDeployment();

    // ── Mint un token ──
    const tx = await core.connect(admin).mintAsset(
      admin.address,
      makeIdentification(),
      makeSpecs(),
      makeFinancials(),
      makeOperational(),
      "ipfs://test-metadata"
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return core.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "AssetMinted");
    tokenId = event.args.tokenId;

    // ── Deploy CertificationModule (sin grantRole al Core) ──
    const ModuleFactory = await ethers.getContractFactory("CertificationModule");
    module_ = await ModuleFactory.connect(admin).deploy(await core.getAddress());
    await module_.waitForDeployment();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Identidad e inmutables
  // ──────────────────────────────────────────────────────────────────────────

  describe("Identidad e inmutables", function () {
    it("coreContract() devuelve la dirección del Core", async function () {
      expect(await module_.coreContract()).to.equal(await core.getAddress());
    });

    it("moduleId() es keccak256('Certification/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("Certification/1.0"));
      expect(await module_.moduleId()).to.equal(expected);
    });

    it("moduleVersion() devuelve '1.0.0'", async function () {
      expect(await module_.moduleVersion()).to.equal("1.0.0");
    });

    it("requiredRole() es bytes32(0) — módulo read-only respecto al Core", async function () {
      expect(await module_.requiredRole()).to.equal(ethers.ZeroHash);
    });

    it("owner es el deployer", async function () {
      expect(await module_.owner()).to.equal(admin.address);
    });

    it("constructor revierte con core address(0)", async function () {
      const Factory = await ethers.getContractFactory("CertificationModule");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("BashoodModule: core is zero address");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Gestión de certifiers
  // ──────────────────────────────────────────────────────────────────────────

  describe("grantCertifier / revokeCertifier / isCertifier", function () {
    it("owner es certifier implícito sin grantCertifier", async function () {
      expect(await module_.isCertifier(admin.address)).to.be.true;
    });

    it("stranger no es certifier por defecto", async function () {
      expect(await module_.isCertifier(stranger.address)).to.be.false;
    });

    it("grantCertifier añade al whitelist y emite CertifierGranted", async function () {
      await expect(module_.connect(admin).grantCertifier(certifier.address))
        .to.emit(module_, "CertifierGranted")
        .withArgs(certifier.address);
      expect(await module_.isCertifier(certifier.address)).to.be.true;
    });

    it("grantCertifier revierte si ya es certifier", async function () {
      await module_.connect(admin).grantCertifier(certifier.address);
      await expect(module_.connect(admin).grantCertifier(certifier.address))
        .to.be.revertedWith("CertModule: already a certifier");
    });

    it("grantCertifier revierte con address(0)", async function () {
      await expect(module_.connect(admin).grantCertifier(ethers.ZeroAddress))
        .to.be.revertedWith("CertModule: zero certifier address");
    });

    it("revokeCertifier elimina del whitelist y emite CertifierRevoked", async function () {
      await module_.connect(admin).grantCertifier(certifier.address);
      await expect(module_.connect(admin).revokeCertifier(certifier.address))
        .to.emit(module_, "CertifierRevoked")
        .withArgs(certifier.address);
      expect(await module_.isCertifier(certifier.address)).to.be.false;
    });

    it("revokeCertifier revierte si no era certifier", async function () {
      await expect(module_.connect(admin).revokeCertifier(stranger.address))
        .to.be.revertedWith("CertModule: not a certifier");
    });

    it("non-owner no puede grantCertifier", async function () {
      await expect(module_.connect(stranger).grantCertifier(certifier.address))
        .to.be.revertedWithCustomError(module_, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. addCertification
  // ──────────────────────────────────────────────────────────────────────────

  describe("addCertification", function () {
    let futureExpiry;

    beforeEach(async function () {
      futureExpiry = (await time.latest()) + 365 * 24 * 3600; // 1 año
    });

    it("owner puede añadir certificación correctamente", async function () {
      await module_.connect(admin).addCertification(
        tokenId, CE_MARK, futureExpiry, DOC_HASH
      );
      const r = await module_.getCertification(tokenId, CE_MARK);
      expect(r.active).to.be.true;
      expect(r.expiryDate).to.equal(futureExpiry);
      expect(r.docHash).to.equal(DOC_HASH);
      expect(r.issuer).to.equal(admin.address);
    });

    it("certifier añade certificación (no solo owner)", async function () {
      await module_.connect(admin).grantCertifier(certifier.address);
      await module_.connect(certifier).addCertification(
        tokenId, ISO_9001, futureExpiry, DOC_HASH
      );
      const r = await module_.getCertification(tokenId, ISO_9001);
      expect(r.active).to.be.true;
      expect(r.issuer).to.equal(certifier.address);
    });

    it("emite CertificationAdded y ModuleOperationExecuted", async function () {
      await expect(
        module_.connect(admin).addCertification(tokenId, CE_MARK, futureExpiry, DOC_HASH)
      )
        .to.emit(module_, "CertificationAdded")
        .withArgs(tokenId, CE_MARK, futureExpiry, admin.address)
        .and.to.emit(module_, "ModuleOperationExecuted")
        .withArgs(tokenId, admin.address);
    });

    it("expiryDate 0 es válido (sin vencimiento)", async function () {
      await module_.connect(admin).addCertification(tokenId, CE_MARK, 0, DOC_HASH);
      const r = await module_.getCertification(tokenId, CE_MARK);
      expect(r.expiryDate).to.equal(0);
    });

    it("renovación sobreescribe la certificación anterior", async function () {
      await module_.connect(admin).addCertification(tokenId, CE_MARK, futureExpiry, DOC_HASH);
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmNewHash"));
      const newExpiry = futureExpiry + 365 * 24 * 3600;
      await module_.connect(admin).addCertification(tokenId, CE_MARK, newExpiry, newHash);
      const r = await module_.getCertification(tokenId, CE_MARK);
      expect(r.docHash).to.equal(newHash);
      expect(r.expiryDate).to.equal(newExpiry);
    });

    it("revierte si token no existe en el Core", async function () {
      await expect(
        module_.connect(admin).addCertification(9999n, CE_MARK, futureExpiry, DOC_HASH)
      ).to.be.reverted; // ERC721NonexistentToken
    });

    it("revierte si certType es bytes32(0)", async function () {
      await expect(
        module_.connect(admin).addCertification(tokenId, ZERO_HASH, futureExpiry, DOC_HASH)
      ).to.be.revertedWith("CertModule: certType is zero");
    });

    it("revierte si expiryDate está en el pasado", async function () {
      const pastExpiry = (await time.latest()) - 3600;
      await expect(
        module_.connect(admin).addCertification(tokenId, CE_MARK, pastExpiry, DOC_HASH)
      ).to.be.revertedWith("CertModule: expiry in the past");
    });

    it("stranger no puede añadir certificación", async function () {
      await expect(
        module_.connect(stranger).addCertification(tokenId, CE_MARK, futureExpiry, DOC_HASH)
      ).to.be.revertedWith("CertModule: not a certifier");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. revokeCertification
  // ──────────────────────────────────────────────────────────────────────────

  describe("revokeCertification", function () {
    beforeEach(async function () {
      const expiry = (await time.latest()) + 365 * 24 * 3600;
      await module_.connect(admin).addCertification(tokenId, CE_MARK, expiry, DOC_HASH);
    });

    it("owner revoca correctamente y emite CertificationRevoked", async function () {
      await expect(module_.connect(admin).revokeCertification(tokenId, CE_MARK))
        .to.emit(module_, "CertificationRevoked")
        .withArgs(tokenId, CE_MARK, admin.address);
      const r = await module_.getCertification(tokenId, CE_MARK);
      expect(r.active).to.be.false;
    });

    it("certifier puede revocar", async function () {
      await module_.connect(admin).grantCertifier(certifier.address);
      await module_.connect(certifier).revokeCertification(tokenId, CE_MARK);
      expect((await module_.getCertification(tokenId, CE_MARK)).active).to.be.false;
    });

    it("revierte si la certificación no está activa", async function () {
      await module_.connect(admin).revokeCertification(tokenId, CE_MARK);
      await expect(module_.connect(admin).revokeCertification(tokenId, CE_MARK))
        .to.be.revertedWith("CertModule: cert not active");
    });

    it("stranger no puede revocar", async function () {
      await expect(module_.connect(stranger).revokeCertification(tokenId, CE_MARK))
        .to.be.revertedWith("CertModule: not a certifier");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. isActive
  // ──────────────────────────────────────────────────────────────────────────

  describe("isActive", function () {
    it("activa + no expirada → true", async function () {
      const expiry = (await time.latest()) + 7200;
      await module_.connect(admin).addCertification(tokenId, CE_MARK, expiry, DOC_HASH);
      expect(await module_.isActive(tokenId, CE_MARK)).to.be.true;
    });

    it("activa + expiryDate 0 (sin vencimiento) → true", async function () {
      await module_.connect(admin).addCertification(tokenId, CE_MARK, 0, DOC_HASH);
      expect(await module_.isActive(tokenId, CE_MARK)).to.be.true;
    });

    it("cert no registrada → false", async function () {
      expect(await module_.isActive(tokenId, CE_MARK)).to.be.false;
    });

    it("activa pero expirada (time avanza) → false", async function () {
      const expiry = (await time.latest()) + 3600;
      await module_.connect(admin).addCertification(tokenId, CE_MARK, expiry, DOC_HASH);
      await time.increaseTo(expiry + 1);
      expect(await module_.isActive(tokenId, CE_MARK)).to.be.false;
    });

    it("revocada → false", async function () {
      const expiry = (await time.latest()) + 7200;
      await module_.connect(admin).addCertification(tokenId, CE_MARK, expiry, DOC_HASH);
      await module_.connect(admin).revokeCertification(tokenId, CE_MARK);
      expect(await module_.isActive(tokenId, CE_MARK)).to.be.false;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. isCompliant
  // ──────────────────────────────────────────────────────────────────────────

  describe("isCompliant", function () {
    let expiry;

    beforeEach(async function () {
      expiry = (await time.latest()) + 365 * 24 * 3600;
    });

    it("array vacío → true (sin requisitos = compliant)", async function () {
      expect(await module_.isCompliant(tokenId, [])).to.be.true;
    });

    it("todas las certs requeridas activas → true", async function () {
      await module_.connect(admin).addCertification(tokenId, CE_MARK,  expiry, DOC_HASH);
      await module_.connect(admin).addCertification(tokenId, ISO_9001, expiry, DOC_HASH);
      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001])).to.be.true;
    });

    it("una cert faltante → false", async function () {
      await module_.connect(admin).addCertification(tokenId, CE_MARK, expiry, DOC_HASH);
      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001])).to.be.false;
    });

    it("una cert expirada → false", async function () {
      const shortExpiry = (await time.latest()) + 3600;
      await module_.connect(admin).addCertification(tokenId, CE_MARK,  shortExpiry, DOC_HASH);
      await module_.connect(admin).addCertification(tokenId, ISO_9001, expiry,      DOC_HASH);
      await time.increaseTo(shortExpiry + 1);
      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001])).to.be.false;
    });

    it("una cert revocada → false", async function () {
      await module_.connect(admin).addCertification(tokenId, CE_MARK,  expiry, DOC_HASH);
      await module_.connect(admin).addCertification(tokenId, ISO_9001, expiry, DOC_HASH);
      await module_.connect(admin).revokeCertification(tokenId, CE_MARK);
      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001])).to.be.false;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. No requiere rol en el Core (requiredRole = bytes32(0))
  // ──────────────────────────────────────────────────────────────────────────

  describe("Integración con Core: sin rol requerido", function () {
    it("el módulo funciona sin grantRole() en el Core", async function () {
      // No se ha hecho grantRole en ningún momento del beforeEach.
      // Simplemente debe funcionar vía ownerOf().
      const expiry = (await time.latest()) + 3600;
      await module_.connect(admin).addCertification(tokenId, CE_MARK, expiry, DOC_HASH);
      expect(await module_.isActive(tokenId, CE_MARK)).to.be.true;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Escenario end-to-end
  // ──────────────────────────────────────────────────────────────────────────

  describe("Escenario end-to-end", function () {
    it("mint → certif × 3 → compliant → revoke → no compliant → renovar → compliant", async function () {
      const expiry = (await time.latest()) + 365 * 24 * 3600;

      await module_.connect(admin).addCertification(tokenId, CE_MARK,   expiry, DOC_HASH);
      await module_.connect(admin).addCertification(tokenId, ISO_9001,  expiry, DOC_HASH);
      await module_.connect(admin).addCertification(tokenId, ISO_14001, expiry, DOC_HASH);

      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001, ISO_14001])).to.be.true;

      // Revocar ISO_9001
      await module_.connect(admin).revokeCertification(tokenId, ISO_9001);
      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001, ISO_14001])).to.be.false;

      // Renovar ISO_9001
      const newExpiry = expiry + 365 * 24 * 3600;
      await module_.connect(admin).addCertification(tokenId, ISO_9001, newExpiry, DOC_HASH);
      expect(await module_.isCompliant(tokenId, [CE_MARK, ISO_9001, ISO_14001])).to.be.true;
    });
  });
});
