import SearchBar from '@/components/SearchBar'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-4 flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <span className="font-black text-xl tracking-tight">
          <span className="text-yellow-400">NP</span>Fotografía
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
          RIO PINTO 2026
        </span>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-5 pt-24 pb-20 text-center">
        {/* Live badge */}
        <div className="mb-8 inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-[11px] font-bold uppercase tracking-widest">
            Fotos disponibles
          </span>
        </div>

        <h1 className="text-[clamp(2.8rem,10vw,5.5rem)] font-black tracking-tight leading-[0.95] mb-5">
          Encontrá
          <br />
          <span className="text-yellow-400">tu foto</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-xs sm:max-w-sm leading-relaxed mb-10">
          Ingresá tu número de dorsal y encontrá todas tus fotos de la carrera.
        </p>

        <div className="w-full max-w-sm">
          <SearchBar />
        </div>

        <p className="mt-8 text-xs text-gray-600 tracking-wide">
          +6,000 corredores · Fotos profesionales
        </p>
      </section>

      {/* How it works */}
      <section className="px-5 py-16 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-[11px] uppercase tracking-widest text-gray-500 mb-12">
            Cómo funciona
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'Buscá',
                desc: 'Ingresá tu número de dorsal en el buscador.',
              },
              {
                step: '02',
                title: 'Elegí',
                desc: 'Revisá tus fotos y seleccioná las que más te gusten.',
              },
              {
                step: '03',
                title: 'Comprá',
                desc: 'Coordinamos el pago por WhatsApp, simple y rápido.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <span className="text-5xl font-black text-white/5 leading-none">
                  {step}
                </span>
                <h3 className="font-bold text-white text-base">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 border-t border-white/5 text-center">
        <p className="text-xs text-gray-700">
          © 2026 NPFotografía · Todos los derechos reservados
        </p>
      </footer>
    </main>
  )
}
