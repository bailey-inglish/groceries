"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useLocations } from "@/hooks/use-locations"
import {
  Search,
  Plus,
  Package,
  Filter,
  SortAsc,
  Trash2,
  Pencil,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  TrendingDown,
  ScanLine,
  ShoppingCart,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface LocationSection {
  slug: string
  name: string
  color: string
  items: InventoryItem[]
}

async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function formatIsoDate(dateInput: string) {
  const datePart = dateInput.split("T")[0]
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return dateInput
  return `${month}/${day}/${year}`
}

function normalizeCategoryText(category?: string) {
  return (category || "").toLowerCase().trim()
}

function getCategoryIconSlug(category?: string) {
  const text = normalizeCategoryText(category)
  const iconRules: Array<{ slug: string; keywords: string[] }> = [
    { slug: "meat", keywords: ["meat", "beef", "pork", "chicken", "turkey", "lamb", "steak", "sausage", "bacon", "ham"] },
    { slug: "dairy", keywords: ["dairy", "milk", "cheese", "yogurt", "cream", "butter", "custard"] },
    { slug: "eggs", keywords: ["egg", "eggs"] },
    { slug: "produce", keywords: ["fruit", "vegetable", "produce", "salad", "apple", "banana", "berry", "citrus", "potato", "tomato", "onion", "garlic"] },
    { slug: "pasta", keywords: ["pasta", "noodle", "noodles", "spaghetti", "macaroni", "vermicelli"] },
    { slug: "bakery", keywords: ["bread", "bakery", "cake", "pastry", "cookie", "biscuit", "bun"] },
    { slug: "seafood", keywords: ["fish", "seafood", "salmon", "tuna", "shrimp", "crab", "prawn", "sardine"] },
    { slug: "frozen", keywords: ["frozen"] },
    { slug: "beverage", keywords: ["beverage", "drink", "juice", "soda", "water", "coffee", "tea"] },
    { slug: "pantry", keywords: ["pantry", "canned", "sauce", "spice", "condiment", "grain", "rice", "beans", "cereal", "oil", "vinegar"] },
  ]

  for (const rule of iconRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.slug
  }

  return "other"
}

function groupItemsByLocation(items: InventoryItem[], locations: { slug: string; name: string; color: string }[]) {
  const byLocation = new Map<string, InventoryItem[]>()
  for (const item of items) {
    const list = byLocation.get(item.location) || []
    list.push(item)
    byLocation.set(item.location, list)
  }

  const locationMap = new Map(locations.map((loc) => [loc.slug, loc]))
  const orderedSlugs = [
    ...locations.map((loc) => loc.slug),
    ...Array.from(byLocation.keys()).filter((slug) => !locationMap.has(slug)),
  ]

  return orderedSlugs
    .map((slug) => {
      const location = locationMap.get(slug)
      const sectionItems = byLocation.get(slug) || []
      if (sectionItems.length === 0) return null

      return {
        slug,
        name: location?.name || slug.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        color: location?.color || "bg-gray-100 text-gray-700",
        items: sectionItems,
      } satisfies LocationSection
    })
    .filter((section): section is LocationSection => !!section)
}

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  categoryIconSlug,
  onDelete,
  onEdit,
}: {
  item: InventoryItem
  categoryIconSlug: string
  onDelete: (id: string) => void
  onEdit: (item: InventoryItem) => void
}) {
  const daysUntilExpiry = item.expirationDate
    ? Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7
  const isRunningLow = item.packageSize && item.packageSize > 0 ? item.quantity / item.packageSize < 0.15 : item.quantity <= 1 && item.quantity > 0

  const fillPct =
    item.packageSize && item.packageSize > 0
      ? Math.min(100, Math.round((item.quantity / item.packageSize) * 100))
      : null

  return (
    <Card
      className={`border-0 shadow-sm ${isExpiringSoon ? "ring-1 ring-red-200" : isRunningLow ? "ring-1 ring-amber-200" : ""}`}
      onClick={() => onEdit(item)}
      style={{ cursor: "pointer" }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            <Image
              src={`/item-icons/${categoryIconSlug}.svg`}
              alt=""
              width={28}
              height={28}
              className="w-7 h-7"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {item.category && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {item.category.split(",")[0]}
                    </Badge>
                  )}
                  {isExpiringSoon && (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {daysUntilExpiry !== null && daysUntilExpiry <= 0 ? "Expired" : "Expiring soon"}
                    </Badge>
                  )}
                  {!isExpiringSoon && isRunningLow && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700 bg-amber-50">
                      <TrendingDown className="w-3 h-3" />
                      Running low
                    </Badge>
                  )}
                </div>
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

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {item.isOpened && (
                <Badge variant="secondary" className="text-xs">Opened</Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-bold text-foreground">
                {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
              </span>

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
                    Exp: {formatIsoDate(item.expirationDate)}
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

// ─── Edit sheet ───────────────────────────────────────────────────────────────

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
  const [openedManuallyChanged, setOpenedManuallyChanged] = useState(false)

  function inferOpened(quantity: string, packageSize: string, fallback = false) {
    const parsedQuantity = Number.parseFloat(quantity)
    const parsedPackageSize = Number.parseFloat(packageSize)
    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedPackageSize) || parsedPackageSize <= 0) {
      return fallback
    }

    const fullness = parsedQuantity / parsedPackageSize
    return fullness < 0.99
  }

  useEffect(() => {
    if (item) {
      const pct =
        item.packageSize && item.packageSize > 0
          ? Math.round((item.quantity / item.packageSize) * 100)
          : 100
      const packageSize = item.packageSize ? String(item.packageSize) : ""
      const quantity = String(item.quantity)
      setForm({
        name: item.name,
        brand: item.brand || "",
        quantity,
        unit: item.unit,
        location: item.location,
        expirationDate: item.expirationDate ? item.expirationDate.split("T")[0] : "",
        notes: item.notes || "",
        packageSize,
        packageUnit: item.packageUnit || item.unit,
        isOpened: inferOpened(quantity, packageSize, item.isOpened || false),
        usePercentage: false,
        percentage: pct,
      })
      setOpenedManuallyChanged(false)
    }
  }, [item])

  useEffect(() => {
    if (openedManuallyChanged) return
    setForm((prev) => ({
      ...prev,
      isOpened: inferOpened(prev.quantity, prev.packageSize, prev.isOpened),
    }))
  }, [form.quantity, form.packageSize, openedManuallyChanged])

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
        isOpened: inferOpened(form.quantity, form.packageSize, form.isOpened),
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
                onClick={() => {
                  setOpenedManuallyChanged(true)
                  setForm((prev) => ({ ...prev, isOpened: !prev.isOpened }))
                }}
                className={`h-11 w-full rounded-lg border-2 text-sm font-medium transition-colors ${
                  form.isOpened ? "border-primary bg-primary/5 text-primary" : "border-input bg-background"
                }`}
              >
                {form.isOpened ? "✓ Opened" : "Not opened"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Automatically inferred from quantity on hand and package size.
              </p>
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

function LocationManagerSheet({
  open,
  onClose,
  locations,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  locations: { id: string; name: string; slug: string; isDefault: boolean; isVisible: boolean }[]
  onSaved: () => Promise<void>
}) {
  const [drafts, setDrafts] = useState<Record<string, { name: string; isVisible: boolean }>>({})
  const [newLocationName, setNewLocationName] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    const nextDrafts: Record<string, { name: string; isVisible: boolean }> = {}
    for (const location of locations) {
      nextDrafts[location.id] = {
        name: location.name,
        isVisible: location.isVisible,
      }
    }
    setDrafts(nextDrafts)
    setNewLocationName("")
  }, [open, locations])

  async function saveLocation(locationId: string) {
    const draft = drafts[locationId]
    if (!draft) return

    setSavingId(locationId)
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          isVisible: draft.isVisible,
        }),
      })
      if (response.ok) {
        await onSaved()
      }
    } finally {
      setSavingId(null)
    }
  }

  async function removeLocation(location: { id: string; name: string; isDefault: boolean }) {
    if (!confirm(`${location.isDefault ? "Hide" : "Delete"} ${location.name}?`)) return

    setSavingId(location.id)
    try {
      const response = await fetch(`/api/locations/${location.id}`, { method: "DELETE" })
      if (response.ok) {
        await onSaved()
      }
    } finally {
      setSavingId(null)
    }
  }

  async function addLocation() {
    const name = newLocationName.trim()
    if (!name) return

    setCreating(true)
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (response.ok) {
        setNewLocationName("")
        await onSaved()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader className="pt-2 pb-4">
          <SheetTitle>Manage locations</SheetTitle>
        </SheetHeader>

        <div className="px-4 space-y-4 pb-2 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Rename, hide, or delete the tags used to organize your inventory.
          </p>

          <div className="space-y-3">
            {locations.map((location) => {
              const draft = drafts[location.id] || { name: location.name, isVisible: location.isVisible }
              const isDirty = draft.name.trim() !== location.name || draft.isVisible !== location.isVisible

              return (
                <Card key={location.id} className="border-0 shadow-sm bg-secondary/30">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Name</Label>
                        <Input
                          value={draft.name}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [location.id]: { ...draft, name: e.target.value },
                            }))
                          }
                          className="h-10"
                        />
                      </div>
                      <Badge variant="outline" className="shrink-0 mt-6">
                        {location.isDefault ? "Default" : "Custom"}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [location.id]: { ...draft, isVisible: !draft.isVisible },
                          }))
                        }
                        className={`flex items-center justify-center gap-2 h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          draft.isVisible ? "border-primary bg-primary/5 text-primary" : "border-border bg-background"
                        }`}
                      >
                        {draft.isVisible ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {draft.isVisible ? "Visible" : "Hidden"}
                      </button>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLocation(location)}
                          disabled={savingId === location.id}
                          className="gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {location.isDefault ? "Hide" : "Delete"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveLocation(location.id)}
                          disabled={!isDirty || !draft.name.trim() || savingId === location.id}
                          className="gap-1.5"
                        >
                          {savingId === location.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="space-y-2 pt-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Add location</Label>
            <div className="flex gap-2">
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Add a custom location"
                className="h-11 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLocation()
                  }
                }}
              />
              <Button onClick={addLocation} disabled={!newLocationName.trim() || creating} className="h-11 gap-1.5">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="px-4 pt-4 pb-6">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Refill prompt sheet ──────────────────────────────────────────────────────

