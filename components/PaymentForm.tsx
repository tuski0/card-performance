'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CARDS, type CardId, type Category, type Payment } from '@/lib/cards';
import { deletePayment, listPayments, listStarts, savePayment } from '@/lib/data/payments';
import { computeMonth, crossesTarget, pendingQuestions, type MonthResult, type Starts } from '@/lib/engine/compute';
import { monthKey, monthStartIso, nextMonth, prevMonth } from '@/lib/engine/month';
import { CATEGORY_LABELS, guessCategory } from '@/lib/merchants';
import { createClient } from '@/lib/supabase/client';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

type Outcome = { saved: Payment; before: MonthResult; after: MonthResult };

export default function PaymentForm() {
  const db = useMemo(() => createClient(), []);
  const editId = useSearchParams().get('id');
  const router = useRouter();

  const [cardId, setCardId] = useState<CardId>('kb-youth-b');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<Category>('unknown');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [paidAt, setPaidAt] = useState(() => toLocalInput(new Date().toISOString()));
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [canceled, setCanceled] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!editId) return;
    db.from('payments').select('*').eq('id', editId).single().then(({ data }) => {
      if (!data) return;
      setCardId(data.card_id);
      setAmount(String(data.amount));
      setMerchant(data.merchant);
      setCategory(data.category);
      setCategoryTouched(true);
      setPaidAt(toLocalInput(data.paid_at));
      setAnswers(data.answers ?? {});
      setCanceled(data.canceled);
    });
  }, [db, editId]);

  const questions = pendingQuestions(cardId, category);

  function onMerchant(v: string) {
    setMerchant(v);
    if (!categoryTouched) setCategory(guessCategory(v));
    setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ''));
    if (!Number.isInteger(n) || n <= 0) return setError('금액을 원 단위 숫자로 입력해 주세요.');
    if (!merchant.trim()) return setError('가맹점을 입력해 주세요.');
    const paidIso = new Date(paidAt).toISOString();
    if (Number.isNaN(Date.parse(paidIso))) return setError('결제 시각을 확인해 주세요.');

    setSaving(true);
    setError('');
    try {
      const month = monthKey(paidIso);
      const range = { from: monthStartIso(prevMonth(prevMonth(month))), to: monthStartIso(nextMonth(month)) };
      const [existing, allStarts] = await Promise.all([listPayments(db, range), listStarts(db)]);
      const starts: Starts = allStarts[cardId] ?? {};
      const others = existing.filter((p) => p.id !== editId);
      const before = computeMonth(cardId, month, others, starts);

      const saved = await savePayment(db, {
        ...(editId ? { id: editId } : {}),
        cardId, amount: n, merchant: merchant.trim(), category, paidAt: paidIso, canceled,
        answers: Object.fromEntries(questions.map((q) => [q.key, answers[q.key] === true])),
      });
      const after = computeMonth(cardId, month, [...others, saved], starts);
      setOutcome({ saved, before, after });
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }

  if (outcome) return <Result outcome={outcome} onAgain={() => { setOutcome(null); setAmount(''); setMerchant(''); setCategory('unknown'); setCategoryTouched(false); setAnswers({}); }} />;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{editId ? '결제 수정' : '결제 기록'}</h1>
        <Link href="/" className="text-sm underline">카드 현황</Link>
      </header>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="카드">
          <select value={cardId} onChange={(e) => setCardId(e.target.value as CardId)} className="input">
            {Object.values(CARDS).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="금액">
          <input inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="5000" className="input" />
        </Field>
        <Field label="가맹점">
          <input value={merchant} onChange={(e) => onMerchant(e.target.value)} placeholder="CU 강남점" className="input" />
        </Field>
        <Field label="분류">
          <select value={category} onChange={(e) => { setCategory(e.target.value as Category); setCategoryTouched(true); }} className="input">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {category === 'unknown' && <p className="mt-1 text-xs text-amber-700">분류를 정하기 전까지는 할인을 계산하지 않아요.</p>}
        </Field>
        {questions.map((q) => (
          <fieldset key={q.key} className="rounded-lg border p-3">
            <legend className="px-1 text-sm">{q.text}</legend>
            <div className="flex gap-4">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={q.key} checked={answers[q.key] === v} onChange={() => setAnswers({ ...answers, [q.key]: v })} />
                  {v ? '예' : '아니요'}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <Field label="결제 시각">
          <input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input" />
        </Field>
        {editId && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canceled} onChange={(e) => setCanceled(e.target.checked)} />
            취소된 결제 (실적·할인에서 제외)
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={saving} className="rounded-lg bg-black px-3 py-3 text-white disabled:opacity-50">
          {saving ? '저장 중…' : '저장'}
        </button>
        {editId && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              setSaving(true);
              try {
                await deletePayment(db, editId);
                router.replace('/');
              } catch (err) {
                setError(err instanceof Error ? err.message : '삭제하지 못했어요.');
                setSaving(false);
              }
            }}
            className={`rounded-lg border border-red-600 px-3 py-3 disabled:opacity-50 ${confirmDelete ? 'bg-red-600 text-white' : 'text-red-600'}`}
          >
            {confirmDelete ? '한 번 더 누르면 삭제돼요 (되돌릴 수 없음)' : '삭제'}
          </button>
        )}
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-neutral-600">{label}</span>
      {children}
    </div>
  );
}

