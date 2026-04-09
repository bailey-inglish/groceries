import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { lookupProduct } from "@/lib/openfoodfacts"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const barcode = searchParams.get("barcode")

  if (!barcode) {
    return NextResponse.json({ error: "Barcode is required" }, { status: 400 })
  }

  const product = await lookupProduct(barcode)
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  return NextResponse.json({ product })
}
