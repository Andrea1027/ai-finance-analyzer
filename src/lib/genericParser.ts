import Papa from 'papaparse';
import type { ParsedTransaction, ParseResult, ColumnMapping, AmountSign, DateFormatHint } from './types';

export const SPENDEE_HEADER_SIGNATURE = ['Amount','Author','Category name','Currency','Date','Labels','Note','Type','Wallet']
  .sort()
  .join('|');

/** Sorted, pipe-joined header list — used to recognize a file's "shape" for saved-mapping lookup. */
export function headerSignature(headers: string[]): string {
  return [...headers].map(h => h.trim()).sort().join('|');
}

/** Peek at a CSV's header row + a few sample rows without parsing the whole file. */
export function previewCSV(csvText: string, sampleSize = 3) {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true, preview: sampleSize });
  return { headers: result.meta.fields ?? [], sampleRows: result.data };
}

export function parseGenericCSV(
  csvText: string,
  mapping: ColumnMapping,
  amountSign: AmountSign,
  dateFormat: DateFormatHint,
  fallbackCurrency: string
): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });

  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [...result.errors.map(e => `Row ${e.row}: ${e.message}`)];
  let skippedRows = 0;
  let wallet: string | null = null;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const row of result.data) {
    const rawDate = row[mapping.date];
    const rawAmount = row[mapping.amount];
    const rawCategory = mapping.category ? row[mapping.category] : undefined;

    if (!rawDate || !rawAmount) {
      skippedRows++;
      continue;
    }

    const date = parseDate(rawDate, dateFormat);
    if (!date) {
      warnings.push(`Skipped row with unparseable date: "${rawDate}"`);
      skippedRows++;
      continue;
    }

    let amount = parseFloat(String(rawAmount).replace(/,/g, ''));
    if (Number.isNaN(amount)) {
      warnings.push(`Skipped row with unparseable amount: "${rawAmount}"`);
      skippedRows++;
      continue;
    }

    // Normalize to this app's convention: negative = expense, positive = income.
    if (amountSign === 'as_positive') {
      amount = -Math.abs(amount);
    }

    const isoDate = date.toISOString();
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const rowWallet = (mapping.wallet && row[mapping.wallet]?.trim()) || 'Imported';

    transactions.push({
      tx_date: isoDate,
      tx_month: monthKey,
      wallet: rowWallet,
      type: amount < 0 ? 'Expense' : 'Income',
      category_name: rawCategory?.trim() || 'Other',
      amount,
      currency: (mapping.currency && row[mapping.currency]?.trim()) || fallbackCurrency,
      note: (mapping.note && row[mapping.note]?.trim()) || null,
      labels: null,
      author: null,
    });

    if (!wallet) wallet = rowWallet;
    if (!earliest || isoDate < earliest) earliest = isoDate;
    if (!latest || isoDate > latest) latest = isoDate;
  }

  return { transactions, wallet, earliestDate: earliest, latestDate: latest, skippedRows, warnings };
}

function parseDate(raw: string, fmt: DateFormatHint): Date | null {
  if (fmt === 'auto') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const match = raw.match(/(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/);
  if (!match) return null;
  const [, a, b, c] = match;

  let year: number, month: number, day: number;
  if (fmt === 'YMD') { year = +a; month = +b; day = +c; }
  else if (fmt === 'DMY') { day = +a; month = +b; year = +c; }
  else { month = +a; day = +b; year = +c; } // MDY

  if (year < 100) year += 2000;
  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}
