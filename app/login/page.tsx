'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Only same-site paths, so a crafted link can't send people elsewhere after login. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return setMessage('이메일 주소를 확인해 주세요.');
    if (password.length < 6) return setMessage('비밀번호는 6자 이상이어야 해요.');
    setBusy(true);
    setMessage('');
    const auth = createClient().auth;
    const { data, error } = mode === 'signin'
      ? await auth.signInWithPassword({ email, password })
      : await auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      if (error.message === 'Invalid login credentials') return setMessage('이메일 또는 비밀번호가 맞지 않아요.');
      if (/already registered/i.test(error.message)) return setMessage('이미 가입된 이메일이에요. 로그인해 주세요.');
      return setMessage(error.message);
    }
    if (!data.session) {
      return setMessage('가입은 됐지만 바로 로그인되지 않았어요. 잠시 뒤 로그인해 주세요.');
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5">
      <div>
        <p className="text-[15px] font-semibold text-brand">카드 실적</p>
        <h1 className="mt-1 text-[26px] font-bold leading-snug">이번 달 혜택,<br />놓치지 않게</h1>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input id="email" type="email" autoComplete="email" value={email} placeholder="이메일" aria-label="이메일"
          onChange={(e) => { setEmail(e.target.value); setMessage(''); }} className="input !bg-surface !border-line" />
        <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password}
          placeholder="비밀번호 (6자 이상)" aria-label="비밀번호"
          onChange={(e) => { setPassword(e.target.value); setMessage(''); }} className="input !bg-surface !border-line" />
        {message && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p>}
        <button disabled={busy} className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[17px] font-semibold text-white disabled:opacity-40">
          {busy ? '잠시만요…' : mode === 'signin' ? '로그인' : '가입하고 시작'}
        </button>
      </form>
      <button className="text-sm font-medium text-ink-3" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
        {mode === 'signin' ? '처음이에요 · 가입하기' : '이미 계정이 있어요 · 로그인'}
      </button>
    </main>
  );
}
