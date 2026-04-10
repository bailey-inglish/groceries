import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deductFromStock } from "@/lib/units"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: session.user.id },
    include: { recipeIngredients: true },
  })
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 })

  const ingredients = recipe.recipeIngredients.filter((i) => !i.optional)
  const unmatched: string[] = []
  const deducted: { name: string; amount: number; unit: string }[] = []

  for (const ingredient of ingredients) {
    // Find best matching inventory item (by barcode if available, else name fuzzy match)
    const candidates = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
        OR: ingredient.barcode
          ? [{ barcode: ingredient.barcode }, { name: { contains: ingredient.name } }]
          : [{ name: { contains: ingredient.name } }],
      },
      orderBy: [
        // Prefer soonest-expiring (FEFO)
        { expirationDate: "asc" },
      ],
    })

    if (candidates.length === 0) {
      unmatched.push(ingredient.name)
      continue
    }

    const target = candidates[0]
    const newQty = deductFromStock(target.quantity, target.unit, ingredient.quantity, ingredient.unit)

    if (newQty === null) {
      // Unit incompatible — flag for user
      unmatched.push(`${ingredient.name} (unit mismatch: ${ingredient.unit} vs ${target.unit})`)
      continue
    }

    const quantityBefore = target.quantity
    const quantityAfter = Math.max(0, newQty)

    await prisma.inventoryItem.update({
      where: { id: target.id },
      data: { quantity: quantityAfter },
    })

    await prisma.stockEvent.create({
      data: {
        inventoryItemId: target.id,
        userId: session.user.id,
        eventType: "MEAL_COOKED",
        quantityChange: -(quantityBefore - quantityAfter),
        quantityBefore,
        quantityAfter,
        note: `Used in recipe: ${recipe.title}`,
      },
    })

    deducted.push({ name: ingredient.name, amount: quantityBefore - quantityAfter, unit: target.unit })
  }

  return NextResponse.json({
    success: true,
    deducted,
    unmatched,
    message: unmatched.length > 0
      ? `Recipe cooked! ${unmatched.length} ingredient(s) not found in inventory.`
      : "Recipe cooked! All ingredients deducted from inventory.",
  })
}
