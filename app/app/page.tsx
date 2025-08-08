"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseUnits, maxUint256 } from "viem"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, CheckCircle, Loader2, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"
import { useAccount, useReadContract } from "wagmi"
import { useTomoWallet } from "@/contexts/tomo-wallet-context"
import {
  useCreatePolicy,
  usePurchasePolicy,
  useOpenPolicies,
  useProtocolStats,
  useFaucetBalance,
  useTokenApproval,
  useContractValidation,
  formatTokenAmount,
} from "@/hooks/useContracts"
import { CONTRACT_ADDRESSES } from "@/lib/web3-config"
import { MOCK_USDC_ABI, MOCK_WETH_ABI, POLICY_MANAGER_ABI } from "@/lib/contract-abis"

export default function AppPage() {
  // Wallet connection
  const { address, isConnected } = useAccount()
  const { connectWallet, isLoading: isConnecting } = useTomoWallet()

  // Form state
  const [amount, setAmount] = useState("")
  const [selectedToken, setSelectedToken] = useState<"WETH" | "USDC">("WETH")
  const [immediatePayout, setImmediatePayout] = useState([95])
  const [duration, setDuration] = useState([30])
  const [upsideShare, setUpsideShare] = useState([25])
  const [selectedScenario, setSelectedScenario] = useState(20)

  // UI state
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [showErrorAlert, setShowErrorAlert] = useState(false)
  const [showWarningAlert, setShowWarningAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [warningMessage, setWarningMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false)

  // Filter state
  const [payoutRange, setPayoutRange] = useState([75, 98])
  const [durationRange, setDurationRange] = useState([1, 90])
  const [upsideRange, setUpsideRange] = useState([10, 50])
  const [statusFilter, setStatusFilter] = useState({
    open: true,
    ongoing: true,
    finished: false,
  })
  const [filteredPolicyIds, setFilteredPolicyIds] = useState<bigint[]>([])
  const [filtersApplied, setFiltersApplied] = useState(false)

  // Contract hooks
  const { data: tokenBalance, refetch: refetchTokenBalance } = useFaucetBalance(selectedToken)
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useFaucetBalance("USDC")
  const { createPolicy, isPending: isCreating, isSuccess: policyCreated, error: createError } = useCreatePolicy()
  const {
    purchasePolicy,
    isPending: isPurchasing,
    isSuccess: policyPurchased,
    error: purchaseError,
  } = usePurchasePolicy()
  const { data: openPolicyIds, refetch: refetchOpenPolicies } = useOpenPolicies()
  const { data: protocolStats } = useProtocolStats()
  const {
    approve,
    isPending: isApproving,
    isSuccess: isApprovalSuccess,
    error: approvalError,
  } = useTokenApproval(selectedToken)

  //   USDC approval hook for purchasing policies
  const {
    approve: approveUsdc,
    isPending: isApprovingUsdc,
    isSuccess: isUsdcApprovalSuccess,
    error: usdcApprovalError,
  } = useTokenApproval("USDC")

  //   Competitive Score calculation
  const calculateCompetitiveScore = () => {
    const p = immediatePayout[0] / 100 // Convert percentage to decimal
    const u = upsideShare[0] / 100 // Convert percentage to decimal

    try {
      // Formula: Score = 2.699 * ln(0.495 * ((1 - p) / u)) - 1.137
      const innerValue = 0.495 * ((1 - p) / u)
      if (innerValue <= 0) return 1 // Handle edge case where ln would be undefined

      const score = 2.699 * Math.log(innerValue) + 11.137

      // Bound the score between 1 and 10
      return Math.max(0, Math.min(10, score))
    } catch (error) {
      console.error("Error calculating competitive score:", error)
      return 1
    }
  }

  //   Get score color and tooltip
  const getScoreDisplay = (score: number) => {
    if (score >=0 && score <= 3) {
      return {
        color: "text-red-600",
        bgColor: "bg-red-100",
        tooltip: "Very uncompetitive. Very unlikely to sell at these terms.",
      }
    } else if (score > 3 && score < 4) {
      return {
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        tooltip: "Slightly uncompetitive and may take longer to sell.",
      }
    } else if (score >=4 && score <= 6) {
      return {
        color: "text-green-600",
        bgColor: "bg-green-100",
        tooltip: "Fair and balanced policy.",
      }
    } else if (score >6 && score <= 7) {
      return {
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        tooltip: "Very attractive to buyers and likely to sell quickly.",
      }
    } else {
      return {
        color: "text-red-600",
        bgColor: "bg-red-100",
        tooltip: "Overly generous. You will lose value with these terms.",
      }
    }
  }

  const competitiveScore = calculateCompetitiveScore()
  const scoreDisplay = getScoreDisplay(competitiveScore)

  //   Apply filters function
  const applyFilters = () => {
    if (!openPolicyIds) {
      setFilteredPolicyIds([])
      return
    }

    const filtered = openPolicyIds.filter((policyId) => {
      // We'll need to get the policy data to filter - this will be handled in the PolicyCard component
      return true // For now, we'll filter in the display logic
    })

    setFilteredPolicyIds(filtered)
    setFiltersApplied(true)
  }

  // Initialize filtered policies when openPolicyIds changes
  useEffect(() => {
    if (openPolicyIds && !filtersApplied) {
      setFilteredPolicyIds(openPolicyIds)
    }
  }, [openPolicyIds, filtersApplied])

  // Contract validation
  const {
    isPaused,
    isWethSupported,
    isUsdcSupported,
    isUsdcPayoutSupported,
    isValid: isContractValid,
  } = useContractValidation()

  // Read current allowance with enhanced error handling
  const {
    data: currentAllowance,
    refetch: refetchAllowance,
    error: allowanceError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES[`MOCK_${selectedToken}`],
    abi: selectedToken === "WETH" ? MOCK_WETH_ABI : MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.POLICY_MANAGER] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 3000,
      retry: 3,
      retryDelay: 1000,
    },
  })

  //   Read USDC allowance for policy purchases
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_USDC,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.POLICY_MANAGER] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 3000,
      retry: 3,
      retryDelay: 1000,
    },
  })

  // Mock price data
  const mockPrices = { WETH: 3395.99, USDC: 1 }

  // Enhanced form validation with detailed error messages
  const validateForm = () => {
    if (!amount || amount === "") {
      return { isValid: false, error: "Please enter an amount" }
    }

    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: "Amount must be a positive number" }
    }

    if (numAmount > 1000000) {
      return { isValid: false, error: "Amount is too large" }
    }

    if (!selectedToken) {
      return { isValid: false, error: "Please select a token" }
    }

    return { isValid: true, error: null }
  }

  // Calculate values with error handling
  const calculateValues = () => {
    try {
      const tokenPrice = mockPrices[selectedToken]
      const totalValue = Number.parseFloat(amount || "0") * tokenPrice
      const immediateReceive = totalValue * (immediatePayout[0] / 100)
      const exampleUpside = totalValue * (selectedScenario / 100) * (upsideShare[0] / 100)
      return { totalValue, immediateReceive, exampleUpside }
    } catch (error) {
      console.error("Error calculating values:", error)
      return { totalValue: 0, immediateReceive: 0, exampleUpside: 0 }
    }
  }

  const { totalValue, immediateReceive, exampleUpside } = calculateValues()

  // Enhanced form validation
  const formValidation = validateForm()
  const isFormValid = formValidation.isValid
  const tokenDecimals = selectedToken === "WETH" ? 18 : 6
  const amountAsBigInt = isFormValid ? parseUnits(amount, tokenDecimals) : 0n
  const hasEnoughAllowance = currentAllowance ? currentAllowance >= amountAsBigInt : false
  const hasEnoughBalance = tokenBalance ? tokenBalance >= amountAsBigInt : false

  // Get formatted balances
  const formattedBalance = tokenBalance ? formatTokenAmount(tokenBalance, selectedToken) : "0"
  const formattedUsdcBalance = usdcBalance ? formatTokenAmount(usdcBalance, "USDC") : "0"

  // Enhanced error message generator
  const getErrorMessage = (error: any, context: string): string => {
    if (!error) return ""

    let message = `${context} failed`

    if (error.message) {
      if (error.message.includes("User rejected") || error.message.includes("user rejected")) {
        message = "Transaction was cancelled by user"
      } else if (error.message.includes("insufficient funds")) {
        message = "Insufficient funds for gas fees"
      } else if (error.message.includes("execution reverted")) {
        const revertMatch = error.message.match(/execution reverted:?\s*(.+?)(?:\n|$|,)/)
        if (revertMatch && revertMatch[1]) {
          message = `Transaction failed: ${revertMatch[1].trim()}`
        } else {
          message = "Transaction was rejected by the smart contract"
        }
      } else if (error.message.includes("network")) {
        message = "Network error. Please check your connection and try again."
      } else if (error.message.includes("timeout")) {
        message = "Transaction timed out. Please try again."
      } else {
        message = error.message
      }
    }

    return message
  }

  // Handle approval with enhanced error handling
  const handleApprove = async () => {
    try {
      if (!isFormValid) {
        setErrorMessage(formValidation.error || "Please fix form errors before approving")
        setShowErrorAlert(true)
        return
      }

      if (!isContractValid) {
        setErrorMessage("Contract is not ready. Please check if tokens are supported.")
        setShowErrorAlert(true)
        return
      }

      setShowErrorAlert(false)
      setShowWarningAlert(false)

      console.log(`Approving ${selectedToken} for PolicyManager...`)
      console.log("Contract address:", CONTRACT_ADDRESSES[`MOCK_${selectedToken}`])
      console.log("Spender address:", CONTRACT_ADDRESSES.POLICY_MANAGER)

      approve(CONTRACT_ADDRESSES.POLICY_MANAGER, maxUint256)
    } catch (error) {
      console.error("Approval preparation failed:", error)
      setErrorMessage("Failed to prepare approval transaction")
      setShowErrorAlert(true)
    }
  }

  // Handle policy creation with enhanced validation and error handling
  const handleCreatePolicy = async () => {
    try {
      // Pre-flight checks
      if (!isConnected) {
        setErrorMessage("Please connect your wallet first")
        setShowErrorAlert(true)
        return
      }

      if (!isFormValid) {
        setErrorMessage(formValidation.error || "Please fix form errors")
        setShowErrorAlert(true)
        return
      }

      if (!isContractValid) {
        setErrorMessage("Contracts are not ready. Please try again later.")
        setShowErrorAlert(true)
        return
      }

      if (isPaused) {
        setErrorMessage("The contract is currently paused. Please try again later.")
        setShowErrorAlert(true)
        return
      }

      if (!hasEnoughBalance) {
        setErrorMessage(
          `Insufficient ${selectedToken} balance. You need ${amount} but only have ${Number.parseFloat(formattedBalance).toFixed(4)}`,
        )
        setShowErrorAlert(true)
        return
      }

      if (!hasEnoughAllowance) {
        setErrorMessage(`Please approve ${selectedToken} first`)
        setShowErrorAlert(true)
        return
      }

      // Parameter validation
      if (immediatePayout[0] < 90 || immediatePayout[0] > 98) {
        setErrorMessage("Immediate payout must be between 90% and 98%")
        setShowErrorAlert(true)
        return
      }

      if (upsideShare[0] < 10 || upsideShare[0] > 50) {
        setErrorMessage("Upside share must be between 10% and 50%")
        setShowErrorAlert(true)
        return
      }

      if (duration[0] < 1 || duration[0] > 90) {
        setErrorMessage("Duration must be between 1 and 90 days")
        setShowErrorAlert(true)
        return
      }

      setShowErrorAlert(false)
      setShowWarningAlert(false)

      //  FIX: Use proper symbols for price oracle
      const tokenSymbolForOracle = selectedToken === "WETH" ? "ETH" : "USDC"

      const policyParams = {
        token: CONTRACT_ADDRESSES[`MOCK_${selectedToken}`],
        tokenSymbol: tokenSymbolForOracle, // Use ETH/USDC for price oracle
        amount,
        payoutToken: CONTRACT_ADDRESSES.MOCK_USDC,
        payoutBps: immediatePayout[0] * 100,
        duration: duration[0] * 24 * 60 * 60, // Convert days to seconds
        upsideShareBps: upsideShare[0] * 100,
      }

      console.log("Creating policy with params:", policyParams)
      console.log("Token symbol for oracle:", tokenSymbolForOracle)
      console.log("Duration in seconds:", policyParams.duration)
      console.log("PayoutBps:", policyParams.payoutBps)
      console.log("UpsideShareBps:", policyParams.upsideShareBps)

      createPolicy(policyParams)
    } catch (error) {
      console.error("Policy creation preparation failed:", error)
      setErrorMessage("Failed to prepare policy creation")
      setShowErrorAlert(true)
    }
  }

  // Enhanced approval success handling
  useEffect(() => {
    if (isApprovalSuccess) {
      console.log("Approval transaction successful! Waiting for confirmation...")
      setIsWaitingForConfirmation(true)
      setSuccessMessage(`${selectedToken} approval submitted! Waiting for blockchain confirmation...`)
      setShowSuccessAlert(true)

      // Wait for transaction to be mined
      const refetchWithDelay = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          console.log("Refetching allowance after approval...")
          const result = await refetchAllowance()

          // Check again after another delay
          setTimeout(async () => {
            try {
              const secondResult = await refetchAllowance()
              console.log("Allowance after second check:", secondResult.data?.toString())
              setIsWaitingForConfirmation(false)

              if (secondResult.data && secondResult.data > 0n) {
                setSuccessMessage(`${selectedToken} approved successfully! You can now create your policy.`)
                setShowSuccessAlert(true)
                setTimeout(() => setShowSuccessAlert(false), 5000)
              } else {
                setWarningMessage("Approval may still be processing. Please wait a moment and try again.")
                setShowWarningAlert(true)
                setTimeout(() => setShowWarningAlert(false), 8000)
              }
            } catch (error) {
              console.error("Error checking allowance:", error)
              setWarningMessage("Unable to verify approval status. Please check your transaction.")
              setShowWarningAlert(true)
            }
          }, 3000)
        } catch (error) {
          console.error("Error refetching allowance:", error)
          setIsWaitingForConfirmation(false)
          setWarningMessage("Unable to verify approval. Please check your wallet.")
          setShowWarningAlert(true)
        }
      }

      refetchWithDelay()
    }
  }, [isApprovalSuccess, refetchAllowance, selectedToken])

  //   USDC approval success handling
  useEffect(() => {
    if (isUsdcApprovalSuccess) {
      console.log("USDC approval transaction successful!")
      setSuccessMessage("USDC approved successfully! You can now purchase policies.")
      setShowSuccessAlert(true)
      setTimeout(() => setShowSuccessAlert(false), 5000)

      // Refetch USDC allowance
      setTimeout(() => {
        refetchUsdcAllowance()
      }, 3000)
    }
  }, [isUsdcApprovalSuccess, refetchUsdcAllowance])

  // Enhanced policy creation success handling
  useEffect(() => {
    if (policyCreated) {
      console.log("Policy created successfully!")

      // Reset form
      setAmount("")
      setImmediatePayout([95])
      setDuration([30])
      setUpsideShare([25])

      // Refetch data
      Promise.all([refetchAllowance(), refetchTokenBalance(), refetchOpenPolicies()]).catch((error) => {
        console.error("Error refetching data after policy creation:", error)
      })

      // Show success message
      setSuccessMessage("Policy created successfully! It will appear in the marketplace below.")
      setShowSuccessAlert(true)
      setTimeout(() => setShowSuccessAlert(false), 5000)
    }
  }, [policyCreated, refetchAllowance, refetchTokenBalance, refetchOpenPolicies])

  //   Policy purchase success handling
  useEffect(() => {
    if (policyPurchased) {
      console.log("Policy purchased successfully!")

      // Refetch data
      Promise.all([refetchUsdcBalance(), refetchTokenBalance(), refetchOpenPolicies(), refetchUsdcAllowance()]).catch(
        (error) => {
          console.error("Error refetching data after policy purchase:", error)
        },
      )

      // Show success message
      setSuccessMessage("Policy purchased successfully! Check your balances and My Policies page.")
      setShowSuccessAlert(true)
      setTimeout(() => setShowSuccessAlert(false), 5000)
    }
  }, [policyPurchased, refetchUsdcBalance, refetchTokenBalance, refetchOpenPolicies, refetchUsdcAllowance])

  // Enhanced error handling
  useEffect(() => {
    if (createError) {
      const errorMsg = getErrorMessage(createError, "Policy creation")
      console.error("Create error:", createError)
      setErrorMessage(errorMsg)
      setShowErrorAlert(true)
    }
  }, [createError])

  //   Purchase error handling
  useEffect(() => {
    if (purchaseError) {
      const errorMsg = getErrorMessage(purchaseError, "Policy purchase")
      console.error("Purchase error:", purchaseError)
      setErrorMessage(errorMsg)
      setShowErrorAlert(true)
    }
  }, [purchaseError])

  useEffect(() => {
    if (approvalError) {
      const errorMsg = getErrorMessage(approvalError, `${selectedToken} approval`)
      console.error("Approval error:", approvalError)
      setErrorMessage(errorMsg)
      setShowErrorAlert(true)
    }
  }, [approvalError, selectedToken])

  //   USDC approval error handling
  useEffect(() => {
    if (usdcApprovalError) {
      const errorMsg = getErrorMessage(usdcApprovalError, "USDC approval")
      console.error("USDC approval error:", usdcApprovalError)
      setErrorMessage(errorMsg)
      setShowErrorAlert(true)
    }
  }, [usdcApprovalError])

  useEffect(() => {
    if (allowanceError) {
      console.error("Allowance query error:", allowanceError)
      setWarningMessage("Unable to check token allowance. Please refresh the page.")
      setShowWarningAlert(true)
    }
  }, [allowanceError])

  // Clear alerts when form changes
  useEffect(() => {
    setShowErrorAlert(false)
    setShowWarningAlert(false)
    setIsWaitingForConfirmation(false)
  }, [amount, selectedToken, immediatePayout, duration, upsideShare])

  // Contract validation warning
  useEffect(() => {
    if (isConnected && isPaused !== undefined && isPaused) {
      setWarningMessage("The protocol is currently paused. Policy creation is temporarily disabled.")
      setShowWarningAlert(true)
    } else if (isConnected && !isContractValid && isPaused === false) {
      setWarningMessage("Some tokens may not be supported. Please contact support if issues persist.")
      setShowWarningAlert(true)
    }
  }, [isConnected, isPaused, isContractValid])

  //  ENHANCED PolicyCard component with filtering logic
  const PolicyCard = ({ policyId }: { policyId: number }) => {
    const {
      data: policy,
      error: policyError,
      refetch: refetchPolicy,
    } = useReadContract({
      address: CONTRACT_ADDRESSES.POLICY_MANAGER,
      abi: POLICY_MANAGER_ABI,
      functionName: "getPolicy",
      args: [BigInt(policyId)],
      query: {
        retry: 3,
        retryDelay: 1000,
      },
    })

    if (policyError) {
      console.error(`PolicyCard error for policy ${policyId}:`, policyError)
      return (
        <div className="bg-white border border-red-200 rounded-2xl p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load policy details</p>
            <p className="text-xs text-gray-500">Policy ID: {policyId}</p>
            <p className="text-xs text-gray-400">Error: {policyError.message}</p>
          </div>
        </div>
      )
    }

    if (!policy) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      )
    }

    //   Apply filters to this policy
    const tokenSymbol = policy.tokenSymbol === "ETH" ? "WETH" : policy.tokenSymbol
    const tokenAmount = formatTokenAmount(policy.amount, tokenSymbol as "WETH" | "USDC")
    const payoutAmount = formatTokenAmount(policy.payoutAmount, "USDC")
    const upsideSharePercent = Number(policy.upsideShareBps) / 100
    const durationDays = Number(policy.duration) / (24 * 60 * 60)
    const payoutPercent = (Number(policy.payoutAmount) * 100) / (Number(policy.amount) * 1700) // Approximate payout percentage

    const stateNames = ["Open", "Active", "Settled", "Cancelled"]
    const stateName = stateNames[policy.state] || "Unknown"

    //   Filter logic - hide policy if it doesn't match filters
    if (filtersApplied) {
      // Check payout range (approximate since we don't have exact payout percentage)
      if (payoutPercent < payoutRange[0] || payoutPercent > payoutRange[1]) {
        return null
      }

      // Check duration range
      if (durationDays < durationRange[0] || durationDays > durationRange[1]) {
        return null
      }

      // Check upside share range
      if (upsideSharePercent < upsideRange[0] || upsideSharePercent > upsideRange[1]) {
        return null
      }

      // Check status filter
      const statusMatch =
        (statusFilter.open && stateName === "Open") ||
        (statusFilter.ongoing && stateName === "Active") ||
        (statusFilter.finished && (stateName === "Settled" || stateName === "Cancelled"))

      if (!statusMatch) {
        return null
      }
    }

    //  ENHANCED: Check if buyer can afford the policy
    const payoutAmountBigInt = policy.payoutAmount
    const hasEnoughUsdcBalance = usdcBalance ? usdcBalance >= payoutAmountBigInt : false
    const hasEnoughUsdcAllowance = usdcAllowance ? usdcAllowance >= payoutAmountBigInt : false

    //   Handle USDC approval for purchasing
    const handleApproveUsdc = async () => {
      try {
        console.log("Approving USDC for policy purchase...")
        approveUsdc(CONTRACT_ADDRESSES.POLICY_MANAGER, maxUint256)
      } catch (error) {
        console.error("Error approving USDC:", error)
      }
    }

    const handlePurchase = async () => {
      try {
        if (!isConnected) {
          await connectWallet()
          return
        }

        //   Pre-purchase validation
        if (!hasEnoughUsdcBalance) {
          setErrorMessage(
            `Insufficient USDC balance. You need ${Number.parseFloat(payoutAmount).toFixed(2)} USDC but only have ${Number.parseFloat(formattedUsdcBalance).toFixed(2)}`,
          )
          setShowErrorAlert(true)
          return
        }

        if (!hasEnoughUsdcAllowance) {
          setErrorMessage("Please approve USDC spending first")
          setShowErrorAlert(true)
          return
        }

        console.log(`Purchasing policy ${policyId}...`)
        purchasePolicy(policyId)
      } catch (error) {
        console.error("Error initiating policy purchase:", error)
      }
    }

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {Number.parseFloat(tokenAmount).toFixed(4)} {tokenSymbol}
            </h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              stateName === "Open"
                ? "bg-green-100 text-green-700"
                : stateName === "Active"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {stateName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Immediate Payout</p>
            <p className="text-lg font-semibold text-gray-900">${Number.parseFloat(payoutAmount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-lg font-semibold text-gray-900">{Math.round(durationDays)} days</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">Upside Share</p>
          <p className="text-lg font-semibold text-gray-900">{upsideSharePercent}%</p>
        </div>

        {stateName === "Active" && policy.expiryTimestamp > BigInt(Math.floor(Date.now() / 1000)) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Time Remaining</p>
            <p className="text-sm font-medium text-gray-900">
              {Math.floor(Number(policy.expiryTimestamp - BigInt(Math.floor(Date.now() / 1000))) / 86400)} days
            </p>
          </div>
        )}

        {stateName === "Open" && (
          <div className="space-y-2">
            {policy.seller === address ? (
              <Button disabled className="w-full bg-gray-400">
                Your Policy
              </Button>
            ) : !hasEnoughUsdcBalance ? (
              <Button disabled className="w-full bg-red-500 hover:bg-red-600">
                Insufficient USDC Balance
              </Button>
            ) : !hasEnoughUsdcAllowance ? (
              <Button
                className="w-full bg-yellow-500 hover:bg-yellow-600"
                onClick={handleApproveUsdc}
                disabled={isApprovingUsdc}
              >
                {isApprovingUsdc ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving USDC...
                  </>
                ) : (
                  "Approve USDC First"
                )}
              </Button>
            ) : (
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handlePurchase} disabled={isPurchasing}>
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Purchasing...
                  </>
                ) : (
                  `Buy for ${Number.parseFloat(payoutAmount).toFixed(2)}`
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">FOMO Insurance</h1>
              <div className="flex items-center space-x-4">
                <Link href="/my-policies" className="text-gray-600 hover:text-gray-900">
                  My Policies
                </Link>
                <Link href="/faucet" className="text-gray-600 hover:text-gray-900">
                  Faucet
                </Link>
                {isConnected ? (
                  <div className="text-sm text-gray-600">
                    <div>
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                    <div className="text-xs">USDC: {Number.parseFloat(formattedUsdcBalance).toFixed(2)}</div>
                  </div>
                ) : (
                  <Button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Policy Creation Form */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Create Policy</h2>
            <div className="mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                Etherlink Testnet
              </span>
            </div>

            {/* Enhanced Alerts */}
            {!isConnected && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please connect your wallet to create and manage policies.</AlertDescription>
              </Alert>
            )}

            {showSuccessAlert && (
              <Alert className="mb-6">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {showWarningAlert && (
              <Alert className="mb-6" variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warningMessage}</AlertDescription>
              </Alert>
            )}

            {showErrorAlert && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Left Column - Inputs */}
                <div className="space-y-8">
                  {/* Token and Amount */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium text-gray-900">Token & Amount</Label>
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className={`text-lg h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                            !isFormValid && amount ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                          }`}
                        />
                        {!isFormValid && amount && <p className="text-sm text-red-500 mt-1">{formValidation.error}</p>}
                      </div>
                      <Select value={selectedToken} onValueChange={(value: "WETH" | "USDC") => setSelectedToken(value)}>
                        <SelectTrigger className="w-32 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Token" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WETH">WETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {amount && selectedToken && isFormValid && (
                      <p className="text-sm text-gray-600">≈ ${totalValue.toLocaleString()}</p>
                    )}
                    {isConnected && (
                      <div className="space-y-1">
                        <p className="text-base text-gray-500">
                          Balance: {Number.parseFloat(formattedBalance).toFixed(4)} {selectedToken}
                        </p>
                        {!hasEnoughBalance && isFormValid && (
                          <p className="text-sm text-red-500">
                            Insufficient balance. You need {amount} {selectedToken} but only have{" "}
                            {Number.parseFloat(formattedBalance).toFixed(4)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sliders */}
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label className="text-base font-medium text-gray-900">Immediate Payout</Label>
                        <span className="text-lg font-semibold text-blue-600">{immediatePayout[0]}%</span>
                      </div>
                      <Slider
                        value={immediatePayout}
                        onValueChange={setImmediatePayout}
                        max={98}
                        min={90}
                        step={1}
                        className="w-full [&_[data-radix-slider-track]]:bg-gray-200 [&_[data-radix-slider-range]]:bg-blue-600 [&_[data-radix-slider-thumb]]:bg-blue-600 [&_[data-radix-slider-thumb]]:border-blue-600 [&_[data-radix-slider-thumb]]:ring-0"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>90%</span>
                        <span>98%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label className="text-base font-medium text-gray-900">Coverage Duration</Label>
                        <span className="text-lg font-semibold text-blue-600">{duration[0]} days</span>
                      </div>
                      <Slider
                        value={duration}
                        onValueChange={setDuration}
                        max={90}
                        min={1}
                        step={1}
                        className="w-full [&_[data-radix-slider-track]]:bg-gray-200 [&_[data-radix-slider-range]]:bg-blue-600 [&_[data-radix-slider-thumb]]:bg-blue-600 [&_[data-radix-slider-thumb]]:border-blue-600 [&_[data-radix-slider-thumb]]:ring-0"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>1 day</span>
                        <span>90 days</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label className="text-base font-medium text-gray-900">Upside Share</Label>
                        <span className="text-lg font-semibold text-blue-600">{upsideShare[0]}%</span>
                      </div>
                      <Slider
                        value={upsideShare}
                        onValueChange={setUpsideShare}
                        max={50}
                        min={10}
                        step={1}
                        className="w-full [&_[data-radix-slider-track]]:bg-gray-200 [&_[data-radix-slider-range]]:bg-blue-600 [&_[data-radix-slider-thumb]]:bg-blue-600 [&_[data-radix-slider-thumb]]:border-blue-600 [&_[data-radix-slider-thumb]]:ring-0"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>10%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  </div>

                  {/* Receive Field */}
                  <div>
                    <Label className="text-base font-medium text-gray-900 mb-4 block">Receive</Label>
                    <div className="h-12 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 flex items-center">
                      <span className="text-gray-900 font-medium">USDC</span>
                    </div>
                    {isConnected && (
                      <p className="text-base text-gray-500 mt-2">
                        USDC Balance: {Number.parseFloat(formattedUsdcBalance).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="bg-gray-50 rounded-xl p-6 relative">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Policy Preview</h3>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
                    <p className="text-sm text-gray-600 mb-1">You'll receive now:</p>
                    <p className="text-2xl font-bold text-gray-900">${immediateReceive.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">in USDC</p>
                  </div>

                  {/*   Competitive Score */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Competitive Score</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-help">
                            <div className={`w-3 h-3 rounded-full ${scoreDisplay.bgColor}`}></div>
                            <span className={`text-lg font-bold ${scoreDisplay.color}`}>
                              {competitiveScore.toFixed(1)}
                            </span>
                            <Info className="w-4 h-4 text-gray-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{scoreDisplay.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {isFormValid ? (
                    <div className="space-y-6">
                      {/* Market Scenario Switcher */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-700">Additional Upside if Market Rallies</h4>

                        <div className="flex bg-gray-100 rounded-lg p-1">
                          {[20, 40, 60].map((scenario) => (
                            <button
                              key={scenario}
                              onClick={() => setSelectedScenario(scenario)}
                              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                selectedScenario === scenario
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              +{scenario}%
                            </button>
                          ))}
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="mb-2">
                            <span className="text-2xl font-bold text-green-600">${exampleUpside.toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">Your additional upside share</p>
                          <p className="text-xs text-gray-500">Market +{selectedScenario}% scenario</p>
                        </div>
                      </div>

                      {/* Term Summary */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Policy Terms</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Coverage Duration:</span>
                            <span className="font-medium text-gray-900">{duration[0]} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Upside Share:</span>
                            <span className="font-medium text-gray-900">{upsideShare[0]}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Immediate Payout:</span>
                            <span className="font-medium text-gray-900">{immediatePayout[0]}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Action Button */}
                      <div className="flex justify-end pt-4">
                        {!isConnected ? (
                          <Button
                            onClick={connectWallet}
                            disabled={isConnecting}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                          >
                            {isConnecting ? "Connecting..." : "Connect Wallet"}
                          </Button>
                        ) : !isFormValid ? (
                          <Button disabled className="bg-gray-400 px-6 py-2">
                            {formValidation.error || "Enter Amount"}
                          </Button>
                        ) : isPaused ? (
                          <Button disabled className="bg-gray-400 px-6 py-2">
                            Contract Paused
                          </Button>
                        ) : !hasEnoughBalance ? (
                          <Button disabled className="bg-gray-400 px-6 py-2">
                            Insufficient Balance
                          </Button>
                        ) : !hasEnoughAllowance ? (
                          <Button
                            onClick={handleApprove}
                            disabled={isApproving || isWaitingForConfirmation}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                          >
                            {isApproving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : isWaitingForConfirmation ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Confirming...
                              </>
                            ) : (
                              `Approve ${selectedToken}`
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleCreatePolicy}
                            disabled={isCreating}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                          >
                            {isCreating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Policy"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Fill in the form to see preview</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Policy Marketplace */}
          <section>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Policy Marketplace</h2>
              {protocolStats && <div className="text-sm text-gray-600">{Number(protocolStats[0])} open policies</div>}
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
              <div className="grid lg:grid-cols-4 gap-8">
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-4 block">Immediate Payout %</Label>
                  <Slider
                    value={payoutRange}
                    onValueChange={setPayoutRange}
                    max={98}
                    min={90}
                    step={1}
                    className="w-full [&_[data-radix-slider-track]]:bg-gray-200 [&_[data-radix-slider-range]]:bg-blue-600 [&_[data-radix-slider-thumb]]:bg-blue-600 [&_[data-radix-slider-thumb]]:border-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{payoutRange[0]}%</span>
                    <span>{payoutRange[1]}%</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-4 block">Duration (days)</Label>
                  <Slider
                    value={durationRange}
                    onValueChange={setDurationRange}
                    max={90}
                    min={1}
                    step={1}
                    className="w-full [&_[data-radix-slider-track]]:bg-gray-200 [&_[data-radix-slider-range]]:bg-blue-600 [&_[data-radix-slider-thumb]]:bg-blue-600 [&_[data-radix-slider-thumb]]:border-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{durationRange[0]}</span>
                    <span>{durationRange[1]}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-4 block">Upside Share %</Label>
                  <Slider
                    value={upsideRange}
                    onValueChange={setUpsideRange}
                    max={50}
                    min={10}
                    step={1}
                    className="w-full [&_[data-radix-slider-track]]:bg-gray-200 [&_[data-radix-slider-range]]:bg-blue-600 [&_[data-radix-slider-thumb]]:bg-blue-600 [&_[data-radix-slider-thumb]]:border-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{upsideRange[0]}%</span>
                    <span>{upsideRange[1]}%</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-4 block">Status</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={statusFilter.open}
                        onCheckedChange={(checked) => setStatusFilter((prev) => ({ ...prev, open: checked }))}
                      />
                      <span className="text-sm text-gray-700">Open</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={statusFilter.ongoing}
                        onCheckedChange={(checked) => setStatusFilter((prev) => ({ ...prev, ongoing: checked }))}
                      />
                      <span className="text-sm text-gray-700">Ongoing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={statusFilter.finished}
                        onCheckedChange={(checked) => setStatusFilter((prev) => ({ ...prev, finished: checked }))}
                      />
                      <span className="text-sm text-gray-700">Finished</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Apply Filters Button */}
              <div className="flex justify-center mt-6">
                <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700 px-8 py-2">
                  Apply Filters
                </Button>
              </div>
            </div>

            {/* Policy Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openPolicyIds && openPolicyIds.length > 0 ? (
                openPolicyIds.map((policyId) => <PolicyCard key={Number(policyId)} policyId={Number(policyId)} />)
              ) : (
                <div className="col-span-full text-center py-16">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">No policies available</h3>
                    <p className="text-gray-600 mb-8">Be the first to create a policy in the marketplace!</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  )
}
