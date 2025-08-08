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
  MOCK_WETH: '0x6bEfd3014E8373E4a776b4F2b28134EA25C7b93A', 
  MOCK_USDC: '0x2213eE1B450900Bdaf75DA5F17f38bAbdaED339c', 
  POLICY_STORAGE: '0x41F8fEBb4EF425a3eF522D313c3277235aeA83DE', 
  POLICY_MANAGER: '0xc9D62b94eBe0EbDc68d695d4a5AA9017c0a41383', 
  SETTLEMENT_ENGINE: '0x6B6A30149b99A09b697805eA5b2AaDCbC396586a', 
  FOMO_INSURANCE: '0x6F134a509A4Af0366A1e667c321f1B6a42B8Ab42',

  PRICE_ORACLE: '0x20B695517D6b82E72E8AFdF83d4d2C351A79748D', 
} as const
