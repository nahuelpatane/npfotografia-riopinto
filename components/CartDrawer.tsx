'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCart, type CartItem } from '@/contexts/CartContext'
import { getWatermarkedUrl } from '@/lib/cloudinary'

export default function CartDrawer() {
  const { items, removeFromCart, clearCart, totalPrice, isOpen, closeCart } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

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

  async function handleCheckout() {
    if (!items.length || isCheckingOut) return
    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, bibNumber: items[0].bibNumber }),
      })
      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        setIsCheckingOut(false)
      }
    } catch {
      setIsCheckingOut(false)
    }
  }

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

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="flex items-center justify-center gap-2.5 bg-[#009EE3] hover:bg-[#0087c4] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base px-5 py-4 rounded-2xl transition-all duration-150 cursor-pointer min-h-[56px]"
            >
              {isCheckingOut ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                  Redirigiendo…
                </>
              ) : (
                <>
                  <MPIcon className="w-5 h-5" />
                  Pagar con Mercado Pago
                </>
              )}
            </button>

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

function EmptyCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}

function MPIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.23c-.145.658-.52.817-1.054.508l-2.908-2.143-1.403 1.35c-.155.155-.285.285-.585.285l.209-2.963 5.391-4.869c.234-.208-.051-.324-.363-.116L7.037 14.6l-2.852-.893c-.62-.194-.632-.62.13-.918l11.143-4.297c.516-.188.968.116.803.918l.3-.162z"/>
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
