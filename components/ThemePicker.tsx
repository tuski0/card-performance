'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui';

type Theme = 'system' | 'light' | 'dark';
const OPTIONS: { id: Theme; label: string }[] = [
  { id: 'system', label: '기기 설정' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
];

/** Saved per device. The pre-paint script in app/layout.tsx applies it on load. */
function applyTheme(t: Theme) {
  try {
    if (t === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', t);
  } catch {}
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === 'light' || t === 'dark' ? t : 'system');
  }, []);

  return (
    <Panel className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">화면 모드</h2>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-fill p-1" role="radiogroup" aria-label="화면 모드">
        {OPTIONS.map((o) => (
          <button key={o.id} role="radio" aria-checked={theme === o.id}
            onClick={() => { applyTheme(o.id); setTheme(o.id); }}
            className={`h-10 rounded-xl text-[14px] font-semibold transition-colors ${theme === o.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
