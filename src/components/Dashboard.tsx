import { useMemo, useState } from 'react';
import { useConvertedTransactions } from '../lib/useConvertedTransactions';
import { useBudget } from '../lib/useBudget';
import { monthlyTotals, categoryBreakdown, dailyCumulative } from '../lib/aggregations';
import { PulseStrip } from './PulseStrip';
import { CategoryLedger } from './CategoryLedger';
import { TrendChart } from './TrendChart';
import { BudgetSummary } from './BudgetSummary';
import { InsightsPanel } from './InsightsPanel';
import { useI18n } from '../lib/i18n';

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  const { t } = useI18n();
  const { transactions, loading, error, ratesError, baseCurrency } = useConvertedTransactions(userId);
  const { totalBudget, categoryBudgets } = useBudget(userId);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const months = useMemo(() => monthlyTotals(transactions), [transactions]);
  const currentMonth = months[months.length - 1] ?? null;
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;

  const categoryMonth = selectedMonth ?? currentMonth?.month ?? null;

  const categories = useMemo(
    () => categoryBreakdown(transactions, categoryMonth),
    [transactions, categoryMonth]
  );

  const pulse = useMemo(() => dailyCumulative(transactions), [transactions]);
  const selectedMonthTotal = months.find(m => m.month === categoryMonth)?.total ?? 0;

  if (loading) {
    return <p style={{ color: 'var(--mist)' }}>{t('loadingData')}</p>;
  }

  if (error) {
    return <p style={{ color: 'var(--coral)' }}>{t('couldntLoad')} {error}</p>;
  }

  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mist)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{t('nothingHereYet')}</p>
        <p>{t('uploadToSeeSpending')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {ratesError && (
        <p style={{ color: 'var(--coral)', fontSize: 13, margin: 0 }}>{t('ratesWarning')}</p>
      )}

      <PulseStrip
        data={pulse}
        currentTotal={currentMonth?.total ?? 0}
        previousTotal={previousMonth?.total ?? null}
        currency={baseCurrency}
        monthLabel={currentMonth?.label ?? ''}
      />

      <BudgetSummary spent={selectedMonthTotal} budget={totalBudget} currency={baseCurrency} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <CategoryLedger
          categories={categories}
          currency={baseCurrency}
          months={months}
          selectedMonth={categoryMonth ?? ''}
          onSelectMonth={setSelectedMonth}
          categoryBudgets={categoryBudgets}
        />
        {months.length > 1 && <TrendChart months={months} currency={baseCurrency} />}
      </div>

      {months.length === 1 && <TrendChart months={months} currency={baseCurrency} />}

      <InsightsPanel userId={userId} />
    </div>
  );
}
