"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAccount } from 'wagmi'
import { useTomoWallet } from "@/contexts/tomo-wallet-context"


export default function LandingPage() {
  const [showFullChart, setShowFullChart] = useState(false)
  const { isConnected, address } = useAccount()
  const { connectWallet, isConnecting } = useTomoWallet()

  const toggleChart = () => {
    setShowFullChart(!showFullChart)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                FOMO Insurance
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                  How It Works
                </Link>
                <Link href="#faq" className="text-gray-600 hover:text-blue-600 transition-colors">
                  FAQ
                </Link>
                <Link href="/faucet" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Faucet
                </Link>
                {isConnected ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <Link
                      href="/app"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Launch dApp
                    </Link>
                  </div>
                ) : (
                  <Button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                )}
              </div>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              {isConnected ? (
                <Link
                  href="/app"
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Launch dApp
                </Link>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  size="sm"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-blue-600 leading-tight mb-6">FOMO Insurance</h1>
              <h2 className="text-2xl lg:text-3xl text-gray-700 mb-8 font-medium">Cash out without missing out</h2>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-lg">
                FOMO Insurance lets you cash out your crypto while keeping a share of the upside if the market rallies
                later.
                <br />
                <br />
                Get instant liquidity now, and peace of mind that you won't be missing out on the next big market rally.
              </p>
              {isConnected ? (
                <Link href="/app">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium rounded-lg transition-colors">
                    Launch dApp
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium rounded-lg transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
            <div className="relative flex flex-col items-center">
              {/* Image displayed with styling */}
              <Image
                src={showFullChart ? "/images/full_eth.png" : "/images/half_eth.png"}
                alt="ETH Price Chart"
                width={960}
                height={720}
                className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                priority
              />
              {/* Toggle switch */}
              <div className="flex items-center space-x-2 mt-4">
                <Switch id="chart-toggle" checked={showFullChart} onCheckedChange={setShowFullChart} />
                <Label htmlFor="chart-toggle" className="text-gray-700">
                  Reveal full chart
                </Label>
              </div>
              {/* Caption */}
              <p className="text-base text-gray-600 text-center mt-6 max-w-lg mx-auto">
                You think you've sold at the top but the market has other plans. FOMO Insurance protects you when the
                market jumps right after you sell.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Seller Flow */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-8xl mx-auto px-8 sm:px-12 lg:px-32">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">Cash out your crypto in three steps.</h2>

          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-shrink-0">
              <Image
                src="/images/create-policy-screenshot.png"
                alt="Create Policy Interface"
                width={800}
                height={600}
                className="h-auto rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              />
            </div>
            <div className="flex-1">
              <div className="space-y-12">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Set your terms</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Choose your upfront payout %, coverage duration, and upside share % depending on your market
                      outlook and risk tolerance.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-200"></div>

                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Get liquidity</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Upon a buyer accepting your terms, instantly receive stablecoins which you can off ramp.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-200"></div>

                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Stay covered</h3>
                    <p className="text-gray-600 leading-relaxed">
                      If the market rises, you'll receive a share of the upside. If the market crashes, you'll be glad
                      you already cashed out.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Buyer Flow Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-8xl mx-auto px-8 sm:px-12 lg:px-32">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Not cashing out? Buy a policy and make instant yield.
          </h2>

          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1">
              <div className="space-y-12">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Browse policies for your desired risk tolerance
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Explore available policies in the marketplace and find opportunities that match your investment
                      strategy and risk appetite.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-200"></div>

                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Purchase a policy and make instant profit
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Buy a policy that aligns with your outlook and immediately earn the difference between the policy
                      price and current market value.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-200"></div>

                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      After the duration of the policy, receive the tokens
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      At expiry, receive the underlying tokens at the agreed price, potentially at a significant
                      discount to market value.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Image
                src="/images/policy-marketplace-screenshot.png"
                alt="Policy Marketplace Interface"
                width={800}
                height={600}
                className="h-auto rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Powered by Mantle Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <Image src="/images/mantle-mnt-logo.png" alt="Mantle Logo" width={80} height={80} className="w-20 h-20" />
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-8">Powered by Mantle</h2>

          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            FOMO Insurance runs on Mantle, a high-performance Layer 2 network built on Ethereum's security. Mantle enables:
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">High throughput</h3>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ultra-low fees</h3>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ethereum compatibility</h3>
            </div>
          </div>

          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            We're using Mantle to deliver fast finality, cost-effective transactions, and seamless DeFi integration.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">Frequently Asked Questions</h2>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                What is FOMO Insurance?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                FOMO Insurance is a decentralized protocol that allows you to sell your crypto holdings while
                maintaining exposure to potential upside. It's designed to eliminate the fear of missing out by
                providing structured optionality after you've taken profits.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                What tokens are supported?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                We currently support WETH and USDC on Mantle testnet. Our supported token list is continuously
                expanding based on liquidity and community demand.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                What happens at expiry?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                At expiry, your policy automatically settles based on the token's performance. If the price increased,
                you'll receive your share of the upside in addition to the initial payout you received when creating the
                policy.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                Can I cancel a policy after listing it?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                Yes. Policies can be cancelled at any time before a buyer accepts. Once a buyer purchases the policy, it
                becomes locked and cannot be cancelled.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                How is the upside share calculated?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                The upside share is based on the token price at expiry compared to the price when the buyer purchased
                the policy. Any gains are split according to the agreed upside share.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                What if the price doesn't go up?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                If the market falls over the duration of the policy, you won't be eligible for any upside payment. You
                keep the full initial payout. This means you successfully sold at a good time compared to if you had
                HODL.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                Is my crypto safe while it's locked?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                Your crypto is securely locked in audited smart contracts on Mantle. The contracts are immutable and
                handle settlement automatically based on oracle price feeds.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline text-lg">
                How do I get test tokens?
              </AccordionTrigger>
              <AccordionContent className="text-[17px] text-gray-600 leading-relaxed">
                Visit our <Link href="/faucet" className="text-blue-600 hover:underline">faucet page</Link> to claim free
                WETH and USDC test tokens for the Mantle testnet. You can claim once every 24 hours.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-900 font-bold text-lg">FOMO Insurance</div>
            <div className="flex space-x-8">
              <Link href="/app" className="text-gray-600 hover:text-blue-600 transition-colors">
                App
              </Link>
              <Link href="/faucet" className="text-gray-600 hover:text-blue-600 transition-colors">
                Faucet
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="https://explorer.sepolia.mantle.xyz/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                Explorer
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 text-center text-gray-500 text-sm">
            © 2024 FOMO Insurance. Powered by Mantle.
          </div>
        </div>
      </footer>
    </div>
  )
}
