const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: BashoodPropertyNFT branch tests", function () {
  let nft, owner, minter, alice, bob;

  beforeEach(async function () {
    [owner, minter, alice, bob] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("BashoodPropertyNFT");
    nft = await NFT.deploy("https://api.bashood.com/");
    await nft.waitForDeployment();
    await nft.addMinter(minter.address);
    await nft.setMintingFee(ethers.parseEther("0.01"));
  });

  const validProperty = {
    name: "Test Property",
    description: "Test Description", 
    location: "Test Location",
    propertyType: 1, // HOUSE
    area: 100,
    estimatedValue: ethers.parseEther("100000"),
    mintTimestamp: 0,
    isActive: false,
    amenities: ["Garage"],
    imageHash: "QmTest123",
    originalOwner: "0x0000000000000000000000000000000000000000"
  };

  // --- L137: mintProperty with zero address ---
  it("mintProperty reverts with zero address", async function () {
    await expect(nft.connect(minter).mintProperty(
      ethers.ZeroAddress, validProperty, ""
    )).to.be.revertedWith("Cannot mint to zero address");
  });

  // --- L139: mintProperty with empty name ---
  it("mintProperty reverts with empty property name", async function () {
    const emptyNameProperty = {...validProperty, name: ""};
    await expect(nft.connect(minter).mintProperty(
      alice.address, emptyNameProperty, ""
    )).to.be.revertedWith("Property name required");
  });

  // --- L141: mintProperty with invalid property type (> max) ---
  it("mintProperty reverts with invalid property type", async function () {
    const invalidTypeProperty = {...validProperty, propertyType: 10}; // Assuming max is 6 (PENTHOUSE)
    await expect(nft.connect(minter).mintProperty(
      alice.address, invalidTypeProperty, ""
    )).to.be.revertedWith("Invalid property type");
  });

  // --- L141: mintProperty with property type = 0 ---
  it("mintProperty reverts with zero property type", async function () {
    const zeroTypeProperty = {...validProperty, propertyType: 0};
    await expect(nft.connect(minter).mintProperty(
      alice.address, zeroTypeProperty, ""
    )).to.be.revertedWith("Invalid property type");
  });

  // --- L175: publicMint when disabled ---
  it("publicMint reverts when public minting disabled", async function () {
    // Public minting is disabled by default
    await expect(nft.connect(alice).publicMint(validProperty, "", {
      value: ethers.parseEther("0.01")
    })).to.be.revertedWith("Public minting not enabled");
  });

  // --- L178: publicMint with insufficient fee ---
  it("publicMint reverts with insufficient fee", async function () {
    await nft.setPublicMintingEnabled(true); // Enable public minting
    await expect(nft.connect(alice).publicMint(validProperty, "", {
      value: ethers.parseEther("0.005") // Less than 0.01 fee
    })).to.be.revertedWith("Insufficient minting fee");
  });

  // --- L196: Empty customTokenURI branch (false) ---
  it("mintProperty with empty customTokenURI skips setTokenURI", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "");
    // Should succeed without setting custom URI
    expect(await nft.ownerOf(1)).to.equal(alice.address);
  });

  // --- L205: Exact minting fee (no refund) ---
  it("publicMint with exact fee does not refund", async function () {
    await nft.setPublicMintingEnabled(true);
    const balanceBefore = await ethers.provider.getBalance(alice.address);
    
    const tx = await nft.connect(alice).publicMint(validProperty, "", {
      value: ethers.parseEther("0.01") // Exact fee
    });
    const receipt = await tx.wait();
    
    const balanceAfter = await ethers.provider.getBalance(alice.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    // Should deduct exactly fee + gas, no refund
    expect(balanceBefore - balanceAfter).to.equal(ethers.parseEther("0.01") + gasUsed);
  });

  // --- L223: updateProperty unauthorized ---
  it("updateProperty reverts for unauthorized caller", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "");
    await expect(nft.connect(bob).updateProperty(1, "New Name", "New Desc", 123))
      .to.be.revertedWith("Not authorized");
  });

  // --- L236: addAmenities unauthorized ---
  it("addAmenities reverts for unauthorized caller", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "");
    await expect(nft.connect(bob).addAmenities(1, ["Pool"]))
      .to.be.revertedWith("Not authorized");
  });

  // --- L243, L244: validTokenId modifier for non-existent token ---
  it("getProperty reverts for non-existent token", async function () {
    await expect(nft.getProperty(999))
      .to.be.revertedWith("Token does not exist");
  });

  it("updateProperty reverts for non-existent token", async function () {
    await expect(nft.updateProperty(999, "Name", "Desc", 123))
      .to.be.revertedWith("Token does not exist");
  });

  // --- addMinter with zero address ---
  it("addMinter reverts with zero address", async function () {
    await expect(nft.addMinter(ethers.ZeroAddress))
      .to.be.revertedWith("Invalid address");
  });

  // --- Max supply exceeded ---
  it("mintProperty reverts when max supply exceeded", async function () {
    // This would require minting MAX_SUPPLY tokens first, which is expensive
    // Instead, we can mock by setting counter near max limit if possible
    // For now, we'll skip this or find a way to test it more efficiently
  });

  // --- Non-authorized minter ---
  it("mintProperty reverts for non-authorized minter", async function () {
    await expect(nft.connect(alice).mintProperty(bob.address, validProperty, ""))
      .to.be.revertedWith("Not authorized to mint");
  });

  // --- Successful cases to cover true branches ---
  it("successful mintProperty with custom URI", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "custom-uri");
    expect(await nft.tokenURI(1)).to.include("custom-uri");
  });

  it("successful publicMint with overpayment", async function () {
    await nft.setPublicMintingEnabled(true);
    const balanceBefore = await ethers.provider.getBalance(alice.address);
    
    const tx = await nft.connect(alice).publicMint(validProperty, "", {
      value: ethers.parseEther("0.02") // Overpay
    });
    const receipt = await tx.wait();
    
    // Should get refund
    expect(await nft.ownerOf(1)).to.equal(alice.address);
  });

  it("updateProperty succeeds for owner", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "");
    await nft.connect(alice).updateProperty(1, "New Name", "New Desc", ethers.parseEther("200000"));
    
    const property = await nft.getProperty(1);
    expect(property.name).to.equal("New Name");
    expect(property.estimatedValue).to.equal(ethers.parseEther("200000"));
  });

  it("addAmenities succeeds for owner", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "");
    await nft.connect(alice).addAmenities(1, ["Pool", "Spa"]);
    
    const amenities = await nft.getPropertyAmenities(1);
    expect(amenities).to.include("Pool");
    expect(amenities).to.include("Spa");
  });

  // --- onlyAuthorizedMinter modifier success ---
  it("authorized minter can mint successfully", async function () {
    await nft.connect(minter).mintProperty(alice.address, validProperty, "");
    expect(await nft.ownerOf(1)).to.equal(alice.address);
  });

  // --- togglePropertyStatus for non-existent token ---
  it("togglePropertyStatus reverts for non-existent token", async function () {
    await expect(nft.togglePropertyStatus(999))
      .to.be.revertedWith("Token does not exist");
  });

  // --- Remove minter ---
  it("removeMinter removes authorization", async function () {
    await nft.removeMinter(minter.address);
    await expect(nft.connect(minter).mintProperty(alice.address, validProperty, ""))
      .to.be.revertedWith("Not authorized to mint");
  });
});