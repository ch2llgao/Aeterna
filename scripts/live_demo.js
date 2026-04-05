import hre from "hardhat";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  // Using a random fresh address as the beneficiary so we can cleanly check its incoming balance
  const beneficiaryWallet = hre.ethers.Wallet.createRandom();
  const beneficiaryAddress = beneficiaryWallet.address;

  console.log(`\n👨‍💻 Smart Contract Wallet Owner: ${deployer.address}`);
  console.log(`👩 Designated Beneficiary: ${beneficiaryAddress}`);

  // ---- 0. Configuration Setup (EXTREMELY SHORT TIMERS FOR LIVE DEMO) ----
  const USDC_ADDRESS = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f"; // Base Sepolia Faucet USDC
  const DEPOSIT_AMOUNT = hre.ethers.parseUnits("0.1", 6); // Deposit 0.1 USDC to save funds

  const HEARTBEAT_INTERVAL = 20; // 20 seconds
  const GRACE_PERIOD = 15;       // 15 seconds
  // Total lock time = 35 seconds

  // ---- 1. Deploying the Aeterna ----
  console.log(`\n[1/5] Deploying Wallet with 20s Heartbeat & 15s Grace Period...`);
  const Aeterna = await hre.ethers.getContractFactory("Aeterna");
  const walletContract = await Aeterna.deploy(deployer.address, beneficiaryAddress, HEARTBEAT_INTERVAL, GRACE_PERIOD);
  await walletContract.waitForDeployment();
  const walletAddress = await walletContract.getAddress();
  console.log(`✅ Aeterna deployed to: ${walletAddress}`);

  // ---- 2. Depositing into Aave ----
  console.log(`\n[2/5] Owner depositing ${hre.ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC into Aave...`);
  const code = await hre.ethers.provider.getCode(USDC_ADDRESS);

  if (code === "0x") {
    console.warn(`⚠️ MOCK NETWORK DETECTED: No USDC contract found at ${USDC_ADDRESS}. Stopping Live Demo here because a real network with USDC is required for the deposit and claim simulation.`);
    return;
  }

  const usdcToken = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);
  const balance = await usdcToken.balanceOf(deployer.address);
  if (balance < DEPOSIT_AMOUNT) {
    console.warn(`⚠️ Insufficient USDC. You have ${hre.ethers.formatUnits(balance, 6)} USDC. Please get Base Sepolia USDC first.`);
    return;
  }

  await (await usdcToken.approve(walletAddress, DEPOSIT_AMOUNT)).wait();
  await (await walletContract.depositToAave(USDC_ADDRESS, DEPOSIT_AMOUNT)).wait();
  console.log("✅ USDC successfully deposited into Aave! Timer has been reset.");

  // ---- 3. Attempt to Claim Early ----
  console.log("\n[3/5] 🚨 Attempting to claim Inheritance early (Should Fail)...");
  try {
    // We send a transaction immediately, it should revert because time hasn't passed
    const tx = await walletContract.executeInheritance(USDC_ADDRESS);
    await tx.wait();
    console.log("❌ ERROR: It succeeded! This shouldn't happen.");
  } catch (error) {
    console.log("✅ TX REVERTED AS EXPECTED: The owner is still 'Active'.");
  }

  // ---- 4. Wait for the Time to Pass ----
  console.log(`\n[4/5] ⏰ Waiting 40 seconds for Heartbeat & Grace Period to expire on-chain...`);
  for (let i = 1; i <= 8; i++) {
    await sleep(5000); // wait 5 seconds
    const status = await walletContract.getStatus();
    console.log(`   - Time elapsed: ~${i * 5}s | Wallet Status: [ ${status} ]`);
  }

  // ---- 5. Claim Inheritance ----
  console.log("\n[5/5] 💀 Owner confirmed dead. Executing Inheritance...");
  // Anyone can call this function. We just use the deployer to execute the trustless automation.
  const claimTx = await walletContract.executeInheritance(USDC_ADDRESS);
  const receipt = await claimTx.wait();
  console.log(`✅ Inheritance Executed successfully in block ${receipt.blockNumber}!`);

  // Verify Beneficiary got the funds
  const benBalance = await usdcToken.balanceOf(beneficiaryAddress);
  console.log(`\n🎉 Beneficiary received: ${hre.ethers.formatUnits(benBalance, 6)} USDC (99% Principal + Yield)`);

  // Verify Ownership transfer
  const newOwner = await walletContract.owner();
  console.log(`🤝 Wallet Ownership transferred to Beneficiary: ${newOwner === beneficiaryAddress ? "TRUE" : "FALSE"}`);
  console.log("\n-----------------------------------------");
  console.log("Live On-Chain Demo Completed Successfully!");
  console.log("-----------------------------------------\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});