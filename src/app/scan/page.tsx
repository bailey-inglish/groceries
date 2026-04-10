"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useLocations } from "@/hooks/use-locations"
import {
  ScanLine,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  Keyboard,
  Camera,
  Info,
} from "lucide-react"

const BarcodeScanner = dynamic(() => import("@/components/barcode-scanner"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface ProductInfo {
  barcode: string
  name: string
  brand?: string
  category?: string
  imageUrl?: string
  packageSize?: number
  packageUnit?: string
}

type ScanMode = "camera" | "manual"
type ScanType = "SCAN_IN" | "SCAN_OUT"
type Stage = "scan" | "product" | "details" | "success" | "error"

export default function ScanPage() {
  const { locations } = useLocations()
  const defaultLocation = locations[0]?.slug || "PANTRY"

  const [mode, setMode] = useState<ScanMode>("camera")
  const [stage, setStage] = useState<Stage>("scan")
  const [manualBarcode, setManualBarcode] = useState("")
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [productLoading, setProductLoading] = useState(false)
  const [productError, setProductError] = useState("")
  const [scanType, setScanType] = useState<ScanType>("SCAN_IN")
  const [quantity, setQuantity] = useState("1")
  const [location, setLocation] = useState("")
  const [customName, setCustomName] = useState("")
  const [customBrand, setCustomBrand] = useState("")
  const [expirationDate, setExpirationDate] = useState("")
  const [packageSizeInput, setPackageSizeInput] = useState("")
  const [packageUnitInput, setPackageUnitInput] = useState("")
  const [showPackageSizePrompt, setShowPackageSizePrompt] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastScanned, setLastScanned] = useState("")

  // Set default location when locations load
  useEffect(() => {
    if (locations.length > 0 && !location) {
      setLocation(locations[0].slug)
    }
  }, [locations, location])

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (barcode === lastScanned) return
    setLastScanned(barcode)
    setProductLoading(true)
    setProductError("")
    setStage("product")

    try {
      // Check for user's UPC profile first (custom name overrides)
      const [productRes, profileRes] = await Promise.all([
        fetch(`/api/products/lookup?barcode=${encodeURIComponent(barcode)}`),
        fetch(`/api/upc-profiles?barcode=${encodeURIComponent(barcode)}`),
      ])

      let productData: ProductInfo = { barcode, name: "" }
      if (productRes.ok) {
        const data = await productRes.json()
        productData = { ...data.product, barcode }
      } else {
        setProductError("Product not found. Enter details manually.")
      }

      // UPCProfile wins over API data for name/brand
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData.profile) {
          productData.name = profileData.profile.customName
          if (profileData.profile.customBrand) productData.brand = profileData.profile.customBrand
          if (profileData.profile.packageSize) productData.packageSize = profileData.profile.packageSize
          if (profileData.profile.packageUnit) productData.packageUnit = profileData.profile.packageUnit
          if (profileData.profile.defaultLocation) setLocation(profileData.profile.defaultLocation)
        }
      }

      setProduct(productData)
      setCustomName(productData.name || "")
      setCustomBrand(productData.brand || "")

      if (productData.packageSize) {
        setPackageSizeInput(String(productData.packageSize))
        setPackageUnitInput(productData.packageUnit || "count")
      } else {
        // No package size — show the prompt after details form
        setShowPackageSizePrompt(true)
      }
    } catch {
      setProductError("Failed to look up product")
      setProduct({ barcode, name: "" })
    } finally {
      setProductLoading(false)
      setStage("details")
    }
  }, [lastScanned])

  const handleScan = useCallback((barcode: string) => {
    lookupBarcode(barcode)
  }, [lookupBarcode])

  async function handleSubmit() {
    if (!product || !customName.trim()) return

    setSubmitting(true)
    try {
      const barcode = product.barcode

      // Persist custom name/brand/package size in UPCProfile if barcode known
      if (barcode) {
        await fetch("/api/upc-profiles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode,
            customName: customName.trim(),
            customBrand: customBrand.trim() || undefined,
            defaultLocation: location,
            packageSize: packageSizeInput ? parseFloat(packageSizeInput) : undefined,
            packageUnit: packageUnitInput || undefined,
          }),
        })
      }

      if (scanType === "SCAN_OUT" && barcode) {
        // Find existing items with this barcode, sorted by expiration (FEFO)
        const searchRes = await fetch(`/api/inventory?barcode=${encodeURIComponent(barcode)}`)
        const searchData = await searchRes.json()
        const existing = (searchData.items || [])
          .filter((i: { barcode?: string }) => i.barcode === barcode)
          .sort((a: { expirationDate?: string }, b: { expirationDate?: string }) => {
            if (!a.expirationDate && !b.expirationDate) return 0
            if (!a.expirationDate) return 1
            if (!b.expirationDate) return -1
            return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
          })

        if (existing.length > 0) {
          // Deduct from the soonest-expiring item (FEFO)
          await fetch(`/api/inventory/${existing[0].id}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventType: "SCAN_OUT",
              quantityChange: parseFloat(quantity) || 1,
            }),
          })
          setStage("success")
          return
        }
      }

      // SCAN_IN — add new stack member with upcGroupId = barcode
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode,
          name: customName.trim(),
          brand: customBrand.trim() || product.brand,
          category: product.category,
          imageUrl: product.imageUrl,
          quantity: parseFloat(quantity) || 1,
          unit: packageUnitInput || "count",
          location: location || defaultLocation,
          expirationDate: expirationDate || undefined,
          packageSize: packageSizeInput ? parseFloat(packageSizeInput) : undefined,
          packageUnit: packageUnitInput || undefined,
          upcGroupId: barcode || undefined,
        }),
      })

      setStage("success")
    } catch {
      setStage("error")
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStage("scan")
    setProduct(null)
    setProductError("")
    setCustomName("")
    setCustomBrand("")
    setManualBarcode("")
    setQuantity("1")
    setExpirationDate("")
    setLastScanned("")
    setPackageSizeInput("")
    setPackageUnitInput("")
    setShowPackageSizePrompt(false)
  }

  if (stage === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {scanType === "SCAN_IN" ? "Item added!" : "Item updated!"}
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            {customName} has been {scanType === "SCAN_IN" ? "added to" : "removed from"} your inventory.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset} className="flex-1">Scan Another</Button>
            <Button variant="outline" onClick={() => window.location.href = "/inventory"} className="flex-1">
              View Inventory
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-8">Failed to save item. Please try again.</p>
          <Button onClick={reset} className="w-full">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold">Scan Product</h1>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => setScanType("SCAN_IN")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              scanType === "SCAN_IN"
                ? "bg-green-600 text-white"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            ↑ Scan In
          </button>
          <button
            onClick={() => setScanType("SCAN_OUT")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              scanType === "SCAN_OUT"
                ? "bg-red-600 text-white"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            ↓ Scan Out
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {(stage === "scan" || stage === "product") && (
          <>
            <div className="flex gap-2 bg-secondary rounded-lg p-1">
              <button
                onClick={() => setMode("camera")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "camera" ? "bg-white shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Camera className="w-4 h-4" />
                Camera
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "manual" ? "bg-white shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Keyboard className="w-4 h-4" />
                Manual
              </button>
            </div>

            {mode === "camera" ? (
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <BarcodeScanner onScan={handleScan} />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-sm">Barcode / UPC</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        placeholder="Enter barcode number..."
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        className="flex-1"
                        inputMode="numeric"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && manualBarcode) {
                            lookupBarcode(manualBarcode)
                          }
                        }}
                      />
                      <Button
                        onClick={() => manualBarcode && lookupBarcode(manualBarcode)}
                        disabled={!manualBarcode || productLoading}
                      >
                        {productLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look up"}
                      </Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">or</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setProduct({ barcode: "", name: "" })
                        setStage("details")
                      }}
                    >
                      Add item manually
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ScanLine className="w-4 h-4" />
                Point camera at barcode to scan automatically
              </div>
            </div>
          </>
        )}

        {stage === "details" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                {product?.imageUrl ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                    <Image src={product.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{product?.name || "New Item"}</div>
                  {product?.brand && (
                    <div className="text-xs font-normal text-muted-foreground">{product.brand}</div>
                  )}
                </div>
                {product?.barcode && (
                  <Badge variant="outline" className="text-xs shrink-0">{product.barcode}</Badge>
                )}
              </CardTitle>
              {productError && (
                <p className="text-xs text-yellow-600 mt-1">{productError}</p>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Item Name *</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Product name"
                  className="h-11"
                />
                {product?.barcode && (
                  <p className="text-xs text-muted-foreground">Custom names are saved per barcode for future scans</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Brand (optional)</Label>
                <Input
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="e.g. Heinz, Generic"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-11"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.slug} value={loc.slug}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Package size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    Package Size
                    {showPackageSizePrompt && !packageSizeInput && (
                      <Info className="w-3 h-3 text-amber-500" />
                    )}
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={packageSizeInput}
                    onChange={(e) => setPackageSizeInput(e.target.value)}
                    placeholder="e.g. 12"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input
                    value={packageUnitInput}
                    onChange={(e) => setPackageUnitInput(e.target.value)}
                    placeholder="count, g, ml, oz…"
                    className="h-11"
                  />
                </div>
              </div>
              {showPackageSizePrompt && !packageSizeInput && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  Adding package size helps track how much you have left (e.g. 12 eggs, 2 L, 500 g)
                </p>
              )}

              <div className="space-y-1.5">
                <Label>Expiration Date (optional)</Label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="h-11"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!customName.trim() || submitting}
                  className={`flex-1 ${scanType === "SCAN_OUT" ? "bg-red-600 hover:bg-red-700" : ""}`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    scanType === "SCAN_IN" ? "Add to Pantry" : "Remove from Pantry"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {productLoading && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
