'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push('/beheer')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Inloggen mislukt')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A3A2A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(200,169,110,0.08) 0%, transparent 50%),
                          radial-gradient(circle at 80% 80%, rgba(255,255,255,0.03) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/Beeldmerk_Vector_BGWIT.png"
            alt="EcoPro Kozijnen"
            style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
          />
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            EcoPro Kozijnen
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Beheerdashboard
          </p>
        </div>

        {/* Kaart */}
        <div style={{ background: 'white', borderRadius: 18, padding: '32px 28px', boxShadow: '0 32px 64px rgba(0,0,0,0.25)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#111827' }}>Inloggen</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>Alleen toegankelijk voor EcoPro medewerkers</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Gebruikersnaam
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Gebruikersnaam"
                autoComplete="username"
                autoFocus
                required
                style={{
                  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                  border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15,
                  fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#1A3A2A'; e.target.style.boxShadow = '0 0 0 3px rgba(26,58,42,0.1)' }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{
                  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                  border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15,
                  fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#1A3A2A'; e.target.style.boxShadow = '0 0 0 3px rgba(26,58,42,0.1)' }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flexShrink: 0 }}>✕</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '13px', marginTop: 4,
                background: '#1A3A2A', color: 'white',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600,
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                opacity: !username || !password ? 0.6 : 1,
                transition: 'all 0.15s', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!loading && username && password) e.currentTarget.style.background = '#2D5C42' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1A3A2A' }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Inloggen…
                </>
              ) : 'Inloggen →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          EcoPro Kozijnen B.V. · Plataanstraat 20H, Enschede
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}