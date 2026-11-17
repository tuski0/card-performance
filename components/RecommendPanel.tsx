'use client';

import { useMemo, useState } from 'react';
import { CARD_COLORS, CardChip, Panel } from '@/components/ui';
import { BRANDS, findBrand } from '@/lib/brands';
import { CARDS, type CardId } from '@/lib/cards';
import type { MonthData } from '@/lib/data/useMonthData';
import { recommend, type Recommendation } from '@/lib/engine/recommend';
import { won } from '@/lib/format';
import { guessCategory } from '@/lib/merchants';

/** Which owned card earns the most for a merchant right now, given limits already used this month. */
export default function RecommendPanel({ data, owned }: { data: MonthData; owned: CardId[] }) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('10,000');
  const [all, setAll] = useState(false);
  const n = Number(amount.replace(/,/g, '')) || 0;
  const now = new Date().toISOString();

  // Brands any owned card has a dedicated benefit for.
  const brands = useMemo(() => {
    const ids = new Set(owned.flatMap((id) => CARDS[id].benefits.flatMap((b) => b.brands ?? [])));
    return BRANDS.filter((b) => ids.has(b.id));
  }, [owned]);

  const run = (brand: string | null, category: Parameters<typeof recommend>[0]['category']) =>
    recommend({ brand, category }, n, now, data.payments, data.starts, owned);

  const typed = merchant.trim();
  const typedBrand = typed ? findBrand(typed) : null;
  const typedResult = typed && n > 0 ? run(typedBrand?.id ?? null, typedBrand?.category ?? guessCategory(typed)) : null;

  return (
    <Panel className="flex flex-col gap-3">
      <div>
        <h2 className="text-[15px] font-semibold">어디서 어느 카드로 낼까</h2>
        <p className="text-xs text-ink-3">이번 달 남은 한도까지 따져서 혜택이 가장 큰 카드를 골라요.</p>
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="가맹점 (예: 스타벅스)" aria-label="가맹점" className="input" />
        <input inputMode="numeric" value={amount} aria-label="금액" className="input text-right"
          onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setAmount(v ? Number(v).toLocaleString('ko-KR') : ''); }} />
      </div>

      {typedResult && <Best label={typedBrand?.name ?? typed} r={typedResult} />}

      {!typed && n > 0 && brands.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {brands
            .map((b) => ({ b, r: run(b.id, b.category) }))
            .sort((x, y) => (y.r[0]?.benefit ?? 0) - (x.r[0]?.benefit ?? 0))
            .slice(0, all ? undefined : 8)
            .map(({ b, r }) => <Tile key={b.id} label={b.name} r={r} onPick={() => setMerchant(b.name)} />)}
        </div>
      )}
      {!typed && n > 0 && brands.length > 8 && (
        <button onClick={() => setAll(!all)} className="text-[13px] font-semibold text-ink-3">{all ? '접기' : `${brands.length - 8}곳 더 보기`}</button>
      )}
    </Panel>
  );
}

/** One merchant as a tile: the best card for it and what it saves. Tapping fills the merchant box. */
function Tile({ label, r, onPick }: { label: string; r: Recommendation[]; onPick: () => void }) {
  const top = r[0];
  if (!top) return null;
  const none = top.benefit === 0;
  return (
    <button onClick={onPick} className="flex flex-col gap-2 rounded-2xl bg-fill p-3 text-left active:brightness-95">
      <span className="truncate text-[14px] font-semibold">{label}</span>
      {none ? (
        <span className="text-[12px] text-ink-3">혜택 받는 카드가 없어요</span>
      ) : (
        <>
          <span className="flex items-center gap-2">
            <CardChip id={top.cardId} size={28} />
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
              {CARD_COLORS[top.cardId].short}카드{top.conditions.length > 0 && ` · ${top.conditions.join(', ')}`}
            </span>
          </span>
          <b className="text-[16px] text-brand">{won(top.benefit)}</b>
          {top.eligibility !== 'eligible' && (
            <span className="truncate text-[11px] text-warn">{top.eligibility === 'unknown' ? '전월 실적 미확인' : '이번 달 혜택 없음'}</span>
          )}
        </>
      )}
    </button>
  );
}

function Best({ label, r }: { label: string; r: Recommendation[] }) {
  const top = r[0];
  if (!top) return null;
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
            <span className="block truncate text-[13px] font-medium">{CARD_COLORS[top.cardId].short}카드{top.conditions.length > 0 && <span className="text-ink-3"> · {top.conditions.join(', ')}</span>}</span>
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
