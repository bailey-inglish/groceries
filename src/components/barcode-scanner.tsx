"use client"

import { useEffect, useRef, useState } from "react"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<unknown>(null)
  const [status, setStatus] = useState<"loading" | "running" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    let mounted = true

    async function initScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode")

        if (!mounted || !containerRef.current) return

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            supportedScanTypes: [0], // only camera
          },
          false
        )

        scannerRef.current = scanner

        scanner.render(
          (decodedText: string) => {
            onScan(decodedText)
          },
          (errorMessage: string) => {
            // Scan errors are common and expected
            if (errorMessage.includes("No MultiFormat Readers")) {
              // normal, no barcode in frame
            }
          }
        )

        if (mounted) setStatus("running")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera not available"
        setErrorMsg(msg)
        setStatus("error")
        onError?.(msg)
      }
    }

    initScanner()

    return () => {
      mounted = false
      if (scannerRef.current) {
        const scanner = scannerRef.current as { clear: () => Promise<void> }
        scanner.clear().catch(() => {})
      }
    }
  }, [onScan, onError])

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-xl text-center">
        <div className="text-4xl mb-3">📷</div>
        <p className="text-sm font-medium text-gray-700">Camera unavailable</p>
        <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden"
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        </div>
      )}
    </div>
  )
}
