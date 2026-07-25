import { useEffect, useState } from 'react';
import { useTransactions, type TransactionWithCategory } from './useTransactions';
import { useSettingsContext } from './SettingsContext';
import { getExchangeRates, convertToBase } from './exchangeRates';

export function useConvertedTransactions(userId: string) {
  const { transactions: rawTransactions, loading: txLoading, error: txError } = useTransactions(userId);
  const { baseCurrency, loading: settingsLoading } = useSettingsContext();

  const [converted, setConverted] = useState<TransactionWithCategory[]>([]);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [converting, setConverting] = useState(true);

  useEffect(() => {
    if (txLoading || settingsLoading) return;

    const currenciesUsed = [...new Set(rawTransactions.map(t => t.currency))];
    const onlyBaseCurrency = currenciesUsed.length <= 1 && currenciesUsed[0] === baseCurrency;

    if (onlyBaseCurrency || currenciesUsed.length === 0) {
      setConverted(rawTransactions);
      setConverting(false);
      setRatesError(null);
      return;
    }

    let cancelled = false;
    setConverting(true);
    getExchangeRates(baseCurrency)
      .then(rates => {
        if (cancelled) return;
        const normalized = rawTransactions.map(t => ({
          ...t,
          amount: convertToBase(t.amount, t.currency, baseCurrency, rates),
          currency: baseCurrency,
        }));
        setConverted(normalized);
        setRatesError(null);
        setConverting(false);
      })
      .catch(err => {
        if (cancelled) return;
        // Fall back to showing unconverted data rather than blocking the whole app.
        setConverted(rawTransactions);
        setRatesError(err instanceof Error ? err.message : 'Failed to load exchange rates');
        setConverting(false);
      });

    return () => { cancelled = true; };
  }, [rawTransactions, txLoading, settingsLoading, baseCurrency]);

  return {
    transactions: converted,
    baseCurrency,
    loading: txLoading || settingsLoading || converting,
    error: txError,
    ratesError,
  };
}
