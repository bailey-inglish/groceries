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

export type RecipeGenerationStatus = "success" | "need_more_ingredients" | "error" | "policy_violation"

export interface RecipeGenerationResult {
  status: RecipeGenerationStatus
  message: string
  recipes: RecipeSuggestion[]
  missingIngredients: string[]
}

const GEMINI_MODEL = "gemini-2.5-flash-lite"

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

function toGenerationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("prepayment credits are depleted") ||
    message.includes("429")
  ) {
    return "Gemini credits are depleted or the model is rate-limited. Try again later or refresh billing in AI Studio."
  }
  return "Gemini could not generate meal ideas right now."
}

function normalizeRecipe(raw: Record<string, unknown>): RecipeSuggestion | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  const description = typeof raw.description === "string" ? raw.description.trim() : ""
  const instructions = Array.isArray(raw.instructions)
    ? raw.instructions.filter((step): step is string => typeof step === "string" && step.trim().length > 0).join("\n")
    : typeof raw.instructions === "string"
      ? raw.instructions.trim()
      : ""
  const ingredientsRaw = Array.isArray(raw.ingredients) ? raw.ingredients : []
  const ingredients = ingredientsRaw
    .map((ing) => {
      if (!ing || typeof ing !== "object") return null
      const item = ing as Record<string, unknown>
      const name = typeof item.name === "string" ? item.name.trim() : ""
      const quantity = typeof item.quantity === "number" ? item.quantity : Number(item.quantity)
      const unit = typeof item.unit === "string" ? item.unit.trim() : ""
      if (!name || !Number.isFinite(quantity)) return null
      return {
        name,
        amount: `${quantity} ${unit}`.trim(),
      }
    })
    .filter((ing): ing is { name: string; amount: string } => !!ing)

  const servings = typeof raw.servings === "number" && Number.isFinite(raw.servings) ? raw.servings : 4
  const prepTimeMin = typeof raw.prepTimeMin === "number" && Number.isFinite(raw.prepTimeMin) ? raw.prepTimeMin : 0
  const cookTimeMin = typeof raw.cookTimeMin === "number" && Number.isFinite(raw.cookTimeMin) ? raw.cookTimeMin : 0
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : []

  if (!title || !instructions || ingredients.length === 0) return null

  return {
    title,
    description,
    ingredients,
    instructions,
    servings,
    prepTimeMin,
    cookTimeMin,
    tags,
  }
}

function normalizeRecipeResponse(raw: unknown): RecipeGenerationResult {
  const fallback: RecipeGenerationResult = {
    status: "error",
    message: "Gemini returned an invalid response.",
    recipes: [],
    missingIngredients: [],
  }

  if (!raw || typeof raw !== "object") return fallback

  const parsed = raw as Record<string, unknown>
  const status =
    parsed.status === "success" ||
    parsed.status === "need_more_ingredients" ||
    parsed.status === "error" ||
    parsed.status === "policy_violation"
      ? (parsed.status as RecipeGenerationStatus)
      : "success"

  const recipesRaw = Array.isArray(parsed.recipes) ? parsed.recipes : []
  const recipes = recipesRaw
    .map((recipe) => normalizeRecipe(recipe as Record<string, unknown>))
    .filter((recipe): recipe is RecipeSuggestion => !!recipe)

  const missingIngredients = Array.isArray(parsed.missingIngredients)
    ? parsed.missingIngredients.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []

  const message = typeof parsed.message === "string" && parsed.message.trim().length > 0
    ? parsed.message.trim()
    : status === "success"
      ? "Recipes generated successfully."
      : status === "need_more_ingredients"
        ? "You may need a few more ingredients before cooking this meal."
        : status === "policy_violation"
          ? "The request could not be completed because it conflicts with the model safety policy."
          : "Something went wrong while generating recipes."

  return {
    status,
    message,
    recipes: status === "error" ? [] : recipes,
    missingIngredients,
  }
}

export async function generateRecipeSuggestions(
  params: RecipeSuggestionParams
): Promise<RecipeGenerationResult> {
  try {
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

Return ONLY valid JSON matching this schema:
{
  "status": "success" | "need_more_ingredients" | "error" | "policy_violation",
  "message": "short human-readable summary",
  "missingIngredients": ["optional missing ingredients"],
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief 1-sentence description",
      "ingredients": [
        {"name": "ingredient name", "quantity": 1, "unit": "cup", "optional": false}
      ],
      "instructions": ["Step 1", "Step 2"],
      "servings": 4,
      "prepTimeMin": 15,
      "cookTimeMin": 30,
      "tags": ["tag1", "tag2"]
    }
  ]
}

Rules for status:
- Use "success" when you can create one or more solid recipes.
- Use "need_more_ingredients" when the pantry is close but at least one key ingredient is missing.
- Use "policy_violation" when the request conflicts with dietary restrictions, safety, or policy.
- Use "error" only if you cannot comply for a technical reason.

Recipe rules:
- Ingredients must be machine-readable objects with name, quantity, unit, and optional.
- Instructions must be an ordered array of short, clear steps.
- Keep titles concise.
- Prefer ingredients already in the pantry.
- Prioritize expiring items.
- Respect the time limit strictly.

If you return "need_more_ingredients", include recipes only if they are still useful and include a concise missingIngredients list.

The user wants to make a meal using primarily what they already have in their pantry.

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

`
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(params.apiKey)}`

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
      promptFeedback?: { blockReason?: string; blockReasonMessage?: string }
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }

    if (data.promptFeedback?.blockReason) {
      return {
        status: "policy_violation",
        message: data.promptFeedback.blockReasonMessage || "The request was blocked by Gemini safety filters.",
        recipes: [],
        missingIngredients: [],
      }
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error("No response from Gemini")

    const parsed = JSON.parse(content)
    return normalizeRecipeResponse(parsed)
  } catch (error) {
    return {
      status: "error",
      message: toGenerationErrorMessage(error),
      recipes: [],
      missingIngredients: [],
    }
  }
}
