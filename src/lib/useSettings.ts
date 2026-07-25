import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useSettings(userId: string) {
  const [baseCurrency, setBaseCurrency] = useState('HKD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('user_settings')
        .select('base_currency')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.base_currency) setBaseCurrency(data.base_currency);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  async function updateBaseCurrency(newCurrency: string) {
    setBaseCurrency(newCurrency);
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, base_currency: newCurrency, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }

  return { baseCurrency, updateBaseCurrency, loading };
}
