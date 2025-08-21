#!/usr/bin/env python3
"""
Simple command-line runner for the Mantle Vault Agent
"""
import asyncio
import argparse
from mantle_vault_agent import MantleVaultAgent
from fomo_integration import IntegratedMantleVaultAgent

async def run_dashboard():
    agent = MantleVaultAgent()
    dashboard = await agent.get_dashboard_data()
    print(json.dumps(dashboard, indent=2))

async def run_rebalance(risk_tolerance="moderate"):
    agent = MantleVaultAgent()
    result = await agent.manual_rebalance(risk_tolerance)
    print(json.dumps(result, indent=2))

async def run_continuous():
    agent = IntegratedMantleVaultAgent()
    await agent.enhanced_monitoring_loop()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["dashboard", "rebalance", "continuous"], default="dashboard")
    parser.add_argument("--risk-tolerance", choices=["conservative", "moderate", "aggressive"], default="moderate")
    
    args = parser.parse_args()
    
    if args.mode == "dashboard":
        asyncio.run(run_dashboard())
    elif args.mode == "rebalance":
        asyncio.run(run_rebalance(args.risk_tolerance))
    elif args.mode == "continuous":
        asyncio.run(run_continuous())

if __name__ == "__main__":
    main()