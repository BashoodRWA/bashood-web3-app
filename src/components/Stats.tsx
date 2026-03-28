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
    to: 1277,
    suffix: '',
    label: 'Tests passing',
    sub: 'Hardhat + 117 Foundry',
    color: '#0052FF',
  },
  {
    to: 92,
    suffix: '%',
    label: 'Audit score',
    sub: '36 PASS · 3 WARN · 0 FAIL',
    color: '#00C896',
  },
  {
    to: 9,
    suffix: '',
    label: 'Riesgos conocidos',
    sub: 'KR-001..KR-009 documentados',
    color: '#0052FF',
  },
  {
    to: 198,
    suffix: '',
    label: 'Contratos compilados',
    sub: 'Solidity ^0.8.20 · EVM cancun',
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
