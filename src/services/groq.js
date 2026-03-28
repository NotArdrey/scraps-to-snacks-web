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
  const prompt = `Analyze this image and identify all food ingredients you can see.

Return a JSON object with exactly this format:
{
  "detections": [
    { "name": "Ingredient name", "confidence": 0.95, "qty": 2 },
    ...
  ]
}

For each ingredient, provide:
- name: the common ingredient name (capitalize first letter)
- confidence: your confidence score between 0.0 and 1.0
- qty: estimated quantity count (default 1 if unsure)

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

export async function validateIngredient(name, dietPreference, allergyList = []) {
  const dietNote = dietPreference && dietPreference !== 'None'
    ? `\nThe user follows these diets: ${dietPreference}.`
    : '';

  const allergyNote = allergyList.length > 0
    ? `\nThe user has these allergies: ${allergyList.join(', ')}.`
    : '';

  const today = new Date().toISOString().split('T')[0];

  const prompt = `The user wants to add "${name}" to their food pantry. Today's date is ${today}.

Determine if this is a valid food ingredient or grocery item. Be reasonable — accept actual foods, beverages, condiments, spices, cooking ingredients, etc. Reject things that are clearly not food (e.g., "laptop", "soap", "chair", random gibberish).
${dietNote}${allergyNote}
Also check if this ingredient conflicts with the user's diet or allergies. For example, meat conflicts with a Vegetarian/Vegan diet, dairy conflicts with a Vegan diet or Lactose allergy, peanuts conflict with a Peanut allergy, shellfish with a Shellfish allergy, etc.

Also estimate a typical expiration date for this ingredient based on average shelf life when stored properly. Use today's date (${today}) as the purchase date. For example: fresh meat ~3-5 days, milk ~7-10 days, eggs ~3-4 weeks, canned goods ~1-2 years, fresh fruits/vegetables ~5-10 days, spices ~6 months, etc.

Return a JSON object:
{
  "isFood": true or false,
  "correctedName": "Properly capitalized ingredient name (or null if not food)",
  "category": "one of: ${CATEGORIES.join(', ')} (or null if not food)",
  "estimatedExpiryDate": "YYYY-MM-DD format estimated expiration date based on typical shelf life (or null if not food)",
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
