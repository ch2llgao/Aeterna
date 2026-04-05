import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";

describe("AeternaWallet - Comprehensive Testing", function () {
  const HEARTBEAT_INTERVAL = 365 * 24 * 60 * 60; // 365 days
  const GRACE_PERIOD = 30 * 24 * 60 * 60;        // 30 days

  async function deployWalletFixture() {
    const [owner, beneficiary, keeper] = await ethers.getSigners();

    const Aeterna = await ethers.getContractFactory("Aeterna");
    const wallet = await Aeterna.deploy(owner.address, beneficiary.address, HEARTBEAT_INTERVAL, GRACE_PERIOD);

    return { wallet, owner, beneficiary, keeper };
  }

  describe("1. Deployment & Identity Verification", function () {
    it("Should set the correct owner and beneficiary", async function () {
      const { wallet, owner, beneficiary } = await loadFixture(deployWalletFixture);
      expect(await wallet.owner()).to.equal(owner.address);
      expect(await wallet.beneficiary()).to.equal(beneficiary.address);
    });

    it("Should initialize the correct heartbeat and grace periods", async function () {
      const { wallet } = await loadFixture(deployWalletFixture);
      expect(await wallet.heartbeatInterval()).to.equal(HEARTBEAT_INTERVAL);
      expect(await wallet.gracePeriod()).to.equal(GRACE_PERIOD);
    });
  });

  describe("2. Ping Mechanism & Safeguards (Feedback #1 & #2)", function () {
    it("Should update lastPingTime when owner manually pings", async function () {
      const { wallet, owner } = await loadFixture(deployWalletFixture);
      
      const initialPing = await wallet.lastPingTime();
      
      // Fast forward time by 10 days
      await time.increase(10 * 24 * 60 * 60);
      
      await wallet.connect(owner).ping();
      const newPing = await wallet.lastPingTime();
      
      expect(newPing).to.be.greaterThan(initialPing);
    });

    it("Should revert ping if called by a non-owner", async function () {
      const { wallet, keeper } = await loadFixture(deployWalletFixture);
      await expect(wallet.connect(keeper).ping()).to.be.revertedWith("Aeterna: Not owner");
    });
  });

  describe("3. Multi-stage Status Transitions (Feedback #2)", function () {
    it("Should report 'Active' during the normal heartbeat interval", async function () {
      const { wallet } = await loadFixture(deployWalletFixture);
      
      // Fast forward 100 days (less than 365)
      await time.increase(100 * 24 * 60 * 60);
      expect(await wallet.getStatus()).to.equal("Active");
    });

    it("Should report 'Warning: Grace Period' after heartbeat expires but within grace period", async function () {
      const { wallet } = await loadFixture(deployWalletFixture);
      
      // Fast forward 370 days (365 days heartbeat + 5 days into grace period)
      await time.increase(370 * 24 * 60 * 60);
      expect(await wallet.getStatus()).to.equal("Warning: Grace Period");
    });

    it("Should report 'Deceased: Ready to Claim' after both heartbeat and grace period expire", async function () {
      const { wallet } = await loadFixture(deployWalletFixture);
      
      // Fast forward 400 days (365 heartbeat + 30 grace + 5 extra days)
      await time.increase(400 * 24 * 60 * 60);
      expect(await wallet.getStatus()).to.equal("Deceased: Ready to Claim");
    });
  });

  describe("4. Inheritance Claim Safeguard Enforcement", function () {
    const MOCK_TOKEN_ADDRESS = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f";

    it("Should REVERT inheritance execution if owner is 'Active'", async function () {
      const { wallet, keeper } = await loadFixture(deployWalletFixture);
      
      // 0 days passed. Owner is extremely active.
      await expect(
        wallet.connect(keeper).executeInheritance(MOCK_TOKEN_ADDRESS)
      ).to.be.revertedWith("Aeterna: Owner is still active or in grace period");
    });

    it("Should REVERT inheritance execution if owner is in 'Warning: Grace Period'", async function () {
      const { wallet, keeper } = await loadFixture(deployWalletFixture);
      
      // Fast forward 370 days (Inside 30 days Grace Period)
      await time.increase(370 * 24 * 60 * 60);
      
      await expect(
        wallet.connect(keeper).executeInheritance(MOCK_TOKEN_ADDRESS)
      ).to.be.revertedWith("Aeterna: Owner is still active or in grace period");
    });

    it("Should NOT revert on timestamp safeguard if time is fully expired", async function () {
      const { wallet, keeper } = await loadFixture(deployWalletFixture);
      
      // Fast forward 400 days (Fully expired)
      await time.increase(400 * 24 * 60 * 60);
      
      // It will revert later in the function because of the local Aave pool not existing in Hardhat Network,
      // but it SHOULD pass the Time Safeguard require() statement without throwing the "active or in grace period" error.
      await expect(
        wallet.connect(keeper).executeInheritance(MOCK_TOKEN_ADDRESS)
      ).to.not.be.revertedWith("Aeterna: Owner is still active or in grace period");
    });
  });
});