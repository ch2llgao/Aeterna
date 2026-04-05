import hre from "hardhat";

async function main() {
  const factoryAddress = "0x7BdBfe74529043D536c66FF629b5830554D3c20d";

  console.log(`Starting source code verification for Factory at ${factoryAddress}...`);

  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [],
    });
    console.log("✅ Factory Contract successfully verified on BaseScan!");
  } catch (e) {
    if (e.message?.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified on BaseScan.");        
    } else {
      console.error("❌ Verification failed:", e);
    }
  }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});