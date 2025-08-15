// hooks/useOraclePrices.ts - FIXED: WETH and USDC only (no ETH)
import { useState, useEffect, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/web3-config'
import { REAL_API_ORACLE_ABI } from '@/lib/contract-abis'

// ✅ FIXED: Only support WETH and USDC
export type SupportedToken = 'WETH' | 'USDC'

export interface OraclePrices {
  WETH: number
  USDC: number
}

export interface OraclePricesHook {
  prices: OraclePrices
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refetch: () => Promise<void>
}

// ✅ FIXED: Default prices for WETH and USDC only
const DEFAULT_PRICES: OraclePrices = {
  WETH: 4000, // Default WETH price
  USDC: 1,    // Default USDC price
}

export function useOraclePrices(): OraclePricesHook {
  const [prices, setPrices] = useState<OraclePrices>(DEFAULT_PRICES)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ✅ FIXED: Read WETH price from oracle
  const { 
    data: wethPrice, 
    error: wethError, 
    refetch: refetchWeth 
  } = useReadContract({
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    abi: REAL_API_ORACLE_ABI,
    functionName: 'getPrice',
    args: ['WETH'], // ✅ Use WETH, not ETH
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  })

  // ✅ FIXED: Read USDC price from oracle
  const { 
    data: usdcPrice, 
    error: usdcError, 
    refetch: refetchUsdc 
  } = useReadContract({
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    abi: REAL_API_ORACLE_ABI,
    functionName: 'getPrice',
    args: ['USDC'],
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  })

  // Update prices when contract data changes
  useEffect(() => {
    const newPrices: OraclePrices = { ...DEFAULT_PRICES }
    let hasUpdates = false

    // ✅ FIXED: Handle WETH price (8 decimals)
    if (wethPrice && !wethError) {
      const wethPriceNumber = Number(wethPrice) / 1e8 // Convert from 8 decimals
      if (wethPriceNumber > 0) {
        newPrices.WETH = wethPriceNumber
        hasUpdates = true
      }
    }

    // ✅ FIXED: Handle USDC price (8 decimals)
    if (usdcPrice && !usdcError) {
      const usdcPriceNumber = Number(usdcPrice) / 1e8 // Convert from 8 decimals
      if (usdcPriceNumber > 0) {
        newPrices.USDC = usdcPriceNumber
        hasUpdates = true
      }
    }

    if (hasUpdates) {
      setPrices(newPrices)
      setLastUpdated(new Date())
      setError(null)
      console.log('✅ Oracle prices updated from contracts:', newPrices)
    }

    // ✅ FIXED: Handle errors from WETH and USDC only
    if (wethError || usdcError) {
      const errorMessages = []
      if (wethError) errorMessages.push(`WETH: ${wethError.message}`)
      if (usdcError) errorMessages.push(`USDC: ${usdcError.message}`)
      setError(errorMessages.join(', '))
      console.warn('⚠️ Oracle price errors:', errorMessages)
    }
  }, [wethPrice, usdcPrice, wethError, usdcError])

  // ✅ FIXED: Refetch function for WETH and USDC
  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('🔄 Refetching oracle prices for WETH and USDC...')
      
      // Refetch both prices
      const promises = [refetchWeth(), refetchUsdc()]
      await Promise.allSettled(promises)
      
      console.log('✅ Oracle price refetch completed')
    } catch (err) {
      console.error('❌ Failed to refetch oracle prices:', err)
      setError(err instanceof Error ? err.message : 'Failed to refetch prices')
    } finally {
      setIsLoading(false)
    }
  }, [refetchWeth, refetchUsdc])

  // Initial load
  useEffect(() => {
    refetch()
  }, []) // Only run once on mount

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refetch,
  }
}

// ✅ FIXED: Utility functions for WETH and USDC
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `$${price.toFixed(4)}`
}

export function calculateTokenValue(amount: string, price: number): number {
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount <= 0) return 0
  return numAmount * price
}

// ✅ FIXED: Export only supported tokens
export { DEFAULT_PRICES }