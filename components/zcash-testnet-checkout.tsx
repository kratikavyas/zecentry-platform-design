"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react"
import type { User } from "@supabase/supabase-js"

type TicketResult = {
  id: string
  recordId: string
  attendeeId: string
  eventId: number
  attendee: string
  email: string
  quantity: number
  totalAmount: number
  status: "Active"
  paymentMode: "zcash-testnet"
  paymentTxid: string
  paymentAmountZat: string
  network: "testnet"
}
type PaymentRequest = {
  token: string
  address: string
  amountZat: string
  amountZec: string
  uri: string
  expiresAt: number
  network: "testnet"
}

export function ZcashTestnetCheckout({
  eventId,
  eventTitle,
  attendeeName,
  quantity,
  user,
  onBack,
  onComplete,
}: {
  eventId: number
  eventTitle: string
  attendeeName: string
  quantity: number
  user: User
  onBack: () => void
  onComplete: (ticket: TicketResult) => Promise<void>
}) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null)
  const [txid, setTxid] = useState("")
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed" | "unavailable">("idle")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const createRequest = async () => {
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/zcash/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, attendeeName, quantity }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(response.status === 503 ? "unavailable" : "failed")
        setMessage(data.error ?? "Could not create a Zcash testnet payment request.")
        return
      }
      setPayment(data as PaymentRequest)
      setStatus("idle")
    } catch {
      setStatus("unavailable")
      setMessage("Could not reach the payment service. No payment request was created.")
    } finally {
      setBusy(false)
    }
  }

  const verifyPayment = async () => {
    if (!payment || busy) return
    setBusy(true)
    setStatus("pending")
    setMessage("Checking the transaction against the Zcash testnet node…")
    try {
      const response = await fetch("/api/zcash/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: payment.token, txid: txid.trim() }),
      })
      const data = await response.json()
      if (data.state === "confirmed" && data.ticket) {
        const ticket: TicketResult = data.ticket
        setStatus("confirmed")
        setMessage(`Confirmed on testnet with ${data.confirmations} confirmation${data.confirmations === 1 ? "" : "s"}. Ticket ${ticket.id} is ready.`)
        await onComplete(ticket)
        return
      }
      setStatus(data.state === "failed" ? "failed" : data.state === "unavailable" ? "unavailable" : "pending")
      setMessage(data.error ?? data.message ?? "Payment is still pending. Retry verification shortly.")
    } catch {
      setStatus("pending")
      setMessage("The verifier could not be reached. Payment is not confirmed; retry verification shortly.")
    } finally {
      setBusy(false)
    }
  }

  const copyAddress = async () => {
    if (!payment) return
    try {
      await navigator.clipboard.writeText(payment.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setMessage("Clipboard access is unavailable. Select and copy the address above.")
    }
  }

  return <div className="payment-demo zcash-checkout">
    <div className="demo-notice"><ShieldCheck size={16}/><span><b>ZCASH TESTNET</b> — Test coins only. This is not mainnet and has no monetary value.</span></div>
    <p className="modal-subtitle">{eventTitle} · {quantity} {quantity === 1 ? "ticket" : "tickets"} · {user.email}</p>
    {!payment ? <>
      <p className="zcash-instructions">Create a server-signed request for this event. The server verifies the network, exact recipient, exact amount, and confirmation before it asks Supabase to issue a ticket.</p>
      {message && <p className={`auth-message ${status === "unavailable" || status === "failed" ? "auth-error" : ""}`} role="status">{message}</p>}
      <button className="button button-dark buy-button" onClick={() => void createRequest()} disabled={busy}>{busy ? "Creating request…" : "Create testnet payment request"}</button>
    </> : <>
      <div className="zcash-payment-detail"><span>EXACT AMOUNT · TESTNET ZEC</span><b>{payment.amountZec} ZEC</b><small>Includes a unique amount for this payment request. Send exactly as shown.</small></div>
      <label className="form-label">Testnet receiving address<input value={payment.address} readOnly aria-label="Zcash testnet receiving address"/><button className="text-link zcash-copy" type="button" onClick={() => void copyAddress()}><Copy size={13}/>{copied ? "Copied" : "Copy address"}</button></label>
      <a className="button button-dark buy-button zcash-wallet-link" href={payment.uri}><ExternalLink size={15}/> Open in compatible wallet</a>
      <p className="zcash-instructions">Send the exact amount using a testnet wallet. Only a transparent testnet payment to this address can be verified with the configured public node. Request expires {new Date(payment.expiresAt).toLocaleTimeString()}.</p>
      <label className="form-label">Transaction ID<input value={txid} onChange={event => setTxid(event.target.value)} placeholder="64-character transaction ID" autoComplete="off" spellCheck={false} maxLength={64}/></label>
      <div className={`payment-state payment-state-${status}`} role="status" aria-live="polite"><span className={status === "pending" ? "pending-dot" : "payment-state-mark"}/><b>{status === "confirmed" ? "Confirmed" : status === "failed" ? "Failed" : status === "unavailable" ? "Unavailable" : "Pending"}</b>{message && <span>{message}</span>}</div>
      <button className="button button-green buy-button" onClick={() => void verifyPayment()} disabled={busy || txid.trim().length !== 64 || status === "confirmed"}>{busy ? "Verifying on testnet…" : "Verify payment"}</button>
    </>}
    <button className="modal-back" onClick={onBack}><ArrowLeft size={14}/> Back to payment options</button>
  </div>
}
