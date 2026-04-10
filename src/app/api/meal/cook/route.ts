import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const cookSchema = z.object({
  recipeTitle: z.string().min(1),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.string(),
      inPantry: z.boolean(),
      pantryItemName: z.string().optional(),
      // Client can toggle individual ingredients off before confirming
      shouldDeduct: z.boolean().default(true),
    })
  ),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = cookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { recipeTitle, ingredients } = parsed.data
  const userId = session.user.id

  // Fetch all user's inventory items with positive quantity
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { userId, quantity: { gt: 0 } },
    select: { id: true, name: true, quantity: true, unit: true },
  })

  // Match ingredients to inventory items and deduct
  const deducted: Array<{ itemId: string; itemName: string; newQuantity: number; quantityBefore: number }> = []
  const unmatched: string[] = []

  for (const ing of ingredients) {
    if (!ing.inPantry || !ing.shouldDeduct) continue

    // Find matching inventory item (prefer pantryItemName hint if provided)
    let match = ing.pantryItemName
      ? inventoryItems.find((i) => i.name.toLowerCase() === ing.pantryItemName!.toLowerCase())
      : undefined

    if (!match) {
      const ingLower = ing.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
      const ingWords = ingLower.split(/\s+/).filter((w) => w.length > 2)
      match = inventoryItems.find((i) => {
        const pLower = i.name.toLowerCase()
        if (pLower.includes(ingLower) || ingLower.includes(pLower)) return true
        return ingWords.some((word) => pLower.includes(word))
      })
    }

    if (!match) {
      unmatched.push(ing.name)
      continue
    }

    // Simple deduction: subtract 1 unit (or the full quantity if < 1)
    const quantityBefore = match.quantity
    const deductAmount = Math.min(1, match.quantity)
    const newQuantity = Math.max(0, match.quantity - deductAmount)

    await prisma.inventoryItem.update({
      where: { id: match.id },
      data: { quantity: newQuantity },
    })

    await prisma.stockEvent.create({
      data: {
        userId,
        inventoryItemId: match.id,
        eventType: "MEAL_COOKED",
        quantityChange: -deductAmount,
        quantityBefore,
        quantityAfter: newQuantity,
        note: `Used in: ${recipeTitle}`,
      },
    })

    deducted.push({
      itemId: match.id,
      itemName: match.name,
      newQuantity,
      quantityBefore,
    })

    // Update local cache to avoid double-deducting if same item matched twice
    match.quantity = newQuantity
  }

  return NextResponse.json({ deducted, unmatched })
}
