'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CardId, Payment } from '@/lib/cards';
import type { StartBalance } from '@/lib/engine/compute';
import { benefitMap } from '@/lib/engine/history';
import { createClient } from '@/lib/supabase/client';
import { errMsg } from '@/lib/format';
import { listPayments, listStarts } from './payments';

/** Every payment the user has recorded, with benefits worked out per payment. */
export function useAllPayments() {
  const db = useMemo(() => createClient(), []);
  const [raw, setRaw] = useState<{ payments: Payment[]; starts: Partial<Record<CardId, Record<string, StartBalance>>> } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listPayments(db, { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' }), listStarts(db)])
      .then(([payments, starts]) => setRaw({ payments, starts }))
      .catch((e) => setError(errMsg(e, '불러오지 못했어요')));
  }, [db]);

  const benefit = useMemo(() => (raw ? benefitMap(raw.payments, raw.starts) : new Map<string, number>()), [raw]);
  return { payments: raw?.payments ?? null, benefit, error };
}
