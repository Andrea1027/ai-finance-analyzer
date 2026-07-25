// Raw row shape as it appears in a Spendee CSV export
export interface SpendeeRawRow {
  Date: string;
  Wallet: string;
  Type: string;                 // 'Expense' | 'Income' | 'Transfer'
  'Category name': string;
  Amount: string;                // e.g. "-85.80000000"
  Currency: string;
  Note: string;
  Labels: string;
  Author: string;
}

// Normalized transaction, ready to insert into Supabase
export interface ParsedTransaction {
  tx_date: string;        // ISO timestamp
  tx_month: string;       // 'YYYY-MM-01'
  wallet: string;
  type: 'Expense' | 'Income' | 'Transfer';
  category_name: string;
  amount: number;         // negative = expense, positive = income
  currency: string;
  note: string | null;
  labels: string | null;
  author: string | null;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  wallet: string | null;
  earliestDate: string | null;
  latestDate: string | null;
  skippedRows: number;
  warnings: string[];
}

// Default icon/color mapping for known Spendee categories.
// Anything not in this list falls back to a generic default
// and can be customized later in the UI.
export const DEFAULT_CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  'Food & Drink':     { icon: '🍜', color: '#f97316' },
  'Groceries':        { icon: '🛒', color: '#84cc16' },
  'Bills & Fees':     { icon: '🧾', color: '#64748b' },
  'Healthcare':       { icon: '💊', color: '#ef4444' },
  'Transport':        { icon: '🚌', color: '#3b82f6' },
  'Shopping':         { icon: '🛍️', color: '#ec4899' },
  'Gifts':            { icon: '🎁', color: '#a855f7' },
  'Beauty':           { icon: '💄', color: '#f472b6' },
  'Sport & Hobbies':  { icon: '🏸', color: '#22c55e' },
  'Entertainment':    { icon: '🎬', color: '#eab308' },
  'Work':             { icon: '💼', color: '#0ea5e9' },
  'Other':            { icon: '📦', color: '#94a3b8' },
};

export const FALLBACK_CATEGORY_STYLE = { icon: '💰', color: '#6366f1' };

// ---- Generic CSV import (non-Spendee sources) ----

export interface ColumnMapping {
  date: string;
  amount: string;
  category: string;
  note?: string;
  wallet?: string;
  currency?: string;
}

// How the source file encodes expenses.
// 'as_negative'  — file already uses negative numbers for expenses (Spendee-like)
// 'as_positive'  — file lists spending as plain positive numbers (assumes no income rows)
export type AmountSign = 'as_negative' | 'as_positive';

export type DateFormatHint = 'auto' | 'YMD' | 'DMY' | 'MDY';

export interface SavedMapping {
  header_signature: string;
  source_name: string;
  column_map: ColumnMapping;
  amount_sign: AmountSign;
  date_format: DateFormatHint;
  currency: string;
}
