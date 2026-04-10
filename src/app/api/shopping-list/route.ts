import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getItemsRunningLow, getExpiringItems } from "@/lib/predictions"
import { z } from "zod"

const addItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().default(1),
  unit: z.string().default("count"),
  inventoryItemId: z.string().optional(),
  barcode: z.string().optional(),
  reason: z.string().optional(),
  reasonDetail: z.string().optional(),
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
    const [runningLow, expiringItems] = await Promise.all([
      getItemsRunningLow(session.user.id),
      getExpiringItems(session.user.id, 7),
    ])

    // Add only items not already in the shopping list
    const existing = await prisma.shoppingListItem.findMany({
      where: { userId: session.user.id, isPurchased: false },
      select: { inventoryItemId: true, name: true, barcode: true },
    })
    const existingIds = new Set(existing.map((e) => e.inventoryItemId))
    const existingNames = new Set(existing.map((e) => e.name.toLowerCase()))
    const existingBarcodes = new Set(existing.filter((e) => e.barcode).map((e) => e.barcode as string))

    const toAdd: Array<{
      userId: string
      inventoryItemId: string
      name: string
      quantity: number
      unit: string
      barcode: string | null
      predictedRunOutDate: Date | null
      reason: string
      reasonDetail: string
    }> = []

    // Predicted low items
    for (const item of runningLow) {
      if (existingIds.has(item.itemId)) continue
      if (existingNames.has(item.itemName.toLowerCase())) continue
      if (item.barcode && existingBarcodes.has(item.barcode)) continue

      toAdd.push({
        userId: session.user.id,
        inventoryItemId: item.itemId,
        name: item.itemName,
        quantity: 1,
        unit: item.unit,
        barcode: item.barcode ?? null,
        predictedRunOutDate: item.predictedRunOutDate,
        reason: item.reason,
        reasonDetail: item.reasonDetail,
      })

      if (item.barcode) existingBarcodes.add(item.barcode)
      existingNames.add(item.itemName.toLowerCase())
    }

    // Expiring items not already added
    for (const item of expiringItems) {
      if (existingIds.has(item.id)) continue
      if (existingNames.has(item.name.toLowerCase())) continue
      if (item.barcode && existingBarcodes.has(item.barcode)) continue

      const daysLeft = item.expirationDate
        ? Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      toAdd.push({
        userId: session.user.id,
        inventoryItemId: item.id,
        name: item.name,
        quantity: 1,
        unit: item.unit,
        barcode: item.barcode ?? null,
        predictedRunOutDate: item.expirationDate ?? null,
        reason: "EXPIRING_SOON",
        reasonDetail: daysLeft !== null ? `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : "Expiring soon",
      })

      if (item.barcode) existingBarcodes.add(item.barcode)
      existingNames.add(item.name.toLowerCase())
    }

    if (toAdd.length > 0) {
      await prisma.shoppingListItem.createMany({ data: toAdd })
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
      reason: parsed.data.reason || "MANUAL",
      reasonDetail: parsed.data.reasonDetail || null,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}
