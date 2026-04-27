import { GROQ_API_URL, GROQ_DEFAULT_MODEL, GROQ_VISION_MODEL, GROQ_TEMPERATURE, GROQ_MAX_TOKENS } from '../constants/ai';
import { CATEGORIES } from '../constants/categories';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function callGroq(messages, model = GROQ_DEFAULT_MODEL) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: GROQ_TEMPERATURE,
      max_tokens: GROQ_MAX_TOKENS,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function generateRecipe(ingredientList, dietPreference, allergyList = []) {
  const dietNote = dietPreference && dietPreference !== 'None'
    ? `The recipe MUST be compatible with ALL of these diets: ${dietPreference}.`
    : '';

  const allergyNote = allergyList && allergyList.length > 0
    ? `\nCRITICAL: The recipe MUST STRICTLY AVOID these allergies/ingredients: ${allergyList.join(', ')}.`
    : '';

  const prompt = `You are a creative chef. Given these available ingredients, create a recipe.
Available ingredients: ${ingredientList.join(', ')}
${dietNote}${allergyNote}

Return a JSON object with exactly these fields:
{
  "title": "Recipe title",
  "ingredients": ["quantity unit ingredient", ...],
  "ingredientNames": ["ingredient name only", ...],
  "instructions": ["Step 1...", "Step 2...", ...],
  "nutrition": { "cals": estimated_calories_number, "protein": estimated_protein_grams_number }
}

Use the available ingredients as the base. You may add common pantry staples (salt, pepper, oil, garlic, etc.) if needed. Be specific with quantities. Keep instructions clear and concise (4-6 steps). Estimate realistic nutrition values.`;

  return await callGroq([
    { role: 'system', content: 'You are a professional chef assistant. Always respond with valid JSON.' },
    { role: 'user', content: prompt },
  ]);
}

export async function scanIngredientsFromImage(imageBase64) {
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
    { role: 'system', content: 'You are a food ingredient recognition assistant. Always respond with valid JSON.' },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    },
  ], GROQ_VISION_MODEL);
}

export async function validateIngredient(name, dietPreference, allergyList = [], freshnessData = {}) {
  const dietNote = dietPreference && dietPreference !== 'None'
    ? `\nThe user follows these diets: ${dietPreference}.`
    : '';

  const allergyNote = allergyList.length > 0
    ? `\nThe user has these allergies: ${allergyList.join(', ')}.`
    : '';

  const today = new Date().toISOString().split('T')[0];

  const freshnessNote = freshnessData.freshness
    ? `\nVisual freshness assessment from image scan: freshness="${freshnessData.freshness}", freshnessScore=${freshnessData.freshnessScore}, condition="${freshnessData.condition || 'none'}".
Adjust the expiry estimate based on this visual condition:
- "fresh" (score ~0.8-1.0): use the full typical shelf life
- "good" (score ~0.6-0.8): reduce shelf life by ~20%
- "aging" (score ~0.4-0.6): reduce shelf life by ~50%, the item is already partway through its life
- "questionable" (score ~0.2-0.4): the item should be used within 1-2 days or discarded
- "spoiled" (score ~0.0-0.2): the item should NOT be consumed, set expiry to today or past`
    : '';

  const prompt = `The user wants to add "${name}" to their food pantry. Today's date is ${today}.

Determine if this is a valid food ingredient or grocery item. Be reasonable — accept actual foods, beverages, condiments, spices, cooking ingredients, etc. Reject things that are clearly not food (e.g., "laptop", "soap", "chair", random gibberish).
${dietNote}${allergyNote}${freshnessNote}
Also check if this ingredient conflicts with the user's diet or allergies. For example, meat conflicts with a Vegetarian/Vegan diet, dairy conflicts with a Vegan diet or Lactose allergy, peanuts conflict with a Peanut allergy, shellfish with a Shellfish allergy, etc.

Also estimate a typical expiration date for this ingredient based on average shelf life when stored properly. Use today's date (${today}) as the purchase date. For example: fresh meat ~3-5 days, milk ~7-10 days, eggs ~3-4 weeks, canned goods ~1-2 years, fresh fruits/vegetables ~5-10 days, spices ~6 months, etc.${freshnessData.freshness ? ' IMPORTANT: Adjust the expiry date based on the visual freshness assessment provided above.' : ''}

Return a JSON object:
{
  "isFood": true or false,
  "correctedName": "Properly capitalized ingredient name (or null if not food)",
  "category": "one of: ${CATEGORIES.join(', ')} (or null if not food)",
  "estimatedExpiryDate": "YYYY-MM-DD format estimated expiration date adjusted for visual condition (or null if not food)",
  "freshnessWarning": "Brief warning about food condition if freshness is 'aging', 'questionable', or 'spoiled' (or null if fresh/good)",
  "dietConflict": true or false (whether it conflicts with the user's diet),
  "allergyConflict": true or false (whether it matches any of the user's allergies),
  "warning": "Brief warning message if there is a diet or allergy conflict (or null if no conflict)",
  "reason": "Brief reason if rejected as not food"
}`;

  return await callGroq([
    { role: 'system', content: 'You are a food ingredient validation assistant. Always respond with valid JSON.' },
    { role: 'user', content: prompt },
  ]);
}

export async function scanIngredientsFromText(description) {
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
    { role: 'system', content: 'You are a food ingredient recognition assistant. Always respond with valid JSON.' },
    { role: 'user', content: prompt },
  ]);
}
