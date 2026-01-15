// Script para obtener estado y métricas de la presale
// Uso: npx hardhat run scripts/presale-status.js --network base-sepolia DEPLOYMENT_FILE

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const deploymentFile = process.argv[4] || "deployment-base-sepolia.json";
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.log("Usage: npx hardhat run scripts/presale-status.js --network base-sepolia DEPLOYMENT_FILE");
    console.log("Example: npx hardhat run scripts/presale-status.js --network base-sepolia deployment-base-sepolia-1234567890.json");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const presaleAddr = deployment.contracts.bashoodPresale;
  const tokenAddr = deployment.contracts.bashoodToken;
  const nftAddr = deployment.contracts.mockNFT;

  console.log("\n" + "=".repeat(70));
  console.log("📊 ESTADO DE LA PRESALE EN BASE");
  console.log("=".repeat(70) + "\n");

  // Load presale contract
  const presale = await ethers.getContractAt(
    "contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal",
    presaleAddr
  );

  // Load token contract
  const token = await ethers.getContractAt("BashoodToken", tokenAddr);

  // Load NFT contract
  const nft = await ethers.getContractAt(
    "contracts/mocks/MockNFT1155.sol:MockNFT1155",
    nftAddr
  );

  try {
    // Get presale configuration
    console.log("⚙️  CONFIGURACIÓN GENERAL\n");
    
    const presaleStart = await presale.presaleStart();
    const presaleEnd = await presale.presaleEnd();
    const maxNFTSupply = await presale.maxNFTSupply();
    const nftPriceETH = await presale.nftPriceETH();
    const nftPriceBHT = await presale.nftPriceBHT();
    const projectWallet = await presale.projectWallet();
    const opsWallet = await presale.opsWallet();

    const now = Math.floor(Date.now() / 1000);
    const startDate = new Date(presaleStart * 1000).toLocaleString();
    const endDate = new Date(presaleEnd * 1000).toLocaleString();
    const timeUntilStart = presaleStart - now;
    const timeUntilEnd = presaleEnd - now;

    console.log(`Project Wallet:        ${projectWallet}`);
    console.log(`Operations Wallet:     ${opsWallet}`);
    console.log(`Presale Start:         ${startDate} (${timeUntilStart > 0 ? 'in ' + (timeUntilStart / 3600).toFixed(1) + ' hours' : 'started'})`);
    console.log(`Presale End:           ${endDate} (${timeUntilEnd > 0 ? 'in ' + (timeUntilEnd / 3600).toFixed(1) + ' hours' : 'ENDED'})`);
    console.log(`Max NFT Supply:        ${maxNFTSupply.toString()}`);
    console.log(`NFT Price (ETH):       ${ethers.formatEther(nftPriceETH)} ETH`);
    console.log(`NFT Price (BHT):       ${ethers.formatUnits(nftPriceBHT, 18)} BHT`);

    // Get presale metrics
    console.log("\n📈 MÉTRICAS DE PRESALE\n");

    const totalETHRaised = await presale.totalETHRaised();
    const totalBHTRaised = await presale.totalBHTRaised();
    const nftsMinted = await presale.nftsMinted();
    const totalParticipants = await presale.totalParticipants();

    console.log(`Total ETH Raised:      ${ethers.formatEther(totalETHRaised)} ETH`);
    console.log(`Total BHT Raised:      ${ethers.formatUnits(totalBHTRaised, 18)} BHT`);
    console.log(`NFTs Minted:           ${nftsMinted.toString()} / ${maxNFTSupply.toString()}`);
    console.log(`Total Participants:    ${totalParticipants.toString()}`);
    
    const nftProgress = (nftsMinted / maxNFTSupply * 100).toFixed(2);
    console.log(`Progress:              ${nftProgress}% 📊`);

    // Get contract balances
    console.log("\n💰 BALANCES\n");

    const ethBalance = await ethers.provider.getBalance(presaleAddr);
    const tokenBalance = await token.balanceOf(presaleAddr);
    const nftBalance = await nft.balanceOf(presaleAddr, 1); // tokenId 1

    console.log(`ETH in Presale:        ${ethers.formatEther(ethBalance)} ETH`);
    console.log(`BHT in Presale:        ${ethers.formatUnits(tokenBalance, 18)} BHT`);
    console.log(`NFTs in Presale:       ${nftBalance.toString()}`);

    // Get oracle info
    console.log("\n🔮 ORACLE / PRICE FEED\n");

    try {
      const priceFeed = await presale.priceFeed();
      const maxPriceStaleness = await presale.maxPriceStaleness();
      
      console.log(`Price Feed Address:    ${priceFeed}`);
      console.log(`Max Price Staleness:   ${maxPriceStaleness.toString()} seconds (${(maxPriceStaleness / 3600).toFixed(1)} hours)`);

      // Try to get current price
      try {
        const priceData = await presale.getPriceData();
        console.log(`Current Price (ETH):   ${ethers.formatUnits(priceData, 8)} (from oracle)`);
      } catch (e) {
        console.log(`Current Price:         ⚠️  Could not fetch from oracle`);
      }
    } catch (e) {
      console.log(`⚠️  Price feed not configured`);
    }

    // Get role permissions
    console.log("\n🔐 PERMISOS (ROLES)\n");

    try {
      const ADMIN_ROLE = await presale.ADMIN_ROLE();
      const VALIDATOR_ROLE = await presale.VALIDATOR_ROLE();
      
      const [deployer] = await ethers.getSigners();
      const deployerAddr = await deployer.getAddress();
      
      const hasAdminRole = await presale.hasRole(ADMIN_ROLE, deployerAddr);
      const hasValidatorRole = await presale.hasRole(VALIDATOR_ROLE, deployerAddr);

      console.log(`Current Signer:        ${deployerAddr}`);
      console.log(`Has ADMIN_ROLE:        ${hasAdminRole ? "✅ Yes" : "❌ No"}`);
      console.log(`Has VALIDATOR_ROLE:    ${hasValidatorRole ? "✅ Yes" : "❌ No"}`);
    } catch (e) {
      console.log(`⚠️  Could not fetch role information`);
    }

    // Get presale status
    console.log("\n🚀 ESTADO DE PRESALE\n");

    let status = "PENDING";
    if (now < presaleStart) {
      status = "NOT STARTED";
    } else if (now >= presaleStart && now < presaleEnd) {
      status = "ACTIVE";
    } else if (now >= presaleEnd) {
      status = "ENDED";
    }

    console.log(`Status:                ${status}`);

    // Add recommendations
    console.log("\n💡 RECOMENDACIONES\n");

    if (status === "PENDING") {
      console.log("- Presale no ha comenzado aún");
      console.log("- Asegúrate de tener NFTs en el contrato de presale");
      console.log("- Verifica que el price feed esté configurado");
    } else if (status === "ACTIVE") {
      console.log("- ✅ Presale está en progreso");
      console.log("- Monitor gas prices regularmente");
      console.log("- Verifica métricas diariamente");
      if (nftsMinted / maxNFTSupply > 0.9) {
        console.log("- ⚠️  NFTs casi agotados (>90%)");
      }
    } else if (status === "ENDED") {
      console.log("- Presale ha finalizado");
      console.log("- Transfiere fondos a wallet de proyecto");
      console.log("- Genera reporte final");
    }

    console.log("\n" + "=".repeat(70) + "\n");

  } catch (error) {
    console.error("❌ Error fetching presale state:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
