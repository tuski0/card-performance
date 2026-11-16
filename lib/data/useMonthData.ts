'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CARDS, type CardId, type Payment } from '@/lib/cards';
import { computeMonth, type MonthResult, type StartBalance } from '@/lib/engine/compute';
import { monthKey, monthStartIso, nextMonth, prevMonth } from '@/lib/engine/month';
import { createClient } from '@/lib/supabase/client';
import { listPayments, listStarts } from './payments';

export type MonthData = {
  month: string;
  payments: Payment[];
  starts: Partial<Record<CardId, Record<string, StartBalance>>>;
  results: Record<CardId, MonthResult>;
  /** Total discount + cashback applied to each payment this month. */
  benefitByPayment: Map<string, number>;
};

export const thisMonth = () => monthKey(new Date().toISOString());

/** Loads the month plus two prior months (for eligibility) and computes results per card. */
export function useMonthData(month: string = thisMonth()) {
  const db = useMemo(() => createClient(), []);
  const [raw, setRaw] = useState<{ month: string; payments: Payment[]; starts: MonthData['starts'] } | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const range = { from: monthStartIso(prevMonth(prevMonth(month))), to: monthStartIso(nextMonth(month)) };
      const [payments, starts] = await Promise.all([listPayments(db, range), listStarts(db)]);
      setRaw({ month, payments, starts });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했어요.');
    }
  }, [db, month]);

  useEffect(() => { reload(); }, [reload]);

  const data = useMemo<MonthData | null>(() => {
    if (!raw || raw.month !== month) return null;
    const results = Object.fromEntries(
      (Object.keys(CARDS) as CardId[]).map((id) => [id, computeMonth(id, month, raw.payments, raw.starts[id] ?? {})]),
    ) as Record<CardId, MonthResult>;
    const benefitByPayment = new Map<string, number>();
    for (const r of Object.values(results)) {
      for (const b of r.benefits) for (const a of b.applications) {
        benefitByPayment.set(a.paymentId, (benefitByPayment.get(a.paymentId) ?? 0) + a.amount);
      }
    }
    return { ...raw, results, benefitByPayment };
  }, [raw, month]);

  return { data, error, reload, db };
}
