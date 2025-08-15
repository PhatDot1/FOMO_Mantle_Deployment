// app/api/update-oracle/route.ts
// Runtime: Node (not edge)
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
// CONFIG
// ───────────────────────────────────────────────────────────────────────────────

const CONTRACT_ADDRESSES = {
  PRICE_ORACLE: '0x1AC24F374baFcd0E2da27F1078CE8F4Da438561b',
} as const

// Run a state-changing update at most once every 10,000 seconds (≈2.78h)
const UPDATE_INTERVAL_SECONDS = 10_000

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
      // NOTE: contract expects price in 18 decimals; it converts to 8 internally
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

  // non-reverting detailed read (use this for UI)
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
  symbol: 'WETH' | 'USDC'
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

// Convert a float price to 18-decimals BigInt (for updateLivePrice input)
function toPrice18(market: number): bigint {
  // guard
  if (!Number.isFinite(market) || market <= 0) return 0n
  // use viem's parseUnits to avoid FP mistakes
  return parseUnits(market.toFixed(18), 18)
}

function pctDiff(a: number, b: number) {
  const d = Math.abs(a - b)
  return b === 0 ? 0 : (d / b) * 100
}

// ───────────────────────────────────────────────────────────────────────────────
// ROUTE
// ───────────────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const publicClient = createPublicClient({ chain: mantleSepolia, transport: http() })

  // 1) Fetch market prices (WETH, USDC only)
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=weth,usd-coin&vs_currencies=usd'
  const marketRes = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!marketRes.ok) {
    return NextResponse.json({ success: false, error: `CoinGecko ${marketRes.status}` }, { status: 502 })
  }
  const marketJson = await marketRes.json() as Record<string, { usd: number }>

  // 2) Build wallet client if we *may* write
  let walletClient: ReturnType<typeof createWalletClient> | null = null
  let account: ReturnType<typeof privateKeyToAccount> | null = null
  let updatedWithPrivateKey = false

  const attemptWrite = shouldWrite()
  if (attemptWrite && !isUpdating) {
    const pk = process.env.ORACLE_PRIVATE_KEY
    if (pk && pk.startsWith('0x') && pk.length === 66) {
      try {
        account = privateKeyToAccount(pk as `0x${string}`)
        walletClient = createWalletClient({ account, chain: mantleSepolia, transport: http() })
        updatedWithPrivateKey = true
      } catch {
        // ignore; will fall back to read-only
        updatedWithPrivateKey = false
      }
    }
  }

  // 3) Optionally perform a *single* write cycle (throttled)
  if (attemptWrite && walletClient && account && !isUpdating) {
    isUpdating = true
    try {
      // Optional: check if this account is authorized updater
      // (not strictly required; we'll catch Unauthorized on write)
      // const isUpdater = await publicClient.readContract({
      //   address: CONTRACT_ADDRESSES.PRICE_ORACLE,
      //   abi: ORACLE_ABI,
      //   functionName: 'isAPIUpdater',
      //   args: [account.address],
      // })
      // if (!isUpdater) console.log('ℹ️ Not an authorized API updater; writes may revert.')

      // Write both tokens sequentially
      for (const t of TOKENS) {
        const marketPrice = marketJson[t.coingeckoKey]?.usd
        if (!marketPrice) continue

        const price18 = toPrice18(marketPrice) // 18-dec as expected by updateLivePrice
        try {
          await walletClient.writeContract({
            address: CONTRACT_ADDRESSES.PRICE_ORACLE,
            abi: ORACLE_ABI,
            functionName: 'updateLivePrice',
            args: [t.symbol, price18, 95n, 'CoinGecko: WETH/USDC'],
          })
          // tiny pause helps explorers pick it up before we read
          await new Promise((r) => setTimeout(r, 1200))
        } catch (e: any) {
          // Unauthorized or any revert — we’ll continue read-only
          updatedWithPrivateKey = false
        }
      }

      lastWriteMs = nowMs()
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
          oraclePrice = Number(info.price) / 1e8
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
      // If anything throws (including custom errors from getPrice), classify helpfully
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

  // 5) Health
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
    priceStatus,
    marketData: {
      weth: { usd: marketJson['weth']?.usd ?? null },
      'usd-coin': { usd: marketJson['usd-coin']?.usd ?? null },
    },
    message: updatedWithPrivateKey
      ? `Oracle prices updated (throttled ≥ ${UPDATE_INTERVAL_SECONDS}s)`
      : `Read-only mode (next write after ${Math.max(0, UPDATE_INTERVAL_SECONDS - Math.floor((nowMs() - lastWriteMs)/1000))}s)`,
  })
}
