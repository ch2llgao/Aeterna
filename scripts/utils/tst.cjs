const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const FACTORY_ABI = ["event WalletDeployed(address indexed owner, address indexed walletAddress)"];
const FACTORY_ADDRESS = "0xe1FC0c1660CaacC9141c145DB3Cf0DA52dD8Ec6f";
const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

async function chk() {
    const filter = factory.filters.WalletDeployed();
    const currentBlock = await provider.getBlockNumber();
    const startBlock = currentBlock > 9000 ? currentBlock - 9000 : 0;
    const logs = await factory.queryFilter(filter, startBlock, "latest");
    console.log("Deploy Logs count:", logs.length);
    for(const l of logs) { console.log(l.args[0], "=>", l.args[1]); }
}
chk();
