// hooks/useContracts.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, mantleSepolia } from '@/lib/web3-config';
import {
  MOCK_WETH_ABI,
  MOCK_USDC_ABI,
  MOCK_MNT_ABI,
  POLICY_MANAGER_ABI,
  FOMO_INSURANCE_ABI,
  SETTLEMENT_ENGINE_ABI,
} from '@/lib/contract-abis';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { WriteContractErrorType } from '@wagmi/core';

// ✨ ADDED: More specific types for clarity
export type SellableToken = 'WETH' | 'MNT';
export type PayoutToken = 'USDC';
export type AnyToken = SellableToken | PayoutToken;

// Enhanced error handling utility (no changes needed)
const handleContractError = (error: Error | WriteContractErrorType, context: string) => {
  console.error(`${context} error:`, error);

  let userFriendlyMessage = `${context} failed`;

  if (error.message) {
    if (error.message.includes('User rejected')) {
      userFriendlyMessage = 'Transaction was rejected by user';
    } else if (error.message.includes('insufficient funds')) {
      userFriendlyMessage = 'Insufficient funds for transaction';
    } else if (error.message.includes('execution reverted')) {
      const revertMatch = error.message.match(/execution reverted:?\s*(.+?)(?:\n|$)/);
      if (revertMatch && revertMatch[1]) {
        userFriendlyMessage = `Transaction failed: ${revertMatch[1].trim()}`;
      } else {
        userFriendlyMessage = 'Transaction was reverted by the contract';
      }
    } else if (error.message.includes('network')) {
      userFriendlyMessage = 'Network connection error. Please try again.';
    }
  }

  return { originalError: error, userFriendlyMessage };
};

// --- Faucet Hooks ---

// ✨ REFACTORED to handle any token dynamically
export function useFaucetBalance(token: AnyToken) {
  const { address } = useAccount();
  const tokenConfig = {
    WETH: { abi: MOCK_WETH_ABI, address: CONTRACT_ADDRESSES.MOCK_WETH },
    USDC: { abi: MOCK_USDC_ABI, address: CONTRACT_ADDRESSES.MOCK_USDC },
    MNT: { abi: MOCK_MNT_ABI, address: CONTRACT_ADDRESSES.MOCK_MNT },
  };

  return useReadContract({
    address: tokenConfig[token].address,
    abi: tokenConfig[token].abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });
}

// ✨ FIXED: Updated useFaucetCooldown to handle MNT correctly
export function useFaucetCooldown(token: AnyToken) {
  const { address } = useAccount();

  // ✨ MNT contract doesn't have canUseFaucet or getFaucetTimeLeft functions
  if (token === 'MNT') {
    // For MNT, we'll calculate cooldown manually using lastFaucetTime
    const lastFaucetTime = useReadContract({
      address: CONTRACT_ADDRESSES.MOCK_MNT,
      abi: MOCK_MNT_ABI,
      functionName: 'lastFaucetTime',
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
        retry: 3,
        retryDelay: 1000,
      },
    });

    const faucetCooldown = useReadContract({
      address: CONTRACT_ADDRESSES.MOCK_MNT,
      abi: MOCK_MNT_ABI,
      functionName: 'faucetCooldown',
      query: {
        retry: 3,
        retryDelay: 1000,
      },
    });

    // Calculate if user can use faucet and time left
    const currentTime = Math.floor(Date.now() / 1000);
    const lastTime = lastFaucetTime.data ? Number(lastFaucetTime.data) : 0;
    const cooldownSeconds = faucetCooldown.data ? Number(faucetCooldown.data) : 86400; // 24 hours default
    const nextFaucetTime = lastTime + cooldownSeconds;
    const timeLeft = Math.max(0, nextFaucetTime - currentTime);
    const canUse = timeLeft === 0;

    return {
      canUseFaucet: {
        data: canUse,
        isLoading: lastFaucetTime.isLoading || faucetCooldown.isLoading,
        error: lastFaucetTime.error || faucetCooldown.error,
      },
      timeLeft: {
        data: BigInt(timeLeft),
        isLoading: lastFaucetTime.isLoading || faucetCooldown.isLoading,
        error: lastFaucetTime.error || faucetCooldown.error,
      },
    };
  }

  // For WETH and USDC, use the existing logic
  const tokenConfig = {
    WETH: { abi: MOCK_WETH_ABI, address: CONTRACT_ADDRESSES.MOCK_WETH },
    USDC: { abi: MOCK_USDC_ABI, address: CONTRACT_ADDRESSES.MOCK_USDC },
  };

  const config = tokenConfig[token as 'WETH' | 'USDC'];

  const canUseFaucet = useReadContract({
    address: config.address,
    abi: config.abi,
    functionName: 'canUseFaucet',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const timeLeft = useReadContract({
    address: config.address,
    abi: config.abi,
    functionName: 'getFaucetTimeLeft',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
    },
  });

  return { canUseFaucet, timeLeft };
}

