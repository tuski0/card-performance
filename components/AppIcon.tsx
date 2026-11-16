/** Shared artwork for app icons: a blue tile with a card and a check. `inset` shrinks it for maskable icons. */
export function AppIcon({ size, inset = 0 }: { size: number; inset?: number }) {
  const s = size * (1 - inset * 2);
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3182f6' }}>
      <div style={{ width: s * 0.62, height: s * 0.42, borderRadius: s * 0.07, background: '#ffffff', display: 'flex', flexDirection: 'column', padding: s * 0.05 }}>
        <div style={{ width: '100%', height: s * 0.06, background: '#3182f6', opacity: 0.25, borderRadius: s * 0.02, marginTop: s * 0.04 }} />
        <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ width: s * 0.16, height: s * 0.05, background: '#191f28', opacity: 0.2, borderRadius: s * 0.02 }} />
          <div style={{ width: s * 0.12, height: s * 0.12, borderRadius: s, background: '#ffbc00' }} />
        </div>
      </div>
    </div>
  );
}
