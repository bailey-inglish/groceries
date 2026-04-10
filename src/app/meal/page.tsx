"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  ChefHat,
  Clock,
  Users,
  Loader2,
  RefreshCw,
  Utensils,
  Check,
  X,
  Save,
  CheckCircle2,
  ChevronLeft,
  Package,
  ScanLine,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "setup" | "loading" | "results"

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"
type ServingSize = "solo" | "two" | "group" | "feast"
type Pref = string
type TimeOption = 15 | 30 | 60 | 999
type RecipeGenerationStatus = "success" | "need_more_ingredients" | "error" | "policy_violation"

interface IngredientMatch {
  name: string
  amount: string
  inPantry: boolean
  pantryItemName?: string
}

interface RecipeSuggestion {
  title: string
  description: string
  ingredients: IngredientMatch[]
  instructions: string
  servings: number
  prepTimeMin: number
  cookTimeMin: number
  tags: string[]
  coverageScore: number
}

interface RecipeGenerationResponse {
  status: RecipeGenerationStatus
  message: string
  recipes: RecipeSuggestion[]
  suggestions?: RecipeSuggestion[]
  missingIngredients?: string[]
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

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_PREF_POOL: Pref[] = [
  "healthy", "high protein", "low calorie", "comfort food", "adventurous", "quick & easy",
  "vegetarian", "vegan", "dairy-free", "gluten-free", "spicy", "mild", "light", "hearty",
  "budget-friendly", "family-friendly", "gourmet", "one-pot", "meal prep", "Mediterranean",
  "Asian-inspired", "Mexican", "Italian", "American", "sweet",
]

const LS_ACTIVE_PREFS = "meal_active_prefs"
const LS_PREF_COUNTS = "meal_pref_counts"

const MEAL_TYPES: Array<{ value: MealType; label: string; emoji: string }> = [
  { value: "BREAKFAST", label: "Breakfast", emoji: "🍳" },
  { value: "LUNCH", label: "Lunch", emoji: "🥗" },
  { value: "DINNER", label: "Dinner", emoji: "🍝" },
  { value: "SNACK", label: "Snack", emoji: "🍎" },
]

const SERVING_OPTIONS: Array<{ value: ServingSize; label: string; emoji: string; hint: string }> = [
  { value: "solo", label: "Just me", emoji: "🧑", hint: "1 serving" },
  { value: "two", label: "For two", emoji: "👫", hint: "2 servings" },
  { value: "group", label: "Small group", emoji: "👨‍👩‍👧", hint: "3–4 servings" },
  { value: "feast", label: "Feast", emoji: "🎉", hint: "5+ servings" },
]

const TIME_OPTIONS: Array<{ value: TimeOption; label: string; emoji: string }> = [
  { value: 15, label: "< 15 min", emoji: "⚡" },
  { value: 30, label: "30 min", emoji: "🕐" },
  { value: 60, label: "1 hour", emoji: "🕑" },
  { value: 999, label: "No limit", emoji: "∞" },
]

// ─── Coverage indicator ─────────────────────────────────────────────────────

function CoverageIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  if (pct >= 80) {
    return (
      <div className="flex items-center gap-1.5 text-green-700">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium">All set — {pct}% from pantry</span>
      </div>
    )
  }
  if (pct >= 50) {
    return (
      <div className="flex items-center gap-1.5 text-yellow-700">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-xs font-medium">{pct}% from pantry — need a few items</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-red-700">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-xs font-medium">{pct}% from pantry — missing key items</span>
    </div>
  )
}

// ─── Cook confirmation sheet ─────────────────────────────────────────────────

function CookSheet({
  open,
  onClose,
  recipe,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  recipe: RecipeSuggestion | null
  onConfirm: (ingredients: IngredientMatch[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cooking, setCooking] = useState(false)

  useEffect(() => {
    if (recipe) {
      setSelected(new Set(recipe.ingredients.filter((i) => i.inPantry).map((i) => i.name)))
    }
  }, [recipe])

  if (!recipe) return null

  const pantryIngredients = recipe.ingredients.filter((i) => i.inPantry)

  async function handleConfirm() {
    if (!recipe) return
    setCooking(true)
    try {
      const toDeduct = recipe.ingredients.map((ing) => ({
        ...ing,
        shouldDeduct: ing.inPantry && selected.has(ing.name),
      }))
      await onConfirm(toDeduct)
      onClose()
    } finally {
      setCooking(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader className="pt-2 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Cook: {recipe.title}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            These pantry items will have 1 unit deducted. Toggle off any you didn&apos;t use.
          </p>

          {pantryIngredients.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No pantry items to deduct.</p>
          ) : (
            <div className="space-y-2">
              {pantryIngredients.map((ing) => {
                const isOn = selected.has(ing.name)
                return (
                  <button
                    key={ing.name}
                    onClick={() => {
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(ing.name)) next.delete(ing.name)
                        else next.add(ing.name)
                        return next
                      })
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${
                      isOn ? "border-primary bg-primary/5" : "border-border bg-secondary opacity-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{ing.name}</p>
                      <p className="text-xs text-muted-foreground">{ing.amount}</p>
                    </div>
                    {isOn ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {recipe.ingredients.some((i) => !i.inPantry) && (
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-1">Not in pantry (won&apos;t be deducted):</p>
              <p className="text-xs text-amber-700">
                {recipe.ingredients.filter((i) => !i.inPantry).map((i) => i.name).join(", ")}
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="px-4 pt-4 pb-6 gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={handleConfirm} disabled={cooking}>
            {cooking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {cooking ? "Cooking…" : "Confirm & Cook"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Recipe result card ───────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  index,
  onCook,
}: {
  recipe: RecipeSuggestion
  index: number
  onCook: (recipe: RecipeSuggestion) => void
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalTime = recipe.prepTimeMin + recipe.cookTimeMin

  async function handleSave() {
    setSaving(true)
    try {
      // Try to find the AI_CACHE copy and promote it to AI (saved recipe)
      const searchRes = await fetch("/api/recipes?source=AI_CACHE")
      const searchData = await searchRes.json()
      const cached = (searchData.recipes || []).find(
        (r: { id: string; title: string }) => r.title === recipe.title
      )

      if (cached) {
        // Promote: AI_CACHE → AI
        await fetch(`/api/recipes/${cached.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "AI" }),
        })
      } else {
        // Fallback: create a new saved record
        await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            servings: recipe.servings,
            prepTimeMin: recipe.prepTimeMin,
            cookTimeMin: recipe.cookTimeMin,
            tags: recipe.tags,
            source: "AI",
          }),
        })
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={`border-0 shadow-sm transition-all ${index === 0 ? "ring-2 ring-primary/30" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {index === 0 && (
              <Badge className="bg-primary/10 text-primary text-xs mb-1.5">Best match</Badge>
            )}
            <h3 className="font-bold text-base leading-tight">{recipe.title}</h3>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{recipe.description}</p>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalTime}m
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {recipe.servings} servings
          </span>
          <CoverageIndicator score={recipe.coverageScore} />
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Expandable: ingredients + instructions */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</h4>
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {ing.inPantry ? (
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <span className={ing.inPantry ? "" : "text-muted-foreground"}>
                      <strong>{ing.amount}</strong> {ing.name}
                      {!ing.inPantry && <span className="text-xs text-red-400 ml-1">(need to buy)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {recipe.instructions}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary mt-3 hover:underline"
        >
          {expanded ? "Show less ↑" : "View full recipe ↓"}
        </button>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            className="flex-1 gap-1.5"
            onClick={() => onCook(recipe)}
          >
            <Utensils className="w-4 h-4" />
            Cook it!
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSave}
            disabled={saving || saved}
            title={saved ? "Saved!" : "Save recipe"}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading state ────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Scanning your pantry…",
  "Finding the best matches…",
  "Prioritizing items expiring soon…",
  "Crafting meal ideas just for you…",
  "Almost there…",
]

function LoadingState({ pantryCount }: { pantryCount: number }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 1800)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <ChefHat className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>
      </div>
      <h2 className="text-lg font-bold mb-2">Finding meal ideas</h2>
      <p className="text-sm text-muted-foreground mb-1 transition-all">{LOADING_MESSAGES[msgIdx]}</p>
      <p className="text-xs text-muted-foreground/60">Looking through {pantryCount} pantry items</p>
    </div>
  )
}

function PantryGate({ pantryCount }: { pantryCount: number }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-0 shadow-sm">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold">Add a few more items first</h1>
            <p className="text-sm text-muted-foreground">
              Meal ideas unlock once you have at least two items in your inventory.
            </p>
          </div>
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
            You currently have <span className="font-semibold">{pantryCount}</span> item{pantryCount === 1 ? "" : "s"}.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => (window.location.href = "/scan")} className="gap-2">
              <ScanLine className="w-4 h-4" />
              Scan an item
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Go to inventory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MealPage() {
  const [phase, setPhase] = useState<Phase>("setup")
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [servingSize, setServingSize] = useState<ServingSize | null>(null)
  const [timeLimit, setTimeLimit] = useState<TimeOption | null>(null)
  const [selectedPrefs, setSelectedPrefs] = useState<Pref[]>([])
  const [activePrefs, setActivePrefs] = useState<Pref[]>([])
  const [results, setResults] = useState<RecipeSuggestion[]>([])
  const [error, setError] = useState("")
  const [generationStatus, setGenerationStatus] = useState<RecipeGenerationStatus | null>(null)
  const [generationMessage, setGenerationMessage] = useState("")
  const [missingIngredients, setMissingIngredients] = useState<string[]>([])
  const [pantryCount, setPantryCount] = useState<number | null>(null)
  const [pantryLoaded, setPantryLoaded] = useState(false)
  const [cookSheet, setCookSheet] = useState<RecipeSuggestion | null>(null)
  const [cookedRecipes, setCookedRecipes] = useState<Set<string>>(new Set())

  // Fetch pantry count for loading state display
  useEffect(() => {
    let active = true

    fetch("/api/inventory?sortBy=updatedAt")
      .then(async (r) => {
        const data = await safeJson<{ items?: unknown[] }>(r)
        if (!r.ok) return { items: [] }
        return data || { items: [] }
      })
      .then((d) => {
        if (!active) return
        setPantryCount(d.items?.length ?? 0)
      })
      .catch(() => {
        if (!active) return
        setPantryCount(null)
      })
      .finally(() => {
        if (active) setPantryLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  // Auto-detect time of day for default meal type
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 10) setMealType("BREAKFAST")
    else if (hour < 14) setMealType("LUNCH")
    else if (hour < 21) setMealType("DINNER")
    else setMealType("SNACK")
  }, [])

  // Load active prefs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_ACTIVE_PREFS)
      if (stored) {
        const parsed: Pref[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length === 8) {
          setActivePrefs(parsed)
          return
        }
      }
    } catch {
      // ignore
    }
    // Default to first 8 from pool
    setActivePrefs(ALL_PREF_POOL.slice(0, 8))
  }, [])

  // ── Rotation logic ─────────────────────────────────────────────────────

  function runRotation(justSelected: Pref[], current: Pref[]) {
    try {
      // Increment counts for selected prefs
      const rawCounts = localStorage.getItem(LS_PREF_COUNTS)
      const counts: Record<string, number> = rawCounts ? JSON.parse(rawCounts) : {}
      for (const p of justSelected) {
        counts[p] = (counts[p] || 0) + 1
      }

      // Find the 2 with lowest count among current active
      const sorted = [...current].sort((a, b) => (counts[a] || 0) - (counts[b] || 0))
      const toSwapOut = sorted.slice(0, 2)

      // Pick 2 random replacements from pool not currently active
      const candidates = ALL_PREF_POOL.filter((p) => !current.includes(p))
      const replacements: Pref[] = []
      const shuffled = [...candidates].sort(() => Math.random() - 0.5)
      for (const c of shuffled) {
        if (replacements.length >= 2) break
        replacements.push(c)
      }

      // Build new active set
      let newActive = current.filter((p) => !toSwapOut.includes(p))
      newActive = [...newActive, ...replacements].slice(0, 8)
      // Pad back if not enough candidates
      if (newActive.length < 8) {
        newActive = [...newActive, ...toSwapOut].slice(0, 8)
      }

      localStorage.setItem(LS_ACTIVE_PREFS, JSON.stringify(newActive))
      localStorage.setItem(LS_PREF_COUNTS, JSON.stringify(counts))
      setActivePrefs(newActive)
    } catch {
      // ignore localStorage errors
    }
  }

  async function handleFind() {
    setPhase("loading")
    setError("")
    setGenerationStatus(null)
    setGenerationMessage("")
    setMissingIngredients([])

    try {
      const res = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: mealType ?? undefined,
          servingSize: servingSize ?? undefined,
          maxPrepMinutes: timeLimit !== 999 ? timeLimit ?? undefined : undefined,
          preferences: selectedPrefs.length > 0 ? selectedPrefs : undefined,
        }),
      })

      const data = (await safeJson<Partial<RecipeGenerationResponse> & { error?: string; suggestions?: RecipeSuggestion[] }>(res)) || {}
      if (!res.ok) {
        setError(data.error || data.message || "Couldn't generate meal ideas. Try again!")
        setPhase("setup")
        return
      }

      const status = data.status || "success"
      const recipes = data.recipes || data.suggestions || []
      setResults(recipes)
      setGenerationStatus(status)
      setGenerationMessage(data.message || "")
      setMissingIngredients(data.missingIngredients || [])

      if (status === "error") {
        setError(data.message || "Couldn't generate meal ideas. Try again!")
        setPhase("setup")
        return
      }

      setPhase("results")

      // ── Persist suggestions to AI_CACHE (fire-and-forget) ────────────────
      if (recipes.length > 0) {
        // Save new suggestions
        await Promise.allSettled(
          recipes.map((recipe) =>
            fetch("/api/recipes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: recipe.title,
                description: recipe.description,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                servings: recipe.servings,
                prepTimeMin: recipe.prepTimeMin,
                cookTimeMin: recipe.cookTimeMin,
                tags: recipe.tags,
                source: "AI_CACHE",
              }),
            })
          )
        )

        // Enforce 10-item cache limit: fetch all AI_CACHE recipes, delete oldest
        try {
          const cacheRes = await fetch("/api/recipes?source=AI_CACHE")
          const cacheData = (await safeJson<{ recipes?: Array<{ id: string; createdAt: string }> }>(cacheRes)) || { recipes: [] }
          const cached: Array<{ id: string; createdAt: string }> = cacheData.recipes || []
          if (cached.length > 10) {
            const toDelete = cached
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .slice(0, cached.length - 10)
            await Promise.allSettled(
              toDelete.map((r) => fetch(`/api/recipes/${r.id}`, { method: "DELETE" }))
            )
          }
        } catch {
          // Cache cleanup failure is non-critical
        }
      }
    } catch {
      setError("Something went wrong. Check your connection and try again.")
      setPhase("setup")
    }
  }

  function handleReset() {
    setPhase("setup")
    setStep(1)
    setResults([])
    setError("")
    setGenerationStatus(null)
    setGenerationMessage("")
    setMissingIngredients([])
    setSelectedPrefs([])
    setCookedRecipes(new Set())
  }

  const pantryLocked = pantryLoaded && pantryCount !== null && pantryCount < 2

  if (pantryLocked && pantryCount !== null) {
    return <PantryGate pantryCount={pantryCount} />
  }

  async function handleCookConfirm(ingredients: IngredientMatch[]) {
    if (!cookSheet) return

    const res = await fetch("/api/meal/cook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeTitle: cookSheet.title,
        ingredients,
      }),
    })

    if (res.ok) {
      setCookedRecipes((prev) => new Set([...prev, cookSheet.title]))
    }

    setCookSheet(null)
  }

  // ── Setup phase (wizard) ────────────────────────────────────────────────

  if (phase === "setup") {
    const progressPct = (step / 4) * 100

    function goBack() {
      if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4)
    }

    function goNext() {
      if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4)
    }

    function handleSubmitWizard(prefs: Pref[]) {
      runRotation(prefs, activePrefs)
      handleFind()
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 fixed top-0 left-0 right-0 z-50">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">

            {/* Top nav row */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={goBack}
                disabled={step === 1}
                aria-label="Go back"
                className={`p-2 rounded-full transition-all ${
                  step === 1
                    ? "opacity-0 pointer-events-none"
                    : "hover:bg-gray-100 text-muted-foreground"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted-foreground font-medium tabular-nums">
                {step} of 4
              </span>
            </div>

            {/* ── Step 1: Which meal? ── */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-1">Which meal?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Pick what you&apos;re planning to eat.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {MEAL_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMealType(opt.value)}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all active:scale-95 ${
                        mealType === opt.value
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "border-border bg-white hover:border-primary/50"
                      }`}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className="font-semibold text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                    {error}
                  </div>
                )}
                <Button
                  className="w-full h-12 text-base"
                  disabled={!mealType}
                  onClick={goNext}
                >
                  Next →
                </Button>
              </div>
            )}

            {/* ── Step 2: How big? ── */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-1">How big?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  How many people are you cooking for?
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {SERVING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setServingSize(opt.value)}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all active:scale-95 ${
                        servingSize === opt.value
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "border-border bg-white hover:border-primary/50"
                      }`}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className="font-semibold text-sm">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.hint}</span>
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full h-12 text-base"
                  disabled={!servingSize}
                  onClick={goNext}
                >
                  Next →
                </Button>
              </div>
            )}

            {/* ── Step 3: How long? ── */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-1">How long?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  How much time do you have to cook?
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTimeLimit(opt.value)}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all active:scale-95 ${
                        timeLimit === opt.value
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "border-border bg-white hover:border-primary/50"
                      }`}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className="font-semibold text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full h-12 text-base"
                  disabled={!timeLimit}
                  onClick={goNext}
                >
                  Next →
                </Button>
              </div>
            )}

            {/* ── Step 4: Any preferences? ── */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-1">Any preferences?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Pick as many as you like, or skip.
                </p>
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  {activePrefs.map((pref) => {
                    const isSelected = selectedPrefs.includes(pref)
                    return (
                      <button
                        key={pref}
                        onClick={() =>
                          setSelectedPrefs((prev) =>
                            isSelected
                              ? prev.filter((p) => p !== pref)
                              : [...prev, pref]
                          )
                        }
                        className={`px-3 py-3 rounded-xl border-2 text-sm font-medium text-center transition-all active:scale-95 ${
                          isSelected
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border bg-white hover:border-primary/50"
                        }`}
                      >
                        {pref}
                      </button>
                    )
                  })}
                </div>
                <Button
                  className="w-full h-12 text-base gap-2"
                  onClick={() => handleSubmitWizard(selectedPrefs)}
                >
                  Find meals →
                </Button>
                <button
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => handleSubmitWizard([])}
                >
                  Skip →
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── Loading phase ───────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Finding ideas…</h1>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto">
          <LoadingState pantryCount={pantryCount ?? 0} />
        </div>
      </div>
    )
  }

  // ── Results phase ───────────────────────────────────────────────────────

  const mealLabel = MEAL_TYPES.find((m) => m.value === mealType)?.label || "Meal"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">{mealLabel} ideas</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sorted by what you already have
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
            <RefreshCw className="w-3.5 h-3.5" />
            Start over
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {generationStatus && generationStatus !== "success" && (
          <Card className="border-0 shadow-sm border-amber-200 bg-amber-50/80">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-amber-900 capitalize">
                  {generationStatus.replace(/_/g, " ")}
                </p>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-amber-300 text-amber-700">
                  Gemini
                </Badge>
              </div>
              {generationMessage && <p className="text-sm text-amber-900/90">{generationMessage}</p>}
              {missingIngredients.length > 0 && (
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">Missing ingredients:</span> {missingIngredients.join(", ")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {results.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">
              {generationStatus === "need_more_ingredients" ? "Close, but not quite" : "No ideas found"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {generationStatus === "need_more_ingredients"
                ? "Add the missing items above, then try again."
                : "Try scanning more items or relaxing the time constraint."}
            </p>
            <Button onClick={handleReset}>
              {generationStatus === "need_more_ingredients" ? "Back to setup" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {results.map((recipe, i) => (
              cookedRecipes.has(recipe.title) ? (
                <Card key={i} className="border-0 shadow-sm bg-green-50 ring-2 ring-green-200">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="font-bold text-lg text-green-800">{recipe.title}</h3>
                    <p className="text-sm text-green-600 mt-1">Enjoy your meal! Pantry updated.</p>
                  </CardContent>
                </Card>
              ) : (
                <RecipeCard
                  key={i}
                  recipe={recipe}
                  index={i}
                  onCook={(r) => setCookSheet(r)}
                />
              )
            ))}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleFind}
            >
              <RefreshCw className="w-4 h-4" />
              Generate different ideas
            </Button>
          </>
        )}
      </div>

      <CookSheet
        open={!!cookSheet}
        onClose={() => setCookSheet(null)}
        recipe={cookSheet}
        onConfirm={handleCookConfirm}
      />
    </div>
  )
}
