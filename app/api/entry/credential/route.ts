import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createEntryCredential, hashEntryCredential } from "@/lib/entry-credential"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await createClient()
  const { data: { user }, error: authError } = await session.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Sign in to view this entry pass." }, { status: 401 })

  const ticketId = new URL(request.url).searchParams.get("ticketId")
  if (!ticketId || !/^[0-9a-f-]{36}$/i.test(ticketId)) return NextResponse.json({ error: "Entry pass not found." }, { status: 404 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: "Entry pass is temporarily unavailable." }, { status: 503 })
  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: ticket, error: ticketError } = await admin.from("tickets")
    .select("id, attendee_id, status, payment_mode, payment_status")
    .eq("id", ticketId).eq("attendee_id", user.id).maybeSingle()
  if (ticketError || !ticket || ticket.status !== "Active" || ticket.payment_mode !== "zcash-testnet" || ticket.payment_status !== "confirmed") {
    return NextResponse.json({ error: "A verified, active Zcash pass is required." }, { status: 404 })
  }

  const { data: credentialRow, error: credentialError } = await admin.from("entry_credentials")
    .select("token_hash").eq("ticket_id", ticket.id).maybeSingle()
  if (credentialError || !credentialRow) return NextResponse.json({ error: "The verified entry pass is not ready yet." }, { status: 503 })

  const credential = createEntryCredential(ticket.id)
  if (hashEntryCredential(credential) !== credentialRow.token_hash) {
    return NextResponse.json({ error: "The entry pass could not be verified." }, { status: 503 })
  }
  return NextResponse.json({ credential }, { headers: { "Cache-Control": "private, no-store" } })
}
