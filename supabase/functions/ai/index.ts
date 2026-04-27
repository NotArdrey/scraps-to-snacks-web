import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Meat",
  "Seafood",
  "Dairy",
  "Grains",
  "Spices",
  "Beverages",
  "Snacks",
  "Condiments",
  "Baking",
  "Frozen",
  "Canned",
  "Other",
];

const GROQ_API_URL = Deno.env.get("GROQ_API_URL") ?? "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = Deno.env.get("GROQ_DEFAULT_MODEL") ?? "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = Deno.env.get("GROQ_VISION_MODEL") ?? "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_TEMPERATURE = Number(Deno.env.get("GROQ_TEMPERATURE") ?? "0.7");
const GROQ_MAX_TOKENS = Number(Deno.env.get("GROQ_MAX_TOKENS") ?? "1024");

const OBVIOUS_NON_FOOD_ITEMS = new Set([
  "dinosaur",
  "dragon",
  "unicorn",
  "mermaid",
  "robot",
  "phone",
  "laptop",
  "computer",
  "soap",
  "chair",
  "table",
  "plastic",
  "paper",
  "rock",
  "stone",
]);

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function requireUser(authHeader: string) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) throw new Error("Invalid session");
  return data.user;
}

async function callGroq(messages: unknown[], model = GROQ_DEFAULT_MODEL) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getRequiredEnv("GROQ_API_KEY")}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: GROQ_TEMPERATURE,
      max_tokens: GROQ_MAX_TOKENS,
      response_format: { type: "json_object" },
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    console.error("AI provider rejected request", {
      status: response.status,
      responseBody,
    });
    throw new Error(`AI service error (${response.status}). Please try again.`);
  }

  const data = JSON.parse(responseBody);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI service returned an invalid response.");
  return JSON.parse(content);
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function getPantryItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 25).map((item) => {
    const pantryItem = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const name = typeof pantryItem.name === "string" ? truncateText(pantryItem.name.trim(), 120) : "";
    const unit = typeof pantryItem.unit === "string" ? truncateText(pantryItem.unit.trim(), 40) : "";
    const category = typeof pantryItem.category === "string" ? truncateText(pantryItem.category.trim(), 80) : "";
    const expires = typeof pantryItem.expires === "string" ? truncateText(pantryItem.expires.trim(), 40) : "";
    const quantity = getNumber(pantryItem.quantity, 0);

    return { name, quantity, unit, category, expires };
  }).filter((item) => item.name);
}

function getPantryItemName(value: string) {
  return value
    .replace(/^[\d./\s]+([a-zA-Z]+)?\s*/i, "")
    .trim()
    .toLowerCase();
}

function getObviousNonFoodItems(items: Array<{ name: string }>, ingredientList: string[]) {
  const names = items.length > 0
    ? items.map((item) => item.name)
    : ingredientList.map((ingredient) => getPantryItemName(ingredient));

  return names
    .map((name) => name.trim())
    .filter((name) => {
      const lowerName = name.toLowerCase();
      if (!OBVIOUS_NON_FOOD_ITEMS.has(lowerName)) return false;
      return lowerName !== "dinosaur kale";
    });
}

function normalizeIngredientDetails(value: unknown, fallbackIngredients: string[]) {
  if (Array.isArray(value)) {
    const details = value.slice(0, 30).map((item) => {
      const detail = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const name = typeof detail.name === "string" ? detail.name.trim() : "";
      if (!name) return null;

      return {
        name: truncateText(name, 120),
        quantity: getNumber(detail.quantity, 0),
        unit: typeof detail.unit === "string" ? truncateText(detail.unit.trim(), 40) : "",
        pantryIngredient: typeof detail.pantryIngredient === "boolean" ? detail.pantryIngredient : true,
      };
    }).filter((item): item is { name: string; quantity: number; unit: string; pantryIngredient: boolean } => item !== null);

    if (details.length > 0) return details;
  }

  return fallbackIngredients.map((ingredient) => ({
    name: ingredient.replace(/^[\d./\s]+([a-zA-Z]+)?\s*/i, "").trim() || ingredient,
    quantity: 0,
    unit: "",
    pantryIngredient: true,
  }));
}

