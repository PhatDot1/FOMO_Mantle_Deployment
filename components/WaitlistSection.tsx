'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Copy, Share, Loader2, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { cn } from '@/lib/utils'

interface WaitlistResponse {
  success: boolean
  refCode: string
  referrals: number
  message?: string
  error?: string
}

interface WaitlistSectionProps {
  className?: string
}

export default function WaitlistSection({ className }: WaitlistSectionProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<WaitlistResponse | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [wantsEmails, setWantsEmails] = useState(true)
  const { address } = useAccount()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isSubmitting) return

    setIsSubmitting(true)

    try {
      const referrer = localStorage.getItem('fomoinsurance:referrer')
      const requestBody = {
        email,
        walletAddress: address,
        ref: referrer,
        wantsClaimEmails: wantsEmails
      }

      const res = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await res.json()

      if (data.success) {
        // Store the refCode and email for future use
        localStorage.setItem('fomoinsurance:refCode', data.refCode)
        localStorage.setItem('fomoinsurance:email', email)
        setResponse(data)
      } else {
        setResponse({ success: false, error: data.error, refCode: '', referrals: 0 })
      }
    } catch (error) {
      setResponse({ 
        success: false, 
        error: 'Network error. Please try again.', 
        refCode: '', 
        referrals: 0 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyReferralLink = async () => {
    if (!response?.refCode) return
    
    const link = `${window.location.origin}/?ref=${response.refCode}`
    await navigator.clipboard.writeText(link)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const shareToX = () => {
    if (!response?.refCode) return
    
    const link = `${window.location.origin}/?ref=${response.refCode}`
    const text = `I'm early to FOMO Insurance — cash out without missing out. Join me: ${link}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <section id="waitlist" className={cn("py-24", className)}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Join the Waitlist</h2>
          <p className="text-xl text-gray-600">Get early access and earn referral rewards</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
        >
          <AnimatePresence mode="wait">
            {!response?.success ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={wantsEmails}
                      onChange={(e) => setWantsEmails(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="notifications" className="text-sm text-gray-600">
                      Email me about product updates and early access
                    </label>
                  </div>
                </div>

                {response?.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{response.error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Waitlist'
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <Check className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">You're in!</h3>
                  <p className="text-gray-600">Successfully joined the FOMO Insurance waitlist</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your referral link
                    </label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/?ref=${response.refCode}`}
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
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Launch dApp
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Referrals: <span className="font-semibold text-blue-600">{response.referrals}</span>
                    </p>
                  </div>

                  {/* Link to Full Referral Dashboard */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => window.location.href = '/referrals'}
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Manage Your Referrals
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}