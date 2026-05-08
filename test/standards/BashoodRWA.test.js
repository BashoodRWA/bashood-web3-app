const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("BashoodRWAReference - Core Functionality", function () {
    // ============ Test Fixtures ============
    
    async function deployBashoodRWAFixture() {
        const [owner, assetManager, oracle, user1, user2] = await ethers.getSigners();
        
        const BashoodRWA = await ethers.getContractFactory("BashoodRWAReference");
        const bashoodRWA = await upgrades.deployProxy(
            BashoodRWA,
            ["Bashood Industrial Assets", "BASHOOD-RWA", "https://bashood.com/metadata/", owner.address],
            { kind: "uups" }
        );
        await bashoodRWA.waitForDeployment();
        
        // Grant roles
        const ASSET_MANAGER_ROLE = await bashoodRWA.ASSET_MANAGER_ROLE();
        const ORACLE_ROLE = await bashoodRWA.ORACLE_ROLE();
        
        await bashoodRWA.grantRole(ASSET_MANAGER_ROLE, assetManager.address);
        await bashoodRWA.grantRole(ORACLE_ROLE, oracle.address);
        
        return { bashoodRWA, owner, assetManager, oracle, user1, user2, ASSET_MANAGER_ROLE, ORACLE_ROLE };
    }
    
    async function deployWithEVOCONSAsset() {
        const fixture = await loadFixture(deployBashoodRWAFixture);
        const { bashoodRWA, assetManager, user1 } = fixture;
        
        // EVOCONS EVOBLOCK System #001 - Load-based depreciation, Fractional
        const identification = {
            category: 0, // CONSTRUCTION_3D_PRINTER_GANTRY
            manufacturer: "EVOCONS",
            model: "EVOBLOCK System",
            serialNumber: "EVB-001-2024",
            yearManufactured: 2024,
            location: "Barcelona Construction Hub, Spain"
        };
        
        const specs = {
            powerRating: 45000, // 45 kW
            maxWeight: 3000,    // 3 tons
            dimensions: "5000x3000x2500", // mm
            customSpecs: '{"loadCapacity":"3000kg","displacementSpeed":"40m/min"}'
        };
        
        const financials = {
            purchasePrice: ethers.parseEther("1200000"), // $1.2M
            currentValue: ethers.parseEther("1110000"),  // $1.11M
            residualValue: ethers.parseEther("120000"),  // $120k (10%)
            depreciationModel: 0, // LOAD_BASED
            purchaseDate: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60), // 1 year ago
            warrantyExpiry: Math.floor(Date.now() / 1000) + (4 * 365 * 24 * 60 * 60) // 4 years
        };
        
        const operational = {
            status: 1, // ACTIVE
            operatingHours: 4800,
            maxLifetimeHours: 175200, // 20 years * 8760 hours
            totalLoadLifted: ethers.parseEther("72000"), // 72k tons
            maxLoadLifetime: ethers.parseEther("500000"), // 500k tons max
            metersExtruded: 0,
            maxMetersLifetime: 0,
            setupCount: 0,
            maxSetups: 0,
            cubicMetersPerDay: 0,
            lastMaintenanceDate: Math.floor(Date.now() / 1000) - (2500 * 60 * 60), // 2500 hours ago
            nextMaintenanceDate: Math.floor(Date.now() / 1000) + (100 * 60 * 60), // 100 hours
            maintenanceIntervalHours: 2500
        };
        
        const metadataURI = "ipfs://QmEVOCONS001Metadata";
        
        const tx = await bashoodRWA.connect(assetManager).mintAsset(
            user1.address,
            identification,
            specs,
            financials,
            operational,
            metadataURI
        );
        const receipt = await tx.wait();
        
        // Get tokenId from event
        const event = receipt.logs.find(log => {
            try {
                return bashoodRWA.interface.parseLog(log)?.name === "AssetMinted";
            } catch {
                return false;
            }
        });
        const tokenId = bashoodRWA.interface.parseLog(event).args.tokenId;
        
        return { ...fixture, tokenId, identification, specs, financials, operational };
    }
    
    // ============ Deployment Tests ============
    
    describe("Deployment", function () {
        it("Should deploy with correct name and symbol", async function () {
            const { bashoodRWA } = await loadFixture(deployBashoodRWAFixture);
            
            expect(await bashoodRWA.name()).to.equal("Bashood Industrial Assets");
            expect(await bashoodRWA.symbol()).to.equal("BASHOOD-RWA");
        });
        
        it("Should grant roles correctly", async function () {
            const { bashoodRWA, owner, assetManager, oracle, ASSET_MANAGER_ROLE, ORACLE_ROLE } = await loadFixture(deployBashoodRWAFixture);
            
            expect(await bashoodRWA.hasRole(ASSET_MANAGER_ROLE, assetManager.address)).to.be.true;
            expect(await bashoodRWA.hasRole(ORACLE_ROLE, oracle.address)).to.be.true;
            expect(await bashoodRWA.hasRole(await bashoodRWA.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        });
    });
    
    // ============ Minting Tests ============
    
    describe("Asset Minting", function () {
        it("Should mint EVOCONS asset correctly", async function () {
            const { bashoodRWA, tokenId, user1, identification } = await loadFixture(deployWithEVOCONSAsset);
            
            expect(await bashoodRWA.ownerOf(tokenId)).to.equal(user1.address);
            
            const assetData = await bashoodRWA.getAssetData(tokenId);
            expect(assetData.identification.manufacturer).to.equal("EVOCONS");
            expect(assetData.identification.model).to.equal("EVOBLOCK System");
        });
        
        it("Should emit AssetMinted event", async function () {
            const { bashoodRWA, assetManager, user1 } = await loadFixture(deployBashoodRWAFixture);
            
            const identification = {
                category: 0,
                manufacturer: "ICON",
                model: "VULCAN",
                serialNumber: "VUL-001",
                yearManufactured: 2024,
                location: "Austin, Texas"
            };
            
            const specs = {
                powerRating: 60000,
                maxWeight: 5000,
                dimensions: "8000x5000x3000",
                customSpecs: '{"material":"Lavacrete"}'
            };
            
            const financials = {
                purchasePrice: ethers.parseEther("1600000"),
                currentValue: ethers.parseEther("1488000"),
                residualValue: ethers.parseEther("192000"),
                depreciationModel: 1, // EXTRUSION_BASED
                purchaseDate: Math.floor(Date.now() / 1000),
                warrantyExpiry: Math.floor(Date.now() / 1000) + (5 * 365 * 24 * 60 * 60)
            };
            
            const operational = {
                status: 1,
                operatingHours: 1680,
                maxLifetimeHours: 131400,
                totalLoadLifted: 0,
                maxLoadLifetime: 0,
                metersExtruded: ethers.parseEther("28500"),
                maxMetersLifetime: ethers.parseEther("150000"),
                setupCount: 0,
                maxSetups: 0,
                cubicMetersPerDay: 0,
                lastMaintenanceDate: Math.floor(Date.now() / 1000),
                nextMaintenanceDate: Math.floor(Date.now() / 1000) + (1000 * 60 * 60),
                maintenanceIntervalHours: 1000
            };
            
            await expect(
                bashoodRWA.connect(assetManager).mintAsset(
                    user1.address,
                    identification,
                    specs,
                    financials,
                    operational,
                    "ipfs://QmICON001"
                )
            ).to.emit(bashoodRWA, "AssetMinted")
             .withArgs(
                 0, // tokenId
                 user1.address,
                 0, // CONSTRUCTION_3D_PRINTER_GANTRY
                 "ICON",
                 "VULCAN",
                 ethers.parseEther("1600000")
             );
        });
        
        it("Should revert if not ASSET_MANAGER_ROLE", async function () {
            const { bashoodRWA, user1 } = await loadFixture(deployBashoodRWAFixture);
            
            const identification = { category: 0, manufacturer: "Test", model: "Test", serialNumber: "T-001", yearManufactured: 2024, location: "Test" };
            const specs = { powerRating: 1000, maxWeight: 100, dimensions: "100x100x100", customSpecs: "{}" };
            const financials = {
                purchasePrice: ethers.parseEther("1000"),
                currentValue: ethers.parseEther("900"),
                residualValue: ethers.parseEther("100"),
                depreciationModel: 0,
                purchaseDate: Math.floor(Date.now() / 1000),
                warrantyExpiry: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
            };
            const operational = {
                status: 1, operatingHours: 0, maxLifetimeHours: 100000, totalLoadLifted: 0, maxLoadLifetime: 0,
                metersExtruded: 0, maxMetersLifetime: 0, setupCount: 0, maxSetups: 0, cubicMetersPerDay: 0,
                lastMaintenanceDate: 0, nextMaintenanceDate: 0, maintenanceIntervalHours: 1000
            };
            
            await expect(
                bashoodRWA.connect(user1).mintAsset(user1.address, identification, specs, financials, operational, "ipfs://test")
            ).to.be.reverted;
        });
    });
});