// ✨ FIXED: Updated useFaucetClaim to handle MNT correctly
export function useFaucetClaim(token: AnyToken) {
  const { writeContract, ...rest } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        const { userFriendlyMessage } = handleContractError(error, 'Faucet claim');
        console.error('Faucet claim failed:', userFriendlyMessage);
      },
      onSuccess: (hash) => {
        console.log(`Faucet claim successful! Transaction hash: ${hash}`);
      },
    },
  });

  const claimFaucet = (amount?: string) => {
    try {
      const tokenConfig = {
        WETH: { abi: MOCK_WETH_ABI, address: CONTRACT_ADDRESSES.MOCK_WETH },
        USDC: { abi: MOCK_USDC_ABI, address: CONTRACT_ADDRESSES.MOCK_USDC },
        MNT: { abi: MOCK_MNT_ABI, address: CONTRACT_ADDRESSES.MOCK_MNT },
      };

      // ✨ SPECIAL HANDLING: MNT contract only has faucet() function, no faucetWithAmount
      if (token === 'MNT') {
        // MNT contract only supports fixed amount faucet (100 MNT)
        writeContract({
          address: tokenConfig[token].address,
          abi: tokenConfig[token].abi,
          functionName: 'faucet',
          args: [],
          chainId: mantleSepolia.id,
        });
        return;
      }

      // For WETH and USDC, use the existing logic
      const tokenDecimals = (token === 'WETH') ? 18 : 6;
      const parsedAmount = amount ? parseUnits(amount, tokenDecimals) : undefined;

      writeContract({
        address: tokenConfig[token].address,
        abi: tokenConfig[token].abi,
        functionName: amount ? 'faucetWithAmount' : 'faucet',
        args: parsedAmount ? [parsedAmount] : [],
        chainId: mantleSepolia.id,
      });
    } catch (err) {
      console.error('❌ Error preparing faucet claim:', err);
    }
  };

  return { claimFaucet, ...rest };
}

// ✨ FIXED: Updated to support ALL tokens including USDC for approvals
export function useTokenApproval(token: AnyToken) {
  const { writeContract, ...rest } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        handleContractError(error, `${token} approval`);
      },
      onSuccess: (hash) => {
        console.log(`✅ ${token} approval successful! Transaction hash: ${hash}`);
      },
    },
  });

  const approve = (spender: `0x${string}`, amount: bigint) => {
    const tokenConfig = {
      WETH: { abi: MOCK_WETH_ABI, address: CONTRACT_ADDRESSES.MOCK_WETH },
      MNT: { abi: MOCK_MNT_ABI, address: CONTRACT_ADDRESSES.MOCK_MNT },
      USDC: { abi: MOCK_USDC_ABI, address: CONTRACT_ADDRESSES.MOCK_USDC }, // ✨ ADDED USDC SUPPORT
    };
    
    try {
      console.log(`🔓 Approving ${token} for spender ${spender}`);
      console.log(`📍 Token contract address: ${tokenConfig[token].address}`);
      
      writeContract({
        address: tokenConfig[token].address,
        abi: tokenConfig[token].abi,
        functionName: 'approve',
        args: [spender, amount],
        chainId: mantleSepolia.id,
      });
    } catch (err) {
      console.error(`❌ Error in ${token} approve function:`, err);
      throw err;
    }
  };

  return { approve, ...rest };
}

// --- Policy Management Hooks ---

export function useCreatePolicy() {
  const { writeContract, ...rest } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        handleContractError(error, 'Policy creation');
      },
      onSuccess: (hash) => {
        console.log(`Policy creation successful! Transaction hash: ${hash}`);
      },
    },
  });

  const createPolicy = ({
    token,
    tokenSymbol,
    amount,
    payoutToken,
    payoutBps,
    duration,
    upsideShareBps,
  }: {
    token: string;
    tokenSymbol: string;
    amount: string;
    payoutToken: string;
    payoutBps: number;
    duration: number;
    upsideShareBps: number;
  }) => {
    try {
      // ✨ UPDATED: Logic to handle decimals for WETH, MNT, or others
      const tokenDecimals = (tokenSymbol === 'WETH' || tokenSymbol === 'MNT') ? 18 : 6;
      const parsedAmount = parseUnits(amount, tokenDecimals);

      if (parsedAmount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }
      if (payoutBps <= 0 || payoutBps > 10000) {
        throw new Error('Payout BPS must be between 1 and 10000');
      }
      if (upsideShareBps < 1000 || upsideShareBps > 9900) {
        throw new Error('Upside share BPS must be within configured limits');
      }
      if (duration <= 0) {
        throw new Error('Duration must be greater than 0');
      }

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
          upsideShareBps,
        ],
        chainId: mantleSepolia.id,
      });
    } catch (err) {
      console.error('Error preparing policy creation:', err);
      throw err;
    }
  };

  return { createPolicy, ...rest };
}

