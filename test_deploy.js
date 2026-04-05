import { ethers } from "hardhat";

async function main() {
  const FACTORY_ADDRESS = "0x11659401431628fe1Fe17e20FeAF35Fb432C9d56";
  const factory = await ethers.getContractAt("AeternaFactory", FACTORY_ADDRESS);
  const [owner] = await ethers.getSigners();
  
  console.log("Using account:", owner.address);
  
  const hInterval = 3600;
  const gPeriod = 3600;
  console.log("Deploying via factory...");
  const tx = await factory.deployAeterna(owner.address, owner.address, hInterval, gPeriod);
  const receipt = await tx.wait();
  console.log("Transaction mined in block", receipt.blockNumber);
  
  let newAddress;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed && parsed.name === "AeternaDeployed") {
        newAddress = parsed.args[1];
        console.log("Found address from event:", newAddress);
        break;
      }
    } catch(e) {}
  }
  
  if (!newAddress) {
    const arr = await factory.getContracts(owner.address);
    newAddress = arr[arr.length-1];
    console.log("Found address from array:", newAddress);
  }
  
  console.log("Fetching status from deployed contract...");
  const aeterna = await ethers.getContractAt("Aeterna", newAddress);
  const st = await aeterna.getStatus();
  console.log("Status:", st);
  const lpt = await aeterna.lastPingTime();
  console.log("Ping:", lpt);
}

main().catch(console.error);
