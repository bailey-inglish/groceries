import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createItemSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  quantity: z.number().positive().default(1),
  unit: z.string().default("count"),
  location: z.string().default("PANTRY"),
  category: z.string().optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  productId: z.string().optional(),
  packageSize: z.number().positive().optional(),
  packageUnit: z.string().optional(),
  upcGroupId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const location = searchParams.get("location")
  const category = searchParams.get("category")
  const search = searchParams.get("search")
  const barcode = searchParams.get("barcode")
  const sortBy = searchParams.get("sortBy") ?? "updatedAt"
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc"

  const where: Record<string, unknown> = { userId: session.user.id }
  if (location) where.location = location
  if (category) where.category = category
  if (barcode) where.barcode = barcode
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
      { category: { contains: search } },
    ]
  }

  const orderBy: Record<string, string> = {}
  if (["name", "quantity", "expirationDate", "createdAt", "updatedAt"].includes(sortBy)) {
    orderBy[sortBy] = sortOrder
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy,
    include: { product: true },
  })

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { expirationDate, ...rest } = parsed.data

  const item = await prisma.inventoryItem.create({
    data: {
      ...rest,
      userId: session.user.id,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
    },
  })

  // Create a SCAN_IN event
  await prisma.stockEvent.create({
    data: {
      inventoryItemId: item.id,
      userId: session.user.id,
      eventType: "SCAN_IN",
      quantityChange: item.quantity,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}
