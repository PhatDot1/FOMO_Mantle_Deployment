
<img width="637" height="137" alt="Screenshot 2025-08-03 at 14 09 55" src="https://github.com/user-attachments/assets/06d788ce-5157-414d-bc44-bd3bb09d78e2" />

FOMO Insurance is a decentralized protocol built on **Mantle** that allows crypto holders to cash out their crypto for stablecoins *and still retain upside exposure* if the market rises after they exit. 
This provides a new risk-management primitive in DeFi that mirrors structured financial products in TradFi, giving users both immediate liquidity and a share of future gains. 

**View the demo here**: http://demo.fomoinsurance.com/

---

## Problem

Most crypto users face a familiar dilemma:  
You need to cash out, but you’re worried the market will surge as soon as you do.

The current off-ramping experience forces users to make a binary decision:
- **Sell and miss out** if the price jumps afterward
- **Hold and risk volatility** when you need liquidity

FOMO Insurance offers a new middle path.

It is designed for **everyday crypto users**, not professional traders, who want a simple and intuitive way to off-ramp without giving up the chance to benefit from future upside. 
Instead of navigating complex options or DeFi strategies, users can make this decision seamlessly:  
**Sell now, lock in an immediate cashout, and keep a piece of the upside as if you never sold.**

In traditional finance, structured products let investors balance liquidity and long-term exposure.  
But those solutions are often complex, opaque, and out of reach.  
FOMO Insurance delivers the same core benefit - **partial upside retention** - in a one-click product that feels as simple as a token swap.


**FOMO Insurance is the first off-ramp built for peace of mind.**

---

## What We’ve Built

FOMO Insurance is live on **Mantle testnet** and consists of a multi-user flow:

### Seller Flow (Policy Creation)
- User selects token, amount, and three terms:
  - **Immediate payout (%)** – e.g., 96% of market value, paid in USDC
  - **Upside share (%)** – how much of future gains they retain, e.g., 30%
  - **Duration (days)** – anywhere between 1 to 90 days
- Tokens are not transferred until a buyer accepts the listing
- Sellers can cancel a listing at any time before it is bought
- When a seller’s policy is purchased by a buyer:
  - **USDC** is transferred instantly to the seller
  - The buyer’s received tokens are locked in the smart contract until expiry
  - At expiry, any owed upside is paid to the seller automatically

<INSERT CREATE POLICY IMAGE>

### Buyer Flow (Marketplace)
- Browse all live policies using the filters
- Buyers select based on their risk appetite and market outlook
- Upon purchase:
  - Buyer receives **ETH (or other token)** locked until expiry
  - Buyer pays **less than market price**, creating an **instant gain**
  - At expiry, **seller may receive additional payout** if price has appreciated. Buyer keeps the majority of the upside.

This dynamic creates a **two-sided market**:
- **Sellers** gain liquidity and hedge their exit
- **Buyers** gain discounted tokens; any upside the buyer pays to the seller is covered by the token’s appreciation

### My Policies
- Dashboard showing all policies associated with connected wallet
- Includes:
  - Whether the user is buyer or seller
  - Policy terms
  - Current performance
  - Final outcomes
  - Cancellation option for unsold policies

---

## Why It Matters

We spoke with multiple crypto users who’ve experienced the same pattern:  
> *“I finally cashed out... and the market jumped 40% over the next week. I’m starting to think the rally only happened because I sold.”*

Today, there are **no DeFi-native solutions** that help users off-ramp while keeping some upside exposure.

As crypto adoption grows, users need **better portfolio tools**, and FOMO Insurance fills that gap.

---

## Powered by Mantle

FOMO Insurance is deployed on **Mantle** and is a good fit due to:
- **High throughput & fast finality**: Viable for real-time policy creation and settlements
- **Ultra-low fees**: Allows micro-policies and better UX without gas overhead
- **Ethereum compatibility**: Users can cash out their MetaMask portfolios without friction
- **Modular architecture**: Built on Ethereum's proven security with enhanced scalability and performance

---

## Technical Overview

- **Frontend:** Built in Next.js and TailwindCSS, deployed on Vercel  
- **Contracts:** Solidity + Hardhat (deployed on Mantle testnet)

---

## Future Roadmap

### Short-Term
- Add visual analytics and track ROI per policy
- Complete smart contract audits
- Deploy to **Mantle mainnet**
- Support additional tokens

### Mid-Term
- **Off-ramp integration** (Ramp Network or similar) for seamless fiat exits
- **More policy optionality** (e.g., tapered policies rather than cliff edge)
- **Exploration of community-led underwriting pools** (rather than P2P swaps)
- **Related off-ramp products** (such as a DCA selling tool)


---

## Team
- **0xJam** – Discord: jamie23000  
- **Patrick** – Discord: ppwoo  
