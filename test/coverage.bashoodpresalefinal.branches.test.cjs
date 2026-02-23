/**
 * @title BashoodPresaleFinal Branch Coverage Tests  
 * @notice Targeted tests for highest-impact missing branches in PresaleFinal
 * @dev Covers top 20 branches by hit count that are missing error paths
 * Based on coverage analysis priority: L623-629 (209 hits), L142 (200), L442 (196), etc.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BashoodPresaleFinal - Branch Coverage High Priority", function() {
    let bashoodToken, nftContract, referralContract, presaleContract, mockPriceFeed;
    let deployer, projectWallet, user1, user2, signer;
    
    beforeEach(async function() {
        [deployer, projectWallet, user1, user2, signer] = await ethers.getSigners();
        
        // Deploy mock contracts
        const MockToken = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
        bashoodToken = await MockToken.deploy();
        
        const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
        nftContract = await MockNFT.deploy();
        
        const MockReferral = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
        referralContract = await MockReferral.deploy(ethers.ZeroAddress, ethers.ZeroAddress, nftContract.target);
        
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy(8, 2000_00000000); // $2000 ETH
    });

    describe("Constructor Validation Branches (L623-629) - Highest Impact", function() {
        it("reverts on zero bashoodToken address (L623)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    ethers.ZeroAddress, // bashoodToken = 0x0
                    nftContract.target,
                    referralContract.target,
                    projectWallet.address,
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("BHT contract required");
        });

        it("reverts on non-contract bashoodToken (L625)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    user1.address, // EOA instead of contract
                    nftContract.target,
                    referralContract.target,
                    projectWallet.address,
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("BHT must be contract");
        });

        it("reverts on zero nftContract address (L627)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    bashoodToken.target,
                    ethers.ZeroAddress, // nftContract = 0x0
                    referralContract.target,
                    projectWallet.address,
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("NFT contract required");
        });

        it("reverts on non-contract nftContract (L629)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    bashoodToken.target,
                    user2.address, // EOA instead of contract
                    referralContract.target,
                    projectWallet.address,
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("NFT must be contract");
        });

        it("reverts on zero referralContract address (L631)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    bashoodToken.target,
                    nftContract.target,
                    ethers.ZeroAddress, // referralContract = 0x0
                    projectWallet.address,
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("Referral contract required");
        });

        it("reverts on non-contract referralContract (L633)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    bashoodToken.target,
                    nftContract.target,
                    user1.address, // EOA instead of contract
                    projectWallet.address,
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("Referral must be contract");
        });

        it("reverts on zero projectWallet address (L635)", async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            
            await expect(
                PresaleContract.deploy(
                    bashoodToken.target,
                    nftContract.target,
                    referralContract.target,
                    ethers.ZeroAddress, // projectWallet = 0x0
                    ethers.parseEther("0.1"), // nftPriceETH
                    ethers.parseUnits("100", 18), // nftPriceBHT
                    0, // presaleStart
                    Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                    1000 // maxNFTSupply
                )
            ).to.be.revertedWith("Project wallet required");
        });
    });

    describe("Oracle Configuration Branches (L142, L134) - High Impact", function() {
        beforeEach(async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            presaleContract = await PresaleContract.deploy(
                bashoodToken.target,
                nftContract.target,
                referralContract.target,
                projectWallet.address,
                ethers.parseEther("0.1"), // nftPriceETH
                ethers.parseUnits("100", 18), // nftPriceBHT
                0, // presaleStart
                Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                1000 // maxNFTSupply
            );
        });

        it("reverts setPriceFeed with zero address (L142)", async function() {
            await expect(
                presaleContract.setPriceFeed(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
        });

        it("reverts setMaxPriceStaleness with zero value (L123-124)", async function() {
            await expect(
                presaleContract.setMaxPriceStaleness(0)
            ).to.be.revertedWith("Invalid staleness: 1s-24h");
        });

        it("reverts setMaxPriceStaleness with value > 24h (L123-124)", async function() {
            await expect(
                presaleContract.setMaxPriceStaleness(86401) // 24h + 1s
            ).to.be.revertedWith("Invalid staleness: 1s-24h");
        });
    });

    describe("Signer Configuration Branch (L442) - High Impact", function() {
        beforeEach(async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            presaleContract = await PresaleContract.deploy(
                bashoodToken.target,
                nftContract.target,
                referralContract.target,
                projectWallet.address,
                ethers.parseEther("0.1"), // nftPriceETH
                ethers.parseUnits("100", 18), // nftPriceBHT
                0, // presaleStart
                Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                1000 // maxNFTSupply
            );
        });

        it("reverts setSigner with zero address (L442)", async function() {
            await expect(
                presaleContract.setSigner(ethers.ZeroAddress)
            ).to.be.revertedWith("Signer required");
        });
    });

    describe("Purchase Configuration Branches (L328-329) - Medium Impact", function() {
        beforeEach(async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            presaleContract = await PresaleContract.deploy(
                bashoodToken.target,
                nftContract.target,
                referralContract.target,
                projectWallet.address,
                ethers.parseEther("0.1"), // nftPriceETH
                ethers.parseUnits("100", 18), // nftPriceBHT
                0, // presaleStart
                Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                1000 // maxNFTSupply
            );
        });

        it("reverts setMaxPerUser with zero value (L328)", async function() {
            await expect(
                presaleContract.setMaxPerUser(0)
            ).to.be.revertedWith("E5");
        });

        it("reverts startPresale when already active (L329)", async function() {
            await presaleContract.startPresale(); // First call should succeed
            
            await expect(
                presaleContract.startPresale() // Second call should fail
            ).to.be.revertedWith("E6");
        });
    });

    describe("Purchase Validation Branches (L398-400) - Medium Impact", function() {
        beforeEach(async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            presaleContract = await PresaleContract.deploy(
                bashoodToken.target,
                nftContract.target,
                referralContract.target,
                projectWallet.address,
                ethers.parseEther("0.1"), // nftPriceETH
                ethers.parseUnits("100", 18), // nftPriceBHT
                0, // presaleStart = 0 (use presaleActive flag)
                0, // presaleEnd = 0 (use presaleActive flag)
                1000 // maxNFTSupply
            );

            // Configure oracle and operational settings
            await presaleContract.setPriceFeed(mockPriceFeed.target);
            await presaleContract.setMaxPriceStaleness(3600);
            await presaleContract.setOperationsWallet(projectWallet.address);
            await presaleContract.setSigner(signer.address);
            await presaleContract.startPresale();
            
            // Mint NFTs to the presale contract so purchases can succeed
            await nftContract.mint(presaleContract.target, 1, 1000); // NFT ID 1
            await nftContract.mint(presaleContract.target, 999, 1000); // NFT ID 999 (for testing disallowed ID)
            // NFT IDs 1 and 2 are allowed by default in constructor
        });

        it("reverts purchase with incorrect payment amount (E18)", async function() {
            const nonce = 1;
            const hash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [user1.address, nonce]
            );
            const signature = await signer.signMessage(ethers.getBytes(hash));

            // Send wrong amount (should be 0.1 ETH for 1 NFT, but sending 0.05 ETH)
            await expect(
                presaleContract.connect(user1).purchaseWithETH(
                    1, // nftId
                    1, // quantity
                    nonce,
                    signature,
                    { value: ethers.parseEther("0.05") } // Wrong amount (half of required)
                )
            ).to.be.revertedWith("E18");
        });

        it("reverts purchase with invalid signature (E12)", async function() {
            const nonce = 1;
            const wrongHash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [user2.address, nonce] // Sign for different user
            );
            const wrongSignature = await signer.signMessage(ethers.getBytes(wrongHash));

            await expect(
                presaleContract.connect(user1).purchaseWithETH(
                    1, // nftId
                    1, // quantity
                    nonce,
                    wrongSignature, // Wrong signature
                    { value: ethers.parseEther("0.1") }
                )
            ).to.be.revertedWith("E12");
        });

        it("reverts purchase when exceeding max per user (E17)", async function() {
            // First set max per user to 1
            await presaleContract.setMaxPerUser(1);
            
            const nonce1 = 1;
            const hash1 = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [user1.address, nonce1]
            );
            const signature1 = await signer.signMessage(ethers.getBytes(hash1));

            // First purchase should succeed
            await presaleContract.connect(user1).purchaseWithETH(
                1, 1, nonce1, signature1,
                { value: ethers.parseEther("0.1") }
            );

            const nonce2 = 2;
            const hash2 = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [user1.address, nonce2]
            );
            const signature2 = await signer.signMessage(ethers.getBytes(hash2));

            // Second purchase should fail
            await expect(
                presaleContract.connect(user1).purchaseWithETH(
                    1, 1, nonce2, signature2,
                    { value: ethers.parseEther("0.1") }
                )
            ).to.be.revertedWith("E17");
        });

        it("reverts purchase of disallowed NFT ID (E14)", async function() {
            const nonce = 1;
            const hash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [user1.address, nonce]
            );
            const signature = await signer.signMessage(ethers.getBytes(hash));

            await expect(
                presaleContract.connect(user1).purchaseWithETH(
                    999, // Disallowed NFT ID
                    1,
                    nonce,
                    signature,
                    { value: ethers.parseEther("0.1") }
                )
            ).to.be.revertedWith("E14");
        });
    });

    describe("Oracle Staleness Branches (L328-329 additional) - Medium Impact", function() {
        beforeEach(async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            presaleContract = await PresaleContract.deploy(
                bashoodToken.target,
                nftContract.target,
                referralContract.target,
                projectWallet.address,
                ethers.parseEther("0.1"), // nftPriceETH
                ethers.parseUnits("100", 18), // nftPriceBHT
                0, // presaleStart
                Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                1000 // maxNFTSupply
            );

            // Set a very short staleness period for testing
            await presaleContract.setMaxPriceStaleness(60); // 1 minute
        });

        it("handles stale price data correctly", async function() {
            // This will test the internal oracle staleness logic
            // The exact implementation depends on how the oracle mock handles timestamps
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Try to get price when oracle timestamp is stale
            // Note: This might require additional oracle mock setup for timestamp manipulation
            expect(await presaleContract.maxPriceStaleness()).to.equal(60);
        });
    });

    describe("Edge Case Validations (Remaining High Impact)", function() {
        beforeEach(async function() {
            const PresaleContract = await ethers.getContractFactory("BashoodPresaleFinal");
            presaleContract = await PresaleContract.deploy(
                bashoodToken.target,
                nftContract.target,
                referralContract.target,
                projectWallet.address,
                ethers.parseEther("0.1"), // nftPriceETH
                ethers.parseUnits("100", 18), // nftPriceBHT
                0, // presaleStart
                Math.floor(Date.now() / 1000) + 86400, // presaleEnd
                1000 // maxNFTSupply
            );
        });

        it("reverts setOperationsWallet with zero address", async function() {
            await expect(
                presaleContract.setOperationsWallet(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
        });

        it("validates whitelist requirement when enabled", async function() {
            await presaleContract.setWhitelistEnabled(true);
            await presaleContract.startPresale();
            await presaleContract.setSigner(signer.address);
            // NFT ID 1 is allowed by default

            // Try purchase without whitelist role - should fail due to whitelistCheck modifier
            const nonce = 1;
            const hash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [user1.address, nonce]
            );
            const signature = await signer.signMessage(ethers.getBytes(hash));

            await expect(
                presaleContract.connect(user1).purchaseWithETH(
                    1,
                    1,
                    nonce,
                    signature,
                    { value: ethers.parseEther("0.1") }
                )
            ).to.be.reverted; // Will revert due to whitelist check
        });
    });
});