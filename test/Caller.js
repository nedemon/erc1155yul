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
  const firstTokenId = hre.ethers.BigNumber.from(1);
  const secondTokenId = hre.ethers.BigNumber.from(2);
  const unknownTokenId = hre.ethers.BigNumber.from(3);

  const firstAmount = hre.ethers.BigNumber.from(1000);
  const secondAmount = hre.ethers.BigNumber.from(2000);

  const RECEIVER_SINGLE_MAGIC_VALUE = '0xf23a6e61';
  const RECEIVER_BATCH_MAGIC_VALUE = '0xbc197c81';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const TEN = hre.ethers.BigNumber.from(10)

  async function deployOneYearLockFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
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
  
  describe("like an ERC1155", function () {
    
    it("Should have zero balance", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();
      await expect(caller.balanceOf(ZERO_ADDRESS, 1)).to.be.reverted;
      expect(await caller.balanceOf(otherAccount.address, 1)).to.equal(0);
    });

    context('when accounts don\'t own tokens', function () {
      it('returns zero for given addresses', async function () {
        const { caller } = await loadFixture(deployOneYearLockFixture);
        const [owner, firstTokenHolder, secondTokenHolder] = await ethers.getSigners();
        expect(await caller.balanceOf(
          firstTokenHolder.address,
          firstTokenId,
        )).to.equal(0);

        expect(await caller.balanceOf(
          secondTokenHolder.address,
          secondTokenId,
        )).to.equal(0);

        expect(await caller.balanceOf(
          firstTokenHolder.address,
          unknownTokenId,
        )).to.equal(0);
      });
    });
    
    context('when accounts own some tokens', function () {
      it('returns the amount of tokens owned by the given addresses', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [owner, firstTokenHolder, secondTokenHolder] = await ethers.getSigners();
        let tx = await caller.mint(firstTokenHolder.address, firstTokenId, firstAmount, '0x', {
          from: owner.address,
        });
        await tx.wait();
        tx = await caller.mint(
          secondTokenHolder.address,
          secondTokenId,
          secondAmount,
          '0x',
          {
            from: owner.address,
          },
        );
        await tx.wait();
        expect(await caller.balanceOf(
          firstTokenHolder.address,
          firstTokenId,
        )).to.equal(firstAmount);

        expect(await caller.balanceOf(
          secondTokenHolder.address,
          secondTokenId,
        )).to.equal(secondAmount);

        expect(await caller.balanceOf(
          firstTokenHolder.address,
          unknownTokenId,
        )).to.equal(0);
      });
    });

    describe('balanceOfBatch', function () {
      it('reverts when input arrays don\'t match up', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [owner, {address: firstTokenHolder}, {address: secondTokenHolder}] = await ethers.getSigners();

        await expect(
          caller.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, firstTokenHolder, secondTokenHolder],
            [firstTokenId, secondTokenId, unknownTokenId],
          ),
          'ERC1155: accounts and ids length mismatch',
        ).to.be.reverted;

        await expect(
          caller.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder],
            [firstTokenId, secondTokenId, unknownTokenId],
          ),
          'ERC1155: accounts and ids length mismatch',
        ).to.be.reverted;
      });

      it('reverts when one of the addresses is the zero address', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [owner, {address: firstTokenHolder}, {address: secondTokenHolder}] = await ethers.getSigners();
        
        await expect(
          caller.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, ZERO_ADDRESS],
            [firstTokenId, secondTokenId, unknownTokenId],
          ),
          'ERC1155: address zero is not a valid owner',
        ).to.be.reverted;
      });

      context('when accounts don\'t own tokens', function () {
        it('returns zeros for each account', async function () {
          let { caller } = await loadFixture(deployOneYearLockFixture);
          const [owner, {address: firstTokenHolder}, {address: secondTokenHolder}] = await ethers.getSigners();

          const result = await caller.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, firstTokenHolder],
            [firstTokenId, secondTokenId, unknownTokenId],
          );
          expect(result).to.be.an('array');
          expect(result[0]).to.equal('0');
          expect(result[1]).to.equal('0');
          expect(result[2]).to.equal('0');
        });
      });

      context('when accounts own some tokens', function () {
        it('returns amounts owned by each account in order passed', async function () {
          let { caller } = await loadFixture(deployOneYearLockFixture);
          const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder}] = await ethers.getSigners();
          
          await caller.mint(firstTokenHolder, firstTokenId, firstAmount, '0x', {
            from: minter,
          });
          await caller.mint(
            secondTokenHolder,
            secondTokenId,
            secondAmount,
            '0x',
            {
              from: minter,
            },
          );
          const result = await caller.balanceOfBatch(
            [secondTokenHolder, firstTokenHolder, firstTokenHolder],
            [secondTokenId, firstTokenId, unknownTokenId],
          );
          expect(result).to.be.an('array');
          expect(result[0]).to.equal(secondAmount);
          expect(result[1]).to.equal(firstAmount);
          expect(result[2]).to.equal('0');
        });

        it('returns multiple times the balance of the same address when asked', async function () {
          let { caller } = await loadFixture(deployOneYearLockFixture);
          const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder}] = await ethers.getSigners();

          await caller.mint(firstTokenHolder, firstTokenId, firstAmount, '0x', {
            from: minter,
          });
          await caller.mint(
            secondTokenHolder,
            secondTokenId,
            secondAmount,
            '0x',
            {
              from: minter,
            },
          );

          const result = await caller.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, firstTokenHolder],
            [firstTokenId, secondTokenId, firstTokenId],
          );
          expect(result).to.be.an('array');
          expect(result[0]).to.equal(result[2]);
          expect(result[0]).to.equal(firstAmount);
          expect(result[1]).to.equal(secondAmount);
          expect(result[2]).to.equal(firstAmount);
        });
      });
    });

    describe('setApprovalForAll', function () {
      it('sets approval status which can be queried via isApprovedForAll', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder},
          {address: multiTokenHolder}, {address: recipient}, {address: proxy}] = await ethers.getSigners();

        let receipt = caller.setApprovalForAll(proxy, true);
        expect(await caller.isApprovedForAll(caller.address, proxy)).to.be.equal(true);
      });

      it('emits an ApprovalForAll log', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder},
          {address: multiTokenHolder}, {address: recipient}, {address: proxy}] = await ethers.getSigners();

        let tx = await caller.setApprovalForAll(proxy, true);
        let receipt = await tx.wait();
        expect(receipt.events).to.not.be.null;
        expect(receipt.events[0].address).to.not.be.null;
        expect(receipt.events[0].data).to.not.be.null;
        //await expect(tx).to.emit(caller, 'ApprovalForAll', { account: multiTokenHolder, operator: proxy, approved: true });
      });

      it('can unset approval for an operator', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder},
          {address: multiTokenHolder}, {address: recipient}, {address: proxy}] = await ethers.getSigners();

        let receipt = await caller.setApprovalForAll(proxy, true);
        await caller.setApprovalForAll(proxy, false);
        expect(await caller.isApprovedForAll(caller.address, proxy)).to.be.equal(false);
      });

      it('reverts if attempting to approve self as an operator', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder},
          {address: multiTokenHolder}, {address: recipient}, {address: proxy}] = await ethers.getSigners();
        await expect(
          caller.setApprovalForAll(caller.address, true),
          'ERC1155: setting approval status for self',
        ).to.be.reverted;
      });
    });

    describe('safeTransferFrom', function () {
      it('reverts when transferring more than balance', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder},
           {address: multiTokenHolder}, {address: recipient}, {address: proxy}] = await ethers.getSigners();
        await caller.mint(multiTokenHolder, firstTokenId, firstAmount, '0x');
        await caller.mint(
          multiTokenHolder,
          secondTokenId,
          secondAmount,
          '0x');

        await expect(
          caller.safeTransferFrom(
            multiTokenHolder,
            recipient,
            firstTokenId,
            firstAmount.add(1),
            '0x'
          ),
          'ERC1155: insufficient balance for transfer',
        ).to.be.reverted;
      });

      it('reverts when transferring to zero address', async function () {
        let { caller } = await loadFixture(deployOneYearLockFixture);
        const [{address: minter}, {address: firstTokenHolder}, {address: secondTokenHolder},
           {address: multiTokenHolder}, {address: recipient}, {address: proxy}] = await ethers.getSigners();
        await expect(
          caller.safeTransferFrom(
            multiTokenHolder,
            ZERO_ADDRESS,
            firstTokenId,
            firstAmount,
            '0x',
          ),
          'ERC1155: transfer to the zero address',
        ).to.be.reverted;
      });
    });
    
    it("Should have non-zero balance after minting", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, TEN, '0x')
      await tx.wait()
      expect(await caller.balanceOf(owner.address, 2)).to.equal(0);
      expect(await caller.balanceOf(owner.address, 1)).to.equal(TEN);
    });
    it("Should have non-zero balance after transfer", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, TEN, '0x')
      await tx.wait()
      tx = await caller.safeTransferFrom(owner.address, otherAccount.address, 1, TEN, '0x')
      await tx.wait()
      expect(await caller.balanceOf(owner.address, 1)).to.equal(0);
      expect(await caller.balanceOf(otherAccount.address, 1)).to.equal(TEN);
    });
    it("Should have non-zero batch balance", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, TEN, '0x')
      await tx.wait()
      tx = await caller.mint(otherAccount.address, 2, 5, '0x')
      await tx.wait()

      expect(await caller.balanceOfBatch([owner.address,otherAccount.address], [1,2]))
      .to.eql([ethers.BigNumber.from(TEN),ethers.BigNumber.from(5)])
    });
    it("Should have non-zero batch balance", async function () {
      const { caller } = await loadFixture(deployOneYearLockFixture);
      const [owner, otherAccount] = await ethers.getSigners();

      let tx = await caller.mint(owner.address, 1, TEN, '0x')
      await tx.wait()
      tx = await caller.mint(owner.address, 2, TEN, '0x')
      await tx.wait()

      tx = await caller.safeBatchTransferFrom(owner.address,otherAccount.address, [1,2], [5,5], '0x')
      await tx.wait()

      expect(await caller.balanceOf(owner.address, 1)).to.equal(5);
      expect(await caller.balanceOf(owner.address, 2)).to.equal(5);
    });
  });
 });
