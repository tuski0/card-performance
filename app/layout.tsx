import type { Metadata, Viewport } from 'next';
import RegisterSW from '@/components/RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  title: '카드 실적',
  description: '카드별 실적과 혜택 관리',
  appleWebApp: { capable: true, title: '카드 실적', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#f2f4f6', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
