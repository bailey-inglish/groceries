import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const mealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const
const statuses = ["PLANNED", "COOKED", "SKIPPED"] as const

const upsertEntrySchema = z.object({
  date: z.string(),
  mealType: z.enum(mealTypes),
  recipeId: z.string().optional(),
  customMealName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(statuses).optional(),
})

function weekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sunday
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date") || new Date().toISOString()
  const start = weekStart(new Date(dateStr))
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  let plan = await prisma.mealPlan.findFirst({
    where: {
      userId: session.user.id,
      weekStartDate: start,
    },
    include: {
      entries: {
        include: { recipe: true },
        orderBy: [{ date: "asc" }, { mealType: "asc" }],
      },
    },
  })

  // Auto-create a plan record if missing
  if (!plan) {
    plan = await prisma.mealPlan.create({
      data: { userId: session.user.id, weekStartDate: start },
      include: { entries: { include: { recipe: true } } },
    })
  }

  return NextResponse.json({ plan, weekStart: start.toISOString() })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = upsertEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { date, mealType, recipeId, customMealName, notes, status } = parsed.data

  const entryDate = new Date(date)
  entryDate.setHours(0, 0, 0, 0)
  const start = weekStart(entryDate)

  let plan = await prisma.mealPlan.findFirst({
    where: { userId: session.user.id, weekStartDate: start },
  })
  if (!plan) {
    plan = await prisma.mealPlan.create({
      data: { userId: session.user.id, weekStartDate: start },
    })
  }

  // Upsert entry for this date + meal type
  const existing = await prisma.mealPlanEntry.findFirst({
    where: { mealPlanId: plan.id, date: entryDate, mealType },
  })

  let entry
  if (existing) {
    entry = await prisma.mealPlanEntry.update({
      where: { id: existing.id },
      data: { recipeId: recipeId || null, customMealName, notes, status: status || existing.status },
      include: { recipe: true },
    })
  } else {
    entry = await prisma.mealPlanEntry.create({
      data: {
        mealPlanId: plan.id,
        date: entryDate,
        mealType,
        recipeId: recipeId || null,
        customMealName,
        notes,
        status: status || "PLANNED",
      },
      include: { recipe: true },
    })
  }

  return NextResponse.json({ entry })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entryId = searchParams.get("entryId")
  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 })

  const entry = await prisma.mealPlanEntry.findFirst({
    where: { id: entryId, mealPlan: { userId: session.user.id } },
  })
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.mealPlanEntry.delete({ where: { id: entryId } })
  return NextResponse.json({ success: true })
}
