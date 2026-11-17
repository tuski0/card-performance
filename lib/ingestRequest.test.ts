import { describe, expect, it } from 'vitest';
import { parseBearer, parseIngestRequest } from './ingestRequest';

const ok = { text: '5,000원 승인', package: 'x.y', postedAt: 1763249640000, key: 'k1' };

describe('parseBearer', () => {
  it('reads a bearer token', () => expect(parseBearer('Bearer abc123')).toBe('abc123'));
  it('is case-insensitive on the scheme', () => expect(parseBearer('bearer abc')).toBe('abc'));
  it.each([null, undefined, '', 'Bearer', 'Bearer ', 'Basic abc', 'abc', 'Bearer a b'])('rejects %s', (h) => expect(parseBearer(h)).toBeNull());
});

describe('parseIngestRequest', () => {
  it('accepts a valid call', () => {
    expect(parseIngestRequest('Bearer t', ok)).toEqual({ ok: true, token: 't', body: ok });
  });
  it('401 without a token', () => {
    expect(parseIngestRequest(null, ok)).toMatchObject({ ok: false, status: 401 });
  });
  it.each([null, 'str', 5, [], {}])('400 for body %j', (b) => {
    expect(parseIngestRequest('Bearer t', b)).toMatchObject({ ok: false, status: 400 });
  });
  it('400 for empty or non-string text', () => {
    expect(parseIngestRequest('Bearer t', { ...ok, text: '  ' })).toMatchObject({ status: 400 });
    expect(parseIngestRequest('Bearer t', { ...ok, text: 1 })).toMatchObject({ status: 400 });
  });
  it('allows 2000 chars but not 2001', () => {
    expect(parseIngestRequest('Bearer t', { ...ok, text: 'a'.repeat(2000) })).toMatchObject({ ok: true });
    expect(parseIngestRequest('Bearer t', { ...ok, text: 'a'.repeat(2001) })).toMatchObject({ ok: false, status: 400 });
  });
  it('400 for bad postedAt', () => {
    for (const postedAt of ['1', 0, -1, NaN, Infinity, 1e20, undefined]) {
      expect(parseIngestRequest('Bearer t', { ...ok, postedAt })).toMatchObject({ ok: false, status: 400 });
    }
  });
  it('400 for bad key or package', () => {
    expect(parseIngestRequest('Bearer t', { ...ok, key: '' })).toMatchObject({ status: 400 });
    expect(parseIngestRequest('Bearer t', { ...ok, key: 'k'.repeat(201) })).toMatchObject({ status: 400 });
    expect(parseIngestRequest('Bearer t', { ...ok, package: 5 })).toMatchObject({ status: 400 });
  });
});
