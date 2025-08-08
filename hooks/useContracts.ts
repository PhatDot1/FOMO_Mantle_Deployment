// hooks/useContracts.ts - Updated for new contract architecture
import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES, etherlinkTestnet } from '@/lib/web3-config'
import { 
  MOCK_WETH_ABI, 
  MOCK_USDC_ABI, 
  POLICY_MANAGER_ABI, 
  FOMO_INSURANCE_ABI,
  SETTLEMENT_ENGINE_ABI 
} from '@/lib/contract-abis'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { WriteContractErrorType } from '@wagmi/core'

// Enhanced error handling utility
const handleContractError = (error: Error | WriteContractErrorType, context: string) => {
  console.error(`${context} error:`, error)
  
  // Extract meaningful error messages
  let userFriendlyMessage = `${context} failed`
  
  if (error.message) {
    if (error.message.includes('User rejected')) {
      userFriendlyMessage = 'Transaction was rejected by user'
    } else if (error.message.includes('insufficient funds')) {
      userFriendlyMessage = 'Insufficient funds for transaction'
    } else if (error.message.includes('execution reverted')) {
      // Try to extract revert reason
      const revertMatch = error.message.match(/execution reverted:?\s*(.+?)(?:\n|$)/)
      if (revertMatch && revertMatch[1]) {
        userFriendlyMessage = `Transaction failed: ${revertMatch[1].trim()}`
      } else {
        userFriendlyMessage = 'Transaction was reverted by the contract'
      }
    } else if (error.message.includes('network')) {
      userFriendlyMessage = 'Network connection error. Please try again.'
    }
  }
  
  return { originalError: error, userFriendlyMessage }
}

// Faucet Hooks
export function useFaucetBalance(token: 'WETH' | 'USDC') {
  const { address } = useAccount()
  
  return useReadContract({
    address: CONTRACT_ADDRESSES[`MOCK_${token}`],
    abi: token === 'WETH' ? MOCK_WETH_ABI : MOCK_USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address, 
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000
    }
  })
}

export function useFaucetCooldown(token: 'WETH' | 'USDC') {
  const { address } = useAccount()
  
  const canUseFaucet = useReadContract({
    address: CONTRACT_ADDRESSES[`MOCK_${token}`],
    abi: token === 'WETH' ? MOCK_WETH_ABI : MOCK_USDC_ABI,
    functionName: 'canUseFaucet',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      retry: 3,
      retryDelay: 1000
    }
  })

  const timeLeft = useReadContract({
    address: CONTRACT_ADDRESSES[`MOCK_${token}`],
    abi: token === 'WETH' ? MOCK_WETH_ABI : MOCK_USDC_ABI,
    functionName: 'getFaucetTimeLeft',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      retry: 3,
      retryDelay: 1000
    }
  })

  return { canUseFaucet, timeLeft }
}

export function useFaucetClaim(token: 'WETH' | 'USDC') {
  const { writeContract, isPending, isSuccess, error } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, 'Faucet claim')
        console.error('Faucet claim failed:', userFriendlyMessage)
      },
      onSuccess: (hash) => {
        console.log(`Faucet claim successful! Transaction hash: ${hash}`)
      }
    }
  })

  const claimFaucet = (amount?: string) => {
    try {
      const tokenDecimals = token === 'WETH' ? 18 : 6
      const parsedAmount = amount ? parseUnits(amount, tokenDecimals) : undefined

      console.log(`Claiming ${token} faucet${amount ? ` with amount: ${amount}` : ''}...`)

      writeContract({
        address: CONTRACT_ADDRESSES[`MOCK_${token}`],
        abi: token === 'WETH' ? MOCK_WETH_ABI : MOCK_USDC_ABI,
        functionName: amount ? 'faucetWithAmount' : 'faucet',
        args: parsedAmount ? [parsedAmount] : [],
        chainId: etherlinkTestnet.id,
      })
    } catch (err) {
      console.error('Error preparing faucet claim:', err)
    }
  }

  return { claimFaucet, isPending, isSuccess, error }
}

