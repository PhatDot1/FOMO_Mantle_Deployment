// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISettlementEngine} from "../interfaces/ISettlementEngine.sol";
import {IPolicyStorage} from "../interfaces/IPolicyStorage.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";

/// @title SettlementEngine
/// @notice Handles policy settlement and payout calculations
contract SettlementEngine is ISettlementEngine, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    /// @notice Contract dependencies
    IPolicyStorage public immutable policyStorage;
    IPriceOracle public immutable priceOracle;
    
    /// @notice Constants
    uint16 public constant MAX_BPS = 10000;
    
    /// @notice Events
    event PolicySettled(
        uint256 indexed policyId,
        uint256 entryPrice,
        uint256 exitPrice,
        uint256 sellerPayout,
        uint256 buyerPayout
    );
    
    /// @notice Errors
    error PolicyNotActive();
    error PolicyNotExpired();
    error PriceNotAvailable();
    error InvalidPolicyId();
    
    constructor(
        address _policyStorage,
        address _priceOracle
    ) {
        require(_policyStorage != address(0), "Invalid storage address");
        require(_priceOracle != address(0), "Invalid oracle address");
        
        policyStorage = IPolicyStorage(_policyStorage);
        priceOracle = IPriceOracle(_priceOracle);
        
        _transferOwnership(msg.sender);
    }
    
    /// @inheritdoc ISettlementEngine
    function settlePolicy(uint256 policyId) external override nonReentrant {
        IPolicyStorage.Policy memory policy = policyStorage.getPolicy(policyId);
        
        if (policy.state != IPolicyStorage.PolicyState.Active) revert PolicyNotActive();
        if (block.timestamp < policy.expiryTimestamp) revert PolicyNotExpired();
        
        // Get exit price from RedStone oracle
        uint256 exitPrice;
        try priceOracle.getPrice(policy.tokenSymbol) returns (uint256 price) {
            exitPrice = price;
        } catch {
            revert PriceNotAvailable();
        }
        
        // Calculate payouts
        (uint256 sellerPayout, uint256 buyerPayout) = _calculatePayouts(policy, exitPrice);
        
        // Execute transfers
        if (sellerPayout > 0) {
            policy.token.safeTransfer(policy.seller, sellerPayout);
        }
        if (buyerPayout > 0) {
            policy.token.safeTransfer(policy.buyer, buyerPayout);
        }
        
        // Update policy state
        policy.state = IPolicyStorage.PolicyState.Settled;
        policyStorage.setPolicy(policyId, policy);
        
        emit PolicySettled(policyId, policy.entryPrice, exitPrice, sellerPayout, buyerPayout);
    }
    
    /// @inheritdoc ISettlementEngine
    function emergencySettlePolicy(uint256 policyId, uint256 exitPrice) external override onlyOwner nonReentrant {
        IPolicyStorage.Policy memory policy = policyStorage.getPolicy(policyId);
        
        if (policy.state != IPolicyStorage.PolicyState.Active) revert PolicyNotActive();
        
        // Calculate payouts
        (uint256 sellerPayout, uint256 buyerPayout) = _calculatePayouts(policy, exitPrice);
        
        // Execute transfers
        if (sellerPayout > 0) {
            policy.token.safeTransfer(policy.seller, sellerPayout);
        }
        if (buyerPayout > 0) {
            policy.token.safeTransfer(policy.buyer, buyerPayout);
        }
        
        // Update policy state
        policy.state = IPolicyStorage.PolicyState.Settled;
        policyStorage.setPolicy(policyId, policy);
        
        emit PolicySettled(policyId, policy.entryPrice, exitPrice, sellerPayout, buyerPayout);
    }
    
    /// @inheritdoc ISettlementEngine
    function canSettle(uint256 policyId) external view override returns (bool) {
        IPolicyStorage.Policy memory policy = policyStorage.getPolicy(policyId);
        return policy.state == IPolicyStorage.PolicyState.Active && 
               block.timestamp >= policy.expiryTimestamp;
    }
    
    /// @inheritdoc ISettlementEngine
    function calculatePotentialPayouts(uint256 policyId) external view override returns (uint256 sellerPayout, uint256 buyerPayout) {
        IPolicyStorage.Policy memory policy = policyStorage.getPolicy(policyId);
        
        if (policy.state != IPolicyStorage.PolicyState.Active) {
            return (0, 0);
        }
        
        // Try to get current price
        try priceOracle.getPrice(policy.tokenSymbol) returns (uint256 currentPrice) {
            return _calculatePayouts(policy, currentPrice);
        } catch {
            // If price not available, assume no change
            return (0, policy.amount);
        }
    }
    
    /// @notice Internal function to calculate payouts based on price change
    function _calculatePayouts(
        IPolicyStorage.Policy memory policy,
        uint256 exitPrice
    ) internal pure returns (uint256 sellerPayout, uint256 buyerPayout) {
        if (exitPrice > policy.entryPrice) {
            // Price increased - calculate upside split
            uint256 priceGainPct = ((exitPrice - policy.entryPrice) * MAX_BPS) / policy.entryPrice;
            uint256 totalGainValue = (policy.amount * priceGainPct) / MAX_BPS;
            sellerPayout = (totalGainValue * policy.upsideShareBps) / MAX_BPS;
            buyerPayout = policy.amount - sellerPayout;
        } else {
            // Price decreased or stayed same - buyer gets all tokens
            sellerPayout = 0;
            buyerPayout = policy.amount;
        }
    }
}
