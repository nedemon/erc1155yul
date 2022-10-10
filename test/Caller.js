const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const fs = require('fs');
const path = require('path');
const hre = require("hardhat");

describe("Caller", function () {

  async function deployOneYearLockFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    //const artifactsDir = path.join(__dirname, '/..', 'artifacts/contracts/Token.yul')
    let ContractArtifact = hre.artifacts.readArtifactSync("Token")
    ContractArtifact.deployedBytecode = ContractArtifact.bytecode;

    fs.writeFileSync(
      path.join('artifacts/contracts/Token.yul', '/', 'Token' + ".json"),
      JSON.stringify(ContractArtifact, null, 2)
    )

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy();
    
    const Caller = await ethers.getContractFactory("Caller1");
    const caller = await Caller.deploy(token.address);

    return { token, caller};
  }

  describe("Simple tests", function () {
    it("Should be deployed", async function () {
      const { token, caller } = await loadFixture(deployOneYearLockFixture);
      expect(caller.address).to.not.be.null;
      expect(token.address).to.not.be.null;
    });
    it("Should have zero balance", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();
      expect(await caller.balanceOf(owner.address, 1)).to.equal(0);
      expect(await caller.balanceOf(otherAccount.address, 1)).to.equal(0);
    });
    it("Should have non-zero balance after minting", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, 10, '0x')
      await tx.wait()
      expect(await caller.balanceOf(owner.address, 2)).to.equal(0);
      expect(await caller.balanceOf(owner.address, 1)).to.equal(10);
    });
    it("Should have non-zero balance after transfer", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, 10, '0x')
      await tx.wait()
      tx = await caller.safeTransferFrom(owner.address, otherAccount.address, 1, 10, '0x')
      await tx.wait()
      expect(await caller.balanceOf(owner.address, 1)).to.equal(0);
      expect(await caller.balanceOf(otherAccount.address, 1)).to.equal(10);
    });
    it("Should have non-zero batch balance", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, 10, '0x')
      await tx.wait()
      tx = await caller.mint(otherAccount.address, 2, 5, '0x')
      await tx.wait()

      expect(await caller.balanceOfBatch([owner.address,otherAccount.address], [1,2]))
      .to.eql([ethers.BigNumber.from(10),ethers.BigNumber.from(5)])
    });
  });
});
