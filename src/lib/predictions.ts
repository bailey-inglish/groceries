import { prisma } from "./prisma"
// Prisma types used implicitly via return types

export interface PredictionResult {
  itemId: string
  itemName: string
  currentQuantity: number
  unit: string
  avgDailyConsumption: number
  daysRemaining: number | null
  isRunningLow: boolean
  predictedRunOutDate: Date | null
}

export async function calculatePredictions(userId: string): Promise<PredictionResult[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { userId },
    include: { stockEvents: { orderBy: { createdAt: "asc" } } },
  })

  return items.map((item) => {
    const scanOuts = item.stockEvents.filter((e) => e.eventType === "SCAN_OUT")

    if (scanOuts.length < 2) {
      const isLow = item.quantity <= 1
      return {
        itemId: item.id,
        itemName: item.name,
        currentQuantity: item.quantity,
        unit: item.unit,
        avgDailyConsumption: 0,
        daysRemaining: null,
        isRunningLow: isLow,
        predictedRunOutDate: null,
      }
    }

    // Calculate average daily consumption
    const firstEvent = scanOuts[0]
    const lastEvent = scanOuts[scanOuts.length - 1]
    const daySpan =
      (lastEvent.createdAt.getTime() - firstEvent.createdAt.getTime()) /
      (1000 * 60 * 60 * 24)

    const totalConsumed = scanOuts.reduce((sum, e) => sum + Math.abs(e.quantityChange), 0)
    const avgDailyConsumption = daySpan > 0 ? totalConsumed / daySpan : 0

    let daysRemaining: number | null = null
    let predictedRunOutDate: Date | null = null

    if (avgDailyConsumption > 0) {
      daysRemaining = item.quantity / avgDailyConsumption
      predictedRunOutDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
    }

    const isRunningLow = daysRemaining !== null ? daysRemaining < 7 : item.quantity <= 1

    return {
      itemId: item.id,
      itemName: item.name,
      currentQuantity: item.quantity,
      unit: item.unit,
      avgDailyConsumption,
      daysRemaining,
      isRunningLow,
      predictedRunOutDate,
    }
  })
}

export async function getItemsRunningLow(userId: string): Promise<PredictionResult[]> {
  const predictions = await calculatePredictions(userId)
  return predictions.filter((p) => p.isRunningLow)
}

export async function getExpiringItems(userId: string, daysThreshold = 7) {
  const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000)
  return prisma.inventoryItem.findMany({
    where: {
      userId,
      expirationDate: { lte: threshold, gte: new Date() },
    },
    orderBy: { expirationDate: "asc" },
  })
}
