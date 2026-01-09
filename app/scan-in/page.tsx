'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, scanInItem, getUserLocations, addUserLocation } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import BarcodeScanner from '@/components/BarcodeScanner'
import Link from 'next/link'

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

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode)
    setShowScanner(false)
    toast.success(`Scanned: ${barcode}`)
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="text-emerald-600 hover:text-emerald-700 font-medium">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Scan In</h1>
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

        {/* Form */}
        {scannedBarcode && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Item Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Barcode Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={scannedBarcode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScannedBarcode('')
                      setShowScanner(true)
                    }}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
                  >
                    Rescan
                  </button>
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Cheez-Its"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Snacks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                {!showLocationInput ? (
                  <div className="space-y-2">
                    <select
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select location...</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowLocationInput(true)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLocationInput(false)
                        setNewLocation('')
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
              >
                {loading ? 'Adding...' : '✓ Add to Inventory'}
              </button>
            </form>
          </div>
        )}

        {/* Help Text */}
        {showScanner && !scannedBarcode && (
          <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded">
            <p className="text-sm text-emerald-700">
              <span className="font-semibold">📷 Scan a barcode</span> to quickly add items to your inventory. Point your camera at the barcode and hold steady.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
