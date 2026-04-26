import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import PhotoGallery from '@/components/PhotoGallery'
import Navbar from '@/components/Navbar'
import type { Photo } from '@/types'

// Cache results per bib number for 5 minutes to absorb traffic spikes.
// The Python indexing script can call revalidateTag('photos') after uploading
// new photos to bust the cache immediately.
const fetchPhotosForBib = unstable_cache(
  async (bibNumber: number): Promise<{ photos: Photo[]; hasError: boolean }> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('bib_number', bibNumber)
      .order('created_at', { ascending: true })

    if (error) return { photos: [], hasError: true }

    const seen = new Set<string>()
    const photos = (data ?? []).filter(p => {
      const key = p.original_filename ?? p.cloudinary_public_id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return { photos, hasError: false }
  },
  ['buscar-photos'],
  { revalidate: 300, tags: ['photos'] }
)

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
    const result = await fetchPhotosForBib(bibNumber)
    photos = result.photos
    fetchError = result.hasError
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar showBack light />

      <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
        {isInvalidBib ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <p className="text-slate-500">Dorsal inválido. Por favor ingresá un número válido.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-yellow-400 text-zinc-900 font-bold text-sm px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors cursor-pointer min-h-[44px]"
            >
              Buscar de nuevo
            </Link>
          </div>
        ) : (
          <>
            {/* Page header */}
            <div className="mb-8">
              <p className="text-yellow-500 text-[11px] font-bold uppercase tracking-widest mb-1">
                Resultados
              </p>
              <h1 className="font-condensed text-3xl sm:text-4xl font-bold text-zinc-900 uppercase tracking-tight">
                Dorsal{' '}
                <span className="text-yellow-500">#{bibNumber}</span>
              </h1>
              {!fetchError && (
                <p className="text-slate-400 text-sm mt-1.5">
                  {photos.length === 0
                    ? 'No se encontraron fotos para este dorsal.'
                    : `${photos.length} foto${photos.length !== 1 ? 's' : ''} encontrada${photos.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {fetchError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                Error al cargar las fotos. Por favor intentá de nuevo más tarde.
              </div>
            )}

            {!fetchError && photos.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center gap-4">
                <span className="font-condensed text-8xl font-black text-slate-100 leading-none select-none uppercase">
                  #{bibNumber}
                </span>
                <p className="text-slate-400 text-sm max-w-xs">
                  Todavía no hay fotos indexadas para este dorsal. Revisá más tarde o contactanos por WhatsApp.
                </p>
                <Link
                  href="/"
                  className="mt-2 inline-flex items-center gap-2 bg-yellow-400 text-zinc-900 font-bold text-sm px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors cursor-pointer min-h-[44px]"
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