// Policy Management Hooks
export function useCreatePolicy() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, 'Policy creation')
        console.error('Policy creation failed:', userFriendlyMessage)
      },
      onSuccess: (hash) => {
        console.log(`Policy creation successful! Transaction hash: ${hash}`)
      }
    }
  })

  const createPolicy = ({
    token,
    tokenSymbol,
    amount,
    payoutToken,
    payoutBps,
    duration,
    upsideShareBps
  }: {
    token: string
    tokenSymbol: string
    amount: string
    payoutToken: string
    payoutBps: number
    duration: number
    upsideShareBps: number
  }) => {
    try {
      // Use the correct decimals based on the actual token, not the symbol passed to oracle
      const tokenDecimals = token === CONTRACT_ADDRESSES.MOCK_WETH ? 18 : 6
      const parsedAmount = parseUnits(amount, tokenDecimals)

      // Validation
      if (parsedAmount <= 0n) {
        throw new Error('Amount must be greater than 0')
      }
      if (payoutBps <= 0 || payoutBps > 10000) {
        throw new Error('Payout BPS must be between 1 and 10000')
      }
      if (upsideShareBps <= 0 || upsideShareBps > 5000) {
        throw new Error('Upside share BPS must be between 1 and 5000')
      }
      if (duration <= 0) {
        throw new Error('Duration must be greater than 0')
      }

      console.log('Creating policy with validated params:', {
        token,
        tokenSymbol,
        amount,
        parsedAmount: parsedAmount.toString(),
        payoutToken,
        payoutBps,
        duration,
        upsideShareBps
      })

      writeContract({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER,
        abi: POLICY_MANAGER_ABI,
        functionName: 'createPolicy',
        args: [
          token as `0x${string}`,
          tokenSymbol,
          parsedAmount,
          payoutToken as `0x${string}`,
          payoutBps,
          BigInt(duration),
          upsideShareBps
        ],
        chainId: etherlinkTestnet.id,
      })
    } catch (err) {
      console.error('Error preparing policy creation:', err)
      throw err
    }
  }

  return { createPolicy, isPending, isSuccess, error }
}

export function usePurchasePolicy() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, 'Policy purchase')
        console.error('Policy purchase failed:', userFriendlyMessage)
      },
      onSuccess: (hash) => {
        console.log(`Policy purchase successful! Transaction hash: ${hash}`)
      }
    }
  })

  const purchasePolicy = (policyId: number) => {
    try {
      if (policyId < 0) {
        throw new Error('Invalid policy ID')
      }

      console.log(`Purchasing policy ${policyId}...`)

      writeContract({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER,
        abi: POLICY_MANAGER_ABI,
        functionName: 'purchasePolicy',
        args: [BigInt(policyId)],
        chainId: etherlinkTestnet.id,
      })
    } catch (err) {
      console.error('Error preparing policy purchase:', err)
    }
  }

  return { purchasePolicy, isPending, isSuccess, error }
}

export function useCancelPolicy() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, 'Policy cancellation')
        console.error('Policy cancellation failed:', userFriendlyMessage)
      },
      onSuccess: (hash) => {
        console.log(`Policy cancellation successful! Transaction hash: ${hash}`)
      }
    }
  })

  const cancelPolicy = (policyId: number) => {
    try {
      if (policyId < 0) {
        throw new Error('Invalid policy ID')
      }

      console.log(`Cancelling policy ${policyId}...`)

      writeContract({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER,
        abi: POLICY_MANAGER_ABI,
        functionName: 'cancelPolicy',
        args: [BigInt(policyId)],
        chainId: etherlinkTestnet.id,
      })
    } catch (err) {
      console.error('Error preparing policy cancellation:', err)
    }
  }

  return { cancelPolicy, isPending, isSuccess, error }
}

export function useOpenPolicies() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'getOpenPolicyIds',
    query: { 
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000
    }
  })
}

export function useUserPolicies() {
  const { address } = useAccount()
  
  return useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'getUserPolicies',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      retry: 3,
      retryDelay: 1000
    }
  })
}

export function usePolicyDetails(policyId: number | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.FOMO_INSURANCE,
    abi: FOMO_INSURANCE_ABI,
    functionName: 'getPolicyDetails',
    args: policyId !== undefined ? [BigInt(policyId)] : undefined,
    query: { 
      enabled: policyId !== undefined,
      retry: 3,
      retryDelay: 1000
    }
  })
}

export function useProtocolStats() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.FOMO_INSURANCE,
    abi: FOMO_INSURANCE_ABI,
    functionName: 'getProtocolStats',
    query: {
      retry: 3,
      retryDelay: 1000
    }
  })
}

