import { prisma } from "./prisma"
import { parsePackageSize } from "./units"

function normalizeCategoryTag(tag: string): string {
  return tag
    .replace(/^([a-z]{2}):/i, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export interface ProductData {
  barcode: string
  name: string
  brand?: string
  category?: string
  imageUrl?: string
  nutritionDataJson?: string
  packageSize?: number
  packageUnit?: string
}

export async function lookupProduct(barcode: string): Promise<ProductData | null> {
  // Check cache first
  const cached = await prisma.product.findUnique({ where: { barcode } })
  if (cached) {
    return {
      barcode: cached.barcode,
      name: cached.name,
      brand: cached.brand ?? undefined,
      category: cached.category ?? undefined,
      imageUrl: cached.imageUrl ?? undefined,
      nutritionDataJson: cached.nutritionDataJson ?? undefined,
      packageSize: cached.packageSize ?? undefined,
      packageUnit: cached.packageUnit ?? undefined,
    }
  }

  // Fetch from Open Food Facts
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { next: { revalidate: 86400 } }
    )
    if (!response.ok) return null

    const data = await response.json()
    if (data.status !== 1 || !data.product) return null

    const product = data.product

    const categoriesTags = Array.isArray(product.categories_tags)
      ? product.categories_tags
          .map((tag: string) => normalizeCategoryTag(tag))
          .filter(Boolean)
      : []

    const mainCategory = typeof product.main_category === "string" && product.main_category.trim().length > 0
      ? normalizeCategoryTag(product.main_category)
      : undefined

    // Parse package size from product_quantity (e.g. "500 g", "2 L", "12")
    let packageSize: number | undefined
    let packageUnit: string | undefined
    const rawQty: string = product.product_quantity || product.quantity || ""
    if (rawQty) {
      const parsed = parsePackageSize(rawQty)
      if (parsed) {
        packageSize = parsed.size
        packageUnit = parsed.unit
      }
    }

    const productData: ProductData = {
      barcode,
      name: product.product_name || product.product_name_en || "Unknown Product",
      brand: product.brands || undefined,
      category:
        mainCategory ||
        categoriesTags[0] ||
        (typeof product.categories === "string" && product.categories.trim().length > 0
          ? product.categories.split(",")[0].trim()
          : undefined),
      imageUrl: product.image_url || product.image_front_url || undefined,
      nutritionDataJson: product.nutriments
        ? JSON.stringify(product.nutriments)
        : undefined,
      packageSize,
      packageUnit,
    }

    // Cache in database
    await prisma.product.create({
      data: {
        barcode: productData.barcode,
        name: productData.name,
        brand: productData.brand,
        category: productData.category,
        imageUrl: productData.imageUrl,
        nutritionDataJson: productData.nutritionDataJson,
        packageSize: productData.packageSize,
        packageUnit: productData.packageUnit,
      },
    })

    return productData
  } catch {
    return null
  }
}
