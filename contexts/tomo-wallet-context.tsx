"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@tomo-inc/tomo-evm-kit'

interface TomoWalletContextType {
  isConnected: boolean
  address: string | null
  chainId: number | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isLoading: boolean
  error: string | null
  switchToStoryChain: () => Promise<void>
  isCorrectChain: boolean
}

const TomoWalletContext = createContext<TomoWalletContextType | undefined>(undefined)

export function useTomoWallet() {
  const context = useContext(TomoWalletContext)
  if (context === undefined) {
    throw new Error("useTomoWallet must be used within a TomoWalletProvider")
  }
  return context
}

interface TomoWalletProviderProps {
  children: React.ReactNode
}

const STORY_CHAIN_ID = 128123

export function TomoWalletProvider({ children }: TomoWalletProviderProps) {
  const { address, isConnected: wagmiConnected } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isCorrectChain = chainId === STORY_CHAIN_ID
  const isConnected = wagmiConnected && !!address

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (openConnectModal) {
        openConnectModal()
      } else {
        // Fallback to direct connection
        const connector = connectors[0]
        if (connector) {
          connect({ connector })
        } else {
          throw new Error("No wallet connectors available")
        }
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err)
      setError(err instanceof Error ? err.message : "Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    try {
      disconnect()
      setError(null)
    } catch (err) {
      console.error("Failed to disconnect wallet:", err)
      setError(err instanceof Error ? err.message : "Failed to disconnect wallet")
    }
  }

  const switchToStoryChain = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (switchChain) {
        await switchChain({ chainId: STORY_CHAIN_ID })
      } else {
        throw new Error("Chain switching not supported")
      }
    } catch (err) {
      console.error("Failed to switch chain:", err)
      setError(err instanceof Error ? err.message : "Failed to switch to Story chain")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-switch to Story chain when connected
  useEffect(() => {
    if (isConnected && !isCorrectChain && !isSwitching) {
      console.log(`Connected to chain ${chainId}, switching to Story chain ${STORY_CHAIN_ID}`)
      switchToStoryChain()
    }
  }, [isConnected, isCorrectChain, chainId, isSwitching])

  // Clear errors when connection state changes
  useEffect(() => {
    if (isConnected) {
      setError(null)
    }
  }, [isConnected])

  const value: TomoWalletContextType = {
    isConnected,
    address: address || null,
    chainId,
    connectWallet,
    disconnectWallet,
    isLoading: isLoading || isConnecting || isSwitching,
    error,
    switchToStoryChain,
    isCorrectChain,
  }

  return <TomoWalletContext.Provider value={value}>{children}</TomoWalletContext.Provider>
}
