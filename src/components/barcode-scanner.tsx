"use client"

import { useEffect, useRef, useState } from "react"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
}

type NativeBarcodeDetector = {
  detect: (source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas) => Promise<Array<{ rawValue: string }>>
}

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_39",
  "code_128",
  "codabar",
  "itf",
  "qr_code",
  "data_matrix",
]

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function NativeBarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<NativeBarcodeDetector | null>(null)
  const scanTimerRef = useRef<number | null>(null)
  const lastScanRef = useRef<string>("")
  const [status, setStatus] = useState<"loading" | "running" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    let active = true

    async function scanLoop() {
      if (!active) return

      const video = videoRef.current
      const detector = detectorRef.current

      if (!video || !detector || video.readyState < 2) {
        scanTimerRef.current = window.setTimeout(scanLoop, 180)
        return
      }

      try {
        const barcodes = await detector.detect(video)
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue.trim()
          if (code && code !== lastScanRef.current) {
            lastScanRef.current = code
            onScan(code)
            window.setTimeout(() => {
              if (lastScanRef.current === code) {
                lastScanRef.current = ""
              }
            }, 2000)
          }
        }
      } catch {
        // No barcode in frame or a transient detector failure.
      }

      if (active) {
        scanTimerRef.current = window.setTimeout(scanLoop, 180)
      }
    }

    async function startScanner() {
      try {
        if (!("mediaDevices" in navigator) || !("BarcodeDetector" in window)) {
          throw new Error("This browser does not support native barcode scanning.")
        }

        type BarcodeDetectorCtor = {
          new (options: { formats: string[] }): NativeBarcodeDetector
          getSupportedFormats?: () => Promise<string[]>
        }

        const Detector = (window as Window & { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector
        const supportedFormats = typeof Detector.getSupportedFormats === "function"
          ? await Detector.getSupportedFormats()
          : BARCODE_FORMATS
        const detectorFormats = BARCODE_FORMATS.filter((format) => supportedFormats.includes(format))
        detectorRef.current = new Detector({
          formats: detectorFormats.length > 0 ? detectorFormats : BARCODE_FORMATS,
        })

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (!active) {
          stopStream(stream)
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          throw new Error("Camera preview is unavailable.")
        }

        video.srcObject = stream
        await video.play()

        if (!active) return
        setStatus("running")
        scanLoop()
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera not available"
        if (active) {
          setErrorMsg(msg)
          setStatus("error")
        }
        onError?.(msg)
      }
    }

    startScanner()

    return () => {
      active = false
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current)
      }
      stopStream(streamRef.current)
      streamRef.current = null
      detectorRef.current = null
    }
  }, [onError, onScan])

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

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  return <NativeBarcodeScanner onScan={onScan} onError={onError} />
}
