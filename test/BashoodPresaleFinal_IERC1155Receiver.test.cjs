const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BashoodPresaleFinal IERC1155Receiver", function () {
  let presale, deployer, user, nft;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
    // Mock NFT (ERC1155)
    const MockNFT = await ethers.getContractFactory("MockNFT1155");
    nft = await MockNFT.deploy();
    await nft.waitForDeployment();
    // Mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy();
    await token.waitForDeployment();
    // Mock BashoodReferral
    const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    // constructor: (address _presaleAddress, address _validator, address _nftContract)
    // deploy a referral with placeholder presale/validator (deployer) and correct NFT address, then set real presale address below
    const referral = await BashoodReferral.deploy(deployer.address, deployer.address, await nft.getAddress());
    await referral.waitForDeployment();
    // Deploy BashoodPresaleFinal con mocks válidos (usar solo direcciones await getAddress())
    const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    presale = await BashoodPresaleFinal.deploy(
      await token.getAddress(),
      await nft.getAddress(),
      await referral.getAddress(),
      deployer.address,
      ethers.parseEther("1"),
      ethers.parseEther("2"),
      1700000000,
      1800000000,
      10
    );
    await presale.waitForDeployment();
    // Configure operations wallet and signer using setters
    await presale.connect(deployer).setOperationsWallet(deployer.address);
    await presale.connect(deployer).setSigner(deployer.address);
    await presale.waitForDeployment();
    // Update referral with the real presale address
    await referral.setPresaleContract(await presale.getAddress());
  });

  it("acepta onERC1155Received y onERC1155BatchReceived", async function () {
    // Mint NFT al deployer
    await nft.mint(deployer.address, 1, 1, "0x");
    // Approve y transfer single
    await nft.setApprovalForAll(await presale.getAddress(), true);
    await expect(
      nft.safeTransferFrom(deployer.address, await presale.getAddress(), 1, 1, "0x")
    ).to.not.be.reverted;
    // Batch transfer
    await nft.mint(deployer.address, 2, 2, "0x");
    await expect(
      nft.safeBatchTransferFrom(deployer.address, await presale.getAddress(), [2], [2], "0x")
    ).to.not.be.reverted;
  });

  it("supports IERC1155Receiver interface", async function () {
    const IERC1155ReceiverId = "0x4e2312e0";
    expect(await presale.supportsInterface(IERC1155ReceiverId)).to.equal(true);
  });
});
