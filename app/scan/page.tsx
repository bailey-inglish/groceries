'use client'

import { useState } from 'react'
import Link from 'next/link'
import BarcodeScanner from '@/components/BarcodeScanner'
import { 
  getInventoryItemByUPC, 
  createInventoryItem, 
  updateItemQuantity,
  type InventoryItem 
} from '@/lib/supabase'

export default function ScanPage() {
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null)
  const [manualUPC, setManualUPC] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [action, setAction] = useState<'add' | 'remove'>('add')
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: '',
    unit: 'count',
    low_stock_threshold: 2
  })
  const [showNewItemForm, setShowNewItemForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleScan = async (upc: string) => {
    setMessage(null)
    const item = await getInventoryItemByUPC(upc)
    
    if (item) {
      setScannedItem(item)
      setShowNewItemForm(false)
    } else {
      setManualUPC(upc)
      setShowNewItemForm(true)
      setMessage({ type: 'error', text: 'Item not found. Please add item details below.' })
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualUPC) return
    
    await handleScan(manualUPC)
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!newItemForm.name || !manualUPC) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    const newItem = await createInventoryItem({
      upc: manualUPC,
      name: newItemForm.name,
      category: newItemForm.category || 'Uncategorized',
      quantity: quantity,
      unit: newItemForm.unit,
      low_stock_threshold: newItemForm.low_stock_threshold
    })

    if (newItem) {
      setScannedItem(newItem)
      setShowNewItemForm(false)
      setManualUPC('')
      setNewItemForm({ name: '', category: '', unit: 'count', low_stock_threshold: 2 })
      setMessage({ type: 'success', text: 'Item created successfully!' })
    } else {
      setMessage({ type: 'error', text: 'Failed to create item' })
    }
  }

  const handleUpdateQuantity = async () => {
    if (!scannedItem) return
    setMessage(null)

    const quantityChange = action === 'add' ? quantity : -quantity
    const updatedItem = await updateItemQuantity(scannedItem.id, quantityChange, action)

    if (updatedItem) {
      setScannedItem(updatedItem)
      setMessage({ 
        type: 'success', 
        text: `Successfully ${action === 'add' ? 'added' : 'removed'} ${quantity} ${scannedItem.unit}` 
      })
      setQuantity(1)
    } else {
      setMessage({ type: 'error', text: 'Failed to update quantity' })
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Scan Item</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back
          </Link>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Scanner</h2>
          <BarcodeScanner onScan={handleScan} />
          
          <div className="mt-4">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualUPC}
                onChange={(e) => setManualUPC(e.target.value)}
                placeholder="Or enter UPC manually"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Lookup
              </button>
            </form>
          </div>
        </div>

        {showNewItemForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Item</h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPC
                </label>
                <input
                  type="text"
                  value={manualUPC}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  placeholder="e.g., Eggs, Milk, Bread"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Produce">Produce</option>
                  <option value="Meat">Meat</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Household">Household</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="count">Count</option>
                    <option value="bottles">Bottles</option>
                    <option value="boxes">Boxes</option>
                    <option value="cans">Cans</option>
                    <option value="lbs">Lbs</option>
                    <option value="oz">Oz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItemForm.low_stock_threshold}
                  onChange={(e) => setNewItemForm({ ...newItemForm, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Create Item
              </button>
            </form>
          </div>
        )}

        {scannedItem && !showNewItemForm && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Item Details</h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{scannedItem.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>Category: {scannedItem.category}</div>
                <div>UPC: {scannedItem.upc}</div>
                <div>Current Stock: {scannedItem.quantity} {scannedItem.unit}</div>
                <div>Low Stock Alert: {scannedItem.low_stock_threshold} {scannedItem.unit}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAction('add')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      action === 'add' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Add Stock
                  </button>
                  <button
                    onClick={() => setAction('remove')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      action === 'remove' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Remove Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleUpdateQuantity}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {action === 'add' ? 'Add to' : 'Remove from'} Inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
