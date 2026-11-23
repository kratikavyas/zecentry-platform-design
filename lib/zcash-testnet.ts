import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import { addresses, createPublicClient } from "@zcashlabs/zcash.js"

const ZAT_PER_ZEC = 100_000_000
const MAX_RPC_RESPONSE_BYTES = 8 * 1024 * 1024

export type ZcashPaymentRequest = {
  version: 1
  eventId: number
  attendeeId: string
  attendeeName: string
  quantity: number
  ticketPrice: number
  requestKey: string
  recipient: string
  amountZat: string
  expiresAt: number
}

type JsonRpcResult<T> = { result?: T; error?: { code?: number; message?: string } }
type VerboseTransaction = {
  txid?: string
  confirmations?: number
  vout?: Array<{
    value?: number
    scriptPubKey?: { address?: string; addresses?: string[] }
  }>
}

export class ZcashConfigurationError extends Error {}
export class ZcashRpcError extends Error {}

function configuration() {
  const url = process.env.ZCASH_TESTNET_RPC_URL
  const username = process.env.ZCASH_TESTNET_RPC_USERNAME
  const password = process.env.ZCASH_TESTNET_RPC_PASSWORD
  const recipient = process.env.ZCASH_TESTNET_T_ADDRESS
  const rate = Number(process.env.ZEC_INR_RATE_TESTNET)

  if (!url || !recipient || !Number.isFinite(rate) || rate <= 0) {
    throw new ZcashConfigurationError("Zcash testnet checkout is not configured. Set ZCASH_TESTNET_RPC_URL, ZCASH_TESTNET_T_ADDRESS, and ZEC_INR_RATE_TESTNET.")
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new ZcashConfigurationError("ZCASH_TESTNET_RPC_URL must be a valid HTTPS URL (HTTP is allowed only for localhost).")
  }
  if (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname))) {
    throw new ZcashConfigurationError("ZCASH_TESTNET_RPC_URL must use HTTPS unless it points to localhost.")
  }
  if (username && !password) throw new ZcashConfigurationError("ZCASH_TESTNET_RPC_PASSWORD is required when ZCASH_TESTNET_RPC_USERNAME is set.")
  return { url: parsedUrl.toString(), username, password, recipient, rate }
}

async function rpc<T>(method: string, params: unknown[]) {
  const settings = configuration()
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (settings.username && settings.password) {
    headers.authorization = `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`
  }

  let response: Response
  try {
    response = await fetch(settings.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "1.0", id: "zecentry", method, params }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ZcashRpcError("The configured Zcash testnet RPC could not be reached. Payment remains pending; retry verification.")
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0)
  if (contentLength > MAX_RPC_RESPONSE_BYTES) throw new ZcashRpcError("The Zcash testnet RPC returned an oversized response.")
  const raw = await response.text()
  if (raw.length > MAX_RPC_RESPONSE_BYTES) throw new ZcashRpcError("The Zcash testnet RPC returned an oversized response.")
  if (!response.ok) throw new ZcashRpcError("The configured Zcash testnet RPC rejected the request.")

  let payload: JsonRpcResult<T>
  try {
    payload = JSON.parse(raw) as JsonRpcResult<T>
  } catch {
    throw new ZcashRpcError("The configured Zcash testnet RPC returned an invalid response.")
  }
  if (payload.error) {
    const error = new ZcashRpcError(payload.error.message ?? "Zcash testnet RPC error.")
    Object.assign(error, { rpcCode: payload.error.code })
    throw error
  }
  if (payload.result === undefined) throw new ZcashRpcError("The configured Zcash testnet RPC omitted its result.")
  return payload.result
}

function toZat(value: number) {
  if (!Number.isFinite(value) || value < 0) return null
  const fixed = value.toFixed(8)
  const [whole, fraction = ""] = fixed.split(".")
  return BigInt(whole) * BigInt(ZAT_PER_ZEC) + BigInt(fraction.padEnd(8, "0"))
}

