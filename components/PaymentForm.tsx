'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BottomAction, CardChip, Panel, Screen, TopBar, primaryBtn, secondaryBtn } from '@/components/ui';
import { CARDS, type CardId, type Category, type Payment } from '@/lib/cards';
import { deletePayment, listPayments, listStarts, savePayment } from '@/lib/data/payments';
import { computeMonth, crossesTarget, pendingQuestions, type MonthResult, type Starts } from '@/lib/engine/compute';
import { monthKey, monthStartIso, nextMonth, prevMonth } from '@/lib/engine/month';
import { won } from '@/lib/format';
import { CATEGORY_LABELS, guessCategory } from '@/lib/merchants';
import { createClient } from '@/lib/supabase/client';

function toLocalInput(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Now, or the given YYYY-MM-DD at the current time of day. */
function initialPaidAt(date: string | null): string {
  const now = new Date();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return toLocalInput(now);
  return `${date}T${toLocalInput(now).slice(11)}`;
}

type Outcome = { saved: Payment; before: MonthResult; after: MonthResult };

export default function PaymentForm() {
  const db = useMemo(() => createClient(), []);
  const params = useSearchParams();
  const editId = params.get('id');
  const router = useRouter();

  const [cardId, setCardId] = useState<CardId>('kb-youth-b');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<Category>('unknown');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [paidAt, setPaidAt] = useState(() => initialPaidAt(params.get('date')));
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
      setAmount(Number(data.amount).toLocaleString('ko-KR'));
      setMerchant(data.merchant);
      setCategory(data.category);
      setCategoryTouched(true);
      setPaidAt(toLocalInput(new Date(data.paid_at)));
      setAnswers(data.answers ?? {});
      setCanceled(data.canceled);
    });
  }, [db, editId]);

  const questions = pendingQuestions(cardId, category);

  function onAmount(v: string) {
    const digits = v.replace(/[^\d]/g, '');
    setAmount(digits ? Number(digits).toLocaleString('ko-KR') : '');
    setError('');
  }

  function onMerchant(v: string) {
    setMerchant(v);
    if (!categoryTouched) setCategory(guessCategory(v));
    setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ''));
    if (!Number.isInteger(n) || n <= 0) return setError('금액을 입력해 주세요');
    if (!merchant.trim()) return setError('어디서 썼는지 입력해 주세요');
    const paid = new Date(paidAt);
    if (Number.isNaN(paid.getTime())) return setError('결제 시각을 확인해 주세요');
    const paidIso = paid.toISOString();

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
      setError(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editId) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    try {
      await deletePayment(db, editId);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제하지 못했어요');
      setSaving(false);
    }
  }

  if (outcome) {
    return (
      <Result
        outcome={outcome}
        onAgain={() => {
          setOutcome(null); setAmount(''); setMerchant(''); setCategory('unknown');
          setCategoryTouched(false); setAnswers({}); router.replace('/new');
        }}
      />
    );
  }

  return (
    <Screen className="max-w-xl pb-6">
      <TopBar back="/" title={editId ? '결제 수정' : '결제 기록'} />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Panel className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-ink-3">얼마를 썼나요</span>
            <div className="flex items-baseline gap-1 border-b-2 border-line pb-1 focus-within:border-brand">
              <input
                inputMode="numeric" autoFocus={!editId} value={amount} onChange={(e) => onAmount(e.target.value)}
                placeholder="0" aria-label="금액"
                className="w-full bg-transparent text-[32px] font-bold tracking-tight outline-none placeholder:text-line"
              />
              <span className="text-2xl font-bold">원</span>
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-3">어디서 썼나요</span>
            <input value={merchant} onChange={(e) => onMerchant(e.target.value)} placeholder="CU 강남점" className="input" />
          </label>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <span className="text-[13px] font-medium text-ink-3">어떤 카드로 냈나요</span>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(CARDS).map((c) => {
              const on = c.id === cardId;
              return (
                <button
                  type="button" key={c.id} onClick={() => setCardId(c.id)} aria-pressed={on}
                  className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold ${on ? 'border-brand bg-brand-soft' : 'border-transparent bg-fill'}`}
                >
                  <CardChip id={c.id} size={28} />
                  <span className="leading-tight">{c.name.replace('KB국민 ', '').replace('KB ', '')}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-3">분류</span>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as Category); setCategoryTouched(true); }}
              className="input appearance-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {category === 'unknown' && <span className="text-xs text-warn">분류를 정하기 전까지는 할인을 계산하지 않아요</span>}
          </label>

          {questions.map((q) => (
            <div key={q.key} className="flex flex-col gap-2">
              <span className="text-[15px] font-semibold">{q.text}</span>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <button
                    type="button" key={String(v)} aria-pressed={answers[q.key] === v}
                    onClick={() => setAnswers({ ...answers, [q.key]: v })}
                    className={`h-12 rounded-2xl text-[15px] font-semibold ${answers[q.key] === v ? 'bg-brand text-white' : 'bg-fill text-ink-2'}`}
                  >
                    {v ? '네' : '아니요'}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-3">결제 시각</span>
            <input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input" />
          </label>

          {editId && (
            <label className="flex items-center justify-between rounded-2xl bg-fill px-4 py-3">
              <span className="text-[15px]">취소된 결제<span className="block text-xs text-ink-3">실적과 할인에서 빠져요</span></span>
              <input type="checkbox" checked={canceled} onChange={(e) => setCanceled(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand)]" />
            </label>
          )}
        </Panel>

        {editId && (
          <button
            type="button" onClick={remove} disabled={saving}
            className={`h-12 rounded-2xl text-[15px] font-semibold ${confirmDelete ? 'bg-bad text-white' : 'text-bad'}`}
          >
            {confirmDelete ? '한 번 더 누르면 삭제돼요 (되돌릴 수 없어요)' : '이 결제 삭제'}
          </button>
        )}

        <BottomAction aboveTabs={false}>
          {error && <p className="mb-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          <button disabled={saving} className={primaryBtn}>{saving ? '저장 중…' : '저장'}</button>
        </BottomAction>
      </form>
    </Screen>
  );
}

function Result({ outcome, onAgain }: { outcome: Outcome; onAgain: () => void }) {
  const { saved, before, after } = outcome;
  const card = CARDS[saved.cardId];
  const applied = after.benefits.flatMap((b) =>
    b.applications.filter((a) => a.paymentId === saved.id).map((a) => ({ ...b, amount: a.amount })));
  const total = applied.reduce((s, b) => s + b.amount, 0);
  const reached = crossesTarget(before, after);

  return (
    <Screen className="max-w-xl pb-6">
      <div className="flex flex-col items-center gap-2 pb-2 pt-10 text-center">
        <span className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white ${reached ? 'bg-good' : 'bg-brand'}`}>✓</span>
        <h1 className="mt-2 text-[22px] font-bold">{reached ? '다음 달 혜택 조건을 채웠어요' : total > 0 ? `${won(total)} 아꼈어요` : '저장했어요'}</h1>
        <p className="text-[15px] text-ink-3">{saved.merchant} · {won(saved.amount)}{saved.canceled ? ' (취소)' : ''}</p>
      </div>

      <Panel className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CardChip id={saved.cardId} size={28} />
          <span className="font-semibold">{card.name}</span>
        </div>
        {applied.length === 0 ? (
          <p className="text-sm text-ink-3">이 결제에는 할인이나 적립이 없어요</p>
        ) : applied.map((b) => (
          <div key={b.id} className="flex items-baseline justify-between text-[15px]">
            <span className="text-ink-2">{b.label}</span>
            <span className="text-right">
              <b className="text-brand">{b.kind === 'cashback' ? '적립' : '할인'} {won(b.amount)}</b>
              {b.remaining !== null && <span className="block text-xs text-ink-3">남은 한도 {won(b.remaining)}</span>}
            </span>
          </div>
        ))}
        {after.eligibility === 'unknown' && <p className="rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">전월 실적을 몰라서 혜택 자격은 아직 미확인이에요</p>}
        {after.eligibility === 'ineligible' && <p className="rounded-xl bg-bad-soft px-3 py-2 text-xs text-bad">전월 실적이 부족해서 이번 달은 혜택이 없어요</p>}
        <div className="mt-1 flex justify-between border-t border-line pt-3 text-[15px]">
          <span className="text-ink-2">이번 달 실적</span>
          <span className="font-semibold">{won(after.performance)}</span>
        </div>
        {after.target !== null && (
          <div className="flex justify-between text-[15px]">
            <span className="text-ink-2">목표까지</span>
            <span className={`font-semibold ${after.remainingToTarget === 0 ? 'text-good' : 'text-brand'}`}>
              {after.remainingToTarget === 0 ? '달성' : won(after.remainingToTarget ?? 0)}
            </span>
          </div>
        )}
      </Panel>

      <BottomAction aboveTabs={false}>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/" className={secondaryBtn}>달력으로</Link>
          <button onClick={onAgain} className={primaryBtn}>하나 더 기록</button>
        </div>
      </BottomAction>
    </Screen>
  );
}