export function useSettlePolicy() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, 'Policy settlement')
        console.error('Policy settlement failed:', userFriendlyMessage)
      },
      onSuccess: (hash) => {
        console.log(`Policy settlement successful! Transaction hash: ${hash}`)
      }
    }
  })

  const settlePolicy = (policyId: number) => {
    try {
      if (policyId < 0) {
        throw new Error('Invalid policy ID')
      }

      console.log(`Settling policy ${policyId}...`)

      writeContract({
        address: CONTRACT_ADDRESSES.SETTLEMENT_ENGINE,
        abi: SETTLEMENT_ENGINE_ABI,
        functionName: 'settlePolicy',
        args: [BigInt(policyId)],
        chainId: etherlinkTestnet.id,
      })
    } catch (err) {
      console.error('Error preparing policy settlement:', err)
    }
  }

  return { settlePolicy, isPending, isSuccess, error }
}

// Token approval hooks
export function useTokenApproval(token: 'WETH' | 'USDC') {
  const { writeContract, isPending, isSuccess, error } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, `${token} approval`)
        console.error(`${token} approval failed:`, userFriendlyMessage)
      },
      onSuccess: (hash) => {
        console.log(`${token} approval successful! Transaction hash: ${hash}`)
      }
    }
  })

  const approve = (spender: string, amount: bigint) => {
    try {
      if (!spender || spender === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid spender address')
      }
      if (amount < 0n) {
        throw new Error('Amount cannot be negative')
      }

      console.log(`Approving ${token} for spender: ${spender}, amount: ${amount.toString()}`)

      writeContract({
        address: CONTRACT_ADDRESSES[`MOCK_${token}`],
        abi: token === 'WETH' ? MOCK_WETH_ABI : MOCK_USDC_ABI,
        functionName: 'approve',
        args: [spender as `0x${string}`, amount],
        chainId: etherlinkTestnet.id,
      })
    } catch (err) {
      console.error('Error preparing token approval:', err)
    }
  }

  return { approve, isPending, isSuccess, error }
}

// Enhanced utility functions with error handling
export function formatTokenAmount(amount: bigint, token: 'WETH' | 'USDC'): string {
  try {
    const decimals = token === 'WETH' ? 18 : 6
    return formatUnits(amount, decimals)
  } catch (error) {
    console.error(`Error formatting ${token} amount:`, error)
    return '0'
  }
}

export function parseTokenAmount(amount: string, token: 'WETH' | 'USDC'): bigint {
  try {
    const decimals = token === 'WETH' ? 18 : 6
    if (!amount || amount === '') {
      return 0n
    }
    return parseUnits(amount, decimals)
  } catch (error) {
    console.error(`Error parsing ${token} amount:`, error)
    return 0n
  }
}

// Updated contract state validation helpers
export function useContractValidation() {
    const { address } = useAccount()
  
    // Don't try to check paused() since your contract doesn't have it
    // const { data: isPaused, error: pausedError } = useReadContract({
    //   address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    //   abi: POLICY_MANAGER_ABI,
    //   functionName: 'paused',
    //   query: {
    //     retry: 3,
    //     retryDelay: 1000
    //   }
    // })

    
  // Check token support - these should work
  const { data: isWethSupported, error: wethError } = useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'supportedTokens',
    args: [CONTRACT_ADDRESSES.MOCK_WETH],
    query: {
      retry: 3,
      retryDelay: 1000
    }
  })

  const { data: isUsdcSupported, error: usdcError } = useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'supportedTokens',
    args: [CONTRACT_ADDRESSES.MOCK_USDC],
    query: {
      retry: 3,
      retryDelay: 1000
    }
  })

  const { data: isUsdcPayoutSupported, error: payoutError } = useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'supportedPayoutTokens',
    args: [CONTRACT_ADDRESSES.MOCK_USDC],
    query: {
      retry: 3,
      retryDelay: 1000
    }
  })

  // Log errors for debugging, but ignore pausedError since function doesn't exist
  if (wethError) console.error('Error checking WETH support:', wethError)
  if (usdcError) console.error('Error checking USDC support:', usdcError)
  if (payoutError) console.error('Error checking USDC payout support:', payoutError)

  // Since your contract doesn't have paused(), assume it's not paused
  const isPaused = false // Your contract is always "not paused"

  // Validation based only on token support (ignore paused status)
  const isValid = isWethSupported === true && 
                   isUsdcSupported === true && 
                   isUsdcPayoutSupported === true

  return {
    isPaused, // Always false since your contract doesn't have pause functionality
    isWethSupported,
    isUsdcSupported,
    isUsdcPayoutSupported,
    isValid,
    // Additional debug info
    hasErrors: !!(wethError || usdcError || payoutError),
    isLoading: isWethSupported === undefined || 
               isUsdcSupported === undefined || 
               isUsdcPayoutSupported === undefined
  }
}
