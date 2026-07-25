import type { CategoryAverage } from './aggregations';
import type { BenchmarkSuggestion } from './benchmarks';

function roundToNearest(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString();
}

/**
 * Proposes a monthly budget benchmark purely from the user's own spending
 * history — no external AI call. Rounds each category's historical average
 * to a sensible increment, and is upfront in its reasoning about how much
 * (or little) data it's based on.
 */
export function generateRuleBasedBenchmark(categories: CategoryAverage[], monthsAvailable: number): BenchmarkSuggestion {
  const categoryBudgets = categories.map(c => {
    const step = c.avgMonthly > 500 ? 50 : 10;
    const suggestedBudget = roundToNearest(c.avgMonthly, step);
    const reasoning = c.monthsOfData > 1
      ? `Average of ${formatNum(c.avgMonthly)} across ${c.monthsOfData} months of data.`
      : `Based on your one month of data so far (${formatNum(c.avgMonthly)}).`;
    return { name: c.name, suggestedBudget, reasoning };
  });

  const totalBudget = roundToNearest(
    categoryBudgets.reduce((sum, c) => sum + c.suggestedBudget, 0),
    50
  );

  const overallInsight = monthsAvailable > 1
    ? `Based on your average spending across ${monthsAvailable} months. Edit any number, then save — you can adjust it anytime as your habits change.`
    : `This is based on just one month, so treat it as a starting point rather than a fixed target — it'll sharpen as you upload more months.`;

  return { totalBudget, categories: categoryBudgets, overallInsight };
}
