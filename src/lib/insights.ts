import { supabase } from './supabaseClient';

export type InsightType = 'warning' | 'positive' | 'trend' | 'suggestion' | 'projection';

export interface Insight {
  type: InsightType;
  keyMetric: string;
  title: string;
  detail: string;
}

export interface InsightsResult {
  insights: Insight[];
}

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

export async function requestInsights(
  currency: string,
  monthsAvailable: number,
  monthlyTrend: { label: string; total: number }[],
  currentMonthCategories: CategoryLine[],
  previousMonthCategories: CategoryLine[] | undefined,
  totalBudget: number | null,
  categoryFrequency?: CategoryFrequency[],
  monthProgress?: { daysElapsed: number; daysInMonth: number } | null,
  language: 'en' | 'zh' = 'en'
): Promise<InsightsResult> {
  const { data, error } = await supabase.functions.invoke('generate-insights', {
    body: {
      currency,
      monthsAvailable,
      monthlyTrend,
      currentMonthCategories,
      previousMonthCategories,
      totalBudget,
      categoryFrequency,
      monthProgress,
      language,
    },
  });

  if (error) throw new Error(`Insight generation failed: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data as InsightsResult;
}
