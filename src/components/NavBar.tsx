import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const links = [
  { href: '#por-que', label: 'Por qué Bashood' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#tokenomics', label: 'El token' },
  { href: '#seguridad', label: 'Para inversores' },
]

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-md bg-[#07070E]/90 border-b border-[#1E2030]'
          : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
          <img src="/logo.png" alt="Bashood logo" className="h-8 w-8 object-contain" />
          <span>BASHOOD</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm text-[#8892A4]">
          {links.map(l => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="#presale"
          className="hidden md:inline-flex bg-[#0052FF] hover:bg-[#0047E0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          Únete a la presale
        </a>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 text-[#8892A4] hover:text-white transition-colors"
          aria-label="Menú"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" />
                <line x1="3" y1="12" x2="19" y2="12" />
                <line x1="3" y1="18" x2="19" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#07070E]/95 backdrop-blur-md border-b border-[#1E2030] px-6 pb-5 space-y-3">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-[#8892A4] hover:text-white transition-colors text-sm"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#presale"
            onClick={() => setOpen(false)}
            className="block text-center bg-[#0052FF] hover:bg-[#0047E0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors mt-2"
          >
            Únete a la presale
          </a>
        </div>
      )}
    </motion.nav>
  )
}
