if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const { ethers, upgrades } = require('hardhat');

// Local helpers to avoid depending on ethers.utils/constants in coverage runtime
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
function parseUnitsDecimal(input, decimals = 18) {
  // supports integers and decimals like '1', '0.5', '100'
  const parts = String(input).split('.');
  const whole = BigInt(parts[0] || '0');
  const frac = parts[1] || '';
  if (frac.length > decimals) throw new Error('Too many decimal places');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return (whole * 10n ** BigInt(decimals) + BigInt(fracPadded || '0')).toString();
}

describe('Coverage extras', function () {
  let owner, alice, bob, ownerAddr, aliceAddr, bobAddr;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    aliceAddr = await alice.getAddress();
    bobAddr = await bob.getAddress();
  });


  it('BashoodToken: transfer, fee, burn, donate, burn and treasury/staking flows', async function () {
  console.log('DBG addrs', { ownerAddr, aliceAddr, bobAddr });
    console.log('STEP: deploy MockBHT');
  const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
  const mock = await MockBHT.deploy();
  await mock.waitForDeployment();

    console.log('STEP: deploy BashoodToken');
    const BashoodToken = await ethers.getContractFactory('BashoodToken');
  const bht = await BashoodToken.deploy(ownerAddr);
  await bht.waitForDeployment();
    const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;

    // owner has initial supply
    const ownerBal = await bht.balanceOf(owner.address);
    expect(ownerBal).to.be.gt(0);

    // transfer with amount that results in non-zero send amount
  console.log('STEP: before transfers');
  await bht.connect(owner).transfer(alice.address, parseUnitsDecimal('100', 18));
  await bht.connect(owner).transfer(aliceAddr, parseUnitsDecimal('100', 18));
    const aBal = await bht.balanceOf(alice.address);
    expect(aBal).to.be.gt(0);

    // approve + transferFrom
  console.log('STEP: before approve/transferFrom');
  await bht.connect(alice).approve(bob.address, parseUnitsDecimal('10', 18));
  await bht.connect(alice).approve(bobAddr, parseUnitsDecimal('10', 18));
  await bht.connect(bob).transferFrom(aliceAddr, bobAddr, parseUnitsDecimal('5', 18));
    expect(await bht.balanceOf(bob.address)).to.be.gt(0);

    // donate - transfer tokens to contract
  console.log('STEP: before donate');
  try {
    await bht.connect(owner).transfer(alice.address, parseUnitsDecimal('50', 18));
    console.log('OK: transfer to alice.address');
  } catch (err) { console.error('ERR: transfer to alice.address', err); throw err }
  try {
    await bht.connect(owner).transfer(aliceAddr, parseUnitsDecimal('50', 18));
    console.log('OK: transfer to aliceAddr');
  } catch (err) { console.error('ERR: transfer to aliceAddr', err); throw err }
  try {
    const bhtAddrForApprove = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
    console.log('DEBUG: bht address for approve', bhtAddrForApprove);
    await bht.connect(alice).approve(bhtAddrForApprove, parseUnitsDecimal('20', 18));
    console.log('OK: approve bht.address');
  } catch (err) { console.error('ERR: approve bht.address', err); throw err }
  try {
    await bht.connect(alice).donate(parseUnitsDecimal('20', 18));
    console.log('OK: donate');
  } catch (err) { console.error('ERR: donate', err); throw err }
  expect((await bht.totalDonated()).toString()).to.equal(parseUnitsDecimal('20', 18));

    // burn by user
  console.log('STEP: before burn');
  await bht.connect(owner).burn(parseUnitsDecimal('1', 18));
  // totalBurned should not be zero after burning
  expect((await bht.totalBurned()).toString()).to.not.equal('0');

    // periodicBurn requires owner and enough balance
  console.log('STEP: before periodicBurn');
  await bht.connect(owner).transfer(bhtAddr, parseUnitsDecimal('100', 18));
  await bht.connect(owner).periodicBurn(parseUnitsDecimal('10', 18));
  // after periodic burn the totalBurned should be greater than zero
  expect((await bht.totalBurned()).toString()).to.not.equal('0');

    // sendToTreasury and sendToStaking reverts when staking not set
    await expect(bht.connect(owner).sendToStaking(1)).to.be.revertedWith('Staking contract not set');

    // set staking contract and send
  console.log('STEP: before setStakingContract/sendToStaking');
  await bht.connect(owner).setStakingContract(owner.address);
  await bht.connect(owner).setStakingContract(ownerAddr);
  await bht.connect(owner).transfer(bhtAddr, parseUnitsDecimal('10', 18));
  await bht.connect(owner).sendToStaking(parseUnitsDecimal('5', 18));
    expect(await bht.balanceOf(owner.address)).to.be.gt(0);

    // invalid setters
  await expect(bht.connect(owner).setTreasuryWallet(ZERO_ADDRESS)).to.be.revertedWith('Invalid address');
  await expect(bht.connect(owner).setTreasuryWallet(ZERO_ADDRESS)).to.be.revertedWith('Invalid address');
  await expect(bht.connect(owner).setStakingContract(ZERO_ADDRESS)).to.be.revertedWith('Invalid address');
  });

  it('MockBHT and MockRescue basic behaviors', async function () {
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
  const m = await MockBHT.deploy();
  await m.waitForDeployment();
    await m.mint(alice.address, 1000);
  expect((await m.balanceOf(alice.address)).toString()).to.equal('1000');

  const MockRescue = await ethers.getContractFactory('contracts/mocks/MockRescue.sol:MockRescue');
  const r = await MockRescue.deploy();
  await r.waitForDeployment();
    expect(await r.ping()).to.equal(true);
  });

  it('TaxHandler: initialize, updates and calculateTax', async function () {
    const TaxHandler = await ethers.getContractFactory('TaxHandler');
  const tax = await upgrades.deployProxy(TaxHandler, [owner.address, 10], { initializer: 'initialize' });

    expect(await tax.getReceiver()).to.equal(owner.address);
  expect((await tax.calculateTax(100)).toString()).to.equal('10');

  await tax.updateTaxRate(5);
  expect((await tax.calculateTax(200)).toString()).to.equal('10');

  await tax.updateTaxReceiver(alice.address);
  expect(await tax.getReceiver()).to.equal(alice.address);

    // invalid rate revert
  await expect(tax.updateTaxRate(200)).to.be.reverted;
  await expect(tax.updateTaxReceiver(ZERO_ADDRESS)).to.be.reverted;
  });

  it('BashoodMultiToken: minting, buyTokens, withdrawFunds', async function () {
    const T = await ethers.getContractFactory('BashoodMultiToken');
  const m = await T.deploy(owner.address);
  await m.waitForDeployment();

    // mint by minter
    await m.connect(owner).mint(alice.address, 1, 1, '0x');
  await m.mint(aliceAddr, 1, 1, '0x');
  const bal = await m.balanceOf(aliceAddr, 1);
  console.log('DBG mint balance', bal.toString());
  expect(bal.toNumber ? bal.toNumber() : parseInt(bal.toString())).to.be.gte(1);

    // buyTokens require msg.value > 0
  await expect(m.connect(bob).buyTokens({ value: 0 })).to.be.revertedWith('Debe enviar ETH');
  await expect(m.connect(bob).buyTokens({ value: 0 })).to.be.revertedWith('Debe enviar ETH');

    // buy with value
  try {
    await m.connect(bob).buyTokens({ value: parseUnitsDecimal('1', 18) });
    await m.connect(bob).buyTokens({ value: parseUnitsDecimal('1', 18) });
    console.log('OK: two buyTokens');
  } catch (err) { console.error('ERR: buyTokens', err); throw err }
  // two buys of 1 ETH were executed above; totalRaised should be 2 ETH
  expect((await m.totalRaised()).toString()).to.equal(parseUnitsDecimal('2', 18));

    // withdraw funds - transfer contract balance to owner
    // simulate sending ETH to contract
  try {
    const mAddr = (typeof m.getAddress === 'function') ? await m.getAddress() : m.address;
    console.log('DEBUG: m.address', mAddr, 'owner.address', owner.address);
    // use buyTokens to increase contract balance (contract does not implement receive())
    await m.connect(owner).buyTokens({ value: parseUnitsDecimal('0.5', 18) });
    await m.connect(owner).buyTokens({ value: parseUnitsDecimal('0.5', 18) });
    console.log('OK: owner bought tokens twice to fund contract');
  } catch (err) { console.error('ERR: owner.buyTokens', err); throw err }
    await m.connect(owner).withdrawFunds();
  });
});

// helper: upgrades plugin is used for TaxHandler proxy deployment. Tests exercise both happy and failure paths.
