# Deployment Notes

## Overview

This repo is now the **single source of truth** for both:

1. **The Bay.Digital dashboard app** (served at `dashboard.bay.digital`)
2. **The Bay.Digital marketing site** (the homepage + `/domains`, served at `bay.digital`)

Both are the **same Vite + React build**. Which experience a visitor sees is
decided at runtime by the hostname (see `src/pages/Index.tsx`):

- On `dashboard.bay.digital`, visiting `/` redirects to login/dashboard (existing behaviour).
- On `bay.digital` (and on `localhost` during development), `/` renders the new marketing homepage.

> The previous static marketing site (plain HTML/CSS/JS) lived **outside** this
> repo in the parent `Baydigital site/` folder and was deployed manually via
> **Netlify Drop**. That manual process should be retired in favour of
> Git-based deploys from this repo (see below).

## Future edits

- **Make all marketing edits here in Cursor.** Do not edit the old static
  HTML files in the parent folder anymore — they are no longer the source of truth.
- Marketing pages/components live in:
  - `src/pages/marketing/Home.tsx` — homepage
  - `src/pages/marketing/Domains.tsx` — `/domains`
  - `src/components/marketing/*` — header, footer, hero mockup, domain search, wordmark
- Brand colours are defined as the `bay.*` palette in `tailwind.config.ts`.
- The logo lives at `src/assets/logo.png` (imported by the app) and `public/logo.png`.

## Build & output

- **Build command:** `npm run build` (or `bun run build`)
- **Output / publish directory:** `dist`
- **SPA routing:** `public/_redirects` already contains `/* /index.html 200`,
  which Netlify needs so client-side routes like `/domains` work on refresh.
- **Node version:** use Node 18+ (set in Netlify if needed).

## Connect Netlify to this Git repo (replaces Netlify Drop)

1. In Netlify, create/connect a site to this Git repository (or update the
   existing `bay.digital` site to use **continuous deployment from Git** instead
   of manual Drop uploads).
2. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Environment variables (Site settings -> Environment) — these are needed at
   **build time** because the app reads them via Vite:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   (Mirror what's in the local `.env`.)
4. Domains:
   - Point `bay.digital` at this Netlify site.
   - `dashboard.bay.digital` can point at the same build (the hostname logic
     handles the difference) **or** stay on its current Lovable deploy — confirm
     which before switching DNS.

## To verify in Netlify (if build settings are unclear)

- Confirm the **base directory** is the repo root (where `package.json` is).
- Confirm **publish directory** is `dist` (not `build` or `public`).
- Confirm the `VITE_*` env vars above are set, or the app will fail to reach Supabase.
- Confirm the `_redirects` file is being published (it's in `public/`, so it will be
  copied into `dist/` automatically).

## Domain search backend

- The `/domains` page and homepage domain search call the Supabase edge function
  `check-domain` (`supabase/functions/check-domain/index.ts`).
- It currently returns a **mock** result (any domain containing "taken" is shown
  as unavailable). The frontend also falls back to the same mock if the function
  isn't deployed, so the page works regardless.
- Real availability via **Synergy Wholesale** is scaffolded but disabled. See the
  comments/TODOs in the function. Secrets must be set as Supabase secrets, never
  in client code:
  - `SYNERGY_RESELLER_ID`, `SYNERGY_API_KEY`, `SYNERGY_PIN`
  - Note the **IP whitelisting** caveat documented in the function.
