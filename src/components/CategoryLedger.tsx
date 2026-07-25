import type { CategoryTotal, MonthTotal } from '../lib/aggregations';
import { formatCurrency } from '../lib/aggregations';
import { useI18n } from '../lib/i18n';

interface CategoryLedgerProps {
  categories: CategoryTotal[];
  currency: string;
  months: MonthTotal[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  categoryBudgets?: Record<string, number>;
}

export function CategoryLedger({ categories, currency, months, selectedMonth, onSelectMonth, categoryBudgets = {} }: CategoryLedgerProps) {
  const { t } = useI18n();
  const maxScale = Math.max(...categories.map(c => c.total), ...Object.values(categoryBudgets), 1);

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid var(--paper-dim)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
          {t('byCategory')}
        </div>
        {months.length > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {months.map(m => (
              <button
                key={m.month}
                onClick={() => onSelectMonth(m.month)}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid ' + (m.month === selectedMonth ? 'var(--ink)' : 'var(--paper-dim)'),
                  background: m.month === selectedMonth ? 'var(--ink)' : 'none',
                  color: m.month === selectedMonth ? 'white' : 'var(--mist)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {categories.map((cat) => {
          const budget = categoryBudgets[cat.name];
          const isOver = budget != null && cat.total > budget;
          const barWidth = (cat.total / maxScale) * 100;
          const markerPos = budget != null ? (budget / maxScale) * 100 : null;

          return (
            <div key={cat.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ fontSize: 14 }}>
                  <span style={{ marginRight: 8 }}>{cat.icon}</span>
                  {cat.name}
                </span>
                <span className="num" style={{ fontSize: 14, fontWeight: 500 }}>
                  {formatCurrency(cat.total, currency)}
                  {budget != null ? (
                    <span style={{ color: isOver ? 'var(--coral)' : 'var(--sage)', marginLeft: 8, fontSize: 12 }}>
                      {isOver ? t('over') : t('under')} {formatCurrency(budget, currency)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--mist)', marginLeft: 8, fontSize: 12 }}>{cat.pctOfTotal.toFixed(0)}%</span>
                  )}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--paper)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: isOver ? 'var(--coral)' : cat.color,
                    borderRadius: 3,
                  }}
                />
                {markerPos !== null && (
                  <div
                    title={`Budget: ${formatCurrency(budget!, currency)}`}
                    style={{
                      position: 'absolute',
                      left: `${Math.min(markerPos, 100)}%`,
                      top: -2,
                      bottom: -2,
                      width: 2,
                      background: 'var(--ink)',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <p style={{ color: 'var(--mist)', fontSize: 14 }}>{t('noExpenses')}</p>
        )}
      </div>
    </div>
  );
}
