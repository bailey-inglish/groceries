import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateRecipeSuggestions } from "@/lib/openai"
import { z } from "zod"

const suggestSchema = z.object({
  mealSize: z.string().optional(),
  numPeople: z.number().int().positive().optional(),
  timeOfDay: z.string().optional(),
  additionalPreferences: z.string().optional(),
  save: z.boolean().default(false),
  // Meal assistant params
  mealType: z.string().optional(),
  mood: z.string().optional(),
  maxPrepMinutes: z.number().int().positive().optional(),
  avoid: z.string().optional(),
})

interface PantryItem {
  id: string
  name: string
  quantity: number
  unit: string
}

function computeCoverage(
  ingredients: Array<{ name: string; amount: string }>,
  pantryItems: PantryItem[]
): Array<{ name: string; amount: string; inPantry: boolean; pantryItemName?: string }> {
  return ingredients.map((ing) => {
    const ingLower = ing.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
    const ingWords = ingLower.split(/\s+/).filter((w) => w.length > 2)

    const match = pantryItems.find((p) => {
      const pLower = p.name.toLowerCase()
      if (pLower.includes(ingLower) || ingLower.includes(pLower)) return true
      return ingWords.some((word) => pLower.includes(word))
    })

    return {
      name: ing.name,
      amount: ing.amount,
      inPantry: !!match,
      pantryItemName: match?.name,
    }
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = suggestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true, dietaryRestrictions: true, householdSize: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const apiKey = user.openAiKey || process.env.GEMINI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Add one in Settings or set GEMINI_API_KEY in environment variables." },
      { status: 400 }
    )
  }

  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.user.id, quantity: { gt: 0 } },
    orderBy: [{ expirationDate: "asc" }, { updatedAt: "desc" }],
    take: 60,
  })

  const dietaryRestrictions: string[] = JSON.parse(user.dietaryRestrictions || "[]")

  const suggestions = await generateRecipeSuggestions({
    apiKey,
    inventoryItems: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expirationDate: item.expirationDate,
      category: item.category,
    })),
    dietaryRestrictions,
    householdSize: user.householdSize,
    ...parsed.data,
  })

  const pantryItems = items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit }))
  const suggestionsWithCoverage = suggestions.map((s) => {
    const ingredientMatches = computeCoverage(s.ingredients, pantryItems)
    const inPantryCount = ingredientMatches.filter((m) => m.inPantry).length
    const coverageScore = ingredientMatches.length > 0 ? inPantryCount / ingredientMatches.length : 0
    return { ...s, ingredients: ingredientMatches, coverageScore }
  })

  suggestionsWithCoverage.sort((a, b) => b.coverageScore - a.coverageScore)

  if (parsed.data.save) {
    await Promise.all(
      suggestionsWithCoverage.map((s) =>
        prisma.recipe.create({
          data: {
            userId: session.user!.id!,
            title: s.title,
            description: s.description,
            ingredients: JSON.stringify(s.ingredients),
            instructions: s.instructions,
            servings: s.servings,
            prepTimeMin: s.prepTimeMin,
            cookTimeMin: s.cookTimeMin,
            tags: JSON.stringify(s.tags),
            source: "AI",
          },
        })
      )
    )
  }

  return NextResponse.json({ suggestions: suggestionsWithCoverage })
}
