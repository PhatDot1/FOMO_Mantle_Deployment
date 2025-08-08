// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPolicyManager {
    function createPolicy(
        IERC20 token,
        string memory tokenSymbol,
        uint256 amount,
        IERC20 payoutToken,
        uint16 payoutBps,
        uint256 duration,
        uint16 upsideShareBps
    ) external returns (uint256 policyId);

    function purchasePolicy(uint256 policyId) external;
    function cancelPolicy(uint256 policyId) external;
    function getOpenPolicyIds() external view returns (uint256[] memory);
    function getUserPolicies(address user) external view returns (uint256[] memory);
}
