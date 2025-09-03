if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodPresaleFinal IERC1155Receiver", function () {
  let presale, deployer, user, nft;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
  // Mock NFT (ERC1155)
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  nft = await MockNFT.deploy();
    await nft.waitForDeployment();
    // Mock ERC20
  const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const token = await MockERC20.deploy();
    await token.waitForDeployment();
    // Mock BashoodReferral
    const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    // constructor: (address _presaleAddress, address _validator, address _nftContract)
    // deploy a referral with placeholder presale/validator (deployer) and correct NFT address, then set real presale address below
    const referral = await BashoodReferral.deploy(deployer.address, deployer.address, await nft.getAddress());
    await referral.waitForDeployment();
    // Deploy BashoodPresaleFinal con mocks válidos (use manual-deploy to avoid deploy issues)
  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const deployTx = BashoodPresaleFinal.getDeployTransaction(
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
  if (!deployTx || !deployTx.data || deployTx.data.length <= 2) {
    // fallback to Factory.deploy
    const instance = await BashoodPresaleFinal.deploy(
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
    await instance.waitForDeployment();
    presale = instance;
  } else {
    const sent = await deployer.sendTransaction({ to: undefined, data: deployTx.data });
    const receipt = await sent.wait();
    presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);
  }
    // Configure operations wallet and signer using setters
    await presale.connect(deployer).setOperationsWallet(deployer.address);
    await presale.connect(deployer).setSigner(deployer.address);
    await presale.waitForDeployment();
    // Update referral with the real presale address
    await referral.setPresaleContract(await presale.getAddress());
  });

  it("acepta onERC1155Received y onERC1155BatchReceived", async function () {
    // Mint NFT al deployer
  await nft.mint(deployer.address, 1, 1);
    // Approve y transfer single
    await nft.setApprovalForAll(await presale.getAddress(), true);
    await expect(
      nft.safeTransferFrom(deployer.address, await presale.getAddress(), 1, 1, "0x")
    ).to.not.be.reverted;
    // Batch transfer
  await nft.mint(deployer.address, 2, 2);
    await expect(
      nft.safeBatchTransferFrom(deployer.address, await presale.getAddress(), [2], [2], "0x")
    ).to.not.be.reverted;
  });

  it("supports IERC1155Receiver interface", async function () {
    const IERC1155ReceiverId = "0x4e2312e0";
    expect(await presale.supportsInterface(IERC1155ReceiverId)).to.equal(true);
  });
});
