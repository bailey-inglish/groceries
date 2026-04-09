"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocations } from "@/hooks/use-locations"
import {
  Search,
  Plus,
  Package,
  Filter,
  SortAsc,
  Minus,
  Trash2,
  Clock,
  Pencil,
  Loader2,
  ToggleLeft,
  ToggleRight,
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
  packageSize?: number
  packageUnit?: string
  isOpened?: boolean
  upcGroupId?: string
  barcode?: string
  updatedAt: string
}

interface EditForm {
  name: string
  brand: string
  quantity: string
  unit: string
  location: string
  expirationDate: string
  notes: string
  packageSize: string
  packageUnit: string
  isOpened: boolean
  usePercentage: boolean
  percentage: number
}

function ItemCard({
  item,
  onQuantityChange,
  onDelete,
  onEdit,
  getColor,
  getLabel,
}: {
  item: InventoryItem
  onQuantityChange: (id: string, delta: number) => void
  onDelete: (id: string) => void
  onEdit: (item: InventoryItem) => void
  getColor: (slug: string) => string
  getLabel: (slug: string) => string
}) {
  const isExpiringSoon = item.expirationDate && (() => {
    const days = Math.ceil((new Date(item.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days <= 7
  })()

  const daysUntilExpiry = item.expirationDate
    ? Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const fillPct =
    item.packageSize && item.packageSize > 0
      ? Math.min(100, Math.round((item.quantity / item.packageSize) * 100))
      : null

  return (
    <Card
      className={`border-0 shadow-sm ${isExpiringSoon ? "ring-1 ring-red-200" : ""}`}
      onClick={() => onEdit(item)}
      style={{ cursor: "pointer" }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {item.imageUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="48px" />
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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(item) }}
                  className="text-muted-foreground hover:text-primary transition-colors p-1"
                  aria-label="Edit item"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`text-xs ${getColor(item.location)}`}>
                {getLabel(item.location)}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="text-xs">{item.category.split(",")[0]}</Badge>
              )}
              {item.isOpened && (
                <Badge variant="secondary" className="text-xs">Opened</Badge>
              )}
              {isExpiringSoon && daysUntilExpiry !== null && (
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysUntilExpiry <= 0 ? "Expired" : `${daysUntilExpiry}d`}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onQuantityChange(item.id, -1)}
                  disabled={item.quantity <= 0}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold min-w-[2.5rem] text-center">
                  {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
                </span>
                <button
                  onClick={() => onQuantityChange(item.id, 1)}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {fillPct !== null && (
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${fillPct <= 15 ? "bg-red-500" : fillPct <= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{fillPct}%</span>
                  </div>
                )}
                {item.expirationDate && !isExpiringSoon && (
                  <span className="text-xs text-muted-foreground">
                    Exp: {new Date(item.expirationDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EditSheet({
  item,
  open,
  onClose,
  onSave,
  onDelete,
  locations,
}: {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
  onSave: (id: string, data: Partial<InventoryItem>) => Promise<void>
  onDelete: (id: string) => void
  locations: { slug: string; name: string }[]
}) {
  const [form, setForm] = useState<EditForm>({
    name: "",
    brand: "",
    quantity: "1",
    unit: "count",
    location: "PANTRY",
    expirationDate: "",
    notes: "",
    packageSize: "",
    packageUnit: "",
    isOpened: false,
    usePercentage: false,
    percentage: 100,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      const pct =
        item.packageSize && item.packageSize > 0
          ? Math.round((item.quantity / item.packageSize) * 100)
          : 100
      setForm({
        name: item.name,
        brand: item.brand || "",
        quantity: String(item.quantity),
        unit: item.unit,
        location: item.location,
        expirationDate: item.expirationDate ? item.expirationDate.split("T")[0] : "",
        notes: item.notes || "",
        packageSize: item.packageSize ? String(item.packageSize) : "",
        packageUnit: item.packageUnit || item.unit,
        isOpened: item.isOpened || false,
        usePercentage: false,
        percentage: pct,
      })
    }
  }, [item])

  function handlePercentageChange(pct: number) {
    const packageSize = parseFloat(form.packageSize)
    if (packageSize > 0) {
      const qty = (pct / 100) * packageSize
      setForm((prev) => ({ ...prev, percentage: pct, quantity: String(qty.toFixed(2)) }))
    } else {
      setForm((prev) => ({ ...prev, percentage: pct }))
    }
  }

  async function handleSave() {
    if (!item) return
    setSaving(true)
    try {
      const qty = parseFloat(form.quantity)
      await onSave(item.id, {
        name: form.name,
        brand: form.brand || undefined,
        quantity: isNaN(qty) ? item.quantity : qty,
        unit: form.unit,
        location: form.location,
        expirationDate: form.expirationDate || undefined,
        notes: form.notes || undefined,
        packageSize: form.packageSize ? parseFloat(form.packageSize) : undefined,
        packageUnit: form.packageUnit || undefined,
        isOpened: form.isOpened,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader className="pt-2 pb-4">
          <SheetTitle>Edit Item</SheetTitle>
        </SheetHeader>

        <div className="px-4 space-y-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Optional"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.slug} value={loc.slug}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Package Size</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.packageSize}
                onChange={(e) => setForm({ ...form, packageSize: e.target.value })}
                placeholder="e.g. 12"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Package Unit</Label>
              <Input
                value={form.packageUnit}
                onChange={(e) => setForm({ ...form, packageUnit: e.target.value })}
                placeholder="e.g. count, g, ml"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quantity On Hand</Label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, usePercentage: !prev.usePercentage }))}
                className="flex items-center gap-1 text-xs text-primary"
              >
                {form.usePercentage ? (
                  <><ToggleRight className="w-4 h-4" /> % mode</>
                ) : (
                  <><ToggleLeft className="w-4 h-4" /> % mode</>
                )}
              </button>
            </div>

            {form.usePercentage ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[form.percentage]}
                    onValueChange={([v]) => handlePercentageChange(v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold min-w-[3rem] text-right">{form.percentage}%</span>
                </div>
                {form.packageSize && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {parseFloat(form.quantity).toFixed(2)} {form.packageUnit || form.unit} of {form.packageSize} {form.packageUnit || form.unit}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="h-11 flex-1"
                  inputMode="decimal"
                />
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="unit"
                  className="h-11 w-24"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Opened?</Label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isOpened: !prev.isOpened }))}
                className={`h-11 w-full rounded-lg border-2 text-sm font-medium transition-colors ${
                  form.isOpened ? "border-primary bg-primary/5 text-primary" : "border-input bg-background"
                }`}
              >
                {form.isOpened ? "✓ Opened" : "Not opened"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="h-11"
            />
          </div>
        </div>

        <SheetFooter className="px-4 pt-4 pb-6 gap-3">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => { onDelete(item.id); onClose() }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const { locations, loading: locLoading, getColor, getLabel } = useLocations()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [sortBy, setSortBy] = useState("updatedAt")
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [editOpen, setEditOpen] = useState(false)

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

  async function handleSave(id: string, data: Partial<InventoryItem>) {
    const payload: Record<string, unknown> = { ...data }
    if (!payload.expirationDate) payload.expirationDate = null

    const res = await fetch(`/api/inventory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...updated.item } : i))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return
    setItems((prev) => prev.filter((i) => i.id !== id))
    setEditOpen(false)
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })
  }

  function handleEdit(item: InventoryItem) {
    setEditItem(item)
    setEditOpen(true)
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
              {locations.map((loc) => (
                <SelectItem key={loc.slug} value={loc.slug}>{loc.name}</SelectItem>
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
        {loading || locLoading ? (
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
            <p className="text-xs text-muted-foreground px-1">{items.length} items — tap to edit</p>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
                onDelete={handleDelete}
                onEdit={handleEdit}
                getColor={getColor}
                getLabel={getLabel}
              />
            ))}
          </>
        )}
      </div>

      <EditSheet
        item={editItem}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        locations={locations}
      />
    </div>
  )
}
