import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  source: z.enum(["USER", "AI", "AI_CACHE"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  servings: z.number().int().positive().optional(),
  prepTimeMin: z.number().int().nonnegative().optional(),
  cookTimeMin: z.number().int().nonnegative().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.recipe.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ recipe })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.recipe.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.recipe.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
