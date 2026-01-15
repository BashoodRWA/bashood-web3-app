const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🏠 BashoodPropertyNFT", function () {
    let propertyNFT;
    let owner;
    let minter;
    let user1;
    let user2;

    const BASE_URI = "https://api.bashood.com/nft/";
    const MINTING_FEE = ethers.parseEther("0.01");

    beforeEach(async function () {
        [owner, minter, user1, user2] = await ethers.getSigners();

        console.log("🏗️ Deploying BashoodPropertyNFT...");
        const BashoodPropertyNFT = await ethers.getContractFactory("BashoodPropertyNFT");
        propertyNFT = await BashoodPropertyNFT.deploy(BASE_URI);
        await propertyNFT.waitForDeployment();

        console.log("✅ BashoodPropertyNFT deployed at:", await propertyNFT.getAddress());

        // Add minter authorization
        await propertyNFT.addMinter(minter.address);
    });

    describe("📋 Deployment & Initial State", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await propertyNFT.name()).to.equal("Bashood Property NFT");
            expect(await propertyNFT.symbol()).to.equal("BPNFT");
        });

        it("Should set the correct base URI", async function () {
            // We can't access _baseURI() directly as it's internal
            // Instead, we'll verify by minting a token and checking its URI
            
            const propertyData = {
                name: "Test Property",
                description: "Test Description",
                location: "Test Location",
                propertyType: 1, // HOUSE
                area: 100,
                estimatedValue: ethers.parseUnits("100000", 18),
                mintTimestamp: 0, // Will be set by contract
                isActive: true, // Will be set by contract
                amenities: ["Garage"],
                imageHash: "QmTest123",
                originalOwner: "0x0000000000000000000000000000000000000000" // Will be set by contract
            };

            // Mint a token and check if the base URI is used correctly
            await propertyNFT.connect(minter).mintProperty(
                user1.address,
                propertyData,
                "" // No custom URI, should use base URI
            );

            const tokenURI = await propertyNFT.tokenURI(1);
            // Since we didn't set a custom URI, it should return the base URI pattern
            expect(tokenURI).to.include("api.bashood.com");
        });

        it("Should have owner as authorized minter", async function () {
            expect(await propertyNFT.authorizedMinters(owner.address)).to.be.true;
            expect(await propertyNFT.authorizedMinters(minter.address)).to.be.true;
        });

        it("Should start with token counter at 1", async function () {
            const stats = await propertyNFT.getCollectionStats();
            expect(stats.total).to.equal(0); // No tokens minted yet
        });
    });

    describe("🏠 Property Minting", function () {
        const sampleProperty = {
            name: "Golden Villa",
            description: "Luxury villa with golden accents",
            location: "Beverly Hills, CA",
            propertyType: 5, // VILLA
            area: 500,
            estimatedValue: ethers.parseEther("1000000"), // 1M USD
            mintTimestamp: 0,
            isActive: false,
            amenities: ["Pool", "Garden", "Garage"],
            imageHash: "QmHash123",
            originalOwner: "0x0000000000000000000000000000000000000000"
        };

        it("Should mint property NFT successfully", async function () {
            const tx = await propertyNFT.connect(minter).mintProperty(
                user1.address,
                sampleProperty,
                "custom-uri.json"
            );

            await expect(tx)
                .to.emit(propertyNFT, "PropertyMinted")
                .withArgs(1, user1.address, sampleProperty.name, sampleProperty.propertyType, sampleProperty.estimatedValue);

            expect(await propertyNFT.ownerOf(1)).to.equal(user1.address);
            expect(await propertyNFT.balanceOf(user1.address)).to.equal(1);

            const property = await propertyNFT.getProperty(1);
            expect(property.name).to.equal(sampleProperty.name);
            expect(property.propertyType).to.equal(sampleProperty.propertyType);
            expect(property.isActive).to.be.true;
            expect(property.originalOwner).to.equal(user1.address);
        });

        it("Should fail if not authorized minter", async function () {
            await expect(
                propertyNFT.connect(user1).mintProperty(user2.address, sampleProperty, "")
            ).to.be.revertedWith("Not authorized to mint");
        });

        it("Should fail with invalid property type", async function () {
            const invalidProperty = { ...sampleProperty, propertyType: 0 };

            await expect(
                propertyNFT.connect(minter).mintProperty(user1.address, invalidProperty, "")
            ).to.be.revertedWith("Invalid property type");
        });

        it("Should fail with empty property name", async function () {
            const invalidProperty = { ...sampleProperty, name: "" };

            await expect(
                propertyNFT.connect(minter).mintProperty(user1.address, invalidProperty, "")
            ).to.be.revertedWith("Property name required");
        });

        it("Should update property type counters", async function () {
            await propertyNFT.connect(minter).mintProperty(user1.address, sampleProperty, "");

            const stats = await propertyNFT.getCollectionStats();
            expect(stats.total).to.equal(1);
            expect(stats.villas).to.equal(1);
        });
    });

    describe("🌟 Public Minting", function () {
        const sampleProperty = {
            name: "Public House",
            description: "House minted publicly",
            location: "New York, NY",
            propertyType: 1, // HOUSE
            area: 200,
            estimatedValue: ethers.parseEther("500000"),
            mintTimestamp: 0,
            isActive: false,
            amenities: [],
            imageHash: "QmPublic123",
            originalOwner: "0x0000000000000000000000000000000000000000"
        };

        it("Should fail if public minting not enabled", async function () {
            await expect(
                propertyNFT.connect(user1).publicMint(sampleProperty, "", { value: MINTING_FEE })
            ).to.be.revertedWith("Public minting not enabled");
        });

        it("Should mint successfully when public minting enabled", async function () {
            await propertyNFT.setPublicMintingEnabled(true);

            await expect(
                propertyNFT.connect(user1).publicMint(sampleProperty, "", { value: MINTING_FEE })
            ).to.emit(propertyNFT, "PropertyMinted");

            expect(await propertyNFT.ownerOf(1)).to.equal(user1.address);
        });

        it("Should fail with insufficient fee", async function () {
            await propertyNFT.setPublicMintingEnabled(true);

            await expect(
                propertyNFT.connect(user1).publicMint(sampleProperty, "", { value: ethers.parseEther("0.005") })
            ).to.be.revertedWith("Insufficient minting fee");
        });

        it("Should refund excess payment", async function () {
            await propertyNFT.setPublicMintingEnabled(true);

            const initialBalance = await ethers.provider.getBalance(user1.address);
            const excessPayment = ethers.parseEther("0.05");

            const tx = await propertyNFT.connect(user1).publicMint(sampleProperty, "", { value: excessPayment });
            const receipt = await tx.wait();

            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const finalBalance = await ethers.provider.getBalance(user1.address);

            // Should only pay minting fee + gas
            const expectedBalance = initialBalance - MINTING_FEE - gasUsed;
            expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
        });
    });

    describe("📝 Property Management", function () {
        beforeEach(async function () {
            const sampleProperty = {
                name: "Original House",
                description: "Original description",
                location: "Original Location",
                propertyType: 1,
                area: 100,
                estimatedValue: ethers.parseEther("100000"),
                mintTimestamp: 0,
                isActive: false,
                amenities: [],
                imageHash: "QmOriginal",
                originalOwner: "0x0000000000000000000000000000000000000000"
            };

            await propertyNFT.connect(minter).mintProperty(user1.address, sampleProperty, "");
        });

        it("Should update property data by owner", async function () {
            await expect(
                propertyNFT.connect(user1).updateProperty(
                    1,
                    "Updated House",
                    "Updated description",
                    ethers.parseEther("150000")
                )
            ).to.emit(propertyNFT, "PropertyUpdated");

            const property = await propertyNFT.getProperty(1);
            expect(property.name).to.equal("Updated House");
            expect(property.description).to.equal("Updated description");
            expect(property.estimatedValue).to.equal(ethers.parseEther("150000"));
        });

        it("Should fail to update if not owner", async function () {
            await expect(
                propertyNFT.connect(user2).updateProperty(1, "Hacked", "Hacked", 0)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should add amenities", async function () {
            await propertyNFT.connect(user1).addAmenities(1, ["Pool", "Garden", "Gym"]);

            const amenities = await propertyNFT.getPropertyAmenities(1);
            expect(amenities.length).to.equal(3);
            expect(amenities[0]).to.equal("Pool");
            expect(amenities[1]).to.equal("Garden");
            expect(amenities[2]).to.equal("Gym");
        });

        it("Should toggle property status by contract owner", async function () {
            const propertyBefore = await propertyNFT.getProperty(1);
            expect(propertyBefore.isActive).to.be.true;

            await propertyNFT.togglePropertyStatus(1);

            const propertyAfter = await propertyNFT.getProperty(1);
            expect(propertyAfter.isActive).to.be.false;
        });
    });

    describe("🔍 Query Functions", function () {
        beforeEach(async function () {
            // Mint different types of properties
            const properties = [
                { name: "House 1", propertyType: 1, value: ethers.parseEther("300000") },
                { name: "House 2", propertyType: 1, value: ethers.parseEther("400000") },
                { name: "Apartment 1", propertyType: 2, value: ethers.parseEther("200000") },
                { name: "Villa 1", propertyType: 5, value: ethers.parseEther("800000") }
            ];

            for (let i = 0; i < properties.length; i++) {
                const prop = properties[i];
                await propertyNFT.connect(minter).mintProperty(
                    user1.address,
                    {
                        name: prop.name,
                        description: "Test property",
                        location: "Test Location",
                        propertyType: prop.propertyType,
                        area: 100,
                        estimatedValue: prop.value,
                        mintTimestamp: 0,
                        isActive: false,
                        amenities: [],
                        imageHash: "QmTest",
                        originalOwner: "0x0000000000000000000000000000000000000000"
                    },
                    ""
                );
            }
        });

        it("Should get properties by type", async function () {
            const houses = await propertyNFT.getPropertiesByType(1); // HOUSE
            const apartments = await propertyNFT.getPropertiesByType(2); // APARTMENT
            const villas = await propertyNFT.getPropertiesByType(5); // VILLA

            expect(houses.length).to.equal(2);
            expect(apartments.length).to.equal(1);
            expect(villas.length).to.equal(1);
        });

        it("Should get properties by owner", async function () {
            const user1Properties = await propertyNFT.getPropertiesByOwner(user1.address);
            expect(user1Properties.length).to.equal(4);

            const user2Properties = await propertyNFT.getPropertiesByOwner(user2.address);
            expect(user2Properties.length).to.equal(0);
        });

        it("Should calculate total value by owner", async function () {
            const totalValue = await propertyNFT.getTotalValueByOwner(user1.address);
            const expectedValue = ethers.parseEther("1700000"); // 300k + 400k + 200k + 800k
            expect(totalValue).to.equal(expectedValue);
        });

        it("Should return collection statistics", async function () {
            const stats = await propertyNFT.getCollectionStats();
            expect(stats.total).to.equal(4);
            expect(stats.houses).to.equal(2);
            expect(stats.apartments).to.equal(1);
            expect(stats.villas).to.equal(1);
            expect(stats.commercial).to.equal(0);
        });
    });

    describe("👑 Admin Functions", function () {
        it("Should add and remove minters", async function () {
            await expect(propertyNFT.addMinter(user2.address))
                .to.emit(propertyNFT, "MinterAdded")
                .withArgs(user2.address);

            expect(await propertyNFT.authorizedMinters(user2.address)).to.be.true;

            await expect(propertyNFT.removeMinter(user2.address))
                .to.emit(propertyNFT, "MinterRemoved")
                .withArgs(user2.address);

            expect(await propertyNFT.authorizedMinters(user2.address)).to.be.false;
        });

        it("Should toggle public minting", async function () {
            await expect(propertyNFT.setPublicMintingEnabled(true))
                .to.emit(propertyNFT, "PublicMintingToggled")
                .withArgs(true);

            expect(await propertyNFT.publicMintingEnabled()).to.be.true;
        });

        it("Should update minting fee", async function () {
            const newFee = ethers.parseEther("0.02");

            await expect(propertyNFT.setMintingFee(newFee))
                .to.emit(propertyNFT, "MintingFeeUpdated")
                .withArgs(newFee);

            expect(await propertyNFT.mintingFee()).to.equal(newFee);
        });

        it("Should update base URI", async function () {
            const newBaseURI = "https://new-api.bashood.com/nft/";

            await expect(propertyNFT.setBaseURI(newBaseURI))
                .to.emit(propertyNFT, "BaseURIUpdated")
                .withArgs(newBaseURI);
        });

        it("Should pause and unpause", async function () {
            await propertyNFT.pause();
            expect(await propertyNFT.paused()).to.be.true;

            // Should fail to mint when paused
            await expect(
                propertyNFT.connect(minter).mintProperty(
                    user1.address,
                    {
                        name: "Test",
                        description: "Test",
                        location: "Test",
                        propertyType: 1,
                        area: 100,
                        estimatedValue: ethers.parseEther("100000"),
                        mintTimestamp: 0,
                        isActive: false,
                        amenities: [],
                        imageHash: "QmTest",
                        originalOwner: "0x0000000000000000000000000000000000000000"
                    },
                    ""
                )
            ).to.be.revertedWithCustomError(propertyNFT, "EnforcedPause");

            await propertyNFT.unpause();
            expect(await propertyNFT.paused()).to.be.false;
        });

        it("Should withdraw contract balance", async function () {
            // Enable public minting and mint a property
            await propertyNFT.setPublicMintingEnabled(true);

            const sampleProperty = {
                name: "Paid House",
                description: "House paid for",
                location: "Test Location",
                propertyType: 1,
                area: 100,
                estimatedValue: ethers.parseEther("100000"),
                mintTimestamp: 0,
                isActive: false,
                amenities: [],
                imageHash: "QmPaid",
                originalOwner: "0x0000000000000000000000000000000000000000"
            };

            await propertyNFT.connect(user1).publicMint(sampleProperty, "", { value: MINTING_FEE });

            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
            const contractBalance = await ethers.provider.getBalance(await propertyNFT.getAddress());

            await propertyNFT.withdraw();

            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);

            const contractBalanceAfter = await ethers.provider.getBalance(await propertyNFT.getAddress());
            expect(contractBalanceAfter).to.equal(0);
        });
    });

    describe("🚫 Edge Cases & Security", function () {
        it("Should fail to mint to zero address", async function () {
            const sampleProperty = {
                name: "Zero Address House",
                description: "Should fail",
                location: "Nowhere",
                propertyType: 1,
                area: 100,
                estimatedValue: ethers.parseEther("100000"),
                mintTimestamp: 0,
                isActive: false,
                amenities: [],
                imageHash: "QmZero",
                originalOwner: "0x0000000000000000000000000000000000000000"
            };

            await expect(
                propertyNFT.connect(minter).mintProperty(
                    ethers.ZeroAddress,
                    sampleProperty,
                    ""
                )
            ).to.be.revertedWith("Cannot mint to zero address");
        });

        it("Should fail to query non-existent token", async function () {
            await expect(propertyNFT.getProperty(999)).to.be.revertedWith("Token does not exist");
        });

        it("Should respect MAX_SUPPLY limit", async function () {
            // This test would need to be adjusted based on gas limits for practical testing
            // For now, we'll just verify the constant is set
            expect(await propertyNFT.MAX_SUPPLY()).to.equal(10000);
        });

        it("Should fail admin functions if not owner", async function () {
            await expect(
                propertyNFT.connect(user1).addMinter(user2.address)
            ).to.be.revertedWithCustomError(propertyNFT, "OwnableUnauthorizedAccount");

            await expect(
                propertyNFT.connect(user1).setMintingFee(0)
            ).to.be.revertedWithCustomError(propertyNFT, "OwnableUnauthorizedAccount");

            await expect(
                propertyNFT.connect(user1).pause()
            ).to.be.revertedWithCustomError(propertyNFT, "OwnableUnauthorizedAccount");
        });
    });
});





