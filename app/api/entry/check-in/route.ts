import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hashEntryCredential, isEntryCredential } from "@/lib/entry-credential"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await createClient()
  const { data: { user }, error: authError } = await session.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Sign in with an organiser account to check in a pass." }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid check-in request." }, { status: 400 })
  const { eventId, credential } = body as { eventId?: unknown; credential?: unknown }
  if (!Number.isSafeInteger(eventId) || (eventId as number) <= 0 || !isEntryCredential(credential)) {
    return NextResponse.json({ state: "invalid", error: "That entry credential is invalid." }, { status: 400 })
  }

  const { data, error } = await session.rpc("check_in_entry_credential", {
    p_event_id: eventId,
    p_token_hash: hashEntryCredential(credential),
  })
  if (error) return NextResponse.json({ error: "This account cannot check in passes for the selected gathering." }, { status: 403 })
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
}
