// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISettlementEngine {
    function settlePolicy(uint256 policyId) external;
    function emergencySettlePolicy(uint256 policyId, uint256 exitPrice) external;
    function canSettle(uint256 policyId) external view returns (bool);
    function calculatePotentialPayouts(uint256 policyId) external view returns (uint256 sellerPayout, uint256 buyerPayout);
}
