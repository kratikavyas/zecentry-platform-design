import { createHash, createHmac } from "node:crypto"

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Entry credential signing is not configured.")
  return key
}

export function createEntryCredential(ticketId: string) {
  return `zecentry:v1.${createHmac("sha256", signingKey()).update(`entry:${ticketId}`).digest("base64url")}`
}

export function hashEntryCredential(credential: string) {
  return createHash("sha256").update(credential).digest("hex")
}

export function isEntryCredential(credential: unknown): credential is string {
  return typeof credential === "string" && /^zecentry:v1\.[A-Za-z0-9_-]{43}$/.test(credential)
}
