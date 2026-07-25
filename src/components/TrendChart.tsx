import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import type { MonthTotal } from '../lib/aggregations';
import { formatCurrency } from '../lib/aggregations';
import { useI18n } from '../lib/i18n';

interface TrendChartProps {
  months: MonthTotal[];
  currency: string;
}

export function TrendChart({ months, currency }: TrendChartProps) {
  const { t } = useI18n();
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid var(--paper-dim)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
        {t('monthOverMonth')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--mist)', marginBottom: 18 }}>
        {t('monthOverMonthDesc')}
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--paper-dim)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'var(--paper)' }}
              contentStyle={{ borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px solid var(--paper-dim)' }}
              formatter={(value: number) => formatCurrency(value, currency)}
            />
            <Bar dataKey="total" fill="var(--ink)" radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {months.length === 1 && (
        <p style={{ fontSize: 13, color: 'var(--mist)', marginTop: 8 }}>
          {t('uploadAnotherMonth')}
        </p>
      )}
    </div>
  );
}
