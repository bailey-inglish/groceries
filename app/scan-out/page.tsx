'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getInventoryItemByUPC, scanOutItem } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import BarcodeScanner from '@/components/BarcodeScanner'
import Link from 'next/link'
import { ArrowLeft, Minus, X } from 'lucide-react'

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
      toast.success(`Found: ${item.name}`, { duration: 3000 })
    } else {
      toast.error('Item not found in inventory', { duration: 5000 })
      setFoundItem(null)
    }
  }

  const handleScanOut = async () => {
    if (!foundItem) {
      toast.error('No item selected', { duration: 5000 })
      return
    }

    setLoading(true)

    const success = await scanOutItem(foundItem.id, addToList)

    setLoading(false)

    if (success) {
      const message = addToList 
        ? `${foundItem.name} marked as used and added to shopping list!`
        : `${foundItem.name} marked as used!`
      toast.success(message, { duration: 3000 })
      
      // Reset
      setScannedBarcode('')
      setFoundItem(null)
      setAddToList(true)
      setShowScanner(true)
    } else {
      toast.error('Failed to scan out item', { duration: 5000 })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="bottom-right" />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/home" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900" title="Back to home">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Scan Out</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Scanner */}
        {showScanner && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <BarcodeScanner
                onScan={handleBarcodeScanned}
                onError={(error) => toast.error(error, { duration: 5000 })}
              />
            </div>

            {/* Help Text */}
            {!scannedBarcode && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 bg-orange-200 rounded-full">
                      <span className="text-xs font-semibold text-orange-600">−</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 font-semibold mb-1">Scan a barcode</p>
                    <p className="text-sm text-gray-700">
                      Mark an item as used. It&apos;ll be removed from inventory and optionally added to your shopping list.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Item Info & Actions */}
        {foundItem && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Item Found</h2>
              <button
                onClick={() => {
                  setScannedBarcode('')
                  setFoundItem(null)
                  setShowScanner(true)
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Item Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-lg font-semibold text-gray-900">{foundItem.name}</div>
                {foundItem.category && (
                  <div className="text-sm text-gray-600 mt-1">{foundItem.category}</div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {foundItem.location && (
                  <div>
                    <div className="text-gray-600">Location</div>
                    <div className="font-medium text-gray-900">{foundItem.location}</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-600">Quantity</div>
                  <div className="font-medium text-gray-900">{foundItem.quantity > 1 ? `${foundItem.quantity}x` : foundItem.quantity}</div>
                </div>
              </div>

              <div className="text-xs">
                <div className="text-gray-600">Barcode</div>
                <code className="font-mono text-gray-900">{foundItem.upc}</code>
              </div>
            </div>

            {/* Add to Shopping List Option */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToList}
                  onChange={(e) => setAddToList(e.target.checked)}
                  className="mt-1 w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Add to shopping list
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    Remember to buy this item again
                  </div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setScannedBarcode('')
                  setFoundItem(null)
                  setShowScanner(true)
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScanOut}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:bg-red-800 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    Marking...
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5" />
                    Mark as Used
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Item Not Found */}
        {scannedBarcode && !foundItem && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
              <X className="w-6 h-6 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Item Not Found</h2>
            <p className="text-gray-600 text-sm">
              This barcode isn&apos;t in your inventory yet.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setScannedBarcode('')
                  setFoundItem(null)
                  setShowScanner(true)
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/scan-in"
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg text-center transition-colors"
              >
                Add Item
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
