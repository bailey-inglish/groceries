import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const importSchema = z.object({
  url: z.string().url(),
})

const recipeOutputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      optional: z.boolean().optional(),
    })
  ),
  instructions: z.string(),
  servings: z.number().int().positive().optional(),
  prepTimeMin: z.number().int().nonnegative().optional(),
  cookTimeMin: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
})

const FREE_MODELS_FALLBACK = "gemini-2.5-flash-lite"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  const { url } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true },
  })

  const apiKey = user?.openAiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 })
  }

  // Fetch page HTML
  let html: string
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PantryBot/1.0)" },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Could not fetch URL" }, { status: 422 })
  }

  const truncatedHtml = html.slice(0, 12000)
  const model = process.env.GEMINI_MODEL || FREE_MODELS_FALLBACK
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  let parsedRecipe
  try {
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Extract the recipe from this HTML page. Return valid JSON only matching this schema:
{
  "title": string,
  "description": string | null,
  "ingredients": [{ "name": string, "quantity": number, "unit": string, "optional": boolean }],
  "instructions": string (full step-by-step, newline separated),
  "servings": number | null,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "tags": string[]
}

HTML:
${truncatedHtml}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 1500,
        },
      }),
    })

    if (!geminiRes.ok) {
      const errMsg = await geminiRes.text()
      return NextResponse.json({ error: `AI error: ${errMsg}` }, { status: 422 })
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error("No response from AI")

    parsedRecipe = recipeOutputSchema.parse(JSON.parse(content))
  } catch {
    return NextResponse.json({ error: "Failed to parse recipe from URL" }, { status: 422 })
  }

  const { ingredients, tags, servings, prepTimeMin, cookTimeMin, ...rest } = parsedRecipe

  const recipe = await prisma.recipe.create({
    data: {
      ...rest,
      userId: session.user.id,
      servings: servings || 4,
      prepTimeMin: prepTimeMin || 0,
      cookTimeMin: cookTimeMin || 0,
      ingredients: JSON.stringify(
        ingredients.map((i) => ({ name: i.name, amount: `${i.quantity} ${i.unit}`.trim() }))
      ),
      tags: JSON.stringify(tags || []),
      source: "AI",
      recipeIngredients: {
        create: ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit || "count",
          optional: ing.optional || false,
        })),
      },
    },
    include: { recipeIngredients: true },
  })

  return NextResponse.json({ recipe }, { status: 201 })
}
