import { supabase } from './supabaseClient';
import type { CategoryAverage } from './aggregations';

export interface BenchmarkSuggestion {
  totalBudget: number;
  categories: { name: string; suggestedBudget: number; reasoning: string }[];
  overallInsight: string;
}

/** Calls the generate-benchmark edge function, which runs an open-weight Llama model via OpenRouter. */
export async function requestBenchmarkSuggestion(
  currency: string,
  categories: CategoryAverage[],
  monthsAvailable: number,
  language: 'en' | 'zh' = 'en'
): Promise<BenchmarkSuggestion> {
  const { data, error } = await supabase.functions.invoke('generate-benchmark', {
    body: {
      currency,
      monthsAvailable,
      language,
      categories: categories.map(c => ({ name: c.name, avgMonthly: c.avgMonthly, monthsOfData: c.monthsOfData })),
    },
  });

  if (error) throw new Error(`AI generation failed: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data as BenchmarkSuggestion;
}

/** Saves the (possibly user-edited) benchmark values and marks onboarding complete. */
export async function saveBenchmarks(
  userId: string,
  totalBudget: number,
  categoryBudgets: { categoryName: string; budget: number; setBy: 'ai' | 'user' }[]
) {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);
  if (catError) throw new Error(`Failed to load categories: ${catError.message}`);

  const idByName = new Map((categories ?? []).map(c => [c.name, c.id]));

  const rows = categoryBudgets
    .filter(cb => idByName.has(cb.categoryName))
    .map(cb => ({
      user_id: userId,
      category_id: idByName.get(cb.categoryName),
      monthly_budget: cb.budget,
      set_by: cb.setBy,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from('benchmarks').upsert(rows, { onConflict: 'user_id,category_id' });
    if (error) throw new Error(`Failed to save benchmarks: ${error.message}`);
  }

  const { error: budgetError } = await supabase
    .from('budget_settings')
    .upsert(
      { user_id: userId, monthly_total_budget: totalBudget, onboarded: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (budgetError) throw new Error(`Failed to save total budget: ${budgetError.message}`);
}

export async function getBudgetSettings(userId: string) {
  const { data } = await supabase
    .from('budget_settings')
    .select('monthly_total_budget, onboarded')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function getBenchmarks(userId: string) {
  const { data } = await supabase
    .from('benchmarks')
    .select('monthly_budget, set_by, category:categories(name, icon, color)')
    .eq('user_id', userId);
  return data ?? [];
}
