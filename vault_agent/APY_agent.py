import os
import json
import time
import asyncio
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging

# Web3 and DeFi
from web3 import Web3
from web3.exceptions import ContractLogicError
import requests

# LangChain and LangGraph
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict

# Environment and utilities
from dotenv import load_dotenv
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# ==============================================================================
# CONFIGURATION AND CONSTANTS
# ==============================================================================

@dataclass
class MantleConfig:
    """Configuration for Mantle Network and contracts"""
    # Network Configuration
    RPC_URL: str = "https://rpc.sepolia.mantle.xyz"
    CHAIN_ID: int = 5003
    BLOCK_TIME: float = 2.0  # seconds
    
    # Contract Addresses
    MOCK_WETH: str = "0xEBcBae3E66F30C5Cb6585ea9C31E09bBE8591a61"
    MOCK_USDC: str = "0x5E618eBBFD1e69B7909d14e607acadccac626B4E"
    MOCK_MNT: str = "0xD55030D27553c974133Fd71c096c1fF400DC6e25"
    PRICE_ORACLE: str = "0xD6c7693c122dF70E3e8807411222d4aC60069b00"
    POLICY_STORAGE: str = "0x8575B0C8567aeEe60cbD260A1b946eb94Dbe8c7F"
    POLICY_MANAGER: str = "0x0737364BbEB5Da199CA3fb43409f7325E2E94521"
    SETTLEMENT_ENGINE: str = "0xB497fa96BC5eABC698672Cf5B4b3489f5Db6Ccf8"
    FOMO_INSURANCE: str = "0xcDE6374279E133F82cf6e051a665e5740c1C4612"
    
    # Strategy Contract Addresses (Mock addresses for demonstration)
    INIT_CAPITAL: str = "0x1111111111111111111111111111111111111111"  # INIT Capital
    CIRCUIT_PROTOCOL: str = "0x2222222222222222222222222222222222222222"  # Circuit
    MNT_STAKING: str = "0x3333333333333333333333333333333333333333"  # MNT Staking
    
    # Agent Configuration
    DELTA_T_HOURS: int = 6  # Time window for APY tracking
    MIN_REALLOCATION_THRESHOLD: float = 0.5  # 0.5% APY difference
    MAX_SLIPPAGE: float = 0.02  # 2% max slippage
    SAFETY_BUFFER: float = 0.1  # 10% safety buffer

@dataclass
class StrategyData:
    """Data structure for strategy information"""
    name: str
    address: str
    current_apy: float
    historical_apy: List[float]
    tvl: float
    allocation: float
    risk_score: float
    last_updated: datetime
    
    def get_average_apy(self, window_hours: int = 24) -> float:
        """Get average APY over specified window"""
        if not self.historical_apy:
            return self.current_apy
        return sum(self.historical_apy[-window_hours:]) / len(self.historical_apy[-window_hours:])

@dataclass 
class VaultState:
    """Current state of the vault"""
    total_value: float
    available_balance: float
    strategies: Dict[str, StrategyData]
    last_rebalance: datetime
    performance_metrics: Dict[str, Any]
    pending_policies: List[Dict]

# ==============================================================================
# WEB3 AND CONTRACT SETUP
# ==============================================================================

