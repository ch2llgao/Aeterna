const fs = require('fs');
const file = "C:/Users/高晨阳/Desktop/NUS/FT5004/Aeterna/frontend/src/App.tsx";
let code = fs.readFileSync(file, 'utf-8');

const oldCode = `        const factory = new ethers.ContractFactory(AETERNA_ABI, AETERNA_BYTECODE, signer);
        const contract = await factory.deploy(deployOwner, deployBeneficiary, deployInterval, deployGrace);
        await contract.waitForDeployment();
        const newAddress = await contract.getAddress();`;

const newCode = `        const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
        const tx = await factory.deployWallet(deployOwner, deployBeneficiary, deployInterval, deployGrace);
        await tx.wait();
        const newAddress = await factory.ownerToWallet(deployOwner);
        if (newAddress === ethers.ZeroAddress) throw new Error("Deployment did not register.");`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);
console.log("Patched!");
