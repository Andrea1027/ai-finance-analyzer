-- ============================================================
-- AI Finance Analyzer — Database Schema
-- Run this in your Supabase project's SQL Editor (SQL Editor tab)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- CATEGORIES
-- Normalizes category names from CSV imports and stores
-- display info (icon, color) for the dashboard UI.
-- ------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,              -- e.g. "Food & Drink" (as it appears in Spendee)
  icon text default '💰',           -- emoji or icon key, editable later
  color text default '#6366f1',    -- hex color for charts
  is_income boolean default false, -- true for income categories
  created_at timestamptz default now(),
  unique (user_id, name)
);

-- ------------------------------------------------------------
-- UPLOADS
-- One row per CSV file imported. Lets us track history and
-- avoid double-importing the same file.
-- ------------------------------------------------------------
create table uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  wallet text,                     -- from the "Wallet" column
  row_count int default 0,
  earliest_date date,
  latest_date date,
  uploaded_at timestamptz default now()
);

-- ------------------------------------------------------------
-- TRANSACTIONS
-- The core accumulating table. Every upload APPENDS rows here
-- (never overwrites), which is what makes cross-month trend
-- analysis possible.
-- ------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid references uploads(id) on delete set null,
  category_id uuid references categories(id) on delete set null,

  tx_date timestamptz not null,
  tx_month date not null,          -- first-of-month, generated, for fast grouping
  wallet text,
  type text not null,              -- 'Expense' | 'Income' | 'Transfer'
  category_name text not null,     -- raw name from CSV, kept for reference
  amount numeric(14,2) not null,   -- negative = expense, positive = income
  currency text not null,
  note text,
  labels text,
  author text,

  created_at timestamptz default now()
);

create index idx_transactions_user_month on transactions(user_id, tx_month);
create index idx_transactions_user_category on transactions(user_id, category_id);

-- ------------------------------------------------------------
-- DEDUPE GUARD
-- Prevents importing the exact same transaction twice if the
-- same CSV (or an overlapping date range) is uploaded again.
-- Plain columns only (no expressions) so Supabase's upsert
-- onConflict can reference this index directly.
-- Note: two rows with the same date/amount/category and both
-- NULL notes will NOT be caught as duplicates (Postgres treats
-- NULL <> NULL) — acceptable tradeoff for a personal-use app.
-- ------------------------------------------------------------
create unique index idx_transactions_dedupe on transactions (
  user_id, tx_date, amount, category_name, note
);

-- ------------------------------------------------------------
-- BENCHMARKS
-- The AI-set (or user-edited) budget targets per category.
-- ------------------------------------------------------------
create table benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  monthly_budget numeric(14,2),     -- absolute HKD/currency amount
  percent_of_total numeric(5,2),    -- alternative: % of total spend
  set_by text default 'ai',         -- 'ai' | 'user'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, category_id)
);

-- Overall monthly budget (separate from per-category benchmarks)
create table budget_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_total_budget numeric(14,2),
  onboarded boolean default false,   -- has the user completed the first-upload benchmark flow?
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- IMPORT MAPPINGS
-- Remembers how to interpret a CSV from a non-Spendee source,
-- keyed by that file's header signature, so the user is only
-- asked to map columns once per source app.
-- ------------------------------------------------------------
create table import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  header_signature text not null,   -- sorted, pipe-joined header list
  source_name text,                 -- user-given label, e.g. "Mint export"
  column_map jsonb not null,        -- { date, amount, category, note?, wallet?, currency? }
  amount_sign text not null,        -- 'as_negative' | 'as_positive'
  date_format text not null,        -- 'auto' | 'YMD' | 'DMY' | 'MDY'
  currency text not null,
  created_at timestamptz default now(),
  unique (user_id, header_signature)
);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Every table is locked to auth.uid() = user_id so each user
-- (you, your friends) only ever sees their own data.
-- ------------------------------------------------------------
alter table categories enable row level security;
alter table uploads enable row level security;
alter table transactions enable row level security;
alter table benchmarks enable row level security;
alter table budget_settings enable row level security;
alter table import_mappings enable row level security;

create policy "own rows only" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on benchmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on budget_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on import_mappings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
