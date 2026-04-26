'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getWatermarkedUrl, getPreviewUrl } from '@/lib/cloudinary'
import { useCart } from '@/contexts/CartContext'
import type { Photo } from '@/types'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

function buildWhatsAppUrl(photoName: string, bibNumber: number): string {
  const message = `Hola! Quiero comprar la foto *${photoName}* del corredor *#${bibNumber}*. El total es *$5.000 ARS*. ¿Me pasás los datos para la transferencia?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

interface PhotoCardProps {
  photo: Photo
  bibNumber: number
}

export default function PhotoCard({ photo, bibNumber }: PhotoCardProps) {
  const [open, setOpen] = useState(false)
  const { addToCart, removeFromCart, isInCart, openCart } = useCart()

  const watermarkedUrl = getWatermarkedUrl(photo.cloudinary_public_id)
  const previewUrl = getPreviewUrl(photo.cloudinary_public_id)
  const photoName = photo.original_filename
    ? photo.original_filename.replace(/\.[^.]+$/, '')
    : photo.cloudinary_public_id.split('/').pop() ?? photo.id
  const whatsappUrl = buildWhatsAppUrl(photoName, bibNumber)
  const inCart = isInCart(photo.id)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleCartToggle() {
    if (inCart) {
      removeFromCart(photo.id)
    } else {
      addToCart(photo, bibNumber)
    }
  }

  return (
    <>
      <article className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">

        {/* Photo — click opens preview */}
        <div
          className="relative aspect-[3/2] w-full overflow-hidden cursor-zoom-in bg-slate-100"
          onClick={() => setOpen(true)}
        >
          <Image
            src={watermarkedUrl}
            alt={`Foto del corredor #${bibNumber}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />

          {/* Blocks right-click / drag */}
          <div
            className="absolute inset-0 z-10"
            onContextMenu={e => e.preventDefault()}
            draggable={false}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 z-20 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5">
            <ZoomIcon className="w-8 h-8 text-white drop-shadow" />
            <span className="text-white text-sm font-semibold tracking-wide drop-shadow">Ver foto</span>
          </div>
        </div>

        {/* Card footer */}
        <div className="px-4 py-3.5 flex flex-col gap-3">
          {/* Race name + price */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 truncate max-w-[60%]">{photo.race_name}</span>
            <div className="text-right leading-tight">
              <span className="text-sm font-bold text-zinc-900">$5.000</span>
              <span className="text-[10px] text-yellow-600 block">2 x $8.000</span>
            </div>
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleCartToggle}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer min-h-[44px] ${
              inCart
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                : 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300 active:scale-[0.98]'
            }`}
            aria-label={inCart ? `Quitar foto del corredor #${bibNumber} del carrito` : `Agregar foto del corredor #${bibNumber} al carrito`}
          >
            {inCart ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span className="group-only:hidden">En carrito · toca para quitar</span>
              </>
            ) : (
              <>
                <CartPlusIcon className="w-4 h-4" />
                Agregar al carrito
              </>
            )}
          </button>
        </div>
      </article>

      {/* ── Preview modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-zinc-900/92 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
              Cerrar
            </button>

            {/* Large watermarked photo */}
            <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden bg-zinc-900">
              <Image
                src={previewUrl}
                alt={`Vista previa — corredor #${bibNumber}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 80vw"
                priority
              />
              <div
                className="absolute inset-0 z-10"
                onContextMenu={e => e.preventDefault()}
                draggable={false}
              />
            </div>

            {/* Modal CTAs */}
            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 text-center">
                <span className="text-white font-bold text-lg">$5.000 ARS</span>
                <span className="text-yellow-400 text-sm">· 2 fotos por $8.000</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                {/* Add to cart (primary) */}
                <button
                  onClick={() => {
                    handleCartToggle()
                    if (!inCart) {
                      setOpen(false)
                      openCart()
                    }
                  }}
                  className={`flex-1 w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-base transition-all duration-150 cursor-pointer min-h-[52px] ${
                    inCart
                      ? 'bg-emerald-500 text-white hover:bg-red-500'
                      : 'bg-yellow-400 text-zinc-900 hover:bg-yellow-300 active:scale-[0.98]'
                  }`}
                >
                  {inCart ? (
                    <><CheckIcon className="w-5 h-5" /> En carrito</>
                  ) : (
                    <><CartPlusIcon className="w-5 h-5" /> Agregar al carrito</>
                  )}
                </button>

                {/* Buy now via WhatsApp (secondary) */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fba59] active:scale-[0.98] text-white font-bold text-base py-3.5 rounded-full transition-all cursor-pointer min-h-[52px]"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  Comprar ahora
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function CartPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
