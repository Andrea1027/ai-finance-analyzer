import { supabase } from './supabaseClient';
import type { ColumnMapping, AmountSign, DateFormatHint, SavedMapping } from './types';

export async function findSavedMapping(userId: string, signature: string): Promise<SavedMapping | null> {
  const { data, error } = await supabase
    .from('import_mappings')
    .select('header_signature, source_name, column_map, amount_sign, date_format, currency')
    .eq('user_id', userId)
    .eq('header_signature', signature)
    .maybeSingle();

  if (error || !data) return null;
  return data as SavedMapping;
}

export async function saveMapping(
  userId: string,
  signature: string,
  sourceName: string,
  columnMap: ColumnMapping,
  amountSign: AmountSign,
  dateFormat: DateFormatHint,
  currency: string
) {
  const { error } = await supabase.from('import_mappings').upsert(
    {
      user_id: userId,
      header_signature: signature,
      source_name: sourceName,
      column_map: columnMap,
      amount_sign: amountSign,
      date_format: dateFormat,
      currency,
    },
    { onConflict: 'user_id,header_signature' }
  );
  if (error) throw new Error(`Failed to save import mapping: ${error.message}`);
}
