import type { SupabaseClient } from '@supabase/supabase-js';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** 32 random bytes as 64 hex characters. */
export function randomToken(): string {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(s: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
}

/** Registers a new device token. Only its hash is stored; the raw token is returned once. */
export async function createDeviceToken(db: SupabaseClient): Promise<string> {
  const token = randomToken();
  const { error } = await db.from('device_tokens').insert({ token_hash: await sha256Hex(token) });
  if (error) throw error;
  return token;
}

/** Removes every token of the signed-in user (RLS limits this to their own rows). */
export async function revokeDeviceTokens(db: SupabaseClient): Promise<void> {
  const { error } = await db.from('device_tokens').delete().not('id', 'is', null);
  if (error) throw error;
}
