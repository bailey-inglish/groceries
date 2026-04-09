import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  location: z.enum(["FRIDGE", "FREEZER", "PANTRY", "SPICE_RACK", "COUNTER", "CELLAR", "OTHER"]).optional(),
  category: z.string().optional(),
  expirationDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const item = await prisma.inventoryItem.findFirst({
    where: { id, userId: session.user.id },
    include: { product: true, stockEvents: { orderBy: { createdAt: "desc" }, take: 20 } },
  })

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ item })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = updateItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { expirationDate, ...rest } = parsed.data

  // If quantity changed, record a manual adjust event
  if (rest.quantity !== undefined && rest.quantity !== existing.quantity) {
    const diff = rest.quantity - existing.quantity
    await prisma.stockEvent.create({
      data: {
        inventoryItemId: id,
        userId: session.user.id,
        eventType: "MANUAL_ADJUST",
        quantityChange: diff,
      },
    })
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...rest,
      expirationDate: expirationDate === null ? null : expirationDate ? new Date(expirationDate) : undefined,
    },
  })

  return NextResponse.json({ item })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.inventoryItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
