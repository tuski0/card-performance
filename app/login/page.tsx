'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return setMessage('이메일 주소를 확인해 주세요.');
    if (!password) return setMessage('비밀번호를 입력해 주세요.');
    setBusy(true);
    setMessage('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      return setMessage(error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 맞지 않아요.' : error.message);
    }
    router.replace('/');
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
          onChange={(e) => { setEmail(e.target.value); setMessage(''); }} className="input" />
        <input id="password" type="password" autoComplete="current-password" value={password}
          placeholder="비밀번호" aria-label="비밀번호"
          onChange={(e) => { setPassword(e.target.value); setMessage(''); }} className="input" />
        {message && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p>}
        <button disabled={busy} className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[17px] font-semibold text-white disabled:opacity-40">
          {busy ? '잠시만요…' : '로그인'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-3">계정은 관리자에게 요청해 주세요.</p>
    </main>
  );
}
