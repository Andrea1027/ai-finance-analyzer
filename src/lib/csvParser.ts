import Papa from 'papaparse';
import type { SpendeeRawRow, ParsedTransaction, ParseResult } from './types';

/**
 * Parses a Spendee CSV export into normalized transactions.
 *
 * Why PapaParse instead of split('\n'):
 * Spendee notes can contain embedded newlines and commas inside
 * quoted fields (see real export: "Underwear\n " spans two lines).
 * A naive line-splitter would corrupt those rows. PapaParse handles
 * RFC 4180 quoting correctly.
 */
export function parseSpendeeCSV(csvText: string): ParseResult {
  const result = Papa.parse<SpendeeRawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [...result.errors.map(e => `Row ${e.row}: ${e.message}`)];
  let skippedRows = 0;

  let wallet: string | null = null;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const row of result.data) {
    // Guard against blank trailing rows
    if (!row.Date || !row.Amount) {
      skippedRows++;
      continue;
    }

    const amount = parseFloat(row.Amount);
    if (Number.isNaN(amount)) {
      warnings.push(`Skipped row with unparseable amount: "${row.Amount}"`);
      skippedRows++;
      continue;
    }

    const date = new Date(row.Date);
    if (Number.isNaN(date.getTime())) {
      warnings.push(`Skipped row with unparseable date: "${row.Date}"`);
      skippedRows++;
      continue;
    }

    const isoDate = date.toISOString();
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;

    const type = normalizeType(row.Type);

    transactions.push({
      tx_date: isoDate,
      tx_month: monthKey,
      wallet: row.Wallet?.trim() || 'Unknown',
      type,
      category_name: row['Category name']?.trim() || 'Other',
      amount,
      currency: row.Currency?.trim() || 'HKD',
      note: row.Note?.trim() || null,
      labels: row.Labels?.trim() || null,
      author: row.Author?.trim() || null,
    });

    if (!wallet) wallet = row.Wallet?.trim() || null;
    if (!earliest || isoDate < earliest) earliest = isoDate;
    if (!latest || isoDate > latest) latest = isoDate;
  }

  return {
    transactions,
    wallet,
    earliestDate: earliest,
    latestDate: latest,
    skippedRows,
    warnings,
  };
}

function normalizeType(raw: string): 'Expense' | 'Income' | 'Transfer' {
  const t = (raw || '').trim().toLowerCase();
  if (t === 'income') return 'Income';
  if (t === 'transfer') return 'Transfer';
  return 'Expense';
}
