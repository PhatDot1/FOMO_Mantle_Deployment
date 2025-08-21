// app/api/get-referral-data/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getReferralDataByEmail } from "@/lib/googleSheets"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    console.log("Received referral data request for:", email)

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    try {
      const referralData = await getReferralDataByEmail(email)
      console.log("Successfully retrieved referral data for:", email)

      return NextResponse.json({
        success: true,
        data: referralData
      })
    } catch (error) {
      console.error("Error retrieving referral data:", error)
      if (error instanceof Error && error.message === "EMAIL_NOT_FOUND") {
        return NextResponse.json(
          { error: "Email not found in waitlist. Please join the waitlist first." },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error("Error in get referral data:", error)
    return NextResponse.json({ error: "Failed to retrieve referral data. Please try again." }, { status: 500 })
  }
}