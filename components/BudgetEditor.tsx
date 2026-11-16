'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui';
import { CATEGORY_LABELS } from '@/lib/brands';
import type { Category } from '@/lib/cards';
import { getBudgets, setBudget } from '@/lib/data/budgets';
import { errMsg } from '@/lib/format';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUDGET_CATEGORIES: Category[] = ['food', 'cafe', 'convenience', 'transit', 'telecom', 'shopping', 'leisure', 'subscription', 'etc'];

export default function BudgetEditor({ db }: { db: SupabaseClient }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBudgets(db)
      .then((b) => {
        const v = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, b[c] ? b[c]!.toLocaleString('ko-KR') : '']));
        setValues(v);
        setSaved(v);
      })
      .catch((e) => setMsg(errMsg(e, '').includes('budgets') ? '예산 테이블이 아직 없어요. Supabase에서 0004_budgets.sql을 실행해 주세요.' : errMsg(e, '불러오지 못했어요')));
  }, [db]);

  const changed = BUDGET_CATEGORIES.filter((c) => (values[c] ?? '') !== (saved[c] ?? ''));

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      for (const c of changed) await setBudget(db, c, Number((values[c] ?? '').replace(/,/g, '')) || 0);
      setSaved(values);
      setMsg('저장했어요');
    } catch (e) {
      setMsg(errMsg(e, '저장하지 못했어요'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="flex flex-col gap-3">
      <div>
        <h2 className="text-[15px] font-semibold">월 예산</h2>
        <p className="text-xs text-ink-3">분류별로 한 달에 쓸 금액을 정하면 내역 통계에서 얼마나 썼는지 보여줘요. 비워 두면 예산 없음.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BUDGET_CATEGORIES.map((c) => (
          <label key={c} className="flex flex-col gap-1">
            <span className="text-[12px] text-ink-3">{CATEGORY_LABELS[c]}</span>
            <input inputMode="numeric" value={values[c] ?? ''} placeholder="없음" className="input !py-2.5 text-right text-[15px]"
              onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setValues({ ...values, [c]: v ? Number(v).toLocaleString('ko-KR') : '' }); setMsg(''); }} />
          </label>
        ))}
      </div>
      {msg && <p className={`text-sm ${msg === '저장했어요' ? 'text-good' : 'text-bad'}`}>{msg}</p>}
      <button onClick={save} disabled={busy || changed.length === 0} className="h-12 rounded-2xl bg-brand font-semibold text-white disabled:opacity-40">
        {busy ? '저장 중…' : '예산 저장'}
      </button>
    </Panel>
  );
}
