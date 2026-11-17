export const MAX_TEXT = 2000;
const MAX_KEY = 200;
const MAX_PACKAGE = 200;

export type IngestBody = { text: string; package: string; postedAt: number; key: string };

export type IngestRequest =
  | { ok: true; token: string; body: IngestBody }
  | { ok: false; status: 400 | 401; error: string };

/** Pulls the token out of an `Authorization: Bearer <token>` header. */
export function parseBearer(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '');
  return m ? m[1] : null;
}

/** Checks the header and JSON body of an ingest call. No network, so it is easy to test. */
export function parseIngestRequest(authHeader: string | null | undefined, raw: unknown): IngestRequest {
  const token = parseBearer(authHeader);
  if (!token) return { ok: false, status: 401, error: 'missing token' };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, status: 400, error: 'invalid body' };
  const b = raw as Record<string, unknown>;
  if (typeof b.text !== 'string' || b.text.trim() === '') return { ok: false, status: 400, error: 'text is required' };
  if (b.text.length > MAX_TEXT) return { ok: false, status: 400, error: 'text too long' };
  if (typeof b.package !== 'string' || b.package.length > MAX_PACKAGE) return { ok: false, status: 400, error: 'invalid package' };
  if (typeof b.postedAt !== 'number' || !Number.isFinite(b.postedAt) || b.postedAt <= 0 || Number.isNaN(new Date(b.postedAt).getTime())) {
    return { ok: false, status: 400, error: 'invalid postedAt' };
  }
  if (typeof b.key !== 'string' || b.key === '' || b.key.length > MAX_KEY) return { ok: false, status: 400, error: 'invalid key' };
  return { ok: true, token, body: { text: b.text, package: b.package, postedAt: b.postedAt, key: b.key } };
}