function normalizeGeneratedRecipe(value: unknown) {
  const recipe = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const title = typeof recipe.title === "string" && recipe.title.trim()
    ? truncateText(recipe.title.trim(), 120)
    : "Pantry Recipe";
  const ingredients = getStringArray(recipe.ingredients)
    .map((ingredient) => truncateText(ingredient.trim(), 160))
    .filter(Boolean)
    .slice(0, 30);
  const instructions = getStringArray(recipe.instructions)
    .map((step) => truncateText(step.trim(), 400))
    .filter(Boolean)
    .slice(0, 8);
  const nutritionInput = recipe.nutrition && typeof recipe.nutrition === "object"
    ? recipe.nutrition as Record<string, unknown>
    : {};
  const nutrition = {
    cals: Math.max(0, Math.round(getNumber(nutritionInput.cals, 0))),
    protein: Math.max(0, Math.round(getNumber(nutritionInput.protein, 0))),
  };
  const ingredientDetails = normalizeIngredientDetails(recipe.ingredientDetails, ingredients);
  const ingredientNames = getStringArray(recipe.ingredientNames).length > 0
    ? getStringArray(recipe.ingredientNames).map((name) => truncateText(name.trim(), 120)).filter(Boolean).slice(0, 30)
    : ingredientDetails.map((ingredient) => ingredient.name);

  if (ingredients.length === 0) throw new Error("AI service returned a recipe without ingredients.");
  if (instructions.length === 0) throw new Error("AI service returned a recipe without instructions.");

  return {
    title,
    ingredients,
    ingredientNames,
    ingredientDetails,
    instructions,
    nutrition,
  };
}

function getSavedRecipeContext(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 30).map((item) => {
    const recipe = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      title: typeof recipe.title === "string" ? truncateText(recipe.title, 120) : "Untitled recipe",
      date: typeof recipe.date === "string" ? truncateText(recipe.date, 40) : "",
      ingredients: getStringArray(recipe.ingredients).slice(0, 40).map((ingredient) => truncateText(ingredient, 120)),
      instructions: getStringArray(recipe.instructions).slice(0, 8).map((instruction) => truncateText(instruction, 180)),
      nutrition: recipe.nutrition && typeof recipe.nutrition === "object" ? recipe.nutrition : {},
    };
  }).filter((recipe) => recipe.ingredients.length > 0 || recipe.instructions.length > 0);
}

function getChatHistory(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(-8).map((item) => {
    const message = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const role = message.role === "assistant" ? "assistant" : "user";
    const content = typeof message.content === "string" ? truncateText(message.content, 800) : "";
    return content ? { role, content } : null;
  }).filter((message): message is { role: string; content: string } => message !== null);
}

async function generateRecipe(payload: Record<string, unknown>) {
  const ingredientList = getStringArray(payload.ingredientList);
  const pantryItems = getPantryItems(payload.pantryItems);
  const dietPreference = typeof payload.dietPreference === "string" ? payload.dietPreference : "None";
  const allergyList = getStringArray(payload.allergyList);
  if (ingredientList.length === 0 && pantryItems.length === 0) throw new Error("At least one ingredient is required.");

  const nonFoodItems = getObviousNonFoodItems(pantryItems, ingredientList);
  if (nonFoodItems.length > 0) {
    throw new Error(`Remove non-food pantry item${nonFoodItems.length === 1 ? "" : "s"} before generating a recipe: ${nonFoodItems.join(", ")}.`);
  }

  const dietNote = dietPreference && dietPreference !== "None"
    ? `The recipe MUST be compatible with ALL of these diets: ${dietPreference}.`
    : "";

  const allergyNote = allergyList.length > 0
    ? `\nCRITICAL: The recipe MUST STRICTLY AVOID these allergies/ingredients: ${allergyList.join(", ")}.`
    : "";

  const pantryContext = pantryItems.length > 0
    ? JSON.stringify(pantryItems, null, 2)
    : ingredientList.map((ingredient) => ({ name: ingredient, quantity: 0, unit: "", category: "", expires: "" }));

  const prompt = `You are a practical pantry chef. Create one realistic recipe from the selected pantry items.

Selected pantry items:
${typeof pantryContext === "string" ? pantryContext : JSON.stringify(pantryContext, null, 2)}
${dietNote}${allergyNote}

Return a JSON object with exactly these fields:
{
  "title": "Recipe title",
  "ingredients": ["quantity unit ingredient", ...],
  "ingredientNames": ["ingredient name only", ...],
  "ingredientDetails": [
    { "name": "ingredient name only", "quantity": numeric_quantity_or_0, "unit": "unit or empty string", "pantryIngredient": true_or_false }
  ],
  "instructions": ["Step 1...", "Step 2...", ...],
  "nutrition": { "cals": estimated_calories_number, "protein": estimated_protein_grams_number }
}

Rules:
- Only create recipes from real edible foods, beverages, condiments, spices, or cooking ingredients.
- If any selected pantry item is not a real edible ingredient, do not turn it into a joke or fantasy dish. Return a JSON object with "ingredients": [] and "instructions": [] instead.
- Treat extinct animals, fictional creatures, random objects, brand names without an edible product, and gibberish as invalid.
- Use selected pantry items as the main ingredients and include at least ${Math.min(ingredientList.length || pantryItems.length, 3)} selected item(s), unless diet/allergy constraints make one unsafe.
- Do not invent expensive specialty ingredients. You may add only common staples such as water, salt, pepper, oil, vinegar, sugar, garlic, onion, or basic spices.
- Do not use more than the available pantry quantity when a quantity is known.
- Prefer items with nearer expiration dates when choosing the recipe direction.
- If an item conflicts with allergies or diet rules, exclude it and do not mention it as safe.
- Keep instructions concrete and concise with 4-6 steps.
- ingredientNames must contain clean names only, no quantities.
- ingredientDetails must match the ingredients list. Use pantryIngredient=false only for added pantry staples.
- Estimate realistic nutrition values for one recipe batch.`;

  const recipe = await callGroq([
    { role: "system", content: "You are a professional chef assistant. Always respond with valid JSON." },
    { role: "user", content: prompt },
  ]);

  return normalizeGeneratedRecipe(recipe);
}

