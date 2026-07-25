import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface TransactionWithCategory {
  id: string;
  tx_date: string;
  tx_month: string;
  category_name: string;
  amount: number;
  currency: string;
  note: string | null;
  category: { icon: string; color: string } | null;
}

export function useTransactions(userId: string) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('id, tx_date, tx_month, category_name, amount, currency, note, category:categories(icon, color)')
        .eq('user_id', userId)
        .eq('type', 'Expense')
        .order('tx_date', { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        // Supabase types the joined relation as an array; we only ever
        // join one category per transaction, so normalize to a single object.
        const normalized = (data ?? []).map((row: any) => ({
          ...row,
          category: Array.isArray(row.category) ? row.category[0] ?? null : row.category,
        }));
        setTransactions(normalized);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return { transactions, loading, error };
}
