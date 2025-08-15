// components/oracle-status.tsx - FIXED: WETH and USDC only (no ETH)
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Activity, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PriceStatus {
  symbol: string
  marketPrice: number
  oraclePrice: number | null
  lastUpdated: string
  status: 'SYNCED' | 'DRIFT' | 'ERROR' | 'NOT_SUPPORTED'
  error?: string
}

interface OracleData {
  success: boolean
  timestamp: string
  oracleHealthy: boolean
  updatedWithPrivateKey: boolean
  priceStatus: PriceStatus[]
  marketData: any
  error?: string
}

export default function OracleStatus() {
  const [oracleData, setOracleData] = useState<OracleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [updateCount, setUpdateCount] = useState(0)

  // Function to fetch oracle status
  const fetchOracleStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/update-oracle')
      const data = await response.json()
      
      setOracleData(data)
      setLastUpdate(new Date())
      setUpdateCount(prev => prev + 1)
      
      if (data.success) {
        console.log('✅ Oracle status updated:', data)
      } else {
        console.error('❌ Oracle update failed:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch oracle status:', error)
      setOracleData({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        oracleHealthy: false,
        updatedWithPrivateKey: false,
        priceStatus: [],
        marketData: {}
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-update effect
  useEffect(() => {
    // Initial fetch
    fetchOracleStatus()

    // Set up auto-update interval
    if (autoUpdate) {
      const interval = setInterval(fetchOracleStatus, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoUpdate])

  // Manual refresh
  const handleManualRefresh = () => {
    fetchOracleStatus()
  }

  // Toggle auto-update
  const toggleAutoUpdate = () => {
    setAutoUpdate(!autoUpdate)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SYNCED': return 'bg-green-100 text-green-700'
      case 'DRIFT': return 'bg-yellow-100 text-yellow-700'
      case 'ERROR': return 'bg-red-100 text-red-700'
      case 'NOT_SUPPORTED': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Format price
  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A'
    if (price > 1000) return `$${price.toLocaleString()}`
    return `$${price.toFixed(4)}`
  }

  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Never'
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Oracle Status</span>
              {oracleData?.oracleHealthy ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>
              Live market price feeds • Updates: {updateCount} • {getTimeSinceUpdate()}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={autoUpdate ? "default" : "outline"}>
              {autoUpdate ? 'Auto-Update ON' : 'Auto-Update OFF'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutoUpdate}
              className={autoUpdate ? 'bg-green-50 border-green-200' : ''}
            >
              {autoUpdate ? 'Stop' : 'Start'} Auto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Oracle Health Status */}
        {oracleData && (
          <div className="mb-6">
            {oracleData.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Oracle is healthy and connected. 
                  {oracleData.updatedWithPrivateKey ? ' Prices updated on-chain.' : ' Read-only mode (no private key).'}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Oracle connection failed: {oracleData.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Price Status Grid - WETH and USDC only */}
        {oracleData?.priceStatus && oracleData.priceStatus.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {oracleData.priceStatus
              .filter(price => price.symbol === 'WETH' || price.symbol === 'USDC') // ✅ FIXED: Only show WETH and USDC
              .map((price) => (
              <div key={price.symbol} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg">{price.symbol}</h4>
                  <Badge className={getStatusColor(price.status)}>
                    {price.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Market:</span>
                    <span className="font-medium">{formatPrice(price.marketPrice)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Oracle:</span>
                    <span className="font-medium">{formatPrice(price.oraclePrice)}</span>
                  </div>

                  {price.oraclePrice && price.marketPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Diff:</span>
                      <span className={`font-medium ${
                        Math.abs(price.oraclePrice - price.marketPrice) < (price.marketPrice * 0.01) 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {((price.oraclePrice - price.marketPrice) / price.marketPrice * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}

                  {price.error && (
                    <div className="text-xs text-red-600 mt-1">
                      Error: {price.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !oracleData && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading oracle status...</span>
          </div>
        )}

        {/* Oracle Help Section */}
        {oracleData?.priceStatus && oracleData.priceStatus.some(p => p.status === 'NOT_SUPPORTED' || p.status === 'ERROR') && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Oracle Setup Required</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Some tokens aren't supported yet. To fix this:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Run the oracle update script: <code className="bg-blue-100 px-1 rounded">npx hardhat run scripts/setup-contracts.js --network mantle_testnet</code></li>
                <li>Or call the API with a private key: Add <code className="bg-blue-100 px-1 rounded">ORACLE_PRIVATE_KEY</code> to your .env.local</li>
                <li>The oracle will automatically initialize missing tokens</li>
              </ol>
            </div>
          </div>
        )}

        {/* Market Data Summary - ✅ FIXED: Show WETH and USDC only */}
        {oracleData?.marketData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Live Market Data (CoinGecko)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">WETH:</span>
                <span className="ml-2 font-medium">${oracleData.marketData.weth?.usd?.toLocaleString() || oracleData.marketData.ethereum?.usd?.toLocaleString() || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">USDC:</span>
                <span className="ml-2 font-medium">${oracleData.marketData['usd-coin']?.usd?.toFixed(4) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Update:</span>
                <span className="ml-2 font-medium">{getTimeSinceUpdate()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}