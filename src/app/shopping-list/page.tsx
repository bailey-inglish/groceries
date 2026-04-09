"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ShoppingCart,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Calendar,
} from "lucide-react"

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  isPurchased: boolean
  predictedRunOutDate?: string
  inventoryItem?: { name: string; location: string } | null
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [adding, setAdding] = useState(false)

  async function fetchItems() {
    const res = await fetch("/api/shopping-list")
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  async function handleAutoPopulate() {
    setRefreshing(true)
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPopulate: true }),
      })
      const data = await res.json()
      setItems(data.items || [])
    } finally {
      setRefreshing(false)
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim()) return

    setAdding(true)
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName.trim(), quantity: 1 }),
      })
      const data = await res.json()
      setItems((prev) => [data.item, ...prev])
      setNewItemName("")
    } finally {
      setAdding(false)
    }
  }

  async function togglePurchased(id: string, current: boolean) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isPurchased: !current } : i))
    )
    await fetch(`/api/shopping-list/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPurchased: !current }),
    })
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch(`/api/shopping-list/${id}`, { method: "DELETE" })
  }

  async function clearPurchased() {
    const purchased = items.filter((i) => i.isPurchased)
    setItems((prev) => prev.filter((i) => !i.isPurchased))
    await Promise.all(
      purchased.map((i) => fetch(`/api/shopping-list/${i.id}`, { method: "DELETE" }))
    )
  }

  const pendingItems = items.filter((i) => !i.isPurchased)
  const purchasedItems = items.filter((i) => i.isPurchased)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold">Shopping List</h1>
              {pendingItems.length > 0 && (
                <p className="text-xs text-muted-foreground">{pendingItems.length} items to buy</p>
              )}
            </div>
            <div className="flex gap-2">
              {purchasedItems.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearPurchased}
                  className="text-xs text-muted-foreground"
                >
                  Clear done
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoPopulate}
                disabled={refreshing}
                className="gap-1.5"
              >
                {refreshing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Update
              </Button>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2">
            <Input
              placeholder="Add item..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 h-10"
            />
            <Button type="submit" size="sm" disabled={!newItemName.trim() || adding} className="gap-1">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Your list is empty</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add items manually or auto-populate from your inventory
            </p>
            <Button onClick={handleAutoPopulate} disabled={refreshing} className="gap-2">
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Auto-populate from inventory
            </Button>
          </div>
        ) : (
          <>
            {pendingItems.length === 0 && purchasedItems.length > 0 && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🎉</div>
                <p className="font-semibold">All done!</p>
                <p className="text-sm text-muted-foreground">Everything is checked off</p>
              </div>
            )}

            {pendingItems.length > 0 && (
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <Card key={item.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={item.id}
                          checked={item.isPurchased}
                          onCheckedChange={() => togglePurchased(item.id, item.isPurchased)}
                          className="w-5 h-5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={item.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {item.name}
                          </label>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit}
                            </span>
                            {item.predictedRunOutDate && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 h-4">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(item.predictedRunOutDate).toLocaleDateString()}
                              </Badge>
                            )}
                            {item.inventoryItem && (
                              <Badge variant="secondary" className="text-xs h-4">
                                {item.inventoryItem.location.toLowerCase().replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {purchasedItems.length > 0 && (
              <div className="space-y-2 opacity-60">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  Purchased ({purchasedItems.length})
                </p>
                {purchasedItems.map((item) => (
                  <Card key={item.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={item.id}
                          checked={true}
                          onCheckedChange={() => togglePurchased(item.id, item.isPurchased)}
                          className="w-5 h-5 shrink-0"
                        />
                        <label
                          htmlFor={item.id}
                          className="text-sm font-medium cursor-pointer line-through flex-1"
                        >
                          {item.name}
                        </label>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
