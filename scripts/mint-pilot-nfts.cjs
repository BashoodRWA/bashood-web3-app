// Script para mintear los 5 NFTs piloto (tokens 202-206)
// Uso: npx hardhat run scripts/mint-pilot-nfts.cjs --network base-sepolia

const hre = require("hardhat");

// Dirección del contrato deployado
const CONTRACT_ADDRESS = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";

// URIs de metadata en IPFS (ya subidos y públicos)
const METADATA_URIS = {
  202: "ipfs://bafybeieqjhmqefr4fgypmulsgvzxdv5xawwkdjlpvjpnwjxrwh5gxqdmva/202-evocons-evoblock.json",
  203: "ipfs://bafybeieqjhmqefr4fgypmulsgvzxdv5xawwkdjlpvjpnwjxrwh5gxqdmva/203-icon-vulcan.json",
  204: "ipfs://bafybeieqjhmqefr4fgypmulsgvzxdv5xawwkdjlpvjpnwjxrwh5gxqdmva/204-apiscor-mobile.json",
  205: "ipfs://bafybeieqjhmqefr4fgypmulsgvzxdv5xawwkdjlpvjpnwjxrwh5gxqdmva/205-cybe-rc.json",
  206: "ipfs://bafybeieqjhmqefr4fgypmulsgvzxdv5xawwkdjlpvjpnwjxrwh5gxqdmva/206-mighty-factory.json"
};

