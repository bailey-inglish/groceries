'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, scanInItem, getUserLocations, addUserLocation, lookupUPC } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import BarcodeScanner from '@/components/BarcodeScanner'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'

export default function ScanInPage() {
  const router = useRouter()
  const [scannedBarcode, setScannedBarcode] = useState<string>('')
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [showScanner, setShowScanner] = useState(true)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<string[]>([])
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [newLocation, setNewLocation] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        router.replace('/')
        return
      }
      
      // Load user locations
      const userLocations = await getUserLocations()
      setLocations(userLocations.map(l => l.location_name))
      
      // Set default location if available
      if (userLocations.length > 0) {
        setLocation(userLocations[0].location_name)
      }
    }

    checkAuth()
  }, [router])

  const handleBarcodeScanned = async (barcode: string) => {
    setScannedBarcode(barcode)
    setShowScanner(false)
    toast.success(`Scanned: ${barcode}`)
    
    // Try to look up product info automatically
    toast.loading('Looking up product info...')
    const productInfo = await lookupUPC(barcode)
    
    if (productInfo.name) {
      setItemName(productInfo.name)
      toast.success(`Found: ${productInfo.name}`)
    } else {
      toast.info('Product not found in database. Please enter name manually.')
    }
    
    if (productInfo.category) {
      setCategory(productInfo.category)
    }
  }

  const handleAddLocation = async () => {
    if (!newLocation.trim()) {
      toast.error('Please enter a location name')
      return
    }

    const result = await addUserLocation(newLocation.trim())
    if (result) {
      setLocations([...locations, newLocation.trim()])
      setLocation(newLocation.trim())
      setNewLocation('')
      setShowLocationInput(false)
      toast.success('Location added!')
    } else {
      toast.error('Failed to add location')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!scannedBarcode) {
      toast.error('Please scan a barcode first')
      return
    }

    if (!itemName.trim()) {
      toast.error('Please enter an item name')
      return
    }

    setLoading(true)

    const result = await scanInItem(
      scannedBarcode,
      itemName.trim(),
      category.trim() || null,
      location.trim() || null,
      quantity
    )

    setLoading(false)

    if (result) {
      toast.success(`${itemName} added to inventory!`)
      
      // Reset form
      setScannedBarcode('')
      setItemName('')
      setCategory('')
      setQuantity(1)
      setShowScanner(true)
    } else {
      toast.error('Failed to add item')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/home" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900" title="Back to home">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Scan In</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Scanner Section */}
        {showScanner && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <BarcodeScanner
                onScan={handleBarcodeScanned}
                onError={(error) => toast.error(error)}
              />
            </div>
            
            {/* Help Text */}
            {!scannedBarcode && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-200 rounded-full">
                      <span className="text-xs font-semibold text-blue-600">📷</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 font-semibold mb-1">Scan a barcode</p>
                    <p className="text-sm text-gray-700">
                      Point your camera at any product barcode to add it to inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {scannedBarcode && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900">Item Details</h2>
              <button
                onClick={() => {
                  setScannedBarcode('')
                  setShowScanner(true)
                  setItemName('')
                  setCategory('')
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900"
                title="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Barcode Display */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Barcode
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-sm font-mono">
                    {scannedBarcode}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedBarcode('')
                      setShowScanner(true)
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors"
                  >
                    Rescan
                  </button>
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-semibold text-gray-900 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Cheez-Its"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-900 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Snacks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-900 mb-2">
                  Location
                </label>
                {!showLocationInput ? (
                  <div className="space-y-2">
                    <select
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Select location...</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowLocationInput(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add new location
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g., Pantry, Fridge"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLocationInput(false)
                        setNewLocation('')
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-900 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-semibold text-gray-900 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to Inventory
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
