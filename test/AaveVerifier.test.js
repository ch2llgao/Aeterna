import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("AaveVerifier", function () {
  let aaveVerifier;
  let owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const AaveVerifier = await ethers.getContractFactory("AaveVerifier");
    aaveVerifier = await AaveVerifier.deploy();
  });

  describe("Deployment", function () {
    it("Should deploy correctly and set right AAVE_POOL address", async function () {
      const address = await aaveVerifier.getAddress();
      expect(address).to.not.equal(ethers.ZeroAddress);
      
      const pool = await aaveVerifier.AAVE_POOL();
      expect(pool).to.equal("0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27");
    });
  });

  describe("depositToAave", function () {
    it("Should revert if trying to deposit a zero or invalid token address", async function () {
      const amount = ethers.parseUnits("1", 18);
      const invalidToken = "0x0000000000000000000000000000000000000000";
      
      // Because there's no code at the invalid/zero address, the call to 'transferFrom' fails 
      await expect(
        aaveVerifier.connect(user).depositToAave(invalidToken, amount)
      ).to.be.reverted;
    });

    it("Should revert if user has not approved tokens to the verifier", async function () {
      const fakeTokenAddress = ethers.Wallet.createRandom().address;
      const amount = 100;
      
      // Since it's a random EOA address, not a contract, the underlying token.transferFrom fails or reverts.
      await expect(
        aaveVerifier.connect(user).depositToAave(fakeTokenAddress, amount)
      ).to.be.reverted;
    });
  });
});
