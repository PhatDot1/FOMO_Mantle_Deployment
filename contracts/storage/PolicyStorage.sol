// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPolicyStorage} from "../interfaces/IPolicyStorage.sol";

contract PolicyStorage is IPolicyStorage, Ownable {
    mapping(uint256 => Policy) private policies;
    Config private config;
    uint256 private nextPolicyId = 1;
    mapping(address => bool) public authorizedWriters;

    event WriterAuthorizationUpdated(address indexed writer, bool authorized);
    event ConfigUpdated(Config newConfig);
    error Unauthorized();
    error InvalidPolicyId();

    modifier onlyAuthorized() {
        if (!authorizedWriters[msg.sender] && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    constructor(Config memory _config) {
        config = _config;
        _transferOwnership(msg.sender);
    }

    function getPolicy(uint256 policyId) external view override returns (Policy memory) {
        if (policyId == 0 || policyId >= nextPolicyId) revert InvalidPolicyId();
        return policies[policyId];
    }

    function setPolicy(uint256 policyId, Policy memory policy) external override onlyAuthorized {
        if (policyId == 0 || policyId >= nextPolicyId) revert InvalidPolicyId();
        policies[policyId] = policy;
    }

    function getConfig() external view override returns (Config memory) {
        return config;
    }

    function setConfig(Config memory _config) external override onlyOwner {
        _validateConfig(_config);
        config = _config;
        emit ConfigUpdated(_config);
    }

    function getNextPolicyId() external view override returns (uint256) {
        return nextPolicyId;
    }
    
    function addPolicy(Policy memory policy) external override onlyAuthorized returns (uint256 policyId) {
        policyId = nextPolicyId++;
        policies[policyId] = policy;
    }

    function setWriterAuthorization(address writer, bool authorized) external onlyOwner {
        authorizedWriters[writer] = authorized;
        emit WriterAuthorizationUpdated(writer, authorized);
    }
    
    function _validateConfig(Config memory _config) internal pure {
        require(_config.maxUpsideShareBps <= 10000, "Invalid max upside share");
        require(_config.minUpsideShareBps <= _config.maxUpsideShareBps, "Invalid upside share range");
        require(_config.maxPayoutBps <= 10000, "Invalid max payout");
        require(_config.minPayoutBps <= _config.maxPayoutBps, "Invalid payout range");
        require(_config.minDuration <= _config.maxDuration, "Invalid duration range");
        require(_config.platformFeeBps <= 1000, "Fee too high");
    }
}
