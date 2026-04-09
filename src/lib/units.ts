/**
 * lib/units.ts — canonical unit conversion authority.
 *
 * All inventory quantities, recipe ingredients, and meal-plan deductions
 * pass through this module. Never implement conversions inline elsewhere.
 *
 * Storage convention:
 *   mass   → grams (g)
 *   volume → millilitres (ml)
 *   count  → count (no conversion)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type UnitCategory = "mass" | "volume" | "count"

export interface NormalizedQuantity {
  value: number
  baseUnit: "g" | "ml" | "count"
  category: UnitCategory
}

// ─── Conversion tables (to base unit) ────────────────────────────────────────

/** Grams per unit (mass conversions) */
const TO_GRAMS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  lbs: 453.592,
}

/** Millilitres per unit (volume conversions) */
const TO_ML: Record<string, number> = {
  ml: 1,
  mL: 1,
  l: 1000,
  L: 1000,
  litre: 1000,
  liter: 1000,
  litres: 1000,
  liters: 1000,
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  "fl oz": 29.5735,
  floz: 29.5735,
  cup: 236.588,
  cups: 236.588,
  pt: 473.176,
  pint: 473.176,
  pints: 473.176,
  qt: 946.353,
  quart: 946.353,
  quarts: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
  gallons: 3785.41,
}

const COUNT_UNITS = new Set(["count", "piece", "pieces", "item", "items", "each", "ea", "unit", "units", ""])

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normUnit(unit: string): string {
  return unit.trim().toLowerCase()
}

export function getCategory(unit: string): UnitCategory {
  const u = normUnit(unit)
  if (COUNT_UNITS.has(u)) return "count"
  if (u in TO_GRAMS) return "mass"
  if (u in TO_ML) return "volume"
  return "count"
}

/**
 * Convert `value` in `fromUnit` to the canonical base unit.
 * Returns the normalised value and which base unit was used.
 */
export function toBase(value: number, fromUnit: string): NormalizedQuantity {
  const u = normUnit(fromUnit)
  if (COUNT_UNITS.has(u)) return { value, baseUnit: "count", category: "count" }
  if (u in TO_GRAMS) return { value: value * TO_GRAMS[u], baseUnit: "g", category: "mass" }
  if (u in TO_ML) return { value: value * TO_ML[u], baseUnit: "ml", category: "volume" }
  // Unknown unit — treat as count
  return { value, baseUnit: "count", category: "count" }
}

/**
 * Convert a base-unit value to a target display unit.
 */
export function fromBase(value: number, baseUnit: "g" | "ml" | "count", toUnit: string): number {
  const u = normUnit(toUnit)
  if (baseUnit === "count") return value
  if (baseUnit === "g") {
    const factor = TO_GRAMS[u]
    if (!factor) return value
    return value / factor
  }
  if (baseUnit === "ml") {
    const factor = TO_ML[u]
    if (!factor) return value
    return value / factor
  }
  return value
}

/**
 * Convert `value fromUnit` → `toUnit`. Returns null if the units are
 * incompatible (e.g. mass → volume).
 */
export function convert(value: number, fromUnit: string, toUnit: string): number | null {
  const from = normUnit(fromUnit)
  const to = normUnit(toUnit)

  if (from === to) return value

  const fromCat = getCategory(from)
  const toCat = getCategory(to)

  if (fromCat !== toCat) return null // incompatible categories

  if (fromCat === "count") return value

  if (fromCat === "mass") {
    const grams = value * (TO_GRAMS[from] ?? 1)
    return grams / (TO_GRAMS[to] ?? 1)
  }

  if (fromCat === "volume") {
    const ml = value * (TO_ML[from] ?? 1)
    return ml / (TO_ML[to] ?? 1)
  }

  return null
}

/**
 * Smart deduction: subtract `deductAmount deductUnit` from a stock of
 * `stockQuantity stockUnit`. Returns the updated stock quantity in stockUnit,
 * or null if the units are incompatible.
 */
export function deductFromStock(
  stockQuantity: number,
  stockUnit: string,
  deductAmount: number,
  deductUnit: string
): number | null {
  const converted = convert(deductAmount, deductUnit, stockUnit)
  if (converted === null) return null
  return Math.max(0, stockQuantity - converted)
}

/**
 * Parse a package-size string like "500 g", "2 L", "1 lb", "12 count".
 * Returns { size, unit } or null if unparseable.
 */
export function parsePackageSize(str: string): { size: number; unit: string } | null {
  if (!str) return null
  const match = str.trim().match(/^([\d.]+)\s*(.*)$/)
  if (!match) return null
  const size = parseFloat(match[1])
  const unit = match[2].trim() || "count"
  if (isNaN(size) || size <= 0) return null
  return { size, unit }
}

/**
 * Format a quantity for display, choosing a sensible unit.
 * e.g. 1500 ml → "1.5 L", 250 g → "250 g"
 */
export function formatQuantity(value: number, unit: string): string {
  const u = normUnit(unit)

  // Volume: upgrade ml to L if ≥ 1000
  if (u === "ml" && value >= 1000) {
    return `${+(value / 1000).toFixed(2)} L`
  }

  // Mass: upgrade g to kg if ≥ 1000
  if (u === "g" && value >= 1000) {
    return `${+(value / 1000).toFixed(2)} kg`
  }

  const rounded = value % 1 === 0 ? value : +value.toFixed(2)
  return `${rounded} ${unit}`
}

/** All recognised unit strings (for autocomplete / validation). */
export const ALL_UNITS = [
  // count
  "count", "piece", "pieces",
  // mass
  "mg", "g", "kg", "oz", "lb",
  // volume
  "ml", "l", "tsp", "tbsp", "fl oz", "cup", "cups", "pt", "qt", "gal",
] as const
