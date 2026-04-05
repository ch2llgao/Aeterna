// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Simplified Aave V3 Pool Interface
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title Aeterna
 * @dev A smart contract embedded with a Yield-Bearing Dead Man's Switch.
 * Implements Instructor Feedback:
 * 1. "smart contract feature": Regular usage serves as a ping.
 * 2. "Safeguards": Added grace period and multi-stage activity status evaluation.
 * 3. "Transfer ownership... improving capital efficiency": Yields are earned, and ownership transfers upon death execution.
 */
contract Aeterna is ReentrancyGuard {
    // Base Sepolia Aave V3 Pool
    address public constant AAVE_POOL = 0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27;

    address public owner;
    address public beneficiary;
    
    uint256 public heartbeatInterval;  // e.g., 365 days (Time before entering Grace Period)
    uint256 public gracePeriod;        // e.g., 30 days (Buffer before full death execution)
    uint256 public lastPingTime;

    event Pinged(uint256 timestamp);
    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event InheritanceExecuted(address indexed executor, address indexed beneficiary, address token, uint256 totalAmount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Aeterna: Not owner");
        _;
    }

    modifier onlyActive() {
        require(block.timestamp <= lastPingTime + heartbeatInterval, "Aeterna: Contract is not in Active state");
        _;
    }

    modifier aliveOrGrace() {
        require(block.timestamp <= lastPingTime + heartbeatInterval + gracePeriod, "Aeterna: Owner is Deceased");
        _;
    }

    constructor(address _owner, address _beneficiary, uint256 _heartbeatInterval, uint256 _gracePeriod) {
        require(_heartbeatInterval > 0 && _gracePeriod > 0, "Aeterna: Time limits must be > 0");
        owner = _owner;
        beneficiary = _beneficiary;
        heartbeatInterval = _heartbeatInterval;
        gracePeriod = _gracePeriod;
        lastPingTime = block.timestamp;
    }

    // -------------------- PING & SAFEGUARDS (Feedback #1 & #2) --------------------

    /**
     * @dev Internal function to reset the heartbeat. 
     * As per feedback #1, regular transaction execution naturally serves as a ping.
     */
    function _ping() internal {
        lastPingTime = block.timestamp;
        emit Pinged(lastPingTime);
    }

    /**
     * @dev Explicit manual ping function for the owner.
     */
    function ping() external onlyOwner aliveOrGrace {
        _ping();
    }

    /**
     * @dev Safeguard to distinguish heartbeat inactivity from actual death (Feedback #2).
     * Provides a multi-stage warning system based on current timestamp.
     */
    function getStatus() external view returns (string memory) {
        if (block.timestamp <= lastPingTime + heartbeatInterval) {
            return "Active";
        } else if (block.timestamp <= lastPingTime + heartbeatInterval + gracePeriod) {
            return "Warning: Grace Period";
        } else {
            return "Deceased: Ready to Claim";
        }
    }

    // -------------------- SMART CONTRACT WALLET FEATURES (Feedback #1) --------------------

    /**
     * @dev Deposit asset into the contract, automatically routing to Aave V3 to earn yield.
     * Earned yield stays in the contract (capital efficiency). 
     * Natural contract usage implicitly triggers `_ping()`.
     */
    function depositToAave(address _tokenAddress, uint256 _amount) external onlyOwner onlyActive {
        _ping(); 
        
        IERC20 token = IERC20(_tokenAddress);
        require(token.transferFrom(msg.sender, address(this), _amount), "Aeterna: Transfer failed");
        
        token.approve(AAVE_POOL, _amount);
        IPool(AAVE_POOL).supply(_tokenAddress, _amount, address(this), 0);
        
        emit Deposited(_tokenAddress, _amount);
    }

    /**
     * @dev Owner can withdraw their funds from Aave anytime.
     * Natural contract usage implicitly triggers `_ping()`.
     */
    function withdrawFromAave(address _tokenAddress, uint256 _amount) external onlyOwner aliveOrGrace {
        _ping(); 
        
        // type(uint256).max evaluates to maximum uint256, removing all assets if user wants full withdrawal
        uint256 withdrawAmount = _amount == type(uint256).max ? type(uint256).max : _amount;
        IPool(AAVE_POOL).withdraw(_tokenAddress, withdrawAmount, msg.sender);
        
        emit Withdrawn(_tokenAddress, _amount);
    }

    /**
     * @dev Update settings (Heartbeat, Grace period, Beneficiary).
     * Natural usage implicitly triggers `_ping()`.
     */
    function updateSettings(address _beneficiary, uint256 _interval, uint256 _grace) external onlyOwner onlyActive {
        require(_interval > 0 && _grace > 0, "Aeterna: Time limits must be > 0");
        _ping();
        beneficiary = _beneficiary;
        heartbeatInterval = _interval;
        gracePeriod = _grace;
    }

    // -------------------- DEATH EXECUTION / INHERITANCE CLAIM (Proposal / Feedback #4) --------------------

    /**
     * @dev Public claim function with 1% Keeper Bounty mechanism.
     * @param _tokenAddress The ERC20 token to extract from Aave and distribute.
     * Anyone (arbitrage bots, beneficiary) can call this function ONCE the grace period expires.
     */
    function executeInheritance(address _tokenAddress) external nonReentrant {
        // Strict timestamp check based on heartbeat + grace period safeguard
        require(
            block.timestamp > lastPingTime + heartbeatInterval + gracePeriod, 
            "Aeterna: Owner is still active or in grace period"
        );
        require(beneficiary != address(0), "Aeterna: Beneficiary not set");

        // 1. Withdraw all principle + interest from Aave for the specified token
        // type(uint256).max signals Aave to withdraw 100% of the underlying supply
        uint256 withdrawnAmount = IPool(AAVE_POOL).withdraw(_tokenAddress, type(uint256).max, address(this));
        
        require(withdrawnAmount > 0, "Aeterna: No funds to withdraw");

        // 2. 1% Keeper Bounty Calculation (Incentivized Automation)
        uint256 bounty = withdrawnAmount / 100;
        uint256 inheritancePayload = withdrawnAmount - bounty;

        // 3. Trustless execution transfers
        IERC20(_tokenAddress).transfer(msg.sender, bounty);       // Transfer 1% to the Keeper/Executor
        IERC20(_tokenAddress).transfer(beneficiary, inheritancePayload); // Transfer 99% to the Heir

        // 4. Transfer contract ownership to the beneficiary to retain any remaining stray assets (Feedback #1)
        emit OwnershipTransferred(owner, beneficiary);
        owner = beneficiary;

        emit InheritanceExecuted(msg.sender, beneficiary, _tokenAddress, withdrawnAmount);
    }
}

