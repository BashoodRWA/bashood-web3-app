const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const crypto = require("crypto");

describe("ComplianceRegistry", function () {
  let complianceRegistry;
  let tokenWrapper;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let merkleTree;
  let compliantAddresses;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Create list of compliant addresses
    compliantAddresses = [owner.address, addr1.address];
    
    // Create Merkle tree
    const leaves = compliantAddresses.map(addr => ethers.keccak256(ethers.solidityPacked(["address"], [addr])));
    merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getHexRoot();

    // Deploy ComplianceRegistry
    const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
    complianceRegistry = await ComplianceRegistry.deploy(merkleRoot);

    // Deploy TokenWrapper
    const TokenWrapper = await ethers.getContractFactory("TokenWrapperERC20");
    tokenWrapper = await TokenWrapper.deploy(
      "Test Token",
      "TEST",
      await complianceRegistry.getAddress(),
      ethers.parseEther("1000")
    );
  });

  describe("ComplianceRegistry", function () {
    it("Should verify compliant addresses with valid proof", async function () {
      const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [addr1.address]));
      const proof = merkleTree.getHexProof(leaf);
      
      expect(await complianceRegistry.isCompliant(addr1.address, proof)).to.be.true;
    });

    it("Should reject non-compliant addresses", async function () {
      const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [addr3.address]));
      const proof = merkleTree.getHexProof(leaf);
      
      expect(await complianceRegistry.isCompliant(addr3.address, proof)).to.be.false;
    });

    it("Should allow owner to update Merkle root", async function () {
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("new root"));
      await complianceRegistry.updateMerkleRoot(newRoot);
      
      expect(await complianceRegistry.merkleRoot()).to.equal(newRoot);
    });

    it("Should allow owner to set compliance overrides", async function () {
      await complianceRegistry.setComplianceOverride(addr3.address, true);
      
      expect(await complianceRegistry.isCompliant(addr3.address, [])).to.be.true;
    });
  });

  describe("TokenWrapperERC20", function () {
    it("Should allow transfers between compliant addresses", async function () {
      // Transfer from owner (compliant) to addr1 (compliant)
      const ownerLeaf = ethers.keccak256(ethers.solidityPacked(["address"], [owner.address]));
      const ownerProof = merkleTree.getHexProof(ownerLeaf);
      
      const addr1Leaf = ethers.keccak256(ethers.solidityPacked(["address"], [addr1.address]));
      const addr1Proof = merkleTree.getHexProof(addr1Leaf);

      await tokenWrapper.transferWithProof(
        addr1.address,
        ethers.parseEther("100"),
        ownerProof,
        addr1Proof
      );

      expect(await tokenWrapper.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should block transfers to non-compliant addresses", async function () {
      const ownerLeaf = ethers.keccak256(ethers.solidityPacked(["address"], [owner.address]));
      const ownerProof = merkleTree.getHexProof(ownerLeaf);
      
      // addr3 is not compliant, so empty proof
      const result = await tokenWrapper.transferWithProof(
        addr3.address,
        ethers.parseEther("100"),
        ownerProof,
        []
      );

      // Check that transfer was blocked
      expect(await tokenWrapper.balanceOf(addr3.address)).to.equal(0);
    });

    it("Should allow owner to mint with compliance check", async function () {
      const addr1Leaf = ethers.keccak256(ethers.solidityPacked(["address"], [addr1.address]));
      const addr1Proof = merkleTree.getHexProof(addr1Leaf);

      await tokenWrapper.mintWithCompliance(
        addr1.address,
        ethers.parseEther("50"),
        addr1Proof
      );

      expect(await tokenWrapper.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should block minting to non-compliant address", async function () {
      await expect(
        tokenWrapper.mintWithCompliance(
          addr3.address,
          ethers.parseEther("50"),
          []
        )
      ).to.be.revertedWith("Recipient not compliant");
    });

    it("Should allow owner to toggle compliance", async function () {
      await tokenWrapper.toggleCompliance(false);
      
      // Now transfers should work without compliance checks
      await tokenWrapper.transfer(addr3.address, ethers.parseEther("100"));
      expect(await tokenWrapper.balanceOf(addr3.address)).to.equal(ethers.parseEther("100"));
    });
  });
});