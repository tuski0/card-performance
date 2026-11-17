'use client';

import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui';
import { createDeviceToken, revokeDeviceTokens } from '@/lib/data/deviceTokens';
import { errMsg } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

declare global {
  interface Window {
    CardApp?: {
      setToken(t: string): void;
      hasToken(): boolean;
      hasNotificationAccess(): boolean;
      openNotificationAccess(): void;
      openBatterySettings(): void;
    };
  }
}

/** Connects the Android app that records card notifications. Hidden outside that app. */
export default function AppLink() {
  const db = useMemo(() => createClient(), []);
  const [present, setPresent] = useState(false);
  const [connected, setConnected] = useState(false);
  const [access, setAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => {
    setConnected(window.CardApp?.hasToken() ?? false);
    setAccess(window.CardApp?.hasNotificationAccess() ?? false);
  };
  useEffect(() => {
    setPresent(!!window.CardApp);
    refresh();
    // The user returns from the system settings screen to this page.
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  if (!present) return null;
  const app = window.CardApp!;

  async function connect() {
    setBusy(true);
    try {
      app.setToken(await createDeviceToken(db));
      setError('');
      refresh();
    } catch (e) {
      setError(errMsg(e, '연결하지 못했어요'));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await revokeDeviceTokens(db);
      app.setToken('');
      setError('');
      refresh();
    } catch (e) {
      setError(errMsg(e, '연결을 해제하지 못했어요'));
    } finally {
      setBusy(false);
    }
  }

  const btn = 'h-11 rounded-2xl bg-fill px-4 text-[14px] font-semibold text-ink-2 disabled:opacity-40';
  return (
    <Panel className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">알림 자동 기록</h2>
      <p className={`text-sm ${connected && access ? 'text-good' : 'text-ink-3'}`}>
        {connected ? (access ? '연결됨 · 알림 접근 허용됨' : '알림 접근이 꺼져 있어요') : '아직 연결하지 않았어요'}
      </p>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        {!connected && <button disabled={busy} onClick={connect} className="col-span-2 h-12 rounded-2xl bg-brand font-semibold text-white disabled:opacity-40">이 폰 연결</button>}
        <button onClick={() => app.openNotificationAccess()} className={btn}>알림 접근 허용</button>
        <button onClick={() => app.openBatterySettings()} className={btn}>배터리 예외 설정</button>
        {connected && <button disabled={busy} onClick={disconnect} className={`${btn} col-span-2 !text-bad`}>연결 해제</button>}
      </div>
    </Panel>
  );
}
