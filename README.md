# Aeterna: Yield-Bearing Dead Man's Switch

> *An un-opinionated, capital-efficient, trustless smart contract extension for securing dormant digital assets.*

---

## 🧬 How Aeterna Addresses the Project Requirements & Feedback

### 1. Smart Contract Feature & Capital Efficiency 
Instead of forcing users to manually interact with a "dead man's switch contract" like a chore, **Aeterna is designed as a Smart Contract layer**.  
- **Natural Pinging:** Any routine activity you do through the Aeterna contract (like depositing funds, withdrawing, or updating settings) acts as a natural "heartbeat" ping on-chain (`_ping()` is embedded in modifiers/interactions).
- **Maximizing Capital Efficiency:** Rather than letting the funds decay or sit idle while waiting for an inheritance event, any underlying assets (e.g., USDC) deposited into Aeterna are automatically routed and supplied to **Aave V3 (Base Sepolia)**. The assets earn continuous dynamic yield.   
- **Ownership Transfer upon Inheritance:** When the user ultimately stops pinging and the grace period expires, the executor calls `executeInheritance`. The beneficiary receives the payload, **AND** the ownership of the contract itself is formally transferred to the beneficiary (`owner = beneficiary`), ensuring zero asset dust is left behind.

### 2. Multi-Stage Safeguards 
To distinguish between "actual death" and "simple user negligence to ping", Aeterna employs a tiered warning system:
1. **Active State (`onlyActive`)**: User has pinged within the `heartbeatInterval`.
2. **Warning/Grace Period (`aliveOrGrace`)**: The heartbeat interval expired, but the user is given a buffer (`gracePeriod`) to realize they need to interact. In this phase, inheritance cannot be executed yet.
3. **Deceased State**: Both intervals have passed. Execution is unlocked. 

### 3. Aave V3 Testnet Compatibility 
Aeterna has built-in integration directly testing against the live **Base Sepolia Aave V3 Pool** (`0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27`). End-to-end yield deposit and withdrawal flow has been successfully verified on layer 2.

---

## 🏗 Directory Structure & Navigation

Aeterna relies on the modern **Hardhat** layout. Below is a structured view of the repository and its modules.

```text
Aeterna/
├── contracts/
│   ├── Aeterna.sol          # Core Yield-Bearing Dead Man's Switch Contract
│   ├── AeternaFactory.sol   # Contract Factory to deploy new instances
│   └── AaveVerifier.sol     # Integration tests/verifier for Aave V3
├── frontend/
│   ├── src/App.tsx          # React/Vite main React Application (Tailwind + Animated ECG UI)
│   ├── package.json         # Frontend dependencies (ethers v6, lucide)
│   └── vite.config.ts       
├── scripts/
│   ├── deploy_factory.js    # Deploy the master AeternaFactory to Base Sepolia
│   ├── deploy_aeterna.js    # Personal deployment and USDC deposit simulation (Auto-Mock local)
│   ├── live_demo.js         # The Ultimate LIVE On-Chain Demo workflow (Deploy -> Deposit -> Fast Forward -> Claim)
│   ├── verify.js            # BaseScan/Etherscan Smart Contract Verification script
│   └── utils/
│       ├── get_aToken.cjs   # Fetches exactly where the aUSDC token contract resides on Base Sepolia
│       ├── patch2.cjs       # Node utility to safely patch React UI files with injected contract addresses
│       └── tst.cjs          # Fast Event Logger utility (reads the 9000 most recent blocks for deploys)
├── test/
│   ├── AeternaWallet.test.js # Core Unit tests for ownership, pings, and the 3-stage death process
│   ├── AeternaFactory.test.js# Factory deployment & parameter mapping unit tests
│   └── AaveVerifier.test.js  # Checks generic external deposits targeting Aave Pools
├── hardhat.config.js        # Network configuration (Base Sepolia setup)
└── .env                     # Private keys, RPC URLs, and Deploy flags
```

---

## 🚀 Quick Start & Usage Guide

### 1. Requirements & Configuration
Install all dependencies in the **root** folder, and copy the environment template:
```bash
npm install
```
Inside `.env`, ensure the following are configured:
```env
BASE_SEPOLIA_RPC_URL="https://base-sepolia.g..."
PRIVATE_KEY="YourPrivateKeyHere"
BASESCAN_API_KEY="YourBaseScanApiKey" # (Optional) Only needed if you want to run scripts/verify.js
```

### 2. Testing the Smart Contracts (Local)
To execute the comprehensive **18 success test cases** perfectly mimicking identity transitions and multi-stage lifecycle safeguards:
```bash
npx hardhat test
```

### 3. Deploying & Executing Scripts (Base Sepolia)
Aeterna operates directly on Base Sepolia. You can run any script with `--network base_sepolia`.

- **Deploy the Global Factory:**
  ```bash
  npx hardhat run scripts/deploy_factory.js --network base_sepolia
  ```
- **Verify Code on BaseScan:** 
  ```bash
  npx hardhat run scripts/verify.js --network base_sepolia
  ```
- **✨ Run the Fully Automated Live Demo (End-to-End Simulation):**
  *Deploys a contract, deposits Base Sepolia USDC, artificially accelerates time (waits 40 seconds), and triggers the ultimate Decentralized Inheritance Execute.*
  ```bash
  npx hardhat run scripts/live_demo.js --network base_sepolia
  ```

### 4. Running the Frontend Application
The frontend is a beautifully designed, animated dashboard showcasing a live heartbeat monitor (ECG) dynamically reflecting the 3 status states (`Active`, `Grace Period`, `Deceased`).

```bash
cd frontend
npm install
npm run dev
```

*Navigate to `http://localhost:5173/` in your browser.*

---

## 🛠️ Utilities (`scripts/utils/`)
Need to quickly troubleshoot Base Sepolia state? We built tools for that:
- `node scripts/utils/get_aToken.cjs`: Instantly pulls the up-to-date aToken Reserve address from the AAVE Pool Contract.
- `node scripts/utils/tst.cjs`: Queries and prints the last 9,000 blocks for `WalletDeployed` events.
- `node scripts/utils/patch2.cjs`: A quick hot-swapping script that updates React's `App.tsx` dynamically when new Factory addresses are deployed.
