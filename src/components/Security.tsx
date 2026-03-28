import { motion } from 'framer-motion'

const auditRows = [
  {
    name: 'Slither',
    type: 'Análisis estático',
    result: 'Passed',
    findings: '0 críticos',
    score: '✓',
    ok: true,
  },
  {
    name: 'Foundry Fuzz',
    type: 'Invariant testing',
    result: '117 @ 10k runs',
    findings: '39/39 ✓',
    score: '✓',
    ok: true,
  },
  {
    name: 'Semgrep',
    type: 'Detección de patrones',
    result: 'Passed',
    findings: '0 críticos',
    score: '✓',
    ok: true,
  },
  {
    name: 'Hardhat Pipeline',
    type: '7 tareas modulares',
    result: 'v0.4-audit-stable',
    findings: '36P · 3W · 0F',
    score: '92%',
    ok: true,
  },
]

const knownRisks = [
  { id: 'KR-001', sev: 'LOW', title: 'UPGRADER_ROLE en EOA pre-deploy', status: 'ACKNOWLEDGED' },
  { id: 'R-008', sev: 'WARN', title: 'Centralización UPGRADER_ROLE — M-02 pendiente post-deploy', status: 'PENDING TIMELOCK' },
  { id: 'KR-009', sev: 'LOW', title: 'uint32(block.timestamp) — patrón Uniswap/OZ (safe hasta 2106)', status: 'ACKNOWLEDGED' },
]

export default function Security() {
  return (
    <section id="seguridad" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#0052FF] text-sm font-medium mb-3 tracking-widest uppercase">
            Para inversores
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">¿Por qué confiar en Bashood?</h2>
          <p className="text-[#8892A4] max-w-xl mx-auto">
            Antes de lanzar un solo token al mercado, el código ha pasado por cuatro revisiones independientes.
            Todos los problemas graves están resueltos y documentados públicamente.
          </p>
        </motion.div>

        {/* Score banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-[#0052FF]/15 to-[#00C896]/10 border border-[#0052FF]/30 rounded-2xl p-8 mb-10 text-center"
        >
          <div className="text-6xl md:text-7xl font-bold text-[#0052FF] mb-2">92%</div>
          <div className="text-xl font-semibold mb-1">Score de auditoría</div>
          <div className="text-sm text-[#8892A4]">
            4 revisiones independientes · 0 problemas críticos sin resolver · 9 riesgos documentados públicamente
          </div>
        </motion.div>

        {/* Audit table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-x-auto border border-[#1E2030] rounded-2xl mb-10"
        >
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-[#111118] border-b border-[#1E2030]">
              <tr>
                {['Herramienta', 'Tipo', 'Resultado', 'Findings', 'Estado'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-[#8892A4] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2030]">
              {auditRows.map(row => (
                <tr key={row.name} className="bg-[#07070E] hover:bg-[#111118] transition-colors">
                  <td className="px-6 py-4 font-semibold">{row.name}</td>
                  <td className="px-6 py-4 text-[#8892A4]">{row.type}</td>
                  <td className="px-6 py-4 text-[#F0F2F5]">{row.result}</td>
                  <td className="px-6 py-4 text-[#8892A4]">{row.findings}</td>
                  <td className="px-6 py-4">
                    <span className="text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                      {row.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Known risks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-[#8892A4] mb-4 uppercase tracking-widest">
            Riesgos conocidos — publicados con total transparencia
          </h3>
          <div className="space-y-3">
            {knownRisks.map(r => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111118] border border-[#1E2030] rounded-xl px-5 py-4"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-mono text-xs text-[#8892A4] shrink-0">{r.id}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${
                      r.sev === 'WARN'
                        ? 'text-orange-400 bg-orange-400/10'
                        : 'text-yellow-400 bg-yellow-400/10'
                    }`}
                  >
                    {r.sev}
                  </span>
                  <span className="text-sm text-[#C8CFDC]">{r.title}</span>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${
                    r.status === 'ACKNOWLEDGED'
                      ? 'text-[#8892A4] border-[#1E2030]'
                      : 'text-[#0052FF] border-[#0052FF]/30 bg-[#0052FF]/10'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
