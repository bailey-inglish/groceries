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
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = suggestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  // Get user settings
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

  // Get current inventory
  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.user.id, quantity: { gt: 0 } },
    orderBy: { expirationDate: "asc" },
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

  // Optionally save to db
  if (parsed.data.save) {
    await Promise.all(
      suggestions.map((s) =>
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

  return NextResponse.json({ suggestions })
}
