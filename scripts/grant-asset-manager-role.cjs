// Script para otorgar rol ASSET_MANAGER al deployer
// Uso: npx hardhat run scripts/grant-asset-manager-role.cjs --network base-sepolia

const hre = require("hardhat");

const CONTRACT_ADDRESS = "0x7c203b2e0A5c74C056a14CCA66d92f8E48cFF5Aa";

async function main() {
  console.log("🔑 OTORGANDO ROL ASSET_MANAGER");
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("");

  const BashoodRWAReference = await hre.ethers.getContractFactory("BashoodRWAReference");
  const contract = BashoodRWAReference.attach(CONTRACT_ADDRESS);

  // Obtener el hash del rol ASSET_MANAGER_ROLE
  const ASSET_MANAGER_ROLE = await contract.ASSET_MANAGER_ROLE();
  console.log("ASSET_MANAGER_ROLE hash:", ASSET_MANAGER_ROLE);
  console.log("");

  // Verificar si ya tiene el rol
  const hasRole = await contract.hasRole(ASSET_MANAGER_ROLE, deployer.address);
  console.log("¿Deployer tiene el rol?", hasRole);
  console.log("");

  if (!hasRole) {
    console.log("📝 Otorgando rol ASSET_MANAGER...");
    const tx = await contract.grantRole(ASSET_MANAGER_ROLE, deployer.address);
    console.log("Transaction hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ Rol otorgado exitosamente!");
  } else {
    console.log("✅ El deployer ya tiene el rol ASSET_MANAGER");
  }
  
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:");
    console.error(error);
    process.exit(1);
  });