function RefillPromptSheet({
  open,
  itemName,
  itemBarcode,
  onConfirm,
  onDismiss,
}: {
  open: boolean
  itemName: string
  itemBarcode?: string
  onConfirm: () => void
  onDismiss: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onDismiss()}>
      <SheetContent side="bottom">
        <SheetHeader className="pt-2 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Add to shopping list?
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Would you like to add <span className="font-semibold text-foreground">{itemName}</span> to your shopping list?
          </p>
          {itemBarcode && (
            <p className="text-xs text-muted-foreground mt-1">
              When you scan it in, it&apos;ll automatically be checked off.
            </p>
          )}
        </div>
        <SheetFooter className="px-4 pt-4 pb-6 gap-3 flex-row">
          <Button variant="outline" className="flex-1" onClick={onDismiss}>
            No thanks
          </Button>
          <Button className="flex-1 gap-2" onClick={onConfirm}>
            <ShoppingCart className="w-4 h-4" />
            Add to list
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function InventoryDashboard({
  userName,
}: {
  userName: string
}) {
  const searchParams = useSearchParams()
  const { locations, allLocations, loading: locLoading, refetch } = useLocations()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "")
  const [sortBy, setSortBy] = useState("updatedAt")
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [manageLocationsOpen, setManageLocationsOpen] = useState(false)
  const [refillPrompt, setRefillPrompt] = useState<{ name: string; barcode?: string; unit?: string } | null>(null)
  const [loadError, setLoadError] = useState("")
  const [greeting, setGreeting] = useState("Welcome")

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening")
  }, [])

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (locationFilter) params.set("location", locationFilter)
    if (sortBy) params.set("sortBy", sortBy)

    try {
      const res = await fetch(`/api/inventory?${params}`)
      const data = await safeJson<{ items?: InventoryItem[]; error?: string }>(res)
      if (!res.ok) {
        setItems([])
        setLoadError(data?.error || "Unable to load inventory right now.")
        return
      }
      setItems(data?.items || [])
    } catch {
      setItems([])
      setLoadError("Unable to load inventory right now.")
    } finally {
      setLoading(false)
    }
  }, [search, locationFilter, sortBy])

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300)
    return () => clearTimeout(timer)
  }, [fetchItems])

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
    const item = items.find((i) => i.id === id)
    if (!item) return
    if (!confirm("Delete this item?")) return

    // Optimistically remove from UI
    setItems((prev) => prev.filter((i) => i.id !== id))
    setEditOpen(false)

    // Delete on server
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })

    // Show refill prompt
    setRefillPrompt({ name: item.name, barcode: item.barcode, unit: item.unit })
  }

  async function handleRefillConfirm() {
    if (!refillPrompt) return
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: refillPrompt.name,
        quantity: 1,
        unit: refillPrompt.unit || "count",
        barcode: refillPrompt.barcode,
        reason: "REFILL_REQUESTED",
        reasonDetail: "You requested a refill",
      }),
    })
    setRefillPrompt(null)
  }

  function handleEdit(item: InventoryItem) {
    setEditItem(item)
    setEditOpen(true)
  }

  const locationSections = useMemo(
    () => groupItemsByLocation(items, allLocations.length > 0 ? allLocations : locations),
    [items, allLocations, locations]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold">{greeting}! 👋</h1>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
            <Link href="/settings">
              <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary transition-all">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search pantry…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <Select
            value={locationFilter || "all"}
            onValueChange={(v) => {
              if (v === "manage-locations") {
                setManageLocationsOpen(true)
                return
              }
              setLocationFilter(v === "all" ? "" : v)
            }}
          >
            <SelectTrigger className="h-8 text-xs w-auto gap-1 shrink-0">
              <Filter className="w-3 h-3" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectSeparator />
              {locations.map((loc) => (
                <SelectItem key={loc.slug} value={loc.slug}>{loc.name}</SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="manage-locations">Edit locations…</SelectItem>
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

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Inventory list */}
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
            {loadError && (
              <p className="text-sm text-destructive mb-3">{loadError}</p>
            )}
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">
              {search || locationFilter ? "No items found" : "Your pantry is empty"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search || locationFilter ? "Try adjusting your filters" : "Start by scanning a product or adding manually"}
            </p>
            <Link href="/scan">
              <Button className="gap-2">
                <ScanLine className="w-4 h-4" />
                {search || locationFilter ? "Scan a product" : "Scan your first item"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground px-1">{items.length} items — organized by location</p>
            {locationSections.map((section) => (
              <section key={section.slug} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${section.color}`}>
                      {section.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{section.items.length}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      categoryIconSlug={getCategoryIconSlug(item.category)}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <EditSheet
        item={editItem}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        locations={allLocations}
      />

      <LocationManagerSheet
        open={manageLocationsOpen}
        onClose={() => setManageLocationsOpen(false)}
        locations={allLocations}
        onSaved={async () => {
          await refetch()
          await fetchItems()
        }}
      />

      <RefillPromptSheet
        open={!!refillPrompt}
        itemName={refillPrompt?.name || ""}
        itemBarcode={refillPrompt?.barcode}
        onConfirm={handleRefillConfirm}
        onDismiss={() => setRefillPrompt(null)}
      />
    </div>
  )
}
