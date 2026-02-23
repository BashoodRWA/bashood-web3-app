const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("\n🧪 PRUEBA BÁSICA DE FUNCIONALIDAD\n");
    console.log("════════════════════════════════════════════════════════════════\n");
    
    const [owner, assetManager] = await ethers.getSigners();
    
    // 1. Deploy
    console.log("1️⃣  Deployando contrato...");
    const BashoodRWA = await ethers.getContractFactory("BashoodRWAReference");
    const bashoodRWA = await upgrades.deployProxy(
        BashoodRWA,
        ["Bashood Test Assets", "BTH-RWA", "https://test.bashood.com/", owner.address],
        { kind: "uups" }
    );
    await bashoodRWA.waitForDeployment();
    const address = await bashoodRWA.getAddress();
    console.log(`   ✅ Deployed at: ${address}\n`);
    
    // 2. Grant role
    console.log("2️⃣  Otorgando ASSET_MANAGER_ROLE...");
    const ASSET_MANAGER_ROLE = await bashoodRWA.ASSET_MANAGER_ROLE();
    await bashoodRWA.grantRole(ASSET_MANAGER_ROLE, assetManager.address);
    console.log(`   ✅ Role granted\n`);
    
    // 3. Mint asset
    console.log("3️⃣  Minting asset de prueba...");
    try {
        const identification = {
            name: "Test Asset #001",
            category: 0, // CONSTRUCTION_3D_PRINTER_GANTRY
            manufacturer: "TEST_MFG",
            model: "TEST_MODEL",
            serialNumber: "TEST-001",
            yearManufactured: 2024,
            countryOfOrigin: "ES"
        };
        
        const specs = {
            loadCapacity: 1000,
            displacementSpeed: 100,
            powerConsumption: 1000,
            printVolumeX: 100,
            printVolumeY: 100,
            printVolumeZ: 100,
            materialPSI: 6000,
            setupTimeMinutes: 60,
            autoLubrication: true,
            gpsTracking: true
        };
        
        const financials = {
            purchasePrice: ethers.parseEther("100"),
            currentValue: ethers.parseEther("90"),
            residualValuePct: 10,
            lastAppraisalDate: Math.floor(Date.now() / 1000),
            depModel: 0,
            annualMaintenancePct: 3,
            insurancePremiumPct: 2
        };
        
        const operational = {
            status: 1,
            operatingHours: 0,
            maxLifetimeHours: 10000,
            totalLoadLifted: 0,
            maxLoadLifetime: ethers.parseEther("1000"),
            metersExtruded: 0,
            maxMetersLifetime: 0,
            setupCount: 0,
            maxSetups: 0,
            cubicMetersPerDay: 0,
            lastMaintenanceDate: Math.floor(Date.now() / 1000),
            nextMaintenanceDate: Math.floor(Date.now() / 1000) + 2592000,
            maintenanceIntervalHours: 1000
        };
        
        const metadataURI = "ipfs://QmTest123";
        
        const tx = await bashoodRWA.connect(assetManager).mintAsset(
            owner.address,
            identification,
            specs,
            financials,
            operational,
            metadataURI
        );
        const receipt = await tx.wait();
        console.log(`   ✅ Asset minted! Gas used: ${receipt.gasUsed.toString()}\n`);
        
        // 4. Verify
        console.log("4️⃣  Verificando datos del asset...");
        const assetData = await bashoodRWA.getAssetData(201);
        console.log(`   ✅ Manufacturer: ${assetData.identification.manufacturer}`);
        console.log(`   ✅ Model: ${assetData.identification.model}`);
        console.log(`   ✅ Owner: ${await bashoodRWA.ownerOf(201)}\n`);
        
        console.log("════════════════════════════════════════════════════════════════");
        console.log("✅ TODAS LAS PRUEBAS PASARON\n");
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
        if (error.data) {
            console.log(`   Error data: ${error.data}`);
        }
        console.log("\n════════════════════════════════════════════════════════════════");
        console.log("❌ PRUEBAS FALLARON\n");
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
