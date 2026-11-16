'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CARDS, type CardId } from '@/lib/cards';
import { saveStart } from '@/lib/data/payments';
import { useMonthData } from '@/lib/data/useMonthData';
import { monthKey, prevMonth } from '@/lib/engine/month';
import { won } from '@/lib/format';

export default function CardPage() {
  const cardId = useParams<{ id: string }>().id as CardId;
  const card = CARDS[cardId];
  const { data, error, reload, db } = useMonthData();
  const [open, setOpen] = useState<string | null>(null);
  const [editingStart, setEditingStart] = useState(false);

  if (!card) return <main className="p-6">없는 카드예요. <Link href="/" className="underline">돌아가기</Link></main>;
  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!data) return <main className="p-6 text-neutral-500">불러오는 중…</main>;

  const r = data.result(cardId);
  const byId = new Map(data.payments.map((p) => [p.id, p]));
  const thisMonth = data.payments.filter((p) => p.cardId === cardId && monthKey(p.paidAt) === data.month).reverse();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <Link href="/" className="text-sm underline">← 현황</Link>
        <Link href="/new" className="rounded-lg bg-black px-4 py-2 text-white">+ 결제 기록</Link>
      </header>
      <h1 className="text-xl font-semibold">{card.name}</h1>

      <section className="rounded-xl border p-4 text-sm">
        <Row k="이번 달 인정 실적" v={won(r.performance)} />
        {r.target !== null && <Row k={`목표 ${won(r.target)}까지`} v={won(r.remainingToTarget ?? 0)} />}
        <Row k="혜택 자격" v={{ eligible: '받는 중', ineligible: '전월 실적 부족', unknown: '미확인' }[r.eligibility]} />
        <p className="mt-2 text-xs text-neutral-500">
          {r.scope === 'recorded-only' ? '기록한 결제 기준' : '입력한 시작값 + 기록한 결제'}
          {' · '}
          <button className="underline" onClick={() => setEditingStart((v) => !v)}>시작값 입력</button>
        </p>
        {editingStart && (
          <StartForm
            cardId={cardId}
            month={data.month}
            initial={data.starts[cardId]?.[data.month]}
            initialPrev={data.starts[cardId]?.[prevMonth(data.month)]?.performance}
            onSave={async (cur, prev) => {
              await saveStart(db, cardId, data.month, cur);
              if (prev !== null) await saveStart(db, cardId, prevMonth(data.month), { performance: prev, benefitUsed: {} });
              setEditingStart(false);
              await reload();
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">혜택</h2>
        {r.benefits.map((b) => (
          <div key={b.id} className="rounded-xl border p-3 text-sm">
            <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(open === b.id ? null : b.id)}>
              <span>{b.label}</span>
              <span>
                {b.kind === 'cashback' ? `예상 적립 ${won(b.used)}` : `${won(b.used)} 사용`}
                {b.remaining !== null && <span className="text-neutral-500"> · 남은 {won(b.remaining)}</span>}
              </span>
            </button>
            {open === b.id && (
              <ul className="mt-2 flex flex-col gap-1 border-t pt-2 text-neutral-600">
                {b.applications.length === 0 && <li>아직 적용된 결제가 없어요.</li>}
                {b.applications.map((a) => {
                  const p = byId.get(a.paymentId);
                  return (
                    <li key={a.paymentId} className="flex justify-between">
                      <span>{p ? `${new Date(p.paidAt).toLocaleDateString('ko-KR')} ${p.merchant} ${won(p.amount)}` : a.paymentId}</span>
                      <span>{won(a.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">이번 달 결제</h2>
        {thisMonth.length === 0 && <p className="text-sm text-neutral-500">기록한 결제가 없어요.</p>}
        {thisMonth.map((p) => (
          <Link key={p.id} href={`/new?id=${p.id}`} className={`flex justify-between rounded-lg border px-3 py-2 text-sm ${p.canceled ? 'text-neutral-400 line-through' : ''}`}>
            <span>{new Date(p.paidAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} {p.merchant}</span>
            <span>{won(p.amount)}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between py-0.5"><span className="text-neutral-600">{k}</span><span>{v}</span></div>;
}

function StartForm({ cardId, month, initial, initialPrev, onSave }: {
  cardId: CardId;
  month: string;
  initial?: { performance: number; benefitUsed: Record<string, number> };
  initialPrev?: number;
  onSave: (cur: { performance: number; benefitUsed: Record<string, number> }, prev: number | null) => Promise<void>;
}) {
  const card = CARDS[cardId];
  const [perf, setPerf] = useState(String(initial?.performance ?? ''));
  const [prev, setPrev] = useState(initialPrev === undefined ? '' : String(initialPrev));
  const [used, setUsed] = useState<Record<string, string>>(
    Object.fromEntries(card.benefits.map((b) => [b.id, String(initial?.benefitUsed[b.id] ?? '')])));
  const [err, setErr] = useState('');

  const num = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(/,/g, '')));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const all = [perf, prev, ...Object.values(used)];
    if (all.some((s) => s.trim() !== '' && !(Number.isInteger(num(s)) && num(s) >= 0))) return setErr('0 이상의 숫자만 입력해 주세요.');
    await onSave(
      { performance: num(perf), benefitUsed: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, num(v)]).filter(([, v]) => v)) },
      prev.trim() === '' ? null : num(prev),
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 border-t pt-3">
      <p className="text-xs text-neutral-500">카드 앱이나 명세서에서 본 값을 넣어 주세요. 비워 두면 0으로 봅니다.</p>
      <label className="flex items-center justify-between gap-2">지난달 실적
        <input inputMode="numeric" value={prev} onChange={(e) => { setPrev(e.target.value); setErr(''); }} className="input w-36" placeholder="모르면 비움" />
      </label>
      <label className="flex items-center justify-between gap-2">{Number(month.slice(5))}월 기록 전 실적
        <input inputMode="numeric" value={perf} onChange={(e) => { setPerf(e.target.value); setErr(''); }} className="input w-36" />
      </label>
      {card.benefits.filter((b) => b.monthlyCap !== undefined).map((b) => (
        <label key={b.id} className="flex items-center justify-between gap-2">{b.label} 사용액
          <input inputMode="numeric" value={used[b.id]} onChange={(e) => { setUsed({ ...used, [b.id]: e.target.value }); setErr(''); }} className="input w-36" />
        </label>
      ))}
      {err && <p className="text-red-600">{err}</p>}
      <button className="rounded-lg bg-black px-3 py-2 text-white">저장</button>
    </form>
  );
}
