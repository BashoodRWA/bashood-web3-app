const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Coverage fillers: small mocks and helpers', function () {
  it('ChainlinkPriceFeed: success and failure paths', async function () {
    const [deployer] = await ethers.getSigners();

  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    const mock = await MockPrice.deploy(8, 1000);
    await mock.waitForDeployment();

  const CPF = await ethers.getContractFactory('contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed');
  const feed = await CPF.deploy(await mock.getAddress());
    await feed.waitForDeployment();

  // happy path: call as static/read-only and decode return data
  const iface = CPF.interface;
  const data = iface.encodeFunctionData('getLatestPrice', []);
  const callRes = await ethers.provider.call({ to: await feed.getAddress(), data });
  const res = iface.decodeFunctionResult('getLatestPrice', callRes);
  expect(res[0].toString()).to.equal('1000');

  // invalid answer (<=0)
  await mock.setAnswer(0);
  await expect(feed.getLatestPrice()).to.be.reverted;

  // answeredInRound == 0
  await mock.setAnswer(123);
  await mock.setAnsweredInRound(0);
  await expect(feed.getLatestPrice()).to.be.reverted;

  // stale (updatedAt == 0)
  await mock.setAnswerWithTimestamp(500, 0);
  await expect(feed.getLatestPrice()).to.be.reverted;
  });

  it('OwnableLocal: transfer ownership and restrictions', async function () {
    const [deployer, other] = await ethers.getSigners();
    const OL = await ethers.getContractFactory('OwnableLocal');
    const ol = await OL.deploy();
    await ol.waitForDeployment();

    expect(await ol.owner()).to.equal(await deployer.getAddress());

    // transfer ownership
    await ol.transferOwnership(await other.getAddress());
    expect(await ol.owner()).to.equal(await other.getAddress());

    // cannot transfer to zero address
    await expect(ol.connect(other).transferOwnership('0x0000000000000000000000000000000000000000')).to.be.revertedWith(
      'Owner cannot be zero address'
    );
  });

  it('Mock tokens: mint and balances', async function () {
    const [deployer, alice] = await ethers.getSigners();
  const MockERC = await ethers.getContractFactory('contracts/mocks/MockERC20.sol:MockERC20');
    const token = await MockERC.deploy();
    await token.waitForDeployment();

    await token.mint(await alice.getAddress(), 1000);
    expect((await token.balanceOf(await alice.getAddress())).toString()).to.equal('1000');

  const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy();
    await bht.waitForDeployment();
    await bht.mint(await alice.getAddress(), 500);
    expect((await bht.balanceOf(await alice.getAddress())).toString()).to.equal('500');
  });

  it('TokenWrapperERC20: wrap and unwrap happy path', async function () {
    const [deployer, alice] = await ethers.getSigners();

    // deploy legacy token and mint
  const MockERC = await ethers.getContractFactory('contracts/mocks/MockERC20.sol:MockERC20');
  const legacy = await MockERC.deploy();
    await legacy.waitForDeployment();
    await legacy.mint(await alice.getAddress(), 1000);

    // deploy registry and set a trivial root equal to leaf so proof=[] is valid
  const Registry = await ethers.getContractFactory('ComplianceRegistry');
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const leaf = ethers.keccak256(ethers.toUtf8Bytes('leaf')); // bytes32
    // set root for issuer = deployer
    await registry.setRoot(await deployer.getAddress(), leaf, 0);

    // deploy wrapper
  const Wrapper = await ethers.getContractFactory('TokenWrapperERC20');
  const wrapper = await Wrapper.deploy(await legacy.getAddress(), await registry.getAddress(), await deployer.getAddress(), 'Wrap', 'W');
    await wrapper.waitForDeployment();

    // approve and wrap from alice
    await legacy.connect(alice).approve(await wrapper.getAddress(), 200);
    await wrapper.connect(alice).wrap(200, leaf, []);
    expect((await wrapper.balanceOf(await alice.getAddress())).toString()).to.equal('200');

    // unwrap
    await wrapper.connect(alice).unwrap(200);
    expect((await legacy.balanceOf(await alice.getAddress())).toString()).to.equal('1000');
  });

  it('MockPresale delegates to rescue', async function () {
    const [deployer] = await ethers.getSigners();
  const MockPresale = await ethers.getContractFactory('contracts/MockPresale.sol:MockPresale');
  const presale = await MockPresale.deploy();
    await presale.waitForDeployment();

    // create a tiny mock rescue that simply records calls
  const MockRescue = await ethers.getContractFactory('contracts/mocks/MockRescueRecorder.sol:MockRescueRecorder');
  const rescue = await MockRescue.deploy();
    await rescue.waitForDeployment();

    await presale.setRescueContract(await rescue.getAddress());

  // call delegators (no revert expected)
  await presale.delegateRescueUnsoldNfts('0x0000000000000000000000000000000000000001', 1, await deployer.getAddress(), 1);
  await presale.delegateRescueErc20('0x0000000000000000000000000000000000000002', await deployer.getAddress(), 1);
  await presale.delegateEmergencyWithdrawEth(await deployer.getAddress());

  // verify mock rescue recorded calls
  expect((await rescue.calls()).toString()).to.equal('3');
  });
});






