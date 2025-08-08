// app/providers.tsx
"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from 'wagmi'
import { getDefaultConfig, TomoEVMKitProvider } from '@tomo-inc/tomo-evm-kit'
import { metaMaskWallet, walletConnectWallet } from '@tomo-inc/tomo-evm-kit/wallets'
import { TomoWalletProvider } from "@/contexts/tomo-wallet-context"

// 1. Define the Etherlink Testnet configuration
const etherlinkTestnet = {
  id: 128123, // Chain ID for Etherlink Testnet
  name: 'Etherlink Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Tezos',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: {
      http: ['https://node.ghostnet.etherlink.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherlink Explorer', url: 'https://testnet-explorer.etherlink.com' },
  },
  testnet: true,
} as const

// 2. Create the wagmi config using the pattern from your working project
const config = getDefaultConfig({
  appName: 'FOMO Insurance',
  // You MUST get a project ID from https://cloud.walletconnect.com
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [etherlinkTestnet], // Use the Etherlink Testnet
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

// 3. Create a QueryClient
const queryClient = new QueryClient()

// 4. Set up the Providers component
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <TomoEVMKitProvider>
          <TomoWalletProvider>
            {children}
          </TomoWalletProvider>
        </TomoEVMKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
