import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createPaymentRequest, ZcashConfigurationError } from "@/lib/zcash-testnet"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const session = await createClient()
    const { data: { user }, error: authError } = await session.auth.getUser()
    if (authError || !user?.email) return NextResponse.json({ error: "Sign in with a verified email before creating a payment request." }, { status: 401 })

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payment request." }, { status: 400 })
    const { eventId, attendeeName, quantity } = body as { eventId?: unknown; attendeeName?: unknown; quantity?: unknown }
    if (!Number.isSafeInteger(eventId) || Number(eventId) <= 0 || !Number.isSafeInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 6 || typeof attendeeName !== "string" || attendeeName.trim().length < 1 || attendeeName.trim().length > 120) {
      return NextResponse.json({ error: "Check the event, attendee name, and ticket quantity." }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: "Server-side ticket access is not configured." }, { status: 503 })
    const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: event, error: eventError } = await admin.from("events").select("id,price").eq("id", Number(eventId)).maybeSingle()
    if (eventError || !event) return NextResponse.json({ error: "This event is unavailable for checkout." }, { status: 404 })
    if (!Number.isSafeInteger(Number(event.price)) || Number(event.price) < 0) return NextResponse.json({ error: "This event has an invalid ticket price." }, { status: 409 })

    const result = await createPaymentRequest({
      eventId: Number(event.id),
      attendeeId: user.id,
      attendeeName: attendeeName.trim(),
      quantity: Number(quantity),
      ticketPrice: Number(event.price),
      requestKey: randomUUID(),
    })
    const uri = `zcash:${result.request.recipient}?amount=${result.amountZec}`
    return NextResponse.json({
      token: result.token,
      address: result.request.recipient,
      amountZat: result.request.amountZat,
      amountZec: result.amountZec,
      uri,
      expiresAt: result.request.expiresAt,
      network: "testnet",
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof ZcashConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 })
    return NextResponse.json({ error: "Could not create a Zcash testnet payment request." }, { status: 500 })
  }
}
