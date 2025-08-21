// lib/web3-config.ts
import { createConfig, http } from 'wagmi';
import { metaMask, walletConnect } from 'wagmi/connectors';
import { defineChain } from 'viem';

// Define Mantle Sepolia Testnet chain
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
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://explorer.sepolia.mantle.xyz',
    },
  },
  testnet: true,
});

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
});

// ✨ UPDATED: All new contract addresses from your latest deployment
export const CONTRACT_ADDRESSES = {
  MOCK_WETH: '0xEBcBae3E66F30C5Cb6585ea9C31E09bBE8591a61',
  MOCK_USDC: '0x5E618eBBFD1e69B7909d14e607acadccac626B4E',
  MOCK_MNT: '0xD55030D27553c974133Fd71c096c1fF400DC6e25', // ✨ ADDED
  PRICE_ORACLE: '0xD6c7693c122dF70E3e8807411222d4aC60069b00',
  POLICY_STORAGE: '0x8575B0C8567aeEe60cbD260A1b946eb94Dbe8c7F',
  POLICY_MANAGER: '0x0737364BbEB5Da199CA3fb43409f7325E2E94521',
  SETTLEMENT_ENGINE: '0xB497fa96BC5eABC698672Cf5B4b3489f5Db6Ccf8',
  FOMO_INSURANCE: '0xcDE6374279E133F82cf6e051a665e5740c1C4612',
} as const;