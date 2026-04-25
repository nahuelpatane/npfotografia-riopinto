import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import PhotoGallery from '@/components/PhotoGallery'
import type { Photo } from '@/types'

interface BuscarPageProps {
  searchParams: Promise<{ bib?: string }>
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const { bib } = await searchParams
  const bibNumber = bib ? parseInt(bib, 10) : NaN

  const isInvalidBib = !bib || isNaN(bibNumber) || bibNumber <= 0

  let photos: Photo[] = []
  let fetchError = false

  if (!isInvalidBib) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('bib_number', bibNumber)
      .order('created_at', { ascending: true })

    if (error) {
      fetchError = true
    } else {
      // Deduplicate by original_filename first (catches re-uploaded copies with different
      // cloudinary_public_id), then fall back to cloudinary_public_id.
      const seen = new Set<string>()
      photos = (data ?? []).filter(p => {
        const key = p.original_filename ?? p.cloudinary_public_id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 px-5 py-4 flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Volver al inicio"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <span className="font-black text-lg tracking-tight">
          <span className="text-yellow-400">NP</span>Fotografía
        </span>
      </nav>

      <div className="px-5 py-8 max-w-6xl mx-auto">
        {isInvalidBib ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <p className="text-gray-400">Dorsal inválido. Por favor ingresá un número válido.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-yellow-400 text-black font-bold text-sm px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors cursor-pointer"
            >
              Buscar de nuevo
            </Link>
          </div>
        ) : (
          <>
            {/* Page header */}
            <div className="mb-8">
              <p className="text-yellow-400 text-[11px] font-bold uppercase tracking-widest mb-1">
                Resultados
              </p>
              <h1 className="text-3xl sm:text-4xl font-black">
                Dorsal{' '}
                <span className="text-yellow-400">#{bibNumber}</span>
              </h1>
              {!fetchError && (
                <p className="text-gray-500 text-sm mt-1.5">
                  {photos.length === 0
                    ? 'No se encontraron fotos para este dorsal.'
                    : `${photos.length} foto${photos.length !== 1 ? 's' : ''} encontrada${photos.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {fetchError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                Error al cargar las fotos. Por favor intentá de nuevo más tarde.
              </div>
            )}

            {!fetchError && photos.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center gap-4">
                <span className="text-8xl font-black text-white/5 leading-none select-none">
                  #{bibNumber}
                </span>
                <p className="text-gray-500 text-sm max-w-xs">
                  Todavía no hay fotos indexadas para este dorsal. Revisá más tarde o contactanos por WhatsApp.
                </p>
                <Link
                  href="/"
                  className="mt-2 inline-flex items-center gap-2 bg-yellow-400 text-black font-bold text-sm px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors cursor-pointer"
                >
                  Buscar otro dorsal
                </Link>
              </div>
            )}

            {!fetchError && photos.length > 0 && (
              <PhotoGallery photos={photos} bibNumber={bibNumber} />
            )}
          </>
        )}
      </div>
    </main>
  )
}
