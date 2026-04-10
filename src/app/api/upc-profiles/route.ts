import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const upsertSchema = z.object({
  barcode: z.string().min(1),
  customName: z.string().min(1),
  customBrand: z.string().optional(),
  defaultLocation: z.string().optional(),
  defaultUnit: z.string().optional(),
  packageSize: z.number().positive().optional(),
  packageUnit: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const barcode = searchParams.get("barcode")
  if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 })

  const profile = await prisma.uPCProfile.findUnique({
    where: { userId_barcode: { userId: session.user.id, barcode } },
  })

  return NextResponse.json({ profile })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { barcode, ...data } = parsed.data

  const profile = await prisma.uPCProfile.upsert({
    where: { userId_barcode: { userId: session.user.id, barcode } },
    create: { userId: session.user.id, barcode, ...data },
    update: data,
  })

  return NextResponse.json({ profile })
}
