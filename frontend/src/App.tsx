import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import {
  ShieldCheck, Activity, Skull, Wallet, Briefcase, AlertTriangle, RefreshCw, Send, UserCheck, UserPlus, PlaySquare, Clock, CheckCircle2, XCircle
} from "lucide-react";
import AeternaArtifact from "./Aeterna.json";

const AETERNA_ABI = AeternaArtifact.abi;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",    
  "function allowance(address owner, address spender) view returns (uint256)",  
  "function balanceOf(address owner) view returns (uint256)"
];

const POOL_ABI = [
  "function getReserveData(address asset) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128)"
];

const AAVE_POOL_ADDRESS = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27";

const FACTORY_ADDRESS = "0x11659401431628fe1Fe17e20FeAF35Fb432C9d56";
const FACTORY_ABI = [
  "event AeternaDeployed(address indexed owner, address indexed contractAddress)", 
  "function deployAeterna(address _owner, address _beneficiary, uint256 _heartbeatInterval, uint256 _gracePeriod) external returns (address)",
  "function getContracts(address user) view returns (address[])"
];

const DEFAULT_CONTRACT = "";
const USDC_ADDRESS = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f";

export default function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>("");

  // Interaction Tab
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT);
  useEffect(() => {
    autoClaimed.current = false; // Reset whenever the user switches to a different contract
  }, [contractAddress]);
  const [status, setStatus] = useState<string>("Loading...");       
  const [contractOwner, setContractOwner] = useState<string>("");
  const [currentBeneficiary, setCurrentBeneficiary] = useState<string>("");     
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  const [newBeneficiary, setNewBeneficiary] = useState<string>("");

  const [newHeartbeat, setNewHeartbeat] = useState<string>("");
  const [newGrace, setNewGrace] = useState<string>("");

  const [lastPingTime, setLastPingTime] = useState<bigint>(0n);
  const [currentHeartbeat, setCurrentHeartbeat] = useState<bigint>(0n);
  const [currentGrace, setCurrentGrace] = useState<bigint>(0n);
  const [countdownText, setCountdownText] = useState<string>("");
  const autoClaimed = useRef<boolean>(false);

  // Deploy New Aeterna Tab
  const [deployOwner, setDeployOwner] = useState<string>("");
  const [deployBeneficiary, setDeployBeneficiary] = useState<string>("");       
  const [deployInterval, setDeployInterval] = useState<string>("3600"); // 1 hour for testing
  const [deployGrace, setDeployGrace] = useState<string>("3600"); // 1 hour for testing
  const [activeTab, setActiveTab] = useState<'interact' | 'deploy'>('deploy');  

  const [usdcBalance, setUsdcBalance] = useState<string>("");
  const [aaveYieldBalance, setAaveYieldBalance] = useState<string>("");
  const [myUsdcBalance, setMyUsdcBalance] = useState<string>("0");

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<{title: string, type: "error" | "success"} | null>(null);

  const showToast = (title: string, type: "error" | "success" = "success") => {
    setToastMsg({title, type});
    setTimeout(() => setToastMsg(null), 5000);
  };


  useEffect(() => {
    connectProvider();
  }, []);

  useEffect(() => {
    if (lastPingTime === 0n || currentHeartbeat === 0n) return;

    // Function to calculate exact string form (e.g. 1d 5h 30m 10s)
    const formatDiff = (diffInSeconds: bigint) => {
      let rem = Number(diffInSeconds);
      if (rem <= 0) return "0s";
      const d = Math.floor(rem / 86400); rem %= 86400;
      const h = Math.floor(rem / 3600); rem %= 3600;
      const m = Math.floor(rem / 60); rem %= 60;
      const s = rem;

      let str = "";
      if (d > 0) str += `${d}d `;
      if (h > 0) str += `${h}h `;
      if (m > 0) str += `${m}m `;
      str += `${s}s`;
      return str.trim();
    };

        const maxStatusUpdate = setInterval(() => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const activeDeadline = lastPingTime + currentHeartbeat;
      const finalDeadline = activeDeadline + currentGrace;

      if (now <= activeDeadline) {
        setCountdownText(formatDiff(activeDeadline - now));
        setStatus(prev => prev.includes("Deploying") ? prev : "Active");
      } else if (now <= finalDeadline) {
        setCountdownText(formatDiff(finalDeadline - now) + " (Grace)");
        setStatus(prev => prev.includes("Deploying") ? prev : "Warning: Grace Period");
      } else {
        setCountdownText("Ready to Claim");
        setStatus(prev => prev.includes("Deploying") ? prev : "Deceased: Ready to Claim");
        }
      }, 1000);

      return () => clearInterval(maxStatusUpdate);
    }, [lastPingTime, currentHeartbeat, currentGrace]);

    // Independent React Effect to handle Auto-Claim when status reaches Deceased
    useEffect(() => {
      const isDeceased = status === "Deceased: Ready to Claim";
      
      // Reset the claim lock whenever the contract is alive again
      if (!isDeceased) {
        autoClaimed.current = false;
        return;
      }

      const hasBalance = aaveYieldBalance && parseFloat(aaveYieldBalance) > 0;
      
      if (isDeceased && hasBalance && !autoClaimed.current && provider && contractAddress) {
        autoClaimed.current = true;
        console.log("Status triggered Auto-Claim! Waiting 5s...");
        showToast("Contract Deceased. Auto-Claiming in 5s...", "success");
        const timer = setTimeout(() => {
          handleClaim().catch(err => console.error("Auto claim error:", err));
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [status, aaveYieldBalance, provider, contractAddress]);

    const connectProvider = async () => {
      if ((window as any).ethereum) {
        const web3Provider = new ethers.BrowserProvider((window as any).ethereum);
      setProvider(web3Provider);
      try {
        const accounts = await web3Provider.send("eth_requestAccounts", []);    
        const userAccount = accounts[0];
        setAccount(userAccount);
        // Default deployOwner to current user
        setDeployOwner(userAccount);

        // ALWAYS fetch personal USDC balance simply by connecting, regardless of contract.
        try {
          const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, web3Provider);
          const personalUsdc = await usdcContract.balanceOf(userAccount);       
          setMyUsdcBalance(ethers.formatUnits(personalUsdc, 6));
        } catch (e) {
          console.error("Fetch personal balance failed", e);
        }

        // Try to auto-load mapping from Factory
        let targetAddress = contractAddress;
        try {
          const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, web3Provider);
          const contracts = await factory.getContracts(userAccount);
          if (contracts && contracts.length > 0) {
            const latestContract = contracts[contracts.length - 1]; // Load the most recent contract
            setContractAddress(latestContract);
            targetAddress = latestContract;
            setActiveTab('interact'); // Automatically switch to the interact tab!
          }
        } catch (e) {
          console.error("Factory load failed", e);
        }

        if (targetAddress && targetAddress !== "") {
          await fetchStatus(web3Provider, userAccount, targetAddress);
        }

      } catch (e) {
        console.error("Connection failed", e);
      }
    } else {
      showToast("Please install MetaMask!", "error");
    }
  };

  const fetchStatus = async (
    web3Provider: ethers.BrowserProvider,
    userAccount: string,
    addressToFetch: string
  ) => {
    try {
      // REMOVED
      const network = await web3Provider.getNetwork();
      if (network.chainId !== 84532n) {
        setStatus("Wrong Network! Please switch to Base Sepolia.");       
        return;
      }
      setContractOwner("");
      setCurrentBeneficiary("");

      const contract = new ethers.Contract(addressToFetch, AETERNA_ABI, web3Provider);

      const status = await contract.getStatus();
      setStatus(status);

      const ownerAddr = await contract.owner();
      setContractOwner(ownerAddr);
      setIsOwner(ownerAddr.toLowerCase() === userAccount.toLowerCase());        

      const benAddr = await contract.beneficiary();
      setCurrentBeneficiary(benAddr);
      setNewBeneficiary(benAddr); // Pre-fill with current beneficiary

      const hb = await contract.heartbeatInterval();
      const gp = await contract.gracePeriod();
      const lp = await contract.lastPingTime();
      setCurrentHeartbeat(hb);
      setCurrentGrace(gp);
      setLastPingTime(lp);

      setNewHeartbeat(hb.toString()); // Pre-fill with current heartbeat        
      setNewGrace(gp.toString());     // Pre-fill with current grace

      try {
          const uContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, web3Provider);
          const pb = await uContract.balanceOf(userAccount);
          setMyUsdcBalance(ethers.formatUnits(pb, 6));

          // Fetch underlying USDC sitting idle in the contract
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, web3Provider);
        const idleUsdc = await usdcContract.balanceOf(addressToFetch);
        setUsdcBalance(ethers.formatUnits(idleUsdc, 6));

        // Fetch aToken from Aave Pool (Wait for Aave Pool's reserve data)      
        const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, POOL_ABI, web3Provider);
        const reserveData = await poolContract.getReserveData(USDC_ADDRESS);    
        const aTokenAddress = reserveData[8]; // 8th element is the aToken address

        const aTokenContract = new ethers.Contract(aTokenAddress, ERC20_ABI, web3Provider);
        const activeYieldBalance = await aTokenContract.balanceOf(addressToFetch);
        setAaveYieldBalance(ethers.formatUnits(activeYieldBalance, 6));
      } catch (err) {
        console.error("Error fetching balances", err);
      }

    } catch (e) {
      console.error(e);
      console.log("Fetch Error", e); const errMsg = (e as any).reason || (e as any).message || "Unknown error";
        showToast("Fetch Error: " + errMsg, "error");
        setStatus("Error: " + errMsg);
    }
  };

  const reloadContract = async () => {
    if (provider && account) {
      setStatus("Loading...");
      await fetchStatus(provider, account, contractAddress);
    }
  };

  const handleDeposit = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const aeterna = new ethers.Contract(contractAddress, AETERNA_ABI, signer);
      const amount = ethers.parseUnits(depositAmount, 6);

      // Check current allowance to avoid redundant approval transaction popups
      setLoadingText("Checking USDC Allowance...");
      const currentAllowance = await usdc.allowance(account, contractAddress);
      
      if (currentAllowance < amount) {
        setLoadingText("Approving USDC...");
        const approveTx = await usdc.approve(contractAddress, amount);
        await approveTx.wait();
        
        setLoadingText("Waiting for base L2 RPC Sync...");
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      setLoadingText("Depositing to Factory Vault...");
      const depositTx = await aeterna.depositToAave(USDC_ADDRESS, amount);
      await depositTx.wait();

      showToast("Success! USDC Deposited. Syncing L2...", "success"); 
      await new Promise(r => setTimeout(r, 2000));
      await fetchStatus(provider, account, contractAddress);
      setDepositAmount("");
    } catch (e: any) { 
      const errMsg = e.reason || e.message || e.shortMessage || "Transaction failed";
      alert("⚠️报错信息（请完整复制或截图发给AI）:\n\n" + errMsg);
      showToast("Error: " + errMsg, "error"); 
    }
    setLoading(false);
    setLoadingText("");
  };

  const handleWithdraw = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const aeterna = new ethers.Contract(contractAddress, AETERNA_ABI, signer);

      const amount = ethers.parseUnits(withdrawAmount, 6);
      const withdrawTx = await aeterna.withdrawFromAave(USDC_ADDRESS, amount);  
      await withdrawTx.wait();

      showToast("Success! USDC Withdrawn. Syncing L2...", "success"); await new Promise(r => setTimeout(r, 2000));
      await fetchStatus(provider, account, contractAddress);
      setWithdrawAmount("");
    } catch (e: any) { showToast("Error: " + (e.reason || e.shortMessage || "Transaction failed"), "error"); }
    setLoading(false);
  };

  const handleUpdateBeneficiary = async () => { /* Same as old */
    if (!provider || !isOwner) return;
    if (!ethers.isAddress(newBeneficiary)) { showToast("Invalid Address", "error"); return; }
    if (!newHeartbeat || !newGrace) { showToast("Missing time parameters", "error"); return; }
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const aeterna = new ethers.Contract(contractAddress, AETERNA_ABI, signer);
      const tx = await aeterna.updateSettings(newBeneficiary, newHeartbeat, newGrace);
      await tx.wait();
      showToast("Settings Updated. Syncing L2...", "success"); await new Promise(r => setTimeout(r, 2000));
      await fetchStatus(provider, account, contractAddress);
    } catch (e: any) { showToast("Failed: " + (e.reason || e.shortMessage || "Transaction failed"), "error"); }
    setLoading(false);
  };

  const handlePing = async () => { /* Same as old */
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const aeterna = new ethers.Contract(contractAddress, AETERNA_ABI, signer);
      const tx = await aeterna.ping();
      await tx.wait();
      showToast("Ping successful! Syncing L2...", "success"); await new Promise(r => setTimeout(r, 2000));
      await fetchStatus(provider, account, contractAddress);
    } catch (e: any) { showToast("Error: " + (e.reason || e.shortMessage || "Transaction failed"), "error"); }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!provider) return;
    setLoading(true);
    autoClaimed.current = true; // Block duplicate calls
    try {
      const signer = await provider.getSigner();
      const aeterna = new ethers.Contract(contractAddress, AETERNA_ABI, signer);
      
      // Safety check: skip if vault is empty
      if (!aaveYieldBalance || parseFloat(aaveYieldBalance) <= 0) {
        console.log("Ignored empty claim request.");
        setLoading(false);
        return;
      }

      const tx = await aeterna.executeInheritance(USDC_ADDRESS);
      // Wait for at least 1 confirmation to confidently resolve
      const receipt = await tx.wait(1);
      
      if (receipt && receipt.status === 1) {
          showToast("Inheritance Claimed successfully! Syncing L2...", "success"); 
          await new Promise(r => setTimeout(r, 2000));
          await fetchStatus(provider, account, contractAddress);
      } else {
          throw new Error("Transaction execution failed on-chain.");
      }
    } catch (e: any) {
      console.error(e);
      // Special catch to prevent redundant popups for cancelled/replaced/already minted txs
      if (e.code === "ACTION_REJECTED") {
          console.log("User rejected the transaction");
      } else {
          const reason = e.reason || e.shortMessage || e.message || "Transaction failed";
          // Ignore if it's complaining about "No funds" because it's a double trigger
          if (!reason.includes("No funds")) {
              showToast("Claim Reverted: " + reason, "error");
          }
      }
    }
    setLoading(false);
  };

  const handleDeploy = async () => {
    if (!provider) return;
    if (!ethers.isAddress(deployOwner) || !ethers.isAddress(deployBeneficiary)) {
      showToast("Invalid addresses for owner or beneficiary!", "error");
      return;
    }
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const tx = await factory.deployAeterna(deployOwner, deployBeneficiary, deployInterval, deployGrace);
      const receipt = await tx.wait();

      let newAddress;

      // Try to extract the deployed address from the event logs (safer for L2s where read-after-write can be stale)
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log as any);
          if (parsed && parsed.name === "AeternaDeployed") {
            newAddress = parsed.args[1]; // contractAddress
            break;
          }
        } catch (e) { /* ignore non-matching logs */ }
      }

      if (!newAddress) {
        const contracts = await factory.getContracts(deployOwner);
        newAddress = contracts[contracts.length - 1];
      }

      if (!newAddress) throw new Error("Deployment did not register in logs or state.");
        showToast("Successfully deployed Aeterna! Please wait for Layer 2 sync...", "success");
        setContractAddress(newAddress);
        setStatus("Deploying... Syncing Layer 2...");
        setActiveTab('interact');
        await new Promise(r => setTimeout(r, 2000));
      await fetchStatus(provider, account, newAddress);
    } catch (e: any) {
      console.error(e);
      showToast("Deployment Failed: " + (e.reason || e.shortMessage || "Transaction failed"), "error");
    }
    setLoading(false);
  };

  const getStatusIcon = () => {
    if (status.includes("Active")) return <ShieldCheck className="text-green-500 w-12 h-12" />;
    if (status.includes("Warning")) return <AlertTriangle className="text-yellow-500 w-12 h-12" />;
    if (status.includes("Error") || status.includes("Wrong")) return <AlertTriangle className="text-slate-500 w-12 h-12" />;
    return <Skull className="text-red-500 w-12 h-12" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 selection:bg-indigo-500">
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 animate-in slide-in-from-top-5 ${toastMsg.type === "error" ? "bg-red-500/10 border border-red-500/50 text-red-100" : "bg-emerald-500/10 border border-emerald-500/50 text-emerald-100"}`}>
{toastMsg.type === "error" ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <p className="font-medium text-sm">{toastMsg.title}</p>
        </div>
      )}
      <nav className="max-w-6xl mx-auto flex justify-between items-center py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-500 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tighter">Aeterna</h1>
        </div>
        <div className="flex items-center gap-4">
          {account && (
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-full flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase font-bold">My Balance:</span>
              <span className="text-sm font-mono text-green-400 font-bold">{parseFloat(myUsdcBalance).toFixed(2)} USDC</span>
            </div>
          )}
          <button
            onClick={connectProvider}
            className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* TABS */}
      <div className="max-w-6xl mx-auto mt-6 flex justify-center gap-4">        
        <button onClick={() => setActiveTab('interact')} className={"px-6 py-2 rounded-xl text-sm font-semibold transition-all "}>Interact</button>
        <button onClick={() => setActiveTab('deploy')} className={"px-6 py-2 rounded-xl text-sm font-semibold transition-all "}>Deploy Custom Aeterna</button>   
      </div>

      {activeTab === 'interact' && (
      <>
        <div className="max-w-6xl mx-auto mt-6 bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap md:flex-nowrap items-center gap-4">
          <Wallet className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Target Aeterna Contract</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x... (Direct Contract Address)"
              className="w-full bg-transparent border-none focus:outline-none text-slate-300 text-sm font-mono mt-1"
            />
          </div>
          <button onClick={reloadContract} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-600/20">
            Load Contract
          </button>
        </div>

        <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          <section className="col-span-12 md:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                {getStatusIcon()}
              </div>
              <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Live Heartbeat Status</h2>
              <div className="flex flex-col gap-2 mb-8">
                <span className="text-5xl font-black">{status}</span>     

                {lastPingTime !== 0n && currentHeartbeat !== 0n && (
                  <div className="mt-4 flex flex-col items-center justify-center text-center gap-6 bg-slate-900/40 p-8 rounded-2xl border border-slate-800/60 relative overflow-hidden shadow-lg shadow-black/20 w-full shrink-0">
                    {/* Glowing animated background bubble centered */}
                    {status.includes('Active') && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>}
                    {status.includes('Grace') && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none animate-pulse"></div>}
                    {status.includes('Deceased') && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>}

                    <style>{`
                      @keyframes slide-ecg {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                      }
                      .animate-ecg {
                        animation: slide-ecg 1.5s linear infinite;
                      }
                      .animate-ecg-slow {
                        animation: slide-ecg 3.5s linear infinite;
                      }
                    `}</style>
                    
                    <div className="flex flex-col items-center z-10 w-full">
                      <span className="text-sm text-slate-400 uppercase font-black tracking-widest mb-4">Time until status change</span>
                      
                      {/* Symmetrical ECG Monitor spanning full width */}
                      <div className={`relative w-full max-w-md h-24 mb-8 overflow-hidden rounded-xl border flex-shrink-0 bg-slate-950/80 shadow-inner ${status.includes('Active') ? 'border-indigo-900/40 text-indigo-400' : status.includes('Grace') ? 'border-amber-900/40 text-amber-500' : 'border-red-900/40 text-red-600'}`}>
                        {/* Grid background */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(100,116,139,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.3) 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                        
                        {/* SVG Wave */}
                        <svg className={`absolute left-0 h-full w-[200%] ${status.includes('Active') ? 'animate-ecg drop-shadow-[0_0_8px_currentColor]' : status.includes('Grace') ? 'animate-ecg-slow drop-shadow-[0_0_8px_currentColor]' : 'drop-shadow-[0_0_4px_currentColor]'}`} viewBox="0 0 200 50" preserveAspectRatio="none">
                          <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                                d={status.includes('Active') 
                                  ? "M0,25 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20" 
                                  : status.includes('Grace')
                                  ? "M0,25 h40 l10,-10 l5,30 l15,-20 h30 h40 l10,-10 l5,30 l15,-20 h30"
                                  : "M0,25 h200"} />
                        </svg>
                        
                        {/* Fade out edges */}
                        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-slate-950 via-transparent to-slate-950 pointer-events-none"></div>
                      </div>

                      {/* Scoreboard Clock */}
                      <div className="flex items-center justify-center gap-3 text-indigo-50 items-baseline font-mono text-4xl font-bold bg-slate-950 px-10 py-4 rounded-xl border border-slate-800 shadow-inner">
                        <Clock className={`w-8 h-8 mb-0.5 ${status.includes('Active') ? 'text-indigo-400' : status.includes('Grace') ? 'text-amber-500' : 'text-red-500'}`} />    
                        <span className={status.includes('Active') ? '' : status.includes('Grace') ? 'text-amber-100' : 'text-red-100'}>{countdownText}</span>
                      </div>
                    </div>
                  </div>
                )}

                {usdcBalance !== "" && aaveYieldBalance !== "" && (
                  <div className="mt-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 space-y-2">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Heritage Vault Assets</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Idle Principal:</span>
                      <span className="font-mono text-indigo-400">{parseFloat(usdcBalance).toFixed(6)} USDC</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Active Yield (Aave V3):</span>
                      <span className="font-mono text-green-400 font-bold">{parseFloat(aaveYieldBalance).toFixed(6)} aUSDC</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center justify-between mb-2">      
                    <span className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><UserCheck className="w-3 h-3"/> Heritage Owner</span> 
                    {isOwner && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full">It's You</span>}
                  </div>
                  <p className="font-mono text-sm text-slate-300 break-all">{contractOwner || "---"}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><UserPlus className="w-3 h-3"/> Beneficiary</span>     
                  </div>
                  <p className="font-mono text-sm text-indigo-300 break-all">{currentBeneficiary || "---"}</p>
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handlePing}
                  disabled={loading || !isOwner}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={"w-5 h-5 "} />
                  I'm still alive (Ping)
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Skull className="w-5 h-5 text-slate-400"/> Keeper & Inheritance</h2>
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-500 px-6 py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Briefcase className="w-5 h-5" />
                Execute Inheritance (1% Bounty)
              </button>
            </div>
          </section>

          <section className="col-span-12 md:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-xl font-bold mb-2">Update Contract Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Beneficiary (Heir)</label>
                  <input
                    type="text"
                    value={newBeneficiary}
                    onChange={(e) => setNewBeneficiary(e.target.value)}
                    placeholder="0x... (New Heir Address)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-1 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Heartbeat Interval (Sec)</label>
                    <input
                      type="number"
                      value={newHeartbeat}
                      onChange={(e)=>setNewHeartbeat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-1 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Grace Period (Sec)</label>
                    <input
                      type="number"
                      value={newGrace}
                      onChange={(e)=>setNewGrace(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-1 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleUpdateBeneficiary}
                  disabled={loading || !isOwner || !newBeneficiary || !newHeartbeat || !newGrace}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  Update Settings
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-8 rounded-3xl shadow-xl shadow-indigo-900/10">       
              <h2 className="text-2xl font-bold mb-2">Yield Deposit & Withdraw</h2>
              <div className="space-y-4">
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount to deposit"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 text-lg font-medium"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">USDC</span>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={loading || !isOwner || !depositAmount}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {loading && loadingText ? loadingText : (loading ? 'Processing...' : 'Deposit to Vault')}
                </button>
                <hr className="border-slate-800 my-4" />

                <div className="relative mt-1">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount to withdraw"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 text-lg font-medium"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">USDC</span>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !isOwner || !withdrawAmount}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                >
                  Withdraw from Vault
                </button>
              </div>
            </div>
          </section>
        </main>
      </>
      )}

      {activeTab === 'deploy' && (
        <main className="max-w-3xl mx-auto mt-8 bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><PlaySquare className="w-6 h-6 text-indigo-500"/> Deploy Custom Aeterna</h2>        

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Heritage Owner Address</label>
            <input type="text" value={deployOwner} onChange={(e)=>setDeployOwner(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-2 focus:outline-none focus:border-indigo-500 text-sm font-mono" />
            <p className="text-xs text-slate-500 mt-2">The user whose activity resets the heartbeat. Defaults to connected account.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Beneficiary (Heir) Address</label>
            <input type="text" value={deployBeneficiary} onChange={(e)=>setDeployBeneficiary(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-2 focus:outline-none focus:border-indigo-500 text-sm font-mono" />
            <p className="text-xs text-slate-500 mt-2">The user who claims the inheritance after death execution.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Heartbeat Interval (Seconds)</label>
              <input type="number" value={deployInterval} onChange={(e)=>setDeployInterval(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-2 focus:outline-none focus:border-indigo-500 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Grace Period (Seconds)</label>
              <input type="number" value={deployGrace} onChange={(e)=>setDeployGrace(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 mt-2 focus:outline-none focus:border-indigo-500 text-sm font-mono" />
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={loading || !deployOwner || !deployBeneficiary}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? 'Deploying...' : 'Deploy Contract'}
          </button>
        </main>
      )}

    </div>
  )
}
