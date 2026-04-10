"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  TrendingDown,
  AlertTriangle,
  Clock,
  ChefHat,
  RotateCcw,
  Search,
} from "lucide-react"

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  isPurchased: boolean
  predictedRunOutDate?: string
  reason?: string | null
  reasonDetail?: string | null
  barcode?: string | null
  inventoryItem?: { name: string; location: string } | null
}

interface SearchSuggestion {
  name: string
  brand?: string | null
  barcode?: string | null
  unit: string
  currentQuantity: number
}

function ReasonLabel({ reason, reasonDetail }: { reason?: string | null; reasonDetail?: string | null }) {
  if (!reason || reason === "MANUAL") return null

  const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    PREDICTED_LOW: {
      icon: <TrendingDown className="w-3 h-3" />,
      color: "text-amber-700",
      label: reasonDetail || "Running low",
    },
    EXPIRING_SOON: {
      icon: <AlertTriangle className="w-3 h-3" />,
      color: "text-red-600",
      label: reasonDetail || "Expiring soon",
    },
    MEAL_PLAN: {
      icon: <ChefHat className="w-3 h-3" />,
      color: "text-blue-600",
      label: reasonDetail || "For meal plan",
    },
    REFILL_REQUESTED: {
      icon: <RotateCcw className="w-3 h-3" />,
      color: "text-green-700",
      label: reasonDetail || "Refill requested",
    },
  }

  const c = config[reason]
  if (!c) return null

  return (
    <span className={`flex items-center gap-1 text-xs ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  )
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [adding, setAdding] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestion | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchItems() {
    const res = await fetch("/api/shopping-list")
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // Close autocomplete when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const handleSearchInput = useCallback((value: string) => {
    setNewItemName(value)
    setSelectedSuggestion(null)

    if (searchDebounce.current) clearTimeout(searchDebounce.current)

    if (value.trim().length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }

    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shopping-list/search?q=${encodeURIComponent(value.trim())}`)
        const data = await res.json()
        setSearchResults(data.results || [])
        setSearchOpen((data.results || []).length > 0)
      } catch {
        setSearchResults([])
      }
    }, 250)
  }, [])

  function selectSuggestion(suggestion: SearchSuggestion) {
    setSelectedSuggestion(suggestion)
    setNewItemName(suggestion.name)
    setSearchOpen(false)
  }

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
      const payload = selectedSuggestion
        ? {
            name: selectedSuggestion.name,
            quantity: 1,
            unit: selectedSuggestion.unit,
            barcode: selectedSuggestion.barcode,
            reason: "MANUAL",
          }
        : {
            name: newItemName.trim(),
            quantity: 1,
            reason: "MANUAL",
          }

      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setItems((prev) => [data.item, ...prev])
      setNewItemName("")
      setSelectedSuggestion(null)
      setSearchResults([])
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

          {/* Smart search + add form */}
          <div ref={searchRef} className="relative">
            <form onSubmit={handleAddItem} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search or add item..."
                  value={newItemName}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  className="pl-9 h-10"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" size="sm" disabled={!newItemName.trim() || adding} className="gap-1 h-10 px-3">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </form>

            {/* Autocomplete dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
                {searchResults.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(suggestion) }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left border-b last:border-0 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{suggestion.name}</p>
                      {suggestion.brand && (
                        <p className="text-xs text-muted-foreground">{suggestion.brand}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2 gap-0.5">
                      {suggestion.currentQuantity > 0 ? (
                        <Badge variant="outline" className="text-[10px] h-4 text-green-700 border-green-300">
                          {suggestion.currentQuantity} on hand
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">
                          out of stock
                        </Badge>
                      )}
                      {suggestion.barcode && (
                        <span className="text-[9px] text-muted-foreground/60">UPC linked</span>
                      )}
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setSearchOpen(false) }}
                  className="w-full px-4 py-2.5 text-xs text-muted-foreground hover:bg-gray-50 text-left border-t"
                >
                  Add &quot;{newItemName}&quot; as a custom item →
                </button>
              </div>
            )}
          </div>
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
              Add items manually or let us check your inventory
            </p>
            <Button onClick={handleAutoPopulate} disabled={refreshing} className="gap-2">
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Check inventory
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
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={item.isPurchased}
                          onCheckedChange={() => togglePurchased(item.id, item.isPurchased)}
                          className="w-5 h-5 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={item.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {item.name}
                          </label>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit}
                            </span>
                            {item.reason && item.reason !== "MANUAL" && (
                              <ReasonLabel reason={item.reason} reasonDetail={item.reasonDetail} />
                            )}
                            {item.inventoryItem && !item.reason && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {item.inventoryItem.location.toLowerCase().replace(/_/g, " ")}
                              </span>
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
                          id={`purchased-${item.id}`}
                          checked={true}
                          onCheckedChange={() => togglePurchased(item.id, item.isPurchased)}
                          className="w-5 h-5 shrink-0"
                        />
                        <label
                          htmlFor={`purchased-${item.id}`}
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
