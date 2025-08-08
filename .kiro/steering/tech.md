# Technical Steering - FOMO Insurance

## Network Configuration

### Mantle Network Details
- **Network**: Mantle Testnet (current deployment)
- **Chain ID**: 5003
- **Native Token**: MNT
- **Block Explorer**: https://explorer.sepolia.mantle.xyz/
- **RPC Endpoint**: https://rpc.sepolia.mantle.xyz

### Network Benefits
- **High Throughput**: Supports real-time policy creation and settlement operations
- **Low Transaction Costs**: Enables micro-policies and frequent interactions without prohibitive gas fees
- **Ethereum Compatibility**: Full EVM compatibility ensures seamless integration with existing tooling
- **Modular Architecture**: Built on Ethereum's security model with enhanced performance characteristics

## Smart Contract Architecture

### Core Contracts
- **PolicyManager**: Handles policy creation, cancellation, and execution logic
- **SettlementEngine**: Manages policy settlements and upside calculations
- **PolicyStorage**: Stores policy data and state management
- **RedStonePriceOracle**: Provides reliable price feeds for settlement calculations

### Technical Stack
- **Smart Contracts**: Solidity with Hardhat development framework
- **Frontend**: Next.js with TypeScript and TailwindCSS
- **Price Feeds**: RedStone Oracle integration for accurate market data
- **Wallet Integration**: Web3 providers supporting Mantle network

## Development Guidelines

### Network-Specific Considerations
- Optimize for Mantle's fast finality in settlement timing
- Leverage low gas costs for frequent policy updates and micro-transactions
- Ensure compatibility with Mantle's modular architecture
- Test thoroughly on Mantle testnet before mainnet deployment

### Security Practices
- Implement comprehensive price oracle validation
- Use time-locked settlements to prevent MEV attacks
- Validate all policy parameters against network constraints
- Maintain upgrade paths compatible with Mantle's infrastructure

## Deployment Strategy

### Current Status
- **Testnet Deployment**: Live on Mantle Testnet
- **Contract Verification**: All contracts verified on Mantle block explorer
- **Frontend Integration**: Connected to Mantle testnet RPC endpoints

### Mainnet Roadmap
- Complete security audits and testing on Mantle testnet
- Deploy to Mantle mainnet with production-ready configurations
- Implement monitoring and alerting for Mantle network-specific metrics