'use client'

import BeheerNav from '@/lib/BeheerNav'

export default function DakkapelLabPage() {
  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <BeheerNav topSlot={
        <a
          href="/DakkapelLAB/index.html"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            background: '#22c55e',
            border: '1px solid #16a34a',
            color: 'white',
            padding: '9px 14px',
            borderRadius: 9,
            fontSize: 13,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Open los
        </a>
      } />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>DakkapelLAB</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Kopie van KozijnLAB, apart geladen voor dakkapel-offertes</div>
          </div>
        </div>

        <iframe
          src="/DakkapelLAB/index.html"
          title="DakkapelLAB Configurator"
          style={{ flex: 1, width: '100%', border: 'none', background: 'white' }}
        />
      </div>
    </div>
  )
}
