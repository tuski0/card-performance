'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { toFormQuery } from '@/lib/parse';

/** Web Share Target: turns shared notification text into a prefilled payment form. */
function ShareInner() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const text = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\n');
    const query = toFormQuery(text);
    router.replace(new URLSearchParams(query).get('cancel') ? `/cancel?${query}` : `/new?${query}`);
  }, [params, router]);
  return <p className="p-6 text-ink-3">공유한 내용을 읽는 중…</p>;
}

export default function SharePage() {
  return <Suspense><ShareInner /></Suspense>;
}
