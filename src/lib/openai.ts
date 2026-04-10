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
  // Meal assistant params
  mealType?: string
  servingSize?: string       // e.g. "solo" | "two" | "group" | "feast"
  preferences?: string[]     // e.g. ["healthy", "high protein"]
  maxPrepMinutes?: number
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

  const prompt = `You are a meal planning assistant. The user wants to make a meal using primarily what they already have in their pantry.

Current Pantry (prioritize expiring soon items):
${inventoryText}

User preferences:
- Household size: ${params.householdSize} people
- Dietary restrictions: ${restrictions}
${params.mealType ? `- Meal type: ${params.mealType}` : ""}
${params.servingSize ? `- Serving size: ${params.servingSize === "solo" ? "1 person" : params.servingSize === "two" ? "2 people" : params.servingSize === "group" ? "3-4 people" : "5+ people"}` : ""}
${params.maxPrepMinutes ? `- Max prep + cook time: ${params.maxPrepMinutes} minutes` : ""}
${params.numPeople ? `- Cooking for: ${params.numPeople} people` : ""}
${params.timeOfDay ? `- Time of day: ${params.timeOfDay}` : ""}
${params.preferences?.length ? `- Style preferences: ${params.preferences.join(", ")}` : ""}
${params.additionalPreferences ? `- Additional preferences: ${params.additionalPreferences}` : ""}

IMPORTANT RULES:
1. Strongly prefer recipes that can be made with the pantry items listed above. Prioritize using expiring items.
2. Each recipe should use at least 50% of its ingredients from the pantry list.
3. It's OK to require 1-2 additional items not in the pantry, but never more than 30% of ingredients missing.
4. Name each ingredient as a plain English ingredient name (not "2 cups of it"), matching pantry item names closely where possible.
5. Respect the time constraint strictly — total prep+cook time must not exceed the limit.

Return valid JSON only in this format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief 1-sentence description",
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
