import type { Insight } from './insights';

interface CategoryLine {
  name: string;
  total: number;
  budget?: number | null;
}

interface CategoryFrequency {
  name: string;
  count: number;
  avgAmount: number;
}

export function generateRuleBasedInsights(
  monthlyTrend: { label: string; total: number }[],
  currentMonthCategories: CategoryLine[],
  previousMonthCategories: CategoryLine[] | undefined,
  totalBudget: number | null,
  currency: string,
  categoryFrequency?: CategoryFrequency[],
  monthProgress?: { daysElapsed: number; daysInMonth: number } | null
): Insight[] {
  const insights: Insight[] = [];
  const round = (n: number) => Math.round(n).toLocaleString();

  // Projection: where this month is headed at the current pace
  if (monthProgress && monthProgress.daysElapsed > 0) {
    const spentSoFar = currentMonthCategories.reduce((s, c) => s + c.total, 0);
    const projected = (spentSoFar / monthProgress.daysElapsed) * monthProgress.daysInMonth;
    const overProjected = totalBudget != null && projected > totalBudget;
    insights.push({
      type: 'projection',
      keyMetric: `${currency} ${round(projected)}`,
      title: 'Projected month-end total',
      detail: totalBudget != null
        ? `At this pace you'll land at ${currency} ${round(projected)} — ${overProjected ? 'over' : 'within'} your ${currency} ${round(totalBudget)} budget.`
        : `At day ${monthProgress.daysElapsed} of ${monthProgress.daysInMonth}, you're on pace for ${currency} ${round(projected)} this month.`,
    });
  }

  // Habit-based: most frequent category, purely from purchase count
  if (categoryFrequency && categoryFrequency.length > 0) {
    const topFrequency = categoryFrequency[0];
    if (topFrequency.count >= 5) {
      insights.push({
        type: 'suggestion',
        keyMetric: `${topFrequency.count}x`,
        title: `${topFrequency.name}: frequent small purchases`,
        detail: `${topFrequency.count} separate ${topFrequency.name} purchases averaging ${currency} ${round(topFrequency.avgAmount)} each — batching could reduce total spend.`,
      });
    }
  }

  // Top category this month
  const sorted = [...currentMonthCategories].sort((a, b) => b.total - a.total);
  const top = sorted[0];
  if (top) {
    const grandTotal = currentMonthCategories.reduce((s, c) => s + c.total, 0) || 1;
    const pct = (top.total / grandTotal) * 100;
    insights.push({
      type: 'trend',
      keyMetric: `${pct.toFixed(0)}%`,
      title: `${top.name} is your biggest category`,
      detail: `${currency} ${round(top.total)} spent — ${pct.toFixed(0)}% of this month's total.`,
    });
  }

  // Most-over-budget category
  const overBudget = currentMonthCategories
    .filter(c => c.budget != null && c.total > (c.budget as number))
    .map(c => ({ ...c, overBy: c.total - (c.budget as number) }))
    .sort((a, b) => b.overBy - a.overBy)[0];
  if (overBudget) {
    insights.push({
      type: 'warning',
      keyMetric: `+${currency} ${round(overBudget.overBy)}`,
      title: `${overBudget.name} is over budget`,
      detail: `Next month, watch ${overBudget.name} closely — it ran ${currency} ${round(overBudget.overBy)} over this time.`,
    });
  }

  // Biggest month-over-month category increase
  if (previousMonthCategories && previousMonthCategories.length > 0) {
    const prevByName = new Map(previousMonthCategories.map(c => [c.name, c.total]));
    const deltas = currentMonthCategories
      .map(c => ({ name: c.name, delta: c.total - (prevByName.get(c.name) ?? 0) }))
      .filter(d => d.delta > 0)
      .sort((a, b) => b.delta - a.delta)[0];
    if (deltas) {
      insights.push({
        type: 'trend',
        keyMetric: `+${currency} ${round(deltas.delta)}`,
        title: `${deltas.name} rose the most`,
        detail: `Up ${currency} ${round(deltas.delta)} compared to last month.`,
      });
    }
  }

  // Overall budget surplus
  if (totalBudget != null) {
    const totalSpent = currentMonthCategories.reduce((s, c) => s + c.total, 0);
    const surplus = totalBudget - totalSpent;
    if (surplus > totalBudget * 0.15) {
      insights.push({
        type: 'suggestion',
        keyMetric: `${currency} ${round(surplus)}`,
        title: 'Comfortable surplus this month',
        detail: `You're ${currency} ${round(surplus)} under budget — worth considering for savings.`,
      });
    }
  }

  // Overall trend direction across all months
  if (monthlyTrend.length > 1) {
    const last = monthlyTrend[monthlyTrend.length - 1];
    const prev = monthlyTrend[monthlyTrend.length - 2];
    const change = ((last.total - prev.total) / (prev.total || 1)) * 100;
    insights.push({
      type: change > 0 ? 'warning' : 'positive',
      keyMetric: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
      title: change > 0 ? 'Spending trending up' : 'Spending trending down',
      detail: `Total spend ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change).toFixed(0)}% from ${prev.label} to ${last.label}.`,
    });
  }

  return insights.slice(0, 7);
}
