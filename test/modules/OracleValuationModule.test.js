/**
 * OracleValuationModule – Test suite
 *
 * Plan M4 – Fase 3: primer módulo externo del protocolo Bashood.
 *
 * Cobertura:
 *   · resolveValue – feed válido (8 dec, 18 dec, >18 dec)
 *   · resolveValue – feed stale (timeout, updatedAt=0, stale round, precio ≤ 0)
 *   · resolveValue – address zero
 *   · pushValuation – happy path + integración por rol
 *   · pushValuation – sin oráculo configurado en el token
 *   · pushValuation – módulo sin ASSET_MANAGER_ROLE → revert
 *   · setStalenessThreshold – éxito, demasiado bajo, no owner
 *   · coreContract() – inmutable correcto
 *   · Eventos: ValuationPushed, StalenessThresholdUpdated
 */

const { expect }  = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Struct helpers para mintAsset */
const makeIdentification = (overrides = {}) => ({
  name:             "Test Printer",
  category:         0,
  manufacturer:     "EVOCONS",
  model:            "EVOBLOCK",
  serialNumber:     "SN-TEST-001",
  yearManufactured: 2022,
  countryOfOrigin:  "ES",
  ...overrides,
});

const makeSpecs = () => [
  3000, 40, 15, 0, 0, 0, 6000, 30, true, false, 100,
];

const makeFinancials = (overrides = {}) => ({
  purchasePrice:        ethers.parseEther("500000"),
  currentValue:         ethers.parseEther("500000"),
  residualValuePct:     10,
  lastAppraisalDate:    Math.floor(Date.now() / 1000),
  depModel:             0,   // LOAD_BASED
  annualMaintenancePct: 5,
  insurancePremiumPct:  2,
  ...overrides,
});

const makeOperational = () => ({
  status:                  0,   // OPERATIONAL
  operatingHours:          0,
  maxLifetimeHours:        0,
  totalLoadLifted:         0,
  maxLoadLifetime:         500000,
  metersExtruded:          0,
  maxMetersLifetime:       0,
  setupCount:              0,
  maxSetups:               0,
  cubicMetersPerDay:       0,
  lastMaintenanceDate:     0,
  nextMaintenanceDate:     0,
  maintenanceIntervalHours: 0,
});

// ──────────────────────────────────────────────────────────────────────────────
// Suite principal
// ──────────────────────────────────────────────────────────────────────────────

