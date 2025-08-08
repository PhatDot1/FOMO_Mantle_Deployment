// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IPolicyStorage} from "./interfaces/IPolicyStorage.sol";
import {IPolicyManager} from "./interfaces/IPolicyManager.sol";
import {ISettlementEngine} from "./interfaces/ISettlementEngine.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";

/// @title FOMOInsurance
/// @notice Main coordinator contract for the FOMO Insurance protocol
contract FOMOInsurance is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    /// @notice Contract dependencies
    IPolicyStorage public immutable policyStorage;
    IPolicyManager public immutable policyManager;
    ISettlementEngine public immutable settlementEngine;
    IPriceOracle public immutable priceOracle;
    
    /// @notice Fee management
    address public feeRecipient;
    mapping(address => uint256) public feesCollected; // token => amount
    
    /// @notice Events
    event ContractsInitialized(
        address policyStorage,
        address policyManager,
        address settlementEngine,
        address priceOracle
    );
    event FeeRecipientUpdated(address indexed newRecipient);
    event FeesWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    /// @notice Errors
    error InvalidAddress();
    error InsufficientBalance();
    
    constructor(
        address _policyStorage,
        address _policyManager,
        address _settlementEngine,
        address _priceOracle,
        address _feeRecipient
    ) {
        require(_policyStorage != address(0), "Invalid storage address");
        require(_policyManager != address(0), "Invalid manager address");
        require(_settlementEngine != address(0), "Invalid settlement address");
        require(_priceOracle != address(0), "Invalid oracle address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        policyStorage = IPolicyStorage(_policyStorage);
        policyManager = IPolicyManager(_policyManager);
        settlementEngine = ISettlementEngine(_settlementEngine);
        priceOracle = IPriceOracle(_priceOracle);
        feeRecipient = _feeRecipient;
        
        _transferOwnership(msg.sender);
        
        emit ContractsInitialized(_policyStorage, _policyManager, _settlementEngine, _priceOracle);
    }
    
    /// @notice Get comprehensive policy details
    function getPolicyDetails(uint256 policyId) 
        external 
        view 
        returns (
            IPolicyStorage.Policy memory policy,
            uint256 currentPrice,
            uint256 timeRemaining,
            uint256 potentialSellerPayout,
            uint256 potentialBuyerPayout,
            bool canSettle
        ) 
    {
        policy = policyStorage.getPolicy(policyId);
        
        // Get current price if available
        try priceOracle.getPrice(policy.tokenSymbol) returns (uint256 price) {
            currentPrice = price;
        } catch {
            currentPrice = 0;
        }
        
        // Calculate time remaining
        if (policy.state == IPolicyStorage.PolicyState.Active && policy.expiryTimestamp > block.timestamp) {
            timeRemaining = policy.expiryTimestamp - block.timestamp;
        } else {
            timeRemaining = 0;
        }
        
        // Calculate potential payouts
        (potentialSellerPayout, potentialBuyerPayout) = settlementEngine.calculatePotentialPayouts(policyId);
        
        // Check if can settle
        canSettle = settlementEngine.canSettle(policyId);
    }
    
    /// @notice Collect platform fees (called by policy manager)
    function collectFees(IERC20 token, uint256 amount) external {
        require(msg.sender == address(policyManager), "Only policy manager");
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        feesCollected[address(token)] += amount;
    }
    
    /// @notice Withdraw collected fees (owner only)
    function withdrawFees(IERC20 token, uint256 amount) external onlyOwner {
        if (amount > feesCollected[address(token)]) revert InsufficientBalance();
        
        feesCollected[address(token)] -= amount;
        token.safeTransfer(feeRecipient, amount);
        
        emit FeesWithdrawn(address(token), feeRecipient, amount);
    }
    
    /// @notice Emergency token withdrawal (owner only)
    function emergencyWithdraw(IERC20 token, uint256 amount) external onlyOwner {
        if (amount > token.balanceOf(address(this))) revert InsufficientBalance();
        
        token.safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(address(token), amount);
    }
    
    /// @notice Update fee recipient (owner only)
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        if (newFeeRecipient == address(0)) revert InvalidAddress();
        
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }
    
    /// @notice Get protocol statistics
    function getProtocolStats() external view returns (
        uint256 totalOpenPolicies,
        uint256 totalPoliciesCreated,
        bool oracleHealthy
    ) {
        totalOpenPolicies = policyManager.getOpenPolicyIds().length;
        totalPoliciesCreated = policyStorage.getNextPolicyId() - 1;
        oracleHealthy = priceOracle.isHealthy();
    }
    
    /// @notice Pause all contracts (owner only)
    function pauseAll() external onlyOwner {
        _pause();
        // Note: Individual contracts need to be paused separately by their owners
    }
    
    /// @notice Unpause all contracts (owner only)
    function unpauseAll() external onlyOwner {
        _unpause();
        // Note: Individual contracts need to be unpaused separately by their owners
    }
}
