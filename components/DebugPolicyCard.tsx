import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/web3-config'
import { POLICY_MANAGER_ABI } from '@/lib/contract-abis'

export const DebugPolicyCard = ({ policyId }: { policyId: number }) => {
  console.log(`🔍 DebugPolicyCard: Attempting to read policy ${policyId}`)
  console.log(`📍 Contract address: ${CONTRACT_ADDRESSES.POLICY_MANAGER}`)
  console.log(`📍 Policy ID as BigInt: ${BigInt(policyId).toString()}`)

  const { data: policy, error: policyError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'getPolicy',
    args: [BigInt(policyId)],
    query: { 
      retry: 3,
      retryDelay: 1000
    }
  })

  console.log(`📊 Policy ${policyId} results:`, {
    policy,
    error: policyError,
    isLoading,
    hasData: !!policy,
    errorMessage: policyError?.message
  })

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">Loading policy {policyId}...</p>
      </div>
    )
  }

  if (policyError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-bold">Policy {policyId} Error:</h3>
        <p className="text-red-700 text-sm">{policyError.message}</p>
        <details className="mt-2">
          <summary className="text-red-600 cursor-pointer">Raw Error Details</summary>
          <pre className="text-xs bg-red-100 p-2 mt-1 rounded overflow-auto">
            {JSON.stringify(policyError, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Policy {policyId}: No data returned</p>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-green-800 font-bold">✅ Policy {policyId} SUCCESS!</h3>
      <div className="text-sm text-green-700 mt-2 space-y-1">
        <div><strong>Seller:</strong> {policy.seller}</div>
        <div><strong>Token Symbol:</strong> {policy.tokenSymbol}</div>
        <div><strong>Amount:</strong> {policy.amount?.toString() || 'N/A'}</div>
        <div><strong>Payout Amount:</strong> {policy.payoutAmount?.toString() || 'N/A'}</div>
        <div><strong>State:</strong> {policy.state?.toString() || 'N/A'}</div>
        <div><strong>Duration:</strong> {policy.duration?.toString() || 'N/A'}</div>
      </div>
      <details className="mt-2">
        <summary className="text-green-600 cursor-pointer">Raw Policy Data</summary>
        <pre className="text-xs bg-green-100 p-2 mt-1 rounded overflow-auto">
          {JSON.stringify(policy, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value, 2
          )}
        </pre>
      </details>
    </div>
  )
}
