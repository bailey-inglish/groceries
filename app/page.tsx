'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getInventoryItems, type InventoryItem } from '@/lib/supabase'

export default function Home() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    const data = await getInventoryItems()
    setItems(data || [])
    setLoading(false)
  }

  const lowStockItems = items.filter(item => 
    item.quantity <= (item.low_stock_threshold || 2)
  )

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">
          🛒 Groceries Inventory
        </h1>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Link
            href="/scan"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 text-center shadow-lg transition-all"
          >
            <div className="text-4xl mb-2">📷</div>
            <div className="text-xl font-semibold">Scan Item</div>
            <div className="text-sm opacity-90">Add or remove items</div>
          </Link>

          <Link
            href="/inventory"
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 text-center shadow-lg transition-all"
          >
            <div className="text-4xl mb-2">📦</div>
            <div className="text-xl font-semibold">Inventory</div>
            <div className="text-sm opacity-90">{items.length} items tracked</div>
          </Link>

          <Link
            href="/recommendations"
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-6 text-center shadow-lg transition-all"
          >
            <div className="text-4xl mb-2">🛍️</div>
            <div className="text-xl font-semibold">Shopping List</div>
            <div className="text-sm opacity-90">{lowStockItems.length} items needed</div>
          </Link>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Low stock alert!</span> {lowStockItems.length} {lowStockItems.length === 1 ? 'item needs' : 'items need'} restocking.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Recent Items</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items yet. Start by scanning your first item!
            </div>
          ) : (
            <div className="space-y-3">
              {items.slice(0, 5).map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.category} • UPC: {item.upc}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg text-gray-800">
                      {item.quantity} {item.unit}
                    </div>
                    {item.quantity <= (item.low_stock_threshold || 2) && (
                      <div className="text-xs text-yellow-600">Low stock</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
