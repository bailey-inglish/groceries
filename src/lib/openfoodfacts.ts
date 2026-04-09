import { prisma } from "./prisma"

export interface ProductData {
  barcode: string
  name: string
  brand?: string
  category?: string
  imageUrl?: string
  nutritionDataJson?: string
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
    const productData: ProductData = {
      barcode,
      name: product.product_name || product.product_name_en || "Unknown Product",
      brand: product.brands || undefined,
      category: product.categories || undefined,
      imageUrl: product.image_url || product.image_front_url || undefined,
      nutritionDataJson: product.nutriments
        ? JSON.stringify(product.nutriments)
        : undefined,
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
      },
    })

    return productData
  } catch {
    return null
  }
}
