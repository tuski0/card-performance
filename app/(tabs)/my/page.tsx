'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BudgetEditor from '@/components/BudgetEditor';
import { CardChip, Panel, Screen, TopBar, primaryBtn } from '@/components/ui';
import { searchCards } from '@/lib/cards/owned';
import { clearLast4, getMyCards, requestCard, setOwned, type MyCardRow } from '@/lib/data/myCards';
import { errMsg } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

export default function MyPage() {
  const db = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<MyCardRow[] | null>(null);
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await getMyCards(db));
      setError('');
    } catch (e) {
      setError(errMsg(e, '불러오지 못했어요'));
    }
  }, [db]);
  useEffect(() => {
    load();
    db.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, [db, load]);

  const results = searchCards(query);
  const rowOf = (id: string) => rows?.find((r) => r.cardId === id);
  const anyOwned = (rows ?? []).some((r) => r.owned);

  async function toggle(id: (typeof results)[number]['id']) {
    try {
      await setOwned(db, id, !rowOf(id)?.owned);
      await load();
    } catch (e) {
      setError(errMsg(e, '저장하지 못했어요'));
    }
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!reqName.trim()) return setError('카드 이름을 입력해 주세요');
    setBusy(true);
    try {
      await requestCard(db, reqName, reqNote);
      setSent(true);
      setReqName('');
      setReqNote('');
      setError('');
    } catch (err) {
      setError(errMsg(err, '요청을 보내지 못했어요'));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await db.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <Screen className="max-w-xl">
      <TopBar title="마이" />
      {email && <p className="px-1 text-sm text-ink-3">{email}</p>}
      {error && <Panel><p className="text-sm text-bad">{error.includes('owned') ? '내 카드 칸이 아직 없어요. Supabase에서 0003_phase2.sql을 실행해 주세요.' : error}</p></Panel>}

      <Panel className="!px-2 !py-3">
        <div className="px-3 pb-2 pt-1">
          <h2 className="text-[15px] font-semibold">내 카드</h2>
          <p className="text-xs text-ink-3">{anyOwned ? '켠 카드만 카드 탭과 결제 입력에 나와요.' : '아직 고르지 않아서 모든 카드가 보여요.'}</p>
        </div>
        <div className="px-3 pb-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="카드 이름으로 검색" className="input" aria-label="카드 검색" />
        </div>
        {results.map((c) => {
          const r = rowOf(c.id);
          const on = r?.owned ?? false;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
              <CardChip id={c.id} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                {r?.last4 && (
                  <p className="text-xs text-ink-3">
                    끝자리 {r.last4}{' '}
                    <button className="font-semibold text-brand" onClick={async () => { await clearLast4(db, c.id); await load(); }}>지우기</button>
                  </p>
                )}
              </div>
              <button
                role="switch" aria-checked={on} aria-label={`${c.name} 내 카드`} onClick={() => toggle(c.id)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-line'}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          );
        })}
        {results.length === 0 && <p className="px-3 py-4 text-center text-sm text-ink-3">“{query}” 카드는 아직 없어요. 아래에서 추가를 요청해 주세요.</p>}
      </Panel>

      <BudgetEditor db={db} />

      <Panel>
        <h2 className="text-[15px] font-semibold">카드 추가 요청</h2>
        <p className="mt-1 text-xs text-ink-3">찾는 카드가 없으면 알려 주세요. 혜택 규칙을 확인해서 추가하면 목록에 나와요.</p>
        {sent ? (
          <p className="mt-3 rounded-xl bg-good-soft px-3 py-2 text-sm text-good">요청을 받았어요. 추가되면 목록에 나와요.</p>
        ) : (
          <form onSubmit={sendRequest} className="mt-3 flex flex-col gap-2">
            <input value={reqName} onChange={(e) => { setReqName(e.target.value); setError(''); }} placeholder="카드 이름 (예: 신한 Deep Dream)" className="input" aria-label="카드 이름" />
            <input value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="메모 (선택) 혜택 안내 주소 등" className="input" aria-label="메모" />
            <button disabled={busy} className="h-12 rounded-2xl bg-brand font-semibold text-white disabled:opacity-40">{busy ? '보내는 중…' : '요청 보내기'}</button>
          </form>
        )}
      </Panel>

      <Panel className="!p-2">
        <Link href="/cards/recurring" className="flex items-center justify-between rounded-2xl px-3 py-3.5 active:bg-fill">
          <span className="font-medium">반복 결제 관리</span><span className="text-ink-3">›</span>
        </Link>
      </Panel>

      <button onClick={logout} className={`${primaryBtn} !bg-fill !text-ink-2`}>로그아웃</button>
    </Screen>
  );
}
