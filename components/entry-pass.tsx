"use client"

import { useState } from "react"
import useSWR from "swr"
import QRCode from "qrcode"
import { QrCode } from "lucide-react"

type CredentialResponse = { credential: string; error?: string }

async function fetchCredential(url: string): Promise<CredentialResponse> {
  const response = await fetch(url, { cache: "no-store" })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? "Entry pass unavailable.")
  return data as CredentialResponse
}

export function EntryPass({ ticketId, initialCredential }: { ticketId: string; initialCredential?: string }) {
  const [visible, setVisible] = useState(Boolean(initialCredential))
  const { data, error, isLoading, mutate } = useSWR<CredentialResponse>(
    visible && !initialCredential ? `/api/entry/credential?ticketId=${encodeURIComponent(ticketId)}` : null,
    fetchCredential,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )
  const credential = initialCredential ?? data?.credential
  const { data: qrDataUrl } = useSWR(
    credential ? ["entry-qr", credential] as const : null,
    ([, value]) => QRCode.toDataURL(value, { width: 220, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1e241f", light: "#ffffff" } }),
  )

  if (!visible) return <button className="entry-pass-toggle" onClick={() => setVisible(true)}><QrCode size={15}/> Show verified entry pass</button>
  return <div className="entry-pass" aria-live="polite">
    {qrDataUrl ? <img src={qrDataUrl} alt="Single-use verified entry QR pass" width={176} height={176}/> : <div className="entry-pass-loading" role="status">{isLoading || (credential && !qrDataUrl) ? "Preparing secure pass…" : ""}</div>}
    <div><b>Verified entry pass</b><span>Show this one-time QR at the door.</span></div>
    {error && <p className="entry-pass-error" role="alert">{error.message}</p>}
    {error && <button className="text-link" onClick={() => void mutate()}>Try again</button>}
  </div>
}
