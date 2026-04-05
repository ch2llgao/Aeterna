import hre from "hardhat";

async function main() {
  console.log("Deploying AeternaFactory...");
  const Factory = await hre.ethers.getContractFactory("AeternaFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log(`✅ AeternaFactory deployed to: ${await factory.getAddress()}`);
}

main().catch(console.error);
