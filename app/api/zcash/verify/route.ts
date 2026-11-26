import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { readPaymentRequest, verifyTestnetPayment, ZcashConfigurationError, ZcashRpcError } from "@/lib/zcash-testnet"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const session = await createClient()
    const { data: { user }, error: authError } = await session.auth.getUser()
    if (authError || !user?.email) return NextResponse.json({ error: "Sign in with a verified email before verifying a payment." }, { status: 401 })

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ state: "failed", error: "Invalid verification request." }, { status: 400 })
    const { token, txid } = body as { token?: unknown; txid?: unknown }
    if (typeof token !== "string" || token.length > 4096 || typeof txid !== "string" || !/^[0-9a-f]{64}$/i.test(txid)) {
      return NextResponse.json({ state: "failed", error: "Enter a valid 64-character transaction ID." }, { status: 400 })
    }

    const payment = readPaymentRequest(token)
    if (!payment || payment.attendeeId !== user.id) return NextResponse.json({ state: "failed", error: "This payment request is invalid, expired, or belongs to another account." }, { status: 400 })

    const checked = await verifyTestnetPayment(txid.toLowerCase(), payment)
    if (checked.state !== "confirmed") return NextResponse.json(checked, { headers: { "Cache-Control": "no-store" } })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
    if (!url || !serviceKey) return NextResponse.json({ state: "pending", error: "Ticket issuance is temporarily unavailable. Your confirmed payment was not turned into a ticket; retry verification." }, { status: 503 })
    const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await admin.rpc("purchase_zcash_testnet_ticket", {
      p_event_id: payment.eventId,
      p_attendee_name: payment.attendeeName,
      p_attendee_email: user.email,
      p_attendee_id: user.id,
      p_quantity: payment.quantity,
      p_request_key: payment.requestKey,
      p_ticket_price: payment.ticketPrice,
      p_payment_txid: txid.toLowerCase(),
      p_payment_amount_zat: payment.amountZat,
    })

    if (error) {
      const alreadyUsed = /already used|duplicate key|tickets_payment_txid_unique/i.test(error.message)
      const noCapacity = /not enough tickets|event unavailable|price changed/i.test(error.message)
      if (alreadyUsed || noCapacity) {
        return NextResponse.json({ state: "failed", error: alreadyUsed ? "This transaction has already been used for a ticket." : "Tickets are no longer available at this price. Contact the event organiser; no ticket was issued." }, { status: 409, headers: { "Cache-Control": "no-store" } })
      }
      return NextResponse.json({ state: "pending", error: "Payment is confirmed on testnet, but ticket issuance is still being reconciled. Retry verification; do not send another payment." }, { status: 503, headers: { "Cache-Control": "no-store" } })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return NextResponse.json({ state: "pending", error: "The transaction is confirmed, but ticket issuance is still being reconciled. Retry verification." }, { status: 503 })
    return NextResponse.json({
      state: "confirmed",
      confirmations: checked.confirmations,
      ticket: {
        id: row.ticket_reference,
        recordId: row.id,
        attendeeId: row.attendee_id,
        eventId: Number(row.event_id),
        attendee: row.attendee_name,
        email: row.attendee_email,
        quantity: row.quantity,
        totalAmount: Number(row.total_amount),
        status: row.status,
        paymentMode: "zcash-testnet",
        paymentTxid: txid.toLowerCase(),
        paymentAmountZat: payment.amountZat,
        network: "testnet",
      },
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof ZcashConfigurationError) return NextResponse.json({ state: "unavailable", error: error.message }, { status: 503 })
    if (error instanceof ZcashRpcError) return NextResponse.json({ state: "pending", error: error.message }, { status: 503 })
    return NextResponse.json({ state: "pending", error: "Verification is temporarily unavailable. Payment is not confirmed; retry shortly." }, { status: 503 })
  }
}