async function scanIngredientsFromImage(payload: Record<string, unknown>) {
  const imageBase64 = typeof payload.imageBase64 === "string" ? payload.imageBase64 : "";
  if (!imageBase64) throw new Error("Image is required.");

  const prompt = `Analyze this image and identify all food ingredients you can see. Also assess the visual freshness and condition of each item.

Return a JSON object with exactly this format:
{
  "detections": [
    { "name": "Ingredient name", "confidence": 0.95, "qty": 2, "freshness": "fresh", "freshnessScore": 0.9, "condition": null },
    ...
  ]
}

For each ingredient, provide:
- name: the common ingredient name (capitalize first letter)
- confidence: your confidence score between 0.0 and 1.0
- qty: estimated quantity count (default 1 if unsure)
- freshness: one of "fresh", "good", "aging", "questionable", "spoiled" based on visual appearance
  - "fresh": looks just bought, vibrant colors, no blemishes
  - "good": normal appearance, minor imperfections
  - "aging": noticeable wilting, softening, slight discoloration, nearing end of life
  - "questionable": visible mold spots, significant bruising, strong discoloration, slimy texture
  - "spoiled": clearly rotten, heavy mold, decomposing, should not be consumed
- freshnessScore: a score from 0.0 (spoiled) to 1.0 (perfectly fresh) reflecting the visual condition
- condition: a brief description of any visible issues (e.g., "brown spots on skin", "slight wilting on leaves", "mold on surface") or null if the item looks fresh

Only include food items. Be specific (e.g., "Red Bell Pepper" not just "Pepper").`;

  return await callGroq([
    { role: "system", content: "You are a food ingredient recognition assistant. Always respond with valid JSON." },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    },
  ], GROQ_VISION_MODEL);
}

async function validateIngredient(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name : "";
  const dietPreference = typeof payload.dietPreference === "string" ? payload.dietPreference : "None";
  const allergyList = getStringArray(payload.allergyList);
  const freshnessData = payload.freshnessData && typeof payload.freshnessData === "object"
    ? payload.freshnessData as Record<string, unknown>
    : {};
  if (!name.trim()) throw new Error("Ingredient name is required.");

  const dietNote = dietPreference && dietPreference !== "None"
    ? `\nThe user follows these diets: ${dietPreference}.`
    : "";

  const allergyNote = allergyList.length > 0
    ? `\nThe user has these allergies: ${allergyList.join(", ")}.`
    : "";

  const today = new Date().toISOString().split("T")[0];
  const freshness = typeof freshnessData.freshness === "string" ? freshnessData.freshness : "";
  const freshnessScore = typeof freshnessData.freshnessScore === "number" ? freshnessData.freshnessScore : 0;
  const condition = typeof freshnessData.condition === "string" ? freshnessData.condition : "none";

  const freshnessNote = freshness
    ? `\nVisual freshness assessment from image scan: freshness="${freshness}", freshnessScore=${freshnessScore}, condition="${condition}".
Adjust the expiry estimate based on this visual condition:
- "fresh" (score ~0.8-1.0): use the full typical shelf life
- "good" (score ~0.6-0.8): reduce shelf life by ~20%
- "aging" (score ~0.4-0.6): reduce shelf life by ~50%, the item is already partway through its life
- "questionable" (score ~0.2-0.4): the item should be used within 1-2 days or discarded
- "spoiled" (score ~0.0-0.2): the item should NOT be consumed, set expiry to today or past`
    : "";

  const prompt = `The user wants to add "${name}" to their food pantry. Today's date is ${today}.

Determine if this is a valid food ingredient or grocery item. Be reasonable -- accept actual foods, beverages, condiments, spices, cooking ingredients, etc. Reject things that are clearly not food (e.g., "laptop", "soap", "chair", random gibberish).
${dietNote}${allergyNote}${freshnessNote}
Also check if this ingredient conflicts with the user's diet or allergies. For example, meat conflicts with a Vegetarian/Vegan diet, dairy conflicts with a Vegan diet or Lactose allergy, peanuts conflict with a Peanut allergy, shellfish with a Shellfish allergy, etc.

Also estimate a typical expiration date for this ingredient based on average shelf life when stored properly. Use today's date (${today}) as the purchase date. For example: fresh meat ~3-5 days, milk ~7-10 days, eggs ~3-4 weeks, canned goods ~1-2 years, fresh fruits/vegetables ~5-10 days, spices ~6 months, etc.${freshness ? " IMPORTANT: Adjust the expiry date based on the visual freshness assessment provided above." : ""}

Return a JSON object:
{
  "isFood": true or false,
  "correctedName": "Properly capitalized ingredient name (or null if not food)",
  "category": "one of: ${CATEGORIES.join(", ")} (or null if not food)",
  "estimatedExpiryDate": "YYYY-MM-DD format estimated expiration date adjusted for visual condition (or null if not food)",
  "freshnessWarning": "Brief warning about food condition if freshness is 'aging', 'questionable', or 'spoiled' (or null if fresh/good)",
  "dietConflict": true or false (whether it conflicts with the user's diet),
  "allergyConflict": true or false (whether it matches any of the user's allergies),
  "warning": "Brief warning message if there is a diet or allergy conflict (or null if no conflict)",
  "reason": "Brief reason if rejected as not food"
}`;

  return await callGroq([
    { role: "system", content: "You are a food ingredient validation assistant. Always respond with valid JSON." },
    { role: "user", content: prompt },
  ]);
}

