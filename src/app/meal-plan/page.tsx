"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UtensilsCrossed,
  BookOpen,
  X,
  Coffee,
  Sun,
  Sunset,
  Apple,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  title: string
  prepTimeMin: number
  cookTimeMin: number
  tags: string
}

interface MealPlanEntry {
  id: string
  date: string
  mealType: string
  recipeId?: string
  customMealName?: string
  notes?: string
  status: string
  recipe?: Recipe
}

interface MealPlan {
  id: string
  weekStartDate: string
  entries: MealPlanEntry[]
}

interface MealEntryData {
  date: string
  mealType: string
  recipeId?: string
  customMealName?: string
  notes?: string
  status?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MEAL_TYPES = [
  { value: "BREAKFAST", label: "Breakfast", icon: Coffee, color: "bg-yellow-100 text-yellow-800" },
  { value: "LUNCH", label: "Lunch", icon: Sun, color: "bg-blue-100 text-blue-800" },
  { value: "DINNER", label: "Dinner", icon: Sunset, color: "bg-orange-100 text-orange-800" },
  { value: "SNACK", label: "Snack", icon: Apple, color: "bg-green-100 text-green-800" },
]

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-gray-100 text-gray-700",
  COOKED: "bg-green-100 text-green-700",
  SKIPPED: "bg-red-100 text-red-600",
}

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MealSlot({
  entry,
  mealType,
  onEdit,
}: {
  entry?: MealPlanEntry
  mealType: (typeof MEAL_TYPES)[number]
  onEdit: () => void
}) {
  const Icon = mealType.icon

  if (!entry) {
    return (
      <button
        onClick={onEdit}
        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left hover:bg-gray-100 transition-colors group"
      >
        <Icon className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground">
          + {mealType.label}
        </span>
      </button>
    )
  }

  const mealName = entry.recipe?.title || entry.customMealName || "—"
  const statusColor = STATUS_COLORS[entry.status] || STATUS_COLORS.PLANNED

  return (
    <button
      onClick={onEdit}
      className="w-full flex items-start gap-2 py-2 px-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{mealName}</p>
        <Badge className={`text-[10px] px-1 py-0 h-4 mt-0.5 ${statusColor}`}>
          {entry.status.toLowerCase()}
        </Badge>
      </div>
    </button>
  )
}

