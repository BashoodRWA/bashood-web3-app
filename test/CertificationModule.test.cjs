/**
 * test/CertificationModule.test.cjs
 *
 * Suite adversarial completa para CertificationModule.
 *
 * Cubre todas las ramas del contrato:
 *   ✅ Constructor: validación de core cero
 *   ✅ IBashoodModule: moduleId, moduleVersion, requiredRole, coreContract
 *   ✅ grantCertifier / revokeCertifier / isCertifier
 *   ✅ addCertification: tokenId 0, certType 0, token no mintado, expiry pasado
 *   ✅ addCertification: sin vencimiento (expiryDate = 0)
 *   ✅ addCertification: válida → storage + eventos
 *   ✅ revokeCertification: cert inactiva revierte, válida → desactiva
 *   ✅ isActive: activa, revocada, expirada, sin vencimiento
 *   ✅ isCompliant: array vacío, todos activos, uno revocado, uno expirado
 *   ✅ Access control: no-certifier no puede añadir ni revocar
 *   ✅ Owner es certifier implícito (sin grantCertifier)
 */
"use strict";

const { expect } = require("chai");
const { ethers }  = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

const CERT_ISO   = ethers.keccak256(ethers.toUtf8Bytes("ISO_9001"));
const CERT_CE    = ethers.keccak256(ethers.toUtf8Bytes("CE_MARK"));
const ZERO_BYTES = ethers.ZeroHash;

