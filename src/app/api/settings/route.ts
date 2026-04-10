import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSettingsSchema = z.object({
  name: z.string().optional(),
  householdSize: z.number().int().positive().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      householdSize: true,
      dietaryRestrictions: true,
    },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...user,
    dietaryRestrictions: JSON.parse(user.dietaryRestrictions || "[]"),
  })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { dietaryRestrictions, ...rest } = parsed.data

  const updateData: Record<string, unknown> = { ...rest }
  if (dietaryRestrictions !== undefined) {
    updateData.dietaryRestrictions = JSON.stringify(dietaryRestrictions)
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      householdSize: true,
      dietaryRestrictions: true,
    },
  })

  return NextResponse.json({
    ...user,
    dietaryRestrictions: JSON.parse(user.dietaryRestrictions || "[]"),
  })
}
