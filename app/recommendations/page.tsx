'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  getInventoryItems, 
  getPredictionData, 
  calculatePredictions,
  updateInventoryItem,
  type InventoryItem,
  type PredictionData 
} from '@/lib/supabase'

interface RecommendationItem extends InventoryItem {
  prediction?: PredictionData
  priority: 'high' | 'medium' | 'low'
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [confirmingItems, setConfirmingItems] = useState<Set<string>>(new Set())
  const [purchaseDialog, setPurchaseDialog] = useState<{itemId: string, itemName: string, unit: string} | null>(null)
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)

  useEffect(() => {
    loadRecommendations()
  }, [])

  async function loadRecommendations() {
    setLoading(true)
    
    const items = await getInventoryItems()
    const predictions = await getPredictionData()
    
    const predictionMap = new Map(predictions.map(p => [p.item_id, p]))
    
    const recommendationList: RecommendationItem[] = items
      .map(item => {
        const prediction = predictionMap.get(item.id)
        
        let priority: 'high' | 'medium' | 'low' = 'low'
        
        if (item.quantity === 0) {
          priority = 'high'
        } else if (item.quantity <= item.low_stock_threshold) {
          priority = 'high'
        } else if (prediction && prediction.days_until_restock <= 3) {
          priority = 'high'
        } else if (prediction && prediction.days_until_restock <= 7) {
          priority = 'medium'
        } else if (item.quantity <= item.low_stock_threshold * 2) {
          priority = 'medium'
        }
        
        return {
          ...item,
          prediction,
          priority
        }
      })
      .filter(item => 
        item.priority === 'high' || 
        item.priority === 'medium' ||
        item.quantity <= item.low_stock_threshold
      )
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        
        // Then by predicted days until restock
        const aDays = a.prediction?.days_until_restock ?? 999
        const bDays = b.prediction?.days_until_restock ?? 999
        return aDays - bDays
      })
    
    setRecommendations(recommendationList)
    setLoading(false)
  }

  async function handleCalculatePredictions() {
    setCalculating(true)
    await calculatePredictions()
    await loadRecommendations()
    setCalculating(false)
  }

  async function handleConfirmPurchase(itemId: string) {
    const item = recommendations.find(r => r.id === itemId)
    if (!item) return
    
    // Show dialog to ask for quantity
    setPurchaseDialog({ itemId, itemName: item.name, unit: item.unit })
    setPurchaseQuantity(1)
  }

  async function completePurchase() {
    if (!purchaseDialog) return
    
    setConfirmingItems(new Set(confirmingItems).add(purchaseDialog.itemId))
    
    const item = recommendations.find(r => r.id === purchaseDialog.itemId)
    if (!item) return
    
    // Update inventory
    await updateInventoryItem(purchaseDialog.itemId, {
      quantity: item.quantity + purchaseQuantity
    })
    
    setConfirmingItems(prev => {
      const next = new Set(prev)
      next.delete(purchaseDialog.itemId)
      return next
    })
    
    setPurchaseDialog(null)
    setPurchaseQuantity(1)
    await loadRecommendations()
  }

  function cancelPurchase() {
    setPurchaseDialog(null)
    setPurchaseQuantity(1)
  }

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Urgent</span>
      case 'medium':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Soon</span>
      case 'low':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Monitor</span>
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Shopping Recommendations</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Adaptive Learning</h2>
              <p className="text-sm text-gray-600 mt-1">
                Our algorithm learns your consumption patterns to predict when you&apos;ll need to restock.
              </p>
            </div>
            <button
              onClick={handleCalculatePredictions}
              disabled={calculating}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {calculating ? 'Calculating...' : 'Update Predictions'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-gray-500">Loading recommendations...</div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-xl font-semibold text-gray-800 mb-2">
              All Stocked Up!
            </div>
            <div className="text-gray-600">
              No items need restocking at this time.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    {recommendations.filter(r => r.priority === 'high').length} urgent items need attention
                  </p>
                </div>
              </div>
            </div>

            {recommendations.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.category} • UPC: {item.upc}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-sm text-gray-500">
                      Low stock: {item.low_stock_threshold} {item.unit}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Current Status</div>
                    <div className="text-lg text-gray-900">
                      {item.quantity === 0 ? (
                        <span className="text-red-600 font-semibold">Out of Stock</span>
                      ) : item.quantity <= item.low_stock_threshold ? (
                        <span className="text-yellow-600 font-semibold">Low Stock</span>
                      ) : (
                        <span className="text-green-600">In Stock</span>
                      )}
                    </div>
                  </div>

                  {item.prediction && (
                    <>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Predicted Restock In</div>
                        <div className="text-lg text-gray-900">
                          {item.prediction.days_until_restock} days
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Consumption Rate</div>
                        <div className="text-lg text-gray-900">
                          {item.prediction.average_consumption_rate.toFixed(2)} {item.unit}/day
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Confidence</div>
                        <div className="text-lg text-gray-900">
                          {(item.prediction.confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleConfirmPurchase(item.id)}
                    disabled={confirmingItems.has(item.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    {confirmingItems.has(item.id) ? 'Processing...' : 'Mark as Purchased'}
                  </button>
                  <Link
                    href="/scan"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg text-center transition-colors"
                  >
                    Scan to Add
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">1</div>
              <div>
                <strong>Track Usage:</strong> Every time you add or remove items, we log the change.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">2</div>
              <div>
                <strong>Learn Patterns:</strong> Our algorithm analyzes your consumption patterns over time.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">3</div>
              <div>
                <strong>Predict Needs:</strong> We predict when you&apos;ll run out based on your usage rate.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">4</div>
              <div>
                <strong>Smart Alerts:</strong> Get notified before you run out, so you can shop proactively.
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Confirmation Dialog */}
        {purchaseDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Confirm Purchase
              </h3>
              <p className="text-gray-600 mb-4">
                How many {purchaseDialog.unit} of {purchaseDialog.itemName} did you purchase?
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelPurchase}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={completePurchase}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
