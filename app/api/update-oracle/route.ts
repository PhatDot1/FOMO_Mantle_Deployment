// app/api/update-oracle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { mantleSepolia } from '@/lib/web3-config'
import { CONTRACT_ADDRESSES } from '@/lib/web3-config'

// Oracle ABI - just the functions we need
const ORACLE_ABI = parseAbi([
  'function updateLivePrice(string symbol, uint256 price, uint8 confidence, string source) external',
  'function getPrice(string symbol) external view returns (uint256)',
  'function isHealthy() external view returns (bool)',
])

// Create a public client for reading
const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http(),
})

export async function GET() {
  try {
    console.log('🔄 Starting oracle price update...')

    // 1. Fetch live market data from CoinGecko
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,weth,usd-coin,tether&vs_currencies=usd', {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const priceData = await response.json()
    console.log('📊 Fetched live prices:', priceData)

    // 2. Convert to 8-decimal format for oracle
    const priceUpdates = [
      {
        symbol: 'ETH',
        price: BigInt(Math.floor(priceData.ethereum.usd * 1e8)),
        confidence: 95,
        actualPrice: priceData.ethereum.usd
      },
      {
        symbol: 'BTC', 
        price: BigInt(Math.floor(priceData.bitcoin.usd * 1e8)),
        confidence: 95,
        actualPrice: priceData.bitcoin.usd
      },
      {
        symbol: 'WETH',
        price: BigInt(Math.floor(priceData.weth.usd * 1e8)),
        confidence: 95,
        actualPrice: priceData.weth.usd
      },
      {
        symbol: 'USDC',
        price: BigInt(Math.floor(priceData['usd-coin'].usd * 1e8)),
        confidence: 99,
        actualPrice: priceData['usd-coin'].usd
      },
      {
        symbol: 'USDT',
        price: BigInt(Math.floor(priceData.tether.usd * 1e8)),
        confidence: 99,
        actualPrice: priceData.tether.usd
      }
    ]

    // 3. Check if we have a private key for updates (optional)
    const privateKey = process.env.ORACLE_PRIVATE_KEY
    
    if (privateKey) {
      console.log('🔑 Private key found, updating oracle on-chain...')
      
      // Create wallet client for writing
      const walletClient = createWalletClient({
        chain: mantleSepolia,
        transport: http(),
        account: privateKey as `0x${string}`,
      })

      // Update each price
      for (const update of priceUpdates) {
        try {
          const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESSES.PRICE_ORACLE,
            abi: ORACLE_ABI,
            functionName: 'updateLivePrice',
            args: [
              update.symbol,
              update.price,
              update.confidence,
              'CoinGecko API - Auto Update'
            ],
          })
          
          console.log(`✅ ${update.symbol}: $${update.actualPrice} -> tx: ${hash}`)
        } catch (error) {
          console.error(`❌ Failed to update ${update.symbol}:`, error)
        }
      }
    } else {
      console.log('⚠️ No private key provided - returning prices without on-chain update')
    }

    // 4. Verify current oracle prices
    const oracleStatus = []
    
    for (const update of priceUpdates) {
      try {
        const oraclePrice = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.PRICE_ORACLE,
          abi: ORACLE_ABI,
          functionName: 'getPrice',
          args: [update.symbol],
        })
        
        const oraclePriceFormatted = Number(oraclePrice) / 1e8
        
        oracleStatus.push({
          symbol: update.symbol,
          marketPrice: update.actualPrice,
          oraclePrice: oraclePriceFormatted,
          lastUpdated: new Date().toISOString(),
          status: Math.abs(oraclePriceFormatted - update.actualPrice) < (update.actualPrice * 0.05) ? 'SYNCED' : 'DRIFT'
        })
      } catch (error) {
        oracleStatus.push({
          symbol: update.symbol,
          marketPrice: update.actualPrice,
          oraclePrice: null,
          lastUpdated: new Date().toISOString(),
          status: 'ERROR',
          error: error.message
        })
      }
    }

    // 5. Check oracle health
    let isHealthy = false
    try {
      isHealthy = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.PRICE_ORACLE,
        abi: ORACLE_ABI,
        functionName: 'isHealthy',
      })
    } catch (error) {
      console.error('Error checking oracle health:', error)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      oracleHealthy: isHealthy,
      updatedWithPrivateKey: !!privateKey,
      priceStatus: oracleStatus,
      marketData: priceData,
    })

  } catch (error) {
    console.error('💥 Oracle update failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function POST() {
  // Same as GET for now, but could be extended for manual updates
  return GET()
}