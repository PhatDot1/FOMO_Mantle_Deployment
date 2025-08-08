"use client"

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// Define Etherlink testnet
const etherlinkTestnet = {
  id: 128123,
  name: 'Etherlink Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'XTZ',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: {
      http: ['https://node.ghostnet.etherlink.com'],
    },
    public: {
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
} as const

// Get projectId from environment variables with fallback
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-project-id'

// Warn if using dummy project ID
if (typeof window !== 'undefined' && projectId === 'dummy-project-id') {
  console.warn('Warning: Using dummy WalletConnect project ID. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file')
}

const metadata = {
  name: 'FOMO Insurance',
  description: 'Cash out without missing out',
  url: 'https://fomo-insurance.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [etherlinkTestnet] as const
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
})

// Create modal with error handling (only on client side)
if (typeof window !== 'undefined') {
  try {
    createWeb3Modal({
      wagmiConfig: config,
      projectId,
      enableAnalytics: true,
      enableOnramp: false,
    })
  } catch (error) {
    console.error('Error creating Web3Modal:', error)
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
