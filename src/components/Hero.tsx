import { motion } from 'framer-motion'

const chips = [
  { icon: '✓', text: '1277 Tests Hardhat + Foundry' },
  { icon: '✓', text: '92% Audit Score' },
  { icon: '⬡', text: 'Base L2 (Coinbase)' },
  { icon: '🔒', text: 'v0.4-audit-stable' },
]

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 relative overflow-hidden">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#0052FF]/8 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-[#00C896]/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        {/* Chips row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {chips.map(c => (
            <span
              key={c.text}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111118] border border-[#1E2030] text-xs text-[#8892A4]"
            >
              <span className="text-[#0052FF]">{c.icon}</span>
              {c.text}
            </span>
          ))}
        </motion.div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-7">
          Tokeniza Activos<br />
          <span className="text-[#0052FF]">Industriales.</span>
          <br />
          On-Chain.
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-[#8892A4] max-w-2xl mx-auto mb-12 leading-relaxed">
          Bashood convierte maquinaria, equipos y activos de producción en{' '}
          <span className="text-[#C8CFDC]">NFTs ERC-721 verificados en Base L2</span>.
          Trazabilidad total, telemetría Chainlink en tiempo real, fraccionamiento.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="#presale"
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Ver la presale →
          </a>
          <a
            href="https://github.com/BashoodRWA/bashood-web3-app"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#1E2030] hover:border-[#0052FF] text-[#8892A4] hover:text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            GitHub →
          </a>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#8892A4]"
      >
        <span className="text-xs tracking-widest uppercase">Explorar</span>
        <div className="w-px h-8 bg-gradient-to-b from-[#8892A4]/60 to-transparent" />
      </motion.div>
    </section>
  )
}
