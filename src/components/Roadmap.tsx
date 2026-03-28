import { motion } from 'framer-motion'

type Status = 'done' | 'active' | 'pending'

const milestones: { quarter: string; status: Status; label: string; items: string[] }[] = [
  {
    quarter: 'Q4 2025',
    status: 'done',
    label: 'Completado',
    items: [
      'Smart contracts core + 8 módulos RWA',
      '4 capas de auditoría: Slither, Foundry, Semgrep, Hardhat pipeline',
      '$700k seed raise completado',
    ],
  },
  {
    quarter: 'Q1 2026',
    status: 'done',
    label: 'Completado',
    items: [
      '1277 tests Hardhat + 117 Foundry (10k fuzz runs cada uno)',
      'Pipeline de audit 92% — tag v0.4-audit-stable',
      'Governance: BashoodTimelock + BashoodGovernor + Gnosis Safe 3-of-5',
      'Fixes C-005 SafeERC20 · C-006 abi.encode · C-004 overflow guard',
    ],
  },
  {
    quarter: 'Q2 2026',
    status: 'active',
    label: 'En curso',
    items: [
      'Audit externo (ConsenSys Diligence / OpenZeppelin / Spearbit)',
      'Deployment en Base Sepolia (post-audit)',
      'Frontend web3: Vite + React + wagmi v2',
      'CEX listings: Gate.io, MEXC',
    ],
  },
  {
    quarter: 'Q3 2026',
    status: 'pending',
    label: 'Planificado',
    items: [
      'Activación presale en mainnet Base L2',
      'Partnerships estratégicos (Chainlink, Base/Coinbase)',
      'Enterprise pilots: 3-5 empresas objetivo',
      'Target: 15k usuarios · 3k NFTs · $1M TVL',
    ],
  },
  {
    quarter: 'Q4 2026+',
    status: 'pending',
    label: 'Futuro',
    items: [
      'Tier 1 CEX (Binance, Coinbase — solicitudes)',
      'Expansión MENA + Asia',
      'Series B — $10M target',
      'Target: 50k usuarios · $5M TVL',
    ],
  },
]

const cfg: Record<Status, { dot: string; badge: string; itemIcon: string; itemColor: string }> = {
  done: {
    dot: 'bg-[#00C896] border-[#07070E]',
    badge: 'text-[#00C896] bg-[#00C896]/10 border-[#00C896]/30',
    itemIcon: '✓',
    itemColor: 'text-[#00C896]',
  },
  active: {
    dot: 'bg-[#0052FF] border-[#07070E] shadow-[0_0_12px_#0052FF80]',
    badge: 'text-[#0052FF] bg-[#0052FF]/10 border-[#0052FF]/30',
    itemIcon: '⟳',
    itemColor: 'text-[#0052FF]',
  },
  pending: {
    dot: 'bg-[#1E2030] border-[#07070E]',
    badge: 'text-[#8892A4] bg-[#111118] border-[#1E2030]',
    itemIcon: '○',
    itemColor: 'text-[#1E2030]',
  },
}

export default function Roadmap() {
  return (
    <section id="roadmap" className="py-28 px-6 bg-[#0D0D16]">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#0052FF] text-sm font-medium mb-3 tracking-widest uppercase">
            Hoja de ruta
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">Roadmap</h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative pl-10">
          {/* Vertical rail */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-[#1E2030]" />

          <div className="space-y-8">
            {milestones.map((m, i) => {
              const c = cfg[m.status]
              return (
                <motion.div
                  key={m.quarter}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Dot */}
                  <div
                    className={`absolute -left-10 top-5 w-3.5 h-3.5 rounded-full border-2 ${c.dot}`}
                    style={{ transform: 'translateX(50%)' }}
                  />

                  <div
                    className={`bg-[#111118] border rounded-2xl p-6 transition-colors ${
                      m.status === 'active'
                        ? 'border-[#0052FF]/40'
                        : 'border-[#1E2030]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h3 className="font-bold text-lg">{m.quarter}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${c.badge}`}>
                        {m.label}
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {m.items.map(item => (
                        <li key={item} className="flex items-start gap-3 text-sm">
                          <span className={`shrink-0 mt-0.5 font-mono text-xs ${c.itemColor}`}>
                            {c.itemIcon}
                          </span>
                          <span
                            className={
                              m.status === 'done'
                                ? 'text-[#C8CFDC]'
                                : m.status === 'active'
                                ? 'text-[#F0F2F5]'
                                : 'text-[#8892A4]'
                            }
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
