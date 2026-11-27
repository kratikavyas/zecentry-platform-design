import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 4 * 1024 * 1024
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

function matchesImageSignature(type: keyof typeof MIME_EXTENSIONS, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png") return bytes.subarray(0, 8).toString() === "137,80,78,71,13,10,26,10"
  return bytes.subarray(0, 4).toString() === "82,73,70,70" && bytes.subarray(8, 12).toString() === "87,69,66,80"
}

export async function POST(request: Request) {
  const session = await createClient()
  const { data: { user }, error: authError } = await session.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Sign in as the event organiser to change its image." }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  const eventIdValue = formData?.get("eventId")
  const file = formData?.get("image")
  if (typeof eventIdValue !== "string" || !/^\d+$/.test(eventIdValue) || !file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "Choose an event and an image to upload." }, { status: 400 })
  }
  if (file.size < 1 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Choose an image smaller than 5 MB." }, { status: 413 })
  }
  if (!Object.hasOwn(MIME_EXTENSIONS, file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const contentType = file.type as keyof typeof MIME_EXTENSIONS
  if (!matchesImageSignature(contentType, bytes)) {
    return NextResponse.json({ error: "The file contents do not match a supported image type." }, { status: 415 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: "Image uploads are temporarily unavailable." }, { status: 503 })
  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: event, error: eventError } = await admin.from("events")
    .select("id, organizer_id")
    .eq("id", Number(eventIdValue))
    .maybeSingle()
  if (eventError || !event) return NextResponse.json({ error: "Event not found." }, { status: 404 })
  if (event.organizer_id !== user.id) return NextResponse.json({ error: "Only the event organiser can change this image." }, { status: 403 })

  const objectPath = `${event.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[contentType]}`
  const { error: uploadError } = await admin.storage.from("event-covers").upload(objectPath, bytes, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: "The image could not be uploaded. Please try again." }, { status: 502 })

  const imageUrl = admin.storage.from("event-covers").getPublicUrl(objectPath).data.publicUrl
  const { data: updatedEvent, error: updateError } = await admin.from("events")
    .update({ image: imageUrl })
    .eq("id", event.id)
    .eq("organizer_id", user.id)
    .select("id")
    .maybeSingle()
  if (updateError || !updatedEvent) {
    await admin.storage.from("event-covers").remove([objectPath])
    return NextResponse.json({ error: "The image uploaded, but the event could not be updated. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ image: imageUrl }, { headers: { "Cache-Control": "no-store" } })
}
