// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPolicyStorage {
    enum PolicyState { Open, Active, Settled, Cancelled }

    struct Policy {
        address seller;
        address buyer;
        IERC20 token;
        string tokenSymbol;
        uint256 amount;
        IERC20 payoutToken;
        uint256 payoutAmount;
        uint256 duration;
        uint16 upsideShareBps;
        uint256 entryPrice;
        uint256 startTimestamp;
        uint256 expiryTimestamp;
        PolicyState state;
    }

    struct Config {
        uint16 maxUpsideShareBps;
        uint16 minUpsideShareBps;
        uint16 maxPayoutBps;
        uint16 minPayoutBps;
        uint256 minDuration;
        uint256 maxDuration;
        uint16 platformFeeBps;
    }

    function getPolicy(uint256 policyId) external view returns (Policy memory);
    function setPolicy(uint256 policyId, Policy memory policy) external;
    function getConfig() external view returns (Config memory);
    function setConfig(Config memory config) external;
    function getNextPolicyId() external view returns (uint256);
    function addPolicy(Policy memory policy) external returns (uint256 policyId);
}
