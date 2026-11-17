import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { decideIngest, type IngestContext } from '@/lib/ingest';
import { dbErrorStatus, parseIngestRequest } from '@/lib/ingestRequest';

export const dynamic = 'force-dynamic';

const json = (body: object, status = 200) => NextResponse.json(body, { status });

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { raw = null; }
  const req = parseIngestRequest(request.headers.get('authorization'), raw);
  if (!req.ok) return json({ error: req.error }, req.status);
  const { token, body } = req;

  // No cookies: the device token is the only credential, checked inside the SQL functions.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ctx = await db.rpc('ingest_context', { p_token: token });
  if (ctx.error) return json({ error: 'server error' }, 500);
  if (ctx.data === null) return json({ error: 'invalid token' }, 401);

  const postedAt = new Date(body.postedAt);
  const action = decideIngest(body.text, ctx.data as IngestContext, postedAt);
  if (action.kind === 'ignore') return json({ result: 'ignored' });

  const saved = await db.rpc('ingest_save', {
    p_token: token, p_action: action, p_source_key: body.key, p_text: body.text, p_posted_at: postedAt.toISOString(),
  });
  if (saved.error) {
    const status = dbErrorStatus(saved.error.code);
    return json({ error: status === 400 ? 'invalid input' : 'server error' }, status);
  }
  if (saved.data === 'unauthorized') return json({ error: 'invalid token' }, 401);
  return json({ result: saved.data });
}
