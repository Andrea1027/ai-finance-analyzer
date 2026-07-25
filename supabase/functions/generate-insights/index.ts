// Supabase Edge Function: generate-insights
// Calls OpenRouter's free model router server-side to generate short,
// card-sized spending insights — patterns, warnings, and suggestions —
// from the user's monthly trend and category data.
//
// Deploy with: supabase functions deploy generate-insights
// Uses the same OPENROUTER_API_KEY secret as generate-benchmark.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'openrouter/free';

interface CategoryLine {
  name: string;
  total: number;
  budget?: number | null;
}

interface RequestBody {
  currency: string;
  monthsAvailable: number;
  monthlyTrend: { label: string; total: number }[];
  currentMonthCategories: CategoryLine[];
  previousMonthCategories?: CategoryLine[];
  totalBudget?: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured on the server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trendLines = body.monthlyTrend.map(m => `- ${m.label}: ${body.currency} ${m.total.toFixed(0)}`).join('\n');
    const currentLines = body.currentMonthCategories
      .map(c => `- ${c.name}: ${body.currency} ${c.total.toFixed(0)}${c.budget != null ? ` (budget: ${c.budget.toFixed(0)})` : ''}`)
      .join('\n');
    const previousLines = (body.previousMonthCategories ?? [])
      .map(c => `- ${c.name}: ${body.currency} ${c.total.toFixed(0)}`)
      .join('\n');

    const prompt = `You are a personal finance assistant. Based on this person's real spending data, generate a short list of insight cards — patterns worth noticing, warnings, and concrete suggestions. Be specific and reference actual numbers/categories, not generic advice.

Monthly totals (${body.monthsAvailable} month(s) of data):
${trendLines}

Current month by category:
${currentLines}
${body.totalBudget != null ? `\nTotal monthly budget: ${body.currency} ${body.totalBudget.toFixed(0)}` : ''}
${previousLines ? `\nPrevious month by category:\n${previousLines}` : ''}

Respond with ONLY valid JSON, no markdown, no code fences, matching exactly this shape:
{
  "insights": [
    {
      "type": "warning" | "positive" | "trend" | "suggestion",
      "keyMetric": "<short number or percentage to display prominently, e.g. '+18%' or 'HKD 320'>",
      "title": "<headline, under 8 words>",
      "detail": "<one sentence, under 20 words, specific and actionable>"
    }
  ]
}

Guidelines: generate 3 to 5 insights. Use "warning" for overspending or sharp increases, "positive" for good patterns (under budget, decreasing spend), "trend" for month-over-month shifts, "suggestion" for concrete actionable ideas (e.g. reducing a specific category, or noting healthy surplus that could be saved/invested if spending stays controlled — only suggest this if there is a genuine comfortable surplus, do not force it). Never invent numbers not derivable from the data given.`;

    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai-finance-analyzer.local',
        'X-Title': 'AI Finance Analyzer',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      }),
    });

    console.log('OpenRouter response status:', orResponse.status);

    if (!orResponse.ok) {
      const errText = await orResponse.text();
      console.error('OpenRouter error body:', errText);
      return new Response(JSON.stringify({ error: `OpenRouter API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orData = await orResponse.json();
    const rawText: string = orData.choices?.[0]?.message?.content ?? '';

    let cleaned = rawText.replace(/```json|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-insights crashed:', err instanceof Error ? err.stack : err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
