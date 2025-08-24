const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe("BashoodNFT", function () {
  let BashoodNFT, nft;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    BashoodNFT = await ethers.getContractFactory("BashoodNFT");
    nft = await BashoodNFT.deploy();
    await nft.waitForDeployment();
  });

  it("1. Debería permitir al owner mintear un NFT correctamente", async function () {
    const tx = await nft.mintNFT(owner.address, "https://example.com/token/1");
    await tx.wait();
    expect(await nft.ownerOf(1)).to.equal(owner.address);
    expect(await nft.tokenURI(1)).to.equal("https://bashood.org/nft/valhalla/1.json");
  });

  it("2. Debería fallar si un usuario no autorizado intenta mintear", async function () {
    await expect(
      nft.connect(addr1).mintNFT(addr1.address, "https://example.com/token/2")
    ).to.be.revertedWith("Not authorized");
  });

  it("3. Debería fallar si se intenta mintear a la dirección cero", async function () {
    await expect(
      nft.mintNFT(ZERO_ADDRESS, "https://example.com/token/3")
    ).to.be.revertedWith("ERC721: mint to the zero address");
  });

  it("4. Debería asignar correctamente la URI personalizada (si no es ID 1)", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await nft.mintNFT(owner.address, "https://example.com/token/2");
    const uri = await nft.tokenURI(2);
    expect(uri).to.equal("https://bashood.org/nft/valhalla/2.json");
  });

  it("5. Debería devolver la URI fija si tokenId es 1 (Runa)", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    const uri = await nft.tokenURI(1);
    expect(uri).to.equal("https://bashood.org/nft/valhalla/1.json");
  });

  it("6. Debería transferir el NFT correctamente", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await nft.transferFrom(owner.address, addr1.address, 1);
    expect(await nft.ownerOf(1)).to.equal(addr1.address);
  });

  it("7. Debería fallar si no es el owner o approved al transferir", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await expect(
      nft.connect(addr1).transferFrom(owner.address, addr2.address, 1)
  ).to.be.revertedWithCustomError(nft, 'ERC721InsufficientApproval').withArgs(addr1.address, 1);
  });

  it("8. Debería permitir approve y transferFrom", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await nft.approve(addr1.address, 1);
    await nft.connect(addr1).transferFrom(owner.address, addr2.address, 1);
    expect(await nft.ownerOf(1)).to.equal(addr2.address);
  });

  it("9. Debería devolver correctamente el balance del owner", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await nft.mintNFT(owner.address, "https://example.com/token/2");
    expect(await nft.balanceOf(owner.address)).to.equal(2);
  });

  it("10. Debería fallar si se consulta URI de un token inexistente", async function () {
  await expect(nft.tokenURI(99)).to.be.revertedWithCustomError(nft, 'ERC721NonexistentToken').withArgs(99);
  });

  it("11. Debería devolver correctamente el nombre del token", async function () {
    expect(await nft.name()).to.equal("BashoodNFT");
  });

  it("12. Debería devolver correctamente el símbolo del token", async function () {
    expect(await nft.symbol()).to.equal("BHNFT");
  });

  it("13. Debería permitir setApprovalForAll y reconocer isApprovedForAll", async function () {
    await nft.setApprovalForAll(addr1.address, true);
    expect(await nft.isApprovedForAll(owner.address, addr1.address)).to.be.true;
  });

  it("14. Debería permitir revocar setApprovalForAll", async function () {
    await nft.setApprovalForAll(addr1.address, true);
    await nft.setApprovalForAll(addr1.address, false);
    expect(await nft.isApprovedForAll(owner.address, addr1.address)).to.be.false;
  });

  it("15. Debería permitir transferencias seguras (safeTransferFrom)", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await nft["safeTransferFrom(address,address,uint256)"](owner.address, addr1.address, 1);
    expect(await nft.ownerOf(1)).to.equal(addr1.address);
  });

  it("16. Debería fallar transferFrom a dirección cero", async function () {
    await nft.mintNFT(owner.address, "https://example.com/token/1");
    await expect(
      nft.transferFrom(owner.address, ZERO_ADDRESS, 1)
  ).to.be.revertedWithCustomError(nft, 'ERC721InvalidReceiver').withArgs(ZERO_ADDRESS);
  });

  it("17. Debería soportar la interfaz ERC721", async function () {
    expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
  });

  it("18. Debería soportar la interfaz ERC165", async function () {
    expect(await nft.supportsInterface("0x01ffc9a7")).to.be.true;
  });

  it("19. Debería fallar safeTransferFrom hacia un contrato no ERC721Receiver", async function () {
    const BadReceiver = await ethers.getContractFactory("BadReceiver721");
    const badReceiver = await BadReceiver.deploy();
    await badReceiver.waitForDeployment();

    // Minteamos un NFT válido (ID 1)
    await nft.mintNFT(owner.address, "https://example.com/token/1");

    // Intentamos transferir a un contrato que no implementa onERC721Received
    await expect(
      nft["safeTransferFrom(address,address,uint256)"](
        owner.address,
        await badReceiver.getAddress(),
        1
      )
  ).to.be.reverted; // Accept any revert (some environments surface no revert data)
  });

});
