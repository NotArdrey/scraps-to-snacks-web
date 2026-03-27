# Scraps to Snacks Implementation Checklist

Date: 2026-03-21

## 1) Target Architecture

- Frontend: React application (not Vite-specific).
- Backend: Supabase (Auth, Postgres, Storage, Realtime, Edge Functions).
- AI Services:
  - Groq Vision for pantry image understanding.
  - Groq LLM for recipe generation with dietary constraints.
- Core Modules:
  - Auth and onboarding.
  - Subscription and entitlements.
  - Pantry and magic scan.
  - Recipe generation and cookbook.
  - History, analytics, and social/shared pantry.

## 1.1) Implementation Ownership

- Backend implementation agent: GPT-5.3-Codex.
- Frontend implementation agent: Claude.
- Frontend framework requirement: React.
- Explicit note: do not position the frontend as Vite; Vite may be a tooling option, but the frontend stack is React.

## 2) 3NF Data Model (Required)

This schema is intentionally normalized to Third Normal Form (3NF):

- 1NF: all attributes are atomic, no repeating columns.
- 2NF: non-key attributes depend on the full key (especially in junction tables).
- 3NF: no transitive dependencies (facts stored once, referenced by foreign keys).

### 2.1 Core Identity and Account Tables

- auth.users (managed by Supabase Auth).
- app_user_profiles
  - user_id PK/FK to auth.users.id
  - display_name
  - locale
  - timezone
  - onboarding_completed_at
  - created_at, updated_at

### 2.2 Subscription Tables

- subscription_plans
  - id PK
  - plan_code UNIQUE (trial, monthly, annual)
  - display_name
  - billing_period_days
  - is_active
- user_subscriptions
  - id PK
  - user_id FK
  - plan_id FK
  - status (trialing, active, past_due, canceled, expired)
  - starts_at, ends_at
  - provider_ref
  - created_at, updated_at

Rationale for 3NF:
- Plan details are only in subscription_plans.
- user_subscriptions stores only user-plan relationship and lifecycle fields.

### 2.3 Preferences and Dietary Constraints

- diet_types
  - id PK
  - code UNIQUE (vegetarian, vegan, keto, etc.)
  - name
- allergy_types
  - id PK
  - code UNIQUE (nuts, dairy, shellfish, etc.)
  - name
- user_diet_preferences
  - user_id FK
  - diet_type_id FK
  - created_at
  - PK (user_id, diet_type_id)
- user_allergy_preferences
  - user_id FK
  - allergy_type_id FK
  - severity (low, medium, high)
  - created_at
  - PK (user_id, allergy_type_id)

Rationale for 3NF:
- No multi-value columns on profile.
- Diet/allergy vocabularies are separated from user relationships.

### 2.4 Pantry and Ingredient Tables

- households
  - id PK
  - owner_user_id FK
  - name
  - created_at
- household_members
  - household_id FK
  - user_id FK
  - role (owner, member)
  - joined_at
  - PK (household_id, user_id)
- ingredients
  - id PK
  - canonical_name UNIQUE
  - category
  - default_unit
- pantry_items
  - id PK
  - household_id FK
  - ingredient_id FK
  - quantity
  - unit
  - source (manual, scan)
  - acquired_at
  - expires_at
  - status (available, used, expired, discarded)
  - created_by_user_id FK
  - created_at, updated_at
- pantry_item_events
  - id PK
  - pantry_item_id FK
  - event_type (add, update, deduct, expire, discard)
  - delta_quantity
  - reason
  - actor_user_id FK
  - created_at

Rationale for 3NF:
- Ingredient metadata appears once in ingredients.
- Inventory quantities and dates are per pantry item row.
- Audit/history is separated into pantry_item_events.

### 2.5 Scan Pipeline Tables

- scan_jobs
  - id PK
  - user_id FK
  - household_id FK
  - image_path
  - status (queued, processing, completed, failed)
  - provider (groq_vision)
  - started_at, finished_at
  - error_message
- scan_detections
  - id PK
  - scan_job_id FK
  - ingredient_id FK
  - confidence_score
  - detected_quantity
  - detected_unit
  - bbox_json
- expiry_predictions
  - id PK
  - pantry_item_id FK
  - scan_job_id FK
  - predicted_expiry_date
  - confidence_score
  - model_version
  - created_at

Rationale for 3NF:
- Raw scan execution is separated from resulting detections.
- Predictions are linked to pantry items and model metadata.

### 2.6 Recipe and Cookbook Tables

- recipes
  - id PK
  - generated_by_user_id FK
  - title
  - instructions_json
  - nutrition_json
  - model_provider
  - model_version
  - created_at
- recipe_ingredients
  - recipe_id FK
  - ingredient_id FK
  - quantity
  - unit
  - is_optional
  - PK (recipe_id, ingredient_id)
- saved_recipes
  - id PK
  - user_id FK
  - recipe_id FK
  - source (generated, imported)
  - saved_at
  - UNIQUE (user_id, recipe_id)
