import { useEffect, useState } from 'react';
import { getBenchmarks, getBudgetSettings } from './benchmarks';

export function useBudget(userId: string) {
  const [totalBudget, setTotalBudget] = useState<number | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [settings, benchmarks] = await Promise.all([
        getBudgetSettings(userId),
        getBenchmarks(userId),
      ]);
      if (cancelled) return;

      setTotalBudget(settings?.monthly_total_budget ?? null);

      const map: Record<string, number> = {};
      for (const b of benchmarks) {
        // Supabase may return the joined category as an object or a
        // single-item array depending on inferred relationship cardinality —
        // normalize defensively.
        const cat: any = Array.isArray(b.category) ? b.category[0] : b.category;
        if (cat?.name && b.monthly_budget != null) {
          map[cat.name] = b.monthly_budget;
        }
      }
      setCategoryBudgets(map);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return { totalBudget, categoryBudgets, loading };
}
