'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardId, Payment } from '@/lib/cards';
import { computeMonth, type MonthResult, type StartBalance } from '@/lib/engine/compute';
import { monthKey, monthStartIso, nextMonth, prevMonth } from '@/lib/engine/month';
import { createClient } from '@/lib/supabase/client';
import { listPayments, listStarts } from './payments';

export type MonthData = {
  month: string;
  payments: Payment[];
  starts: Partial<Record<CardId, Record<string, StartBalance>>>;
  result: (cardId: CardId) => MonthResult;
};

/** Loads this month plus two prior months (for eligibility) and computes results per card. */
export function useMonthData() {
  const db = useMemo(() => createClient(), []);
  const month = monthKey(new Date().toISOString());
  const [data, setData] = useState<Omit<MonthData, 'result'> | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const range = { from: monthStartIso(prevMonth(prevMonth(month))), to: monthStartIso(nextMonth(month)) };
      const [payments, starts] = await Promise.all([listPayments(db, range), listStarts(db)]);
      setData({ month, payments, starts });
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했어요.');
    }
  }, [db, month]);

  useEffect(() => { reload(); }, [reload]);

  const value: MonthData | null = data && {
    ...data,
    result: (cardId) => computeMonth(cardId, data.month, data.payments, data.starts[cardId] ?? {}),
  };
  return { data: value, error, reload, db };
}
