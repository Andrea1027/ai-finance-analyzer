import { supabase } from './supabaseClient';
import { parseSpendeeCSV } from './csvParser';
import { parseGenericCSV } from './genericParser';
import { DEFAULT_CATEGORY_STYLE, FALLBACK_CATEGORY_STYLE } from './types';
import type { ParsedTransaction, ParseResult, ColumnMapping, AmountSign, DateFormatHint } from './types';

export interface ImportSummary {
  filename: string;
  rowsImported: number;
  rowsSkippedAsDuplicate: number;
  rowsSkippedAsInvalid: number;
  newCategoriesCreated: string[];
  warnings: string[];
}

/**
 * Shared save pipeline: takes an already-parsed ParseResult (regardless of
 * which parser produced it) and writes categories + upload record +
 * transactions to Supabase.
 */
async function saveParsedResult(userId: string, filename: string, parsed: ParseResult): Promise<ImportSummary> {
  if (parsed.transactions.length === 0) {
    return {
      filename,
      rowsImported: 0,
      rowsSkippedAsDuplicate: 0,
      rowsSkippedAsInvalid: parsed.skippedRows,
      newCategoriesCreated: [],
      warnings: parsed.warnings,
    };
  }

  const uniqueCategoryNames = [...new Set(parsed.transactions.map(t => t.category_name))];

  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);

  const existingNames = new Set((existingCategories ?? []).map(c => c.name));
  const newCategoryNames = uniqueCategoryNames.filter(name => !existingNames.has(name));

  if (newCategoryNames.length > 0) {
    const rowsToInsert = newCategoryNames.map(name => {
      const style = DEFAULT_CATEGORY_STYLE[name] ?? FALLBACK_CATEGORY_STYLE;
      return { user_id: userId, name, icon: style.icon, color: style.color };
    });
    const { error } = await supabase.from('categories').insert(rowsToInsert);
    if (error) throw new Error(`Failed to create categories: ${error.message}`);
  }

  const { data: allCategories, error: catFetchError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);
  if (catFetchError) throw new Error(`Failed to load categories: ${catFetchError.message}`);

  const categoryIdByName = new Map((allCategories ?? []).map(c => [c.name, c.id]));

  const { data: uploadRow, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      user_id: userId,
      filename,
      wallet: parsed.wallet,
      row_count: parsed.transactions.length,
      earliest_date: parsed.earliestDate?.slice(0, 10) ?? null,
      latest_date: parsed.latestDate?.slice(0, 10) ?? null,
    })
    .select('id')
    .single();

  if (uploadError || !uploadRow) {
    throw new Error(`Failed to record upload: ${uploadError?.message}`);
  }

  const rowsToInsert = parsed.transactions.map((t: ParsedTransaction) => ({
    user_id: userId,
    upload_id: uploadRow.id,
    category_id: categoryIdByName.get(t.category_name) ?? null,
    tx_date: t.tx_date,
    tx_month: t.tx_month,
    wallet: t.wallet,
    type: t.type,
    category_name: t.category_name,
    amount: t.amount,
    currency: t.currency,
    note: t.note,
    labels: t.labels,
    author: t.author,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('transactions')
    .upsert(rowsToInsert, { onConflict: 'user_id,tx_date,amount,category_name,note', ignoreDuplicates: true })
    .select('id');

  if (insertError) throw new Error(`Failed to import transactions: ${insertError.message}`);

  const rowsImported = inserted?.length ?? 0;
  const rowsSkippedAsDuplicate = rowsToInsert.length - rowsImported;

  return {
    filename,
    rowsImported,
    rowsSkippedAsDuplicate,
    rowsSkippedAsInvalid: parsed.skippedRows,
    newCategoriesCreated: newCategoryNames,
    warnings: parsed.warnings,
  };
}

export async function importSpendeeCSV(userId: string, filename: string, csvText: string): Promise<ImportSummary> {
  const parsed = parseSpendeeCSV(csvText);
  return saveParsedResult(userId, filename, parsed);
}

export async function importGenericCSV(
  userId: string,
  filename: string,
  csvText: string,
  mapping: ColumnMapping,
  amountSign: AmountSign,
  dateFormat: DateFormatHint,
  fallbackCurrency: string
): Promise<ImportSummary> {
  const parsed = parseGenericCSV(csvText, mapping, amountSign, dateFormat, fallbackCurrency);
  return saveParsedResult(userId, filename, parsed);
}
