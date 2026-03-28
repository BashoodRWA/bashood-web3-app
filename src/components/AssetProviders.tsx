import { useState } from 'react'
import { motion } from 'framer-motion'

const benefits = [
  {
    icon: '🏗️',
    title: 'Capital sin bancos ni dilución',
    desc: 'Abre participaciones de tu maquinaria o infraestructura a inversores globales. Sin préstamos bancarios, sin ceder equity de tu empresa.',
  },
  {
    icon: '🔒',
    title: 'Tú sigues controlando la operación',
    desc: 'Registrar un activo en Bashood no es venderlo. Solo fracciona la propiedad. Tú decides cómo y cuándo operas.',
  },
  {
    icon: '📈',
    title: 'Activos ilíquidos se vuelven negociables',
    desc: 'Una excavadora parada cuesta. En Bashood, el mercado le asigna valor de forma continua y transparente. Liquidez cuando la necesitas.',
  },
  {
    icon: '✅',
    title: 'Verificación on-chain incluida',
    desc: 'Cada activo pasa por due diligence antes de listarse: documentación, valoración independiente y ubicación quedan registradas en la blockchain.',
  },
]

const steps = [
  { n: '1', label: 'Registras tu activo', desc: 'Documentación + valoración.' },
  { n: '2', label: 'Due diligence on-chain', desc: '7–14 días de verificación.' },
  { n: '3', label: 'Recibes el capital', desc: 'Directo, sin intermediarios.' },
]

export default function AssetProviders() {
  return (
    <section id="empresas" className="py-28 px-6 bg-[#07070E]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-0 w-full flex justify-center overflow-hidden">
        <div className="w-[600px] h-[300px] rounded-full bg-[#0052FF]/6 blur-[120px] -translate-y-1/2" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="text-[#0052FF] text-sm font-medium mb-4 tracking-widest uppercase">
            Para empresas
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-2xl mb-4">
                ¿Tienes activos{' '}
                <span className="text-[#0052FF]">productivos?</span>
              </h2>
              <p className="text-[#8892A4] text-lg max-w-2xl leading-relaxed">
                Bashood no es solo una plataforma de inversión. Es la infraestructura
                que conecta activos reales con capital global. Si tienes maquinaria,
                infraestructura o sistemas productivos, puedes registrarlos y acceder a
                financiación sin bancos ni intermediarios.
              </p>
            </div>
            <a
              href="#contacto-empresas"
              className="shrink-0 inline-flex items-center gap-2 bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold px-7 py-4 rounded-xl transition-colors text-base whitespace-nowrap"
            >
              Registrar un activo →
            </a>
          </div>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="bg-[#0D0D16] border border-[#1E2030] rounded-2xl p-6 hover:border-[#0052FF]/40 transition-colors"
            >
              <div className="text-3xl mb-4">{b.icon}</div>
              <h3 className="font-bold text-base mb-2">{b.title}</h3>
              <p className="text-[#8892A4] text-sm leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Process strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="bg-[#0D0D16] border border-[#1E2030] rounded-2xl p-8"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-[#8892A4] mb-6">
            Cómo se registra un activo
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#0052FF]/15 border border-[#0052FF]/30 flex items-center justify-center text-[#0052FF] font-bold text-sm">
                  {s.n}
                </span>
                <div>
                  <p className="font-semibold text-sm mb-1">{s.label}</p>
                  <p className="text-[#8892A4] text-xs">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block shrink-0 self-center ml-auto w-8 h-px bg-[#1E2030]" />
                )}
              </div>
            ))}
          </div>

          {/* Contact strip */}
          <div
            id="contacto-empresas"
            className="mt-8 pt-8 border-t border-[#1E2030] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <p className="font-semibold mb-1">¿Quieres registrar tu primer activo?</p>
              <p className="text-[#8892A4] text-sm">
                Te guiamos por el proceso de verificación step by step.
              </p>
            </div>
            <a
              href="#registro-activo"
              className="shrink-0 inline-flex items-center gap-2 bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Registrar un activo →
            </a>
          </div>
        </motion.div>

        {/* Registration form */}
        <RegisterForm />
      </div>
    </section>
  )
}

function RegisterForm() {
  const [form, setForm] = useState({ company: '', assetType: '', email: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const inputClass =
    'w-full bg-[#111118] border border-[#1E2030] text-white placeholder-[#4B5563] rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-[#0052FF] transition-colors'

  return (
    <motion.div
      id="registro-activo"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mt-6 bg-[#0D0D16] border border-[#1E2030] rounded-2xl p-8"
    >
      <p className="text-xs font-semibold tracking-widest uppercase text-[#8892A4] mb-2">
        Registro de activo
      </p>
      <h3 className="text-xl font-bold mb-6">
        Empieza el proceso de verificación
      </h3>

      {submitted ? (
        <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-xl px-6 py-5 text-[#00C896] text-sm font-medium">
          ✓ Solicitud recibida. Nuestro equipo revisará tu activo y se pondrá en contacto en menos de 48 horas.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#8892A4] font-medium">Empresa o propietario</label>
            <input
              type="text"
              placeholder="Nombre de tu empresa"
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#8892A4] font-medium">Tipo de activo</label>
            <select
              value={form.assetType}
              onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}
              required
              className={inputClass + ' cursor-pointer'}
            >
              <option value="" disabled>Selecciona una categoría</option>
              <option value="maquinaria-construccion">Maquinaria de construcción</option>
              <option value="energia">Plantas de energía</option>
              <option value="manufactura">Manufactura e industria</option>
              <option value="logistica">Logística e infraestructura</option>
              <option value="impresion3d">Impresión 3D industrial</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs text-[#8892A4] font-medium">Email de contacto</label>
            <input
              type="email"
              placeholder="tu@empresa.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-[#4B5563]">
              El equipo revisará tu solicitud y te contactará en menos de 48h.
            </p>
            <button
              type="submit"
              className="shrink-0 bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
            >
              Enviar solicitud
            </button>
          </div>
        </form>
      )}
    </motion.div>
  )
}
