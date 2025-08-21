"""
FOMO Insurance Protocol Integration for Mantle Vault Agent

This module integrates the Mantle Vault Agent with your FOMO Insurance protocol
to automatically manage fund allocation based on policy activity and requirements.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from decimal import Decimal

from web3 import Web3
from web3.exceptions import ContractLogicError
from eth_abi import decode_abi

# Import your main agent
from mantle_vault_agent import MantleVaultAgent, MantleConfig

logger = logging.getLogger(__name__)

# ==============================================================================
# FOMO INSURANCE PROTOCOL DATA STRUCTURES
# ==============================================================================

@dataclass
class PolicyInfo:
    """Information about a FOMO Insurance policy"""
    policy_id: int
    seller: str
    buyer: Optional[str]
    token: str
    token_symbol: str
    amount: float
    payout_token: str
    payout_amount: float
    duration: int
    upside_share_bps: int
    entry_price: float
    start_timestamp: Optional[int]
    expiry_timestamp: Optional[int]
    state: str  # Open, Active, Settled, Cancelled
    
    @property
    def is_active(self) -> bool:
        return self.state == "Active"
    
    @property
    def time_to_expiry(self) -> Optional[int]:
        if self.expiry_timestamp:
            return max(0, self.expiry_timestamp - int(datetime.now().timestamp()))
        return None
    
    @property
    def required_reserve(self) -> float:
        """Calculate required reserve for this policy"""
        if self.is_active:
            return self.payout_amount
        return 0.0

@dataclass
class ProtocolSnapshot:
    """Snapshot of the FOMO Insurance protocol state"""
    total_policies: int
    active_policies: List[PolicyInfo]
    open_policies: List[PolicyInfo]
    total_reserves_required: float
    available_liquidity: float
    pending_settlements: List[PolicyInfo]
    timestamp: datetime

# ==============================================================================
# FOMO INSURANCE MONITOR
# ==============================================================================

class FOMOInsuranceMonitor:
    """Monitors the FOMO Insurance protocol for events and state changes"""
    
    def __init__(self, config: MantleConfig, web3: Web3):
        self.config = config
        self.w3 = web3
        self.contracts = self._load_contracts()
        self.last_block_processed = 0
        
        # Event signatures for monitoring
        self.event_signatures = {
            'PolicyCreated': '0x1234...', # Replace with actual signature
            'PolicyPurchased': '0x5678...', # Replace with actual signature
            'PolicySettled': '0x9abc...',  # Replace with actual signature
        }
        
    def _load_contracts(self):
        """Load FOMO Insurance contract objects"""
        # Simplified ABI - you'd load the full ABI
        fomo_abi = [
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "policyId", "type": "uint256"},
                    {"indexed": True, "name": "seller", "type": "address"},
                    {"indexed": True, "name": "token", "type": "address"},
                    {"indexed": False, "name": "amount", "type": "uint256"},
                    {"indexed": False, "name": "payoutAmount", "type": "uint256"},
                    {"indexed": False, "name": "duration", "type": "uint256"},
                    {"indexed": False, "name": "upsideShareBps", "type": "uint16"}
                ],
                "name": "PolicyCreated",
                "type": "event"
            }
        ]
        
        return {
            'fomo_insurance': self.w3.eth.contract(
                address=self.config.FOMO_INSURANCE,
                abi=fomo_abi
            ),
            'policy_manager': self.w3.eth.contract(
                address=self.config.POLICY_MANAGER, 
                abi=fomo_abi
            ),
            'policy_storage': self.w3.eth.contract(
                address=self.config.POLICY_STORAGE,
                abi=fomo_abi
            )
        }
    
    async def get_protocol_snapshot(self) -> ProtocolSnapshot:
        """Get current state of the FOMO Insurance protocol"""
        try:
            # Get open policies
            open_policy_ids = await self._get_open_policy_ids()
            open_policies = []
            for policy_id in open_policy_ids:
                policy = await self._get_policy_info(policy_id)
                if policy:
                    open_policies.append(policy)
            
            # Get active policies (would need to track separately or query events)
            active_policies = []
            
            # Calculate metrics
            total_reserves_required = sum(p.required_reserve for p in active_policies)
            available_liquidity = await self._get_available_liquidity()
            
            return ProtocolSnapshot(
                total_policies=len(open_policies) + len(active_policies),
                active_policies=active_policies,
                open_policies=open_policies,
                total_reserves_required=total_reserves_required,
                available_liquidity=available_liquidity,
                pending_settlements=[],  # Would calculate based on expiry times
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error getting protocol snapshot: {e}")
            return ProtocolSnapshot(0, [], [], 0.0, 0.0, [], datetime.now())
    
    async def _get_open_policy_ids(self) -> List[int]:
        """Get list of open policy IDs"""
        try:
            # This would call your PolicyManager contract
            result = self.contracts['policy_manager'].functions.getOpenPolicyIds().call()
            return result
        except Exception as e:
            logger.error(f"Error getting open policy IDs: {e}")
            return []
    
    async def _get_policy_info(self, policy_id: int) -> Optional[PolicyInfo]:
        """Get detailed information about a policy"""
        try:
            # This would call your PolicyStorage contract
            policy_data = self.contracts['policy_storage'].functions.getPolicy(policy_id).call()
            
            # Convert to PolicyInfo object (adjust based on your contract structure)
            return PolicyInfo(
                policy_id=policy_id,
                seller=policy_data[0],
                buyer=policy_data[1] if policy_data[1] != "0x0000000000000000000000000000000000000000" else None,
                token=policy_data[2],
                token_symbol=policy_data[3],
                amount=policy_data[4] / 10**18,  # Adjust decimals
                payout_token=policy_data[5],
                payout_amount=policy_data[6] / 10**6,  # USDC decimals
                duration=policy_data[7],
                upside_share_bps=policy_data[8],
                entry_price=policy_data[9] / 10**8,  # Price decimals
                start_timestamp=policy_data[10] if policy_data[10] > 0 else None,
                expiry_timestamp=policy_data[11] if policy_data[11] > 0 else None,
                state=["Open", "Active", "Settled", "Cancelled"][policy_data[12]]
            )
            
        except Exception as e:
            logger.error(f"Error getting policy info for {policy_id}: {e}")
            return None
    
    async def _get_available_liquidity(self) -> float:
        """Get available liquidity in the vault"""
        try:
            # Get USDC balance of the FOMO Insurance contract
            usdc_contract = self.w3.eth.contract(
                address=self.config.MOCK_USDC,
                abi=[{
                    "constant": True,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }]
            )
            
            balance_wei = usdc_contract.functions.balanceOf(self.config.FOMO_INSURANCE).call()
            return balance_wei / 10**6  # USDC decimals
            
        except Exception as e:
            logger.error(f"Error getting available liquidity: {e}")
            return 0.0

# ==============================================================================
# INTEGRATED VAULT AGENT
# ==============================================================================

class IntegratedMantleVaultAgent(MantleVaultAgent):
    """
    Enhanced Mantle Vault Agent that integrates with FOMO Insurance protocol
    to optimize fund allocation based on policy requirements and market conditions.
    """
    
    def __init__(self):
        super().__init__()
        self.fomo_monitor = FOMOInsuranceMonitor(self.config, self.web3_manager.w3)
        self.reserve_ratio = 0.15  # Keep 15% in reserves for policy payouts
        self.last_protocol_snapshot = None
        
    async def enhanced_monitoring_loop(self):
        """Enhanced monitoring that considers FOMO Insurance protocol state"""
        logger.info("🚀 Starting Enhanced Mantle Vault Agent with FOMO Integration...")
        
        while self.running:
            try:
                # Get current protocol state
                protocol_snapshot = await self.fomo_monitor.get_protocol_snapshot()
                self.last_protocol_snapshot = protocol_snapshot
                
                # Calculate optimal fund allocation
                allocation_strategy = await self._calculate_integrated_allocation(protocol_snapshot)
                
                # Execute allocation if needed
                if allocation_strategy['should_rebalance']:
                    await self._execute_integrated_rebalance(allocation_strategy)
                
                # Log status
                logger.info(f"📊 Protocol Status: {len(protocol_snapshot.active_policies)} active policies, "
                           f"${protocol_snapshot.total_reserves_required:,.2f} reserves required")
                
                # Wait for next cycle
                await asyncio.sleep(self.config.DELTA_T_HOURS * 3600)
                
            except Exception as e:
                logger.error(f"Error in enhanced monitoring loop: {e}")
                await asyncio.sleep(60)
    
    async def _calculate_integrated_allocation(self, snapshot: ProtocolSnapshot) -> Dict:
        """Calculate optimal allocation considering FOMO Insurance requirements"""
        
        # Base allocation calculation
        total_funds = snapshot.available_liquidity
        required_reserves = snapshot.total_reserves_required
        
        # Ensure we have enough reserves + buffer
        safety_buffer = required_reserves * 0.2  # 20% safety buffer
        total_reserves_needed = required_reserves + safety_buffer
        
        # Available funds for strategies
        deployable_funds = max(0, total_funds - total_reserves_needed)
        
        # Calculate reserve ratio
        current_reserve_ratio = total_reserves_needed / total_funds if total_funds > 0 else 0
        
        # Get strategy APYs
        strategy_apys = {}
        for strategy_name in ["init_looping", "circuit_vault", "mnt_staking"]:
            apy = await self.strategy_manager.get_strategy_apy(strategy_name)
            strategy_apys[strategy_name] = apy
        
        # Determine if rebalancing is needed
        should_rebalance = False
        reasons = []
        
        # Check if reserve ratio is adequate
        if current_reserve_ratio < self.reserve_ratio:
            should_rebalance = True
            reasons.append("Insufficient reserves for policy coverage")
        
        # Check for significant APY changes
        apy_spread = max(strategy_apys.values()) - min(strategy_apys.values())
        if apy_spread > self.config.MIN_REALLOCATION_THRESHOLD:
            should_rebalance = True
            reasons.append(f"APY spread of {apy_spread:.2f}% detected")
        
        # Check for upcoming policy expirations (might free up reserves)
        upcoming_expirations = [p for p in snapshot.active_policies 
                              if p.time_to_expiry and p.time_to_expiry < 3600]  # 1 hour
        if upcoming_expirations:
            should_rebalance = True
            reasons.append(f"{len(upcoming_expirations)} policies expiring soon")
        
        # Calculate optimal strategy allocation for deployable funds
        if deployable_funds > 0:
            # Risk-adjusted allocation based on policy activity
            risk_multiplier = 1.0
            if len(snapshot.active_policies) > 10:  # High policy activity
                risk_multiplier = 0.8  # More conservative
            elif len(snapshot.active_policies) < 3:  # Low policy activity
                risk_multiplier = 1.2  # More aggressive
            
            # Base allocation percentages
            base_allocation = {
                "init_looping": 0.45 * risk_multiplier,
                "circuit_vault": 0.35,
                "mnt_staking": 0.20
            }
            
            # Normalize allocations
            total_allocation = sum(base_allocation.values())
            optimal_allocation = {k: (v / total_allocation) * 100 
                                for k, v in base_allocation.items()}
        else:
            optimal_allocation = {"init_looping": 0, "circuit_vault": 0, "mnt_staking": 0}
        
        return {
            "should_rebalance": should_rebalance,
            "reasons": reasons,
            "total_funds": total_funds,
            "required_reserves": required_reserves,
            "safety_buffer": safety_buffer,
            "deployable_funds": deployable_funds,
            "current_reserve_ratio": current_reserve_ratio,
            "strategy_apys": strategy_apys,
            "optimal_allocation": optimal_allocation,
            "upcoming_expirations": len(upcoming_expirations)
        }
    
    async def _execute_integrated_rebalance(self, strategy: Dict):
        """Execute rebalancing with FOMO Insurance considerations"""
        logger.info(f"🔄 Executing integrated rebalance. Reasons: {', '.join(strategy['reasons'])}")
        
        try:
            # First, ensure adequate reserves
            await self._ensure_adequate_reserves(strategy['required_reserves'] + strategy['safety_buffer'])
            
            # Then allocate remaining funds to strategies
            if strategy['deployable_funds'] > 0:
                for strategy_name, allocation_pct in strategy['optimal_allocation'].items():
                    if allocation_pct > 0:
                        amount = (strategy['deployable_funds'] * allocation_pct) / 100
                        result = await self.strategy_manager.deploy_to_strategy(strategy_name, amount)
                        
                        if result['success']:
                            logger.info(f"✅ Deployed ${amount:,.2f} to {strategy_name}")
                        else:
                            logger.error(f"❌ Failed to deploy to {strategy_name}: {result['error']}")
            
            # Update vault state
            self.vault_state.last_rebalance = datetime.now()
            
            logger.info("✅ Integrated rebalance completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error executing integrated rebalance: {e}")
    
    async def _ensure_adequate_reserves(self, required_amount: float):
        """Ensure adequate reserves are available for policy payouts"""
        current_balance = self.web3_manager.get_balance("USDC", self.config.FOMO_INSURANCE)
        
        if current_balance < required_amount:
            shortfall = required_amount - current_balance
            logger.info(f"💰 Reserve shortfall detected: ${shortfall:,.2f}. Withdrawing from strategies...")
            
            # Withdraw from strategies to cover shortfall
            # Start with lowest APY strategy first
            strategies_by_apy = sorted(
                [(name, await self.strategy_manager.get_strategy_apy(name)) 
                 for name in ["init_looping", "circuit_vault", "mnt_staking"]],
                key=lambda x: x[1]
            )
            
            remaining_shortfall = shortfall
            for strategy_name, apy in strategies_by_apy:
                if remaining_shortfall <= 0:
                    break
                
                # Withdraw up to the remaining shortfall
                withdraw_amount = min(remaining_shortfall, shortfall * 0.5)  # Conservative withdrawal
                result = await self.strategy_manager.withdraw_from_strategy(strategy_name, withdraw_amount)
                
                if result['success']:
                    remaining_shortfall -= withdraw_amount
                    logger.info(f"💸 Withdrew ${withdraw_amount:,.2f} from {strategy_name}")
    
    async def handle_policy_event(self, event_type: str, policy_id: int, event_data: Dict):
        """Handle specific FOMO Insurance policy events"""
        logger.info(f"📝 Handling policy event: {event_type} for policy {policy_id}")
        
        if event_type == "PolicyCreated":
            # New policy created - might affect allocation
            await self._on_policy_created(policy_id, event_data)
            
        elif event_type == "PolicyPurchased":
            # Policy purchased - reserves now needed
            await self._on_policy_purchased(policy_id, event_data)
            
        elif event_type == "PolicySettled":
            # Policy settled - reserves freed up
            await self._on_policy_settled(policy_id, event_data)
    
    async def _on_policy_created(self, policy_id: int, event_data: Dict):
        """Handle new policy creation"""
        # Policy is now open for purchase - no immediate action needed
        logger.info(f"📋 New policy {policy_id} created and available for purchase")
    
    async def _on_policy_purchased(self, policy_id: int, event_data: Dict):
        """Handle policy purchase - increase reserves"""
        policy = await self.fomo_monitor._get_policy_info(policy_id)
        if policy:
            logger.info(f"💼 Policy {policy_id} purchased - reserving ${policy.payout_amount:,.2f}")
            
            # Trigger rebalance to ensure adequate reserves
            snapshot = await self.fomo_monitor.get_protocol_snapshot()
            allocation_strategy = await self._calculate_integrated_allocation(snapshot)
            
            if allocation_strategy['current_reserve_ratio'] < self.reserve_ratio:
                await self._execute_integrated_rebalance(allocation_strategy)
    
    async def _on_policy_settled(self, policy_id: int, event_data: Dict):
        """Handle policy settlement - free up reserves"""
        logger.info(f"✅ Policy {policy_id} settled - reserves freed for reallocation")
        
        # Trigger rebalance to reallocate freed reserves
        snapshot = await self.fomo_monitor.get_protocol_snapshot()
        allocation_strategy = await self._calculate_integrated_allocation(snapshot)
        
        if allocation_strategy['deployable_funds'] > 1000:  # Minimum threshold
            await self._execute_integrated_rebalance(allocation_strategy)
    
    async def get_integrated_dashboard_data(self) -> Dict:
        """Get comprehensive dashboard data including FOMO Insurance metrics"""
        base_data = await super().get_dashboard_data()
        
        if self.last_protocol_snapshot:
            fomo_data = {
                "total_policies": self.last_protocol_snapshot.total_policies,
                "active_policies": len(self.last_protocol_snapshot.active_policies),
                "open_policies": len(self.last_protocol_snapshot.open_policies),
                "total_reserves_required": self.last_protocol_snapshot.total_reserves_required,
                "available_liquidity": self.last_protocol_snapshot.available_liquidity,
                "reserve_ratio": (self.last_protocol_snapshot.total_reserves_required / 
                                self.last_protocol_snapshot.available_liquidity 
                                if self.last_protocol_snapshot.available_liquidity > 0 else 0),
                "pending_settlements": len(self.last_protocol_snapshot.pending_settlements)
            }
            
            base_data["fomo_insurance"] = fomo_data
        
        return base_data

# ==============================================================================
# MAIN INTEGRATION RUNNER
# ==============================================================================

async def run_integrated_agent():
    """Run the integrated Mantle Vault Agent with FOMO Insurance protocol"""
    
    # Initialize the integrated agent
    agent = IntegratedMantleVaultAgent()
    
    logger.info("🎯 Starting Integrated Mantle Vault Agent with FOMO Insurance support")
    logger.info(f"📊 Monitoring contracts:")
    logger.info(f"   FOMO Insurance: {agent.config.FOMO_INSURANCE}")
    logger.info(f"   Policy Manager: {agent.config.POLICY_MANAGER}")
    logger.info(f"   Policy Storage: {agent.config.POLICY_STORAGE}")
    
    try:
        # Start the enhanced monitoring loop
        await agent.enhanced_monitoring_loop()
        
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down integrated agent...")
        agent.stop_monitoring()
    except Exception as e:
        logger.error(f"❌ Error running integrated agent: {e}")

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run the integrated agent
    asyncio.run(run_integrated_agent())