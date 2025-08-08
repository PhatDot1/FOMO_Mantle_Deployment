import type React from "react"
import type { Metadata } from "next"
import { Barlow_Semi_Condensed } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/providers"

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: "500", // Medium
  variable: "--font-barlow",
  display: "swap",
})

export const metadata: Metadata = {
  title: "FOMO Insurance - Cash out without missing out | Built on Mantle",
  description:
    "Sell your crypto while keeping a share of the upside. Decentralized insurance protocol built on Mantle network for fast, low-cost transactions.",
  keywords: "DeFi, crypto insurance, FOMO, decentralized finance, crypto options, Mantle network, Ethereum L2",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
