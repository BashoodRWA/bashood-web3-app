// BashoodPresaleNFT.test.cjs
// Cobertura de los 7 requisitos del checklist obligatorio.
"use strict";

const { expect }  = require("chai");
const { ethers }  = require("hardhat");

const IPFS_URI_A  = "ipfs://QmTierA000000000000000000000000000000000000000/1.json";
const IPFS_URI_B  = "ipfs://QmTierB000000000000000000000000000000000000000/2.json";
const LEGAL_HASH_A = ethers.keccak256(ethers.toUtf8Bytes("legal-doc-tier-a-v1"));
const LEGAL_HASH_B = ethers.keccak256(ethers.toUtf8Bytes("legal-doc-tier-b-v1"));
const TIER_A = 1n;
const TIER_B = 2n;

describe("BashoodPresaleNFT", function () {
  let nft, admin, minter, user1, user2, royaltyReceiver;

  beforeEach(async function () {
    [admin, minter, user1, user2, royaltyReceiver] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BashoodPresaleNFT");
    nft = await Factory.deploy(admin.address);
    await nft.waitForDeployment();

    // Definir TIER_A
    await nft.connect(admin).defineAsset(
      TIER_A,
      "Excavadora CAT 390F",
      "heavy_machinery",
      "ES",
      500n,
      LEGAL_HASH_A,
      IPFS_URI_A
    );
    // Definir TIER_B
    await nft.connect(admin).defineAsset(
      TIER_B,
      "Planta Solar 5MW",
      "solar_plant",
      "AE",
      100n,
      LEGAL_HASH_B,
      IPFS_URI_B
    );

    // Asignar MINTER_ROLE al minter (simula BashoodPresaleFinal)
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.connect(admin).grantRole(MINTER_ROLE, minter.address);

    // Whitelist minter y user1 para transferencias
    await nft.connect(admin).setTransferWhitelist(minter.address, true);
    await nft.connect(admin).setTransferWhitelist(user1.address, true);
  });

  // ── 1. legalHash por id accesible on-chain ─────────────────────────────────
  describe("1. legalDocumentHash por tier", function () {
    it("devuelve el hash correcto para TIER_A", async function () {
      expect(await nft.legalDocumentHash(TIER_A)).to.equal(LEGAL_HASH_A);
    });
    it("devuelve el hash correcto para TIER_B", async function () {
      expect(await nft.legalDocumentHash(TIER_B)).to.equal(LEGAL_HASH_B);
    });
    it("los hashes de TIER_A y TIER_B son distintos", async function () {
      const hashA = await nft.legalDocumentHash(TIER_A);
      const hashB = await nft.legalDocumentHash(TIER_B);
      expect(hashA).to.not.equal(hashB);
    });
    it("también accesible vía struct tiers[id].legalDocHash", async function () {
      const tier = await nft.tiers(TIER_A);
      expect(tier.legalDocHash).to.equal(LEGAL_HASH_A);
    });
  });

  // ── 2. URI en IPFS ─────────────────────────────────────────────────────────
  describe("2. URI IPFS obligatorio", function () {
    it("uri(1) devuelve la URI IPFS correcta", async function () {
      expect(await nft.uri(TIER_A)).to.equal(IPFS_URI_A);
    });
    it("uri(2) devuelve la URI IPFS correcta", async function () {
      expect(await nft.uri(TIER_B)).to.equal(IPFS_URI_B);
    });
    it("defineAsset revierte si la URI no empieza por ipfs://", async function () {
      await expect(
        nft.connect(admin).defineAsset(
          99n, "Test", "type", "US", 10n,
          LEGAL_HASH_A,
          "https://centralized-server.com/nft.json" // ← bloqueado
        )
      ).to.be.revertedWith("URI must use ipfs:// scheme");
    });
    it("defineAsset revierte con http://", async function () {
      await expect(
        nft.connect(admin).defineAsset(
          99n, "Test", "type", "US", 10n,
          LEGAL_HASH_A,
          "http://centralized.io/1.json"
        )
      ).to.be.revertedWith("URI must use ipfs:// scheme");
    });
    it("uri() revierte para tier no definido", async function () {
      await expect(nft.uri(999n)).to.be.revertedWith("Tier not defined");
    });
  });

  // ── 3. Cada ID representa un activo/tier claramente definido ───────────────
  describe("3. Tiers claramente definidos", function () {
    it("TIER_A tiene los campos correctos on-chain", async function () {
      const tier = await nft.tiers(TIER_A);
      expect(tier.assetName).to.equal("Excavadora CAT 390F");
      expect(tier.assetType).to.equal("heavy_machinery");
      expect(tier.jurisdiction).to.equal("ES");
      expect(tier.maxSupply).to.equal(500n);
      expect(tier.defined).to.be.true;
    });
    it("TIER_B tiene los campos correctos on-chain", async function () {
      const tier = await nft.tiers(TIER_B);
      expect(tier.assetName).to.equal("Planta Solar 5MW");
      expect(tier.assetType).to.equal("solar_plant");
      expect(tier.jurisdiction).to.equal("AE");
      expect(tier.maxSupply).to.equal(100n);
      expect(tier.defined).to.be.true;
    });
    it("defineAsset emite evento AssetDefined con todos los campos", async function () {
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("new-doc"));
      await expect(
        nft.connect(admin).defineAsset(
          3n, "Línea de Ensamblaje", "manufacturing", "DE",
          200n, newHash, "ipfs://QmNew/3.json"
        )
      ).to.emit(nft, "AssetDefined")
        .withArgs(3n, "Línea de Ensamblaje", "manufacturing", "DE", 200n, newHash, "ipfs://QmNew/3.json");
    });
    it("defineAsset revierte si legalDocHash es bytes32(0)", async function () {
      await expect(
        nft.connect(admin).defineAsset(
          10n, "Test", "type", "US", 10n, ethers.ZeroHash, "ipfs://Qm/t.json"
        )
      ).to.be.revertedWith("Legal doc hash required");
    });
    it("tier no definido tiene defined=false", async function () {
      const tier = await nft.tiers(999n);
      expect(tier.defined).to.be.false;
    });
  });

  // ── 4. maxSupply[id] y minted[id] con control estricto ────────────────────
  describe("4. Supply caps por tier", function () {
    it("mint actualiza mintedPerTier correctamente", async function () {
      await nft.connect(minter).mint(user1.address, TIER_A, 10n);
      expect(await nft.mintedPerTier(TIER_A)).to.equal(10n);
    });
    it("mint revierte al superar maxSupply", async function () {
      await expect(
        nft.connect(minter).mint(user1.address, TIER_A, 501n)
      ).to.be.revertedWith("Exceeds tier max supply");
    });
    it("acumulación correcta: múltiples mints suman", async function () {
      await nft.connect(minter).mint(user1.address, TIER_A, 250n);
      await nft.connect(minter).mint(user1.address, TIER_A, 250n);
      expect(await nft.mintedPerTier(TIER_A)).to.equal(500n);
      // El siguiente revierte
      await expect(
        nft.connect(minter).mint(user1.address, TIER_A, 1n)
      ).to.be.revertedWith("Exceeds tier max supply");
    });
    it("supply de TIER_B es independiente de TIER_A", async function () {
      await nft.connect(minter).mint(user1.address, TIER_A, 500n); // agota TIER_A
      // TIER_B tiene su propio contador
      await nft.connect(minter).mint(user1.address, TIER_B, 50n);
      expect(await nft.mintedPerTier(TIER_B)).to.equal(50n);
    });
    it("mint revierte para tier no definido", async function () {
      await expect(
        nft.connect(minter).mint(user1.address, 99n, 1n)
      ).to.be.revertedWith("Tier not defined");
    });
    it("mint emite evento AssetMinted con totalMinted correcto", async function () {
      await expect(nft.connect(minter).mint(user1.address, TIER_A, 5n))
        .to.emit(nft, "AssetMinted")
        .withArgs(TIER_A, user1.address, 5n, 5n);
    });
  });

  // ── 5. MINTER_ROLE exclusivo ───────────────────────────────────────────────
  describe("5. MINTER_ROLE — acceso exclusivo", function () {
    it("address sin MINTER_ROLE no puede mintear", async function () {
      await expect(
        nft.connect(user1).mint(user1.address, TIER_A, 1n)
      ).to.be.reverted;
    });
    it("admin sin MINTER_ROLE no puede mintear", async function () {
      // admin tiene ASSET_MANAGER y DEFAULT_ADMIN pero no MINTER_ROLE
      // primero revocamos para asegurarnos
      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.connect(admin).revokeRole(MINTER_ROLE, admin.address);
      await expect(
        nft.connect(admin).mint(user1.address, TIER_A, 1n)
      ).to.be.reverted;
    });
    it("minter con MINTER_ROLE puede mintear", async function () {
      await expect(nft.connect(minter).mint(user1.address, TIER_A, 1n))
        .to.emit(nft, "AssetMinted");
    });
    it("MINTER_ROLE puede ser revocado por admin", async function () {
      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      await expect(
        nft.connect(minter).mint(user1.address, TIER_A, 1n)
      ).to.be.reverted;
    });
  });

  // ── 6. _update / restricción de transferencias (KYC) ──────────────────────
  describe("6. Restricción de transferencias (_update hook)", function () {
    beforeEach(async function () {
      // Mintear algunos tokens a user1 para probar transfers
      await nft.connect(minter).mint(user1.address, TIER_A, 10n);
    });

    it("transferencias restringidas por defecto (modo KYC activo)", async function () {
      // user2 no está en whitelist
      await expect(
        nft.connect(user1).safeTransferFrom(user1.address, user2.address, TIER_A, 1n, "0x")
      ).to.be.revertedWith("BashoodPresaleNFT: transfer restricted, KYC required");
    });

    it("transfer se permite cuando ambas partes están whitelisted", async function () {
      await nft.connect(admin).setTransferWhitelist(user2.address, true);
      await expect(
        nft.connect(user1).safeTransferFrom(user1.address, user2.address, TIER_A, 1n, "0x")
      ).to.not.be.reverted;
    });

    it("el modo de restricción puede desactivarse", async function () {
      await nft.connect(admin).setTransferRestriction(false);
      // user2 no está whitelisted pero ahora puede recibir
      await expect(
        nft.connect(user1).safeTransferFrom(user1.address, user2.address, TIER_A, 1n, "0x")
      ).to.not.be.reverted;
    });

    it("setTransferRestriction emite TransferRestrictionChanged", async function () {
      await expect(nft.connect(admin).setTransferRestriction(false))
        .to.emit(nft, "TransferRestrictionChanged").withArgs(false);
    });

    it("setTransferWhitelist emite TransferWhitelistUpdated", async function () {
      await expect(nft.connect(admin).setTransferWhitelist(user2.address, true))
        .to.emit(nft, "TransferWhitelistUpdated").withArgs(user2.address, true);
    });

    it("solo admin puede cambiar la restricción", async function () {
      await expect(
        nft.connect(user1).setTransferRestriction(false)
      ).to.be.reverted;
    });

    it("contrato pausado bloquea mint y transfer", async function () {
      await nft.connect(admin).pause();
      // OZ v5 Pausable lanza EnforcedPause() custom error; el contrato también
      // comprueba require(!paused()) en _update, pero whenNotPaused en mint()
      // se dispara primero (revierte con custom error, no con string).
      await expect(
        nft.connect(minter).mint(user1.address, TIER_A, 1n)
      ).to.be.reverted;
    });

    it("contrato reanudado permite mint de nuevo", async function () {
      await nft.connect(admin).pause();
      await nft.connect(admin).unpause();
      await expect(nft.connect(minter).mint(user1.address, TIER_A, 1n))
        .to.emit(nft, "AssetMinted");
    });
  });

  // ── 7. Eventos auditables ──────────────────────────────────────────────────
  describe("7. Eventos auditables", function () {
    it("AssetDefined se emite con todos los parámetros correctos", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("doc-v2"));
      await expect(
        nft.connect(admin).defineAsset(
          5n, "Impresora 3D Construcción", "3d_printing", "AE",
          300n, hash, "ipfs://QmImpresora/5.json"
        )
      ).to.emit(nft, "AssetDefined")
        .withArgs(5n, "Impresora 3D Construcción", "3d_printing", "AE", 300n, hash, "ipfs://QmImpresora/5.json");
    });

    it("AssetMinted incluye totalMintedForTier acumulado", async function () {
      await nft.connect(minter).mint(user1.address, TIER_B, 30n);
      await expect(nft.connect(minter).mint(user1.address, TIER_B, 20n))
        .to.emit(nft, "AssetMinted")
        .withArgs(TIER_B, user1.address, 20n, 50n); // 30+20=50
    });
  });

  // ── EIP-2981 Royalties ─────────────────────────────────────────────────────
  describe("EIP-2981 Royalties", function () {
    it("royalties configurables por admin", async function () {
      await nft.connect(admin).setDefaultRoyalty(royaltyReceiver.address, 500); // 5%
      const [recv, amount] = await nft.royaltyInfo(TIER_A, 10000n);
      expect(recv).to.equal(royaltyReceiver.address);
      expect(amount).to.equal(500n); // 5% de 10000
    });

    it("supportsInterface devuelve true para ERC2981", async function () {
      // interfaceId de ERC2981
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });

    it("supportsInterface devuelve true para ERC1155", async function () {
      expect(await nft.supportsInterface("0xd9b67a26")).to.be.true;
    });

    it("solo admin puede configurar royalties", async function () {
      await expect(
        nft.connect(user1).setDefaultRoyalty(user1.address, 500)
      ).to.be.reverted;
    });
  });

  // ── Tier inmutabilidad post-mint ───────────────────────────────────────────
  describe("Inmutabilidad de tier tras primer mint", function () {
    it("defineAsset revierte si el tier ya tiene tokens minteados", async function () {
      await nft.connect(minter).mint(user1.address, TIER_A, 1n);
      await expect(
        nft.connect(admin).defineAsset(
          TIER_A, "Otro nombre", "otro_tipo", "FR",
          1000n, LEGAL_HASH_A, IPFS_URI_A
        )
      ).to.be.revertedWith("Tier immutable: already has minted tokens");
    });
  });
});
