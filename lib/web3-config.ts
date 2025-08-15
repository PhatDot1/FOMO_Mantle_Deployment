// lib/web3-config.ts
import { createConfig, http } from 'wagmi'
import { metaMask, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define Mantle Sepolia Testnet chain (where your contracts are deployed)
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://endpoints.omniatech.io/v1/mantle/sepolia/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://explorer.sepolia.mantle.xyz',
    },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'bf78bba70a5a187c80781fea455d093f',
    }),
  ],
  transports: {
    [mantleSepolia.id]: http(),
  },
  ssr: true,
})

// Updated contract addresses for Mantle Sepolia Testnet
export const CONTRACT_ADDRESSES = {
  MOCK_WETH: '0x34B68f19Ac9028a505bb6be756472ee800D6e88e',
  MOCK_USDC: '0x5B855A6913F962d377D70126038062D1BFe2bb14',
  POLICY_STORAGE: '0x90E9058038bd81C1887c6Abd6A7144222924C044',
  POLICY_MANAGER: '0xBC8b0b6d8a51d694beFe1522901d07629f3E5043',
  SETTLEMENT_ENGINE: '0x8F2794B3af4f1DF45CB9eB1Bf712077eE99D253b',
  FOMO_INSURANCE: '0xDE956862C0177B0129Ba54f4D8895d1bfEf0BF52',
  PRICE_ORACLE: '0x1AC24F374baFcd0E2da27F1078CE8F4Da438561b',
} as const

// Legacy config object - keeping for backwards compatibility
export const config = {
  contracts: {
    mockWETH: "0x34B68f19Ac9028a505bb6be756472ee800D6e88e",
    mockUSDC: "0x5B855A6913F962d377D70126038062D1BFe2bb14",
    priceOracle: "0x1AC24F374baFcd0E2da27F1078CE8F4Da438561b",
    policyStorage: "0x90E9058038bd81C1887c6Abd6A7144222924C044",
    policyManager: "0xBC8b0b6d8a51d694beFe1522901d07629f3E5043",
    settlementEngine: "0x8F2794B3af4f1DF45CB9eB1Bf712077eE99D253b",
    fomoInsurance: "0xDE956862C0177B0129Ba54f4D8895d1bfEf0BF52",
  },
} as const