async function main() {
  console.log("🎨 MINTEO DE NFTs PILOTO (202-206)");
  console.log("Network:", hre.network.name);
  console.log("Timestamp:", new Date().toISOString());
  console.log("");

  const [minter] = await hre.ethers.getSigners();
  console.log("👤 Minter address:", minter.address);
  
  const balance = await hre.ethers.provider.getBalance(minter.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  console.log("📋 Contract address:", CONTRACT_ADDRESS);
  console.log("");

  // Obtener el contrato
  const BashoodRWAReference = await hre.ethers.getContractFactory("BashoodRWAReference");
  const contract = BashoodRWAReference.attach(CONTRACT_ADDRESS);

  console.log("🔍 Verificando información del contrato...");
  const name = await contract.name();
  const symbol = await contract.symbol();
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("");

  // Mintear los 5 NFTs
  console.log("========================================");
  console.log("🎨 MINTEANDO NFTs");
  console.log("========================================");
  console.log("");

  const mintedTokens = [];

  // Datos completos para cada máquina
  const machines = {
    202: {
      identification: {
        name: "EVOCONS EVO-BLOCK #001",
        category: 0,
        manufacturer: "EVOCONS",
        model: "EVO-BLOCK",
        serialNumber: "EVOBLOCK-001-2025",
        yearManufactured: 2025,
        countryOfOrigin: "ES"
      },
      specs: {
        loadCapacity: 3000,
        displacementSpeed: 40,
        powerConsumption: 5,
        printVolumeX: 12,
        printVolumeY: 12,
        printVolumeZ: 3,
        materialPSI: 4000,
        setupTimeMinutes: 120,
        autoLubrication: true,
        gpsTracking: false
      },
      financials: {
        purchasePrice: hre.ethers.parseEther("0.1"),
        currentValue: hre.ethers.parseEther("0.1"),
        residualValuePct: 2000,
        lastAppraisalDate: Math.floor(Date.now() / 1000),
        depModel: 0,
        annualMaintenancePct: 300,
        insurancePremiumPct: 200
      },
      operational: {
        status: 0,
        operatingHours: 0,
        maxLifetimeHours: 50000,
        totalLoadLifted: 0,
        maxLoadLifetime: 500000,
        metersExtruded: 0,
        maxMetersLifetime: 0,
        setupCount: 0,
        maxSetups: 0,
        cubicMetersPerDay: 0,
        lastMaintenanceDate: Math.floor(Date.now() / 1000),
        nextMaintenanceDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        maintenanceIntervalHours: 2500
      }
    },
    203: {
      identification: {
        name: "ICON VULCAN #001",
        category: 0,
        manufacturer: "ICON",
        model: "VULCAN",
        serialNumber: "ICON-VULCAN-001-2025",
        yearManufactured: 2025,
        countryOfOrigin: "US"
      },
      specs: {
        loadCapacity: 5000,
        displacementSpeed: 60,
        powerConsumption: 10,
        printVolumeX: 15,
        printVolumeY: 15,
        printVolumeZ: 4,
        materialPSI: 6000,
        setupTimeMinutes: 90,
        autoLubrication: true,
        gpsTracking: false
      },
      financials: {
        purchasePrice: hre.ethers.parseEther("0.15"),
        currentValue: hre.ethers.parseEther("0.15"),
        residualValuePct: 2000,
        lastAppraisalDate: Math.floor(Date.now() / 1000),
        depModel: 1,
        annualMaintenancePct: 300,
        insurancePremiumPct: 200
      },
      operational: {
        status: 0,
        operatingHours: 0,
        maxLifetimeHours: 60000,
        totalLoadLifted: 0,
        maxLoadLifetime: 0,
        metersExtruded: 0,
        maxMetersLifetime: 1000000,
        setupCount: 0,
        maxSetups: 0,
        cubicMetersPerDay: 0,
        lastMaintenanceDate: Math.floor(Date.now() / 1000),
        nextMaintenanceDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        maintenanceIntervalHours: 2500
      }
    },
    204: {
      identification: {
        name: "APIS COR MOBILE #001",
        category: 1,
        manufacturer: "APISCOR",
        model: "MOBILE",
        serialNumber: "APISCOR-MOBILE-001-2025",
        yearManufactured: 2025,
        countryOfOrigin: "AE"
      },
      specs: {
        loadCapacity: 2000,
        displacementSpeed: 30,
        powerConsumption: 7,
        printVolumeX: 8,
        printVolumeY: 8,
        printVolumeZ: 3,
        materialPSI: 4500,
        setupTimeMinutes: 45,
        autoLubrication: false,
        gpsTracking: true
      },
      financials: {
        purchasePrice: hre.ethers.parseEther("0.12"),
        currentValue: hre.ethers.parseEther("0.12"),
        residualValuePct: 2000,
        lastAppraisalDate: Math.floor(Date.now() / 1000),
        depModel: 2,
        annualMaintenancePct: 300,
        insurancePremiumPct: 250
      },
      operational: {
        status: 0,
        operatingHours: 0,
        maxLifetimeHours: 40000,
        totalLoadLifted: 0,
        maxLoadLifetime: 0,
        metersExtruded: 0,
        maxMetersLifetime: 0,
        setupCount: 0,
        maxSetups: 500,
        cubicMetersPerDay: 0,
        lastMaintenanceDate: Math.floor(Date.now() / 1000),
        nextMaintenanceDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        maintenanceIntervalHours: 1500
      }
    },
    205: {
      identification: {
        name: "CYBE RC #001",
        category: 1,
        manufacturer: "CYBE",
        model: "RC",
        serialNumber: "CYBE-RC-001-2025",
        yearManufactured: 2025,
        countryOfOrigin: "NL"
      },
      specs: {
        loadCapacity: 4000,
        displacementSpeed: 50,
        powerConsumption: 9,
        printVolumeX: 10,
        printVolumeY: 10,
        printVolumeZ: 3,
        materialPSI: 5500,
        setupTimeMinutes: 60,
        autoLubrication: true,
        gpsTracking: true
      },
      financials: {
        purchasePrice: hre.ethers.parseEther("0.2"),
        currentValue: hre.ethers.parseEther("0.2"),
        residualValuePct: 2000,
        lastAppraisalDate: Math.floor(Date.now() / 1000),
        depModel: 4,
        annualMaintenancePct: 300,
        insurancePremiumPct: 250
      },
      operational: {
        status: 0,
        operatingHours: 0,
        maxLifetimeHours: 50000,
        totalLoadLifted: 0,
        maxLoadLifetime: 0,
        metersExtruded: 0,
        maxMetersLifetime: 0,
        setupCount: 0,
        maxSetups: 0,
        cubicMetersPerDay: 0,
        lastMaintenanceDate: Math.floor(Date.now() / 1000),
        nextMaintenanceDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        maintenanceIntervalHours: 3000
      }
    },
    206: {
      identification: {
        name: "MIGHTY BUILDINGS FACTORY #001",
        category: 2,
        manufacturer: "MIGHTY",
        model: "FACTORY",
        serialNumber: "MIGHTY-FACTORY-001-2025",
        yearManufactured: 2025,
        countryOfOrigin: "US"
      },
      specs: {
        loadCapacity: 10000,
        displacementSpeed: 100,
        powerConsumption: 50,
        printVolumeX: 30,
        printVolumeY: 20,
        printVolumeZ: 10,
        materialPSI: 7000,
        setupTimeMinutes: 180,
        autoLubrication: true,
        gpsTracking: false
      },
      financials: {
        purchasePrice: hre.ethers.parseEther("0.5"),
        currentValue: hre.ethers.parseEther("0.5"),
        residualValuePct: 2000,
        lastAppraisalDate: Math.floor(Date.now() / 1000),
        depModel: 5,
        annualMaintenancePct: 300,
        insurancePremiumPct: 200
      },
      operational: {
        status: 0,
        operatingHours: 0,
        maxLifetimeHours: 80000,
        totalLoadLifted: 0,
        maxLoadLifetime: 0,
        metersExtruded: 0,
        maxMetersLifetime: 0,
        setupCount: 0,
        maxSetups: 0,
        cubicMetersPerDay: 0,
        lastMaintenanceDate: Math.floor(Date.now() / 1000),
        nextMaintenanceDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        maintenanceIntervalHours: 5000
      }
    }
  };

  for (const [tokenId, metadataUri] of Object.entries(METADATA_URIS)) {
    console.log(`\n📦 Minteando Token #${tokenId}...`);
    console.log(`   Metadata URI: ${metadataUri}`);
    
    const machineData = machines[tokenId];
    
    try {
      const tx = await contract.mintAsset(
        minter.address,
        machineData.identification,
        machineData.specs,
        machineData.financials,
        machineData.operational,
        metadataUri
      );
      
      console.log(`   Transaction hash: ${tx.hash}`);
      console.log(`   Esperando confirmación...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Token #${tokenId} minteado! Gas usado: ${receipt.gasUsed.toString()}`);
      
      mintedTokens.push({
        tokenId,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      });
    } catch (error) {
      console.log(`   ❌ Error minteando token #${tokenId}:`, error.message);
    }
  }

  console.log("");
  console.log("========================================");
  console.log("📊 RESUMEN DE MINTEO");
  console.log("========================================");
  console.log("");
  console.log(`Total NFTs minteados: ${mintedTokens.length}/5`);
  console.log("");
  
  if (mintedTokens.length > 0) {
    console.log("NFTs minteados exitosamente:");
    mintedTokens.forEach(({ tokenId, txHash }) => {
      console.log(`  • Token #${tokenId}`);
      console.log(`    TX: https://sepolia.basescan.org/tx/${txHash}`);
      console.log(`    NFT: https://sepolia.basescan.org/token/${CONTRACT_ADDRESS}?a=${tokenId}`);
    });
  }
  
  console.log("");
  console.log("✅ Proceso completado!");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante el minteo:");
    console.error(error);
    process.exit(1);
  });
