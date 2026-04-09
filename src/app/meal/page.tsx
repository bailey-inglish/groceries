"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Sparkles,
  Loader2,
  RefreshCw,
  Utensils,
  Check,
  X,
  Save,
  CheckCircle2,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "setup" | "loading" | "results"

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"
type Mood = "fresh" | "comfort" | "bold" | "simple" | "surprise"
type TimeOption = 15 | 30 | 60 | 999

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

// ─── Constants ──────────────────────────────────────────────────────────────

const MEAL_TYPES: Array<{ value: MealType; label: string; emoji: string }> = [
  { value: "BREAKFAST", label: "Breakfast", emoji: "🍳" },
  { value: "LUNCH", label: "Lunch", emoji: "🥗" },
  { value: "DINNER", label: "Dinner", emoji: "🍝" },
  { value: "SNACK", label: "Snack", emoji: "🍎" },
]

const MOODS: Array<{ value: Mood; label: string; emoji: string }> = [
  { value: "fresh", label: "Fresh", emoji: "🥗" },
  { value: "comfort", label: "Comfort", emoji: "🍝" },
  { value: "bold", label: "Bold", emoji: "🌮" },
  { value: "simple", label: "Simple", emoji: "🥣" },
  { value: "surprise", label: "Surprise me", emoji: "🎲" },
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

// ─── Chip picker ──────────────────────────────────────────────────────────────

function ChipPicker<T extends string | number>({
  options,
  value,
  onChange,
  required,
}: {
  options: Array<{ value: T; label: string; emoji: string }>
  value: T | null
  onChange: (v: T) => void
  required?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = value === opt.value
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border-2 transition-all ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50"
            } ${required && !value ? "animate-pulse border-primary/30" : ""}`}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MealPage() {
  const [phase, setPhase] = useState<Phase>("setup")
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const [timeLimit, setTimeLimit] = useState<TimeOption | null>(null)
  const [avoid, setAvoid] = useState("")
  const [results, setResults] = useState<RecipeSuggestion[]>([])
  const [error, setError] = useState("")
  const [pantryCount, setPantryCount] = useState(0)
  const [cookSheet, setCookSheet] = useState<RecipeSuggestion | null>(null)
  const [cookedRecipes, setCookedRecipes] = useState<Set<string>>(new Set())

  // Fetch pantry count for loading state display
  useEffect(() => {
    fetch("/api/inventory?sortBy=updatedAt")
      .then((r) => r.json())
      .then((d) => setPantryCount(d.items?.length || 0))
      .catch(() => {})
  }, [])

  // Auto-detect time of day for default meal type
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 10) setMealType("BREAKFAST")
    else if (hour < 14) setMealType("LUNCH")
    else if (hour < 21) setMealType("DINNER")
    else setMealType("SNACK")
  }, [])

  const canSubmit = !!mealType

  async function handleFind() {
    if (!canSubmit) return
    setPhase("loading")
    setError("")

    try {
      const res = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType,
          mood: mood || undefined,
          maxPrepMinutes: timeLimit !== 999 ? timeLimit : undefined,
          avoid: avoid.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Couldn't generate meal ideas. Try again!")
        setPhase("setup")
        return
      }

      setResults(data.suggestions || [])
      setPhase("results")
    } catch {
      setError("Something went wrong. Check your connection and try again.")
      setPhase("setup")
    }
  }

  function handleReset() {
    setPhase("setup")
    setResults([])
    setError("")
    setCookedRecipes(new Set())
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

  // ── Setup phase ─────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">What should I eat?</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tell me what you&apos;re in the mood for — I&apos;ll find something from your pantry.
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {pantryCount === 0 && (
            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800">
                  Your pantry is empty! <a href="/scan" className="underline font-medium">Scan some items</a> first so I can find meals you can make.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Meal type */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Which meal? <span className="text-red-500">*</span>
            </h2>
            <ChipPicker
              options={MEAL_TYPES}
              value={mealType}
              onChange={setMealType}
              required
            />
          </div>

          {/* Mood */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              What&apos;s the vibe?
            </h2>
            <ChipPicker
              options={MOODS}
              value={mood}
              onChange={setMood}
            />
          </div>

          {/* Time */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              How much time?
            </h2>
            <ChipPicker
              options={TIME_OPTIONS}
              value={timeLimit}
              onChange={setTimeLimit}
            />
          </div>

          {/* Avoid */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Anything to avoid today? <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
            </h2>
            <Input
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="e.g. spicy food, onions, heavy meals…"
              className="h-11"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          <Button
            className="w-full h-12 text-base gap-2"
            onClick={handleFind}
            disabled={!canSubmit}
          >
            <Sparkles className="w-5 h-5" />
            Find something to eat
          </Button>
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
          <LoadingState pantryCount={pantryCount} />
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
        {results.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No ideas found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try scanning more items or relaxing the time constraint.
            </p>
            <Button onClick={handleReset}>Try again</Button>
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
