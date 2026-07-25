import { formatCurrency } from '../lib/aggregations';
import { useI18n } from '../lib/i18n';

interface BudgetSummaryProps {
  spent: number;
  budget: number | null;
  currency: string;
}

export function BudgetSummary({ spent, budget, currency }: BudgetSummaryProps) {
  const { t } = useI18n();

  if (budget === null) {
    return (
      <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--paper-dim)', textAlign: 'center' }}>
        <p style={{ color: 'var(--mist)', fontSize: 14, margin: 0 }}>
          {t('noBudgetSet')}
        </p>
      </div>
    );
  }

  const pct = (spent / budget) * 100;
  const over = spent > budget;
  const remaining = budget - spent;

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--paper-dim)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{t('budgetThisMonth')}</div>
        <div className="num" style={{ fontSize: 13, fontWeight: 500, color: over ? 'var(--coral)' : 'var(--sage)' }}>
          {over ? `${t('overBy')} ${formatCurrency(Math.abs(remaining), currency)}` : `${formatCurrency(remaining, currency)} ${t('remaining')}`}
        </div>
      </div>
      <div style={{ height: 10, background: 'var(--paper)', borderRadius: 5, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            background: over ? 'var(--coral)' : 'var(--gold)',
            borderRadius: 5,
          }}
        />
      </div>
      <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mist)', marginTop: 6 }}>
        <span>{formatCurrency(spent, currency)} {t('spent')}</span>
        <span>{formatCurrency(budget, currency)} {t('budget')}</span>
      </div>
    </div>
  );
}
