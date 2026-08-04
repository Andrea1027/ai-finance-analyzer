// Vercel Serverless Function, triggered on a schedule (see vercel.json).
// Sends a trivial read request to Supabase's REST API so the project
// always shows recent activity — Supabase's free tier auto-pauses a
// project after 7 days with no database requests, which is what caused
// the "server can't be found" error. This runs daily, well inside that
// window, so the project should never go to sleep again.
//
// The request is unauthenticated at the row level (uses the public anon
// key) — Row Level Security means it won't return any actual data, but
// the query itself still counts as activity, which is all this needs.

export default async function handler(req, res) {
  // Vercel automatically sends this header on real cron invocations.
  // Rejects requests that don't have it, so this endpoint can't be used
  // by anyone else to spam your database.
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    return res.status(200).json({
      ok: true,
      supabaseStatus: response.status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
