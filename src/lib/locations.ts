import { prisma } from "@/lib/prisma"

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
  try {
    // Only seed if the user has no locations yet
    const count = await prisma.userLocation.count({ where: { userId } })
    if (count > 0) return

    await prisma.userLocation.createMany({
      data: DEFAULT_LOCATIONS.map((loc) => ({ ...loc, userId, isDefault: true, isVisible: true })),
      skipDuplicates: true,
    })
  } catch (error) {
    // If schema is behind (missing UserLocation table), avoid crashing page render.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2021"
    ) {
      return
    }
    throw error
  }
}
