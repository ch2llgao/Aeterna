// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Simplified Aave V3 Pool Interface
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
}

contract AaveVerifier {
    // Aave V3 Pool address on Base Sepolia
    // Note: In production, fetch this via PoolAddressesProvider. Hardcoded here for testing simplicity.
    address public constant AAVE_POOL = 0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27;

    // Deposit asset into Aave V3 Pool
    function depositToAave(address _tokenAddress, uint256 _amount) external {
        IERC20 token = IERC20(_tokenAddress);

        // 1. Transfer tokens from the caller (msg.sender) to this contract.
        //    (Requires the caller to have approved this contract beforehand)
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        // 2. Approve the Aave Pool to spend this contract's tokens.
        token.approve(AAVE_POOL, _amount);

        // 3. Supply tokens to the Aave Pool.
        //    Crucial: Since `onBehalfOf` is set to `address(this)`, the yield-bearing 
        //    aTokens are minted directly to this smart contract. This aligns with the 
        //    Dead Man's Switch logic, ensuring the contract retains control of the assets.
        IPool(AAVE_POOL).supply(_tokenAddress, _amount, address(this), 0);
    }
}

