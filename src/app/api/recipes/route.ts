import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  instructions: z.string(),
  servings: z.number().int().positive().default(4),
  prepTimeMin: z.number().int().nonnegative().default(0),
  cookTimeMin: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  source: z.enum(["USER", "AI"]).default("USER"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const source = searchParams.get("source")

  const where: Record<string, unknown> = { userId: session.user.id }
  if (source) where.source = source

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ recipes })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createRecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { ingredients, tags, ...rest } = parsed.data

  const recipe = await prisma.recipe.create({
    data: {
      ...rest,
      userId: session.user.id,
      ingredients: JSON.stringify(ingredients),
      tags: JSON.stringify(tags),
    },
  })

  return NextResponse.json({ recipe }, { status: 201 })
}
