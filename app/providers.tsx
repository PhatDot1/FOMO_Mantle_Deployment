// app/providers.tsx - FIXED unified provider
"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from 'wagmi'
import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'
import { metaMask, walletConnect } from 'wagmi/connectors'
import { TomoWalletProvider } from "@/contexts/tomo-wallet-context"
import { useState } from 'react'

// ✅ FIXED: Single chain definition matching your deployment
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
      http: ['https://rpc.sepolia.mantle.xyz'], // ✅ Official RPC
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
})

// ✅ PERFORMANCE: Optimized Wagmi config
const config = createConfig({
  chains: [mantleSepolia],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'bf78bba70a5a187c80781fea455d093f',
    }),
  ],
  transports: {
    [mantleSepolia.id]: http('https://rpc.sepolia.mantle.xyz', {
      batch: true, // ✅ Enable batching for better performance
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  ssr: true,
  // ✅ PERFORMANCE: Optimize polling
  pollingInterval: 4000, // 4 seconds instead of default
})

// ✅ PERFORMANCE: Single QueryClient instance
export function Providers({ children }: { children: React.ReactNode }) {
  // ✅ CRITICAL: Use useState to ensure single instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ PERFORMANCE: Optimized cache settings
        staleTime: 30 * 1000, // 30 seconds
        cacheTime: 5 * 60 * 1000, // 5 minutes
        retry: 2, // Reduce retries for speed
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // ✅ Prevent whitescreens
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  }))

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