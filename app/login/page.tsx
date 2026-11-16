'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setState('error');
      setMessage('이메일 주소를 확인해 주세요.');
      return;
    }
    setState('sending');
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState('error');
      setMessage(error.message);
    } else {
      setState('sent');
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">카드 실적</h1>
      {state === 'sent' ? (
        <p className="text-sm">{email}로 로그인 링크를 보냈어요. 메일의 링크를 이 기기에서 열어 주세요.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-sm" htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState('idle'); }}
            className="rounded-lg border px-3 py-2"
          />
          {state === 'error' && <p className="text-sm text-red-600">{message}</p>}
          <button disabled={state === 'sending'} className="rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50">
            {state === 'sending' ? '보내는 중…' : '로그인 링크 받기'}
          </button>
        </form>
      )}
    </main>
  );
}
