import test from "node:test"
import assert from "node:assert/strict"

process.env.ZCASH_TESTNET_RPC_URL = "https://testnet.example.invalid"
process.env.ZCASH_TESTNET_T_ADDRESS = "tmExampleAddress"
process.env.ZEC_INR_RATE_TESTNET = "1"

const { verifyTestnetPayment } = await import("../lib/zcash-testnet.ts")
const txid = "a".repeat(64)
const payment = { recipient: "tmExampleAddress", amountZat: "125000000" }

function mockRpc({ chain = "test", transaction = {} } = {}) {
  globalThis.fetch = async (_url, options) => {
    const { method } = JSON.parse(options.body)
    const result = method === "getblockchaininfo" ? { chain } : transaction
    return new Response(JSON.stringify({ result }), { status: 200 })
  }
}

test("rejects transactions when the configured node is not on testnet", async () => {
  mockRpc({ chain: "main" })
  const result = await verifyTestnetPayment(txid, payment)
  assert.equal(result.state, "failed")
  assert.match(result.message, /not on testnet/i)
})

test("rejects unrelated transactions and wrong receiving addresses", async () => {
  mockRpc({ transaction: { txid: "b".repeat(64), confirmations: 1, vout: [] } })
  assert.equal((await verifyTestnetPayment(txid, payment)).state, "failed")

  mockRpc({ transaction: { txid, confirmations: 1, vout: [{ value: 1.25, scriptPubKey: { address: "someOtherAddress" } }] } })
  const wrongRecipient = await verifyTestnetPayment(txid, payment)
  assert.equal(wrongRecipient.state, "failed")
  assert.match(wrongRecipient.message, /exact amount/i)
})

test("rejects underpaid and overpaid outputs", async () => {
  for (const value of [1.24999999, 1.25000001]) {
    mockRpc({ transaction: { txid, confirmations: 1, vout: [{ value, scriptPubKey: { address: payment.recipient } }] } })
    assert.equal((await verifyTestnetPayment(txid, payment)).state, "failed")
  }
})

test("keeps an exact payment pending until it has a confirmation", async () => {
  mockRpc({ transaction: { txid, confirmations: 0, vout: [{ value: 1.25, scriptPubKey: { address: payment.recipient } }] } })
  const result = await verifyTestnetPayment(txid, payment)
  assert.equal(result.state, "pending")
  assert.equal(result.confirmations, 0)
})

test("confirms exact recipient and amount after at least one confirmation", async () => {
  mockRpc({ transaction: { txid, confirmations: 1, vout: [{ value: 1.25, scriptPubKey: { address: payment.recipient } }] } })
  const result = await verifyTestnetPayment(txid, payment)
  assert.deepEqual(result, { state: "confirmed", confirmations: 1 })
})
