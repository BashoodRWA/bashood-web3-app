/**
 * InsuranceModule – Test suite
 *
 * Plan M4 – Fase 3: tercer módulo externo del protocolo Bashood.
 *
 * Cobertura:
 *   · Identidad e inmutables (coreContract, moduleId, moduleVersion, requiredRole)
 *   · constructor – address(0) revierte
 *   · grantInsurer / revokeInsurer / isInsurer
 *   · registerPolicy – happy path, renovación, validaciones, eventos
 *   · revokePolicy – happy path, sin póliza activa, no insurer
 *   · getPolicy – datos correctos, sin póliza devuelve defaults
 *   · isInsured – vigente, sin expiración, expirada, revocada
 *   · requiredRole = bytes32(0) → no se requiere grantRole en el Core
 *   · Escenario end-to-end: mint → register → isInsured → revoke → renew
 */

const { expect }  = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de struct para mintAsset
// ──────────────────────────────────────────────────────────────────────────────

const makeIdentification = () => ({
  name:             "Test Crane",
  category:         0,
  manufacturer:     "LIEBHERR",
  model:            "LTM-1100",
  serialNumber:     "SN-INS-001",
  yearManufactured: 2021,
  countryOfOrigin:  "DE",
});

const makeSpecs = () => [3000, 40, 15, 0, 0, 0, 6000, 30, true, false, 100];

