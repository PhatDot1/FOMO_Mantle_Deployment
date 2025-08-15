// lib/web3-config.ts
import { getDefaultConfig } from '@tomo-inc/tomo-evm-kit'
import { metaMaskWallet, walletConnectWallet } from '@tomo-inc/tomo-evm-kit/wallets'
import { defineChain } from 'viem'

// Define Etherlink Testnet chain
export const etherlinkTestnet = defineChain({
  id: 128123,
  name: 'Etherlink Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Tez',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: {
      http: ['https://node.ghostnet.etherlink.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherlink Explorer',
      url: 'https://testnet.explorer.etherlink.com',
    },
  },
  testnet: true,
})

export const wagmiConfig = getDefaultConfig({
  clientId: process.env.NEXT_PUBLIC_TOMO_CLIENT_ID || 'WpOdScO5S8LMj4Hi8vwrQ0KSKQtP1pI6OcTM3If1f5bxAkRZQdivbATx7TDjfo8EGQ8JRk4Ht8MqpWzjb7C1wRhY',
  appName: 'FOMO Insurance',
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'bf78bba70a5a187c80781fea455d093f',
  chains: [etherlinkTestnet],
  ssr: true,
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
      ],
    },
  ],
})

export const CONTRACT_ADDRESSES = {
  MOCK_WETH: '0x34B68f19Ac9028a505bb6be756472ee800D6e88e', 
  MOCK_USDC: '0x5B855A6913F962d377D70126038062D1BFe2bb14', 
  POLICY_STORAGE: '0x90E9058038bd81C1887c6Abd6A7144222924C044', 
  POLICY_MANAGER: '0xBC8b0b6d8a51d694beFe1522901d07629f3E5043', 
  SETTLEMENT_ENGINE: '0x8F2794B3af4f1DF45CB9eB1Bf712077eE99D253b', 
  FOMO_INSURANCE: '0xDE956862C0177B0129Ba54f4D8895d1bfEf0BF52',

  PRICE_ORACLE: '0x1AC24F374baFcd0E2da27F1078CE8F4Da438561b', 
} as const
