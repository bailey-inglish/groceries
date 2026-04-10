import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const scanSchema = z.object({
  eventType: z.enum(["SCAN_IN", "SCAN_OUT"]),
  quantityChange: z.number().positive(),
  notes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const item = await prisma.inventoryItem.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = scanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { eventType, quantityChange, notes } = parsed.data

  // Create stock event
  await prisma.stockEvent.create({
    data: {
      inventoryItemId: id,
      userId: session.user.id,
      eventType,
      quantityChange: eventType === "SCAN_OUT" ? -quantityChange : quantityChange,
      notes,
    },
  })

  // Update quantity
  const newQuantity =
    eventType === "SCAN_IN"
      ? item.quantity + quantityChange
      : Math.max(0, item.quantity - quantityChange)

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { quantity: newQuantity },
  })

  // ── SCAN_IN: auto-mark matching shopping list items as purchased ──────────
  let purchasedListItemIds: string[] = []
  if (eventType === "SCAN_IN") {
    const candidates = await prisma.shoppingListItem.findMany({
      where: {
        userId: session.user.id,
        isPurchased: false,
        OR: [
          // Match by barcode if both have one
          ...(item.barcode ? [{ barcode: item.barcode }] : []),
          // Fuzzy name match
          { name: { contains: item.name, mode: "insensitive" as const } },
        ],
      },
    })

    if (candidates.length > 0) {
      purchasedListItemIds = candidates.map((c) => c.id)
      await prisma.shoppingListItem.updateMany({
        where: { id: { in: purchasedListItemIds } },
        data: { isPurchased: true },
      })
    }
  }

  return NextResponse.json({ item: updated, purchasedListItemIds })
}
