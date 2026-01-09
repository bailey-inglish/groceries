'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getInventoryItems, updateInventoryItem, deleteInventoryItem, getUserLocations, type InventoryItem } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [locations, setLocations] = useState<string[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        router.replace('/')
        return
      }
      
      await loadData()
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.upc.includes(searchTerm) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (locationFilter) {
      filtered = filtered.filter(item => item.location === locationFilter)
    }

    setFilteredItems(filtered)
  }, [items, searchTerm, locationFilter])

  async function loadData() {
    setLoading(true)
    
    const [inventoryData, locationsData] = await Promise.all([
      getInventoryItems(),
      getUserLocations()
    ])
    
    setItems(inventoryData || [])
    setLocations(locationsData.map(l => l.location_name))
    setLoading(false)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem({ ...item })
  }

  const handleSave = async () => {
    if (!editingItem) return

    const result = await updateInventoryItem(editingItem.id, {
      name: editingItem.name,
      category: editingItem.category || null,
      location: editingItem.location || null,
      quantity: editingItem.quantity,
      notes: editingItem.notes || null
    })

    if (result) {
      toast.success('Item updated!')
      setEditingItem(null)
      await loadData()
    } else {
      toast.error('Failed to update item')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return

    const success = await deleteInventoryItem(id)

    if (success) {
      toast.success('Item deleted!')
      await loadData()
    } else {
      toast.error('Failed to delete item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/home" className="text-emerald-600 hover:text-emerald-700 font-medium">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Inventory</h1>
            <div className="w-16"></div>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mb-2"
          />

          {/* Location Filter */}
          {locations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{filteredItems.length}</div>
              <div className="text-sm text-gray-600">
                {searchTerm || locationFilter ? 'Filtered items' : 'Total items'}
              </div>
            </div>
            {(searchTerm || locationFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setLocationFilter('')
                }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              {searchTerm || locationFilter ? 'No items found' : 'No items yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchTerm || locationFilter 
                ? 'Try adjusting your filters' 
                : 'Start by scanning in your first item!'
              }
            </p>
            {!searchTerm && !locationFilter && (
              <Link
                href="/scan-in"
                className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Scan In Item
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg p-4">
                {editingItem?.id === item.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold"
                      placeholder="Item name"
                    />
                    <input
                      type="text"
                      value={editingItem.category || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Category"
                    />
                    <select
                      value={editingItem.location || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select location...</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={editingItem.quantity}
                      onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min="1"
                    />
                    <textarea
                      value={editingItem.notes || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Notes (optional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.category && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {item.category}
                            </span>
                          )}
                          {item.location && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              📍 {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600">{item.quantity}</div>
                        <div className="text-xs text-gray-500">{item.unit}</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      <div className="font-mono">{item.upc}</div>
                      <div>Added {new Date(item.scan_in_date).toLocaleDateString()}</div>
                      {item.notes && (
                        <div className="mt-1 text-gray-600 italic">&quot;{item.notes}&quot;</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg text-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
