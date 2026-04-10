"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  ChefHat,
  Sparkles,
  Clock,
  Users,
  BookOpen,
  Plus,
  Save,
  Loader2,
  X,
  Check,
} from "lucide-react"

interface Recipe {
  id: string
  title: string
  description?: string
  ingredients: string
  instructions: string
  servings: number
  prepTimeMin: number
  cookTimeMin: number
  tags: string
  source: string
  createdAt: string
}

type Ingredient = { name: string; amount: string; inPantry?: boolean; pantryItemName?: string }

function RecipeExpandable({ recipe, children }: { recipe: Recipe; children?: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const ingredients: Ingredient[] = (() => {
    try { return JSON.parse(recipe.ingredients || "[]") } catch { return [] }
  })()
  const tags: string[] = (() => {
    try { return JSON.parse(recipe.tags || "[]") } catch { return [] }
  })()
  const totalTime = recipe.prepTimeMin + recipe.cookTimeMin

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{recipe.title}</h3>
              {recipe.source === "AI" && (
                <Badge className="bg-purple-100 text-purple-700 text-[10px] shrink-0">AI</Badge>
              )}
            </div>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
          {children}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
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
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary mt-3 hover:underline"
        >
          {expanded ? "Show less" : "View recipe →"}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">Ingredients</h4>
              <ul className="space-y-1">
                {ingredients.map((ing, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    {ing.inPantry !== undefined ? (
                      ing.inPantry
                        ? <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        : <X className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                    ) : (
                      <span className="text-muted-foreground shrink-0">•</span>
                    )}
                    <span><strong>{ing.amount}</strong> {ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Instructions</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.instructions}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CachedRecipeCard({ recipe, onSaved }: { recipe: Recipe; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "AI" }),
      })
      setSaved(true)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <RecipeExpandable recipe={recipe}>
      {!saved ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </Button>
      ) : (
        <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
          <Check className="w-3 h-3 mr-1" />
          Saved
        </Badge>
      )}
    </RecipeExpandable>
  )
}

function AddRecipeForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    servings: "4",
    prepTimeMin: "15",
    cookTimeMin: "30",
  })
  const [ingredients, setIngredients] = useState([{ name: "", amount: "" }])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          servings: parseInt(form.servings),
          prepTimeMin: parseInt(form.prepTimeMin),
          cookTimeMin: parseInt(form.cookTimeMin),
          ingredients: ingredients.filter((i) => i.name),
          tags: [],
          source: "USER",
        }),
      })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Recipe Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Pasta Carbonara"
          required
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description..."
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Servings</Label>
          <Input
            type="number"
            min="1"
            value={form.servings}
            onChange={(e) => setForm({ ...form, servings: e.target.value })}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prep (min)</Label>
          <Input
            type="number"
            min="0"
            value={form.prepTimeMin}
            onChange={(e) => setForm({ ...form, prepTimeMin: e.target.value })}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cook (min)</Label>
          <Input
            type="number"
            min="0"
            value={form.cookTimeMin}
            onChange={(e) => setForm({ ...form, cookTimeMin: e.target.value })}
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIngredients([...ingredients, { name: "", amount: "" }])}
            className="h-7 text-xs gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Amount"
              value={ing.amount}
              onChange={(e) => {
                const updated = [...ingredients]
                updated[i].amount = e.target.value
                setIngredients(updated)
              }}
              className="h-10 w-24 shrink-0"
            />
            <Input
              placeholder="Ingredient"
              value={ing.name}
              onChange={(e) => {
                const updated = [...ingredients]
                updated[i].name = e.target.value
                setIngredients(updated)
              }}
              className="h-10 flex-1"
            />
            {ingredients.length > 1 && (
              <button
                type="button"
                onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Instructions *</Label>
        <Textarea
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          placeholder="Step-by-step instructions..."
          rows={5}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Recipe"}
      </Button>
    </form>
  )
}

export default function RecipesPage() {
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [cachedRecipes, setCachedRecipes] = useState<Recipe[]>([])
  const [myLoading, setMyLoading] = useState(true)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  async function fetchMyRecipes() {
    setMyLoading(true)
    const res = await fetch("/api/recipes?excludeSource=AI_CACHE")
    const data = await res.json()
    setMyRecipes(data.recipes || [])
    setMyLoading(false)
  }

  async function fetchCachedRecipes() {
    setCacheLoading(true)
    const res = await fetch("/api/recipes?source=AI_CACHE")
    const data = await res.json()
    setCachedRecipes(data.recipes || [])
    setCacheLoading(false)
  }

  useEffect(() => {
    fetchMyRecipes()
    fetchCachedRecipes()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Recipes</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Recipe
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {showAddForm && (
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">New Recipe</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <AddRecipeForm onSuccess={() => { setShowAddForm(false); fetchMyRecipes() }} />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="my-recipes">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="my-recipes" className="flex-1 gap-1.5">
              <BookOpen className="w-4 h-4" />
              My Recipes
            </TabsTrigger>
            <TabsTrigger value="recent-ai" className="flex-1 gap-1.5">
              <Sparkles className="w-4 h-4" />
              Recently Suggested
            </TabsTrigger>
          </TabsList>

          {/* My Recipes */}
          <TabsContent value="my-recipes" className="space-y-3">
            {myLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : myRecipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No saved recipes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your own or save ideas from the AI suggestions below
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" onClick={() => setShowAddForm(true)}>Add Recipe</Button>
                  <Link href="/meal">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Get AI ideas
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              myRecipes.map((recipe) => (
                <RecipeExpandable key={recipe.id} recipe={recipe} />
              ))
            )}
          </TabsContent>

          {/* Recently Suggested */}
          <TabsContent value="recent-ai" className="space-y-3">
            {cacheLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : cachedRecipes.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No recent suggestions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate meal ideas using your current inventory
                </p>
                <Link href="/meal">
                  <Button className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Go to Meal tab
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground px-1">
                  {cachedRecipes.length} recent idea{cachedRecipes.length !== 1 ? "s" : ""} — save any to keep permanently
                </p>
                {cachedRecipes.map((recipe) => (
                  <CachedRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSaved={() => {
                      fetchMyRecipes()
                      fetchCachedRecipes()
                    }}
                  />
                ))}
                <Card className="border-0 shadow-sm bg-purple-50/60">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                      <p className="text-sm text-purple-800">
                        Want more ideas? Generate them in the Meal tab.
                      </p>
                    </div>
                    <Link href="/meal">
                      <Button size="sm" className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white">
                        Meal tab →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

