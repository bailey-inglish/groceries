'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getInventoryItems, getShoppingList, generateShoppingPredictions } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [inventoryCount, setInventoryCount] = useState(0)
  const [shoppingListCount, setShoppingListCount] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        router.replace('/')
        return
      }
      setUser(data.session.user)
      
      // Load counts
      const items = await getInventoryItems()
      setInventoryCount(items.length)
      
      // Generate predictions
      await generateShoppingPredictions()
      
      const shoppingList = await getShoppingList()
      setShoppingListCount(shoppingList.length)
      
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-3xl">🛒</span> Groceries
            </h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Actions */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4">
          {/* Scan In */}
          <Link
            href="/scan-in"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <div className="text-5xl mb-3">📥</div>
            <div className="text-lg font-bold text-gray-800">Scan In</div>
            <div className="text-xs text-gray-500 mt-1">Add new items</div>
          </Link>

          {/* Scan Out */}
          <Link
            href="/scan-out"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <div className="text-5xl mb-3">📤</div>
            <div className="text-lg font-bold text-gray-800">Scan Out</div>
            <div className="text-xs text-gray-500 mt-1">Mark as used</div>
          </Link>

          {/* View Inventory */}
          <Link
            href="/inventory"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <div className="text-5xl mb-3">📦</div>
            <div className="text-lg font-bold text-gray-800">Inventory</div>
            <div className="text-xs text-gray-500 mt-1">
              {inventoryCount} {inventoryCount === 1 ? 'item' : 'items'}
            </div>
          </Link>

          {/* Shopping List */}
          <Link
            href="/shopping-list"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center text-center min-h-[160px] relative"
          >
            <div className="text-5xl mb-3">🛍️</div>
            <div className="text-lg font-bold text-gray-800">Shopping List</div>
            <div className="text-xs text-gray-500 mt-1">
              {shoppingListCount} {shoppingListCount === 1 ? 'item' : 'items'}
            </div>
            {shoppingListCount > 0 && (
              <div className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {shoppingListCount}
              </div>
            )}
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Inventory</span>
              <span className="font-bold text-emerald-600">{inventoryCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Shopping List</span>
              <span className="font-bold text-orange-600">{shoppingListCount}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded">
          <p className="text-sm text-emerald-700">
            <span className="font-semibold">💡 Pro Tip:</span> Scan items in when you buy them and scan them out when you run out. The app will learn your usage patterns and suggest what to buy!
          </p>
        </div>
      </div>
    </div>
  )
}
