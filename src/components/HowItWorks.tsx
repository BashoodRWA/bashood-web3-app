import { motion } from 'framer-motion'

const steps = [
  {
    n: '01',
    icon: '🏭',
    title: 'Elige un activo',
    desc: 'Una excavadora en una obra de Madrid, una impresora 3D de construcción en Dubái, un panel solar en Sevilla. Cada activo tiene documentación, valoración y ubicación verificadas antes de entrar al mercado.',
  },
  {
    n: '02',
    icon: '💳',
    title: 'Compra tu parte',
    desc: 'Puedes acceder a una parte proporcional del activo desde importes accesibles. Sin banco, sin notario, sin esperar semanas. El registro es inmediato y la propiedad queda únicamente a tu nombre.',
  },
  {
    n: '03',
    icon: '⚡',
    title: 'Accede a liquidez cuando lo necesites',
    desc: 'El valor se actualiza en función de la actividad del activo y del mercado. Cuando quieras salir, hay un mercado abierto. No buscas comprador durante meses. La operación se liquida en segundos.',
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
          <p className="text-[#00C896] text-sm font-medium mb-3 tracking-widest uppercase">
            Tres pasos
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">¿Cómo funciona?</h2>
          <p className="text-[#8892A4] mt-4 text-lg max-w-xl mx-auto">
            Sin cuenta bancaria especial, sin intermediarios, sin mínimos prohibitivos.
          </p>
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
          <span>Sin papeleo · Sin intermediarios · Tarifas desde el 0.3%</span>
          <span className="w-16 h-px bg-[#1E2030]" />
        </div>
      </div>
    </section>
  )
}