describe("CertificationModule", function () {
  let core, cert;
  let owner, certifier, stranger, tokenOwner;
  const TOKEN_ID = 42n;

  beforeEach(async function () {
    [owner, certifier, stranger, tokenOwner] = await ethers.getSigners();

    const MockCore = await ethers.getContractFactory(
      "contracts/mocks/MockCoreForModules.sol:MockCoreForModules"
    );
    core = await MockCore.deploy();
    await core.waitForDeployment();

    // Mintear token en el mock core
    await core.mint(TOKEN_ID, tokenOwner.address);

    const Cert = await ethers.getContractFactory("CertificationModule");
    cert = await Cert.deploy(await core.getAddress());
    await cert.waitForDeployment();
  });

  // ── Constructor ────────────────────────────────────────────────────────
  describe("constructor", function () {
    it("revierte con core = address(0)", async function () {
      const Cert = await ethers.getContractFactory("CertificationModule");
      await expect(Cert.deploy(ethers.ZeroAddress)).to.be.reverted;
    });

    it("queda correctamente enlazado al core", async function () {
      expect(await cert.coreContract()).to.equal(await core.getAddress());
    });
  });

  // ── IBashoodModule identity ────────────────────────────────────────────
  describe("IBashoodModule", function () {
    it("moduleId es keccak256('Certification/1.0')", async function () {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("Certification/1.0"));
      expect(await cert.moduleId()).to.equal(expected);
    });

    it("moduleVersion es '1.0.0'", async function () {
      expect(await cert.moduleVersion()).to.equal("1.0.0");
    });

    it("requiredRole es bytes32(0) — módulo read-only", async function () {
      expect(await cert.requiredRole()).to.equal(ZERO_BYTES);
    });
  });

  // ── grantCertifier ─────────────────────────────────────────────────────
  describe("grantCertifier()", function () {
    it("owner puede conceder rol de certifier", async function () {
      await expect(cert.grantCertifier(certifier.address))
        .to.emit(cert, "CertifierGranted")
        .withArgs(certifier.address);
      expect(await cert.isCertifier(certifier.address)).to.be.true;
    });

    it("revierte con dirección cero", async function () {
      await expect(cert.grantCertifier(ethers.ZeroAddress))
        .to.be.revertedWith("CertModule: zero certifier address");
    });

    it("revierte si ya es certifier", async function () {
      await cert.grantCertifier(certifier.address);
      await expect(cert.grantCertifier(certifier.address))
        .to.be.revertedWith("CertModule: already a certifier");
    });

    it("no-owner no puede conceder", async function () {
      await expect(cert.connect(stranger).grantCertifier(certifier.address))
        .to.be.reverted;
    });
  });

  // ── revokeCertifier ────────────────────────────────────────────────────
  describe("revokeCertifier()", function () {
    beforeEach(async function () {
      await cert.grantCertifier(certifier.address);
    });

    it("owner puede revocar certifier", async function () {
      await expect(cert.revokeCertifier(certifier.address))
        .to.emit(cert, "CertifierRevoked")
        .withArgs(certifier.address);
      expect(await cert.isCertifier(certifier.address)).to.be.false;
    });

    it("revierte si no es certifier", async function () {
      await expect(cert.revokeCertifier(stranger.address))
        .to.be.revertedWith("CertModule: not a certifier");
    });

    it("no-owner no puede revocar", async function () {
      await expect(cert.connect(stranger).revokeCertifier(certifier.address))
        .to.be.reverted;
    });
  });

  // ── isCertifier ────────────────────────────────────────────────────────
  describe("isCertifier()", function () {
    it("owner es certifier implícito sin necesitar grant", async function () {
      expect(await cert.isCertifier(owner.address)).to.be.true;
    });

    it("stranger no es certifier", async function () {
      expect(await cert.isCertifier(stranger.address)).to.be.false;
    });

    it("certifier concedido sí es certifier", async function () {
      await cert.grantCertifier(certifier.address);
      expect(await cert.isCertifier(certifier.address)).to.be.true;
    });

    it("certifier revocado deja de serlo", async function () {
      await cert.grantCertifier(certifier.address);
      await cert.revokeCertifier(certifier.address);
      expect(await cert.isCertifier(certifier.address)).to.be.false;
    });
  });

  // ── addCertification ───────────────────────────────────────────────────
  describe("addCertification()", function () {
    const DOC_HASH = ethers.keccak256(ethers.toUtf8Bytes("doc-v1"));
    let futureExpiry;

    beforeEach(async function () {
      futureExpiry = (await time.latest()) + 86400 * 365; // 1 año
    });

    it("revierte con tokenId = 0", async function () {
      await expect(
        cert.addCertification(0, CERT_ISO, futureExpiry, DOC_HASH)
      ).to.be.revertedWith("BashoodModule: tokenId is zero");
    });

    it("revierte con certType = bytes32(0)", async function () {
      await expect(
        cert.addCertification(TOKEN_ID, ZERO_BYTES, futureExpiry, DOC_HASH)
      ).to.be.revertedWith("CertModule: certType is zero");
    });

    it("revierte si el token no existe en el Core", async function () {
      const unknownToken = 999n;
      await expect(
        cert.addCertification(unknownToken, CERT_ISO, futureExpiry, DOC_HASH)
      ).to.be.revertedWith("ERC721NonexistentToken");
    });

    it("revierte si expiryDate está en el pasado", async function () {
      const pastExpiry = (await time.latest()) - 1;
      await expect(
        cert.addCertification(TOKEN_ID, CERT_ISO, pastExpiry, DOC_HASH)
      ).to.be.revertedWith("CertModule: expiry in the past");
    });

    it("acepta expiryDate = 0 (sin vencimiento)", async function () {
      await expect(
        cert.addCertification(TOKEN_ID, CERT_ISO, 0, DOC_HASH)
      ).to.not.be.reverted;
    });

    it("certifier no-owner puede añadir", async function () {
      await cert.grantCertifier(certifier.address);
      await expect(
        cert.connect(certifier).addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH)
      ).to.emit(cert, "CertificationAdded");
    });

    it("no-certifier no puede añadir", async function () {
      await expect(
        cert.connect(stranger).addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH)
      ).to.be.revertedWith("CertModule: not a certifier");
    });

    it("emite CertificationAdded y ModuleOperationExecuted", async function () {
      await expect(
        cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH)
      )
        .to.emit(cert, "CertificationAdded")
        .withArgs(TOKEN_ID, CERT_ISO, futureExpiry, owner.address)
        .and.to.emit(cert, "ModuleOperationExecuted")
        .withArgs(TOKEN_ID, owner.address);
    });

    it("getCertification devuelve el record correcto", async function () {
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
      const rec = await cert.getCertification(TOKEN_ID, CERT_ISO);
      expect(rec.active).to.be.true;
      expect(rec.docHash).to.equal(DOC_HASH);
      expect(rec.issuer).to.equal(owner.address);
      expect(rec.expiryDate).to.equal(futureExpiry);
    });

    it("record no añadido devuelve active=false por defecto", async function () {
      const rec = await cert.getCertification(TOKEN_ID, CERT_CE);
      expect(rec.active).to.be.false;
      expect(rec.issuer).to.equal(ethers.ZeroAddress);
    });
  });

  // ── revokeCertification ────────────────────────────────────────────────
  describe("revokeCertification()", function () {
    const DOC_HASH = ethers.keccak256(ethers.toUtf8Bytes("doc-v1"));

    beforeEach(async function () {
      const futureExpiry = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
    });

    it("revierte con tokenId = 0", async function () {
      await expect(
        cert.revokeCertification(0, CERT_ISO)
      ).to.be.revertedWith("BashoodModule: tokenId is zero");
    });

    it("revierte si la certificación no está activa", async function () {
      await cert.revokeCertification(TOKEN_ID, CERT_ISO);
      await expect(
        cert.revokeCertification(TOKEN_ID, CERT_ISO)
      ).to.be.revertedWith("CertModule: cert not active");
    });

    it("revierte si intenta revocar una cert que nunca existió", async function () {
      await expect(
        cert.revokeCertification(TOKEN_ID, CERT_CE)
      ).to.be.revertedWith("CertModule: cert not active");
    });

    it("no-certifier no puede revocar", async function () {
      await expect(
        cert.connect(stranger).revokeCertification(TOKEN_ID, CERT_ISO)
      ).to.be.revertedWith("CertModule: not a certifier");
    });

    it("emite CertificationRevoked, record queda active=false", async function () {
      await expect(cert.revokeCertification(TOKEN_ID, CERT_ISO))
        .to.emit(cert, "CertificationRevoked")
        .withArgs(TOKEN_ID, CERT_ISO, owner.address);

      const rec = await cert.getCertification(TOKEN_ID, CERT_ISO);
      expect(rec.active).to.be.false;
    });
  });

  // ── isActive ───────────────────────────────────────────────────────────
  describe("isActive()", function () {
    const DOC_HASH = ethers.keccak256(ethers.toUtf8Bytes("doc-v1"));

    it("activa no expirada → true", async function () {
      const futureExpiry = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
      expect(await cert.isActive(TOKEN_ID, CERT_ISO)).to.be.true;
    });

    it("sin vencimiento (expiryDate=0) → siempre true mientras activa", async function () {
      await cert.addCertification(TOKEN_ID, CERT_ISO, 0, DOC_HASH);
      expect(await cert.isActive(TOKEN_ID, CERT_ISO)).to.be.true;
    });

    it("revocada → false", async function () {
      const futureExpiry = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
      await cert.revokeCertification(TOKEN_ID, CERT_ISO);
      expect(await cert.isActive(TOKEN_ID, CERT_ISO)).to.be.false;
    });

    it("expirada por tiempo → false", async function () {
      const shortExpiry = (await time.latest()) + 60; // 60 segundos
      await cert.addCertification(TOKEN_ID, CERT_ISO, shortExpiry, DOC_HASH);
      await time.increase(120); // avanzar 2 minutos
      expect(await cert.isActive(TOKEN_ID, CERT_ISO)).to.be.false;
    });

    it("no añadida nunca → false", async function () {
      expect(await cert.isActive(TOKEN_ID, CERT_CE)).to.be.false;
    });
  });

  // ── isCompliant ────────────────────────────────────────────────────────
  describe("isCompliant()", function () {
    const DOC_HASH = ethers.keccak256(ethers.toUtf8Bytes("doc-v1"));

    it("array vacío → true (vacuously compliant)", async function () {
      expect(await cert.isCompliant(TOKEN_ID, [])).to.be.true;
    });

    it("todos los certTypes activos → true", async function () {
      const futureExpiry = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
      await cert.addCertification(TOKEN_ID, CERT_CE, futureExpiry, DOC_HASH);
      expect(await cert.isCompliant(TOKEN_ID, [CERT_ISO, CERT_CE])).to.be.true;
    });

    it("un certType revocado → false", async function () {
      const futureExpiry = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
      await cert.addCertification(TOKEN_ID, CERT_CE, futureExpiry, DOC_HASH);
      await cert.revokeCertification(TOKEN_ID, CERT_CE);
      expect(await cert.isCompliant(TOKEN_ID, [CERT_ISO, CERT_CE])).to.be.false;
    });

    it("un certType expirado → false", async function () {
      const shortExpiry = (await time.latest()) + 60;
      const longExpiry  = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, shortExpiry, DOC_HASH);
      await cert.addCertification(TOKEN_ID, CERT_CE, longExpiry, DOC_HASH);
      await time.increase(120);
      expect(await cert.isCompliant(TOKEN_ID, [CERT_ISO, CERT_CE])).to.be.false;
    });

    it("certType nunca añadido → false", async function () {
      expect(await cert.isCompliant(TOKEN_ID, [CERT_ISO])).to.be.false;
    });

    it("varios tokens son independientes — cert de token A no es de token B", async function () {
      const TOKEN_B = 99n;
      await core.mint(TOKEN_B, tokenOwner.address);
      const futureExpiry = (await time.latest()) + 86400 * 365;
      await cert.addCertification(TOKEN_ID, CERT_ISO, futureExpiry, DOC_HASH);
      // TOKEN_B no tiene cert
      expect(await cert.isCompliant(TOKEN_B, [CERT_ISO])).to.be.false;
    });
  });
});
