// app/api/update-oracle/route.ts - FIXED with proper nonce management
import { NextRequest, NextResponse } from 'next/server'
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mantleSepolia } from '@/lib/web3-config'

export const dynamic = 'force-dynamic'

// ───────────────────────────────────────────────────────────────────────────────
// CONFIG - UPDATED ADDRESSES
// ───────────────────────────────────────────────────────────────────────────────

const CONTRACT_ADDRESSES = {
  PRICE_ORACLE: '0xD6c7693c122dF70E3e8807411222d4aC60069b00',
} as const

// Update more frequently for testing - every 30 seconds
const UPDATE_INTERVAL_SECONDS = 30

// In-memory throttle (per server instance)
let lastWriteMs = 0
let isUpdating = false

// ───────────────────────────────────────────────────────────────────────────────
// ORACLE ABI (matches your RealAPIOracle)
// ───────────────────────────────────────────────────────────────────────────────

const ORACLE_ABI = [
  // write
  {
    inputs: [
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'priceInUSD', type: 'uint256' },
      { internalType: 'uint256', name: 'confidence', type: 'uint256' },
      { internalType: 'string', name: 'source', type: 'string' },
    ],
    name: 'updateLivePrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // reads
  {
    inputs: [{ internalType: 'string', name: 'tokenSymbol', type: 'string' }],
    name: 'getPrice',
    outputs: [{ internalType: 'uint256', name: 'price', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isHealthy',
    outputs: [{ internalType: 'bool', name: 'healthy', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

  // non-reverting detailed read
  {
    inputs: [{ internalType: 'string', name: 'symbol', type: 'string' }],
    name: 'getLivePriceInfo',
    outputs: [
      { internalType: 'uint256', name: 'price', type: 'uint256' },       // 8 decimals
      { internalType: 'uint256', name: 'lastUpdated', type: 'uint256' },
      { internalType: 'uint256', name: 'confidence', type: 'uint256' },
      { internalType: 'string',  name: 'source', type: 'string' },
      { internalType: 'bool',    name: 'isLive', type: 'bool' },
      { internalType: 'uint256', name: 'ageSeconds', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // convenience
  {
    inputs: [{ internalType: 'string', name: 'symbol', type: 'string' }],
    name: 'supportedSymbols',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'maxStaleness', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'isAPIUpdater',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

  // errors (so viem can decode)
  { type: 'error', name: 'UnsupportedSymbol', inputs: [{ name: 'symbol', type: 'string' }] },
  { type: 'error', name: 'PriceNotAvailable', inputs: [{ name: 'symbol', type: 'string' }] },
  { type: 'error', name: 'StalePrice', inputs: [{ name: 'symbol', type: 'string' }] },
  { type: 'error', name: 'Unauthorized', inputs: [] },
] as const

type PriceStatus = {
  symbol: 'WETH' | 'USDC' | 'MNT'
  marketPrice: number
  oraclePrice: number | null
  lastUpdated: string | null
  status: 'SYNCED' | 'DRIFT' | 'ERROR' | 'NOT_SUPPORTED' | 'STALE' | 'NO_LIVE_PRICE'
  error?: string
  source?: string
  ageSeconds?: number
  confidence?: number
}

// Token mapping: use *real* market assets for our *mock* symbols.
const TOKENS = [
  { symbol: 'WETH' as const, coingeckoKey: 'weth' },       // real WETH price
  { symbol: 'USDC' as const, coingeckoKey: 'usd-coin' },   // real USDC price
  { symbol: 'MNT' as const, coingeckoKey: 'mantle' },      // real MNT price
]

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────────────

function nowMs() {
  return Date.now()
}

function shouldWrite(): boolean {
  const delta = (nowMs() - lastWriteMs) / 1000
  return delta >= UPDATE_INTERVAL_SECONDS
}

// Convert a float price to 8-decimals BigInt
function toPrice8Decimals(market: number): bigint {
  // guard
  if (!Number.isFinite(market) || market <= 0) return 0n
  // Convert to 8 decimals for the oracle contract
  const price8Dec = Math.floor(market * 1e8)
  return BigInt(price8Dec)
}

function pctDiff(a: number, b: number) {
  const d = Math.abs(a - b)
  return b === 0 ? 0 : (d / b) * 100
}

// ✅ FIXED: Add proper delay function
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ───────────────────────────────────────────────────────────────────────────────
// ROUTE
// ───────────────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const publicClient = createPublicClient({ chain: mantleSepolia, transport: http() })

  // 1) Fetch market prices for WETH, USDC, and MNT
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=weth,usd-coin,mantle&vs_currencies=usd'
  const marketRes = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!marketRes.ok) {
    return NextResponse.json({ success: false, error: `CoinGecko ${marketRes.status}` }, { status: 502 })
  }
  const marketJson = await marketRes.json() as Record<string, { usd: number }>

  console.log('📊 Fetched market prices:', marketJson)

  // 2) Build wallet client if we *may* write
  let walletClient: ReturnType<typeof createWalletClient> | null = null
  let account: ReturnType<typeof privateKeyToAccount> | null = null
  let updatedWithPrivateKey = false
  let authorizationStatus = 'Not checked'
  let updateResults: { [key: string]: string } = {}

  const attemptWrite = shouldWrite()
  console.log(`🔧 Should attempt write: ${attemptWrite} (last write: ${(nowMs() - lastWriteMs) / 1000}s ago)`)

  if (attemptWrite && !isUpdating) {
    const pk = process.env.ORACLE_PRIVATE_KEY
    console.log(`🔑 Private key available: ${pk ? 'YES' : 'NO'}`)
    
    if (pk && pk.startsWith('0x') && pk.length === 66) {
      try {
        account = privateKeyToAccount(pk as `0x${string}`)
        walletClient = createWalletClient({ account, chain: mantleSepolia, transport: http() })
        console.log(`📝 Wallet client created for: ${account.address}`)

        // Check if this account is authorized
        try {
          const isUpdater = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.PRICE_ORACLE,
            abi: ORACLE_ABI,
            functionName: 'isAPIUpdater',
            args: [account.address],
          })
          authorizationStatus = isUpdater ? 'Authorized ✅' : 'Not Authorized ❌'
          console.log(`🔐 Authorization status: ${authorizationStatus}`)
          
          if (isUpdater) {
            updatedWithPrivateKey = true
          }
        } catch (authError) {
          console.error('❌ Error checking authorization:', authError)
          authorizationStatus = 'Check Failed'
        }
      } catch (walletError) {
        console.error('❌ Error creating wallet:', walletError)
        updatedWithPrivateKey = false
      }
    } else {
      console.log('❌ Invalid or missing ORACLE_PRIVATE_KEY')
    }
  }

  // 3) ✅ FIXED: Perform write cycle with proper nonce management
  if (attemptWrite && walletClient && account && updatedWithPrivateKey && !isUpdating) {
    isUpdating = true
    console.log('🔄 Starting price update cycle...')
    
    try {
      // ✅ FIXED: Get current nonce and manage it manually
      let currentNonce = await publicClient.getTransactionCount({
        address: account.address,
        blockTag: 'pending'
      })
      console.log(`📋 Starting nonce: ${currentNonce}`)

      // Write all three tokens sequentially with proper nonce management
      for (const t of TOKENS) {
        const marketPrice = marketJson[t.coingeckoKey]?.usd
        if (!marketPrice) {
          console.log(`⚠️ No market price for ${t.symbol}`)
          updateResults[t.symbol] = 'No market price'
          continue
        }

        const price8Dec = toPrice8Decimals(marketPrice)
        console.log(`💰 ${t.symbol}: $${marketPrice} → ${price8Dec.toString()} (8-decimal)`)
        
        try {
          // ✅ FIXED: Use manual nonce management
          const tx = await walletClient.writeContract({
            address: CONTRACT_ADDRESSES.PRICE_ORACLE,
            abi: ORACLE_ABI,
            functionName: 'updateLivePrice',
            args: [t.symbol, price8Dec, 95n, 'NextJS API: CoinGecko'],
            nonce: currentNonce, // ✅ FIXED: Explicitly set nonce
          })
          console.log(`✅ ${t.symbol} update tx: ${tx}`)
          updateResults[t.symbol] = `Success: ${tx}`
          
          // ✅ FIXED: Increment nonce for next transaction
          currentNonce++
          
          // ✅ FIXED: Wait longer between transactions (3 seconds)
          await delay(3000)
        } catch (e: any) {
          console.error(`❌ Failed to update ${t.symbol}:`, e.shortMessage || e.message)
          updateResults[t.symbol] = `Error: ${e.shortMessage || e.message}`
          // Continue with other tokens, but increment nonce in case the tx was actually sent
          currentNonce++
        }
      }

      lastWriteMs = nowMs()
      console.log('✅ Price update cycle completed')
    } catch (error) {
      console.error('❌ Update cycle failed:', error)
    } finally {
      isUpdating = false
    }
  }

  // 4) Read back state using non-reverting getter
  const priceStatus: PriceStatus[] = []
  for (const t of TOKENS) {
    const marketPrice = marketJson[t.coingeckoKey]?.usd ?? 0
    let supported = false
    let info:
      | { price: bigint; lastUpdated: bigint; confidence: bigint; source: string; isLive: boolean; ageSeconds: bigint }
      | null = null
    let status: PriceStatus['status'] = 'ERROR'
    let error: string | undefined
    let oraclePrice: number | null = null
    let lastUpdated: string | null = null
    let ageSecondsNum: number | undefined
    let confidenceNum: number | undefined
    let source: string | undefined

    try {
      supported = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.PRICE_ORACLE,
        abi: ORACLE_ABI,
        functionName: 'supportedSymbols',
        args: [t.symbol],
      }) as boolean

      if (!supported) {
        status = 'NOT_SUPPORTED'
      } else {
        const result = (await publicClient.readContract({
          address: CONTRACT_ADDRESSES.PRICE_ORACLE,
          abi: ORACLE_ABI,
          functionName: 'getLivePriceInfo',
          args: [t.symbol],
        })) as unknown as [
          bigint, // price (8d)
          bigint, // lastUpdated
          bigint, // confidence
          string, // source
          boolean, // isLive
          bigint, // ageSeconds
        ]

        info = {
          price: result[0],
          lastUpdated: result[1],
          confidence: result[2],
          source: result[3],
          isLive: result[4],
          ageSeconds: result[5],
        }

        if (!info.isLive) {
          status = 'NO_LIVE_PRICE'
        } else {
          oraclePrice = Number(info.price) / 1e8 // Convert from 8 decimals
          lastUpdated = new Date(Number(info.lastUpdated) * 1000).toISOString()
          ageSecondsNum = Number(info.ageSeconds)
          confidenceNum = Number(info.confidence)
          source = info.source

          // Staleness check against contract's maxStaleness
          const maxStale = (await publicClient.readContract({
            address: CONTRACT_ADDRESSES.PRICE_ORACLE,
            abi: ORACLE_ABI,
            functionName: 'maxStaleness',
          })) as bigint

          if (ageSecondsNum > Number(maxStale)) {
            status = 'STALE'
          } else if (oraclePrice && marketPrice) {
            const diff = pctDiff(oraclePrice, marketPrice)
            status = diff < 1 ? 'SYNCED' : diff < 5 ? 'DRIFT' : 'ERROR'
          } else {
            status = 'ERROR'
          }
        }
      }
    } catch (e: any) {
      // If anything throws, classify helpfully
      const msg = (e?.shortMessage || e?.message || 'read failed') as string
      error = msg.includes('UnsupportedSymbol') ? 'UnsupportedSymbol' :
              msg.includes('PriceNotAvailable') ? 'PriceNotAvailable' :
              msg.includes('StalePrice') ? 'StalePrice' : msg
      status = msg.includes('UnsupportedSymbol') ? 'NOT_SUPPORTED' : 'ERROR'
    }

    priceStatus.push({
      symbol: t.symbol,
      marketPrice,
      oraclePrice,
      lastUpdated,
      status,
      error,
      source,
      ageSeconds: ageSecondsNum,
      confidence: confidenceNum,
    })
  }

  // 5) Health check
  let oracleHealthy = false
  try {
    oracleHealthy = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.PRICE_ORACLE,
      abi: ORACLE_ABI,
      functionName: 'isHealthy',
    })) as boolean
  } catch {
    oracleHealthy = false
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    oracleHealthy,
    updatedWithPrivateKey,
    authorizationStatus,
    updateResults, // ✅ ADDED: Show individual update results
    priceStatus,
    marketData: {
      weth: { usd: marketJson['weth']?.usd ?? null },
      'usd-coin': { usd: marketJson['usd-coin']?.usd ?? null },
      mantle: { usd: marketJson['mantle']?.usd ?? null },
    },
    message: updatedWithPrivateKey
      ? `Oracle prices updated! WETH: ${updateResults.WETH || 'N/A'}, USDC: ${updateResults.USDC || 'N/A'}, MNT: ${updateResults.MNT || 'N/A'}`
      : `Read-only mode: ${authorizationStatus}. Next write attempt in ${Math.max(0, UPDATE_INTERVAL_SECONDS - Math.floor((nowMs() - lastWriteMs)/1000))}s`,
  })
}