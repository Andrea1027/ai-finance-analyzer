// Supabase Edge Function: generate-benchmark
// Calls OpenRouter's API (free tier, open-weight models like Llama/Qwen)
// server-side, so the API key never reaches the browser. OpenRouter
// aggregates multiple underlying providers, so it's less prone to the
// single-provider anti-bot blocks some networks hit with a direct Groq
// connection.
//
// Deploy with: supabase functions deploy generate-benchmark
// Set the secret with: supabase secrets set OPENROUTER_API_KEY=your-key-here

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Uses OpenRouter's Free Models Router, which automatically picks whichever
// free model is currently available — avoids hardcoding a specific model
// that OpenRouter may later deprecate or move to paid-only.
const MODEL = 'openrouter/free';

interface CategorySummary {
  name: string;
  avgMonthly: number;
  monthsOfData: number;
}

interface RequestBody {
  currency: string;
  categories: CategorySummary[];
  monthsAvailable: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { currency, categories, monthsAvailable }: RequestBody = await req.json();
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured on the server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const categoryLines = categories
      .map(c => `- ${c.name}: averages ${currency} ${c.avgMonthly.toFixed(0)}/month (based on ${c.monthsOfData} month(s) of data)`)
      .join('\n');

    const prompt = `You are a personal finance assistant. Based on this person's actual spending history, propose a sensible monthly budget benchmark.

Data available: ${monthsAvailable} month(s) of spending history.

Category averages:
${categoryLines}

Respond with ONLY valid JSON, no markdown formatting, no code fences, matching exactly this shape:
{
  "totalBudget": <number>,
  "categories": [
    { "name": "<category name exactly as given above>", "suggestedBudget": <number>, "reasoning": "<one short sentence>" }
  ],
  "overallInsight": "<one or two sentences of overall guidance>"
}

Guidelines: with limited months of data, be conservative and stay close to the actual average rather than guessing aggressively. Round budget numbers to sensible increments (nearest 10 or 50). Keep every reasoning string under 20 words.`;

    console.log('Calling OpenRouter with model:', MODEL);

    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Recommended by OpenRouter for free-tier usage attribution — not
        // secret, safe to hardcode.
        'HTTP-Referer': 'https://ai-finance-analyzer.local',
        'X-Title': 'AI Finance Analyzer',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
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
    console.log('OpenRouter response body:', JSON.stringify(orData).slice(0, 500));
    const rawText: string = orData.choices?.[0]?.message?.content ?? '';

    // Models don't always respect "no markdown" — strip fences and grab the
    // outermost {...} block defensively before parsing.
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
    console.error('generate-benchmark crashed:', err instanceof Error ? err.stack : err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
