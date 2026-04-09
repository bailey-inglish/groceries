import OpenAI from "openai"

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

export async function generateRecipeSuggestions(
  params: RecipeSuggestionParams
): Promise<RecipeSuggestion[]> {
  const client = new OpenAI({ apiKey: params.apiKey })

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

  const prompt = `You are a helpful meal planning assistant. Based on the following inventory and preferences, suggest 3 recipe ideas.

Current Inventory:
${inventoryText}

Household size: ${params.householdSize} people
Dietary restrictions: ${restrictions}
${params.mealSize ? `Meal size: ${params.mealSize}` : ""}
${params.numPeople ? `Cooking for: ${params.numPeople} people` : ""}
${params.timeOfDay ? `Time of day: ${params.timeOfDay}` : ""}
${params.additionalPreferences ? `Additional preferences: ${params.additionalPreferences}` : ""}

Prioritize items that are expiring soon. Return exactly 3 recipes as a JSON array with this structure:
[{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "amount": "amount with unit"}],
  "instructions": "Step-by-step instructions",
  "servings": 4,
  "prepTimeMin": 15,
  "cookTimeMin": 30,
  "tags": ["tag1", "tag2"]
}]`

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from OpenAI")

  const parsed = JSON.parse(content)
  const recipes = parsed.recipes || parsed
  return Array.isArray(recipes) ? recipes : []
}
