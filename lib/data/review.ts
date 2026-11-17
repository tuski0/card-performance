import type { Payment } from '@/lib/cards';
import { pendingQuestions } from '@/lib/engine/compute';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listNotificationPayments } from './payments';

/** An auto-recorded payment that still needs the user: an unknown category or an unanswered benefit question. */
export function needsReview(p: Payment): boolean {
  if (p.source !== 'notification' || p.canceled) return false;
  return p.category === 'unknown' || pendingQuestions(p.cardId, p.category, p.brand).some((q) => !(q.key in p.answers));
}

export type InboxItem = { id: string; text: string; reason: string; postedAt: string };

/** Notices the app could not handle by itself, newest first. */
export async function listInbox(db: SupabaseClient): Promise<InboxItem[]> {
  const { data, error } = await db.from('notification_inbox').select('id, text, reason, posted_at, created_at')
    .eq('resolved', false).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as { id: string; text: string; reason: string; posted_at: string | null; created_at: string }[])
    .map((r) => ({ id: r.id, text: r.text, reason: r.reason, postedAt: r.posted_at ?? r.created_at }));
}

export async function resolveInbox(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('notification_inbox').update({ resolved: true }).eq('id', id);
  if (error) throw error;
}

/** Everything waiting for review. */
export async function loadReview(db: SupabaseClient): Promise<{ payments: Payment[]; inbox: InboxItem[] }> {
  const [all, inbox] = await Promise.all([listNotificationPayments(db), listInbox(db)]);
  return { payments: all.filter(needsReview), inbox };
}
