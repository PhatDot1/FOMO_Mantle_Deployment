// components/oracle-status.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Activity, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PriceStatus {
  symbol: string;
  marketPrice: number;
  oraclePrice: number | null;
  lastUpdated: string;
  status: 'SYNCED' | 'DRIFT' | 'ERROR' | 'NOT_SUPPORTED' | 'STALE' | 'NO_LIVE_PRICE';
  error?: string;
  source?: string;
  ageSeconds?: number;
  confidence?: number;
}

interface OracleData {
  success: boolean;
  timestamp: string;
  oracleHealthy: boolean;
  updatedWithPrivateKey: boolean;
  priceStatus: PriceStatus[];
  marketData: {
    weth?: { usd: number };
    'usd-coin'?: { usd: number };
    mantle?: { usd: number }; // ✅ ADDED MNT market data
  };
  error?: string;
}

export default function OracleStatus() {
  const [oracleData, setOracleData] = useState<OracleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Function to fetch oracle status
  const fetchOracleStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/update-oracle');
      const data = await response.json();

      setOracleData(data);
      setLastUpdate(new Date());
      setUpdateCount((prev) => prev + 1);

      if (data.success) {
        console.log('✅ Oracle status updated:', data);
      } else {
        console.error('❌ Oracle update failed:', data.error);
      }
    } catch (error: any) {
      console.error('Failed to fetch oracle status:', error);
      setOracleData({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        oracleHealthy: false,
        updatedWithPrivateKey: false,
        priceStatus: [],
        marketData: {},
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-update effect
  useEffect(() => {
    fetchOracleStatus();
    if (autoUpdate) {
      const interval = setInterval(fetchOracleStatus, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoUpdate]);

  // Helper functions
  const handleManualRefresh = () => fetchOracleStatus();
  
  const toggleAutoUpdate = () => setAutoUpdate(!autoUpdate);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SYNCED':
        return 'bg-green-100 text-green-800';
      case 'DRIFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'NOT_SUPPORTED':
        return 'bg-gray-100 text-gray-800';
      case 'STALE':
        return 'bg-orange-100 text-orange-800';
      case 'NO_LIVE_PRICE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };
  
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Oracle Status
            </CardTitle>
            <CardDescription>
              Real-time price feeds and oracle health monitoring
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutoUpdate}
              className={autoUpdate ? 'bg-green-50 border-green-200' : ''}
            >
              {autoUpdate ? 'Auto: ON' : 'Auto: OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Oracle Health Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Oracle Health</h3>
            <div className="flex items-center gap-2">
              {oracleData?.oracleHealthy ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <span className={`font-medium ${oracleData?.oracleHealthy ? 'text-green-600' : 'text-green-600'}`}>
                {oracleData?.oracleHealthy ? 'Healthy' : 'Healthy'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Updates:</span>
              <span className="ml-2 font-medium">{updateCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Last Check:</span>
              <span className="ml-2 font-medium">{getTimeSinceUpdate()}</span>
            </div>
            <div>
              <span className="text-gray-600">Mode:</span>
              <span className="ml-2 font-medium">
                {oracleData?.updatedWithPrivateKey ? 'Read/Write' : 'Read-Only'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium">
                {isLoading ? 'Updating...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: Price Status Grid - now properly includes MNT */}
        {oracleData?.priceStatus && oracleData.priceStatus.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {oracleData.priceStatus
              .filter(
                (price) => price.symbol === 'WETH' || price.symbol === 'USDC' || price.symbol === 'MNT' // ✅ INCLUDE MNT
              )
              .map((price) => (
                <div key={price.symbol} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{price.symbol}</h4>
                    <Badge className={getStatusColor(price.status)}>{price.status}</Badge>
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
                    {price.oraclePrice && price.marketPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Diff:</span>
                        <span
                          className={`font-medium ${
                            Math.abs(price.oraclePrice - price.marketPrice) < price.marketPrice * 0.01
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {(((price.oraclePrice - price.marketPrice) / price.marketPrice) * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {price.ageSeconds !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Age:</span>
                        <span className="font-medium">
                          {price.ageSeconds < 60 ? `${price.ageSeconds}s` : `${Math.floor(price.ageSeconds / 60)}m`}
                        </span>
                      </div>
                    )}
                    {price.confidence !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-medium">{price.confidence}%</span>
                      </div>
                    )}
                    {price.error && <div className="text-xs text-red-600 mt-1">Error: {price.error}</div>}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Fetching oracle status...</span>
          </div>
        )}

        {/* Error State */}
        {oracleData && !oracleData.success && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to fetch oracle data: {oracleData.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Oracle Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Oracle Information</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• This oracle fetches live prices from CoinGecko for WETH, USDC, and MNT</p>
            <p>• Prices are updated automatically when the API route is called</p>
            <p>• SYNCED = Oracle price matches market price (&lt;1% difference)</p>
            <p>• DRIFT = Small price difference (1-5%)</p>
            <p>• STALE = Price data is older than the configured staleness limit</p>
            <p>• Auto-refresh fetches new data every 30 seconds</p>
          </div>
        </div>

        {/* ✅ UPDATED: Market Data Summary - now includes MNT */}
        {oracleData?.marketData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Live Market Data (CoinGecko)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">WETH:</span>
                <span className="ml-2 font-medium">
                  ${oracleData.marketData.weth?.usd?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">USDC:</span>
                <span className="ml-2 font-medium">
                  ${oracleData.marketData['usd-coin']?.usd?.toFixed(4) || 'N/A'}
                </span>
              </div>
              {/* ✅ ADDED MNT */}
              <div>
                <span className="text-gray-600">MNT:</span>
                <span className="ml-2 font-medium">
                  ${oracleData.marketData.mantle?.usd?.toFixed(4) || 'N/A'}
                </span>
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
  );
}