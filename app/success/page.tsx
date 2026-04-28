import { notFound } from 'next/navigation'
import Image from 'next/image'
import MercadoPagoConfig, { Payment } from 'mercadopago'
import { getDownloadUrl } from '@/lib/cloudinary'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

interface Props {
  searchParams: Promise<{ payment_id?: string; status?: string }>
}

export default async function SuccessPage({ searchParams }: Props) {
  const { payment_id, status } = await searchParams

  if (!payment_id || status !== 'approved') notFound()

  let paymentData
  try {
    const paymentClient = new Payment(mp)
    paymentData = await paymentClient.get({ id: payment_id })
  } catch {
    notFound()
  }

  if (paymentData.status !== 'approved') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="text-center">
          <p className="text-zinc-500 text-lg">Tu pago está siendo procesado.</p>
          <p className="text-zinc-400 text-sm mt-1">En unos minutos recibirás un email de confirmación.</p>
        </div>
      </main>
    )
  }

  const meta = paymentData.metadata as {
    bib_number?: number
    cloudinary_ids?: string[]
    total_amount?: number
  }

  const cloudinaryIds: string[] = meta?.cloudinary_ids ?? []
  const bibNumber = meta?.bib_number ?? 0
  const totalAmount = meta?.total_amount ?? 0

  return (
    <main className="min-h-screen bg-zinc-50 py-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
            <CheckIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">¡Pago confirmado!</h1>
          <p className="text-zinc-500">
            Tus fotos ya están listas para descargar. ¡Gracias por tu compra!
          </p>
          {totalAmount > 0 && (
            <p className="text-sm text-zinc-400 mt-1">
              Total: ${totalAmount.toLocaleString('es-AR')} ARS — Dorsal #{bibNumber}
            </p>
          )}
        </div>

        {/* Photo list */}
        {cloudinaryIds.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {cloudinaryIds.map((publicId, i) => (
              <li
                key={publicId}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center gap-4"
              >
                <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                  <Image
                    src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_160,h_112,c_fill,q_auto/${publicId}`}
                    alt={`Foto ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700">Foto {i + 1}</p>
                  <p className="text-xs text-zinc-400">Dorsal #{bibNumber}</p>
                </div>
                <a
                  href={getDownloadUrl(publicId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Descargar
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-zinc-400 text-sm">
            No encontramos fotos para este pago. Contactanos por WhatsApp si hay algún problema.
          </p>
        )}

        <p className="text-center text-xs text-zinc-400 mt-8">
          Guardá esta página — el link de descarga es válido indefinidamente.
        </p>
      </div>
    </main>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
