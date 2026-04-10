import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  // Search inventory history — group by barcode (or name if no barcode)
  const rawItems = await prisma.inventoryItem.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  // Also search UPC profiles
  const profiles = await prisma.uPCProfile.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { customName: { contains: q, mode: "insensitive" } },
        { customBrand: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  })

  // Deduplicate: key = barcode || lowercase name
  const seen = new Map<
    string,
    {
      key: string
      name: string
      brand?: string | null
      barcode?: string | null
      unit: string
      currentQuantity: number
      lastSeen: Date
    }
  >()

  for (const item of rawItems) {
    const key = item.barcode || item.name.toLowerCase()
    const existing = seen.get(key)
    if (!existing || new Date(item.updatedAt) > existing.lastSeen) {
      seen.set(key, {
        key,
        name: item.name,
        brand: item.brand,
        barcode: item.barcode,
        unit: item.unit,
        currentQuantity: (existing?.currentQuantity || 0) + item.quantity,
        lastSeen: new Date(item.updatedAt),
      })
    } else {
      // Sum quantities for stacked items
      seen.set(key, { ...existing, currentQuantity: existing.currentQuantity + item.quantity })
    }
  }

  // Merge UPC profiles — they override name/brand but don't add quantity
  for (const profile of profiles) {
    const key = profile.barcode
    const existing = seen.get(key)
    if (existing) {
      seen.set(key, { ...existing, name: profile.customName, brand: profile.customBrand })
    } else {
      seen.set(key, {
        key,
        name: profile.customName,
        brand: profile.customBrand,
        barcode: profile.barcode,
        unit: profile.defaultUnit || "count",
        currentQuantity: 0,
        lastSeen: new Date(profile.updatedAt),
      })
    }
  }

  // Sort: items currently in stock first, then by recency
  const results = [...seen.values()]
    .sort((a, b) => {
      if (a.currentQuantity > 0 && b.currentQuantity <= 0) return -1
      if (b.currentQuantity > 0 && a.currentQuantity <= 0) return 1
      return b.lastSeen.getTime() - a.lastSeen.getTime()
    })
    .slice(0, 8)
    .map((entry) => ({
      name: entry.name,
      brand: entry.brand,
      barcode: entry.barcode,
      unit: entry.unit,
      currentQuantity: entry.currentQuantity,
    }))

  return NextResponse.json({ results })
}
