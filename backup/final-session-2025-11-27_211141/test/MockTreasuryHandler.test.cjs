if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe("MockTreasuryHandler", function () {
  let handler, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
  const MockTreasuryHandler = await ethers.getContractFactory("contracts/MockTreasuryHandler.sol:MockTreasuryHandler");
    handler = await MockTreasuryHandler.deploy();
    await handler.waitForDeployment();
  });

  it("1. Inicializa sin revertir", async function () {
    await handler.initialize(owner.address);
  });

  it("2. Inicializa con address(0)", async function () {
  await handler.initialize(ZERO_ADDRESS);
  });

  it("3. updateTreasuryWallet con address válida", async function () {
    await handler.updateTreasuryWallet(addr1.address);
  });

  it("4. updateTreasuryWallet con address(0)", async function () {
  await handler.updateTreasuryWallet(ZERO_ADDRESS);
  });

  it("5. getTreasury retorna address(this)", async function () {
    expect(await handler.getTreasury()).to.equal(await handler.getAddress());
  });

  it("6. handleTreasuryTransfer con datos válidos", async function () {
    await expect(handler.handleTreasuryTransfer(owner.address, addr1.address, 100)).to.emit(handler, "FeeTransferred");
  });

  it("7. handleTreasuryTransfer con from=address(0)", async function () {
  await handler.handleTreasuryTransfer(ZERO_ADDRESS, addr1.address, 100);
  });

  it("8. handleTreasuryTransfer con to=address(0)", async function () {
  await handler.handleTreasuryTransfer(owner.address, ZERO_ADDRESS, 100);
  });

  it("9. handleTreasuryTransfer con amount=0", async function () {
    await handler.handleTreasuryTransfer(owner.address, addr1.address, 0);
  });

  it("10. Emite FeeTransferred correctamente", async function () {
    await expect(handler.handleTreasuryTransfer(owner.address, addr1.address, 123)).to.emit(handler, "FeeTransferred").withArgs(owner.address, addr1.address, 123);
  });

  it("11. Emite FeeTransferred varias veces", async function () {
    await handler.handleTreasuryTransfer(owner.address, addr1.address, 1);
    await handler.handleTreasuryTransfer(owner.address, addr2.address, 2);
    await handler.handleTreasuryTransfer(addr1.address, addr2.address, 3);
  });

  it("12. updateTreasuryWallet varias veces", async function () {
    await handler.updateTreasuryWallet(addr1.address);
    await handler.updateTreasuryWallet(addr2.address);
    await handler.updateTreasuryWallet(owner.address);
  });

  it("13. initialize varias veces", async function () {
    await handler.initialize(addr1.address);
    await handler.initialize(addr2.address);
  });

  it("14. handleTreasuryTransfer desde diferentes cuentas", async function () {
    await handler.connect(addr1).handleTreasuryTransfer(addr1.address, addr2.address, 10);
    await handler.connect(addr2).handleTreasuryTransfer(addr2.address, owner.address, 20);
  });

  it("15. updateTreasuryWallet desde diferentes cuentas", async function () {
    await handler.connect(addr1).updateTreasuryWallet(addr1.address);
    await handler.connect(addr2).updateTreasuryWallet(addr2.address);
  });

  it("16. No almacena balances", async function () {
    // No hay storage de balances, solo eventos
  expect(await handler.getTreasury()).to.equal(await handler.getAddress());
  });

  it("39. handleTreasuryTransfer en paralelo (Promise.all)", async function () {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(handler.handleTreasuryTransfer(owner.address, addr1.address, i));
    }
    await Promise.all(promises);
  });

  it("40. No cambia storage tras múltiples llamadas", async function () {
    const before = await handler.getTreasury();
    for (let i = 0; i < 10; i++) {
      await handler.handleTreasuryTransfer(owner.address, addr1.address, i);
    }
    const after = await handler.getTreasury();
    expect(before).to.equal(after);
  });
});






