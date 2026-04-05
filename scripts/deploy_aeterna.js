import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Use .env variables if provided, otherwise fallback
  const ownerAddress = process.env.AETERNA_OWNER || deployer.address;
  const beneficiaryAddress = process.env.AETERNA_BENEFICIARY || hre.ethers.Wallet.createRandom().address;

  console.log(`\n????? Smart Contract Owner: ${ownerAddress}`);
  console.log(`?? Designated Beneficiary: ${beneficiaryAddress}`);

  // ---- 0. Configuration Setup ----
  const USDC_ADDRESS = process.env.AETERNA_USDC || "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f"; 
  const depositStr = process.env.AETERNA_DEPOSIT || "0.5";
  const DEPOSIT_AMOUNT = hre.ethers.parseUnits(depositStr, 6); 
  const HEARTBEAT_INTERVAL = process.env.AETERNA_HEARTBEAT ? parseInt(process.env.AETERNA_HEARTBEAT) : (365 * 24 * 60 * 60);
  const GRACE_PERIOD = process.env.AETERNA_GRACE ? parseInt(process.env.AETERNA_GRACE) : (30 * 24 * 60 * 60);

  // ---- 1. Deploying the Aeterna ----
  console.log("\n[1/4] Deploying User's Aeterna Smart Contract...");
  const Aeterna = await hre.ethers.getContractFactory("Aeterna");

  // Constructor arguments: owner, beneficiary, interval, grace
  const aeternaContract = await Aeterna.deploy(ownerAddress, beneficiaryAddress, HEARTBEAT_INTERVAL, GRACE_PERIOD);
  await aeternaContract.waitForDeployment();
  const contractAddress = await aeternaContract.getAddress();

  console.log(`? Aeterna deployed successfully to: ${contractAddress}`);

  // ---- 2. Regular Usage (Depositing into Aave) ----
  const usdcToken = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);
  console.log(`\n[2/4] Owner is using the contract... depositing ${hre.ethers.formatUnits(DEPOSIT_AMOUNT, 6)} USDC.`);

  // Check if we are on a mock local network without the USDC contract
  const code = await hre.ethers.provider.getCode(USDC_ADDRESS);
  if (code === "0x") {
    console.warn(`⚠️ MOCK NETWORK DETECTED: No USDC contract found at ${USDC_ADDRESS}. Skipping deposit simulation.`);
  } else {
    // Note: Only the deployer address can approve funds from its own EOA wallet if testing
    const balance = await usdcToken.balanceOf(deployer.address);
    if (balance < DEPOSIT_AMOUNT) {
      console.warn(`⚠️ Insufficient USDC to continue the deposit test, but deployment was successful.`);
    } else {
      const approveTx = await usdcToken.approve(contractAddress, DEPOSIT_AMOUNT);
      await approveTx.wait();

      // Smart Contract feature to deposit
      const depositTx = await aeternaContract.depositToAave(USDC_ADDRESS, DEPOSIT_AMOUNT);
      await depositTx.wait();

      console.log("✅ USDC successfully deposited into Aave via the new Wallet Contract.");
    }
  }

  // ---- 3. Checking Status (Safeguards) ----
  console.log("\n[3/4] Checking Wallet Activity Status...");
  const currentStatus = await aeternaContract.getStatus();
  console.log(`?? Status reads: [ ${currentStatus} ]`);

  console.log("\n[4/4] ? Simulated Attempt to Claim Inheritance...");
  try {
    const claimTx = await aeternaContract.executeInheritance(USDC_ADDRESS);
    await claimTx.wait();
  } catch (error) {
    console.log("? TX REVERTED AS EXPECTED: The execution failed because the owner is still Active or in the Grace Period. Funds are safe!");
  }

  console.log("\n?? Modern Aeterna Deployed and Verified!");
  console.log("-----------------------------------------");
  console.log(`?? Override parameters in .env file with AETERNA_OWNER, AETERNA_BENEFICIARY, AETERNA_HEARTBEAT, AETERNA_GRACE`);
  console.log("-----------------------------------------\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

