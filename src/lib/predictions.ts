import { prisma } from "./prisma"

export interface PredictionResult {
  itemId: string
  itemName: string
  currentQuantity: number
  unit: string
  avgDailyConsumption: number
  daysRemaining: number | null
  isRunningLow: boolean
  predictedRunOutDate: Date | null
  recommendedBuyDate: Date | null
}

/**
 * Exponential Moving Average of daily consumption.
 *
 * More recent consumption events are weighted more heavily than older ones.
 * α = 0.3 gives ~70% weight to the last 7 data points.
 */
function computeEMA(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0
  let ema = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema
  }
  return ema
}

export async function calculatePredictions(
  userId: string,
  shoppingTripLagDays = 2
): Promise<PredictionResult[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { userId },
    include: { stockEvents: { orderBy: { createdAt: "asc" } } },
  })

  return items.map((item) => {
    const scanOuts = item.stockEvents.filter(
      (e) => e.eventType === "SCAN_OUT" || e.eventType === "MANUAL_ADJUST"
    )

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
        recommendedBuyDate: null,
      }
    }

    // Build daily consumption buckets from SCAN_OUT events
    const dailyBuckets: Map<string, number> = new Map()
    for (const ev of scanOuts) {
      const day = ev.createdAt.toISOString().split("T")[0]
      dailyBuckets.set(day, (dailyBuckets.get(day) || 0) + Math.abs(ev.quantityChange))
    }

    // Sort chronologically and compute EMA
    const sortedValues = [...dailyBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)

    const avgDailyConsumption = computeEMA(sortedValues)

    let daysRemaining: number | null = null
    let predictedRunOutDate: Date | null = null
    let recommendedBuyDate: Date | null = null

    if (avgDailyConsumption > 0) {
      daysRemaining = item.quantity / avgDailyConsumption
      predictedRunOutDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
      // Recommend buy date = run-out date minus shopping trip lag
      const buyDaysFromNow = Math.max(0, daysRemaining - shoppingTripLagDays)
      recommendedBuyDate = new Date(Date.now() + buyDaysFromNow * 24 * 60 * 60 * 1000)
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
      recommendedBuyDate,
    }
  })
}

export async function getItemsRunningLow(userId: string): Promise<PredictionResult[]> {
  // Fetch user's configured shopping trip lag
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shoppingTripLagDays: true },
  })
  const predictions = await calculatePredictions(userId, user?.shoppingTripLagDays ?? 2)
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

