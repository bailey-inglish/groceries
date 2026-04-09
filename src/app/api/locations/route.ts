import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Default locations seeded for new users
export const DEFAULT_LOCATIONS = [
  { name: "Fridge", slug: "FRIDGE", color: "bg-blue-100 text-blue-800", sortOrder: 0 },
  { name: "Freezer", slug: "FREEZER", color: "bg-cyan-100 text-cyan-800", sortOrder: 1 },
  { name: "Pantry", slug: "PANTRY", color: "bg-amber-100 text-amber-800", sortOrder: 2 },
  { name: "Spice Rack", slug: "SPICE_RACK", color: "bg-orange-100 text-orange-800", sortOrder: 3 },
  { name: "Counter", slug: "COUNTER", color: "bg-purple-100 text-purple-800", sortOrder: 4 },
  { name: "Cellar", slug: "CELLAR", color: "bg-stone-100 text-stone-800", sortOrder: 5 },
  { name: "Other", slug: "OTHER", color: "bg-gray-100 text-gray-800", sortOrder: 6 },
]

export async function seedDefaultLocations(userId: string) {
  // Only seed if the user has no locations yet
  const count = await prisma.userLocation.count({ where: { userId } })
  if (count > 0) return

  await prisma.userLocation.createMany({
    data: DEFAULT_LOCATIONS.map((loc) => ({ ...loc, userId, isDefault: true, isVisible: true })),
    skipDuplicates: true,
  })
}

const createLocationSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
})

const updateLocationSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
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
