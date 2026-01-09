'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getInventoryItems, getShoppingList, generateShoppingPredictions } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'
import { ShoppingCart, Plus, Minus, List, Package, LogOut } from 'lucide-react'

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">EasyGroceries</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            title="Sign out"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Main Actions Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Scan In */}
          <Link
            href="/scan-in"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all active:scale-95 flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <div className="font-semibold text-gray-900">Scan In</div>
            <div className="text-xs text-gray-500 mt-1">Add items</div>
          </Link>

          {/* Scan Out */}
          <Link
            href="/scan-out"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all active:scale-95 flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
              <Minus className="w-6 h-6 text-orange-600" />
            </div>
            <div className="font-semibold text-gray-900">Scan Out</div>
            <div className="text-xs text-gray-500 mt-1">Mark used</div>
          </Link>

          {/* View Inventory */}
          <Link
            href="/inventory"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all active:scale-95 flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="font-semibold text-gray-900">Inventory</div>
            <div className="text-xs text-gray-500 mt-1">
              {inventoryCount} {inventoryCount === 1 ? 'item' : 'items'}
            </div>
          </Link>

          {/* Shopping List */}
          <Link
            href="/shopping-list"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all active:scale-95 flex flex-col items-center justify-center text-center relative"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
              <List className="w-6 h-6 text-purple-600" />
            </div>
            <div className="font-semibold text-gray-900">Shopping List</div>
            <div className="text-xs text-gray-500 mt-1">
              {shoppingListCount} {shoppingListCount === 1 ? 'item' : 'items'}
            </div>
            {shoppingListCount > 0 && (
              <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {shoppingListCount}
              </div>
            )}
          </Link>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{inventoryCount}</div>
              <div className="text-xs text-gray-600 mt-1">In stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{shoppingListCount}</div>
              <div className="text-xs text-gray-600 mt-1">To buy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">—</div>
              <div className="text-xs text-gray-600 mt-1">Streak</div>
            </div>
          </div>
        </div>

        {/* Tip Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-6 h-6 bg-blue-200 rounded-full">
                <span className="text-xs font-semibold text-blue-600">💡</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-semibold mb-1">Pro tip</p>
              <p className="text-sm text-gray-700">
                Scan items when you buy them and when you run out. The app learns your patterns and suggests what to buy next.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
