// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Aeterna.sol";

contract AeternaFactory {
    mapping(address => address[]) public userContracts;

    event AeternaDeployed(address indexed owner, address indexed contractAddress);

    function getContracts(address user) external view returns (address[] memory) {
        return userContracts[user];
    }

    function deployAeterna(
        address _owner,
        address _beneficiary,
        uint256 _heartbeatInterval,
        uint256 _gracePeriod
    ) external returns (address) {
        Aeterna newContract = new Aeterna(_owner, _beneficiary, _heartbeatInterval, _gracePeriod);
        userContracts[_owner].push(address(newContract));
        emit AeternaDeployed(_owner, address(newContract));
        return address(newContract);
    }
}

