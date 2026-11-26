import test from "node:test"
import assert from "node:assert/strict"

process.env.SUPABASE_SERVICE_ROLE_KEY = "entry-credential-test-key"
const { createEntryCredential, hashEntryCredential, isEntryCredential } = await import("../lib/entry-credential.ts")

test("entry credentials are stable, opaque, and bound to one ticket", () => {
  const first = createEntryCredential("00000000-0000-4000-8000-000000000001")
  const retry = createEntryCredential("00000000-0000-4000-8000-000000000001")
  const other = createEntryCredential("00000000-0000-4000-8000-000000000002")

  assert.equal(first, retry)
  assert.notEqual(first, other)
  assert.equal(isEntryCredential(first), true)
  assert.equal(isEntryCredential("not-a-credential"), false)
  assert.match(hashEntryCredential(first), /^[0-9a-f]{64}$/)
  assert.notEqual(hashEntryCredential(first), hashEntryCredential(other))
})
