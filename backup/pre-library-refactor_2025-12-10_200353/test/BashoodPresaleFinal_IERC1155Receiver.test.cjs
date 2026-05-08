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
    // Use test helper to deploy presale with the mocks we've created above
    const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
    const { deployPresale } = getPresaleHelpers();
    const helpers = await deployPresale({ bhtAddr: await token.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: deployer.address });
    presale = helpers.presale;
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






