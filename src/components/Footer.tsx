const protocolLinks = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#tokenomics', label: 'Tokenomics' },
  { href: '#seguridad', label: 'Seguridad' },
  { href: '#roadmap', label: 'Roadmap' },
]

const resourceLinks = [
  {
    href: 'https://github.com/BashoodRWA/bashood-web3-app',
    label: 'GitHub',
    external: true,
  },
  { href: '#', label: 'Whitepaper (pronto)', disabled: true },
  { href: '#', label: 'Docs técnicos (pronto)', disabled: true },
  { href: '#presale', label: 'Lista de espera presale' },
]

export default function Footer() {
  return (
    <footer className="border-t border-[#1E2030] py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold text-xl mb-3">
              <span className="text-[#0052FF] text-2xl">⬡</span>
              BASHOOD
            </div>
            <p className="text-sm text-[#8892A4] leading-relaxed">
              Real World Asset tokenization on Base L2. Activos industriales
              verificados, on-chain.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="w-2 h-2 bg-[#00C896] rounded-full" />
              <span className="text-xs text-[#8892A4]">v0.4-audit-stable · 1277 tests · Base L2</span>
            </div>
          </div>

          {/* Protocol links */}
          <div>
            <p className="font-semibold mb-4 text-sm">Protocolo</p>
            <ul className="space-y-2.5">
              {protocolLinks.map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-[#8892A4] hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resource links */}
          <div>
            <p className="font-semibold mb-4 text-sm">Recursos</p>
            <ul className="space-y-2.5">
              {resourceLinks.map(l => (
                <li key={l.label}>
                  {l.disabled ? (
                    <span className="text-sm text-[#8892A4]/40 cursor-not-allowed">
                      {l.label}
                    </span>
                  ) : (
                    <a
                      href={l.href}
                      target={l.external ? '_blank' : undefined}
                      rel={l.external ? 'noopener noreferrer' : undefined}
                      className="text-sm text-[#8892A4] hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#1E2030] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#8892A4]">
          <p>© 2026 Bashood. Todos los derechos reservados.</p>
          <p className="text-center max-w-sm">
            Los tokens $BHT no son valores financieros. Este sitio es informativo.
            No inviertas más de lo que puedas perder.
          </p>
          <a
            href="https://github.com/BashoodRWA/bashood-web3-app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  )
}
