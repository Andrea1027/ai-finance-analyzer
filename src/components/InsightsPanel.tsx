import { useState } from 'react';
import { useConvertedTransactions } from '../lib/useConvertedTransactions';
import { useBudget } from '../lib/useBudget';
import { monthlyTotals, categoryBreakdown, categoryFrequency } from '../lib/aggregations';
import { requestInsights, type Insight, type InsightType } from '../lib/insights';
import { generateRuleBasedInsights } from '../lib/ruleBasedInsights';
import { useI18n } from '../lib/i18n';

interface InsightsPanelProps {
  userId: string;
}

const TYPE_STYLE: Record<InsightType, { bg: string; accent: string; icon: string }> = {
  warning: { bg: '#fdf1ef', accent: 'var(--coral)', icon: '⚠️' },
  positive: { bg: '#f0f7f4', accent: 'var(--sage)', icon: '✓' },
  trend: { bg: '#f5f4fb', accent: '#8b7fd6', icon: '↗' },
  suggestion: { bg: '#fdf8ec', accent: 'var(--gold)', icon: '💡' },
  projection: { bg: '#eef4fb', accent: '#4f8fc4', icon: '📅' },
};

export function InsightsPanel({ userId }: InsightsPanelProps) {
  const { t, language } = useI18n();
  const { transactions, loading: txLoading, baseCurrency } = useConvertedTransactions(userId);
  const { totalBudget, categoryBudgets } = useBudget(userId);

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [source, setSource] = useState<'ai' | 'estimate' | null>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (txLoading) return null;
  if (transactions.length === 0) return null;

  const months = monthlyTotals(transactions);
  const currentMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;
  const currency = baseCurrency;

  function buildCategoryLines(monthKey: string) {
    return categoryBreakdown(transactions, monthKey).map(c => ({
      name: c.name,
      total: c.total,
      budget: categoryBudgets[c.name] ?? null,
    }));
  }

  function computeMonthProgress(): { daysElapsed: number; daysInMonth: number } | null {
    const now = new Date();
    const nowMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (currentMonth.month !== nowMonthKey) return null;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return { daysElapsed: now.getDate(), daysInMonth };
  }

  async function generateWithAI() {
    setStatus('generating');
    setErrorMsg(null);
    try {
      const result = await requestInsights(
        currency,
        months.length,
        months.map(m => ({ label: m.label, total: m.total })),
        buildCategoryLines(currentMonth.month),
        previousMonth ? buildCategoryLines(previousMonth.month) : undefined,
        totalBudget,
        categoryFrequency(transactions, currentMonth.month),
        computeMonthProgress(),
        language
      );
      setInsights(result.insights);
      setSource('ai');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'AI generation failed');
    }
  }

  function generateEstimate() {
    const result = generateRuleBasedInsights(
      months.map(m => ({ label: m.label, total: m.total })),
      buildCategoryLines(currentMonth.month),
      previousMonth ? buildCategoryLines(previousMonth.month) : undefined,
      totalBudget,
      currency,
      categoryFrequency(transactions, currentMonth.month),
      computeMonthProgress()
    );
    setInsights(result);
    setSource('estimate');
    setStatus('idle');
    setErrorMsg(null);
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid var(--paper-dim)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{t('insights')}</div>
          {source && (
            <span style={{ fontSize: 11, color: 'var(--mist)', border: '1px solid var(--paper-dim)', borderRadius: 999, padding: '2px 8px' }}>
              {source === 'ai' ? t('aiGeneratedLabel') : t('quickEstimateLabel')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={generateWithAI}
            disabled={status === 'generating'}
            style={{ padding: '6px 14px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13 }}
          >
            {status === 'generating' ? t('thinking') : insights ? t('regenerate') : t('generateWithAI')}
          </button>
          {!insights && (
            <button
              onClick={generateEstimate}
              style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8, fontSize: 13 }}
            >
              {t('quickEstimate')}
            </button>
          )}
        </div>
      </div>

      {status === 'error' && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: 'var(--coral)', fontSize: 13 }}>{errorMsg}</p>
          <button
            onClick={generateEstimate}
            style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--paper-dim)', borderRadius: 8, fontSize: 13 }}
          >
            {t('useQuickEstimateInstead')}
          </button>
        </div>
      )}

      {!insights && status !== 'generating' && status !== 'error' && (
        <p style={{ color: 'var(--mist)', fontSize: 14 }}>
          {t('insightsPlaceholder')}
        </p>
      )}

      {insights && insights.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {insights.map((insight, i) => {
            const style = TYPE_STYLE[insight.type];
            return (
              <div key={i} style={{ background: style.bg, borderRadius: 12, padding: 16, borderTop: `3px solid ${style.accent}` }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 600, color: style.accent, marginBottom: 4 }}>
                  {style.icon} {insight.keyMetric}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{insight.title}</div>
                <div style={{ fontSize: 13, color: 'var(--mist)' }}>{insight.detail}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
