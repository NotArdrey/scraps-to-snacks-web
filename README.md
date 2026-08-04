# Scraps to Snacks Web

Scraps to Snacks Web is a React application that helps users identify available food, generate recipes, and estimate ingredient or meal costs. AI requests are handled through a Supabase Edge Function so provider credentials are not exposed to the browser.

## Implemented features

- Pantry and ingredient workflows
- Text- and image-assisted recipe generation
- Structured recipe responses with ingredient, instruction, and cost information
- Invalid-output detection, request limits, timeout handling, and provider-error normalization
- Optional web-assisted price research
- Supabase authentication and application data
- Responsive routed React interface
- Page-documentation screenshot tooling and Playwright development dependency

## Technology

- React 19 and React Router
- Vite 8
- Supabase JavaScript client and Edge Functions
- Groq-compatible text and vision models
- Lucide React

## Local development

```bash
npm install
npm run dev
```

Configure only the public Supabase URL and publishable/anonymous key in the browser environment. Keep model-provider keys, Supabase service-role credentials, and any web-search provider secrets in Supabase Edge Function secret storage.

## Verification

```bash
npm run lint
npm run build
```

The AI backend is located under `supabase/functions/ai`. Generated food and price information should be reviewed for allergies, food safety, current local pricing, and dietary requirements.
