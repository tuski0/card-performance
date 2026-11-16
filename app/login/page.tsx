'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
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
      return setMessage(error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 맞지 않아요.' : error.message);
    }
    if (!data.session) {
      return setMessage('가입은 됐지만 바로 로그인되지 않았어요. Supabase에서 이메일 확인(Confirm email)을 꺼 주세요.');
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">카드 실적</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm" htmlFor="email">이메일</label>
        <input id="email" type="email" autoComplete="email" value={email}
          onChange={(e) => { setEmail(e.target.value); setMessage(''); }} className="input" />
        <label className="text-sm" htmlFor="password">비밀번호</label>
        <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password}
          onChange={(e) => { setPassword(e.target.value); setMessage(''); }} className="input" />
        {message && <p className="text-sm text-red-600">{message}</p>}
        <button disabled={busy} className="rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50">
          {busy ? '잠시만요…' : mode === 'signin' ? '로그인' : '가입하고 시작'}
        </button>
      </form>
      <button className="text-sm underline" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
        {mode === 'signin' ? '처음이에요 (가입)' : '이미 계정이 있어요 (로그인)'}
      </button>
    </main>
  );
}
