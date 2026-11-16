'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: '달력', icon: CalendarIcon, match: (p: string) => p === '/' },
  { href: '/history', label: '내역', icon: ListIcon, match: (p: string) => p.startsWith('/history') },
  { href: '/cards', label: '카드', icon: CardIcon, match: (p: string) => p.startsWith('/cards') },
  { href: '/my', label: '마이', icon: UserIcon, match: (p: string) => p.startsWith('/my') },
];

/** Bottom tab bar on phones, inline tabs in the header on desktop. */
export default function TabBar() {
  const path = usePathname();
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex h-16 max-w-md">
          {TABS.map((t) => {
            const on = t.match(path);
            return (
              <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? 'text-ink' : 'text-ink-3'}`}>
                <t.icon active={on} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <nav className="mx-auto hidden w-full max-w-5xl items-center gap-1 px-4 pt-4 md:flex">
        <span className="mr-4 text-lg font-bold">카드 실적</span>
        {TABS.map((t) => {
          const on = t.match(path);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined}
              className={`rounded-xl px-4 py-2 text-[15px] font-semibold ${on ? 'bg-surface text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" fillOpacity={active ? 0.12 : 0} />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3" fillOpacity={active ? 0.12 : 0} />
      <path d="M2.5 10h19M6 15h4" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} aria-hidden>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" strokeLinecap="round" />
      <circle cx="4.5" cy="6.5" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="17.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} aria-hidden>
      <circle cx="12" cy="8.5" r="3.6" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}
