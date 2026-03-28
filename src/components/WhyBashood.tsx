import { motion } from 'framer-motion'

const contrasts = [
  {
    before: 'Comprar parte de una máquina industrial requería abogados, notarios y semanas de espera.',
    after: 'Con Bashood tardas minutos. La participación queda registrada y es tuya.',
  },
  {
    before: 'Si necesitabas vender, buscabas comprador durante meses y pagabas hasta un 15% en comisiones.',
    after: 'Accedes a liquidez en el mercado de forma inmediata. La tarifa es del 2.5%. Sin intermediarios.',
  },
  {
    before: 'Solo grandes empresas podían acceder a este tipo de activos. El capital mínimo era prohibitivo.',
    after: 'Cualquier persona puede entrar desde el 10% de un activo. Sin mínimos absurdos.',
  },
]

export default function WhyBashood() {
  return (
    <section id="por-que" className="py-28 px-6 bg-[#0D0D16]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <p className="text-[#00C896] text-sm font-medium mb-4 tracking-widest uppercase">
            El problema que resolvemos
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-6">
            Los activos industriales mueven la economía real.{' '}
            <span className="text-[#8892A4] font-normal">
              Pero durante décadas solo han sido accesibles para unos pocos.
            </span>
          </h2>
          <p className="text-[#8892A4] text-lg max-w-2xl leading-relaxed">
            Hay 16 billones de dólares en maquinaria, equipos e infraestructura industrial en todo el mundo.
            Activos que están en operación y generan actividad económica. Pero que son ilíquidos, opacos e inaccesibles
            para cualquiera que no sea una gran corporación.
          </p>
        </motion.div>

        {/* Column headers */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold tracking-widest uppercase text-red-400">Antes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00C896]" />
            <span className="text-xs font-semibold tracking-widest uppercase text-[#00C896]">Con Bashood</span>
          </div>
        </div>

        {/* Before / After */}
        <div className="space-y-3">
          {contrasts.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-[#2A1F1F]"
            >
              {/* Before */}
              <div className="bg-[#180D0D] px-7 py-6 flex gap-4 items-start border-b md:border-b-0 md:border-r border-[#2A1F1F]">
                <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[11px] text-red-400 font-bold leading-none">
                  ✕
                </span>
                <p className="text-[#9CA3AF] text-sm leading-relaxed">{c.before}</p>
              </div>
              {/* After */}
              <div className="bg-[#091410] px-7 py-6 flex gap-4 items-start">
                <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[#00C896]/20 border border-[#00C896]/30 flex items-center justify-center text-[11px] text-[#00C896] font-bold leading-none">
                  ✓
                </span>
                <p className="text-[#E2E8F0] text-sm leading-relaxed font-medium">{c.after}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Vision statement */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 border-l-2 border-[#00C896] pl-7"
        >
          <p className="text-xl md:text-2xl text-[#F0F2F5] font-medium leading-relaxed">
            "Bashood existe para que el capital industrial deje de ser un privilegio
            y se convierta en algo accesible, transparente y líquido para cualquier persona."
          </p>
        </motion.div>
      </div>
    </section>
  )
}