export async function createPaymentRequest(args: Omit<ZcashPaymentRequest, "version" | "recipient" | "amountZat" | "expiresAt">) {
  const settings = configuration()
  let decodedAddress
  try {
    const publicClient = await createPublicClient(settings.url, { network: "testnet" })
    decodedAddress = await addresses.decode({ network: publicClient.network, address: settings.recipient })
  } catch {
    throw new ZcashConfigurationError("ZCASH_TESTNET_T_ADDRESS must be a valid testnet transparent address.")
  }
  if (decodedAddress.knownReceivers.length === 0 || decodedAddress.knownReceivers.some(receiver => receiver !== "p2pkh" && receiver !== "p2sh")) {
    throw new ZcashConfigurationError("ZCASH_TESTNET_T_ADDRESS must be a valid testnet transparent address; shielded and unified addresses are not supported by this verifier.")
  }
  const roundedBaseAmount = Math.round((args.ticketPrice * args.quantity / settings.rate) * ZAT_PER_ZEC)
  if (!Number.isSafeInteger(roundedBaseAmount) || roundedBaseAmount <= 0) throw new ZcashConfigurationError("The ticket total and configured ZEC/INR rate do not produce a safe payment amount.")
  const baseAmountZat = BigInt(roundedBaseAmount)
  const maximumAmountZat = BigInt("2100000000000000")
  const uniqueSuffixRange = BigInt(99_999)
  if (baseAmountZat > maximumAmountZat - uniqueSuffixRange) throw new ZcashConfigurationError("The payment amount exceeds the Zcash network limit.")

  // Distinct satoshi suffixes let the server bind a public transaction to one request.
  const amountZat = (baseAmountZat + BigInt(randomInt(1, 99_999))).toString()
  const request: ZcashPaymentRequest = {
    ...args,
    version: 1,
    recipient: settings.recipient,
    amountZat,
    expiresAt: Date.now() + 30 * 60 * 1000,
  }
  return { request, token: signRequest(request), amountZec: formatZec(BigInt(amountZat)) }
}

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!key) throw new ZcashConfigurationError("Supabase server credentials are not configured for payment request signing.")
  return key
}

function signRequest(request: ZcashPaymentRequest) {
  const payload = Buffer.from(JSON.stringify(request)).toString("base64url")
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readPaymentRequest(token: string): ZcashPaymentRequest | null {
  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra) return null
  const expected = createHmac("sha256", signingKey()).update(payload).digest()
  let actual: Buffer
  try {
    actual = Buffer.from(signature, "base64url")
  } catch {
    return null
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const request = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ZcashPaymentRequest
    if (request.version !== 1 || !Number.isSafeInteger(request.eventId) || !Number.isSafeInteger(request.quantity) || request.quantity < 1 || request.quantity > 6 || !/^[0-9a-f-]{36}$/i.test(request.attendeeId) || !/^[0-9a-f-]{8}-[0-9a-f-]{4}-4[0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}$/i.test(request.requestKey) || !/^[0-9]{1,20}$/.test(request.amountZat) || !Number.isSafeInteger(request.expiresAt) || request.expiresAt < Date.now()) return null
    return request
  } catch {
    return null
  }
}

export function formatZec(amountZat: bigint) {
  const whole = amountZat / BigInt(ZAT_PER_ZEC)
  const fraction = (amountZat % BigInt(ZAT_PER_ZEC)).toString().padStart(8, "0").replace(/0+$/, "")
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export async function verifyTestnetPayment(txid: string, payment: ZcashPaymentRequest) {
  const chain = await rpc<{ chain?: string }>("getblockchaininfo", [])
  if (chain.chain !== "test") return { state: "failed" as const, message: "The configured Zcash node is not on testnet. No ticket was issued." }

  let transaction: VerboseTransaction
  try {
    transaction = await rpc<VerboseTransaction>("getrawtransaction", [txid, 1])
  } catch (error) {
    const rpcCode = (error as Error & { rpcCode?: number }).rpcCode
    if (rpcCode === -5) return { state: "pending" as const, message: "Transaction not found on testnet yet. Check the transaction ID and retry." }
    throw error
  }

  if (transaction.txid?.toLowerCase() !== txid.toLowerCase() || !Array.isArray(transaction.vout)) {
    return { state: "failed" as const, message: "The node returned a different or incomplete transaction. No ticket was issued." }
  }

  let receivedZat = BigInt(0)
  for (const output of transaction.vout) {
    const outputAddresses = [output.scriptPubKey?.address, ...(output.scriptPubKey?.addresses ?? [])].filter((value): value is string => typeof value === "string")
    if (outputAddresses.includes(payment.recipient)) {
      const value = typeof output.value === "number" ? toZat(output.value) : null
      if (value === null) return { state: "failed" as const, message: "The node returned an invalid output value. No ticket was issued." }
      receivedZat += value
    }
  }

  if (receivedZat !== BigInt(payment.amountZat)) {
    return { state: "failed" as const, message: "The transaction does not pay the exact amount to the configured testnet address. No ticket was issued." }
  }

  const confirmations = Number(transaction.confirmations ?? 0)
  if (!Number.isSafeInteger(confirmations) || confirmations < 1) {
    return { state: "pending" as const, confirmations: Math.max(0, confirmations || 0), message: "Payment is seen on testnet and awaiting its first confirmation. No ticket has been issued yet." }
  }

  return { state: "confirmed" as const, confirmations }
}
