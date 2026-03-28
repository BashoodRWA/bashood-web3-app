import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let startTime = 0
    const duration = 1400
    const raf = (ts: number) => {
      if (!startTime) startTime = ts
      const p = Math.min((ts - startTime) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * to))
      if (p < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [inView, to])

  return (
    <span ref={ref}>
      {val.toLocaleString('es-ES')}
      {suffix}
    </span>
  )
}

const stats = [
  {
    to: 95,
    suffix: '%',
    label: 'Ahorro en tarifas',
    sub: '0.3% vs 5–15% del mercado tradicional',
    color: '#0052FF',
  },
  {
    to: 10,
    suffix: '%',
    label: 'Entrada mínima',
    sub: 'Desde el 10% de cualquier activo',
    color: '#00C896',
  },
  {
    to: 30,
    suffix: 'días',
    label: 'Se ahorra en espera',
    sub: 'Liquidación instantánea vs 15–30 días',
    color: '#0052FF',
  },
  {
    to: 16,
    suffix: 'T$',
    label: 'Mercado objetivo',
    sub: 'Activos industriales iliquidos globales',
    color: '#00C896',
  },
]

export default function Stats() {
  return (
    <section className="py-20 px-6 bg-[#0D0D16] border-y border-[#1E2030]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center"
          >
            <div
              className="text-4xl md:text-5xl font-bold mb-1.5"
              style={{ color: s.color }}
            >
              <Counter to={s.to} suffix={s.suffix} />
            </div>
            <div className="font-semibold text-[#F0F2F5] mb-1">{s.label}</div>
            <div className="text-xs text-[#8892A4]">{s.sub}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
