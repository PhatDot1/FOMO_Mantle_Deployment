// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IPolicyManager} from "../interfaces/IPolicyManager.sol";
import {IPolicyStorage} from "../interfaces/IPolicyStorage.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";

/// @title PolicyManager
/// @notice Manages policy creation, cancellation, and marketplace functionality
contract PolicyManager is IPolicyManager, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    /// @notice Contract dependencies
    IPolicyStorage public immutable policyStorage;
    IPriceOracle public immutable priceOracle;
    
    /// @notice Marketplace data
    uint256[] public openPolicyIds;
    mapping(uint256 => uint256) public openPolicyIndex; // policyId => index in openPolicyIds
    mapping(address => uint256[]) public userPolicies;
    
    /// @notice Supported tokens
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public supportedPayoutTokens;
    mapping(address => string) public tokenSymbols; // token address => symbol
    
    /// @notice Constants
    uint16 public constant MAX_BPS = 10000;
    uint256 public constant PRICE_PRECISION = 1e8; // RedStone uses 8 decimals
    
    /// @notice Events
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 payoutAmount,
        uint256 duration,
        uint16 upsideShareBps
    );
    event PolicyCancelled(uint256 indexed policyId, address indexed seller);
    event TokenSupportUpdated(address indexed token, string symbol, bool supported);
    event PayoutTokenSupportUpdated(address indexed token, bool supported);
    
    /// @notice Errors
    error InvalidParameters();
    error UnsupportedToken();
    error PolicyNotOpen();
    error Unauthorized();
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
    
    /// @inheritdoc IPolicyManager
    function createPolicy(
        IERC20 token,
        string memory tokenSymbol,
        uint256 amount,
        IERC20 payoutToken,
        uint16 payoutBps,
        uint256 duration,
        uint16 upsideShareBps
    ) external override nonReentrant whenNotPaused returns (uint256 policyId) {
        // Validate parameters
        _validatePolicyParameters(address(token), address(payoutToken), amount, payoutBps, duration, upsideShareBps);
        
        // Get current price from RedStone oracle
        uint256 entryPrice;
        try priceOracle.getPrice(tokenSymbol) returns (uint256 price) {
            entryPrice = price;
        } catch {
            revert PriceNotAvailable();
        }
        
        // Calculate payout amount
        uint256 tokenDecimals = _getTokenDecimals(address(token));
        uint256 payoutTokenDecimals = _getTokenDecimals(address(payoutToken));
        uint256 totalValue = (amount * entryPrice) / (10 ** (tokenDecimals + PRICE_PRECISION - payoutTokenDecimals));
        uint256 payoutAmount = (totalValue * payoutBps) / MAX_BPS;
        
        // Transfer tokens from seller to this contract
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = token.balanceOf(address(this));
        require(balanceAfter - balanceBefore == amount, "Transfer amount mismatch");
        
        // Create policy in storage
        IPolicyStorage.Policy memory policy = IPolicyStorage.Policy({
            seller: msg.sender,
            buyer: address(0),
            token: token,
            tokenSymbol: tokenSymbol,
            amount: amount,
            payoutToken: payoutToken,
            payoutAmount: payoutAmount,
            duration: duration,
            upsideShareBps: upsideShareBps,
            entryPrice: entryPrice,
            startTimestamp: 0,
            expiryTimestamp: 0,
            state: IPolicyStorage.PolicyState.Open
        });
        
        policyId = policyStorage.addPolicy(policy);
        
        // Add to marketplace and user tracking
        openPolicyIds.push(policyId);
        openPolicyIndex[policyId] = openPolicyIds.length - 1;
        userPolicies[msg.sender].push(policyId);
        
        emit PolicyCreated(
            policyId,
            msg.sender,
            address(token),
            amount,
            payoutAmount,
            duration,
            upsideShareBps
        );
    }
    
    /// @inheritdoc IPolicyManager
    function purchasePolicy(uint256 policyId) external override nonReentrant whenNotPaused {
        IPolicyStorage.Policy memory policy = policyStorage.getPolicy(policyId);
        
        if (policy.state != IPolicyStorage.PolicyState.Open) revert PolicyNotOpen();
        if (policy.seller == msg.sender) revert Unauthorized();
        
        // Calculate platform fee
        IPolicyStorage.Config memory config = policyStorage.getConfig();
        uint256 platformFee = (policy.payoutAmount * config.platformFeeBps) / MAX_BPS;
        uint256 sellerPayout = policy.payoutAmount - platformFee;
        
        // Transfer payout tokens from buyer to seller (minus fee)
        policy.payoutToken.safeTransferFrom(msg.sender, policy.seller, sellerPayout);
        
        // Transfer platform fee to main contract (will be handled by main contract)
        if (platformFee > 0) {
            policy.payoutToken.safeTransferFrom(msg.sender, owner(), platformFee);
        }
        
        // Update policy state
        policy.buyer = msg.sender;
        policy.startTimestamp = block.timestamp;
        policy.expiryTimestamp = block.timestamp + policy.duration;
        policy.state = IPolicyStorage.PolicyState.Active;
        
        policyStorage.setPolicy(policyId, policy);
        
        // Remove from open policies and add to buyer's policies
        _removeFromOpenPolicies(policyId);
        userPolicies[msg.sender].push(policyId);
    }
    
    /// @inheritdoc IPolicyManager
    function cancelPolicy(uint256 policyId) external override nonReentrant {
        IPolicyStorage.Policy memory policy = policyStorage.getPolicy(policyId);
        
        if (policy.seller != msg.sender) revert Unauthorized();
        if (policy.state != IPolicyStorage.PolicyState.Open) revert PolicyNotOpen();
        
        // Return tokens to seller
        policy.token.safeTransfer(policy.seller, policy.amount);
        
        // Update policy state
        policy.state = IPolicyStorage.PolicyState.Cancelled;
        policyStorage.setPolicy(policyId, policy);
        
        // Remove from open policies
        _removeFromOpenPolicies(policyId);
        
        emit PolicyCancelled(policyId, policy.seller);
    }
    
    /// @inheritdoc IPolicyManager
    function getOpenPolicyIds() external view override returns (uint256[] memory) {
        return openPolicyIds;
    }
    
    /// @inheritdoc IPolicyManager
    function getUserPolicies(address user) external view override returns (uint256[] memory) {
        return userPolicies[user];
    }
    
    /// @notice Set token support (owner only)
    function setTokenSupport(address token, string memory symbol, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        if (supported) {
            tokenSymbols[token] = symbol;
        }
        emit TokenSupportUpdated(token, symbol, supported);
    }
    
    /// @notice Set payout token support (owner only)
    function setPayoutTokenSupport(address token, bool supported) external onlyOwner {
        supportedPayoutTokens[token] = supported;
        emit PayoutTokenSupportUpdated(token, supported);
    }
    
    /// @notice Pause contract (owner only)
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract (owner only)
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Internal function to validate policy parameters
    function _validatePolicyParameters(
        address token,
        address payoutToken,
        uint256 amount,
        uint16 payoutBps,
        uint256 duration,
        uint16 upsideShareBps
    ) internal view {
        IPolicyStorage.Config memory config = policyStorage.getConfig();
        
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (!supportedPayoutTokens[payoutToken]) revert UnsupportedToken();
        if (amount == 0) revert InvalidParameters();
        if (payoutBps < config.minPayoutBps || payoutBps > config.maxPayoutBps) revert InvalidParameters();
        if (duration < config.minDuration || duration > config.maxDuration) revert InvalidParameters();
        if (upsideShareBps < config.minUpsideShareBps || upsideShareBps > config.maxUpsideShareBps) revert InvalidParameters();
    }
    
    /// @notice Internal function to remove policy from open policies array
    function _removeFromOpenPolicies(uint256 policyId) internal {
        uint256 index = openPolicyIndex[policyId];
        uint256 lastPolicyId = openPolicyIds[openPolicyIds.length - 1];
        
        openPolicyIds[index] = lastPolicyId;
        openPolicyIndex[lastPolicyId] = index;
        
        openPolicyIds.pop();
        delete openPolicyIndex[policyId];
    }
    
    /// @notice Internal function to get token decimals
    function _getTokenDecimals(address token) internal view returns (uint256) {
        try IERC20Metadata(token).decimals() returns (uint8 d) {
            return d;
        } catch {
            return 18;
        }
    }
}