class MantleWeb3Manager:
    """Manages Web3 connections and contract interactions for Mantle Network"""
    
    def __init__(self, config: MantleConfig):
        self.config = config
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))
        self.agent_account = self.w3.eth.account.from_key(os.getenv("AGENT_PRIVATE_KEY"))
        self.contracts = {}
        self._load_contracts()
        
    def _load_contracts(self):
        """Load contract ABIs and create contract objects"""
        # Load ABIs (simplified for demo - you'd load from actual ABI files)
        erc20_abi = [
            {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": False,
                "inputs": [
                    {"name": "_to", "type": "address"},
                    {"name": "_value", "type": "uint256"}
                ],
                "name": "transfer",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            },
            {
                "constant": False,
                "inputs": [
                    {"name": "_spender", "type": "address"},
                    {"name": "_value", "type": "uint256"}
                ],
                "name": "approve",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            }
        ]
        
        # Create contract objects
        self.contracts = {
            "USDC": self.w3.eth.contract(address=self.config.MOCK_USDC, abi=erc20_abi),
            "WETH": self.w3.eth.contract(address=self.config.MOCK_WETH, abi=erc20_abi),
            "MNT": self.w3.eth.contract(address=self.config.MOCK_MNT, abi=erc20_abi),
        }
        
    def get_balance(self, token: str, address: str = None) -> float:
        """Get token balance for address"""
        if address is None:
            address = self.agent_account.address
            
        if token in self.contracts:
            balance_wei = self.contracts[token].functions.balanceOf(address).call()
            return balance_wei / (10**18 if token in ["WETH", "MNT"] else 10**6)
        return 0.0
    
    def send_transaction(self, tx_func, *args, **kwargs):
        """Send a transaction with proper gas estimation"""
        try:
            tx = tx_func(*args, **kwargs).build_transaction({
                'from': self.agent_account.address,
                'nonce': self.w3.eth.get_transaction_count(self.agent_account.address),
                'gas': 500_000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': self.config.CHAIN_ID
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.agent_account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {"success": True, "tx_hash": tx_hash.hex(), "receipt": receipt}
        except Exception as e:
            return {"success": False, "error": str(e)}

# ==============================================================================
# STRATEGY IMPLEMENTATIONS
# ==============================================================================

class StrategyManager:
    """Manages different DeFi strategies on Mantle Network"""
    
    def __init__(self, web3_manager: MantleWeb3Manager):
        self.w3m = web3_manager
        self.strategies = {
            "init_looping": INITLoopingStrategy(web3_manager),
            "circuit_vault": CircuitProtocolStrategy(web3_manager),
            "mnt_staking": MNTStakingStrategy(web3_manager)
        }
    
    async def get_strategy_apy(self, strategy_name: str) -> float:
        """Get current APY for a strategy"""
        if strategy_name in self.strategies:
            return await self.strategies[strategy_name].get_current_apy()
        return 0.0
    
    async def deploy_to_strategy(self, strategy_name: str, amount: float) -> Dict:
        """Deploy funds to a specific strategy"""
        if strategy_name in self.strategies:
            return await self.strategies[strategy_name].deposit(amount)
        return {"success": False, "error": f"Unknown strategy: {strategy_name}"}
    
    async def withdraw_from_strategy(self, strategy_name: str, amount: float) -> Dict:
        """Withdraw funds from a specific strategy"""
        if strategy_name in self.strategies:
            return await self.strategies[strategy_name].withdraw(amount)
        return {"success": False, "error": f"Unknown strategy: {strategy_name}"}

class INITLoopingStrategy:
    """INIT Capital cmETH looping strategy implementation"""
    
    def __init__(self, web3_manager: MantleWeb3Manager):
        self.w3m = web3_manager
        self.name = "INIT Capital Looping"
        self.leverage_ratio = 3.0  # 3x leverage
        
    async def get_current_apy(self) -> float:
        """Get current APY from INIT Capital looping"""
        try:
            # Simulate APY calculation based on:
            # - Supply APY for cmETH
            # - Borrow APY for USDT
            # - Leverage multiplier
            # - Current MNT rewards
            
            base_supply_apy = await self._fetch_init_supply_apy()
            borrow_apy = await self._fetch_init_borrow_apy()
            mnt_rewards_apy = await self._fetch_mnt_rewards_apy()
            
            # Leveraged APY = (Supply APY * Leverage) - (Borrow APY * (Leverage - 1)) + Rewards APY
            leveraged_apy = (base_supply_apy * self.leverage_ratio) - (borrow_apy * (self.leverage_ratio - 1)) + mnt_rewards_apy
            
            return max(0, leveraged_apy)
        except Exception as e:
            logger.error(f"Error getting INIT APY: {e}")
            return 8.5  # Fallback APY
    
    async def _fetch_init_supply_apy(self) -> float:
        """Fetch supply APY from INIT Capital"""
        # Mock implementation - would call INIT Capital API
        return 4.2 + np.random.normal(0, 0.5)
    
    async def _fetch_init_borrow_apy(self) -> float:
        """Fetch borrow APY from INIT Capital"""
        # Mock implementation
        return 6.8 + np.random.normal(0, 0.3)
    
    async def _fetch_mnt_rewards_apy(self) -> float:
        """Fetch MNT rewards APY"""
        # Mock implementation - would calculate based on MNT price and reward rate
        return 12.0 + np.random.normal(0, 1.0)
    
    async def deposit(self, amount: float) -> Dict:
        """Deposit funds and set up looping position"""
        try:
            # 1. Deposit cmETH as collateral
            # 2. Borrow USDT against cmETH
            # 3. Buy more cmETH with borrowed USDT
            # 4. Repeat for desired leverage
            
            logger.info(f"Deploying {amount} USDC to INIT looping strategy")
            
            # Simulate deployment
            await asyncio.sleep(1)  # Simulate transaction time
            
            return {
                "success": True,
                "strategy": "init_looping",
                "amount": amount,
                "leverage": self.leverage_ratio,
                "tx_hash": f"0x{'1' * 64}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def withdraw(self, amount: float) -> Dict:
        """Withdraw funds and unwind looping position"""
        try:
            logger.info(f"Withdrawing {amount} USDC from INIT looping strategy")
            
            # Simulate withdrawal
            await asyncio.sleep(1)
            
            return {
                "success": True,
                "strategy": "init_looping", 
                "amount": amount,
                "tx_hash": f"0x{'2' * 64}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class CircuitProtocolStrategy:
    """Circuit Protocol auto-compounding vault strategy"""
    
    def __init__(self, web3_manager: MantleWeb3Manager):
        self.w3m = web3_manager
        self.name = "Circuit Protocol Vault"
        
    async def get_current_apy(self) -> float:
        """Get current APY from Circuit Protocol"""
        try:
            # Circuit Protocol auto-compounding APY
            base_apy = await self._fetch_circuit_apy()
            compounding_boost = 1.15  # 15% boost from auto-compounding
            
            return base_apy * compounding_boost
        except Exception as e:
            logger.error(f"Error getting Circuit APY: {e}")
            return 6.8  # Fallback APY
    
    async def _fetch_circuit_apy(self) -> float:
        """Fetch APY from Circuit Protocol"""
        # Mock implementation - would call Circuit API
        return 5.9 + np.random.normal(0, 0.4)
    
    async def deposit(self, amount: float) -> Dict:
        """Deposit funds to Circuit vault"""
        try:
            logger.info(f"Deploying {amount} USDC to Circuit Protocol vault")
            
            # Simulate Circuit vault deposit
            await asyncio.sleep(1)
            
            return {
                "success": True,
                "strategy": "circuit_vault",
                "amount": amount,
                "vault_type": "auto_compounding",
                "tx_hash": f"0x{'3' * 64}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def withdraw(self, amount: float) -> Dict:
        """Withdraw from Circuit vault"""
        try:
            logger.info(f"Withdrawing {amount} USDC from Circuit Protocol vault")
            
            await asyncio.sleep(1)
            
            return {
                "success": True,
                "strategy": "circuit_vault",
                "amount": amount,
                "tx_hash": f"0x{'4' * 64}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class MNTStakingStrategy:
    """Native MNT staking strategy"""
    
    def __init__(self, web3_manager: MantleWeb3Manager):
        self.w3m = web3_manager
        self.name = "MNT Staking"
        
    async def get_current_apy(self) -> float:
        """Get current MNT staking APY"""
        try:
            # MNT staking rewards + network fees
            base_staking_apy = await self._fetch_mnt_staking_apy()
            network_fees_apy = await self._fetch_network_fees_apy()
            
            return base_staking_apy + network_fees_apy
        except Exception as e:
            logger.error(f"Error getting MNT staking APY: {e}")
            return 4.5  # Fallback APY
    
    async def _fetch_mnt_staking_apy(self) -> float:
        """Fetch base MNT staking APY"""
        # Mock implementation
        return 3.8 + np.random.normal(0, 0.2)
    
    async def _fetch_network_fees_apy(self) -> float:
        """Fetch network fees share APY"""
        # Mock implementation
        return 0.7 + np.random.normal(0, 0.1)
    
    async def deposit(self, amount: float) -> Dict:
        """Stake MNT tokens"""
        try:
            logger.info(f"Staking {amount} MNT")
            
            # Convert USDC to MNT first, then stake
            await asyncio.sleep(1)
            
            return {
                "success": True,
                "strategy": "mnt_staking",
                "amount": amount,
                "staking_period": "flexible",
                "tx_hash": f"0x{'5' * 64}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def withdraw(self, amount: float) -> Dict:
        """Unstake MNT tokens"""
        try:
            logger.info(f"Unstaking {amount} MNT")
            
            await asyncio.sleep(1)
            
            return {
                "success": True,
                "strategy": "mnt_staking",
                "amount": amount,
                "tx_hash": f"0x{'6' * 64}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

# ==============================================================================
# LANGGRAPH STATE AND TOOLS
# ==============================================================================

class AgentState(TypedDict):
    """State for the Mantle Vault Agent"""
    vault_state: VaultState
    strategy_performance: Dict[str, List[float]]
    rebalance_signals: List[str]
    current_time: datetime
    agent_config: MantleConfig
    messages: List[Any]

# Initialize managers
config = MantleConfig()
web3_manager = MantleWeb3Manager(config)
strategy_manager = StrategyManager(web3_manager)

@tool
async def get_vault_status() -> str:
    """Get comprehensive vault status and strategy performance"""
    try:
        vault_balance = web3_manager.get_balance("USDC", config.FOMO_INSURANCE)
        
        # Get strategy APYs
        strategy_apys = {}
        for strategy_name in ["init_looping", "circuit_vault", "mnt_staking"]:
            apy = await strategy_manager.get_strategy_apy(strategy_name)
            strategy_apys[strategy_name] = apy
        
        status = {
            "vault_balance": vault_balance,
            "strategies": strategy_apys,
            "timestamp": datetime.now().isoformat(),
            "best_strategy": max(strategy_apys.items(), key=lambda x: x[1]),
            "apy_spread": max(strategy_apys.values()) - min(strategy_apys.values())
        }
        
        return f"Vault Status: {json.dumps(status, indent=2)}"
    except Exception as e:
        return f"Error getting vault status: {e}"

@tool
async def analyze_strategy_performance(time_window_hours: int = 24) -> str:
    """Analyze strategy performance over specified time window"""
    try:
        analysis = {}
        
        for strategy_name in ["init_looping", "circuit_vault", "mnt_staking"]:
            current_apy = await strategy_manager.get_strategy_apy(strategy_name)
            
            # Mock historical performance
            historical_apy = [current_apy + np.random.normal(0, 0.5) for _ in range(time_window_hours)]
            
            analysis[strategy_name] = {
                "current_apy": current_apy,
                "avg_apy_24h": np.mean(historical_apy),
                "volatility": np.std(historical_apy),
                "trend": "up" if current_apy > np.mean(historical_apy) else "down",
                "risk_adjusted_return": current_apy / (1 + np.std(historical_apy))
            }
        
        # Find best performing strategy
        best_strategy = max(analysis.items(), key=lambda x: x[1]["risk_adjusted_return"])
        
        result = {
            "analysis_window_hours": time_window_hours,
            "strategy_analysis": analysis,
            "recommended_strategy": best_strategy[0],
            "recommendation_reason": f"Highest risk-adjusted return: {best_strategy[1]['risk_adjusted_return']:.2f}%"
        }
        
        return f"Strategy Performance Analysis: {json.dumps(result, indent=2)}"
    except Exception as e:
        return f"Error analyzing strategy performance: {e}"

@tool
async def execute_rebalance(target_allocations: Dict[str, float]) -> str:
    """Execute rebalancing across strategies"""
    try:
        current_balance = web3_manager.get_balance("USDC", config.FOMO_INSURANCE)
        
        rebalance_results = {}
        total_allocation = sum(target_allocations.values())
        
        if abs(total_allocation - 100) > 0.1:
            return "Error: Target allocations must sum to 100%"
        
        for strategy, allocation_pct in target_allocations.items():
            target_amount = (current_balance * allocation_pct) / 100
            
            if target_amount > 0:
                result = await strategy_manager.deploy_to_strategy(strategy, target_amount)
                rebalance_results[strategy] = {
                    "target_amount": target_amount,
                    "allocation_pct": allocation_pct,
                    "result": result
                }
        
        summary = {
            "total_rebalanced": current_balance,
            "new_allocations": target_allocations,
            "execution_results": rebalance_results,
            "timestamp": datetime.now().isoformat()
        }
        
        return f"Rebalance Executed: {json.dumps(summary, indent=2)}"
    except Exception as e:
        return f"Error executing rebalance: {e}"

@tool
async def calculate_optimal_allocation(risk_tolerance: str = "moderate") -> str:
    """Calculate optimal allocation based on APY, risk, and performance trends"""
    try:
        # Get current APYs and performance
        strategies = {}
        for strategy_name in ["init_looping", "circuit_vault", "mnt_staking"]:
            apy = await strategy_manager.get_strategy_apy(strategy_name)
            
            # Mock risk scores and other metrics
            risk_scores = {
                "init_looping": 0.7,  # Higher risk due to leverage
                "circuit_vault": 0.4,  # Medium risk
                "mnt_staking": 0.2    # Lower risk
            }
            
            strategies[strategy_name] = {
                "apy": apy,
                "risk_score": risk_scores[strategy_name],
                "sharpe_ratio": apy / (1 + risk_scores[strategy_name])
            }
        
        # Calculate optimal allocation based on risk tolerance
        risk_multipliers = {
            "conservative": {"init_looping": 0.2, "circuit_vault": 0.5, "mnt_staking": 0.3},
            "moderate": {"init_looping": 0.4, "circuit_vault": 0.4, "mnt_staking": 0.2},
            "aggressive": {"init_looping": 0.6, "circuit_vault": 0.3, "mnt_staking": 0.1}
        }
        
        base_allocation = risk_multipliers.get(risk_tolerance, risk_multipliers["moderate"])
        
        # Adjust based on current APY performance
        apy_weights = {name: data["apy"] for name, data in strategies.items()}
        total_apy = sum(apy_weights.values())
        
        optimal_allocation = {}
        for strategy, base_pct in base_allocation.items():
            apy_bonus = (apy_weights[strategy] / total_apy) * 0.3  # 30% weight to APY
            final_allocation = (base_pct * 0.7) + apy_bonus  # 70% base, 30% APY-adjusted
            optimal_allocation[strategy] = round(final_allocation * 100, 1)
        
        # Normalize to 100%
        total = sum(optimal_allocation.values())
        optimal_allocation = {k: round((v/total) * 100, 1) for k, v in optimal_allocation.items()}
        
        result = {
            "risk_tolerance": risk_tolerance,
            "strategy_metrics": strategies,
            "optimal_allocation": optimal_allocation,
            "expected_blended_apy": sum(strategies[k]["apy"] * (v/100) for k, v in optimal_allocation.items()),
            "reasoning": f"Optimized for {risk_tolerance} risk profile with APY adjustments"
        }
        
        return f"Optimal Allocation: {json.dumps(result, indent=2)}"
    except Exception as e:
        return f"Error calculating optimal allocation: {e}"

@tool
async def monitor_market_conditions() -> str:
    """Monitor market conditions that might affect strategy performance"""
    try:
        # Mock market data - would fetch from real APIs
        market_data = {
            "mnt_price": 0.45 + np.random.normal(0, 0.02),
            "eth_price": 2400 + np.random.normal(0, 50),
            "usdc_price": 1.0,
            "gas_price": np.random.uniform(0.001, 0.005),
            "network_utilization": np.random.uniform(0.3, 0.9),
            "tvl_mantle": 850_000_000 + np.random.normal(0, 50_000_000)
        }
        
        # Market condition analysis
        conditions = {
            "market_sentiment": "bullish" if market_data["mnt_price"] > 0.45 else "bearish",
            "gas_condition": "low" if market_data["gas_price"] < 0.002 else "high",
            "network_health": "good" if market_data["network_utilization"] < 0.7 else "congested",
            "capital_flows": "positive" if market_data["tvl_mantle"] > 850_000_000 else "negative"
        }
        
        # Strategy recommendations based on conditions
        recommendations = []
        if conditions["market_sentiment"] == "bullish":
            recommendations.append("Consider increasing INIT looping allocation for higher leverage exposure")
        if conditions["gas_condition"] == "low":
            recommendations.append("Good time for rebalancing - low transaction costs")
        if conditions["network_health"] == "good":
            recommendations.append("All strategies should perform optimally")
        
        result = {
            "market_data": market_data,
            "conditions": conditions,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
        
        return f"Market Conditions: {json.dumps(result, indent=2)}"
    except Exception as e:
        return f"Error monitoring market conditions: {e}"

# ==============================================================================
# LANGGRAPH WORKFLOW
# ==============================================================================

def create_mantle_vault_agent():
    """Create the Mantle Vault APY Maximizer agent workflow"""
    
    async def analyze_performance(state: AgentState) -> AgentState:
        """Analyze current performance and market conditions"""
        logger.info("🔍 Analyzing strategy performance...")
        
        # Get performance analysis
        performance_analysis = await analyze_strategy_performance.ainvoke({"time_window_hours": config.DELTA_T_HOURS})
        market_conditions = await monitor_market_conditions.ainvoke({})
        
        state["messages"].append(AIMessage(content=f"Performance Analysis: {performance_analysis}"))
        state["messages"].append(AIMessage(content=f"Market Conditions: {market_conditions}"))
        
        # Extract rebalance signals
        signals = []
        if "recommended_strategy" in performance_analysis:
            signals.append(f"Switch to recommended strategy")
        if "bullish" in market_conditions:
            signals.append("Consider higher risk allocation")
        
        state["rebalance_signals"] = signals
        return state
    
    async def calculate_allocation(state: AgentState) -> AgentState:
        """Calculate optimal allocation based on analysis"""
        logger.info("🧮 Calculating optimal allocation...")
        
        # Determine risk tolerance based on signals
        risk_tolerance = "aggressive" if any("bullish" in signal for signal in state["rebalance_signals"]) else "moderate"
        
        allocation_result = await calculate_optimal_allocation.ainvoke({"risk_tolerance": risk_tolerance})
        state["messages"].append(AIMessage(content=f"Optimal Allocation: {allocation_result}"))
        
        return state
    
    async def execute_strategy(state: AgentState) -> AgentState:
        """Execute the rebalancing strategy"""
        logger.info("⚡ Executing rebalancing strategy...")
        
        # Extract allocation from last message
        last_allocation_msg = state["messages"][-1].content
        
        # Mock optimal allocations for demo
        optimal_allocations = {
            "init_looping": 45.0,
            "circuit_vault": 35.0,
            "mnt_staking": 20.0
        }
        
        rebalance_result = await execute_rebalance.ainvoke({"target_allocations": optimal_allocations})
        state["messages"].append(AIMessage(content=f"Rebalance Execution: {rebalance_result}"))
        
        # Update vault state
        state["vault_state"].last_rebalance = datetime.now()
        
        return state
    
    async def monitor_and_decide(state: AgentState) -> str:
        """Decide whether to continue monitoring or rebalance"""
        
        # Check if significant APY differences exist
        vault_status = await get_vault_status.ainvoke({})
        
        # Simple decision logic
        if "apy_spread" in vault_status and "1.0" in vault_status:  # > 1% spread
            return "rebalance"
        elif len(state["rebalance_signals"]) > 0:
            return "rebalance"
        else:
            return "monitor"
    
    # Create the workflow graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("analyze", analyze_performance)
    workflow.add_node("calculate", calculate_allocation) 
    workflow.add_node("execute", execute_strategy)
    workflow.add_node("monitor", lambda state: state)  # Monitoring state
    
    # Add edges
    workflow.add_edge("analyze", "calculate")
    workflow.add_edge("calculate", "execute")
    
    # Add conditional edges
    workflow.add_conditional_edges(
        "execute",
        monitor_and_decide,
        {
            "rebalance": "analyze", 
            "monitor": "monitor",
        }
    )
    
    workflow.add_conditional_edges(
        "monitor",
        monitor_and_decide,
        {
            "rebalance": "analyze",
            "monitor": "monitor",
        }
    )
    
    # Set entry point
    workflow.set_entry_point("analyze")
    
    # Add memory
    memory = MemorySaver()
    
    # Compile the graph
    return workflow.compile(checkpointer=memory)

# ==============================================================================
# MAIN AGENT CLASS
# ==============================================================================

class MantleVaultAgent:
    """Main Mantle Vault APY Maximizer Agent"""
    
    def __init__(self):
        self.config = config
        self.web3_manager = web3_manager
        self.strategy_manager = strategy_manager
        self.agent_graph = create_mantle_vault_agent()
        self.running = False
        
        # Initialize vault state
        self.vault_state = VaultState(
            total_value=0.0,
            available_balance=0.0,
            strategies={},
            last_rebalance=datetime.now(),
            performance_metrics={},
            pending_policies=[]
        )
    
    async def start_monitoring(self):
        """Start the agent monitoring loop"""
        self.running = True
        logger.info("🚀 Starting Mantle Vault APY Maximizer Agent...")
        
        # Initial state
        initial_state = AgentState(
            vault_state=self.vault_state,
            strategy_performance={},
            rebalance_signals=[],
            current_time=datetime.now(),
            agent_config=self.config,
            messages=[HumanMessage(content="Initialize vault monitoring")]
        )
        
        config_dict = {"configurable": {"thread_id": "mantle_vault_thread"}}
        
        while self.running:
            try:
                # Run the agent workflow
                result = await self.agent_graph.ainvoke(initial_state, config_dict)
                
                # Log results
                if result.get("messages"):
                    latest_msg = result["messages"][-1]
                    logger.info(f"Agent Update: {latest_msg.content[:200]}...")
                
                # Wait for next cycle
                await asyncio.sleep(self.config.DELTA_T_HOURS * 3600)  # Convert hours to seconds
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    def stop_monitoring(self):
        """Stop the agent monitoring"""
        self.running = False
        logger.info("🛑 Stopping Mantle Vault Agent...")
    
    async def manual_rebalance(self, risk_tolerance: str = "moderate") -> Dict:
        """Manually trigger a rebalance"""
        logger.info(f"🔄 Manual rebalance triggered with {risk_tolerance} risk tolerance")
        
        try:
            # Get optimal allocation
            allocation_result = await calculate_optimal_allocation.ainvoke({"risk_tolerance": risk_tolerance})
            
            # Execute rebalance (would extract allocations from result)
            optimal_allocations = {
                "init_looping": 45.0,
                "circuit_vault": 35.0, 
                "mnt_staking": 20.0
            }
            
            rebalance_result = await execute_rebalance.ainvoke({"target_allocations": optimal_allocations})
            
            return {
                "success": True,
                "allocation_analysis": allocation_result,
                "rebalance_result": rebalance_result,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_dashboard_data(self) -> Dict:
        """Get comprehensive dashboard data"""
        try:
            vault_status = await get_vault_status.ainvoke({})
            performance_analysis = await analyze_strategy_performance.ainvoke({"time_window_hours": 24})
            market_conditions = await monitor_market_conditions.ainvoke({})
            
            return {
                "vault_status": vault_status,
                "performance_analysis": performance_analysis,
                "market_conditions": market_conditions,
                "last_updated": datetime.now().isoformat(),
                "agent_config": {
                    "delta_t_hours": self.config.DELTA_T_HOURS,
                    "min_reallocation_threshold": self.config.MIN_REALLOCATION_THRESHOLD,
                    "safety_buffer": self.config.SAFETY_BUFFER
                }
            }
        except Exception as e:
            return {"error": str(e)}

# ==============================================================================
# EXAMPLE USAGE AND TESTING
# ==============================================================================

async def main():
    """Main function to run the Mantle Vault Agent"""
    
    # Initialize the agent
    agent = MantleVaultAgent()
    
    # Example: Get dashboard data
    print("📊 Getting dashboard data...")
    dashboard = await agent.get_dashboard_data()
    print(json.dumps(dashboard, indent=2))
    
    # Example: Manual rebalance
    print("\n🔄 Executing manual rebalance...")
    rebalance_result = await agent.manual_rebalance("moderate")
    print(json.dumps(rebalance_result, indent=2))
    
    # Example: Start monitoring (commented out for demo)
    # print("\n🚀 Starting continuous monitoring...")
    # await agent.start_monitoring()

if __name__ == "__main__":
    # Set up OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️ Warning: OPENAI_API_KEY not set. LLM features will not work.")
    
    # Run the main function
    asyncio.run(main())