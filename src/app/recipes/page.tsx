"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface AISuggestion {
  title: string
  description: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string
  servings: number
  prepTimeMin: number
  cookTimeMin: number
  tags: string[]
}

function RecipeCard({ recipe, onSave }: { recipe: AISuggestion; onSave?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      onSave?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{recipe.title}</h3>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
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
            <Badge variant="success">Saved</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recipe.prepTimeMin + recipe.cookTimeMin}m
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {recipe.servings} servings
          </span>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.map((tag) => (
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
          <div className="mt-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">Ingredients</h4>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
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

function SavedRecipeCard({ recipe }: { recipe: Recipe }) {
  const [expanded, setExpanded] = useState(false)
  const ingredients: AISuggestion["ingredients"] = JSON.parse(recipe.ingredients || "[]")
  const tags: string[] = JSON.parse(recipe.tags || "[]")

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">{recipe.title}</h3>
              {recipe.source === "AI" && (
                <Badge className="bg-purple-100 text-purple-700 text-xs shrink-0">AI</Badge>
              )}
            </div>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recipe.prepTimeMin + recipe.cookTimeMin}m
          </span>
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
          <div className="mt-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">Ingredients</h4>
              <ul className="space-y-1">
                {ingredients.map((ing, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
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
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [aiForm, setAiForm] = useState({
    timeOfDay: "dinner",
    numPeople: "2",
    additionalPreferences: "",
  })

  async function fetchRecipes() {
    setLoading(true)
    const res = await fetch("/api/recipes")
    const data = await res.json()
    setRecipes(data.recipes || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  async function generateSuggestions() {
    setAiLoading(true)
    setAiError("")
    setSuggestions([])

    try {
      const res = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeOfDay: aiForm.timeOfDay,
          numPeople: parseInt(aiForm.numPeople),
          additionalPreferences: aiForm.additionalPreferences,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || "Failed to generate suggestions")
        return
      }
      setSuggestions(data.suggestions || [])
    } catch {
      setAiError("Failed to connect to AI service")
    } finally {
      setAiLoading(false)
    }
  }

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
              <AddRecipeForm onSuccess={() => { setShowAddForm(false); fetchRecipes() }} />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="my-recipes">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="my-recipes" className="flex-1 gap-1.5">
              <BookOpen className="w-4 h-4" />
              My Recipes
            </TabsTrigger>
            <TabsTrigger value="ai-suggestions" className="flex-1 gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-recipes" className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : recipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No recipes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your own recipes or generate AI suggestions
                </p>
                <Button size="sm" onClick={() => setShowAddForm(true)}>Add Recipe</Button>
              </div>
            ) : (
              recipes.map((recipe) => <SavedRecipeCard key={recipe.id} recipe={recipe} />)
            )}
          </TabsContent>

          <TabsContent value="ai-suggestions" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Generate Meal Ideas
                </CardTitle>
                <CardDescription className="text-xs">
                  AI will suggest recipes based on your current inventory
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time of Day</Label>
                    <Select
                      value={aiForm.timeOfDay}
                      onValueChange={(v) => setAiForm({ ...aiForm, timeOfDay: v })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">People</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={aiForm.numPeople}
                      onChange={(e) => setAiForm({ ...aiForm, numPeople: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Additional Preferences</Label>
                  <Input
                    value={aiForm.additionalPreferences}
                    onChange={(e) => setAiForm({ ...aiForm, additionalPreferences: e.target.value })}
                    placeholder="e.g. quick & easy, comfort food..."
                    className="h-10"
                  />
                </div>

                <Button
                  onClick={generateSuggestions}
                  disabled={aiLoading}
                  className="w-full gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating ideas...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Suggestions
                    </>
                  )}
                </Button>

                {aiError && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {aiError}
                  </div>
                )}
              </CardContent>
            </Card>

            {suggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground px-1">
                  {suggestions.length} suggestions for you
                </h3>
                {suggestions.map((s, i) => (
                  <RecipeCard key={i} recipe={s} onSave={fetchRecipes} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
