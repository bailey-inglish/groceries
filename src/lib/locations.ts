import { prisma } from "@/lib/prisma"
import { DEFAULT_LOCATIONS } from "@/lib/default-locations"

export { DEFAULT_LOCATIONS }

export async function seedDefaultLocations(userId: string) {
  // Only seed if the user has no locations yet
  const count = await prisma.userLocation.count({ where: { userId } })
  if (count > 0) return

  await prisma.userLocation.createMany({
    data: DEFAULT_LOCATIONS.map((loc) => ({ ...loc, userId, isDefault: true, isVisible: true })),
    skipDuplicates: true,
  })
}
