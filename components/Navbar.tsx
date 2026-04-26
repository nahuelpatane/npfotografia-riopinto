'use client'

import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'

interface NavbarProps {
  showBack?: boolean
  light?: boolean
}

export default function Navbar({ showBack = false, light = false }: NavbarProps) {
  const { items, openCart } = useCart()
  const count = items.length

  return (
    <nav
      className={`sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors ${
        light
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm'
          : 'bg-zinc-900/90 backdrop-blur-md border-b border-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href="/"
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer ${
              light
                ? 'bg-slate-100 hover:bg-slate-200 text-zinc-700'
                : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
            aria-label="Volver al inicio"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Link>
        )}
        <Link href="/" className="font-black text-xl tracking-tight cursor-pointer">
          <span className="text-yellow-400">NP</span>
          <span className={light ? 'text-zinc-900' : 'text-white'}>Fotografía</span>
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1 ${
            light ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'
          }`}
        >
          Río Pinto 2026
        </span>

        <button
          onClick={openCart}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 cursor-pointer ${
            count > 0
              ? 'bg-yellow-400 hover:bg-yellow-300 text-zinc-900 shadow-lg shadow-yellow-400/30'
              : light
                ? 'bg-slate-100 hover:bg-slate-200 text-zinc-600'
                : 'bg-white/5 hover:bg-white/10 text-white'
          }`}
          aria-label={count > 0 ? `Carrito con ${count} foto${count > 1 ? 's' : ''}` : 'Abrir carrito'}
        >
          <CartIcon className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-zinc-900 text-yellow-400 text-[9px] font-black rounded-full flex items-center justify-center leading-none">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}