function Result({ outcome, onAgain }: { outcome: Outcome; onAgain: () => void }) {
  const { saved, before, after } = outcome;
  const card = CARDS[saved.cardId];
  const applied = after.benefits.flatMap((b) =>
    b.applications.filter((a) => a.paymentId === saved.id).map((a) => ({ ...b, amount: a.amount })));
  const reached = crossesTarget(before, after);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">저장했어요</h1>
      <p className="text-sm text-neutral-600">{card.name} · {saved.merchant} · {won(saved.amount)}{saved.canceled && ' (취소)'}</p>

      {reached && (
        <div className="rounded-lg border border-green-600 bg-green-50 p-3 text-green-900">
          이번 달 실적 {won(after.performance)} — 목표 {won(after.target ?? 0)}에 도달했어요.
        </div>
      )}

      <section className="rounded-lg border p-3">
        <h2 className="mb-2 font-medium">이 결제의 혜택</h2>
        {applied.length === 0 ? (
          <p className="text-sm text-neutral-600">적용된 할인·적립이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {applied.map((b) => (
              <li key={b.id} className="flex justify-between">
                <span>{b.label}</span>
                <span>{b.kind === 'cashback' ? '적립' : '할인'} {won(b.amount)}{b.remaining !== null && ` · 남은 한도 ${won(b.remaining)}`}</span>
              </li>
            ))}
          </ul>
        )}
        {after.eligibility === 'unknown' && <p className="mt-2 text-xs text-amber-700">전월 실적을 몰라 혜택 자격은 미확인이에요.</p>}
        {after.eligibility === 'ineligible' && <p className="mt-2 text-xs text-amber-700">전월 실적이 부족해 이번 달 혜택이 없어요.</p>}
      </section>

      <section className="rounded-lg border p-3 text-sm">
        <div className="flex justify-between"><span>이번 달 실적</span><span>{won(after.performance)}</span></div>
        {after.target !== null && (
          <div className="flex justify-between"><span>목표까지</span><span>{won(after.remainingToTarget ?? 0)}</span></div>
        )}
        {after.scope === 'recorded-only' && <p className="mt-1 text-xs text-neutral-500">기록한 결제 기준</p>}
      </section>

      <div className="flex gap-2">
        <button onClick={onAgain} className="flex-1 rounded-lg bg-black px-3 py-3 text-white">하나 더 기록</button>
        <Link href={`/new?id=${saved.id}`} className="flex-1 rounded-lg border px-3 py-3 text-center">수정</Link>
      </div>
    </main>
  );
}
