"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserQRCodeReader } from "@zxing/browser"
import { Camera, CameraOff } from "lucide-react"

export function EntryQrScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const [active, setActive] = useState(false)
  const [error, setError] = useState("")
  onScanRef.current = onScan

  useEffect(() => {
    if (!active || !videoRef.current) return
    const reader = new BrowserQRCodeReader()
    let stop: (() => void) | undefined
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _error, controls) => {
      stop = () => controls.stop()
      if (!result) return
      stop()
      setActive(false)
      onScanRef.current(result.getText())
    }).then(controls => {
      stop = () => controls.stop()
    }).catch(() => {
      setError("Camera access is unavailable. Check browser permissions or enter the pass credential manually.")
      setActive(false)
    })
    return () => stop?.()
  }, [active])

  return <div className="entry-scanner">
    {active && <video ref={videoRef} muted playsInline aria-label="Camera scanning for a verified entry QR"/>}
    {!active && <div className="entry-scanner-ready"><Camera size={25}/><span>Scan a verified entry pass</span></div>}
    <button className="entry-scan-button" onClick={() => { setError(""); setActive(value => !value) }}>
      {active ? <CameraOff size={15}/> : <Camera size={15}/>}{active ? "Stop camera" : "Start camera scanner"}
    </button>
    {error && <p role="alert" className="entry-pass-error">{error}</p>}
  </div>
}
