// app/providers.tsx
"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from 'wagmi'
import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'
import { metaMask, walletConnect } from 'wagmi/connectors'
import { TomoWalletProvider } from "@/contexts/tomo-wallet-context"

// Define Mantle Sepolia Testnet chain
const mantleSepolia = defineChain({
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

// Create wagmi config with standard configuration
const config = createConfig({
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

// Create a QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
    },
  },
})

// Set up the Providers component
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <TomoWalletProvider>
          {children}
        </TomoWalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}