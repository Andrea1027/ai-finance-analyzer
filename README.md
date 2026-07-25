# AI Finance Analyzer — Foundation (v0.1)

This is the first stage of the project: **CSV upload + accumulating data model.**
No dashboard yet — that's next. Right now the goal is to prove the pipeline:
Spendee CSV → parsed → stored in the cloud → safe to re-upload without duplicates.

## What's included

- `supabase/schema.sql` — the database schema (tables, security rules)
- `src/lib/csvParser.ts` — parses the exact Spendee CSV format
- `src/lib/importTransactions.ts` — saves parsed data to Supabase, creates categories, prevents duplicates
- `src/components/AuthGate.tsx` — simple email magic-link login (so you and friends each get private accounts)
- `src/components/CsvUpload.tsx` — the upload UI
- `src/App.tsx` — wires it together

## Setup (step by step)

### 1. Create a free Supabase project
Go to [supabase.com](https://supabase.com) → New Project. Pick any name/region, set a database password (save it somewhere).

### 2. Run the schema
In your Supabase project, go to **SQL Editor** → New query → paste the entire contents of `supabase/schema.sql` → Run.

This creates all the tables and locks each user's data to only be visible to them (Row Level Security).

### 3. Get your API keys
In Supabase: **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

### 4. Configure the app
```bash
cp .env.example .env.local
```
Paste your URL and anon key into `.env.local`.

### 5. Install and run
```bash
npm install
npm run dev
```
Open the local URL it prints (usually `http://localhost:5173`).

### 6. Try it
Sign in with your email (you'll get a magic link — Supabase sends it automatically, no email server setup needed on the free tier). Then upload your Spendee CSV.

## How the pipeline works (for learning)

1. **Parse**: `csvParser.ts` reads the raw CSV text and turns each row into a clean object — converting the amount string to a number, the date to a proper timestamp, and tagging which calendar month it belongs to.
2. **Categories**: `importTransactions.ts` checks which category names are new and creates them automatically with a default icon/color, so the UI has something to render later.
3. **Uploads log**: every CSV you import gets one row in `uploads`, so later we can show "you've imported June, July, August..." and detect gaps.
4. **Transactions accumulate**: unlike Spendee's own view, nothing here gets overwritten. Every import appends to the same growing table. A database-level uniqueness rule quietly skips any row that's an exact duplicate (same date, amount, category, note) — so it's always safe to re-upload a file if you're not sure whether you already imported it.

## What's NOT built yet (on purpose)

- The visual dashboard (trends, category breakdown charts, budget vs. actual)
- The AI benchmark-setting flow (first-time onboarding)
- AI-generated insights ("you're overspending on X vs. last month")

We're building this in stages so each piece is solid before the next depends on it. Once you've got this running and successfully imported your CSV, we'll move to the dashboard.

## Deploying (when ready, still free)

Push this folder to a GitHub repo, then import it on [vercel.com](https://vercel.com) (free tier). Add the same two env vars in Vercel's project settings. Every friend you invite just needs their own email to sign in — their data stays completely separate from yours.