async function scanIngredientsFromText(payload: Record<string, unknown>) {
  const description = typeof payload.description === "string" ? payload.description : "";
  if (!description.trim()) throw new Error("Description is required.");

  const prompt = `The user described what they have in their fridge/pantry: "${description}"

Identify all food ingredients mentioned.

Return a JSON object:
{
  "detections": [
    { "name": "Ingredient name", "confidence": 0.95, "qty": 2 },
    ...
  ]
}

For each ingredient:
- name: the common ingredient name (capitalize first letter)
- confidence: your confidence score between 0.0 and 1.0
- qty: estimated quantity count (default 1 if unsure)`;

  return await callGroq([
    { role: "system", content: "You are a food ingredient recognition assistant. Always respond with valid JSON." },
    { role: "user", content: prompt },
  ]);
}

async function chatAboutSavedIngredients(payload: Record<string, unknown>) {
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const savedRecipes = getSavedRecipeContext(payload.savedRecipes);
  const chatHistory = getChatHistory(payload.chatHistory);

  if (!question) throw new Error("Question is required.");

  const cookbookContext = savedRecipes.length > 0
    ? JSON.stringify(savedRecipes, null, 2)
    : "[]";

  const prompt = `The user is asking about ingredients from their saved cookbook recipes.

Saved cookbook recipe data:
${cookbookContext}

Current question: "${truncateText(question, 1200)}"

Answer using only the saved cookbook data above. Help the user find saved ingredients, compare recipes, suggest ways to use ingredients already present in saved recipes, and point out which recipe contains an ingredient when relevant.

If the answer is not in the saved cookbook data, say that clearly and suggest checking their Pantry or saving more recipes.

Return a JSON object with exactly this format:
{
  "reply": "Short helpful answer in 1-4 sentences.",
  "matchedRecipes": ["Recipe title", ...],
  "suggestedQuestions": ["Short follow-up question", "Short follow-up question"]
}`;

  return await callGroq([
    {
      role: "system",
      content: "You are a concise cookbook assistant. You only answer from the user's saved cookbook ingredients and recipes. Always respond with valid JSON.",
    },
    ...chatHistory,
    { role: "user", content: prompt },
  ]);
}

const actions: Record<string, (payload: Record<string, unknown>) => Promise<unknown>> = {
  generateRecipe,
  scanIngredientsFromImage,
  validateIngredient,
  scanIngredientsFromText,
  chatAboutSavedIngredients,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);
    await requireUser(authHeader);

    const requestBody = await req.json().catch(() => null);
    const action = typeof requestBody?.action === "string" ? requestBody.action : "";
    const payload = requestBody?.payload && typeof requestBody.payload === "object"
      ? requestBody.payload as Record<string, unknown>
      : {};
    const handler = actions[action];
    if (!handler) return jsonResponse({ error: "Unknown AI action" }, 400);

    const result = await handler(payload);
    return jsonResponse(result);
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Invalid session" ? 401 : 500;
    console.error("ai function failed", error);
    return jsonResponse({ error: message || "AI service error. Please try again." }, status);
  }
});
