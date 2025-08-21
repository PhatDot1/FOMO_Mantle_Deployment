"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Coins, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAccount } from 'wagmi'
import { useTomoWallet } from '@/contexts/tomo-wallet-context'
import { useFaucetBalance, useFaucetClaim, useFaucetCooldown, formatTokenAmount, AnyToken } from '@/hooks/useContracts'

export default function FaucetPage() {
  // ✅ OPTIMIZED: Simplified state for testing
  const [selectedToken, setSelectedToken] = useState<AnyToken>('WETH')
  const [customAmount, setCustomAmount] = useState('')
  const [useCustomAmount, setUseCustomAmount] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const { address, isConnected } = useAccount()
  const { connectWallet, isConnecting } = useTomoWallet()
  
  // ✅ OPTIMIZED: Fetch all balances for better UX
  const { data: wethBalance, refetch: refetchWethBalance } = useFaucetBalance('WETH')
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useFaucetBalance('USDC')
  const { data: mntBalance, refetch: refetchMntBalance } = useFaucetBalance('MNT')
  
  // ✅ ADDED: Cooldown hooks for proper faucet management
  const { canUseFaucet, timeLeft } = useFaucetCooldown(selectedToken)
  const { claimFaucet, isPending, isSuccess, error } = useFaucetClaim(selectedToken)
  
  // ✅ UPDATED: Token configuration reflecting actual contract capabilities
  const tokenConfig = {
    WETH: {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      maxFaucetAmount: '100', 
      defaultFaucetAmount: '10',
      supportsCustomAmount: true // ✨ WETH supports custom amounts
    },
    USDC: {
      name: 'USD Coin',
      symbol: 'USDC', 
      decimals: 6,
      maxFaucetAmount: '50000', 
      defaultFaucetAmount: '1000',
      supportsCustomAmount: true // ✨ USDC supports custom amounts
    },
    MNT: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
      maxFaucetAmount: '100', 
      defaultFaucetAmount: '100', // ✨ Fixed amount only
      supportsCustomAmount: false // ✨ MNT only supports fixed 100 MNT
    }
  }
  
  const currentConfig = tokenConfig[selectedToken]
  
  // ✅ OPTIMIZED: Handle faucet claim with better error handling
  const handleClaimFaucet = async () => {
    if (!isConnected) {
      await connectWallet()
      return
    }
    
    setShowError(false)
    setShowSuccess(false)
    
    try {
      // ✨ FIXED: Only pass custom amount if token supports it and user selected custom
      if (useCustomAmount && customAmount && currentConfig.supportsCustomAmount) {
        claimFaucet(customAmount)
      } else {
        claimFaucet() // Always use default for MNT or when custom not selected
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to claim tokens')
      setShowError(true)
    }
  }
  
  // ✅ OPTIMIZED: Success handling with auto-refresh
  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true)
      setShowError(false)
      
      // Refresh the correct balance based on selected token
      const refreshBalance = () => {
        if (selectedToken === 'WETH') refetchWethBalance()
        if (selectedToken === 'USDC') refetchUsdcBalance()
        if (selectedToken === 'MNT') refetchMntBalance()
      }
      
      // Refresh immediately and after a short delay
      refreshBalance()
      setTimeout(refreshBalance, 2000)
      
      // Reset form
      setCustomAmount('')
      setUseCustomAmount(false)
      
      // Auto-hide success message
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [isSuccess, selectedToken, refetchWethBalance, refetchUsdcBalance, refetchMntBalance])
  
  // ✅ OPTIMIZED: Error handling
  useEffect(() => {
    if (error) {
      const message = error.message?.includes('User rejected') 
        ? 'Transaction cancelled by user'
        : error.message?.includes('insufficient funds')
        ? 'Insufficient funds for gas fees'
        : error.message?.includes('Faucet cooldown active')
        ? 'Faucet cooldown is active. Please wait before claiming again.'
        : error.message || 'Failed to claim tokens'
        
      setErrorMessage(message)
      setShowError(true)
      setTimeout(() => setShowError(false), 8000)
    }
  }, [error])
  
  // ✅ FIXED: Reset custom amount state when switching to MNT
  useEffect(() => {
    if (selectedToken === 'MNT' && useCustomAmount) {
      setUseCustomAmount(false)
      setCustomAmount('')
    }
  }, [selectedToken])
  
  // Check if custom amount is valid
  const isCustomAmountValid = () => {
    if (!customAmount) return false
    const amount = parseFloat(customAmount)
    const maxAmount = parseFloat(currentConfig.maxFaucetAmount)
    return amount > 0 && amount <= maxAmount
  }

  // ✅ ADDED: Format cooldown time remaining
  const formatTimeRemaining = (seconds: bigint): string => {
    const totalSeconds = Number(seconds)
    if (totalSeconds <= 0) return ''
    
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // ✅ ADDED: Check if user can claim (considering cooldowns)
  const canClaimFaucet = () => {
    if (!isConnected) return false
    if (isPending) return false
    if (useCustomAmount && currentConfig.supportsCustomAmount && !isCustomAmountValid()) return false
    
    // Check cooldown for current token
    if (canUseFaucet?.data === false) return false
    
    return true
  }

  // ✅ OPTIMIZED: Get current balance for selected token
  const getCurrentBalance = () => {
    switch (selectedToken) {
      case 'WETH': return wethBalance ? formatTokenAmount(wethBalance, 'WETH') : '0'
      case 'USDC': return usdcBalance ? formatTokenAmount(usdcBalance, 'USDC') : '0'
      case 'MNT': return mntBalance ? formatTokenAmount(mntBalance, 'MNT') : '0'
      default: return '0'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              FOMO Insurance
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/app" className="text-gray-600 hover:text-gray-900">
                App
              </Link>
              {isConnected ? (
                <span className="text-sm text-gray-600">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              ) : (
                <Button 
                  onClick={connectWallet}
                  disabled={isConnecting}
                  variant="outline" 
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <Coins className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Token Faucet</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get test WETH, MNT, and USDC tokens for the Mantle Sepolia testnet. 
            <span className="font-semibold text-green-600"> WETH & USDC have minimal cooldowns!</span>
            <span className="font-semibold text-amber-600"> MNT has a 24-hour cooldown.</span>
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              <Zap className="w-4 h-4 mr-1" />
              Fast Claims
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              Mantle Sepolia Testnet
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
              MNT: 24h Cooldown
            </span>
          </div>
        </div>

        {/* Network Warning */}
        {!isConnected && (
          <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to the Mantle Sepolia testnet to use the faucet.
            </AlertDescription>
          </Alert>
        )}

        {/* Success/Error Alerts */}
        {showSuccess && (
          <Alert className="mb-8">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              🎉 Tokens claimed successfully! Check your wallet balance.
            </AlertDescription>
          </Alert>
        )}

        {showError && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ OPTIMIZED: Single card layout for better performance */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Claim Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-green-600" />
                Instant Token Claims
              </CardTitle>
              <CardDescription>
                Select a token and claim your test allocation instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Token Selection */}
              <div>
                <Label htmlFor="token-select" className="text-sm font-medium">
                  Select Token
                </Label>
                <Select 
                  value={selectedToken} 
                  onValueChange={(value: AnyToken) => setSelectedToken(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WETH">WETH - Wrapped Ether</SelectItem>
                    <SelectItem value="MNT">MNT - Mantle</SelectItem>
                    <SelectItem value="USDC">USDC - USD Coin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Current Balance */}
              {isConnected && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-lg font-bold text-gray-900">
                    {parseFloat(getCurrentBalance()).toFixed(selectedToken === 'USDC' ? 2 : 4)} {selectedToken}
                  </p>
                </div>
              )}

              {/* Amount Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Amount</Label>
                  {/* ✨ Only show custom amount toggle for tokens that support it */}
                  {currentConfig.supportsCustomAmount && (
                    <button
                      type="button"
                      onClick={() => setUseCustomAmount(!useCustomAmount)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {useCustomAmount ? 'Use default' : 'Custom amount'}
                    </button>
                  )}
                </div>
                
                {useCustomAmount && currentConfig.supportsCustomAmount ? (
                  <div>
                    <Input
                      type="number"
                      placeholder={`Enter amount (max ${currentConfig.maxFaucetAmount})`}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      max={currentConfig.maxFaucetAmount}
                      step="any"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {currentConfig.maxFaucetAmount} {currentConfig.symbol}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">
                      {currentConfig.defaultFaucetAmount} {currentConfig.symbol}
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentConfig.supportsCustomAmount 
                        ? 'Default faucet amount' 
                        : 'Fixed faucet amount (contract limitation)'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* ✅ UPDATED: Claim Button with Cooldown Support */}
              <Button
                onClick={handleClaimFaucet}
                disabled={!canClaimFaucet()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                size="lg"
              >
                {!isConnected ? (
                  'Connect Wallet'
                ) : isPending ? (
                  'Claiming...'
                ) : canUseFaucet?.data === false ? (
                  `Cooldown Active (${formatTimeRemaining(timeLeft?.data || 0n)})`
                ) : (
                  `Claim ${
                    useCustomAmount && currentConfig.supportsCustomAmount 
                      ? customAmount || '0' 
                      : currentConfig.defaultFaucetAmount
                  } ${currentConfig.symbol}`
                )}
              </Button>

              {/* ✅ ADDED: Cooldown Warning */}
              {isConnected && canUseFaucet?.data === false && timeLeft?.data && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Cooldown Active:</strong> You can claim again in {formatTimeRemaining(timeLeft.data)}
                  </p>
                </div>
              )}

              {/* ✨ MNT Warning */}
              {selectedToken === 'MNT' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> MNT faucet gives a fixed amount of 100 MNT per claim with a 24-hour cooldown.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ✅ OPTIMIZED: All Balances Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Test Token Balances</CardTitle>
              <CardDescription>
                Current balances in your connected wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected ? (
                <>
                  {/* WETH Balance */}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">WETH</p>
                      <p className="text-sm text-gray-600">Wrapped Ether</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {wethBalance !== undefined
                          ? parseFloat(formatTokenAmount(wethBalance, 'WETH')).toFixed(4)
                          : '...'
                        }
                      </p>
                      <p className="text-sm text-gray-600">WETH</p>
                    </div>
                  </div>

                  {/* MNT Balance */}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">MNT</p>
                      <p className="text-sm text-gray-600">Mantle</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {mntBalance !== undefined
                          ? parseFloat(formatTokenAmount(mntBalance, 'MNT')).toFixed(4)
                          : '...'
                        }
                      </p>
                      <p className="text-sm text-gray-600">MNT</p>
                    </div>
                  </div>

                  {/* USDC Balance */}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">USDC</p>
                      <p className="text-sm text-gray-600">USD Coin</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {usdcBalance !== undefined
                          ? parseFloat(formatTokenAmount(usdcBalance, 'USDC')).toFixed(2)
                          : '...'
                        }
                      </p>
                      <p className="text-sm text-gray-600">USDC</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Connect wallet to view balances</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ✅ UPDATED: Instructions for testing */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2">Connect Wallet</h3>
                <p className="text-sm text-gray-600">
                  Connect your wallet to the Mantle Sepolia testnet
                </p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2">Claim Instantly</h3>
                <p className="text-sm text-gray-600">
                  Select any token and claim immediately - no waiting!
                </p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2">Test the dApp</h3>
                <p className="text-sm text-gray-600">
                  Use your tokens to test FOMO Insurance policies
                </p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Testing Mode Active</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• ⚡ <strong>WETH & USDC:</strong> Minimal or no cooldowns for rapid testing</li>
                <li>• 🚰 <strong>Higher limits:</strong> Up to 100 WETH, 100 MNT, 50K USDC</li>
                <li>• 🧪 <strong>Perfect for testing:</strong> Create multiple policies</li>
                <li>• 🔄 <strong>Instant refresh:</strong> Balances update automatically</li>
                <li>• ⏰ <strong>MNT Cooldown:</strong> 24-hour cooldown between MNT claims</li>
                <li>• 💡 <strong>Tip:</strong> Use WETH for rapid testing, MNT for final tests</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="text-center mt-12">
          <h3 className="text-lg font-semibold mb-4">Ready to test?</h3>
          <div className="flex justify-center space-x-4">
            <Link href="/app">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to dApp
              </Button>
            </Link>
            <Link href="https://explorer.sepolia.mantle.xyz" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                View Explorer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}