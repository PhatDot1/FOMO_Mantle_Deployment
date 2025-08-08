"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { useAccount } from 'wagmi'
import { useTomoWallet } from '@/contexts/tomo-wallet-context'
import { 
  useUserPolicies, 
  usePolicyDetails, 
  useCancelPolicy,
  useSettlePolicy,
  formatTokenAmount 
} from '@/hooks/useContracts'

// PolicyCard component is now defined at the top level
const PolicyCard = ({ policyId, userRole }: { policyId: number; userRole: 'Seller' | 'Buyer' }) => {
    const { data: policyDetails, isLoading } = usePolicyDetails(policyId)
    const { cancelPolicy, isPending: isCancelling } = useCancelPolicy()
    const { settlePolicy, isPending: isSettling } = useSettlePolicy()
    
    if (isLoading) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      )
    }

    if (!policyDetails) return null

    const [policy, currentPrice, timeRemaining, potentialSellerPayout, potentialBuyerPayout, canSettle] = policyDetails

    const tokenSymbol = policy.tokenSymbol as 'WETH' | 'USDC'
    const tokenAmount = formatTokenAmount(policy.amount, tokenSymbol)
    const payoutAmount = formatTokenAmount(policy.payoutAmount, 'USDC')
    const upsideSharePercent = Number(policy.upsideShareBps) / 100
    const durationDays = Number(policy.duration) / (24 * 60 * 60)

    // Policy state: 0 = Open, 1 = Active, 2 = Settled, 3 = Cancelled
    const stateNames = ['Listed', 'Ongoing', 'Finished', 'Cancelled']
    const stateName = stateNames[policy.state] || 'Unknown'

    const createdDate = new Date(Number(policy.startTimestamp) * 1000 || Date.now())
    const expiryDate = new Date(Number(policy.expiryTimestamp) * 1000 || Date.now())

    // Calculate performance if active
    const calculatePerformance = () => {
      if (policy.state === 1 && currentPrice && policy.entryPrice) { // Active
        const priceChange = ((Number(currentPrice) - Number(policy.entryPrice)) / Number(policy.entryPrice)) * 100
        return priceChange > 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`
      }
      return null
    }

    const performance = calculatePerformance()

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric", 
        year: "numeric",
      })
    }

    const getDaysUntilExpiry = () => {
      if (policy.state !== 1) return null // Only for active policies
      const now = new Date()
      const expiry = expiryDate
      const diffTime = expiry.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    }

    const daysUntilExpiry = getDaysUntilExpiry()

    const handleCancel = () => {
      cancelPolicy(policyId)
    }

    const handleSettle = () => {
      settlePolicy(policyId)
    }

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {/* Badges */}
        <div className="flex justify-between items-start mb-4">
          <Badge
            variant="secondary"
            className={`${
              userRole === "Seller" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}
          >
            {userRole}
          </Badge>
          <Badge
            variant="secondary"
            className={`${
              stateName === "Listed"
                ? "bg-yellow-100 text-yellow-700"
                : stateName === "Ongoing"
                  ? "bg-green-100 text-green-700"
                  : stateName === "Finished"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-red-100 text-red-700"
            }`}
          >
            {stateName}
          </Badge>
        </div>

        {/* Token Amount */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {parseFloat(tokenAmount).toFixed(4)} {tokenSymbol}
          </h3>
          <p className="text-sm text-gray-600">
            Payout: ${parseFloat(payoutAmount).toFixed(2)} USDC
          </p>
        </div>

        {/* Policy Terms */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-lg font-semibold text-gray-900">{durationDays} days</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Upside Share</p>
            <p className="text-lg font-semibold text-gray-900">{upsideSharePercent}%</p>
          </div>
        </div>

        {/* Performance/Outcome */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          {stateName === "Finished" ? (
            <div>
              <p className="text-sm text-gray-600">Final Outcome</p>
              <p className="text-lg font-semibold text-gray-900">
                Policy completed on {formatDate(expiryDate)}
              </p>
            </div>
          ) : stateName === "Ongoing" ? (
            <div>
              <p className="text-sm text-gray-600">Current Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {daysUntilExpiry !== null && daysUntilExpiry > 0 
                  ? `${daysUntilExpiry} days remaining`
                  : "Ready to settle"
                }
              </p>
              {performance && (
                <p className={`text-sm ${
                  performance.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {performance} since start
                </p>
              )}
            </div>
          ) : stateName === "Listed" ? (
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900">Awaiting buyer</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900">Cancelled</p>
            </div>
          )}
        </div>

        {/* Expiry Info */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {stateName === "Finished"
              ? `Completed ${formatDate(expiryDate)}`
              : stateName === "Ongoing"
                ? `Expires ${formatDate(expiryDate)}`
                : `Created ${formatDate(createdDate)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {stateName === "Listed" && userRole === "Seller" && (
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel'
              )}
            </Button>
          )}
          
          {stateName === "Ongoing" && canSettle && (
            <Button
              variant="outline"
              className="flex-1 border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
              onClick={handleSettle}
              disabled={isSettling}
            >
              {isSettling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Settling...
                </>
              ) : (
                'Settle Policy'
              )}
            </Button>
          )}

          <Dialog>
            <DialogTrigger>
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Policy #{policyId} Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Token</p>
                  <p className="text-sm text-gray-600">
                    {parseFloat(tokenAmount).toFixed(4)} {tokenSymbol}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Payout Amount</p>
                  <p className="text-sm text-gray-600">
                    ${parseFloat(payoutAmount).toFixed(2)} USDC
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Entry Price</p>
                  <p className="text-sm text-gray-600">
                    ${Number(policy.entryPrice) / 1e8} (8 decimals)
                  </p>
                </div>
                {currentPrice && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Current Price</p>
                    <p className="text-sm text-gray-600">
                      ${Number(currentPrice) / 1e8}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Duration</p>
                  <p className="text-sm text-gray-600">{durationDays} days</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Upside Share</p>
                  <p className="text-sm text-gray-600">{upsideSharePercent}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <p className="text-sm text-gray-600">{stateName}</p>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <a
                      href={`https://testnet.explorer.etherlink.com/address/${policy.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      View on Explorer
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
}

// Wrapper component to determine user role
const PolicyCardWrapper = ({ policyId, address }: { policyId: number; address: string }) => {
  const { data: policyDetails } = usePolicyDetails(policyId)
  
  if (!policyDetails) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const [policy] = policyDetails
  const userRole: 'Seller' | 'Buyer' = policy.seller.toLowerCase() === address.toLowerCase() ? 'Seller' : 'Buyer'
  
  return <PolicyCard policyId={policyId} userRole={userRole} />
}

export default function MyPoliciesPage() {
  const { address, isConnected } = useAccount()
  const { connectWallet, isConnecting } = useTomoWallet()
  
  const [roleFilter, setRoleFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const policiesPerPage = 6

  // Contract hooks
  const { data: userPolicyIds, isLoading: loadingPolicies } = useUserPolicies()

  // Determine user role for each policy
  const policiesWithRoles = useMemo(() => {
    if (!userPolicyIds || !address) return []
    
    return userPolicyIds.map((policyId) => ({
      policyId: Number(policyId),
      userRole: 'Unknown' as 'Seller' | 'Buyer' | 'Unknown' // Will be determined by PolicyCard component
    }))
  }, [userPolicyIds, address])

  // Filter and paginate policies
  const filteredPolicies = policiesWithRoles // Filtering will be handled in PolicyCard based on actual data
  const totalPages = Math.ceil(filteredPolicies.length / policiesPerPage)
  const startIndex = (currentPage - 1) * policiesPerPage
  const paginatedPolicies = filteredPolicies.slice(startIndex, startIndex + policiesPerPage)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/app" className="text-xl font-bold text-gray-900">
              FOMO Insurance
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/faucet" className="text-gray-600 hover:text-gray-900">
                Faucet
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Wallet Connection Alert */}
        {!isConnected && (
          <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to view your policies.
            </AlertDescription>
          </Alert>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Policies</h1>

          {/* Filter Toggles */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Role</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {["All", "Seller", "Buyer"].map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setRoleFilter(role)
                      setCurrentPage(1)
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      roleFilter === role ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Status</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {["All", "Listed", "Ongoing", "Finished"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status)
                      setCurrentPage(1)
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      statusFilter === status ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingPolicies && isConnected && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your policies...</p>
          </div>
        )}

        {/* Policies Grid */}
        {isConnected && !loadingPolicies && (
          <>
            {paginatedPolicies.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {paginatedPolicies.map((policy) => {
                    // For now, we'll pass 'Seller' as default and let PolicyCard determine actual role
                    return (
                      <PolicyCardWrapper 
                        key={policy.policyId} 
                        policyId={policy.policyId} 
                        address={address!}
                      />
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">No policies found</h3>
                  <p className="text-gray-600 mb-8">
                    You haven't created or purchased any policies yet.
                  </p>
                  <Link href="/app">
                    <Button className="bg-blue-600 hover:bg-blue-700">Create a Policy</Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
