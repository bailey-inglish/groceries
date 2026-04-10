import { prisma } from "./prisma"

export interface PredictionResult {
  itemId: string
  itemName: string
  barcode?: string | null
  currentQuantity: number
  unit: string
  avgDailyConsumption: number
  daysRemaining: number | null
  isRunningLow: boolean
  predictedRunOutDate: Date | null
  recommendedBuyDate: Date | null
  reason: string
  reasonDetail: string
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

  // ── Group items by barcode (for stacked items like 3 limes) ──────────────
  // Items without a barcode are treated individually.
  const groups = new Map<string, typeof items>()

  for (const item of items) {
    const key = item.barcode || `__no_barcode__${item.id}`
    const group = groups.get(key) || []
    group.push(item)
    groups.set(key, group)
  }

  const results: PredictionResult[] = []

  for (const [, group] of groups) {
    const representative = group[0]
    const totalQuantity = group.reduce((sum, i) => sum + i.quantity, 0)

    // Aggregate all consumption events across the group
    const allScanOuts = group.flatMap((item) =>
      item.stockEvents.filter(
        (e) =>
          e.eventType === "SCAN_OUT" ||
          (e.eventType === "MANUAL_ADJUST" && e.quantityChange < 0)
      )
    )

    if (allScanOuts.length < 2) {
      const isLow = totalQuantity <= 1
      results.push({
        itemId: representative.id,
        itemName: representative.name,
        barcode: representative.barcode,
        currentQuantity: totalQuantity,
        unit: representative.unit,
        avgDailyConsumption: 0,
        daysRemaining: null,
        isRunningLow: isLow,
        predictedRunOutDate: null,
        recommendedBuyDate: null,
        reason: "PREDICTED_LOW",
        reasonDetail: isLow ? "Running low on hand" : "Not enough history to predict",
      })
      continue
    }

    // Build daily consumption buckets
    const dailyBuckets: Map<string, number> = new Map()
    for (const ev of allScanOuts) {
      const day = ev.createdAt.toISOString().split("T")[0]
      dailyBuckets.set(day, (dailyBuckets.get(day) || 0) + Math.abs(ev.quantityChange))
    }

    const sortedValues = [...dailyBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)

    const avgDailyConsumption = computeEMA(sortedValues)

    let daysRemaining: number | null = null
    let predictedRunOutDate: Date | null = null
    let recommendedBuyDate: Date | null = null

    if (avgDailyConsumption > 0) {
      daysRemaining = totalQuantity / avgDailyConsumption
      predictedRunOutDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
      const buyDaysFromNow = Math.max(0, daysRemaining - shoppingTripLagDays)
      recommendedBuyDate = new Date(Date.now() + buyDaysFromNow * 24 * 60 * 60 * 1000)
    }

    const isRunningLow = daysRemaining !== null ? daysRemaining < 7 : totalQuantity <= 1

    const days = daysRemaining !== null ? Math.round(daysRemaining) : null
    const reasonDetail =
      days !== null && days <= 0
        ? "Likely out of stock"
        : days !== null
        ? `~${days} day${days === 1 ? "" : "s"} remaining`
        : "Running low on hand"

    results.push({
      itemId: representative.id,
      itemName: representative.name,
      barcode: representative.barcode,
      currentQuantity: totalQuantity,
      unit: representative.unit,
      avgDailyConsumption,
      daysRemaining,
      isRunningLow,
      predictedRunOutDate,
      recommendedBuyDate,
      reason: "PREDICTED_LOW",
      reasonDetail,
    })
  }

  return results
}

export async function getItemsRunningLow(userId: string): Promise<PredictionResult[]> {
  // Fetch user's configured shopping trip lag
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shoppingTripLagDays: true },
  })
  const predictions = await calculatePredictions(userId, user?.shoppingTripLagDays ?? 2)

  // Filter: exclude items where user has recently indicated they don't want a refill
  // (refillWanted === false on the most recent instance of that barcode/name)
  const recentlyRejected = await prisma.inventoryItem.findMany({
    where: {
      userId,
      refillWanted: false,
    },
    select: { barcode: true, name: true },
  })

  const rejectedBarcodes = new Set(
    recentlyRejected.filter((i) => i.barcode).map((i) => i.barcode as string)
  )
  const rejectedNames = new Set(
    recentlyRejected.filter((i) => !i.barcode).map((i) => i.name.toLowerCase())
  )

  return predictions.filter((p) => {
    if (p.barcode && rejectedBarcodes.has(p.barcode)) return false
    if (!p.barcode && rejectedNames.has(p.itemName.toLowerCase())) return false
    return p.isRunningLow
  })
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
