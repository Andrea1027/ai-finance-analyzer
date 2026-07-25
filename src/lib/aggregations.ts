import type { TransactionWithCategory } from './useTransactions';

export interface MonthTotal {
  month: string;       // 'YYYY-MM-01'
  label: string;        // 'Jul 2026'
  total: number;         // positive number (absolute spend)
}

export interface CategoryTotal {
  name: string;
  icon: string;
  color: string;
  total: number;
  pctOfTotal: number;
}

export interface DailyCumulative {
  day: number;           // 1-31
  thisMonth: number | null;
  lastMonth: number | null;
}

function monthLabel(monthKey: string): string {
  const d = new Date(monthKey + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Total absolute spend per calendar month, sorted chronologically. */
export function monthlyTotals(transactions: TransactionWithCategory[]): MonthTotal[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    map.set(t.tx_month, (map.get(t.tx_month) ?? 0) + Math.abs(t.amount));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, label: monthLabel(month), total }));
}

/** Category breakdown for a single given month (or all months if monthKey is null). */
export function categoryBreakdown(
  transactions: TransactionWithCategory[],
  monthKey: string | null
): CategoryTotal[] {
  const filtered = monthKey ? transactions.filter(t => t.tx_month === monthKey) : transactions;
  const map = new Map<string, { total: number; icon: string; color: string }>();

  for (const t of filtered) {
    const key = t.category_name;
    const existing = map.get(key);
    const icon = t.category?.icon ?? '💰';
    const color = t.category?.color ?? '#6366f1';
    if (existing) {
      existing.total += Math.abs(t.amount);
    } else {
      map.set(key, { total: Math.abs(t.amount), icon, color });
    }
  }

  const grandTotal = [...map.values()].reduce((sum, v) => sum + v.total, 0) || 1;

  return [...map.entries()]
    .map(([name, v]) => ({ name, icon: v.icon, color: v.color, total: v.total, pctOfTotal: (v.total / grandTotal) * 100 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Daily cumulative spend for the current month vs. the previous month,
 * aligned by day-of-month — powers the "pulse strip" sparkline.
 */
export function dailyCumulative(transactions: TransactionWithCategory[]): DailyCumulative[] {
  const months = [...new Set(transactions.map(t => t.tx_month))].sort();
  if (months.length === 0) return [];

  const currentMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;

  const daysInCurrent = new Date(
    Number(currentMonth.slice(0, 4)),
    Number(currentMonth.slice(5, 7)),
    0
  ).getDate();

  const cumByMonth = (monthKey: string) => {
    const dayTotals = new Array(32).fill(0);
    for (const t of transactions) {
      if (t.tx_month !== monthKey) continue;
      const day = new Date(t.tx_date).getUTCDate();
      dayTotals[day] += Math.abs(t.amount);
    }
    const cumulative: number[] = [];
    let running = 0;
    for (let d = 1; d <= 31; d++) {
      running += dayTotals[d];
      cumulative[d] = running;
    }
    return cumulative;
  };

  const currentCum = cumByMonth(currentMonth);
  const previousCum = previousMonth ? cumByMonth(previousMonth) : null;

  const result: DailyCumulative[] = [];
  for (let day = 1; day <= daysInCurrent; day++) {
    result.push({
      day,
      thisMonth: currentCum[day] ?? null,
      lastMonth: previousCum ? previousCum[day] ?? null : null,
    });
  }
  return result;
}

export function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export interface CategoryFrequency {
  name: string;
  count: number;
  avgAmount: number;
}

/** Transaction count and average size per category for a given month — powers habit-based insights. */
export function categoryFrequency(transactions: TransactionWithCategory[], monthKey: string): CategoryFrequency[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const t of transactions) {
    if (t.tx_month !== monthKey) continue;
    const existing = map.get(t.category_name);
    if (existing) {
      existing.count += 1;
      existing.total += Math.abs(t.amount);
    } else {
      map.set(t.category_name, { count: 1, total: Math.abs(t.amount) });
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, count: v.count, avgAmount: v.total / v.count }))
    .sort((a, b) => b.count - a.count);
}

export interface CategoryAverage {
  name: string;
  icon: string;
  color: string;
  avgMonthly: number;
  monthsOfData: number;
}

/** Average monthly spend per category, across every month present in the data. */
export function categoryMonthlyAverages(transactions: TransactionWithCategory[]): CategoryAverage[] {
  const monthsPresent = new Set(transactions.map(t => t.tx_month));
  const monthCount = monthsPresent.size || 1;

  const map = new Map<string, { total: number; icon: string; color: string; months: Set<string> }>();
  for (const t of transactions) {
    const key = t.category_name;
    const existing = map.get(key);
    const icon = t.category?.icon ?? '💰';
    const color = t.category?.color ?? '#6366f1';
    if (existing) {
      existing.total += Math.abs(t.amount);
      existing.months.add(t.tx_month);
    } else {
      map.set(key, { total: Math.abs(t.amount), icon, color, months: new Set([t.tx_month]) });
    }
  }

  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      icon: v.icon,
      color: v.color,
      avgMonthly: v.total / monthCount,
      monthsOfData: v.months.size,
    }))
    .sort((a, b) => b.avgMonthly - a.avgMonthly);
}
