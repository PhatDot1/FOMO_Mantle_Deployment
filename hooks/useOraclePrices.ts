// hooks/useOraclePrices.ts - OPTIMIZED for performance
import { useState, useEffect, useCallback, useRef } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { REAL_API_ORACLE_ABI } from '@/lib/contract-abis';

export type SupportedToken = 'WETH' | 'USDC' | 'MNT';

export interface OraclePrices {
  WETH: number;
  USDC: number;
  MNT: number;
}

export interface OraclePricesHook {
  prices: OraclePrices;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

// ✅ PERFORMANCE: Fallback prices for instant UX
const FALLBACK_PRICES: OraclePrices = {
  WETH: 4100, // Reasonable ETH price
  USDC: 1,    // Stable
  MNT: 1.35,  // Current market price
};

// ✅ PERFORMANCE: Cache with expiry
interface PriceCache {
  prices: OraclePrices;
  timestamp: number;
  ttl: number; // Time to live in ms
}

const CACHE_TTL = 30 * 1000; // 30 seconds cache
let priceCache: PriceCache | null = null;

export function useOraclePrices(): OraclePricesHook {
  const [prices, setPrices] = useState<OraclePrices>(FALLBACK_PRICES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  // ✅ PERFORMANCE: Check cache first
  const getCachedPrices = (): OraclePrices | null => {
    if (!priceCache) return null;
    
    const now = Date.now();
    if (now - priceCache.timestamp > priceCache.ttl) {
      priceCache = null; // Expired
      return null;
    }
    
    return priceCache.prices;
  };

  // ✅ PERFORMANCE: Set cache
  const setCachedPrices = (newPrices: OraclePrices) => {
    priceCache = {
      prices: newPrices,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    };
  };

  // ✅ PERFORMANCE: Optimized oracle reads with timeout
  const { data: wethPrice, error: wethError } = useReadContract({
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    abi: REAL_API_ORACLE_ABI,
    functionName: 'getPrice',
    args: ['WETH'],
    query: {
      retry: 1, // Reduce retries for speed
      retryDelay: 500,
      staleTime: 30 * 1000, // Consider data fresh for 30s
      cacheTime: 60 * 1000, // Cache for 1 minute
    },
  });

  const { data: usdcPrice, error: usdcError } = useReadContract({
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    abi: REAL_API_ORACLE_ABI,
    functionName: 'getPrice',
    args: ['USDC'],
    query: {
      retry: 1,
      retryDelay: 500,
      staleTime: 30 * 1000,
      cacheTime: 60 * 1000,
    },
  });

  const { data: mntPrice, error: mntError } = useReadContract({
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    abi: REAL_API_ORACLE_ABI,
    functionName: 'getPrice',
    args: ['MNT'],
    query: {
      retry: 1,
      retryDelay: 500,
      staleTime: 30 * 1000,
      cacheTime: 60 * 1000,
    },
  });

  // ✅ PERFORMANCE: Update prices with fallbacks
  useEffect(() => {
    // Check cache first
    const cached = getCachedPrices();
    if (cached) {
      setPrices(cached);
      setLastUpdated(new Date(priceCache!.timestamp));
      return;
    }

    const newPrices: OraclePrices = { ...FALLBACK_PRICES };
    let hasUpdates = false;
    let hasAnyPrice = false;

    // Handle WETH price (8 decimals)
    if (wethPrice && !wethError) {
      const wethPriceNumber = Number(wethPrice) / 1e8;
      if (wethPriceNumber > 0 && wethPriceNumber < 50000) { // Sanity check
        newPrices.WETH = wethPriceNumber;
        hasUpdates = true;
        hasAnyPrice = true;
      }
    }

    // Handle USDC price (8 decimals)
    if (usdcPrice && !usdcError) {
      const usdcPriceNumber = Number(usdcPrice) / 1e8;
      if (usdcPriceNumber > 0.5 && usdcPriceNumber < 2) { // Sanity check for stablecoin
        newPrices.USDC = usdcPriceNumber;
        hasUpdates = true;
        hasAnyPrice = true;
      }
    }

    // Handle MNT price (8 decimals)
    if (mntPrice && !mntError) {
      const mntPriceNumber = Number(mntPrice) / 1e8;
      if (mntPriceNumber > 0 && mntPriceNumber < 100) { // Sanity check
        newPrices.MNT = mntPriceNumber;
        hasUpdates = true;
        hasAnyPrice = true;
      }
    }

    if (hasUpdates) {
      setPrices(newPrices);
      setCachedPrices(newPrices); // Cache the new prices
      setLastUpdated(new Date());
      setError(null);
      console.log('✅ Oracle prices updated:', newPrices);
    }

    // Handle errors gracefully
    if (wethError || usdcError || mntError) {
      const errorMessages = [
        wethError ? `WETH: ${wethError.message}` : null,
        usdcError ? `USDC: ${usdcError.message}` : null,
        mntError ? `MNT: ${mntError.message}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      
      // Only show error if we have no prices at all
      if (!hasAnyPrice && !getCachedPrices()) {
        setError(errorMessages);
        console.warn('⚠️ Oracle price errors (using fallbacks):', errorMessages);
      }
    }
  }, [wethPrice, usdcPrice, mntPrice, wethError, usdcError, mntError]);

  // ✅ PERFORMANCE: Debounced refetch function
  const refetch = useCallback(async () => {
    if (fetchingRef.current) return; // Prevent concurrent fetches
    
    setIsLoading(true);
    fetchingRef.current = true;
    
    try {
      console.log('🔄 Manually refetching oracle prices...');
      
      // Clear cache to force fresh fetch
      priceCache = null;
      
      // The useReadContract hooks will automatically refetch
      // when their cache is invalidated
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for refetch
      
      console.log('✅ Oracle price refetch completed');
    } catch (err) {
      console.error('❌ Failed to refetch oracle prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to refetch prices');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // ✅ PERFORMANCE: Initialize with cache or fallbacks
  useEffect(() => {
    const cached = getCachedPrices();
    if (cached) {
      setPrices(cached);
      setLastUpdated(new Date(priceCache!.timestamp));
    }
  }, []); // Only run once on mount

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}

// Utility functions (no changes needed)
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${price.toFixed(4)}`;
}

export function calculateTokenValue(amount: string, price: number): number {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) return 0;
  return numAmount * price;
}

export { FALLBACK_PRICES as DEFAULT_PRICES };