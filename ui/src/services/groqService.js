const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(messages, model = 'llama-3.3-70b-versatile') {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
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
    ? `The recipe MUST be ${dietPreference}-friendly.`
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
  ], 'llama-3.2-90b-vision-preview');
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
