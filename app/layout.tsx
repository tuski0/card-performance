import type { Metadata, Viewport } from 'next';
import RegisterSW from '@/components/RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  title: '카드 실적',
  description: '카드별 실적과 혜택 관리',
  appleWebApp: { capable: true, title: '카드 실적', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f4f6' },
    { media: '(prefers-color-scheme: dark)', color: '#17171c' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/** Runs before first paint so a saved light/dark choice never flashes the other theme. */
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