- cooking_events
  - id PK
  - user_id FK
  - recipe_id FK
  - event_type (cooked, rated)
  - rating_value
  - created_at

Rationale for 3NF:
- Recipe structure is separated from user-specific saved state.
- Ingredient list is normalized as recipe_ingredients.

### 2.7 Analytics Table

- analytics_events
  - id PK
  - user_id FK
  - household_id FK
  - event_name
  - event_props_json
  - occurred_at

Rationale for 3NF:
- Event facts are append-only and isolated from transactional tables.

## 3) SQL Implementation Checklist

## 3.1 Database Setup

- [x] Create dedicated schema for app tables (example: app).
- [x] Enable required extensions (pgcrypto, pg_trgm if needed).
- [x] Create enum types where controlled vocabularies are stable.
- [x] Create all lookup tables first (diet_types, allergy_types, subscription_plans).
- [x] Seed lookup and plan data with idempotent migrations.

## 3.2 Table Creation Order (Dependency Safe)

- [x] app_user_profiles
- [x] subscription_plans
- [x] user_subscriptions
- [x] diet_types
- [x] allergy_types
- [x] user_diet_preferences
- [x] user_allergy_preferences
- [x] households
- [x] household_members
- [x] ingredients
- [x] pantry_items
- [x] pantry_item_events
- [x] scan_jobs
- [x] scan_detections
- [x] expiry_predictions
- [x] recipes
- [x] recipe_ingredients
- [x] saved_recipes
- [x] cooking_events
- [x] analytics_events

## 3.3 Constraint Checklist

- [x] Add NOT NULL constraints to all mandatory business fields.
- [x] Add UNIQUE constraints to natural keys:
  - [x] ingredients.canonical_name
  - [x] subscription_plans.plan_code
  - [x] diet_types.code
  - [x] allergy_types.code
  - [x] saved_recipes (user_id, recipe_id)
- [x] Add CHECK constraints:
  - [x] confidence_score between 0 and 1
  - [x] quantity > 0 where applicable
  - [x] rating_value between 1 and 5
  - [x] ends_at >= starts_at for subscriptions
- [x] Add foreign keys with ON DELETE strategy:
  - [x] CASCADE for pure junction rows.
  - [x] RESTRICT for critical historical records.

## 3.4 Index Checklist

- [x] user_subscriptions(user_id, status, ends_at)
- [x] pantry_items(household_id, status, expires_at)
- [x] pantry_items(ingredient_id)
- [x] scan_jobs(user_id, created_at desc)
- [x] expiry_predictions(pantry_item_id)
- [x] recipes(generated_by_user_id, created_at desc)
- [x] analytics_events(user_id, occurred_at desc)
- [x] GIN index for frequently queried JSON fields if required.

## 3.5 RLS and Security Checklist

- [x] Enable RLS on all app tables.
- [x] Profiles: user can read/update only own profile.
- [x] Household membership policy:
  - [x] member can read household pantry.
  - [x] member can modify pantry_items and pantry_item_events.
- [x] user_subscriptions readable by owner only.
- [x] recipes/saved_recipes scoped by owner unless explicitly shared.
- [x] scan_jobs and scan_detections scoped by owner/household membership.
- [x] analytics_events insert-only from trusted server or edge function.
- [x] Add service-role-only policies for privileged operations.

## 3.6 Trigger and Function Checklist

- [x] updated_at trigger for mutable tables.
- [x] Auto-create app_user_profiles row after auth signup.
- [x] Pantry deduction function on cooking event:
  - [x] Validate item availability.
  - [x] Create pantry_item_events rows.
  - [x] Update pantry_items quantities atomically.
- [x] Expiry recalculation function after scan detection ingestion.

## 4) Supabase Edge Function Checklist

## 4.1 scan-pantry Function

- [ ] Accept image and household context.
- [ ] Verify JWT and household access.
- [ ] Store image in private bucket.
- [ ] Insert scan_jobs row with status processing.
- [ ] Call Groq Vision.
- [ ] Map detections to ingredients using canonical matching.
- [ ] Insert scan_detections rows.
- [ ] Create or update pantry_items.
- [ ] Generate expiry_predictions.
- [ ] Mark scan_jobs completed or failed with error message.

## 4.2 generate-recipe Function

- [ ] Verify active subscription.
- [ ] Fetch user diet and allergy constraints.
- [ ] Fetch selected pantry ingredients.
- [ ] Build strict system prompt with safety constraints.
- [ ] Call Groq model and validate JSON response schema.
- [ ] Persist recipes and recipe_ingredients.
- [ ] Return stable response payload for React app.

## 4.3 cook-recipe Function

- [ ] Validate recipe ownership or shared access.
- [ ] Deduct pantry quantities in transaction.
- [ ] Insert pantry_item_events and cooking_events.
- [ ] Return updated pantry state.

## 5) React Frontend Implementation Checklist

## 5.1 App Startup and Auth

- [x] Initialize local cache layer and Supabase client.
- [x] Implement AuthGate stream listener.
- [x] Route unauthenticated users to splash/login.
- [x] Route newly created users to subscription flow.
- [x] Route subscribed users without profile to onboarding.
- [x] Route active users to main scaffold.

## 5.2 Subscription UI

- [x] Build plan selector (trial, monthly, annual).
- [x] Persist selection to user_subscriptions.
- [x] Display entitlement state and renewal date.
- [x] Handle expired or canceled subscription states.

## 5.3 Onboarding UI

- [x] Multi-select diets from diet_types.
- [x] Multi-select allergies from allergy_types with severity.
- [x] Save preferences using junction tables.
- [x] Mark onboarding_completed_at.

## 5.4 Pantry UI

- [x] Pantry list by household and status.
- [x] Expiry-first sorting and badges.
- [x] Add/edit/delete pantry item actions.
- [x] Manual ingredient entry with canonical ingredient picker.
- [x] Realtime updates for shared household pantry.

## 5.5 Magic Scan UI

- [x] Camera capture and permission handling.
- [x] Upload preview and progress state.
- [x] Show detection results and confidence.
- [x] Allow user correction before save.
- [x] Persist accepted results into pantry.

## 5.6 Recipe UI

- [x] Ingredient selector from available pantry items.
- [x] Generate recipe action with loading and cancellation.
- [x] Render recipe JSON into readable cards/steps.
- [x] Save to cookbook.
- [x] Cooked it action with optional rating.

## 5.7 Cookbook and History UI

- [x] Favorites list from saved_recipes.
- [x] Cooking history from cooking_events.
- [x] Filter by diet, ingredient, and date.

## 6) API Contracts and Validation Checklist

- [ ] Define request and response JSON schemas for all edge functions.
- [ ] Validate inbound payloads server-side.
- [ ] Validate Groq model output against strict schema before DB insert.
- [ ] Return machine-readable error codes.
- [ ] Include correlation_id for observability.

## 7) Testing Checklist

## 7.1 Database Tests

- [ ] Migration smoke test on clean DB.
- [ ] FK and CHECK constraints test coverage.
- [ ] RLS policy tests for allow/deny paths.
- [ ] Transaction integrity test for cook-recipe flow.

## 7.2 Edge Function Tests

- [ ] Happy-path tests for scan-pantry, generate-recipe, cook-recipe.
- [ ] Unauthorized and forbidden access tests.
- [ ] Provider failure and timeout tests.
- [ ] JSON schema validation failure tests.

## 7.3 React Frontend Tests

- [ ] AuthGate route transition tests.
- [ ] Pantry CRUD widget and state tests.
- [ ] Recipe generation and save flow tests.
- [ ] Offline cache and sync conflict tests.

## 8) Observability and Operations Checklist

- [ ] Structured logs with request_id and user_id.
- [ ] Error alerts for edge function failures.
- [ ] Dashboard metrics:
  - [ ] scans/day
  - [ ] recipe generations/day
  - [ ] pantry waste reduction proxy
  - [ ] subscription conversion
- [ ] Dead-letter handling strategy for failed scan jobs.
- [ ] Backup and restore drill for Postgres.

## 9) Performance Checklist

- [ ] Use pagination for large pantry and cookbook lists.
- [ ] Cache lookup tables on client.
- [ ] Batch inserts for scan_detections.
- [ ] Minimize N+1 queries in recipe and pantry fetch flows.
- [ ] Add query plans for top 10 expensive queries.

## 10) Launch Readiness Checklist

- [ ] Production environment variables configured.
- [ ] JWT verification enabled on all edge functions.
- [ ] RLS policies reviewed and approved.
- [ ] Data retention policy documented.
- [ ] Terms and privacy notices cover AI inference and image upload.
- [ ] Rollback plan documented per migration.
- [ ] Post-launch monitoring runbook prepared.

## 11) 3NF Verification Checklist (Final Gate)

Use this before each schema release:

- [x] No repeating groups or array-like business columns storing relational facts.
- [x] Every non-key attribute depends on the key, the whole key, and nothing but the key.
- [x] Lookup data (plans, diets, allergies, ingredients) is separated from transactional data.
- [x] Junction tables are used for many-to-many relationships.
- [x] No table stores derived or duplicated attributes that can drift from source.
- [x] All transitive dependencies are removed.

## 12) Suggested Initial Migration Batches

- Batch A: Identity, profile, plans, subscriptions, diets, allergies, preference junctions.
- Batch B: Households, members, ingredients, pantry_items, pantry_item_events.
- Batch C: scan_jobs, scan_detections, expiry_predictions.
- Batch D: recipes, recipe_ingredients, saved_recipes, cooking_events, analytics_events.
- Batch E: RLS policies, triggers, helper functions, indexes.

## 13) Definition of Done

- [x] 3NF schema implemented and reviewed.
- [ ] RLS active and tested for all tables.
- [ ] Edge functions deployed with JWT verification.
- [x] React flow complete from auth to cooked event.
- [ ] Automated tests passing in CI.
- [ ] Monitoring, alerts, and rollback plan validated.
