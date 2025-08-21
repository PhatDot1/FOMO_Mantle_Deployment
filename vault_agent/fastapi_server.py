"""
FastAPI Server for Mantle Vault Agent

This server provides REST API endpoints for the dashboard and external integrations.
It connects the agent with the web interface and provides real-time data.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field
import uvicorn

# Import our agent components
from fomo_integration import IntegratedMantleVaultAgent
from api_integrations import MantleAPIManager
from mantle_vault_agent import MantleConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==============================================================================
# GLOBAL AGENT AND API MANAGER
# ==============================================================================

agent: Optional[IntegratedMantleVaultAgent] = None
api_manager: Optional[MantleAPIManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app"""
    global agent, api_manager
    
    logger.info("🚀 Starting Mantle Vault Agent Server...")
    
    # Initialize agent and API manager
    agent = IntegratedMantleVaultAgent()
    api_manager = MantleAPIManager()
    
    # Start API manager
    await api_manager.__aenter__()
    
    # Start agent monitoring in background
    # Note: In production, you might want to run this in a separate process
    # asyncio.create_task(agent.enhanced_monitoring_loop())
    
    logger.info("✅ Agent server started successfully")
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down agent server...")
    if agent:
        agent.stop_monitoring()
    if api_manager:
        await api_manager.__aexit__(None, None, None)

# ==============================================================================
# PYDANTIC MODELS
# ==============================================================================

class RebalanceRequest(BaseModel):
    """Request model for manual rebalancing"""
    risk_tolerance: str = Field(default="moderate", description="Risk tolerance: conservative, moderate, aggressive")
    force: bool = Field(default=False, description="Force rebalance even if not recommended")

class AllocationRequest(BaseModel):
    """Request model for custom allocation"""
    allocations: Dict[str, float] = Field(description="Strategy allocations (must sum to 100%)")
    
class StrategyMetrics(BaseModel):
    """Strategy performance metrics"""
    name: str
    current_apy: float
    allocation: float
    tvl: float
    risk_score: float
    last_updated: datetime

class VaultStatus(BaseModel):
    """Vault status response model"""
    total_value: float
    available_balance: float
    deployed_value: float
    current_apy: float
    strategies: List[StrategyMetrics]
    last_rebalance: datetime
    agent_status: str
    performance_24h: float

class MarketData(BaseModel):
    """Market data response model"""
    timestamp: datetime
    token_prices: Dict[str, float]
    strategy_apys: Dict[str, float]
    best_strategy: str
    apy_spread: float
    market_sentiment: str

# ==============================================================================
# WEBSOCKET CONNECTION MANAGER
# ==============================================================================

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove stale connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# ==============================================================================
# FASTAPI APP INITIALIZATION
# ==============================================================================

