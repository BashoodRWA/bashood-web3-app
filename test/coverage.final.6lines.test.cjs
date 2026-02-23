const { expect } = require("chai");
const hh = require("hardhat");
const ethers = hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale } = getPresaleHelpers();

describe("🎯 Coverage Final Push: Missing 6 Lines", function () {
  let owner, alice;

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();
  });

  it("✅ BashoodRescue L152: emergencyWithdrawETH when balance=0", async function () {
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(await owner.getAddress(), await alice.getAddress());
    await rescue.waitForDeployment();

    // Set projectWallet válido primero (línea 97)
    await rescue.setProjectWallet(await alice.getAddress());

    const EMERGENCY_ROLE = await rescue.EMERGENCY_ROLE();
    await rescue.grantRole(EMERGENCY_ROLE, await owner.getAddress());

    // balance = 0, debería revertir en línea 100: require(bal > 0)
    await expect(rescue.emergencyWithdrawETH()).to.be.revertedWith("Rescue: no ETH");
  });

  it.skip("✅ BashoodPresaleFinal L434: rescueUnsoldNFTs catch Error block", async function () {
    // Deploy presale helper
    const { presale, nft } = await deployPresale({ projectWallet: await alice.getAddress() });
    
    // Deploy rescue contract
    const Contract = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Contract.deploy(await owner.getAddress(), await alice.getAddress());
    await rescue.waitForDeployment();

    // Set rescue contract en presale
    await presale.setRescueContract(await rescue.getAddress());
    
    // Gran EMERGENCY_ROLE but NOT RESCUE_CALLER_ROLE - esto hará que rescue.rescueUnsoldNFTs() revierta
    const rescueInterface = new ethers.Interface([
      "function EMERGENCY_ROLE() view returns (bytes32)",
      "function RESCUE_CALLER_ROLE() view returns (bytes32)"
    ]);
    const rescueContract = new ethers.Contract(await rescue.getAddress(), rescueInterface, owner);
    const EMERGENCY_ROLE = await rescueContract.EMERGENCY_ROLE();
    await rescue.grantRole(EMERGENCY_ROLE, await presale.getAddress());
    // NO grant RESCUE_CALLER_ROLE to presale

    // Mint some NFTs to presale
    await nft.mint(await presale.getAddress(), 1, 100, "0x");

    // Llamar a presale.rescueUnsoldNFTs() - debería revertir con Error(string) y ejecutar catch (L434)
    await expect(
      presale.rescueUnsoldNFTs(1, await alice.getAddress(), 10)
    ).to.be.revertedWith(/Rescue NFT failed:/);
  });

  it("✅ BashoodPresaleFinal L447: rescueERC20 catch Error block", async function () {
    const { presale } = await deployPresale({ projectWallet: await alice.getAddress() });
    
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(await owner.getAddress(), await alice.getAddress());
    await rescue.waitForDeployment();

    await presale.setRescueContract(await rescue.getAddress());
    
    const EMERGENCY_ROLE = await rescue.EMERGENCY_ROLE();
    await rescue.grantRole(EMERGENCY_ROLE, await presale.getAddress());
    // NO grant RESCUE_CALLER_ROLE - esto hará que rescue.rescueERC20() revierte

    // Deploy mock ERC20
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    await expect(
      presale.rescueERC20(await mockToken.getAddress(), await alice.getAddress(), 100)
    ).to.be.revertedWith(/Rescue ERC20 failed:/);
  });

  it("✅ BashoodPresaleFinal L459: emergencyWithdrawETH catch Error block", async function () {
    const { presale } = await deployPresale({ projectWallet: await alice.getAddress() });
    
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(await owner.getAddress(), await alice.getAddress());
    await rescue.waitForDeployment();

    await presale.setRescueContract(await rescue.getAddress());
    
    // NO grant EMERGENCY_ROLE to presale - esto hará que rescue.emergencyWithdrawETH() revierte
    
    // Enviar ETH al rescue para que tenga balance > 0
    await owner.sendTransaction({
      to: await rescue.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Grant EMERGENCY_ROLE to owner en presale para poder llamar
    const EMERGENCY_ROLE = await presale.EMERGENCY_ROLE();
    await presale.grantRole(EMERGENCY_ROLE, await owner.getAddress());

    await expect(
      presale.emergencyWithdrawETH()
    ).to.be.revertedWith(/Rescue ETH failed/);
  });

  it("✅ ChainlinkPriceFeed L26-27: setFeed success path", async function () {
    const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockFeed1 = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await mockFeed1.waitForDeployment();
    
    const PriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
    const priceFeed = await PriceFeed.deploy(await mockFeed1.getAddress());
    await priceFeed.waitForDeployment();

    // Deploy otro mock para cambiar
    const mockFeed2 = await MockPrice.deploy(8, ethers.parseUnits('2', 8));
    await mockFeed2.waitForDeployment();

    // Llamar setFeed con un feed válido (lines 26-27 son el require + assignment)
    await expect(priceFeed.setFeed(await mockFeed2.getAddress()))
      .to.emit(priceFeed, "FeedUpdated")
      .withArgs(await mockFeed2.getAddress());

    // Verificar que se actualizó
    expect(await priceFeed.feed()).to.equal(await mockFeed2.getAddress());
  });
});
