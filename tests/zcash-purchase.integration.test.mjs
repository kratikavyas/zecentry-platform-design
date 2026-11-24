import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"

const url = process.env.SUPABASE_TEST_URL
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const enabled = Boolean(url && serviceKey)
const db = enabled ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null
const createdUsers = []
const createdEvents = []
const createdTicketIds = []

async function attendee() {
  const email = `zcash-test-${randomUUID()}@example.test`
  const { data, error } = await db.auth.admin.createUser({ email, password: `${randomUUID()}Aa1!`, email_confirm: true })
  assert.ifError(error)
  createdUsers.push(data.user.id)
  return { id: data.user.id, email }
}

async function event(capacity, price = 100) {
  const { data, error } = await db.from("events").insert({
    title: `Zcash test ${randomUUID()}`,
    category: "Test",
    city: "Test city",
    venue: "Test venue",
    event_date: "2099-01-01",
    price,
    capacity,
    sold: 0,
  }).select("id").single()
  assert.ifError(error)
  createdEvents.push(data.id)
  return data.id
}

function args({ user, eventId, quantity = 1, requestKey = randomUUID(), txid = randomUUID().replaceAll("-", "").padEnd(64, "0"), amountZat = 125000000, ticketPrice = 100 } = {}) {
  return {
    p_event_id: eventId,
    p_attendee_name: "Integration Test",
    p_attendee_email: user.email,
    p_attendee_id: user.id,
    p_quantity: quantity,
    p_request_key: requestKey,
    p_ticket_price: ticketPrice,
    p_payment_txid: txid,
    p_payment_amount_zat: amountZat,
  }
}

async function purchase(params) {
  return db.rpc("purchase_zcash_testnet_ticket", params)
}

before({ skip: !enabled }, async () => {
  assert.ok(db)
})

after({ skip: !enabled }, async () => {
  if (!db) return
  if (createdTicketIds.length) await db.from("tickets").delete().in("id", createdTicketIds)
  if (createdEvents.length) await db.from("events").delete().in("id", createdEvents)
  for (const id of createdUsers) await db.auth.admin.deleteUser(id)
})

test("rejects invalid payment arguments and unverified identities", { skip: !enabled }, async () => {
  const user = await attendee()
  const eventId = await event(5)
  const malformed = await purchase(args({ user, eventId, txid: "not-a-txid" }))
  assert.ok(malformed.error)
  assert.match(malformed.error.message, /transaction id/i)

  const zeroAmount = await purchase(args({ user, eventId, amountZat: 0 }))
  assert.ok(zeroAmount.error)
  assert.match(zeroAmount.error.message, /payment amount/i)

  const wrongEmail = await purchase({ ...args({ user, eventId }), p_attendee_email: "different@example.test" })
  assert.ok(wrongEmail.error)
  assert.match(wrongEmail.error.message, /verified account/i)
})

test("enforces transaction uniqueness and permits exact request replay", { skip: !enabled }, async () => {
  const user = await attendee()
  const other = await attendee()
  const eventId = await event(5)
  const params = args({ user, eventId })
  const first = await purchase(params)
  assert.ifError(first.error)
  createdTicketIds.push(first.data.id)

  const replay = await purchase(params)
  assert.ifError(replay.error)
  assert.equal(replay.data.id, first.data.id)

  const concurrentParams = args({ user, eventId })
  const simultaneousRetries = await Promise.all([purchase(concurrentParams), purchase(concurrentParams)])
  assert.ok(simultaneousRetries.every(result => !result.error))
  assert.equal(simultaneousRetries[0].data.id, simultaneousRetries[1].data.id)
  createdTicketIds.push(simultaneousRetries[0].data.id)

  const unrelatedRequest = await purchase(args({ user: other, eventId, txid: params.p_payment_txid }))
  assert.ok(unrelatedRequest.error)
  assert.match(unrelatedRequest.error.message, /tickets_payment_txid_unique|duplicate key/i)
})

test("rejects purchases beyond event capacity", { skip: !enabled }, async () => {
  const user = await attendee()
  const eventId = await event(1)
  const first = await purchase(args({ user, eventId }))
  assert.ifError(first.error)
  createdTicketIds.push(first.data.id)

  const second = await purchase(args({ user: await attendee(), eventId }))
  assert.ok(second.error)
  assert.match(second.error.message, /not enough tickets/i)
})

test("serializes concurrent purchases so capacity cannot be oversold", { skip: !enabled }, async () => {
  const eventId = await event(1)
  const users = await Promise.all([attendee(), attendee()])
  const results = await Promise.all(users.map(user => purchase(args({ user, eventId }))))
  const successes = results.filter(result => !result.error)
  const failures = results.filter(result => result.error)
  assert.equal(successes.length, 1)
  assert.equal(failures.length, 1)
  assert.match(failures[0].error.message, /not enough tickets/i)
  createdTicketIds.push(successes[0].data.id)
})