function EntrySheet({
  open,
  onClose,
  entry,
  date,
  mealType,
  recipes,
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  entry?: MealPlanEntry
  date: Date
  mealType: string
  recipes: Recipe[]
  onSave: (data: MealEntryData) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [customMealName, setCustomMealName] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("PLANNED")
  const [saving, setSaving] = useState(false)
  const [inputMode, setInputMode] = useState<"recipe" | "custom">("recipe")

  useEffect(() => {
    if (entry) {
      setSelectedRecipeId(entry.recipeId || "")
      setCustomMealName(entry.customMealName || "")
      setNotes(entry.notes || "")
      setStatus(entry.status)
      setInputMode(entry.recipeId ? "recipe" : "custom")
    } else {
      setSelectedRecipeId("")
      setCustomMealName("")
      setNotes("")
      setStatus("PLANNED")
      setInputMode("recipe")
    }
  }, [entry, open])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        date: formatDate(date),
        mealType,
        recipeId: inputMode === "recipe" ? selectedRecipeId || undefined : undefined,
        customMealName: inputMode === "custom" ? customMealName || undefined : undefined,
        notes: notes || undefined,
        status,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const mealTypeInfo = MEAL_TYPES.find((m) => m.value === mealType)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader className="pt-2 pb-4">
          <SheetTitle>
            {mealTypeInfo?.label} · {DAY_NAMES_FULL[date.getDay()]}, {date.toLocaleDateString()}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 space-y-4 pb-2">
          <div className="flex gap-2 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setInputMode("recipe")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                inputMode === "recipe" ? "bg-white shadow-sm" : "text-muted-foreground"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              From Recipes
            </button>
            <button
              onClick={() => setInputMode("custom")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                inputMode === "custom" ? "bg-white shadow-sm" : "text-muted-foreground"
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Custom Meal
            </button>
          </div>

          {inputMode === "recipe" ? (
            <div className="space-y-1.5">
              <Label>Select a Recipe</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose recipe…" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                      {(r.prepTimeMin + r.cookTimeMin) > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({r.prepTimeMin + r.cookTimeMin}m)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Meal Name</Label>
              <Input
                value={customMealName}
                onChange={(e) => setCustomMealName(e.target.value)}
                placeholder="e.g. Pasta carbonara, Salad, Leftovers…"
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this meal…"
              className="h-11"
            />
          </div>

          {entry && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex gap-2">
                {["PLANNED", "COOKED", "SKIPPED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                      status === s ? "border-primary bg-primary/5" : "border-transparent bg-secondary"
                    }`}
                  >
                    {s.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-4 pt-4 pb-6 gap-3">
          {entry && onDelete && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await onDelete()
                onClose()
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || (inputMode === "recipe" ? !selectedRecipeId : !customMealName.trim())}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : entry ? "Update" : "Add Meal"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MealPlanPage() {
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date())
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDate, setSheetDate] = useState(new Date())
  const [sheetMealType, setSheetMealType] = useState("DINNER")
  const [sheetEntry, setSheetEntry] = useState<MealPlanEntry | undefined>()

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meal-plan?date=${currentWeekDate.toISOString()}`)
      const data = await res.json()
      setPlan(data.plan)
      setWeekStart(new Date(data.weekStart))
    } finally {
      setLoading(false)
    }
  }, [currentWeekDate])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((d) => setRecipes(d.recipes || []))
  }, [])

  function getEntry(date: Date, mealType: string): MealPlanEntry | undefined {
    const dateStr = formatDate(date)
    return plan?.entries.find(
      (e) => e.date.startsWith(dateStr) && e.mealType === mealType
    )
  }

  function openSheet(date: Date, mealType: string) {
    setSheetDate(date)
    setSheetMealType(mealType)
    setSheetEntry(getEntry(date, mealType))
    setSheetOpen(true)
  }

  async function handleSaveEntry(data: MealEntryData) {
    const res = await fetch("/api/meal-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) await fetchPlan()
  }

  async function handleDeleteEntry() {
    if (!sheetEntry) return
    await fetch(`/api/meal-plan?entryId=${sheetEntry.id}`, { method: "DELETE" })
    await fetchPlan()
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Meal Plan
            </h1>
          </div>

          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setCurrentWeekDate((d) => addDays(d, -7))}
              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium">
                {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                {" – "}
                {addDays(weekStart, 6).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={() => setCurrentWeekDate((d) => addDays(d, 7))}
              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => <Skeleton key={j} className="h-8 w-full" />)}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          weekDays.map((day) => {
            const isToday = formatDate(day) === formatDate(new Date())
            return (
              <Card key={day.toISOString()} className={`border-0 shadow-sm ${isToday ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                      {day.getDate()}
                    </div>
                    <span className="text-sm font-semibold">{DAY_NAMES_FULL[day.getDay()]}</span>
                    {isToday && <Badge className="text-xs">Today</Badge>}
                  </div>

                  <div className="space-y-1">
                    {MEAL_TYPES.map((mt) => (
                      <MealSlot
                        key={mt.value}
                        entry={getEntry(day, mt.value)}
                        mealType={mt}
                        onEdit={() => openSheet(day, mt.value)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <EntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        entry={sheetEntry}
        date={sheetDate}
        mealType={sheetMealType}
        recipes={recipes}
        onSave={handleSaveEntry}
        onDelete={sheetEntry ? handleDeleteEntry : undefined}
      />
    </div>
  )
}
