import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getItemsRunningLow } from "@/lib/predictions"
import { z } from "zod"

const addItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().default(1),
  unit: z.string().default("count"),
  inventoryItemId: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.shoppingListItem.findMany({
    where: { userId: session.user.id },
    include: { inventoryItem: true },
    orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Handle auto-populate from predictions
  if (body.autoPopulate) {
    const runningLow = await getItemsRunningLow(session.user.id)

    // Add only items not already in the shopping list
    const existing = await prisma.shoppingListItem.findMany({
      where: { userId: session.user.id, isPurchased: false },
      select: { inventoryItemId: true, name: true },
    })
    const existingIds = new Set(existing.map((e) => e.inventoryItemId))
    const existingNames = new Set(existing.map((e) => e.name.toLowerCase()))

    const toAdd = runningLow.filter(
      (item) =>
        !existingIds.has(item.itemId) && !existingNames.has(item.itemName.toLowerCase())
    )

    if (toAdd.length > 0) {
      await prisma.shoppingListItem.createMany({
        data: toAdd.map((item) => ({
          userId: session.user!.id!,
          inventoryItemId: item.itemId,
          name: item.itemName,
          quantity: 1,
          unit: item.unit,
          predictedRunOutDate: item.predictedRunOutDate,
        })),
      })
    }

    const items = await prisma.shoppingListItem.findMany({
      where: { userId: session.user.id },
      include: { inventoryItem: true },
      orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ items, added: toAdd.length })
  }

  const parsed = addItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const item = await prisma.shoppingListItem.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}
