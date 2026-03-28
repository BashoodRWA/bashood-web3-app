import { motion } from 'framer-motion'

const distribution = [
  { label: 'Presale', pct: 30, color: '#0052FF' },
  { label: 'Liquidez DEX', pct: 20, color: '#2D6FFF' },
  { label: 'Ecosistema & grants', pct: 20, color: '#00C896' },
  { label: 'Equipo (vesting 2 años)', pct: 15, color: '#3D8BFF' },
  { label: 'Reserva', pct: 10, color: '#4B5563' },
  { label: 'Marketing', pct: 5, color: '#374151' },
]

const mechanics = [
  {
    icon: '🔥',
    title: 'Se quema con cada uso',
    desc: 'Cada pago en $BHT destruye una parte del supply. A más actividad en el protocolo, menos tokens en circulación.',
  },
  {
    icon: '🔒',
    title: 'Parámetros controlados por la comunidad',
    desc: 'Nadie puede cambiar los parámetros del token unilateralmente. Cualquier cambio requiere votación y un período de espera obligatorio.',
  },
  {
    icon: '⚡',
    title: 'Blockchain rápida y barata',
    desc: 'Bashood opera en Base L2 (la blockchain de Coinbase). Gas 10 veces más barato que Ethereum, con la misma seguridad.',
  },
  {
    icon: '🏦',
    title: 'Descuento por ser holder',
    desc: 'Si tienes 100,000 $BHT o más, pagas un 40% menos en tarifas del mercado de activos.',
  },
]

export default function Tokenomics() {
  return (
    <section id="tokenomics" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#0052FF] text-sm font-medium mb-3 tracking-widest uppercase">
            Token
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">El token BASHOOD</h2>
          <p className="text-[#8892A4] text-lg max-w-xl mx-auto">
            $BHT es el token con el que operas dentro del protocolo.
            Cuantos más tienes, menos pagas en tarifas.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-14 items-start">
          {/* Distribution bars */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-5"
          >
            <h3 className="text-lg font-semibold text-[#C8CFDC] mb-6">Distribución</h3>
            {distribution.map((d, i) => (
              <div key={d.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#F0F2F5]">{d.label}</span>
                  <span className="font-semibold" style={{ color: d.color }}>
                    {d.pct}%
                  </span>
                </div>
                <div className="h-2.5 bg-[#1E2030] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${d.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}

            {/* Total pill */}
            <div className="mt-6 flex items-center gap-3 bg-[#111118] border border-[#1E2030] rounded-xl px-5 py-4">
              <span className="text-[#00C896] text-xl">⬢</span>
              <div>
                <div className="font-bold text-white">1,000,000,000 $BHT</div>
                <div className="text-xs text-[#8892A4]">Supply máximo fijo. No se puede crear más.</div>
              </div>
            </div>
          </motion.div>

          {/* Mechanics */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-[#C8CFDC] mb-6">Mecánicas clave</h3>
            {mechanics.map(m => (
              <div
                key={m.title}
                className="flex gap-4 p-5 bg-[#111118] border border-[#1E2030] rounded-xl hover:border-[#0052FF]/30 transition-colors"
              >
                <span className="text-2xl shrink-0">{m.icon}</span>
                <div>
                  <h4 className="font-semibold mb-1.5">{m.title}</h4>
                  <p className="text-sm text-[#8892A4] leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
