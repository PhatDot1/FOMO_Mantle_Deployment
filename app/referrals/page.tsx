'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Share, Users, Trophy, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

interface ReferralData {
  email: string
  refCode: string
  referrals: number
  wantsClaimEmails: boolean
}

export default function ReferralsPage() {
  const [email, setEmail] = useState('')
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Try to load data from localStorage on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('fomoinsurance:email')
    const storedRefCode = localStorage.getItem('fomoinsurance:refCode')
    
    if (storedEmail && storedRefCode) {
      setEmail(storedEmail)
      // You might want to fetch fresh data from the server here
      setReferralData({
        email: storedEmail,
        refCode: storedRefCode,
        referrals: 0, // This should be fetched from server
        wantsClaimEmails: true
      })
    }
  }, [])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isLoading) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/get-referral-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (data.success) {
        setReferralData(data.data)
        // Store in localStorage for future visits
        localStorage.setItem('fomoinsurance:email', email)
        localStorage.setItem('fomoinsurance:refCode', data.data.refCode)
      } else {
        setError(data.error || 'Email not found in waitlist')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyReferralLink = async () => {
    if (!referralData?.refCode) return
    
    const link = `${window.location.origin}/?ref=${referralData.refCode}`
    await navigator.clipboard.writeText(link)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const shareToX = () => {
    if (!referralData?.refCode) return
    
    const link = `${window.location.origin}/?ref=${referralData.refCode}`
    const text = `I'm early to FOMO Insurance — cash out without missing out. Join me: ${link}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Manage Your Referrals</h1>
          <p className="text-lg text-gray-600 mt-2">Track your referral progress and share your link</p>
        </div>

        {!referralData ? (
          /* Email Lookup Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-2xl mx-auto"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Find Your Referral Data</h2>
              <p className="text-gray-600">Enter the email you used to join the waitlist</p>
            </div>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label htmlFor="lookup-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <Input
                  id="lookup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
              >
                {isLoading ? 'Looking up...' : 'Find My Data'}
              </Button>
            </form>
          </motion.div>
        ) : (
          /* Referral Dashboard */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Referrals</p>
                    <p className="text-3xl font-bold text-gray-900">{referralData.referrals}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Rank</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {referralData.referrals === 0 ? '-' : '#1'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Referral Link</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/?ref=${referralData.refCode}`}
                    className="bg-gray-50 border-gray-300 text-gray-900 font-mono text-sm"
                  />
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4"
                  >
                    {copySuccess ? (
                      <Check className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={shareToX}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share to X
                  </Button>
                  <Button
                    onClick={() => window.open('/app', '_blank')}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Launch dApp
                  </Button>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 font-medium">{referralData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Referral Code:</span>
                  <span className="text-gray-900 font-mono">{referralData.refCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email Notifications:</span>
                  <span className="text-gray-900">
                    {referralData.wantsClaimEmails ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center">
              <Button
                onClick={() => {
                  setReferralData(null)
                  setEmail('')
                  localStorage.removeItem('fomoinsurance:email')
                  localStorage.removeItem('fomoinsurance:refCode')
                }}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Look up different email
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}