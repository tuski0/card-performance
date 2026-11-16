import { ImageResponse } from 'next/og';
import { AppIcon } from '@/components/AppIcon';

const SIZES: Record<string, { px: number; inset: number }> = {
  '192': { px: 192, inset: 0 },
  '512': { px: 512, inset: 0 },
  maskable: { px: 512, inset: 0.1 },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const spec = SIZES[(await params).size];
  if (!spec) return new Response('Not found', { status: 404 });
  return new ImageResponse(<AppIcon size={spec.px} inset={spec.inset} />, { width: spec.px, height: spec.px });
}
