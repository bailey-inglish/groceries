"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Plus,
  Package,
  Filter,
  SortAsc,
  Minus,
  Trash2,
  Clock,
} from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  brand?: string
  quantity: number
  unit: string
  location: string
  category?: string
  expirationDate?: string
  imageUrl?: string
  notes?: string
  updatedAt: string
}

const locationLabels: Record<string, string> = {
  FRIDGE: "Fridge",
  FREEZER: "Freezer",
  PANTRY: "Pantry",
  SPICE_RACK: "Spice Rack",
  COUNTER: "Counter",
  CELLAR: "Cellar",
  OTHER: "Other",
}

const locationColors: Record<string, string> = {
  FRIDGE: "bg-blue-100 text-blue-700",
  FREEZER: "bg-cyan-100 text-cyan-700",
  PANTRY: "bg-amber-100 text-amber-700",
  SPICE_RACK: "bg-orange-100 text-orange-700",
  COUNTER: "bg-purple-100 text-purple-700",
  CELLAR: "bg-stone-100 text-stone-700",
  OTHER: "bg-gray-100 text-gray-700",
}

function ItemCard({ item, onQuantityChange, onDelete }: {
  item: InventoryItem
  onQuantityChange: (id: string, delta: number) => void
  onDelete: (id: string) => void
}) {
  const isExpiringSoon = item.expirationDate && (() => {
    const days = Math.ceil((new Date(item.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days <= 7
  })()

  const daysUntilExpiry = item.expirationDate
    ? Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className={`border-0 shadow-sm ${isExpiringSoon ? "ring-1 ring-red-200" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {item.imageUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-primary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                aria-label="Delete item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`text-xs ${locationColors[item.location] || "bg-gray-100 text-gray-700"}`}>
                {locationLabels[item.location] || item.location}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="text-xs">{item.category.split(",")[0]}</Badge>
              )}
              {isExpiringSoon && daysUntilExpiry !== null && (
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysUntilExpiry <= 0 ? "Expired" : `${daysUntilExpiry}d`}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuantityChange(item.id, -1)}
                  disabled={item.quantity <= 0}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold min-w-[2.5rem] text-center">
                  {item.quantity} {item.unit}
                </span>
                <button
                  onClick={() => onQuantityChange(item.id, 1)}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
              </div>
              {item.expirationDate && !isExpiringSoon && (
                <span className="text-xs text-muted-foreground">
                  Exp: {new Date(item.expirationDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [sortBy, setSortBy] = useState("updatedAt")
  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (location) params.set("location", location)
    if (sortBy) params.set("sortBy", sortBy)

    const res = await fetch(`/api/inventory?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }, [search, location, sortBy])

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300)
    return () => clearTimeout(timer)
  }, [fetchItems])

  async function handleQuantityChange(id: string, delta: number) {
    const item = items.find((i) => i.id === id)
    if (!item) return

    const newQuantity = Math.max(0, item.quantity + delta)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: newQuantity } : i))

    await fetch(`/api/inventory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQuantity }),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Inventory</h1>
            <Link href="/scan">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <Select value={location || "all"} onValueChange={(v) => setLocation(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs w-auto gap-1 shrink-0">
              <Filter className="w-3 h-3" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {Object.entries(locationLabels).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 text-xs w-auto gap-1 shrink-0">
              <SortAsc className="w-3 h-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
              <SelectItem value="expirationDate">Expiry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-32 mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">
              {search || location ? "No items found" : "Your pantry is empty"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search || location ? "Try adjusting your filters" : "Start by scanning a product"}
            </p>
            <Link href="/scan">
              <Button>Scan your first item</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground px-1">{items.length} items</p>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
