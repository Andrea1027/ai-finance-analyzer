import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { DailyCumulative } from '../lib/aggregations';
import { formatCurrency } from '../lib/aggregations';
import { useI18n } from '../lib/i18n';

interface PulseStripProps {
  data: DailyCumulative[];
  currentTotal: number;
  previousTotal: number | null;
  currency: string;
  monthLabel: string;
}

export function PulseStrip({ data, currentTotal, previousTotal, currency, monthLabel }: PulseStripProps) {
  const { t } = useI18n();
  const delta = previousTotal !== null ? currentTotal - previousTotal : null;
  const deltaPct = previousTotal ? (delta! / previousTotal) * 100 : null;
  const isOverPace = delta !== null && delta > 0;

  return (
    <div
      style={{
        background: 'var(--ink)',
        borderRadius: 16,
        padding: 'clamp(18px, 4vw, 28px) clamp(16px, 4vw, 32px)',
        color: 'var(--paper)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--mist)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {monthLabel} · {t('runningTotal')}
          </div>
          <div className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 44px)', fontWeight: 600, lineHeight: 1.1, marginTop: 4 }}>
            {formatCurrency(currentTotal, currency)}
          </div>
        </div>

        {delta !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--mist)' }}>{t('vsSamePoint')}</div>
            <div
              className="num"
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: isOverPace ? 'var(--coral)' : 'var(--sage)',
              }}
            >
              {isOverPace ? '↑' : '↓'} {formatCurrency(Math.abs(delta), currency)}
              {deltaPct !== null && ` (${Math.abs(deltaPct).toFixed(0)}%)`}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 90, marginTop: 20, marginLeft: -8, marginRight: -8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="pulseGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <Tooltip
              contentStyle={{ background: 'var(--ink-soft)', border: '1px solid var(--ink-line)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
              labelFormatter={(day) => `Day ${day}`}
              formatter={(value: number) => formatCurrency(value, currency)}
            />
            <Area type="monotone" dataKey="lastMonth" stroke="var(--mist)" strokeWidth={1.5} strokeDasharray="3 3" fill="none" />
            <Area type="monotone" dataKey="thisMonth" stroke="var(--gold)" strokeWidth={2.5} fill="url(#pulseGold)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--mist)', marginTop: 4 }}>
        <span><span style={{ color: 'var(--gold)' }}>━</span> {t('thisMonth')}</span>
        <span><span style={{ color: 'var(--mist)' }}>┄</span> {t('lastMonth')}</span>
      </div>
    </div>
  );
}