app = FastAPI(
    title="Mantle Vault Agent API",
    description="REST API for the Mantle Vault APY Maximizer Agent",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (dashboard)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the main dashboard"""
    return FileResponse("dashboard.html")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "agent_running": agent is not None and agent.running,
        "api_manager_active": api_manager is not None
    }

@app.get("/api/vault/status", response_model=VaultStatus)
async def get_vault_status():
    """Get current vault status"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Get dashboard data from agent
        dashboard_data = await agent.get_integrated_dashboard_data()
        
        # Get current APYs from API manager
        if api_manager:
            strategy_apys = await api_manager.get_all_strategy_apys()
        else:
            strategy_apys = {"init_looping": 8.5, "circuit_vault": 6.8, "mnt_staking": 4.5}
        
        # Mock data for demonstration
        strategies = [
            StrategyMetrics(
                name="INIT Capital Looping",
                current_apy=strategy_apys.get("init_looping", 8.5),
                allocation=45.0,
                tvl=125000,
                risk_score=0.7,
                last_updated=datetime.now()
            ),
            StrategyMetrics(
                name="Circuit Protocol Vault",
                current_apy=strategy_apys.get("circuit_vault", 6.8),
                allocation=35.0,
                tvl=87500,
                risk_score=0.4,
                last_updated=datetime.now()
            ),
            StrategyMetrics(
                name="MNT Staking",
                current_apy=strategy_apys.get("mnt_staking", 4.5),
                allocation=20.0,
                tvl=50000,
                risk_score=0.2,
                last_updated=datetime.now()
            )
        ]
        
        total_value = sum(s.tvl for s in strategies)
        weighted_apy = sum(s.current_apy * s.allocation / 100 for s in strategies)
        
        return VaultStatus(
            total_value=total_value,
            available_balance=12500,
            deployed_value=total_value - 12500,
            current_apy=weighted_apy,
            strategies=strategies,
            last_rebalance=agent.vault_state.last_rebalance,
            agent_status="Active" if agent.running else "Stopped",
            performance_24h=2.3
        )
        
    except Exception as e:
        logger.error(f"Error getting vault status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market/data", response_model=MarketData)
async def get_market_data():
    """Get current market data"""
    try:
        if api_manager:
            market_data = await api_manager.get_comprehensive_market_data()
            
            strategy_apys = market_data.get('strategy_performance', {})
            token_prices = market_data.get('token_prices', {})
            market_summary = market_data.get('market_summary', {})
            
            best_apy = max(strategy_apys.values()) if strategy_apys else 0
            best_strategy = max(strategy_apys.items(), key=lambda x: x[1])[0] if strategy_apys else "unknown"
            
            return MarketData(
                timestamp=datetime.now(),
                token_prices=token_prices,
                strategy_apys=strategy_apys,
                best_strategy=best_strategy,
                apy_spread=market_summary.get('apy_spread', 0),
                market_sentiment="bullish" if market_summary.get('mnt_price', 0) > 0.45 else "bearish"
            )
        else:
            # Fallback data
            return MarketData(
                timestamp=datetime.now(),
                token_prices={"MNT": 0.45, "ETH": 2400, "USDC": 1.0},
                strategy_apys={"init_looping": 8.5, "circuit_vault": 6.8, "mnt_staking": 4.5},
                best_strategy="init_looping",
                apy_spread=4.0,
                market_sentiment="neutral"
            )
            
    except Exception as e:
        logger.error(f"Error getting market data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vault/rebalance")
async def rebalance_vault(request: RebalanceRequest, background_tasks: BackgroundTasks):
    """Execute vault rebalancing"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Add rebalancing task to background
        background_tasks.add_task(
            execute_rebalance_task,
            request.risk_tolerance,
            request.force
        )
        
        # Broadcast update to WebSocket clients
        await manager.broadcast(json.dumps({
            "type": "rebalance_started",
            "risk_tolerance": request.risk_tolerance,
            "timestamp": datetime.now().isoformat()
        }))
        
        return {
            "message": "Rebalancing started",
            "risk_tolerance": request.risk_tolerance,
            "force": request.force,
            "estimated_completion": (datetime.now() + timedelta(minutes=2)).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error starting rebalance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vault/allocate")
async def set_custom_allocation(request: AllocationRequest):
    """Set custom strategy allocation"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Validate allocations sum to 100%
        total_allocation = sum(request.allocations.values())
        if abs(total_allocation - 100) > 0.1:
            raise HTTPException(
                status_code=400, 
                detail=f"Allocations must sum to 100%, got {total_allocation}%"
            )
        
        # Execute custom allocation (would implement this in agent)
        result = {"message": "Custom allocation set", "allocations": request.allocations}
        
        # Broadcast update
        await manager.broadcast(json.dumps({
            "type": "allocation_updated",
            "allocations": request.allocations,
            "timestamp": datetime.now().isoformat()
        }))
        
        return result
        
    except Exception as e:
        logger.error(f"Error setting custom allocation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/strategies/performance")
async def get_strategy_performance():
    """Get detailed strategy performance metrics"""
    try:
        if api_manager:
            market_data = await api_manager.get_comprehensive_market_data()
            protocol_data = market_data.get('protocol_data', {})
            
            return {
                "init_capital": {
                    "current_apy": market_data.get('strategy_performance', {}).get('init_looping', 8.5),
                    "leverage_ratio": 3.0,
                    "liquidation_risk": "Low",
                    "tvl": protocol_data.get('init_capital', {}).get('markets', [{}])[0].get('tvl', 5000000)
                },
                "circuit_protocol": {
                    "current_apy": market_data.get('strategy_performance', {}).get('circuit_vault', 6.8),
                    "auto_compound_rate": "Daily",
                    "fees": "0.5%",
                    "tvl": protocol_data.get('circuit_protocol', {}).get('vaults', [{}])[0].get('tvl', 3000000)
                },
                "mnt_staking": {
                    "current_apy": market_data.get('strategy_performance', {}).get('mnt_staking', 4.5),
                    "staking_period": "Flexible",
                    "slashing_risk": "None",
                    "tvl": protocol_data.get('mantle_staking', {}).get('staking', {}).get('total_staked', 45000000)
                }
            }
        else:
            # Fallback data
            return {
                "init_capital": {"current_apy": 8.5, "leverage_ratio": 3.0, "liquidation_risk": "Low", "tvl": 5000000},
                "circuit_protocol": {"current_apy": 6.8, "auto_compound_rate": "Daily", "fees": "0.5%", "tvl": 3000000},
                "mnt_staking": {"current_apy": 4.5, "staking_period": "Flexible", "slashing_risk": "None", "tvl": 45000000}
            }
            
    except Exception as e:
        logger.error(f"Error getting strategy performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fomo/status")
async def get_fomo_status():
    """Get FOMO Insurance protocol status"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        # Get FOMO Insurance data
        if hasattr(agent, 'last_protocol_snapshot') and agent.last_protocol_snapshot:
            snapshot = agent.last_protocol_snapshot
            
            return {
                "total_policies": snapshot.total_policies,
                "active_policies": len(snapshot.active_policies),
                "open_policies": len(snapshot.open_policies),
                "total_reserves_required": snapshot.total_reserves_required,
                "available_liquidity": snapshot.available_liquidity,
                "reserve_ratio": (snapshot.total_reserves_required / snapshot.available_liquidity 
                                if snapshot.available_liquidity > 0 else 0),
                "pending_settlements": len(snapshot.pending_settlements),
                "last_updated": snapshot.timestamp.isoformat()
            }
        else:
            # Return mock data if no snapshot available
            return {
                "total_policies": 5,
                "active_policies": 3,
                "open_policies": 2,
                "total_reserves_required": 45000,
                "available_liquidity": 125000,
                "reserve_ratio": 0.36,
                "pending_settlements": 1,
                "last_updated": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error getting FOMO status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/start")
async def start_agent():
    """Start the agent monitoring"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        if agent.running:
            return {"message": "Agent is already running"}
        
        # Start agent in background
        asyncio.create_task(agent.enhanced_monitoring_loop())
        
        await manager.broadcast(json.dumps({
            "type": "agent_started",
            "timestamp": datetime.now().isoformat()
        }))
        
        return {"message": "Agent started successfully"}
        
    except Exception as e:
        logger.error(f"Error starting agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/stop")
async def stop_agent():
    """Stop the agent monitoring"""
    try:
        if not agent:
            raise HTTPException(status_code=503, detail="Agent not initialized")
        
        agent.stop_monitoring()
        
        await manager.broadcast(json.dumps({
            "type": "agent_stopped",
            "timestamp": datetime.now().isoformat()
        }))
        
        return {"message": "Agent stopped successfully"}
        
    except Exception as e:
        logger.error(f"Error stopping agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# WEBSOCKET ENDPOINT
# ==============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Send periodic updates
            await asyncio.sleep(30)  # Send update every 30 seconds
            
            if agent and api_manager:
                # Get current data
                vault_status = await get_vault_status()
                market_data = await get_market_data()
                
                update = {
                    "type": "periodic_update",
                    "timestamp": datetime.now().isoformat(),
                    "vault_status": vault_status.dict(),
                    "market_data": market_data.dict()
                }
                
                await manager.send_personal_message(json.dumps(update), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ==============================================================================
# BACKGROUND TASKS
# ==============================================================================

async def execute_rebalance_task(risk_tolerance: str, force: bool):
    """Background task for executing rebalancing"""
    try:
        logger.info(f"Starting rebalance task with {risk_tolerance} risk tolerance")
        
        if agent:
            result = await agent.manual_rebalance(risk_tolerance)
            
            # Broadcast completion
            await manager.broadcast(json.dumps({
                "type": "rebalance_completed",
                "result": result,
                "timestamp": datetime.now().isoformat()
            }))
            
            logger.info("Rebalance task completed successfully")
        
    except Exception as e:
        logger.error(f"Error in rebalance task: {e}")
        
        # Broadcast error
        await manager.broadcast(json.dumps({
            "type": "rebalance_failed",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }))

# ==============================================================================
# PERIODIC TASKS
# ==============================================================================

async def periodic_broadcast():
    """Periodic task to broadcast updates to connected clients"""
    while True:
        try:
            await asyncio.sleep(60)  # Broadcast every minute
            
            if manager.active_connections and agent and api_manager:
                # Get latest data
                market_data = await api_manager.get_comprehensive_market_data()
                
                broadcast_data = {
                    "type": "market_update",
                    "timestamp": datetime.now().isoformat(),
                    "strategy_apys": market_data.get('strategy_performance', {}),
                    "best_strategy": market_data.get('market_summary', {}).get('best_apy', 0),
                    "mnt_price": market_data.get('token_prices', {}).get('MNT', 0.45)
                }
                
                await manager.broadcast(json.dumps(broadcast_data))
                
        except Exception as e:
            logger.error(f"Error in periodic broadcast: {e}")

# Start periodic broadcast task
@app.on_event("startup")
async def startup_event():
    """Start background tasks on server startup"""
    asyncio.create_task(periodic_broadcast())

# ==============================================================================
# MAIN SERVER RUNNER
# ==============================================================================

if __name__ == "__main__":
    import os
    
    # Check environment
    if not os.getenv("AGENT_PRIVATE_KEY"):
        logger.warning("⚠️ AGENT_PRIVATE_KEY not set. Some features may not work.")
    
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("⚠️ OPENAI_API_KEY not set. LLM features will be limited.")
    
    # Run the server
    logger.info("🚀 Starting Mantle Vault Agent FastAPI server...")
    
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Set to True for development
        log_level="info"
    )