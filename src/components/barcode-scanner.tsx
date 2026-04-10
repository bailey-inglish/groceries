"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
}

// ─── Native BarcodeDetector scanner ──────────────────────────────────────────

function NativeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lastCodeRef = useRef<string>("")
  const detectorRef = useRef<{ detect: (img: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> } | null>(null)
  const [status, setStatus] = useState<"loading" | "running" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  const detect = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) { rafRef.current = requestAnimationFrame(detect); return }

    ctx.drawImage(video, 0, 0)

    try {
      const barcodes = await detectorRef.current!.detect(canvas)
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue
        if (code && code !== lastCodeRef.current) {
          lastCodeRef.current = code
          onScan(code)
          // Debounce — wait 2 s before re-triggering the same code
          setTimeout(() => { lastCodeRef.current = "" }, 2000)
        }
      }
    } catch {
      // Detection errors are expected when no barcode is in frame
    }

    rafRef.current = requestAnimationFrame(detect)
  }, [onScan])

  useEffect(() => {
    let mounted = true

    // Create the BarcodeDetector instance once and reuse it across frames
    type BarcodeDetectorType = {
      detect: (img: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>>
    }
    type WindowWithBarcodeDetector = Window & {
      BarcodeDetector: new (opts: { formats: string[] }) => BarcodeDetectorType
    }
    detectorRef.current = new (window as unknown as WindowWithBarcodeDetector).BarcodeDetector({
      formats: [
        "ean_13", "ean_8", "upc_a", "upc_e",
        "code_39", "code_128", "qr_code", "data_matrix",
        "codabar", "itf",
      ],
    })

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (mounted) {
          setStatus("running")
          rafRef.current = requestAnimationFrame(detect)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera not available"
        if (mounted) { setErrorMsg(msg); setStatus("error") }
        onError?.(msg)
      }
    }

    start()

    return () => {
      mounted = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [detect, onError])

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
    <div className="relative w-full rounded-xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full object-cover"
        style={{ aspectRatio: "4/3" }}
        muted
        playsInline
      />
      {/* Hidden canvas for detection */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-56 h-32">
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br" />
          <div className="absolute left-1 right-1 top-1/2 h-0.5 bg-primary/80 animate-pulse" />
        </div>
      </div>

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-white">Starting camera…</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── html5-qrcode fallback scanner ───────────────────────────────────────────

function LegacyScanner({ onScan, onError }: BarcodeScannerProps) {
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
          "qr-reader-legacy",
          { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0, supportedScanTypes: [0] },
          false
        )
        scannerRef.current = scanner

        scanner.render(
          (decodedText: string) => { onScan(decodedText) },
          () => { /* normal no-barcode-in-frame errors — ignore */ }
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
        const s = scannerRef.current as { clear: () => Promise<void> }
        s.clear().catch(() => {})
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
      <div id="qr-reader-legacy" ref={containerRef} className="w-full rounded-xl overflow-hidden" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Starting camera…</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Exported wrapper — picks the right implementation ───────────────────────

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const [useNative, setUseNative] = useState(false)

  useEffect(() => {
    setUseNative("BarcodeDetector" in window)
  }, [])

  if (useNative) {
    return <NativeScanner onScan={onScan} onError={onError} />
  }
  return <LegacyScanner onScan={onScan} onError={onError} />
}
