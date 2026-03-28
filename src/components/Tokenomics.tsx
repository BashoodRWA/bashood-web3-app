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
    title: 'Deflacionario',
    desc: 'Cada pago en $BHT quema una parte del supply de forma permanente. El circulante se reduce con cada transacción.',
  },
  {
    icon: '🔒',
    title: 'Parámetros congelados',
    desc: 'Burn BPS y discount BPS solo modificables mediante votación on-chain (BashoodGovernor + Timelock).',
  },
  {
    icon: '⬡',
    title: 'Base L2',
    desc: 'Gas ~10× más barato que Ethereum L1. Liquidación instantánea para fracciones de activos industriales.',
  },
  {
    icon: '🏦',
    title: 'Descuento por holding',
    desc: 'Holders de ≥100k $BHT obtienen -40% en trading fees del marketplace de activos.',
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
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Tokenomics $BHT</h2>
          <p className="text-[#8892A4] text-lg">
            Supply total fijo:{' '}
            <span className="text-white font-semibold">1,000,000,000 BHT</span>
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
                <div className="text-xs text-[#8892A4]">Supply fijo · Sin emisión adicional posible</div>
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
