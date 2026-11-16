import TabBar from '@/components/TabBar';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-10">
      <TabBar />
      {children}
    </div>
  );
}
