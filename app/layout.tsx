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
  title: "FOMO Insurance - Cash out without missing out",
  description:
    "Sell your crypto while keeping a share of the upside.",
  keywords: "DeFi, crypto insurance, FOMO, decentralized finance, crypto options",
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
