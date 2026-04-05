import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("AeternaFactory - Comprehensive Testing", function () {
  let AeternaFactory, factory;
  let owner, beneficiary, otherAccount;

  const HEARTBEAT_INTERVAL = 30 * 24 * 60 * 60; // 30 days
  const GRACE_PERIOD = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [owner, beneficiary, otherAccount] = await ethers.getSigners();

    AeternaFactory = await ethers.getContractFactory("AeternaFactory");
    factory = await AeternaFactory.deploy();
  });

  describe("Deployment", function () {
    it("Should deploy successfully with an empty contract registry", async function () {
      const contracts = await factory.getContracts(owner.address);
      expect(contracts.length).to.equal(0);
    });
  });

  describe("Deploying Aeterna Instances", function () {
    it("Should deploy a new Aeterna contract and emit AeternaDeployed event", async function () {
      await expect(
        factory.deployAeterna(owner.address, beneficiary.address, HEARTBEAT_INTERVAL, GRACE_PERIOD)
      )
        .to.emit(factory, "AeternaDeployed")
        .withArgs(owner.address, (address) => {
          // Check that the returned argument is a valid address
          return ethers.isAddress(address);
        });
    });

    it("Should track deployed instances for the owner", async function () {
      const tx = await factory.deployAeterna(owner.address, beneficiary.address, HEARTBEAT_INTERVAL, GRACE_PERIOD);
      const receipt = await tx.wait();

      const events = receipt.logs.filter((x) => x.eventName === "AeternaDeployed");
      const deployedAddress = events[0].args.contractAddress;

      const contracts = await factory.getContracts(owner.address);
      expect(contracts.length).to.equal(1);
      expect(contracts[0]).to.equal(deployedAddress);
    });

    it("Should allow a single user to deploy multiple Aeterna contracts", async function () {
      await factory.deployAeterna(owner.address, beneficiary.address, HEARTBEAT_INTERVAL, GRACE_PERIOD);
      await factory.deployAeterna(owner.address, otherAccount.address, HEARTBEAT_INTERVAL, GRACE_PERIOD);

      const contracts = await factory.getContracts(owner.address);
      expect(contracts.length).to.equal(2);
    });

    it("Should correctly initialize parameters in the deployed Aeterna contract", async function () {
      const tx = await factory.deployAeterna(owner.address, beneficiary.address, HEARTBEAT_INTERVAL, GRACE_PERIOD);
      const receipt = await tx.wait();

      const events = receipt.logs.filter((x) => x.eventName === "AeternaDeployed");
      const deployedAddress = events[0].args.contractAddress;

      const Aeterna = await ethers.getContractFactory("Aeterna");
      const aeternaInstance = Aeterna.attach(deployedAddress);

      expect(await aeternaInstance.owner()).to.equal(owner.address);
      expect(await aeternaInstance.beneficiary()).to.equal(beneficiary.address);
      expect(await aeternaInstance.heartbeatInterval()).to.equal(HEARTBEAT_INTERVAL);
      expect(await aeternaInstance.gracePeriod()).to.equal(GRACE_PERIOD);
    });
  });
});
