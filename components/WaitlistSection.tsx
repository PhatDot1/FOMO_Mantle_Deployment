"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface WaitlistSectionProps {
  className?: string
}

export default function WaitlistSection({ className = "" }: WaitlistSectionProps) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const trimmedEmail = email.trim()

    // Validate email
    if (!trimmedEmail) {
      setError("Please enter your email address")
      return
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Submitting email to waitlist:", trimmedEmail)
      
      const response = await fetch("https://script.google.com/macros/s/AKfycbySdQ6nujZvxcKdukoWc-AGSGSmAYf838-fnDwzeNj9E5NYxHjdBWa5IeNKpaJjsxCi4g/exec", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Response error text:", errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseData = await response.text()
      console.log("Response data:", responseData)
      
      // Try to parse JSON response
      try {
        const jsonResponse = JSON.parse(responseData)
        if (jsonResponse.success === false) {
          throw new Error(jsonResponse.error || "Server returned error")
        }
      } catch (parseError) {
        // If it's not JSON, that's okay - Apps Script might return plain text
        console.log("Response is not JSON, treating as success")
      }

      setEmail("")
      setSuccess("Thanks for joining! We'll keep you updated.")
    } catch (err) {
      console.error("Waitlist submission error:", err)
      
      // More specific error messages for debugging
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Network error. This might be a CORS issue during development.")
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={`py-24 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">Join the Waitlist</h2>
        <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
          Be the first to know when FOMO Insurance goes live on mainnet. Get early access and exclusive updates.
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-colors"
                disabled={isSubmitting}
              />
              {error && (
                <p className="text-red-600 text-sm mt-2 text-left">{error}</p>
              )}
              {success && (
                <p className="text-green-600 text-sm mt-2 text-left">{success}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              {isSubmitting ? "Joining..." : "Join Now"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}