"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Clock, Coins } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAccount, useConnect } from 'wagmi'
import { useTomoWallet } from '@/contexts/tomo-wallet-context'
import { useFaucetBalance, useFaucetCooldown, useFaucetClaim, formatTokenAmount } from '@/hooks/useContracts'

export default function FaucetPage() {
  const [selectedToken, setSelectedToken] = useState<'WETH' | 'USDC'>('WETH')
  const [customAmount, setCustomAmount] = useState('')
  const [useCustomAmount, setUseCustomAmount] = useState(false)
  
  const { address, isConnected } = useAccount()
  const { connectWallet, isConnecting } = useTomoWallet()
  
  // Contract hooks
  const { data: balance, refetch: refetchBalance } = useFaucetBalance(selectedToken)
  const { canUseFaucet, timeLeft } = useFaucetCooldown(selectedToken)
  const { claimFaucet, isPending, isSuccess, error } = useFaucetClaim(selectedToken)
  
  // Token configuration
  const tokenConfig = {
    WETH: {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      maxFaucetAmount: '10',
      defaultFaucetAmount: '10'
    },
    USDC: {
      name: 'USD Coin',
      symbol: 'USDC', 
      decimals: 6,
      maxFaucetAmount: '10000',
      defaultFaucetAmount: '10000'
    }
  }
  
  const currentConfig = tokenConfig[selectedToken]
  
  // Format time remaining
  const formatTimeRemaining = (seconds: bigint): string => {
    const totalSeconds = Number(seconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const remainingSeconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }
  
  // Handle faucet claim
  const handleClaimFaucet = () => {
    if (!isConnected) {
      connectWallet()
      return
    }
    
    if (useCustomAmount && customAmount) {
      claimFaucet(customAmount)
    } else {
      claimFaucet()
    }
  }
  
  // Refetch balance on successful claim
  useEffect(() => {
    if (isSuccess) {
      refetchBalance()
      setCustomAmount('')
      setUseCustomAmount(false)
    }
  }, [isSuccess, refetchBalance])
  
  // Check if custom amount is valid
  const isCustomAmountValid = () => {
    if (!customAmount) return false
    const amount = parseFloat(customAmount)
    const maxAmount = parseFloat(currentConfig.maxFaucetAmount)
    return amount > 0 && amount <= maxAmount
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
            Get test WETH and USDC tokens for the Etherlink testnet. Use these tokens to test the FOMO Insurance protocol.
          </p>
          <div className="mt-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              Etherlink Testnet
            </span>
          </div>
        </div>

        {/* Network Warning */}
        {!isConnected && (
          <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to the Etherlink testnet to use the faucet.
            </AlertDescription>
          </Alert>
        )}

        {/* Faucet Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Token Selection & Claim */}
          <Card>
            <CardHeader>
              <CardTitle>Claim Test Tokens</CardTitle>
              <CardDescription>
                Select a token and claim your test allocation
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
                  onValueChange={(value: 'WETH' | 'USDC') => setSelectedToken(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WETH">
                      <div className="flex items-center space-x-2">
                        <span>WETH - Wrapped Ether</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="USDC">
                      <div className="flex items-center space-x-2">
                        <span>USDC - USD Coin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Amount</Label>
                  <button
                    type="button"
                    onClick={() => setUseCustomAmount(!useCustomAmount)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {useCustomAmount ? 'Use default' : 'Custom amount'}
                  </button>
                </div>
                
                {useCustomAmount ? (
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
                    <p className="text-sm text-gray-600">Default faucet amount</p>
                  </div>
                )}
              </div>

              {/* Cooldown Status */}
              {isConnected && (
                <div>
                  {canUseFaucet.data ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Ready to claim</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Cooldown: {timeLeft.data ? formatTimeRemaining(timeLeft.data) : 'Loading...'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Claim Button */}
              <Button
                onClick={handleClaimFaucet}
                disabled={
                  !isConnected || 
                  isPending || 
                  (isConnected && !canUseFaucet.data) ||
                  (useCustomAmount && !isCustomAmountValid())
                }
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {!isConnected ? (
                  'Connect Wallet'
                ) : isPending ? (
                  'Claiming...'
                ) : !canUseFaucet.data ? (
                  'Cooldown Active'
                ) : (
                  `Claim ${useCustomAmount ? customAmount || '0' : currentConfig.defaultFaucetAmount} ${currentConfig.symbol}`
                )}
              </Button>

              {/* Transaction Status */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error: {error.message}
                  </AlertDescription>
                </Alert>
              )}

              {isSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tokens claimed successfully! Check your wallet balance.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Current Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Your Balances</CardTitle>
              <CardDescription>
                Current test token balances in your wallet
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
                        {balance && selectedToken === 'WETH' 
                          ? parseFloat(formatTokenAmount(balance, 'WETH')).toFixed(4)
                          : 'Loading...'
                        }
                      </p>
                      <p className="text-sm text-gray-600">WETH</p>
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
                        {balance && selectedToken === 'USDC'
                          ? parseFloat(formatTokenAmount(balance, 'USDC')).toFixed(2)
                          : 'Loading...'
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

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2">Connect Wallet</h3>
                <p className="text-sm text-gray-600">
                  Connect your wallet to the Etherlink testnet
                </p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2">Claim Tokens</h3>
                <p className="text-sm text-gray-600">
                  Select a token and claim your test allocation
                </p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2">Test the dApp</h3>
                <p className="text-sm text-gray-600">
                  Use your tokens to test FOMO Insurance features
                </p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Important Notes</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• These are test tokens with no real value</li>
                <li>• There's a 24-hour cooldown between faucet claims</li>
                <li>• Maximum claim amounts: 10 WETH, 10,000 USDC</li>
                <li>• Only works on Etherlink testnet</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="text-center mt-12">
          <h3 className="text-lg font-semibold mb-4">Ready to test?</h3>
          <div className="flex justify-center space-x-4">
          <Link href="/app">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Go to dApp
              </Button>
            </Link>
            <Link href="https://testnet.explorer.etherlink.com" target="_blank" rel="noopener noreferrer">
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
