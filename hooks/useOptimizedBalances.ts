// hooks/useOptimizedBalances.ts - Performance optimized balance fetching
import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { MOCK_WETH_ABI, MOCK_USDC_ABI, MOCK_MNT_ABI } from '@/lib/contract-abis';
import { formatUnits } from 'viem';
import { useState, useEffect, useRef } from 'react';

export type AnyToken = 'WETH' | 'USDC' | 'MNT';

interface TokenConfig {
  address: `0x${string}`;
  abi: any;
  decimals: number;
}

// ✅ PERFORMANCE: Static token configuration
const TOKEN_CONFIG: Record<AnyToken, TokenConfig> = {
  WETH: {
    address: CONTRACT_ADDRESSES.MOCK_WETH,
    abi: MOCK_WETH_ABI,
    decimals: 18,
  },
  USDC: {
    address: CONTRACT_ADDRESSES.MOCK_USDC,
    abi: MOCK_USDC_ABI,
    decimals: 6,
  },
  MNT: {
    address: CONTRACT_ADDRESSES.MOCK_MNT,
    abi: MOCK_MNT_ABI,
    decimals: 18,
  },
};

// ✅ PERFORMANCE: Balance cache with timestamps
interface BalanceCache {
  [key: string]: {
    balance: bigint;
    formatted: string;
    timestamp: number;
    blockNumber: number;
  };
}

const balanceCache: BalanceCache = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

// ✅ PERFORMANCE: Single optimized balance hook
export function useOptimizedBalance(token: AnyToken) {
  const { address } = useAccount();
  const { data: currentBlock } = useBlockNumber();
  const [cachedBalance, setCachedBalance] = useState<string>('0');
  const [isFromCache, setIsFromCache] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const tokenConfig = TOKEN_CONFIG[token];
  const cacheKey = `${token}-${address}`;

  // ✅ PERFORMANCE: Check cache first
  useEffect(() => {
    if (!address) return;

    const cached = balanceCache[cacheKey];
    if (cached) {
      const now = Date.now();
      const isStale = now - cached.timestamp > CACHE_TTL;
      
      if (!isStale) {
        setCachedBalance(cached.formatted);
        setIsFromCache(true);
        return;
      }
    }
    setIsFromCache(false);
  }, [cacheKey, address, currentBlock]);

  // ✅ PERFORMANCE: Optimized contract read
  const {
    data: balance,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: tokenConfig.address,
    abi: tokenConfig.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !isFromCache,
      staleTime: 20 * 1000, // 20 seconds
      cacheTime: 2 * 60 * 1000, // 2 minutes
      retry: 2,
      retryDelay: 1000,
      refetchInterval: false, // ✅ Disable auto-refetch for performance
      refetchOnWindowFocus: false, // ✅ Prevent issues when tabbing back
      refetchOnReconnect: true,
    },
  });

  // ✅ PERFORMANCE: Update cache and state when balance changes
  useEffect(() => {
    if (balance !== undefined && address && currentBlock) {
      const formatted = formatUnits(balance, tokenConfig.decimals);
      
      // Update cache
      balanceCache[cacheKey] = {
        balance,
        formatted,
        timestamp: Date.now(),
        blockNumber: Number(currentBlock),
      };
      
      setCachedBalance(formatted);
      setIsFromCache(false);

      // ✅ DEBUG: Log balance updates
      console.log(`💰 ${token} balance updated:`, {
        raw: balance.toString(),
        formatted,
        cached: false,
        block: Number(currentBlock),
      });
    }
  }, [balance, address, currentBlock, token, cacheKey, tokenConfig.decimals]);

  // ✅ PERFORMANCE: Smart refetch function
  const smartRefetch = async () => {
    const now = Date.now();
    
    // Throttle refetch calls
    if (now - lastFetchRef.current < 2000) {
      console.log(`⏱️ Throttling ${token} balance refetch`);
      return;
    }
    
    lastFetchRef.current = now;
    
    // Clear cache for this token
    delete balanceCache[cacheKey];
    setIsFromCache(false);
    
    // Trigger refetch
    return refetch();
  };

  return {
    data: balance,
    formatted: cachedBalance,
    isLoading: isLoading && !isFromCache,
    error,
    refetch: smartRefetch,
    isFromCache,
  };
}

// ✅ PERFORMANCE: Batch balance hook for multiple tokens
export function useOptimizedBalances(tokens: AnyToken[]) {
  const results = tokens.reduce((acc, token) => {
    acc[token] = useOptimizedBalance(token);
    return acc;
  }, {} as Record<AnyToken, ReturnType<typeof useOptimizedBalance>>);

  return {
    balances: results,
    isLoading: Object.values(results).some(r => r.isLoading),
    hasErrors: Object.values(results).some(r => r.error),
    refetchAll: () => {
      console.log('🔄 Refetching all balances...');
      return Promise.all(
        Object.values(results).map(r => r.refetch())
      );
    },
  };
}

// ✅ UTILITY: Format balance for display
export function formatBalance(balance: bigint | undefined, token: AnyToken): string {
  if (!balance) return '0';
  
  const decimals = TOKEN_CONFIG[token].decimals;
  const formatted = formatUnits(balance, decimals);
  
  // Smart formatting based on token type
  if (token === 'USDC') {
    return parseFloat(formatted).toFixed(2);
  } else {
    return parseFloat(formatted).toFixed(4);
  }
}

// ✅ PERFORMANCE: Clear all cached balances (for when switching accounts)
export function clearBalanceCache() {
  Object.keys(balanceCache).forEach(key => {
    delete balanceCache[key];
  });
  console.log('🗑️ Balance cache cleared');
}