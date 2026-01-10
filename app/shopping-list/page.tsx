'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  supabase, 
  getShoppingList, 
  convertSuggestionToDefinite, 
  markShoppingItemPurchased,
  removeFromShoppingList,
  addToShoppingListDefinite,
  generateShoppingPredictions,
  type ShoppingListItem 
} from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

export default function ShoppingListPage() {
  const router = useRouter()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        router.replace('/')
        return
      }
      
      await runPredictionsAndLoad()
    }

    checkAuth()
  }, [router])

  async function loadData() {
    setLoading(true)
    const data = await getShoppingList()
    setItems(data || [])
    setLoading(false)
  }

  async function runPredictionsAndLoad() {
    setRefreshing(true)
    toast.info('Analyzing your usage patterns...', { duration: 2000 })
    await generateShoppingPredictions()
    await loadData()
    setRefreshing(false)
    toast.success('Shopping list updated!', { duration: 3000 })
  }

  async function handleAddToDefinite(id: string) {
    const success = await convertSuggestionToDefinite(id)
    if (success) {
      toast.success('Added to your list!', { duration: 3000 })
      await loadData()
    } else {
      toast.error('Failed to add item', { duration: 5000 })
    }
  }

  async function handleMarkPurchased(id: string, name: string) {
    const success = await markShoppingItemPurchased(id)
    if (success) {
      toast.success(`${name} marked as purchased!`, { duration: 3000 })
      await loadData()
    } else {
      toast.error('Failed to mark as purchased', { duration: 5000 })
    }
  }

  async function handleRemove(id: string) {
    const success = await removeFromShoppingList(id)
    if (success) {
      toast.success('Item removed', { duration: 3000 })
      await loadData()
    } else {
      toast.error('Failed to remove item', { duration: 5000 })
    }
  }

  async function handleAddManualItem() {
    if (!newItemName.trim()) {
      toast.error('Please enter an item name', { duration: 5000 })
      return
    }

    const result = await addToShoppingListDefinite(
      newItemName.trim(),
      null,
      newItemCategory.trim() || null,
      1
    )

    if (result) {
      toast.success('Item added!', { duration: 3000 })
      setNewItemName('')
      setNewItemCategory('')
      setShowAddManual(false)
      await loadData()
    } else {
      toast.error('Failed to add item', { duration: 5000 })
    }
  }

  const definiteItems = items.filter(item => !item.is_suggested)
  const suggestedItems = items.filter(item => item.is_suggested)

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
      <Toaster position="bottom-right" />
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/home" className="text-emerald-600 hover:text-emerald-700 font-medium">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Shopping List</h1>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              {refreshing ? 'Updating…' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-orange-600">{definiteItems.length}</div>
              <div className="text-sm text-gray-600">On your list</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{suggestedItems.length}</div>
              <div className="text-sm text-gray-600">Suggestions</div>
            </div>
          </div>
        </div>

        {/* Add Manual Item Button */}
        {!showAddManual && (
          <button
            onClick={() => setShowAddManual(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
          >
            + Add Item Manually
          </button>
        )}

        {/* Add Manual Item Form */}
        {showAddManual && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Add Item</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                autoFocus
              />
              <input
                type="text"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="Category (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddManual(false)
                    setNewItemName('')
                    setNewItemCategory('')
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddManualItem}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Definite Items */}
        {definiteItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Your Shopping List</h2>
            <div className="space-y-3">
              {definiteItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{item.item_name}</h3>
                      {item.category && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">{item.quantity > 1 ? `${item.quantity}x` : ''}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkPurchased(item.id, item.item_name)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg text-sm"
                    >
                      ✓ Purchased
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-3 rounded-lg text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Items */}
        {suggestedItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Suggestions</h2>
            <p className="text-sm text-gray-600 mb-3">
              Based on your usage patterns, you might need these soon:
            </p>
            <div className="space-y-3">
              {suggestedItems.map((item) => (
                <div key={item.id} className="bg-blue-50 border-l-4 border-blue-400 rounded-xl shadow p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{item.item_name}</h3>
                      <div className="text-xs text-gray-600 mt-1">
                        {item.average_days_between_purchases && (
                          <div>
                            Usually buy every {Math.round(item.average_days_between_purchases)} days
                          </div>
                        )}
                        {item.prediction_confidence && (
                          <div className="flex items-center gap-1 mt-1">
                            <span>Confidence:</span>
                            <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${item.prediction_confidence * 100}%` }}
                              ></div>
                            </div>
                            <span>{Math.round(item.prediction_confidence * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToDefinite(item.id)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg text-sm"
                    >
                      + Add to List
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-3 rounded-lg text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🛍️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">No items yet</h2>
            <p className="text-gray-600 mb-6">
              Scan out items to automatically build your shopping list, or add items manually.
            </p>
            <div className="flex gap-3">
              <Link
                href="/scan-out"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg text-center"
              >
                Scan Out
              </Link>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">💡 How it works:</span> The app learns your shopping habits. After scanning items in and out a few times, it will predict when you&apos;ll need to restock!
          </p>
        </div>
      </div>
    </div>
  )
}