describe("OracleValuationModule", function () {
  let admin, user, stranger;
  let core, module_, feed8, feed18, feedHigh;

  // ASSET_MANAGER_ROLE bytes32
  let ASSET_MANAGER_ROLE;

  beforeEach(async function () {
    [admin, user, stranger] = await ethers.getSigners();

    // ── Deploy Core (UUPS proxy) ────────────────────────────────────────────
    const BashoodRWAReference = await ethers.getContractFactory("BashoodRWAReference");
    core = await upgrades.deployProxy(
      BashoodRWAReference,
      ["BashoodRWA", "BRWA", "ipfs://base/", admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await core.waitForDeployment();

    ASSET_MANAGER_ROLE = await core.ASSET_MANAGER_ROLE();

    // ── Deploy OracleValuationModule ───────────────────────────────────────
    const OVM = await ethers.getContractFactory("OracleValuationModule");
    module_ = await OVM.deploy(await core.getAddress());
    await module_.waitForDeployment();

    // ── Grant ASSET_MANAGER_ROLE al módulo (patrón correcto: rol, no acoplamiento) ──
    await core.connect(admin).grantRole(ASSET_MANAGER_ROLE, await module_.getAddress());

    // ── Deploy MockPriceFeeds ──────────────────────────────────────────────
    const MockPriceFeed = await ethers.getContractFactory(
      "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
    );

    // Feed con 8 decimales (típico Chainlink USD)
    feed8 = await MockPriceFeed.deploy(8, ethers.parseUnits("50000", 8));
    await feed8.waitForDeployment();

    // Feed con 18 decimales
    feed18 = await MockPriceFeed.deploy(18, ethers.parseEther("50000"));
    await feed18.waitForDeployment();

    // Feed con 20 decimales (mayor que 18)
    feedHigh = await MockPriceFeed.deploy(20, ethers.parseUnits("50000", 20));
    await feedHigh.waitForDeployment();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Configuración e inmutables
  // ──────────────────────────────────────────────────────────────────────────

  describe("Configuración e inmutables", function () {
    it("coreContract() devuelve la dirección correcta del Core", async function () {
      expect(await module_.coreContract()).to.equal(await core.getAddress());
    });

    it("stalenessThreshold inicial es 3600 segundos", async function () {
      expect(await module_.stalenessThreshold()).to.equal(3600);
    });

    it("owner es el deployer", async function () {
      expect(await module_.owner()).to.equal(admin.address);
    });

    it("constructor revierte con core address(0)", async function () {
      const OVM = await ethers.getContractFactory("OracleValuationModule");
      await expect(OVM.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("OracleValuation: invalid core address");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. setStalenessThreshold
  // ──────────────────────────────────────────────────────────────────────────

  describe("setStalenessThreshold", function () {
    it("owner actualiza el threshold correctamente", async function () {
      await module_.connect(admin).setStalenessThreshold(7200);
      expect(await module_.stalenessThreshold()).to.equal(7200);
    });

    it("emite StalenessThresholdUpdated", async function () {
      await expect(module_.connect(admin).setStalenessThreshold(1800))
        .to.emit(module_, "StalenessThresholdUpdated")
        .withArgs(1800);
    });

    it("revierte si threshold < 60", async function () {
      await expect(module_.connect(admin).setStalenessThreshold(59))
        .to.be.revertedWith("OracleValuation: threshold too low");
    });

    it("revierte si no es owner", async function () {
      await expect(module_.connect(stranger).setStalenessThreshold(7200))
        .to.be.revertedWithCustomError(module_, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. resolveValue – normalización de decimales
  // ──────────────────────────────────────────────────────────────────────────

  describe("resolveValue – normalización de decimales", function () {
    it("escala correctamente desde 8 decimales → 1e18", async function () {
      // feed8 answer = 50000 * 1e8
      // Esperado: 50000 * 1e18
      const expected = ethers.parseEther("50000");
      expect(await module_.resolveValue(await feed8.getAddress())).to.equal(expected);
    });

    it("feed con 18 decimales no escala (valor directo)", async function () {
      const expected = ethers.parseEther("50000");
      expect(await module_.resolveValue(await feed18.getAddress())).to.equal(expected);
    });

    it("escala correctamente desde 20 decimales → 1e18 (divide)", async function () {
      // feed20 answer = 50000 * 1e20 → scaled = 50000 * 1e18
      const expected = ethers.parseEther("50000");
      expect(await module_.resolveValue(await feedHigh.getAddress())).to.equal(expected);
    });

    it("revierte con address zero", async function () {
      await expect(module_.resolveValue(ethers.ZeroAddress))
        .to.be.revertedWith("OracleValuation: zero feed address");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. resolveValue – validaciones de feed stale / inválido
  // ──────────────────────────────────────────────────────────────────────────

  describe("resolveValue – validaciones del feed", function () {
    it("revierte si answer ≤ 0 (price negativo)", async function () {
      const MockPriceFeed = await ethers.getContractFactory(
        "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
      );
      const negFeed = await MockPriceFeed.deploy(8, -1);
      await negFeed.waitForDeployment();

      await expect(module_.resolveValue(await negFeed.getAddress()))
        .to.be.revertedWith("OracleValuation: non-positive price");
    });

    it("revierte si updatedAt = 0 (stale round no completado)", async function () {
      const MockPriceFeed = await ethers.getContractFactory(
        "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
      );
      const staleFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("1000", 8));
      await staleFeed.waitForDeployment();

      // updatedAt = 0 usando timestamp pasado muy antiguo
      await staleFeed.setAnswerWithTimestamp(ethers.parseUnits("1000", 8), 0);

      await expect(module_.resolveValue(await staleFeed.getAddress()))
        .to.be.revertedWith("OracleValuation: stale updatedAt=0");
    });

    it("revierte si el round está stale (timeout superado)", async function () {
      const snapshot = await time.latest();
      // Configurar feed con timestamp muy viejo (más de 3600s)
      await feed8.setAnswerWithTimestamp(
        ethers.parseUnits("50000", 8),
        snapshot - 3601
      );

      await expect(module_.resolveValue(await feed8.getAddress()))
        .to.be.revertedWith("OracleValuation: staleness threshold exceeded");
    });

    it("revierte si answeredInRound < roundId (round incompleto)", async function () {
      await feed8.setAnswer(ethers.parseUnits("50000", 8)); // roundId = 2
      await feed8.setAnsweredInRound(1); // answeredInRound < roundId

      await expect(module_.resolveValue(await feed8.getAddress()))
        .to.be.revertedWith("OracleValuation: stale round");
    });

    it("acepta un feed dentro del threshold (margen seguro)", async function () {
      const now = await time.latest();
      await feed8.setAnswerWithTimestamp(
        ethers.parseUnits("50000", 8),
        now - 1800 // mitad del threshold, sin riesgo de off-by-one
      );
      // No debe revertir
      await expect(module_.resolveValue(await feed8.getAddress())).to.not.be.reverted;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. pushValuation – happy path + integración rol
  // ──────────────────────────────────────────────────────────────────────────

  describe("pushValuation – integración con BashoodCore", function () {
    let tokenId;

    beforeEach(async function () {
      // Mint un activo con oracleAddress configurado en TelemetryConfig
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

      // Configurar telemetría con el feed como oracleAddress
      await core.connect(admin).configureTelemetry(tokenId, {
        hasRealTimeAPI:     true,
        oracleAddress:      await feed8.getAddress(),
        apiProvider:        "TEST_FEED",
        apiKeyHash:         ethers.ZeroHash,
        lastTelemetryUpdate: 0,
      });
    });

    it("pushValuation actualiza el currentValue en el Core correctamente", async function () {
      const expected = ethers.parseEther("50000");

      await module_.connect(user).pushValuation(tokenId);

      const financial = await core.getFinancialData(tokenId);
      expect(financial.currentValue).to.equal(expected);
    });

    it("emite ValuationPushed con los argumentos correctos", async function () {
      const expected = ethers.parseEther("50000");
      await expect(module_.connect(user).pushValuation(tokenId))
        .to.emit(module_, "ValuationPushed")
        .withArgs(tokenId, await feed8.getAddress(), expected, 18, expected);
    });

    it("Core emite AssetValueUpdated tras la llamada del módulo", async function () {
      const expected = ethers.parseEther("50000");
      // Leer el valor anterior directamente para usar en withArgs
      const finBefore = await core.getFinancialData(tokenId);
      const oldValue = finBefore.currentValue;
      await expect(module_.connect(user).pushValuation(tokenId))
        .to.emit(core, "AssetValueUpdated")
        .withArgs(tokenId, oldValue, expected, "ORACLE_REVALUATION");
    });

    it("cualquier cuenta puede llamar pushValuation (el Core valida el rol del módulo)", async function () {
      // stranger no tiene rol en el Core, pero el módulo sí
      await expect(module_.connect(stranger).pushValuation(tokenId)).to.not.be.reverted;
    });

    it("revierte si no hay oracleAddress configurado en el token", async function () {
      // Mint un token sin telemetría configurada
      const tx2 = await core.connect(admin).mintAsset(
        admin.address,
        makeIdentification({ serialNumber: "SN-NO-ORACLE" }),
        makeSpecs(),
        makeFinancials(),
        makeOperational(),
        "ipfs://no-oracle"
      );
      const r2 = await tx2.wait();
      const ev2 = r2.logs
        .map(log => { try { return core.interface.parseLog(log); } catch { return null; } })
        .find(e => e && e.name === "AssetMinted");
      const tokenId2 = ev2.args.tokenId;

      await expect(module_.connect(user).pushValuation(tokenId2))
        .to.be.revertedWith("OracleValuation: no oracle configured for token");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Control de acceso: módulo sin rol → Core revierte
  // ──────────────────────────────────────────────────────────────────────────

  describe("Control de acceso: integración de rol", function () {
    let tokenId;

    beforeEach(async function () {
      const tx = await core.connect(admin).mintAsset(
        admin.address,
        makeIdentification({ serialNumber: "SN-ROL-001" }),
        makeSpecs(),
        makeFinancials(),
        makeOperational(),
        "ipfs://role-test"
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => { try { return core.interface.parseLog(log); } catch { return null; } })
        .find(e => e && e.name === "AssetMinted");
      tokenId = event.args.tokenId;

      await core.connect(admin).configureTelemetry(tokenId, {
        hasRealTimeAPI:     true,
        oracleAddress:      await feed8.getAddress(),
        apiProvider:        "TEST_FEED",
        apiKeyHash:         ethers.ZeroHash,
        lastTelemetryUpdate: 0,
      });
    });

    it("módulo sin ASSET_MANAGER_ROLE → pushValuation revierte en el Core", async function () {
      // Desplegar nuevo módulo SIN otorgarle el rol
      const OVM = await ethers.getContractFactory("OracleValuationModule");
      const unauthorizedModule = await OVM.deploy(await core.getAddress());
      await unauthorizedModule.waitForDeployment();

      // Configurar el mismo feed
      // La llamada debe revertir porque el Core rechaza la actualización de valor
      await expect(unauthorizedModule.connect(user).pushValuation(tokenId))
        .to.be.reverted;
    });

    it("revocar ASSET_MANAGER_ROLE bloquea el módulo correctamente", async function () {
      // Primero funciona
      await expect(module_.connect(user).pushValuation(tokenId)).to.not.be.reverted;

      // Revocar el rol
      await core.connect(admin).revokeRole(ASSET_MANAGER_ROLE, await module_.getAddress());

      // Ahora debe revertir
      await expect(module_.connect(user).pushValuation(tokenId)).to.be.reverted;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Escenario end-to-end: actualización de valor múltiple
  // ──────────────────────────────────────────────────────────────────────────

  describe("Escenario end-to-end", function () {
    it("dos pushValuation consecutivos actualizan el valor en cada ronda", async function () {
      const tx = await core.connect(admin).mintAsset(
        admin.address,
        makeIdentification({ serialNumber: "SN-E2E-001" }),
        makeSpecs(),
        makeFinancials(),
        makeOperational(),
        "ipfs://e2e"
      );
      const r = await tx.wait();
      const ev = r.logs
        .map(log => { try { return core.interface.parseLog(log); } catch { return null; } })
        .find(e => e && e.name === "AssetMinted");
      const tokenId = ev.args.tokenId;

      await core.connect(admin).configureTelemetry(tokenId, {
        hasRealTimeAPI:     true,
        oracleAddress:      await feed8.getAddress(),
        apiProvider:        "TEST_FEED",
        apiKeyHash:         ethers.ZeroHash,
        lastTelemetryUpdate: 0,
      });

      // Primera revaluación: 50,000 USD
      await module_.connect(user).pushValuation(tokenId);
      let fin = await core.getFinancialData(tokenId);
      expect(fin.currentValue).to.equal(ethers.parseEther("50000"));

      // Segunda revaluación: 45,000 USD
      await feed8.setAnswer(ethers.parseUnits("45000", 8));
      await module_.connect(user).pushValuation(tokenId);
      fin = await core.getFinancialData(tokenId);
      expect(fin.currentValue).to.equal(ethers.parseEther("45000"));
    });
  });
});


