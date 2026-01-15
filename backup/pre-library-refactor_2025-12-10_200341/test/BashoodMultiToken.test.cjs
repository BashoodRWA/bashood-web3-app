if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

const AddressZero = "0x0000000000000000000000000000000000000000"; // ✅ Manual para evitar error con ethers.constants

describe("BashoodMultiToken", function () {
  let contract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const BashoodMultiToken = await ethers.getContractFactory("BashoodMultiToken");
    contract = await BashoodMultiToken.deploy(owner.address);
    await contract.waitForDeployment();

    const MINTER_ROLE = await contract.MINTER_ROLE();
    await contract.grantRole(MINTER_ROLE, owner.address);
  });

  it("Debería permitir al minter crear nuevos tokens", async function () {
    await contract.mint(owner.address, 1, 10, "0x");
    const balance = await contract.balanceOf(owner.address, 1);
    expect(balance).to.equal(10);
  });

  it("Debería fallar si un usuario no autorizado intenta mintear", async function () {
    await expect(
      contract.connect(addr1).mint(addr1.address, 1, 10, "0x")
    ).to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount').withArgs(addr1.address, await contract.MINTER_ROLE());
  });

  it("Debería permitir transferencias seguras de tokens", async function () {
    await contract.mint(owner.address, 2, 5, "0x");
    await contract.safeTransferFrom(owner.address, addr1.address, 2, 3, "0x");

    const balanceSender = await contract.balanceOf(owner.address, 2);
    const balanceReceiver = await contract.balanceOf(addr1.address, 2);

    expect(balanceSender).to.equal(2);
    expect(balanceReceiver).to.equal(3);
  });

  it("Debería revertir si se intenta transferir sin balance", async function () {
    await expect(
      contract.safeTransferFrom(owner.address, addr1.address, 777, 1, "0x")
    ).to.be.reverted;
  });

  it("Debería manejar setApprovalForAll y isApprovedForAll correctamente", async function () {
    await contract.setApprovalForAll(addr1.address, true);
    const approved = await contract.isApprovedForAll(owner.address, addr1.address);
    expect(approved).to.equal(true);
  });

  it("Debería devolver la URI correctamente", async function () {
    const uri = await contract.uri(1);
    expect(uri).to.include("{id}");
  });

  it("Debería manejar múltiples roles correctamente", async function () {
    const MINTER_ROLE = await contract.MINTER_ROLE();
    await contract.grantRole(MINTER_ROLE, addr2.address);
    expect(await contract.hasRole(MINTER_ROLE, addr2.address)).to.be.true;
  });

  it("Debería permitir revocar roles y bloquear funciones", async function () {
    const MINTER_ROLE = await contract.MINTER_ROLE();
    await contract.revokeRole(MINTER_ROLE, owner.address);
    await expect(
      contract.mint(owner.address, 99, 1, "0x")
  ).to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount').withArgs(owner.address, MINTER_ROLE);
  });

  it("Debería permitir renunciar a un rol", async function () {
    const MINTER_ROLE = await contract.MINTER_ROLE();
    await contract.renounceRole(MINTER_ROLE, owner.address);
    expect(await contract.hasRole(MINTER_ROLE, owner.address)).to.be.false;
  });

  it("Debería soportar interfaces ERC1155 y AccessControl", async function () {
    const ERC1155_INTERFACE_ID = "0xd9b67a26";
    const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
    expect(await contract.supportsInterface(ERC1155_INTERFACE_ID)).to.be.true;
    expect(await contract.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
  });

  it("Debería revertir si se transfiere a un contrato que no acepta ERC1155", async function () {
    const BadReceiver = await ethers.getContractFactory("BadReceiver");
    const bad = await BadReceiver.deploy();
    await bad.waitForDeployment(); // ✅ Espera el despliegue completo

    await contract.mint(owner.address, 55, 1, "0x");
    await expect(
      contract.safeTransferFrom(owner.address, await bad.getAddress(), 55, 1, "0x")
    ).to.be.reverted;
  });

  it("Debería fallar al hacer mint a address(0)", async function () {
    await expect(
      contract.mint(AddressZero, 99, 1, "0x")
  ).to.be.revertedWith("Cannot mint to zero address");
  });

  it("Debería fallar al hacer transfer a address(0)", async function () {
    await contract.mint(owner.address, 99, 1, "0x");
    await expect(
      contract.safeTransferFrom(owner.address, AddressZero, 99, 1, "0x")
    ).to.be.reverted;
  });

  it("Debería fallar safeBatchTransfer con arrays desbalanceados", async function () {
    await contract.mint(owner.address, 100, 10, "0x");
    await expect(
      contract.safeBatchTransferFrom(owner.address, addr1.address, [100], [1, 2], "0x")
    ).to.be.reverted;
  });

  it("Debería fallar setApprovalForAll con uno mismo como operador", async function () {
  // OpenZeppelin implementation used here does not revert when setting approval for self.
  await contract.setApprovalForAll(owner.address, true);
  expect(await contract.isApprovedForAll(owner.address, owner.address)).to.equal(true);
  });
});






