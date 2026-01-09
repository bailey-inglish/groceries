'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getInventoryItemByUPC, scanOutItem } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import BarcodeScanner from '@/components/BarcodeScanner'
import Link from 'next/link'

export default function ScanOutPage() {
  const router = useRouter()
  const [scannedBarcode, setScannedBarcode] = useState<string>('')
  const [foundItem, setFoundItem] = useState<any>(null)
  const [addToList, setAddToList] = useState(true)
  const [showScanner, setShowScanner] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        router.replace('/')
        return
      }
    }

    checkAuth()
  }, [router])

  const handleBarcodeScanned = async (barcode: string) => {
    setScannedBarcode(barcode)
    setShowScanner(false)
    
    // Look up the item
    const item = await getInventoryItemByUPC(barcode)
    
    if (item) {
      setFoundItem(item)
      toast.success(`Found: ${item.name}`)
    } else {
      toast.error('Item not found in inventory')
      setFoundItem(null)
    }
  }

  const handleScanOut = async () => {
    if (!foundItem) {
      toast.error('No item selected')
      return
    }

    setLoading(true)

    const success = await scanOutItem(foundItem.id, addToList)

    setLoading(false)

    if (success) {
      const message = addToList 
        ? `${foundItem.name} marked as used and added to shopping list!`
        : `${foundItem.name} marked as used!`
      toast.success(message)
      
      // Reset
      setScannedBarcode('')
      setFoundItem(null)
      setAddToList(true)
      setShowScanner(true)
    } else {
      toast.error('Failed to scan out item')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="text-emerald-600 hover:text-emerald-700 font-medium">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Scan Out</h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Scanner */}
        {showScanner && (
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              onError={(error) => toast.error(error)}
            />
          </div>
        )}

        {/* Item Info & Actions */}
        {foundItem && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Item Found</h2>
            
            <div className="space-y-4">
              {/* Item Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xl font-bold text-gray-800 mb-2">{foundItem.name}</div>
                <div className="space-y-1 text-sm text-gray-600">
                  {foundItem.category && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Category:</span>
                      <span>{foundItem.category}</span>
                    </div>
                  )}
                  {foundItem.location && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Location:</span>
                      <span>{foundItem.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Quantity:</span>
                    <span>{foundItem.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Barcode:</span>
                    <span className="font-mono text-xs">{foundItem.upc}</span>
                  </div>
                </div>
              </div>

              {/* Add to Shopping List Option */}
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToList}
                    onChange={(e) => setAddToList(e.target.checked)}
                    className="mt-1 w-5 h-5 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-gray-800 mb-1">
                      Add to shopping list
                    </div>
                    <div className="text-sm text-gray-600">
                      Automatically add this item to your shopping list so you remember to buy it again
                    </div>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setScannedBarcode('')
                    setFoundItem(null)
                    setShowScanner(true)
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScanOut}
                  disabled={loading}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
                >
                  {loading ? 'Scanning Out...' : '✓ Scan Out'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item Not Found */}
        {scannedBarcode && !foundItem && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😕</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Item Not Found</h2>
              <p className="text-gray-600 mb-6">
                This barcode isn&apos;t in your inventory yet.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setScannedBarcode('')
                    setFoundItem(null)
                    setShowScanner(true)
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  Try Again
                </button>
                <Link
                  href="/scan-in"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg text-center transition-all"
                >
                  Add to Inventory
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {showScanner && !scannedBarcode && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
            <p className="text-sm text-orange-700">
              <span className="font-semibold">📤 Scan a barcode</span> to mark an item as used. We&apos;ll remove it from your inventory and optionally add it to your shopping list.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
