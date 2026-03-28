import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Presale() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setEmail('')
  }

  const presaleStats = [
    { label: 'Para la presale', value: '30%', sub: '300M BHT' },
    { label: 'Supply total', value: '1B', sub: 'BHT — fijo' },
    { label: 'Objetivo raise', value: '$3M', sub: 'Series A' },
  ]

  return (
    <section id="presale" className="py-28 px-6 bg-[#0D0D16]">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Status badge */}
          <span className="inline-flex items-center gap-2 bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-sm font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-[#0052FF] rounded-full animate-pulse" />
            Próximamente — Base Sepolia (post audit externo)
          </span>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Únete a la
            <br />
            <span className="text-[#0052FF]">presale</span>
          </h2>

          <p className="text-lg text-[#8892A4] max-w-xl mx-auto mb-12">
            La presale se activará en Base Sepolia tras completar el audit externo.
            Regístrate para ser de los primeros en participar.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {presaleStats.map(s => (
              <div key={s.label} className="bg-[#111118] border border-[#1E2030] rounded-xl py-5 px-4">
                <div className="text-2xl md:text-3xl font-bold text-[#0052FF]">{s.value}</div>
                <div className="text-xs text-[#8892A4] mt-1">{s.label}</div>
                <div className="text-xs text-[#F0F2F5] mt-0.5 font-medium">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Email waitlist */}
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6"
            >
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="flex-1 bg-[#111118] border border-[#1E2030] text-white placeholder-[#4B5563] rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-[#0052FF] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
              >
                Apuntarme →
              </button>
            </form>
          ) : (
            <div className="max-w-md mx-auto mb-6 bg-[#00C896]/10 border border-[#00C896]/30 rounded-xl px-6 py-4 text-[#00C896] text-sm font-medium">
              ✓ Registrado correctamente. Te avisaremos cuando se active la presale.
            </div>
          )}

          <p className="text-xs text-[#4B5563] leading-relaxed max-w-sm mx-auto">
            Auditoría externa pendiente. No hay deployment en mainnet actualmente.
            Los tokens $BHT no están disponibles para compra en este momento.
            No inviertas más de lo que puedas perder.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