const makeFinancials = () => ({
  purchasePrice:        ethers.parseEther("1200000"),
  currentValue:         ethers.parseEther("1200000"),
  residualValuePct:     15,
  lastAppraisalDate:    Math.floor(Date.now() / 1000),
  depModel:             0,
  annualMaintenancePct: 4,
  insurancePremiumPct:  1,
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

// policyId canónico para tests
const POLICY_ID  = ethers.keccak256(ethers.toUtf8Bytes("POL-AXA-2026-001"));
const POLICY_ID2 = ethers.keccak256(ethers.toUtf8Bytes("POL-ALLIANZ-2026-001"));

const PROVIDER        = "AXA Industrial";
const COVERAGE        = ethers.parseEther("2000000");  // 2M USD
const PREMIUM         = ethers.parseEther("20000");    // 20k USD/año

// ──────────────────────────────────────────────────────────────────────────────
// Suite principal
// ──────────────────────────────────────────────────────────────────────────────

describe("InsuranceModule", function () {
  let admin, insurer, stranger;
  let core, module_;
  let tokenId;

  beforeEach(async function () {
    [admin, insurer, stranger] = await ethers.getSigners();

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
      "ipfs://test-insurance-metadata"
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return core.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "AssetMinted");
    tokenId = event.args.tokenId;

    // ── Deploy InsuranceModule (sin grantRole al Core) ──
    const ModuleFactory = await ethers.getContractFactory("InsuranceModule");
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

    it("moduleId() es keccak256('Insurance/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("Insurance/1.0"));
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
      const Factory = await ethers.getContractFactory("InsuranceModule");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("BashoodModule: core is zero address");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Gestión de insurers
  // ──────────────────────────────────────────────────────────────────────────

  describe("grantInsurer / revokeInsurer / isInsurer", function () {
    it("owner es insurer implícito sin grantInsurer", async function () {
      expect(await module_.isInsurer(admin.address)).to.be.true;
    });

    it("stranger no es insurer por defecto", async function () {
      expect(await module_.isInsurer(stranger.address)).to.be.false;
    });

    it("grantInsurer añade al whitelist y emite InsurerGranted", async function () {
      await expect(module_.connect(admin).grantInsurer(insurer.address))
        .to.emit(module_, "InsurerGranted")
        .withArgs(insurer.address);
      expect(await module_.isInsurer(insurer.address)).to.be.true;
    });

    it("grantInsurer revierte si ya es insurer", async function () {
      await module_.connect(admin).grantInsurer(insurer.address);
      await expect(module_.connect(admin).grantInsurer(insurer.address))
        .to.be.revertedWith("InsuranceModule: already an insurer");
    });

    it("grantInsurer revierte con address(0)", async function () {
      await expect(module_.connect(admin).grantInsurer(ethers.ZeroAddress))
        .to.be.revertedWith("InsuranceModule: zero insurer address");
    });

    it("revokeInsurer elimina del whitelist y emite InsurerRevoked", async function () {
      await module_.connect(admin).grantInsurer(insurer.address);
      await expect(module_.connect(admin).revokeInsurer(insurer.address))
        .to.emit(module_, "InsurerRevoked")
        .withArgs(insurer.address);
      expect(await module_.isInsurer(insurer.address)).to.be.false;
    });

    it("revokeInsurer revierte si no era insurer", async function () {
      await expect(module_.connect(admin).revokeInsurer(stranger.address))
        .to.be.revertedWith("InsuranceModule: not an insurer");
    });

    it("non-owner no puede grantInsurer", async function () {
      await expect(module_.connect(stranger).grantInsurer(insurer.address))
        .to.be.revertedWithCustomError(module_, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. registerPolicy
  // ──────────────────────────────────────────────────────────────────────────

  describe("registerPolicy", function () {
    let futureExpiry;

    beforeEach(async function () {
      futureExpiry = (await time.latest()) + 365 * 24 * 3600;
    });

    it("owner registra póliza correctamente", async function () {
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, futureExpiry
      );
      const p = await module_.getPolicy(tokenId);
      expect(p.active).to.be.true;
      expect(p.policyId).to.equal(POLICY_ID);
      expect(p.provider).to.equal(PROVIDER);
      expect(p.coverageAmount).to.equal(COVERAGE);
      expect(p.annualPremium).to.equal(PREMIUM);
      expect(p.expiryDate).to.equal(futureExpiry);
      expect(p.registeredBy).to.equal(admin.address);
    });

    it("insurer autorizado registra póliza", async function () {
      await module_.connect(admin).grantInsurer(insurer.address);
      await module_.connect(insurer).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, futureExpiry
      );
      const p = await module_.getPolicy(tokenId);
      expect(p.registeredBy).to.equal(insurer.address);
    });

    it("emite PolicyRegistered y ModuleOperationExecuted", async function () {
      await expect(
        module_.connect(admin).registerPolicy(
          tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, futureExpiry
        )
      )
        .to.emit(module_, "PolicyRegistered")
        .withArgs(tokenId, POLICY_ID, PROVIDER, COVERAGE, futureExpiry)
        .and.to.emit(module_, "ModuleOperationExecuted")
        .withArgs(tokenId, admin.address);
    });

    it("expiryDate 0 es válido (sin vencimiento)", async function () {
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, 0
      );
      const p = await module_.getPolicy(tokenId);
      expect(p.expiryDate).to.equal(0);
    });

    it("annualPremium 0 es válido", async function () {
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, 0, futureExpiry
      );
      const p = await module_.getPolicy(tokenId);
      expect(p.annualPremium).to.equal(0);
    });

    it("renovación (registerPolicy de nuevo) sobreescribe la póliza anterior", async function () {
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, futureExpiry
      );
      const newExpiry = futureExpiry + 365 * 24 * 3600;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID2, "Allianz Global", COVERAGE * 2n, PREMIUM, newExpiry
      );
      const p = await module_.getPolicy(tokenId);
      expect(p.policyId).to.equal(POLICY_ID2);
      expect(p.provider).to.equal("Allianz Global");
      expect(p.expiryDate).to.equal(newExpiry);
    });

    it("revierte si token no existe en el Core", async function () {
      await expect(
        module_.connect(admin).registerPolicy(
          9999n, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, futureExpiry
        )
      ).to.be.reverted;
    });

    it("revierte si policyId es bytes32(0)", async function () {
      await expect(
        module_.connect(admin).registerPolicy(
          tokenId, ethers.ZeroHash, PROVIDER, COVERAGE, PREMIUM, futureExpiry
        )
      ).to.be.revertedWith("InsuranceModule: policyId is zero");
    });

    it("revierte si provider es cadena vacía", async function () {
      await expect(
        module_.connect(admin).registerPolicy(
          tokenId, POLICY_ID, "", COVERAGE, PREMIUM, futureExpiry
        )
      ).to.be.revertedWith("InsuranceModule: provider is empty");
    });

    it("revierte si coverageAmount es 0", async function () {
      await expect(
        module_.connect(admin).registerPolicy(
          tokenId, POLICY_ID, PROVIDER, 0, PREMIUM, futureExpiry
        )
      ).to.be.revertedWith("InsuranceModule: coverage is zero");
    });

    it("revierte si expiryDate está en el pasado", async function () {
      const pastExpiry = (await time.latest()) - 3600;
      await expect(
        module_.connect(admin).registerPolicy(
          tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, pastExpiry
        )
      ).to.be.revertedWith("InsuranceModule: expiry in the past");
    });

    it("stranger no puede registrar póliza", async function () {
      await expect(
        module_.connect(stranger).registerPolicy(
          tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, futureExpiry
        )
      ).to.be.revertedWith("InsuranceModule: not an insurer");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. revokePolicy
  // ──────────────────────────────────────────────────────────────────────────

  describe("revokePolicy", function () {
    beforeEach(async function () {
      const expiry = (await time.latest()) + 365 * 24 * 3600;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
    });

    it("owner revoca y emite PolicyRevoked + ModuleOperationExecuted", async function () {
      await expect(module_.connect(admin).revokePolicy(tokenId))
        .to.emit(module_, "PolicyRevoked")
        .withArgs(tokenId, POLICY_ID, admin.address)
        .and.to.emit(module_, "ModuleOperationExecuted")
        .withArgs(tokenId, admin.address);
      expect((await module_.getPolicy(tokenId)).active).to.be.false;
    });

    it("insurer autorizado puede revocar", async function () {
      await module_.connect(admin).grantInsurer(insurer.address);
      await module_.connect(insurer).revokePolicy(tokenId);
      expect((await module_.getPolicy(tokenId)).active).to.be.false;
    });

    it("revierte si no hay póliza activa", async function () {
      await module_.connect(admin).revokePolicy(tokenId);
      await expect(module_.connect(admin).revokePolicy(tokenId))
        .to.be.revertedWith("InsuranceModule: no active policy");
    });

    it("stranger no puede revocar", async function () {
      await expect(module_.connect(stranger).revokePolicy(tokenId))
        .to.be.revertedWith("InsuranceModule: not an insurer");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. isInsured
  // ──────────────────────────────────────────────────────────────────────────

  describe("isInsured", function () {
    it("póliza activa y no vencida → true", async function () {
      const expiry = (await time.latest()) + 7200;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
      expect(await module_.isInsured(tokenId)).to.be.true;
    });

    it("póliza activa con expiryDate 0 (sin vencimiento) → true", async function () {
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, 0
      );
      expect(await module_.isInsured(tokenId)).to.be.true;
    });

    it("sin póliza registrada → false", async function () {
      expect(await module_.isInsured(tokenId)).to.be.false;
    });

    it("póliza activa pero vencida (time avanza) → false", async function () {
      const expiry = (await time.latest()) + 3600;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
      await time.increaseTo(expiry + 1);
      expect(await module_.isInsured(tokenId)).to.be.false;
    });

    it("póliza revocada → false", async function () {
      const expiry = (await time.latest()) + 7200;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
      await module_.connect(admin).revokePolicy(tokenId);
      expect(await module_.isInsured(tokenId)).to.be.false;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. No requiere rol en el Core (requiredRole = bytes32(0))
  // ──────────────────────────────────────────────────────────────────────────

  describe("Integración con Core: sin rol requerido", function () {
    it("el módulo funciona sin grantRole() en el Core", async function () {
      // No se ha hecho grantRole en ningún momento del beforeEach.
      const expiry = (await time.latest()) + 3600;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
      expect(await module_.isInsured(tokenId)).to.be.true;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. getPolicy — token sin póliza devuelve defaults
  // ──────────────────────────────────────────────────────────────────────────

  describe("getPolicy — defaults", function () {
    it("token sin póliza devuelve PolicyRecord vacío (active=false)", async function () {
      const p = await module_.getPolicy(tokenId);
      expect(p.active).to.be.false;
      expect(p.policyId).to.equal(ethers.ZeroHash);
      expect(p.provider).to.equal("");
      expect(p.coverageAmount).to.equal(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Escenario end-to-end
  // ──────────────────────────────────────────────────────────────────────────

  describe("Escenario end-to-end", function () {
    it("mint → register → isInsured → revocar → !isInsured → renovar → isInsured", async function () {
      const expiry = (await time.latest()) + 365 * 24 * 3600;

      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
      expect(await module_.isInsured(tokenId)).to.be.true;

      await module_.connect(admin).revokePolicy(tokenId);
      expect(await module_.isInsured(tokenId)).to.be.false;

      // Renovar con nueva póliza
      const newExpiry = expiry + 365 * 24 * 3600;
      await module_.connect(admin).registerPolicy(
        tokenId, POLICY_ID2, "FM Global", COVERAGE, PREMIUM, newExpiry
      );
      expect(await module_.isInsured(tokenId)).to.be.true;
      expect((await module_.getPolicy(tokenId)).provider).to.equal("FM Global");
    });

    it("insurer delgado registra, owner revoca, cobertura vuelta a cero", async function () {
      await module_.connect(admin).grantInsurer(insurer.address);
      const expiry = (await time.latest()) + 365 * 24 * 3600;

      await module_.connect(insurer).registerPolicy(
        tokenId, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry
      );
      expect(await module_.isInsured(tokenId)).to.be.true;

      await module_.connect(admin).revokePolicy(tokenId);
      expect(await module_.isInsured(tokenId)).to.be.false;
    });
  });
});
