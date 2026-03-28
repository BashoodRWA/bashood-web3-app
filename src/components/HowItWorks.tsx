import { motion } from 'framer-motion'

const steps = [
  {
    n: '01',
    icon: '🏭',
    title: 'Tokeniza',
    desc: 'Sube fotos, certificaciones y datos GPS del activo. El smart contract emite un ERC-721 único en Base L2 con todos los metadatos verificados.',
  },
  {
    n: '02',
    icon: '📡',
    title: 'Sigue en tiempo real',
    desc: 'Oráculos Chainlink actualizan el valor. Sensores IoT envían telemetría de horas de operación, índice de depreciación y ubicación exacta.',
  },
  {
    n: '03',
    icon: '⚡',
    title: 'Fracciona y comercia',
    desc: 'Compra el 10%, 25% o 50% de cualquier activo industrial. Liquidación instantánea frente a los 15-30 días del mercado tradicional.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#0052FF] text-sm font-medium mb-3 tracking-widest uppercase">
            Proceso
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">¿Cómo funciona?</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative bg-[#111118] border border-[#1E2030] rounded-2xl p-8 overflow-hidden hover:border-[#0052FF]/40 transition-colors group"
            >
              {/* Background number */}
              <span className="absolute top-6 right-7 text-[#1E2030] text-6xl font-bold select-none group-hover:text-[#0052FF]/10 transition-colors">
                {s.n}
              </span>
              <div className="text-4xl mb-5">{s.icon}</div>
              <h3 className="text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-[#8892A4] leading-relaxed text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Connector line */}
        <div className="hidden md:flex items-center justify-center mt-12 gap-2 text-[#8892A4] text-sm">
          <span className="w-16 h-px bg-[#1E2030]" />
          <span>Activo tokenizado en menos de 30 minutos · 0.3% de fee</span>
          <span className="w-16 h-px bg-[#1E2030]" />
        </div>
      </div>
    </section>
  )
}
