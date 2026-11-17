'use client';

import { useMemo, useState } from 'react';
import { CARD_COLORS, CardChip, Panel } from '@/components/ui';
import { CATEGORY_LABELS, findBrand } from '@/lib/brands';
import { type CardId, type Category } from '@/lib/cards';
import type { MonthData } from '@/lib/data/useMonthData';
import { benefitEntries, searchEntries, type BenefitEntry } from '@/lib/engine/benefitIndex';
import { recommend, type Recommendation } from '@/lib/engine/recommend';
import { won } from '@/lib/format';
import { guessCategory } from '@/lib/merchants';

/** A category the search text names outright ("카페", "편의점"), if any. */
function categoryOf(query: string): Category | null {
  const q = query.replace(/\s+/g, '');
  const hit = (Object.entries(CATEGORY_LABELS) as [Category, string][]).find(([c, label]) => c !== 'unknown' && c !== 'excluded' && label.replace(/\s+/g, '').includes(q));
  return q.length >= 2 && hit ? hit[0] : null;
}

/** Search across every category and brand: which owned card is best, and every benefit that matches. */
export default function RecommendPanel({ data, owned }: { data: MonthData; owned: CardId[] }) {
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('10,000');
  const n = Number(amount.replace(/,/g, '')) || 0;
  const typed = query.trim();

  const entries = useMemo(() => benefitEntries(owned), [owned]);
  const matches = useMemo(() => (typed ? searchEntries(entries, typed) : []), [entries, typed]);

  const brand = typed ? findBrand(typed) : null;
  const category = brand?.category ?? (typed ? categoryOf(typed) : null) ?? (typed ? guessCategory(typed) : null);
  const best =
    typed && n > 0 && (brand || (category && category !== 'unknown'))
      ? recommend({ brand: brand?.id ?? null, category: category as Category }, n, new Date().toISOString(), data.payments, data.starts, owned)[0]
      : null;

  return (
    <Panel className="flex flex-col gap-3">
      <div>
        <h2 className="text-[15px] font-semibold">어디서 어느 카드로 낼까</h2>
        <p className="text-xs text-ink-3">가맹점이나 분류를 검색하면 남은 한도까지 따져서 가장 이득인 카드를 골라줘요.</p>
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="가맹점·분류 검색 (예: 스타벅스, 카페)" aria-label="가맹점 또는 분류" className="input" />
        <input inputMode="numeric" value={amount} aria-label="금액" className="input text-right"
          onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setAmount(v ? Number(v).toLocaleString('ko-KR') : ''); }} />
      </div>

      {typed && best && <Best label={brand?.name ?? typed} top={best} />}

      {typed && matches.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
          {matches.map((e) => <MatchRow key={`${e.cardId}:${e.benefit.id}`} e={e} data={data} />)}
        </div>
      )}
      {typed && matches.length === 0 && !best && (
        <p className="py-2 text-center text-sm text-ink-3">“{typed}”에 해당하는 혜택이 내 카드에는 없어요.</p>
      )}
    </Panel>
  );
}

function Best({ label, top }: { label: string; top: Recommendation }) {
  const none = top.benefit === 0;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-brand-soft px-3 py-3">
      <span className="w-20 shrink-0 truncate text-[14px] font-semibold">{label}</span>
      {none ? (
        <span className="flex-1 text-[13px] text-ink-3">혜택 받는 카드가 없어요</span>
      ) : (
        <>
          <CardChip id={top.cardId} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{CARD_COLORS[top.cardId].short}카드가 제일 이득{top.conditions.length > 0 && <span className="text-ink-3"> · {top.conditions.join(', ')}</span>}</span>
            {top.eligibility !== 'eligible' && (
              <span className="block truncate text-[11px] text-warn">{top.eligibility === 'unknown' ? '전월 실적 미확인' : '이번 달 혜택 없음'}</span>
            )}
          </span>
          <b className="shrink-0 text-[14px] text-brand">{won(top.benefit)}</b>
        </>
      )}
    </div>
  );
}

/** One matching benefit: card, what it is, and how much of this month's limit is left. */
function MatchRow({ e, data }: { e: BenefitEntry; data: MonthData }) {
  const r = data.results[e.cardId]?.benefits.find((b) => b.id === e.benefit.id);
  const brands = e.brandNames.slice(0, 4).join(' · ');
  return (
    <div className="flex items-center gap-3 py-2.5">
      <CardChip id={e.cardId} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{e.benefit.label}</span>
        <span className="block truncate text-[11px] text-ink-3">
          {CARD_COLORS[e.cardId].short}카드 · {CATEGORY_LABELS[e.category]}{brands && ` · ${brands}`}
        </span>
      </span>
      <span className="shrink-0 text-right text-[12px] text-ink-2">
        {r && r.remaining !== null ? <>남은 한도 <b className="text-brand">{won(r.remaining)}</b></> : <span className="text-ink-3">한도 없음</span>}
      </span>
    </div>
  );
}
