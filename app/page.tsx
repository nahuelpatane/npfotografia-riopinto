import Image from 'next/image'
import SearchBar from '@/components/SearchBar'
import Navbar from '@/components/Navbar'

const HERO_PHOTOS = [
  '/background/01.png',
  '/background/02.png',
  '/background/03.png',
  '/background/04.png',
  '/background/05.png',
  '/background/06.png',
]

export default function Home() {
  return (
    <main className="bg-slate-50">
      {/* ── Navbar (dark, sits on hero) ── */}
      <div className="bg-zinc-900">
        <Navbar />
      </div>

      {/* ── Hero: AI-generated race photo mosaic background ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-5 pb-20 text-center overflow-hidden bg-zinc-900">

        {/* Photo mosaic — 6 static images, grid 3×2 */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2">
          {HERO_PHOTOS.map((src, i) => (
            <div key={src} className="relative overflow-hidden">
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
                priority={i < 3}
              />
            </div>
          ))}
        </div>

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 via-zinc-900/75 to-zinc-900" />
        <br></br>
        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Camera viewfinder element */}
          <div className="mb-10 flex flex-col items-center gap-4">
            <div className="relative px-8 py-3.5">
              {/* Viewfinder corner brackets */}
              <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-400" />
              <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-400" />
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-400" />
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-[9px] font-mono font-bold uppercase tracking-[0.2em]">REC</span>
                </span>
                <span className="text-white/25 font-mono text-xs">│</span>
                <span className="text-yellow-400 text-[11px] font-mono uppercase tracking-[0.15em]">Capturando recuerdos</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-white/35 uppercase tracking-widest">
              <span>+5000 fotos</span>
              <span className="text-white/15">·</span>
              <span>5.890 dorsales</span>
              <span className="text-white/15">·</span>
              <span className="text-yellow-400/50">disponibles ya</span>
            </div>
          </div>

          <h1 className="font-condensed text-[clamp(3.2rem,13vw,7rem)] font-extrabold uppercase tracking-tight leading-[0.9] mb-5 text-white">
            Encontrá
            <br />
            <span className="text-yellow-400">tu foto</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-xs sm:max-w-sm leading-relaxed mb-10">
            Ingresá tu número de dorsal y encontrá todas tus fotos de la carrera.
          </p>

          <div className="w-full max-w-sm">
            <SearchBar />
          </div>

          <p className="mt-8 text-xs text-slate-500 tracking-wide">
            +6.000 corredores · Fotos profesionales · Entrega inmediata
          </p>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="px-5 py-20 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-[11px] uppercase tracking-widest text-slate-400 mb-2">
            Cómo funciona
          </p>
          <h2 className="font-condensed text-center text-3xl sm:text-4xl font-bold text-zinc-900 mb-12 uppercase tracking-tight">
            Simple y rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Buscá',
                desc: 'Ingresá tu número de dorsal en el buscador.',
                icon: SearchStepIcon,
              },
              {
                step: '02',
                title: 'Elegí',
                desc: 'Revisá tus fotos y agregá las que más te gusten al carrito.',
                icon: CartStepIcon,
              },
              {
                step: '03',
                title: 'Comprá',
                desc: 'Coordinamos el pago por WhatsApp, simple y rápido.',
                icon: WhatsAppStepIcon,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-yellow-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
                    Paso {step}
                  </span>
                  <h3 className="font-condensed font-bold text-zinc-900 text-xl uppercase tracking-tight mt-0.5">
                    {title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mt-1.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Precios ── */}
      <section className="px-5 py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-[11px] uppercase tracking-widest text-slate-400 mb-2">
            Precios
          </p>
          <h2 className="font-condensed text-center text-3xl sm:text-4xl font-bold text-zinc-900 mb-10 uppercase tracking-tight">
            Sin sorpresas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: '1 foto', price: '$5.000', note: 'ARS', highlight: false },
              { label: '2 fotos', price: '$8.000', note: 'ARS · ahorrás $2.000', highlight: true },
              { label: '3+ fotos', price: '$3.500', note: 'c/u · pedí tu combo', highlight: false },
            ].map(({ label, price, note, highlight }) => (
              <div
                key={label}
                className={`rounded-2xl border p-6 flex flex-col items-center text-center gap-1.5 transition-shadow ${highlight
                  ? 'bg-yellow-400 border-yellow-400 shadow-lg shadow-yellow-400/20'
                  : 'bg-white border-slate-100 shadow-sm'
                  }`}
              >
                <span className={`text-xs font-semibold uppercase tracking-widest ${highlight ? 'text-yellow-900' : 'text-slate-400'}`}>
                  {label}
                </span>
                <span className="font-condensed text-4xl font-extrabold tracking-tight text-zinc-900">
                  {price}
                </span>
                <span className={`text-xs ${highlight ? 'text-yellow-800' : 'text-slate-400'}`}>
                  {note}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 py-8 border-t border-slate-100 text-center bg-white">
        <p className="text-xs text-slate-400">
          © 2026 NPFotografía · Todos los derechos reservados
        </p>
      </footer>
    </main>
  )
}

function SearchStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function CartStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}

function WhatsAppStepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
