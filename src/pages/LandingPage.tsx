import { useNavigate } from 'react-router-dom'

const features = [
  { title: 'Point of Sale', desc: 'Fast billing for floor staff. Price bands, custom amounts, UPI & cash.' },
  { title: 'Inventory', desc: 'Track stock batches, vendors, cost price and margin in real time.' },
  { title: 'Staff Management', desc: 'Clock-in tracking, shift roster, and daily performance overview.' },
  { title: 'Data & Privacy', desc: 'Ephemeral billing, configurable retention, GST-safe data wipe.' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: 'var(--primary)' }}>B</div>
          <span className="font-black text-base" style={{ color: 'var(--text-1)' }}>SmallBiz</span>
        </div>
        <button onClick={() => navigate('/login')} className="btn btn-ghost text-sm">Sign in</button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-2xl mx-auto w-full">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid rgba(79,70,229,0.2)' }}
        >
          Built for Indian retail shops
        </div>

        <h1 className="text-4xl font-black leading-tight mb-4" style={{ color: 'var(--text-1)', fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
          Run your shop.<br />Not spreadsheets.
        </h1>

        <p className="text-lg mb-10 max-w-md" style={{ color: 'var(--text-3)', fontSize: 'clamp(1rem, 3vw, 1.125rem)' }}>
          One platform for billing, inventory, staff, and compliance — designed for garment and retail stores.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/register')}
            className="btn btn-primary px-8 py-3 text-base font-bold"
          >
            Register your store
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-ghost px-8 py-3 text-base"
          >
            Sign in
          </button>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(f => (
            <div key={f.title} className="card p-5">
              <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--text-1)' }}>{f.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-4 text-xs" style={{ color: 'var(--text-4)' }}>
        SmallBiz Operations — Team Claudius 61
      </footer>
    </div>
  )
}
