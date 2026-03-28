import { motion } from 'framer-motion'

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
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-sm font-medium tracking-widest uppercase text-[#8892A4] mb-8"
        >
          Real World Assets · Base L2
        </motion.p>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.06] mb-8">
          Una fresadora industrial<br />
          produce dinero cada día.<br />
          <span className="text-[#0052FF]">Ahora puedes tener un trozo.</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-[#8892A4] max-w-2xl mx-auto mb-12 leading-relaxed">
          Bashood convierte activos industriales reales en participaciones digitales.
          Compra desde el 10%, sigue su valor en tiempo real
          y vende al instante. Sin papeleo. Sin intermediarios. Sin mínimos absurdos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="#por-que"
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Por qué existe Bashood →
          </a>
          <a
            href="#presale"
            className="border border-[#1E2030] hover:border-[#0052FF] text-[#8892A4] hover:text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Unirme a la lista de espera
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
