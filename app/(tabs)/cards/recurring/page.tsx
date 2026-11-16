'use client';

import { errMsg } from '@/lib/format';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardChip, Panel, Screen, TopBar, primaryBtn } from '@/components/ui';
import { CARDS, type CardId, type Category } from '@/lib/cards';
import { deleteRecurring, listRecurring, saveRecurring, type RecurringRow } from '@/lib/data/recurring';
import { pendingQuestions } from '@/lib/engine/compute';
import { resetRecurringRun, thisMonth } from '@/lib/data/useMonthData';
import { won } from '@/lib/format';
import { CATEGORIES, CATEGORY_LABELS, findBrand } from '@/lib/brands';
import { guessCategory } from '@/lib/merchants';
import { createClient } from '@/lib/supabase/client';

export default function RecurringPage() {
  const db = useMemo(() => createClient(), []);
  const [items, setItems] = useState<RecurringRow[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    resetRecurringRun();
    try {
      setItems(await listRecurring(db));
      setError('');
    } catch (e) {
      setError(errMsg(e, '불러오지 못했어요'));
    }
  }, [db]);
  useEffect(() => { load(); }, [load]);

  async function toggle(r: RecurringRow) {
    await saveRecurring(db, { ...r, active: !r.active });
    await load();
  }

  async function remove(id: string) {
    if (confirmId !== id) return setConfirmId(id);
    await deleteRecurring(db, id);
    setConfirmId(null);
    await load();
  }

  const total = (items ?? []).filter((r) => r.active).reduce((s, r) => s + r.amount, 0);

  return (
    <Screen className="max-w-xl">
      <TopBar back="/cards" title="반복 결제" />
      <p className="px-1 text-sm text-ink-3">통신요금, 구독료처럼 매달 나가는 결제를 등록하면 그날 자동으로 기록돼요.</p>
      {error && <Panel><p className="text-sm text-bad">{error.includes('recurring_payments') ? '반복 결제 테이블이 아직 없어요. Supabase에서 0002_recurring.sql을 실행해 주세요.' : error}</p></Panel>}

      {items && items.length > 0 && (
        <Panel className="!px-2 !py-3">
          <div className="flex items-baseline justify-between px-3 pb-1 pt-1">
            <h2 className="text-[15px] font-semibold">등록한 반복 결제</h2>
            <span className="text-[13px] text-ink-3">매달 {won(total)}</span>
          </div>
          {items.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
              <CardChip id={r.cardId} size={34} />
              <div className={`min-w-0 flex-1 ${r.active ? '' : 'opacity-40'}`}>
                <p className="truncate font-semibold">{r.merchant}</p>
                <p className="text-xs text-ink-3">매달 {r.dayOfMonth}일 · {won(r.amount)}</p>
              </div>
              <button
                role="switch" aria-checked={r.active} aria-label={`${r.merchant} 자동 기록`} onClick={() => toggle(r)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${r.active ? 'bg-brand' : 'bg-line'}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${r.active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <button onClick={() => remove(r.id)} className={`shrink-0 rounded-xl px-2 py-1 text-[13px] font-semibold ${confirmId === r.id ? 'bg-bad text-white' : 'text-ink-3'}`}>
                삭제
              </button>
            </div>
          ))}
          {confirmId && <p className="px-3 pb-1 text-xs text-bad">한 번 더 누르면 삭제돼요. 이미 기록된 결제는 그대로 남아요.</p>}
        </Panel>
      )}
      {items && items.length === 0 && !adding && <Panel><p className="py-4 text-center text-ink-3">아직 등록한 반복 결제가 없어요</p></Panel>}

      {adding ? (
        <AddForm
          onCancel={() => setAdding(false)}
          onSave={async (r) => { await saveRecurring(db, r); setAdding(false); await load(); }}
        />
      ) : (
        <button onClick={() => setAdding(true)} className={primaryBtn}>반복 결제 추가</button>
      )}
    </Screen>
  );
}

function AddForm({ onSave, onCancel }: {
  onSave: (r: Parameters<typeof saveRecurring>[1]) => Promise<void>;
  onCancel: () => void;
}) {
  const [cardId, setCardId] = useState<CardId>('kb-youth-b');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<Category>('unknown');
  const [touched, setTouched] = useState(false);
  const [day, setDay] = useState(String(new Date().getDate()));
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const brand = findBrand(merchant);
  const questions = pendingQuestions(cardId, category, brand?.id ?? null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ''));
    const d = Number(day);
    if (!Number.isInteger(n) || n <= 0) return setErr('금액을 입력해 주세요');
    if (!merchant.trim()) return setErr('이름을 입력해 주세요');
    if (!Number.isInteger(d) || d < 1 || d > 31) return setErr('1~31일 중에서 골라 주세요');
    setBusy(true);
    try {
      // Start this month; if the day already passed, today's run records this month's payment too.
      await onSave({
        cardId, amount: n, merchant: merchant.trim(), category, brand: brand?.id ?? null, dayOfMonth: d, active: true, startMonth: thisMonth(),
        answers: Object.fromEntries(questions.map((q) => [q.key, answers[q.key] === true])),
      });
    } catch (e) {
      setErr(errMsg(e, '저장하지 못했어요'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Panel className="flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold">새 반복 결제</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-ink-3">이름</span>
          <input value={merchant} placeholder="SKT 통신요금" className="input"
            onChange={(e) => { setMerchant(e.target.value); if (!touched) setCategory(guessCategory(e.target.value)); setErr(''); }} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-ink-3">금액</span>
            <input inputMode="numeric" value={amount} placeholder="55,000" className="input"
              onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setAmount(v ? Number(v).toLocaleString('ko-KR') : ''); setErr(''); }} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-ink-3">매달 며칠</span>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="input appearance-none">
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}일{i + 1 >= 29 ? ' (없으면 말일)' : ''}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(CARDS).map((c) => (
            <button type="button" key={c.id} onClick={() => setCardId(c.id)} aria-pressed={c.id === cardId}
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-[13px] font-semibold ${c.id === cardId ? 'border-brand bg-brand-soft' : 'border-transparent bg-fill'}`}>
              <CardChip id={c.id} size={26} />
              <span className="leading-tight">{c.name.replace('KB국민 ', '').replace('KB ', '')}</span>
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-ink-3">분류</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value as Category); setTouched(true); }} className="input appearance-none">
            {CATEGORIES.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
          </select>
        </label>
        {questions.map((q) => (
          <div key={q.key} className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">{q.text}</span>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button type="button" key={String(v)} aria-pressed={answers[q.key] === v} onClick={() => setAnswers({ ...answers, [q.key]: v })}
                  className={`h-11 rounded-2xl text-[15px] font-semibold ${answers[q.key] === v ? 'bg-brand text-white' : 'bg-fill text-ink-2'}`}>
                  {v ? '네' : '아니요'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {err && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="h-12 rounded-2xl bg-fill font-semibold text-ink-2">취소</button>
          <button disabled={busy} className="h-12 rounded-2xl bg-brand font-semibold text-white disabled:opacity-40">{busy ? '저장 중…' : '등록'}</button>
        </div>
      </Panel>
    </form>
  );
}