export function usePurchasePolicy() {
  const { writeContract, ...rest } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        handleContractError(error, 'Policy purchase');
      },
      onSuccess: (hash) => {
        console.log(`Policy purchase successful! Transaction hash: ${hash}`);
      },
    },
  });

  const purchasePolicy = (policyId: number) => {
    try {
      if (policyId < 0) {
        throw new Error('Invalid policy ID');
      }
      writeContract({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER,
        abi: POLICY_MANAGER_ABI,
        functionName: 'purchasePolicy',
        args: [BigInt(policyId)],
        chainId: mantleSepolia.id,
      });
    } catch (err) {
      console.error('Error preparing policy purchase:', err);
    }
  };

  return { purchasePolicy, ...rest };
}

export function useCancelPolicy() {
  const { writeContract, ...rest } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        handleContractError(error, 'Policy cancellation');
      },
      onSuccess: (hash) => {
        console.log(`Policy cancellation successful! Transaction hash: ${hash}`);
      },
    },
  });

  const cancelPolicy = (policyId: number) => {
    try {
      if (policyId < 0) {
        throw new Error('Invalid policy ID');
      }
      writeContract({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER,
        abi: POLICY_MANAGER_ABI,
        functionName: 'cancelPolicy',
        args: [BigInt(policyId)],
        chainId: mantleSepolia.id,
      });
    } catch (err) {
      console.error('Error preparing policy cancellation:', err);
    }
  };

  return { cancelPolicy, ...rest };
}

export function useOpenPolicies() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'getOpenPolicyIds',
    query: {
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });
}

export function useUserPolicies() {
  const { address } = useAccount();

  return useReadContract({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    functionName: 'getUserPolicies',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 3,
      retryDelay: 1000,
    },
  });
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
      retryDelay: 1000,
    },
  });
}

export function useProtocolStats() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.FOMO_INSURANCE,
    abi: FOMO_INSURANCE_ABI,
    functionName: 'getProtocolStats',
    query: {
      retry: 3,
      retryDelay: 1000,
    },
  });
}

export function useSettlePolicy() {
  const { writeContract, ...rest } = useWriteContract({
    mutation: {
      onError: (error: WriteContractErrorType) => {
        handleContractError(error, 'Policy settlement');
      },
      onSuccess: (hash) => {
        console.log(`Policy settlement successful! Transaction hash: ${hash}`);
      },
    },
  });

  const settlePolicy = (policyId: number) => {
    try {
      if (policyId < 0) {
        throw new Error('Invalid policy ID');
      }
      writeContract({
        address: CONTRACT_ADDRESSES.SETTLEMENT_ENGINE,
        abi: SETTLEMENT_ENGINE_ABI,
        functionName: 'settlePolicy',
        args: [BigInt(policyId)],
        chainId: mantleSepolia.id,
      });
    } catch (err) {
      console.error('Error preparing policy settlement:', err);
    }
  };

  return { settlePolicy, ...rest };
}

// --- Utility Functions ---

// ✨ REFACTORED to handle any token
export function formatTokenAmount(amount: bigint, token: AnyToken): string {
  try {
    const decimals = (token === 'WETH' || token === 'MNT') ? 18 : 6;
    return formatUnits(amount, decimals);
  } catch (error) {
    console.error(`Error formatting ${token} amount:`, error);
    return '0';
  }
}

// ✨ REFACTORED to handle any token
export function parseTokenAmount(amount: string, token: AnyToken): bigint {
  try {
    if (!amount || amount === '') return 0n;
    const decimals = (token === 'WETH' || token === 'MNT') ? 18 : 6;
    return parseUnits(amount, decimals);
  } catch (error) {
    console.error(`Error parsing ${token} amount:`, error);
    return 0n;
  }
}

export function useContractValidation() {
  // This is a simplified validation hook. A production dApp might have
  // more complex checks, like verifying contract code or support status.
  return {
    isPaused: false,
    isValid: true,
    hasErrors: false,
    isLoading: false,
  };
}