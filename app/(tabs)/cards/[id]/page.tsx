'use client';

import { errMsg } from '@/lib/format';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, CardChip, CardFace, Panel, Progress, Screen, TopBar, primaryBtn } from '@/components/ui';
import { CARDS, type CardId } from '@/lib/cards';
import { getCardNumbers } from '@/lib/data/cardNumbers';
import { saveStart } from '@/lib/data/payments';
import { useMonthData } from '@/lib/data/useMonthData';
import type { StartBalance } from '@/lib/engine/compute';
import { monthKey, prevMonth } from '@/lib/engine/month';
import { won } from '@/lib/format';
import { daysUntil } from '@/lib/engine/schedule';
import { dayKey } from '@/lib/engine/month';

export default function CardPage() {
  const cardId = useParams<{ id: string }>().id as CardId;
  const card = CARDS[cardId];
  const { data, error, reload, db } = useMonthData();
  const [open, setOpen] = useState<string | null>(null);
  const [editingStart, setEditingStart] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  useEffect(() => {
    getCardNumbers(db).then((m) => setLast4(Object.entries(m).find(([, id]) => id === cardId)?.[0] ?? null)).catch(() => {});
  }, [db, cardId]);

  if (!card) return <Screen><TopBar back="/cards" title="없는 카드예요" /></Screen>;

  const r = data?.results[cardId];
  const byId = new Map(data?.payments.map((p) => [p.id, p]));
  const list = data ? data.payments.filter((p) => p.cardId === cardId && monthKey(p.paidAt) === data.month).reverse() : [];
  const done = r && r.target !== null && r.remainingToTarget === 0;

  return (
    <Screen>
      <TopBar back="/cards" title={<span className="flex items-center gap-2 text-lg font-bold"><CardChip id={cardId} size={30} />{card.name}</span>} />
      {error && <Panel><p className="text-bad">{error}</p></Panel>}
      {!r && !error && <Panel><p className="text-ink-3">불러오는 중…</p></Panel>}
      <div className="py-1"><CardFace id={cardId} name={card.name} last4={last4} /></div>

      {r && data && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start [&>*]:min-w-0">
          <div className="flex flex-col gap-3">
            <Panel>
              <div className="flex items-center justify-between">
                <p className="text-[15px] text-ink-2">이번 달 인정 실적</p>
                {r.eligibility === 'eligible' && <Badge tone="good">이번 달 혜택 중</Badge>}
                {r.eligibility === 'unknown' && <Badge tone="warn">전월 실적 미확인</Badge>}
                {r.eligibility === 'ineligible' && <Badge tone="bad">전월 실적 부족</Badge>}
              </div>
              <p className="mt-1 text-[30px] font-bold tracking-tight">{won(r.performance)}</p>
              {card.validUntil && (() => {
                const left = daysUntil(card.validUntil, dayKey(new Date().toISOString()));
                return (
                  <p className={`mt-2 inline-block rounded-lg px-2 py-1 text-xs font-semibold ${left <= 30 ? 'bg-warn-soft text-warn' : 'bg-fill text-ink-3'}`}>
                    {left >= 0 ? `혜택 기간 ${card.validUntil}까지 · D-${left}` : `혜택 기간 종료 (${card.validUntil})`}
                  </p>
                );
              })()}
              {r.target !== null && (
                <>
                  <div className="mt-3"><Progress value={r.performance} max={r.target} color={done ? 'var(--color-good)' : undefined} height={10} /></div>
                  <p className="mt-2 text-sm text-ink-2">
                    목표 {won(r.target)} · {done ? <span className="font-semibold text-good">달성</span> : <span className="font-semibold text-brand">{won(r.remainingToTarget ?? 0)} 남음</span>}
                  </p>
                </>
              )}
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-fill px-4 py-3 text-[13px]">
                <span className="text-ink-2">{r.scope === 'recorded-only' ? '기록한 결제 기준이에요' : '입력한 시작값을 포함했어요'}</span>
                <button className="font-semibold text-brand" onClick={() => setEditingStart((v) => !v)}>
                  {editingStart ? '닫기' : '시작값 입력'}
                </button>
              </div>
              {editingStart && (
                <StartForm
                  cardId={cardId}
                  month={data.month}
                  initial={data.starts[cardId]?.[data.month]}
                  initialPrev={data.starts[cardId]?.[prevMonth(data.month)]?.performance}
                  onSave={async (cur, prev) => {
                    // Keep this month's flag if it was a statement total.
                    await saveStart(db, cardId, data.month, { ...cur, isTotal: data.starts[cardId]?.[data.month]?.isTotal });
                    const prevKey = prevMonth(data.month);
                    const old = data.starts[cardId]?.[prevKey];
                    // Only write last month when its figure changed, and keep whatever benefit usage it already had.
                    if (prev !== null && prev !== old?.performance) {
                      await saveStart(db, cardId, prevKey, { performance: prev, benefitUsed: old?.benefitUsed ?? {}, isTotal: true });
                    }
                    setEditingStart(false);
                    await reload();
                  }}
                />
              )}
            </Panel>

            <Panel className="!px-2 !py-3">
              <h2 className="px-3 pb-2 pt-1 text-[15px] font-semibold">혜택별 한도</h2>
              {r.benefits.map((b) => (
                <div key={b.id} className="rounded-2xl px-3 py-2.5">
                  <button className="w-full text-left" onClick={() => setOpen(open === b.id ? null : b.id)} aria-expanded={open === b.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{b.label}</span>
                      <span className="shrink-0 text-[13px] text-ink-3">
                        {b.kind === 'cashback' ? <>예상 적립 <b className="text-brand">{won(b.used)}</b></>
                          : b.cap !== null ? <><b className="text-ink">{won(b.used)}</b> / {won(b.cap)}</>
                          : <b className="text-ink">{won(b.used)}</b>}
                      </span>
                    </div>
                    {b.cap !== null && <div className="mt-2"><Progress value={b.used} max={b.cap} height={6} color={b.remaining === 0 ? 'var(--color-good)' : undefined} /></div>}
                  </button>
                  {open === b.id && (
                    <ul className="mt-2 flex flex-col gap-1 rounded-xl bg-fill px-3 py-2 text-[13px] text-ink-2">
                      {b.applications.length === 0 && <li>아직 적용된 결제가 없어요</li>}
                      {b.applications.map((a) => {
                        const p = byId.get(a.paymentId);
                        return (
                          <li key={a.paymentId} className="flex justify-between gap-2">
                            <span className="truncate">{p ? `${new Date(p.paidAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${p.merchant}` : '결제'}</span>
                            <span className="shrink-0 font-semibold text-brand">{won(a.amount)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </Panel>
          </div>

          <Panel className="!px-2 !py-3">
            <h2 className="px-3 pb-1 pt-1 text-[15px] font-semibold">이번 달 결제 {list.length}건</h2>
            {list.length === 0 && <p className="px-3 py-6 text-center text-ink-3">기록한 결제가 없어요</p>}
            {list.map((p) => (
              <Link key={p.id} href={`/new?id=${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 active:bg-fill">
                <div className="min-w-0">
                  <p className={`truncate font-medium ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{p.merchant}</p>
                  <p className="text-xs text-ink-3">{new Date(p.paidAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-semibold ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{won(p.amount)}</p>
                  {(data.benefitByPayment.get(p.id) ?? 0) > 0 && <p className="text-xs font-semibold text-brand">혜택 {won(data.benefitByPayment.get(p.id)!)}</p>}
                </div>
              </Link>
            ))}
          </Panel>
        </div>
      )}
    </Screen>
  );
}

function StartForm({ cardId, month, initial, initialPrev, onSave }: {
  cardId: CardId;
  month: string;
  initial?: StartBalance;
  initialPrev?: number;
  onSave: (cur: StartBalance, prev: number | null) => Promise<void>;
}) {
  const card = CARDS[cardId];
  const [perf, setPerf] = useState(initial?.performance ? String(initial.performance) : '');
  const [prev, setPrev] = useState(initialPrev === undefined ? '' : String(initialPrev));
  const [used, setUsed] = useState<Record<string, string>>(
    Object.fromEntries(card.benefits.map((b) => [b.id, initial?.benefitUsed[b.id] ? String(initial.benefitUsed[b.id]) : ''])));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const num = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(/,/g, '')));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const all = [perf, prev, ...Object.values(used)];
    if (all.some((s) => s.trim() !== '' && !(Number.isInteger(num(s)) && num(s) >= 0))) return setErr('0 이상의 숫자만 입력해 주세요');
    setBusy(true);
    try {
      await onSave(
        { performance: num(perf), benefitUsed: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, num(v)]).filter(([, v]) => v)) },
        prev.trim() === '' ? null : num(prev),
      );
    } catch (e) {
      setErr(errMsg(e, '저장하지 못했어요'));
      setBusy(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, placeholder = '0') => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-ink-2">{label}</span>
      <input inputMode="numeric" value={value} placeholder={placeholder} onChange={(e) => { set(e.target.value); setErr(''); }} className="input" />
    </label>
  );

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">카드사 앱이나 명세서에 나온 값을 넣어 주세요. 비워 두면 0으로 봐요.</p>
      {field('지난달 실적 (명세서의 이용 실적 전체)', prev, setPrev, '모르면 비워 두세요')}
      {field(`${Number(month.slice(5))}월, 앱에 기록하기 전까지의 실적`, perf, setPerf)}
      {card.benefits.filter((b) => b.monthlyCap !== undefined).map((b) =>
        <div key={b.id}>{field(`${b.label} 이미 받은 할인`, used[b.id], (v) => setUsed((u) => ({ ...u, [b.id]: v })))}</div>)}
      {err && <p className="text-sm text-bad">{err}</p>}
      <button disabled={busy} className={primaryBtn}>{busy ? '저장 중…' : '시작값 저장'}</button>
    </form>
  );
}
