'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { section: 'Overzicht', items: [
    { href: '/beheer',        label: 'Dashboard',   icon: '▣', exact: true },
    { href: '/beheer/agenda', label: 'Agenda',       icon: '📅', exact: true },
  ]},
  { section: 'Werkplekken', items: [
    { href: '/beheer/verkoop',    label: 'Verkoop',    icon: '💼' },
    { href: '/beheer/montage',    label: 'Montage',    icon: '🔧' },
    { href: '/beheer/rapportage', label: 'Rapportage', icon: '📊' },
  ]},
]

async function doLogout() {
  await fetch('/api/login', { method: 'DELETE' })
  window.location.href = '/beheer/login'
}

export default function BeheerNav({ topSlot }) {
  const path = usePathname()
  const isActive = (href, exact) => exact ? path === href : path.startsWith(href)

  return (
    <div style={{ width: 220, background: '#152318', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', borderRight: '1px solid rgba(0,0,0,0.2)' }}>
      <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: topSlot ? 14 : 0 }}>
          <img src="/logo.png" alt="EcoPro" style={{ width: 34, height: 34, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>EcoPro Kozijnen</div>
            <div style={{ fontSize: 10, opacity: 0.38, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Beheerpaneel</div>
          </div>
        </div>
        {topSlot}
      </div>

      <nav style={{ flex: 1, padding: '14px 10px 8px', overflowY: 'auto' }}>
        {NAV.map((section, si) => (
          <div key={section.section}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', padding: '0 14px 8px' }}>
              {section.section}
            </div>
            {section.items.map(item => {
              const active = isActive(item.href, item.exact)
              return (
                <Link key={item.href} href={item.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 14px', borderRadius: 9, marginBottom: 2, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'white' : 'rgba(255,255,255,0.52)', background: active ? 'rgba(255,255,255,0.13)' : 'transparent', textDecoration: 'none', transition: 'all 0.13s' }}
                >
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                  {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />}
                </Link>
              )
            })}
            {si < NAV.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 4px 14px' }} />}
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', marginBottom: 8 }}>
          {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <button onClick={doLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 9, fontSize: 12, color: 'rgba(255,255,255,0.38)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
        >
          ↩ Uitloggen
        </button>
      </div>
    </div>
  )
}
