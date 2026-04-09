import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { seedDefaultLocations, DEFAULT_LOCATIONS } from "@/lib/locations"

const onboardingSchema = z.object({
  name: z.string().optional(),
  householdSize: z.number().int().positive().default(1),
  dietaryRestrictions: z.array(z.string()).default([]),
  otherAllergies: z.string().optional(),
  // Location slugs to show (from the defaults list + any custom ones)
  visibleLocationSlugs: z.array(z.string()).optional(),
  customLocations: z.array(z.object({ name: z.string().min(1), color: z.string().optional() })).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const {
    name,
    householdSize,
    dietaryRestrictions,
    otherAllergies,
    visibleLocationSlugs,
    customLocations,
  } = parsed.data

  // Build full dietary restrictions list (include otherAllergies as a free-text entry)
  let allRestrictions = [...dietaryRestrictions]
  if (otherAllergies?.trim()) {
    allRestrictions = [...allRestrictions, `other:${otherAllergies.trim()}`]
  }

  // Update user profile
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
      householdSize,
      dietaryRestrictions: JSON.stringify(allRestrictions),
      onboardingCompleted: true,
    },
  })

  // Seed default locations if not already seeded
  await seedDefaultLocations(session.user.id)

  // Apply visibility preferences for default locations
  if (visibleLocationSlugs) {
    const defaultSlugs = DEFAULT_LOCATIONS.map((l) => l.slug)
    for (const slug of defaultSlugs) {
      const isVisible = visibleLocationSlugs.includes(slug)
      await prisma.userLocation.updateMany({
        where: { userId: session.user.id, slug },
        data: { isVisible },
      })
    }
  }

  // Create any custom locations
  if (customLocations && customLocations.length > 0) {
    const maxOrder = await prisma.userLocation.aggregate({
      where: { userId: session.user.id },
      _max: { sortOrder: true },
    })
    let nextOrder = (maxOrder._max.sortOrder ?? 6) + 1

    for (const loc of customLocations) {
      const slug = loc.name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
      await prisma.userLocation.upsert({
        where: { userId_slug: { userId: session.user.id, slug } },
        create: {
          userId: session.user.id,
          name: loc.name,
          slug,
          color: loc.color || "bg-gray-100 text-gray-800",
          isDefault: false,
          isVisible: true,
          sortOrder: nextOrder++,
        },
        update: { isVisible: true },
      })
    }
  }

  return NextResponse.json({ success: true })
}
