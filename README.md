# 💰 AI Finance Analyzer

A free, open-source personal finance analyzer that goes beyond what typical budgeting apps show you. Upload monthly CSV exports from any budgeting app (Spendee, bank exports, etc.) and it accumulates them into a growing history — so you can see spending trends across months, get an AI-generated budget benchmark from your own data, and receive AI-generated spending insights, all in a visual dashboard.

**Live demo:** https://ai-finance-analyzer-blush.vercel.app

## Why this exists

Most budgeting apps only show you one month at a time — a total and a per-category breakdown. They rarely let you see how your spending is *trending* across months, and they don't help you set or track a realistic budget based on your own history. This project accumulates every CSV you upload into one growing dataset, so those questions actually become answerable.

## Features

- **Accumulating CSV import** — every upload adds to your history rather than replacing it; duplicate transactions are automatically skipped, so re-uploading a file you're unsure about is always safe.
- **Works with any budgeting app's export, not just Spendee** — recognized formats import automatically; unrecognized formats trigger a one-time column-mapping screen (map date/amount/category/etc.), which is then remembered for that file format going forward.
- **Visual dashboard** — a "pulse strip" comparing this month's cumulative spend against last month's at the same point, a ranked category breakdown with budget markers, and a month-over-month trend chart.
- **AI-generated budget benchmark** — analyzes your actual spending history and proposes a monthly budget (overall and per category) with brief reasoning, fully editable before saving. Falls back to a rule-based estimate if the AI call fails.
- **AI-generated insights** — forward-looking spending insights as visual cards: budget warnings, month-end pace projections, and purchase-frequency-based suggestions (e.g. many small purchases in one category), not just budget-vs-actual restatements.
- **Multi-currency** — pick a base currency; all transactions are converted live via a free exchange-rate API and cached daily.
- **Bilingual (English / 中文)** — full UI translation, and AI-generated content (budget reasoning, insights) is generated in the selected language too.
- **Multi-user, private by default** — Google sign-in, with Row Level Security on every table so each user's data is completely isolated from every other user's, even on shared infrastructure.

## Tech stack

- **Frontend:** React + TypeScript + Vite, Recharts for charts, hand-rolled i18n (no external library)
- **Backend:** Supabase (Postgres database, Auth, Row Level Security, Edge Functions)
- **AI:** OpenRouter's free model router (`openrouter/free`, currently serving Llama 3.3), called server-side from Supabase Edge Functions so the API key never reaches the browser
- **Exchange rates:** open.er-api.com (free, no API key)
- **Hosting:** Vercel (frontend), Supabase (database + Edge Functions) — entirely on free tiers

## Project structure

```
src/
  components/     UI components (Dashboard, CsvUpload, BenchmarkSetup, InsightsPanel, etc.)
  lib/            Data layer: CSV parsing, aggregations, Supabase hooks, i18n, exchange rates
supabase/
  schema.sql      Full database schema (tables, RLS policies)
  functions/      Edge Functions (generate-benchmark, generate-insights)
```

## Setup

### 1. Create a Supabase project
Free at [supabase.com](https://supabase.com). Once created, run the entire contents of `supabase/schema.sql` in the SQL Editor to create all tables and RLS policies.

### 2. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in your Supabase Project URL and anon/publishable key (found under Project Settings → API).

### 3. Set up Google sign-in
- Create an OAuth Client ID in [Google Cloud Console](https://console.cloud.google.com) (APIs & Services → Credentials), with authorized redirect URI `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Enable the Google provider in Supabase (Authentication → Providers) and paste in the Client ID/Secret

### 4. Deploy the Edge Functions
Requires the [Supabase CLI](https://supabase.com/docs/guides/cli):
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy generate-benchmark
supabase functions deploy generate-insights
```

### 5. Get a free OpenRouter API key
Sign up at [openrouter.ai](https://openrouter.ai) (no credit card needed), then set it as a secret:
```bash
supabase secrets set OPENROUTER_API_KEY=your-key-here
```

### 6. Install and run
```bash
npm install
npm run dev
```

### 7. Deploy (optional)
Push to GitHub, then import the repo on [Vercel](https://vercel.com), adding `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.

## Notes on the AI integration

Both AI features (budget benchmark and insights) call an open-weight model via OpenRouter's free router rather than a proprietary model API, so the whole project runs at zero cost. Both features degrade gracefully to a rule-based estimate if the AI call is ever unavailable, so the app never gets stuck.

## License

Personal project, built for free personal use. Not affiliated with Spendee or any budgeting app referenced.
