'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadReview } from '@/lib/data/review';
import { createClient } from '@/lib/supabase/client';

/** Counts auto-recorded payments and notices that wait for the user. Hidden when there are none. */
export default function ReviewBanner() {
  const db = useMemo(() => createClient(), []);
  const [n, setN] = useState(0);
  useEffect(() => {
    loadReview(db).then((r) => setN(r.payments.length + r.inbox.length)).catch(() => {});
  }, [db]);
  if (n === 0) return null;
  return (
    <Link href="/review" className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-[14px] text-brand">
      <span className="flex-1"><b>자동 기록 확인 {n}건</b></span>
      <span aria-hidden>›</span>
    </Link>
  );
}
