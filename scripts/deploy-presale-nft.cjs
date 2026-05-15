// Script de despliegue de BashoodPresaleNFT + definición de 3 tiers
// Uso: npx hardhat run scripts/deploy-presale-nft.cjs --network base-sepolia

const hre = require("hardhat");

// ─── Configuración de tiers ────────────────────────────────────────────────
//
// legalDocHash: bytes32 del SHA-256 del documento legal firmado.
// Placeholder = bytes32(0x01) hasta que tengas el hash real.
// Para generarlo: Get-FileHash -Algorithm SHA256 "documento.pdf" | Select Hash
// Luego: "0x" + hash.toLowerCase()
//
const TIERS = [
  {
    id:           1,
    assetName:    "Doosan DX360LC",
    assetType:    "HEAVY_VEHICLE",
    jurisdiction: "ES",
    maxSupply:    500,
    legalDocHash: "0x0100000000000000000000000000000000000000000000000000000000000000",
    uri:          "ipfs://QmYgcHrgGS4fuRfS8mkQmnkgv3GoeLUuDZT2aRveNJfLoa",
  },
  {
    id:           2,
    assetName:    "Planta Solar 5MW Abu Dhabi",
    assetType:    "ENERGY_EQUIPMENT",
    jurisdiction: "AE",
    maxSupply:    100,
    legalDocHash: "0x0200000000000000000000000000000000000000000000000000000000000000",
    uri:          "ipfs://QmdLRMbQpJwM5hDnEuVN57kaBiGY4ZnrT4UBmTunEa5WrP",
  },
  {
    id:           3,
    assetName:    "EVOCONS EVOBLOCK",
    assetType:    "CONSTRUCTION_3D_PRINTER_GANTRY",
    jurisdiction: "ES",
    maxSupply:    200,
    legalDocHash: "0x0300000000000000000000000000000000000000000000000000000000000000",
    uri:          "ipfs://QmanrxGFZjkz5J6i1Qr7q26oorijAzzeF631ifr16shBHb",
  },
];

// ─── IMPORTANTE: sustituir por tu multisig en mainnet ─────────────────────
// En testnet se usa el deployer como admin temporal
const ADMIN_ADDRESS = null; // null = usar deployer address

async function main() {
  console.log("==============================================");
  console.log("  DEPLOY BashoodPresaleNFT — Base Sepolia");
  console.log("==============================================\n");

  const [deployer] = await hre.ethers.getSigners();
  const admin = ADMIN_ADDRESS ?? deployer.address;

  console.log("Deployer :", deployer.address);
  console.log("Admin    :", admin);
  console.log("Network  :", hre.network.name);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance  :", hre.ethers.formatEther(balance), "ETH\n");

  // ── 1. Deploy ──────────────────────────────────────────────────────────
  console.log("▶ Desplegando BashoodPresaleNFT...");
  const Factory = await hre.ethers.getContractFactory("BashoodPresaleNFT");
  const nft = await Factory.deploy(admin);
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log("✅ Desplegado en:", address, "\n");

  // ── 2. defineAsset por cada tier ───────────────────────────────────────
  for (const tier of TIERS) {
    console.log(`▶ defineAsset — Tier ${tier.id}: ${tier.assetName}`);
    const tx = await nft.defineAsset(
      tier.id,
      tier.assetName,
      tier.assetType,
      tier.jurisdiction,
      tier.maxSupply,
      tier.legalDocHash,
      tier.uri
    );
    await tx.wait();
    console.log(`  ✅ Tier ${tier.id} definido — TX: ${tx.hash}`);
  }

  // ── 3. Resumen final ───────────────────────────────────────────────────
  console.log("\n==============================================");
  console.log("  RESUMEN");
  console.log("==============================================");
  console.log("Contrato :", address);
  console.log("Admin    :", admin);
  console.log("Tiers    :", TIERS.length, "definidos");
  console.log("\n⚠️  PRÓXIMOS PASOS:");
  console.log("  1. Reemplazar legalDocHash placeholders con hashes SHA-256 reales");
  console.log("  2. grantRole(MINTER_ROLE, BashoodPresaleFinal.address)");
  console.log("  3. setTransferWhitelist(BashoodPresaleFinal.address, true)");
  console.log("  4. Verificar contrato: npx hardhat verify --network base-sepolia", address, admin);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
