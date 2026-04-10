import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { seedDefaultLocations } from "@/lib/locations"
import { z } from "zod"

const createLocationSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Seed defaults if needed
  await seedDefaultLocations(session.user.id)

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ locations })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createLocationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { name, color } = parsed.data
  // Build slug from name: uppercase, spaces → underscores, strip non-alphanum
  const slug = name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")

  if (!slug) {
    return NextResponse.json({ error: "Location name must contain at least one alphanumeric character" }, { status: 400 })
  }

  const existing = await prisma.userLocation.findUnique({
    where: { userId_slug: { userId: session.user.id, slug } },
  })
  if (existing) {
    return NextResponse.json({ error: "A location with that name already exists" }, { status: 409 })
  }

  const maxOrder = await prisma.userLocation.aggregate({
    where: { userId: session.user.id },
    _max: { sortOrder: true },
  })

  const location = await prisma.userLocation.create({
    data: {
      userId: session.user.id,
      name,
      slug,
      color: color || "bg-gray-100 text-gray-800",
      isDefault: false,
      isVisible: true,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  })

  return NextResponse.json({ location }, { status: 201 })
}
