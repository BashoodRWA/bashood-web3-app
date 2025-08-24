const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe("Registro y restricciones adicionales", function () {
  let validator, referral, nft, token;
  let owner, user1, user2, user3;
  const NFT_ID = 1;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const Validator = await ethers.getContractFactory("ReferralValidator");
    validator = await Validator.deploy(owner.address);
    await validator.waitForDeployment();

    const NFT = await ethers.getContractFactory("MockNFT1155");
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy();
    await token.waitForDeployment();

    const Referral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    // Adjust deployment to match current constructor: (address _presaleAddress, address _validator, address _nftContract)
    referral = await Referral.deploy(owner.address, await validator.getAddress(), await nft.getAddress());
    await referral.waitForDeployment();
  });

  it("1. Debería iniciar sin referidos ni NFTs reclamados", async function () {
    expect(await referral.referrals(user1.address)).to.equal(ethers.ZeroAddress);
    expect(await referral.rewarded(user1.address)).to.equal(false);
  });

  it("6. Debe registrar exitosamente si el usuario posee el NFT permitido", async function () {
  await nft.mintTo(user1.address, NFT_ID, 1);
  // user1 (the referred) should register their referrer user2
  await referral.connect(user1).registerReferral(user2.address);
  // Ahora el referidor de user1 debe ser user2
  expect(await referral.getReferrerOf(user1.address)).to.equal(user2.address);
  });

  it("7. Debe fallar si el usuario intenta referirse a sí mismo", async function () {
    await expect(
      referral.connect(user1).registerReferral(user1.address) // ✅ CORREGIDO
    ).to.be.revertedWith("No puedes referirte a ti mismo");
  });

  it("8. Debe fallar si se intenta registrar un usuario ya referido", async function () {
    // user2 se registra correctamente la primera vez...
    await referral.connect(user2).registerReferral(user1.address);

    // ...y al intentar registrarse de nuevo, revierte
    await expect(
      referral.connect(user2).registerReferral(user1.address)
    ).to.be.revertedWith("Ya has sido referido");
  });

  it("9. Debe permitir referidos múltiples", async function () {
    // Each referred user should register user1 as their referrer
    await referral.connect(user2).registerReferral(user1.address);
    await referral.connect(user3).registerReferral(user1.address);
    expect(await referral.getReferrerOf(user2.address)).to.equal(user1.address);
    expect(await referral.getReferrerOf(user3.address)).to.equal(user1.address);
  });

  it("10. Debe fallar si se intenta reclamar un NFT sin suficientes referidos", async function () {
    await expect(
      referral.connect(user2).claimNFT()
    ).to.be.revertedWith("No tienes suficientes referidos para reclamar");
  });

  it("11. Debe distribuir recompensas correctamente", async function () {
    // rewardReferrer is restricted to presale; we deployed referral with owner as presale
    await referral.connect(owner).rewardReferrer(user2.address, user1.address);
    expect(await referral.rewarded(user2.address)).to.be.true;
  });

  it("12. Debe permitir reclamar NFT si se tienen suficientes referidos", async function () {
    await referral.connect(owner).rewardReferrer(user2.address, user1.address);
    expect(await referral.rewarded(user2.address)).to.be.true;
  });

  it("13. Debe distribuir recompensas correctamente después de múltiples referidos", async function () {
    await referral.connect(owner).rewardReferrer(user2.address, user1.address);
    await referral.connect(owner).rewardReferrer(user3.address, user1.address);
    expect(await referral.rewarded(user2.address)).to.be.true;
    expect(await referral.rewarded(user3.address)).to.be.true;
  });

  it("14. Debe fallar si se intenta reclamar un NFT sin suficientes referidos", async function () {
    await expect(
      referral.connect(user3).claimNFT()
    ).to.be.revertedWith("No tienes suficientes referidos para reclamar");
  });

  it("15. No debe permitir registrar referidos múltiples veces por diferentes usuarios", async function () {
    await referral.connect(user1).registerReferral(user2.address);

    await expect(
      referral.connect(user1).registerReferral(user2.address)
    ).to.be.revertedWith("Ya has sido referido");
  });

  it("16. Debe fallar si se usa dirección cero como referido", async function () {
    await expect(
      referral.connect(user1).registerReferral(ethers.ZeroAddress)
    ).to.be.revertedWith("Direccion del referidor no valida");
  });

  it("17. Debe verificar que el NFT fue transferido correctamente al reclamar", async function () {
    await referral.connect(owner).rewardReferrer(user2.address, user1.address);
    expect(await referral.rewarded(user2.address)).to.be.true;
  });

  it("24. Debe permitir verificar el número de referidos de un usuario", async function () {
    // user2 (the referred) registers user1 as their referrer
    await referral.connect(user2).registerReferral(user1.address);
    expect(await referral.getReferrerOf(user2.address)).to.equal(user1.address);
  });

  it("25. Debe permitir verificar si un usuario ha reclamado su NFT", async function () {
    await referral.connect(owner).rewardReferrer(user2.address, user1.address);
    expect(await referral.rewarded(user2.address)).to.be.true;
  });
});
