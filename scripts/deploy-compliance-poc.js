const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Example compliant addresses for demo
  const compliantAddresses = [
    deployer.address,
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"  // Hardhat account #2
  ];
  
  console.log("Creating Merkle tree for compliant addresses:", compliantAddresses);
  
  // Create Merkle tree
  const leaves = compliantAddresses.map(addr => 
    ethers.keccak256(ethers.solidityPacked(["address"], [addr]))
  );
  const merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
  const merkleRoot = merkleTree.getHexRoot();
  
  console.log("Merkle root:", merkleRoot);

  // Deploy ComplianceRegistry
  console.log("\nDeploying ComplianceRegistry...");
  const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
  const complianceRegistry = await ComplianceRegistry.deploy(merkleRoot);
  await complianceRegistry.waitForDeployment();
  
  const complianceAddress = await complianceRegistry.getAddress();
  console.log("ComplianceRegistry deployed to:", complianceAddress);

  // Deploy TokenWrapperERC20
  console.log("\nDeploying TokenWrapperERC20...");
  const TokenWrapper = await ethers.getContractFactory("TokenWrapperERC20");
  const tokenWrapper = await TokenWrapper.deploy(
    "Bashood Compliance Token",
    "BCT",
    complianceAddress,
    ethers.parseEther("1000000") // 1M tokens initial supply
  );
  await tokenWrapper.waitForDeployment();
  
  const tokenAddress = await tokenWrapper.getAddress();
  console.log("TokenWrapperERC20 deployed to:", tokenAddress);

  // Generate example proofs for the demo
  console.log("\n--- Example Usage ---");
  console.log("Compliant addresses and their proofs:");
  
  for (const address of compliantAddresses) {
    const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [address]));
    const proof = merkleTree.getHexProof(leaf);
    console.log(`Address: ${address}`);
    console.log(`Proof: [${proof.map(p => `"${p}"`).join(", ")}]`);
    console.log("---");
  }

  console.log("\n--- Contract Deployment Summary ---");
  console.log(`ComplianceRegistry: ${complianceAddress}`);
  console.log(`TokenWrapperERC20: ${tokenAddress}`);
  console.log(`Initial Supply: 1,000,000 BCT`);
  console.log(`Owner: ${deployer.address}`);
  
  console.log("\n--- Next Steps ---");
  console.log("1. Test compliance verification with the provided proofs");
  console.log("2. Try transfers between compliant addresses");
  console.log("3. Test blocking of non-compliant transfers");
  console.log("4. Update Merkle root to add/remove compliant addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });