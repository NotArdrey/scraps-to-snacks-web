# Scraps2Snacks Stitch Design Brief

This brief describes the replacement page design now applied across the app. The direction is a practical kitchen operating system: crisp food imagery, solid work surfaces, restrained borders, green primary actions, amber decision cues, and coral danger states.

## Page Map

| Page | Route | Description | Design Treatment |
|---|---|---|---|
| Login | `/login` | Returning users sign in, confirm email callbacks, and request password reset instructions. | Split auth layout with a quiet form panel and full-bleed food photography. |
| Register | `/register` | New users create an account, choose a paid plan, accept terms, and enter checkout. | Registration form and plan selection use dense, scannable controls with the same image-led auth shell. |
| Reset Password | `/reset-password` | Users with a recovery session set a new password. | Focused single-task card on the redesigned app background. |
| Subscription | `/subscription` | Authenticated users without access choose a subscription plan. | Plan cards are restyled as straightforward purchase rows with clear primary action states. |
| Payment Success | `/payment/success` | PayMongo return screen verifies paid or pending checkout attempts. | Status card emphasizes one outcome, one next action, and calm confirmation language. |
| Payment Cancel | `/payment/cancel` | Users recover from canceled checkout and can retry or return to plans. | Compact recovery card with balanced primary and secondary actions. |
| Onboarding | `/onboarding` | New users set diet and allergy preferences before entering the app. | Preference chips become cleaner segmented choices with stronger selected states. |
| Pantry | `/pantry` | Users manage pantry items, expiry dates, categories, quantities, and recipe generation. | Primary workbench page with image hero, solid add form, readable table, expiry badges, and batch actions. |
| Magic Scan | `/scan` | Users upload or capture food images, review AI detections, and save items to pantry. | Scan workspace uses the same hero system and cleaner detection rows for review. |
| Cookbook | `/cookbook` | Users browse, edit, select, and delete saved AI recipes, with cookbook chat support. | Recipe cards, edit rows, toolbar, and chat widget use consistent surfaces and icon-first actions. |
| Account | `/account` | Users manage email, password, subscription details, preferences, and sign-out. | Account settings become a compact settings hub with image hero and clear rows. |
| Admin Dashboard | `/admin` | Admins review core metrics, recent users, pantry alerts, quick actions, and recipe activity. | Admin console moves to a solid operational dashboard style with dense panels and charts. |
| Admin Users | `/admin` users tab | Admins edit roles, plan assignments, subscription dates, and delete eligible users. | Data table styling prioritizes scanning, editable cells, and compact icon actions. |
| Admin Plans | `/admin` plans tab | Admins create, edit, activate, deactivate, and delete subscription plans. | Plan records use the same table and modal treatment as the rest of the console. |
| Admin Pantry | `/admin` pantry tab | Admins inspect and maintain pantry item records across households. | Pantry operations share table, modal, and action styling with admin users. |
| Admin Recipes | `/admin` recipes tab | Admins create, edit, and remove saved recipe records. | Recipe maintenance uses modal forms with structured ingredient and instruction rows. |

## Applied System

- Palette: leaf green primary, amber support, coral destructive, neutral ink and white surfaces.
- Layout: 8px surfaces, thin borders, less glass, fewer shadows, denser admin and table screens.
- Imagery: existing food photography remains the first visual signal for auth and app hero pages.
- Controls: primary, secondary, danger, checkbox, table, modal, chat, and nav styles now share one visual language.
- Logo: refreshed bowl, sprout, and snack sparkle mark in `BrandIcon`, `public/favicon.svg`, and `public/logo.svg`.
- Preferences: diet choices are clearly multi-select; custom diets, ingredient exclusions, allergy severity, cross-contamination avoidance, no-allergies, cuisines, cooking time, budget, skill, servings, meal types, favorite/disliked ingredients, macro targets, dirty-state save, reset, and clear actions now feed Pantry, Magic Scan, and recipe generation.
