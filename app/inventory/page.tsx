'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getInventoryItems, updateInventoryItem, deleteInventoryItem, getUserLocations, type InventoryItem } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Search, Trash2, Edit2, Package } from 'lucide-react'

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
      notes: editingItem.notes || null
    })

    if (result) {
      toast.success('Item updated!', { duration: 3000 })
      setEditingItem(null)
      await loadData()
    } else {
      toast.error('Failed to update item', { duration: 5000 })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return

    const success = await deleteInventoryItem(id)

    if (success) {
      toast.success('Item deleted!', { duration: 3000 })
      await loadData()
    } else {
      toast.error('Failed to delete item', { duration: 5000 })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      <Toaster position="bottom-right" />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/home" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900" title="Back to home">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-500"
              />
            </div>

            {/* Location Filter */}
            {locations.length > 0 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900"
              >
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Count Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-600">{filteredItems.length}</div>
              <div className="text-sm text-gray-600 mt-1">
                {searchTerm || locationFilter ? 'Filtered items' : 'items'}
              </div>
            </div>
            {(searchTerm || locationFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setLocationFilter('')
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 hover:bg-blue-50 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchTerm || locationFilter ? 'No items found' : 'No items yet'}
            </h2>
            <p className="text-gray-600 text-sm">
              {searchTerm || locationFilter 
                ? 'Try adjusting your search' 
                : 'Scan in your first item to get started'
              }
            </p>
            {!searchTerm && !locationFilter && (
              <Link
                href="/scan-in"
                className="inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                Scan Item
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {editingItem?.id === item.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900"
                      placeholder="Item name"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editingItem.category || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      placeholder="Category"
                    />
                    <select
                      value={editingItem.location || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      min="1"
                    />
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        {item.category && (
                          <div className="text-sm text-gray-600 mt-1">{item.category}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {item.quantity > 1 ? `${item.quantity}x` : ''}
                        </div>
                      </div>
                    </div>

                    {item.location && (
                      <div className="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        📍 {item.location}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-1">
                      <div className="font-mono">{item.upc}</div>
                      <div>Added {new Date(item.scan_in_date).toLocaleDateString()}</div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="flex-1 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
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
