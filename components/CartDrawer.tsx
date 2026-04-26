'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useCart, type CartItem } from '@/contexts/CartContext'
import { getWatermarkedUrl } from '@/lib/cloudinary'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

function buildCartWhatsAppUrl(items: CartItem[], total: number): string {
  const bib = items[0]?.bibNumber ?? 0
  const photoList = items
    .map((item, i) => {
      const name = item.photo.original_filename
        ? item.photo.original_filename.replace(/\.[^.]+$/, '')
        : item.photo.cloudinary_public_id.split('/').pop() ?? item.photo.id
      return `${i + 1}. ${name}`
    })
    .join('\n')
  const msg = `Hola! Quiero comprar ${items.length} foto${items.length > 1 ? 's' : ''} del corredor *#${bib}*:\n\n${photoList}\n\nTotal: *$${total.toLocaleString('es-AR')} ARS*\n\n¿Me pasás los datos para la transferencia?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export default function CartDrawer() {
  const { items, removeFromCart, clearCart, totalPrice, isOpen, closeCart } = useCart()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeCart])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const listPrice = items.length * 5000
  const savings = listPrice - totalPrice

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de fotos"
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CartIcon className="w-5 h-5 text-zinc-700" />
            <h2 className="font-bold text-zinc-900 text-base">
              Tu selección
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({items.length} foto{items.length > 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-5 py-12">
              <EmptyCartIcon className="w-16 h-16 text-slate-200" />
              <p className="text-slate-400 text-sm">
                Todavía no agregaste fotos al carrito.
              </p>
              <button
                onClick={closeCart}
                className="text-sm font-semibold text-yellow-600 hover:text-yellow-500 transition-colors cursor-pointer"
              >
                Seguir eligiendo
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 py-2">
              {items.map(item => (
                <CartItemRow
                  key={item.photo.id}
                  item={item}
                  onRemove={() => removeFromCart(item.photo.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer: pricing + CTA */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 px-5 pt-4 pb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>{items.length} foto{items.length > 1 ? 's' : ''} × $5.000</span>
                <span>${listPrice.toLocaleString('es-AR')}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Descuento bundle</span>
                  <span>−${savings.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-900 font-bold text-base pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>${totalPrice.toLocaleString('es-AR')} ARS</span>
              </div>
            </div>

            <a
              href={buildCartWhatsAppUrl(items, totalPrice)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1fba59] active:scale-[0.98] text-white font-bold text-base px-5 py-4 rounded-2xl transition-all duration-150 cursor-pointer min-h-[56px]"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Comprar todo por WhatsApp
            </a>

            <button
              onClick={clearCart}
              className="text-slate-400 hover:text-red-400 text-xs text-center transition-colors cursor-pointer"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

function CartItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const thumbUrl = getWatermarkedUrl(item.photo.cloudinary_public_id, 200)
  const name = item.photo.original_filename
    ? item.photo.original_filename.replace(/\.[^.]+$/, '')
    : item.photo.cloudinary_public_id.split('/').pop() ?? item.photo.id

  return (
    <li className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
      <div className="relative w-16 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        <Image
          src={thumbUrl}
          alt=""
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
        <p className="text-xs text-slate-400 mt-0.5">Dorsal #{item.bibNumber}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-zinc-700">$5.000</span>
        <button
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-red-50 hover:text-red-400 text-slate-300 transition-colors cursor-pointer"
          aria-label={`Quitar ${name} del carrito`}
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  )
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function EmptyCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}
