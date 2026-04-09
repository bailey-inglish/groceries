export interface RecipeSuggestionParams {
  apiKey: string
  inventoryItems: Array<{
    name: string
    quantity: number
    unit: string
    location: string
    expirationDate?: Date | null
    category?: string | null
  }>
  dietaryRestrictions: string[]
  householdSize: number
  mealSize?: string
  numPeople?: number
  timeOfDay?: string
  additionalPreferences?: string
}

export interface RecipeSuggestion {
  title: string
  description: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string
  servings: number
  prepTimeMin: number
  cookTimeMin: number
  tags: string[]
}

const FREE_MODELS = new Set([
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
])

function getModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim()
  if (configured && FREE_MODELS.has(configured)) return configured
  return "gemini-2.5-flash-lite"
}

async function callGeminiWithRetry(url: string, body: object, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) return res

    if (res.status !== 429 || i === attempts - 1) {
      const msg = await res.text()
      throw new Error(`Gemini API error (${res.status}): ${msg}`)
    }

    const retryAfter = Number(res.headers.get("retry-after") || "0")
    const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 500 * Math.pow(2, i)
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
  }

  throw new Error("Gemini API failed after retries")
}

export async function generateRecipeSuggestions(
  params: RecipeSuggestionParams
): Promise<RecipeSuggestion[]> {
  const inventoryText = params.inventoryItems
    .map((item) => {
      let text = `- ${item.name}: ${item.quantity} ${item.unit} (${item.location})`
      if (item.expirationDate) {
        const daysUntilExpiry = Math.floor(
          (item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        text += ` [expires in ${daysUntilExpiry} days]`
      }
      return text
    })
    .join("\n")

  const restrictions =
    params.dietaryRestrictions.length > 0
      ? params.dietaryRestrictions.join(", ")
      : "none"

  const prompt = `You are a helpful meal planning assistant. Based on the following inventory and preferences, suggest exactly 3 recipe ideas.

Current Inventory:
${inventoryText}

Household size: ${params.householdSize} people
Dietary restrictions: ${restrictions}
${params.mealSize ? `Meal size: ${params.mealSize}` : ""}
${params.numPeople ? `Cooking for: ${params.numPeople} people` : ""}
${params.timeOfDay ? `Time of day: ${params.timeOfDay}` : ""}
${params.additionalPreferences ? `Additional preferences: ${params.additionalPreferences}` : ""}

Prioritize items that are expiring soon.
Return valid JSON only in this format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "ingredients": [{"name": "ingredient", "amount": "amount with unit"}],
      "instructions": "Step-by-step instructions",
      "servings": 4,
      "prepTimeMin": 15,
      "cookTimeMin": 30,
      "tags": ["tag1", "tag2"]
    }
  ]
}`

  const model = getModel()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(params.apiKey)}`

  const res = await callGeminiWithRetry(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 1200,
    },
  })

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw new Error("No response from Gemini")

  const parsed = JSON.parse(content)
  const recipes = parsed.recipes || parsed
  return Array.isArray(recipes) ? recipes : []
}
