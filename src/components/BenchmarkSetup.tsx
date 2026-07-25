import { useEffect, useMemo, useState } from 'react';
import { useConvertedTransactions } from '../lib/useConvertedTransactions';
import { useBudget } from '../lib/useBudget';
import { categoryMonthlyAverages, monthlyTotals } from '../lib/aggregations';
import { requestBenchmarkSuggestion, saveBenchmarks } from '../lib/benchmarks';
import { generateRuleBasedBenchmark } from '../lib/ruleBasedBenchmark';
import type { BenchmarkSuggestion } from '../lib/benchmarks';
import { useI18n } from '../lib/i18n';

interface BenchmarkSetupProps {
  userId: string;
  onSaved: () => void;
}

type Mode = 'loading' | 'onboarding' | 'view';
type Source = 'ai' | 'estimate' | 'saved' | null;

export function BenchmarkSetup({ userId, onSaved }: BenchmarkSetupProps) {
  const { t, language } = useI18n();
  const { transactions, loading: txLoading, baseCurrency } = useConvertedTransactions(userId);
  const { totalBudget: savedTotal, categoryBudgets: savedCategoryBudgets, loading: budgetLoading } = useBudget(userId);

  const categories = useMemo(() => categoryMonthlyAverages(transactions), [transactions]);
  const months = useMemo(() => monthlyTotals(transactions), [transactions]);
  const currency = baseCurrency;

  const [mode, setMode] = useState<Mode>('loading');
  const [reasoningByCategory, setReasoningByCategory] = useState<Record<string, string>>({});
  const [overallInsight, setOverallInsight] = useState<string>('');
  const [edited, setEdited] = useState<Record<string, number>>({});
  const [totalEdited, setTotalEdited] = useState<number | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (txLoading || budgetLoading || mode !== 'loading') return;

    const hasSavedBudget = savedTotal !== null || Object.keys(savedCategoryBudgets).length > 0;
    if (hasSavedBudget) {
      setTotalEdited(savedTotal ?? 0);
      setEdited({ ...savedCategoryBudgets });
      setSource('saved');
      setMode('view');
    } else {
      setMode('onboarding');
    }
  }, [txLoading, budgetLoading, savedTotal, savedCategoryBudgets, mode]);

  function applySuggestion(result: BenchmarkSuggestion, src: Source) {
    setEdited(prev => ({ ...prev, ...Object.fromEntries(result.categories.map(c => [c.name, c.suggestedBudget])) }));
    setReasoningByCategory(Object.fromEntries(result.categories.map(c => [c.name, c.reasoning])));
    setOverallInsight(result.overallInsight);
    setTotalEdited(result.totalBudget);
    setSource(src);
    setMode('view');
    setStatus('idle');
    setErrorMsg(null);
  }

  async function generateWithAI() {
    setStatus('generating');
    setErrorMsg(null);
    try {
      const result = await requestBenchmarkSuggestion(currency, categories, months.length, language);
      applySuggestion(result, 'ai');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'AI generation failed');
    }
  }

  function generateEstimate() {
    applySuggestion(generateRuleBasedBenchmark(categories, months.length), 'estimate');
  }

  async function save() {
    if (totalEdited === null) return;
    setStatus('saving');
    setErrorMsg(null);
    try {
      const categoryBudgetsToSave = Object.entries(edited).map(([categoryName, budget]) => ({
        categoryName,
        budget,
        setBy: (source === 'ai' ? 'ai' : 'user') as 'ai' | 'user',
      }));
      await saveBenchmarks(userId, totalEdited, categoryBudgetsToSave);
      onSaved();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  if (mode === 'loading') return <p style={{ color: 'var(--mist)' }}>{t('loadingData')}</p>;

  if (transactions.length === 0) {
    return <p style={{ color: 'var(--mist)' }}>{t('uploadFirst')}</p>;
  }

  if (mode === 'onboarding') {
    return (
      <div style={{ background: 'white', borderRadius: 16, padding: 32, border: '1px solid var(--paper-dim)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          {t('setBudgetBenchmark')}
        </div>
        <p style={{ color: 'var(--mist)', fontSize: 14, maxWidth: 460, margin: '0 auto 20px' }}>
          {t('benchmarkDesc', { months: months.length })}
        </p>
        {status === 'error' && (
          <p style={{ color: 'var(--coral)', fontSize: 13, maxWidth: 460, margin: '0 auto 12px' }}>{errorMsg}</p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={generateWithAI}
            disabled={status === 'generating'}
            style={{ padding: '10px 24px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14 }}
          >
            {status === 'generating' ? t('askingAI') : t('generateWithAI')}
          </button>
          <button
            onClick={generateEstimate}
            style={{ padding: '10px 24px', background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8, fontSize: 14 }}
          >
            {t('quickEstimateInstead')}
          </button>
        </div>
      </div>
    );
  }

  const sourceLabel = source === 'ai' ? t('aiGeneratedLabel') : source === 'estimate' ? t('quickEstimateLabel') : t('savedBudgetLabel');

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid var(--paper-dim)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{t('yourBudget')}</div>
        <span style={{ fontSize: 11, color: 'var(--mist)', border: '1px solid var(--paper-dim)', borderRadius: 999, padding: '2px 8px' }}>
          {sourceLabel}
        </span>
      </div>
      {overallInsight && <p style={{ color: 'var(--mist)', fontSize: 13, marginTop: 0 }}>{overallInsight}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', padding: 12, background: 'var(--paper)', borderRadius: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>{t('totalMonthlyBudget')}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <input
            type="number"
            className="num"
            value={totalEdited ?? 0}
            onChange={e => setTotalEdited(Number(e.target.value))}
            style={{ width: 120, padding: '6px 10px', border: '1px solid var(--paper-dim)', borderRadius: 6 }}
          />
          <span style={{ fontSize: 13, color: 'var(--mist)' }}>{currency}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(cat => (
          <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--paper-dim)' }}>
            <span style={{ width: 24, flexShrink: 0 }}>{cat.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: 'var(--mist)' }}>
                {reasoningByCategory[cat.name] ?? `${t('averageSpend')} ${Math.round(cat.avgMonthly).toLocaleString()} ${currency}`}
              </div>
            </div>
            <input
              type="number"
              className="num"
              value={edited[cat.name] ?? 0}
              onChange={e => setEdited(prev => ({ ...prev, [cat.name]: Number(e.target.value) }))}
              style={{ width: 90, flexShrink: 0, padding: '6px 8px', border: '1px solid var(--paper-dim)', borderRadius: 6 }}
            />
          </div>
        ))}
      </div>

      {status === 'error' && <p style={{ color: 'var(--coral)', fontSize: 13, marginTop: 12 }}>{errorMsg}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={save}
          disabled={status === 'saving'}
          style={{ padding: '10px 20px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8 }}
        >
          {status === 'saving' ? t('saving') : t('saveBudget')}
        </button>
        <button
          onClick={generateWithAI}
          disabled={status === 'generating'}
          style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8 }}
        >
          {status === 'generating' ? t('askingAI') : t('regenerateWithAI')}
        </button>
        <button
          onClick={generateEstimate}
          style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8 }}
        >
          {t('resetToQuickEstimate')}
        </button>
      </div>
    </div>
  );
}
