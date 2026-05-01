'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function NoPhotosFound({ bibNumber }: { bibNumber: number }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/notifications/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, bib_number: bibNumber }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Algo salió mal, intentá de nuevo.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('No se pudo conectar. Intentá de nuevo.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col items-center py-16 text-center gap-6 max-w-sm mx-auto">
      {/* Dorsal grande decorativo */}
      <span className="font-condensed text-8xl font-black text-slate-100 leading-none select-none uppercase">
        #{bibNumber}
      </span>

      {status === 'success' ? (
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center">
            <CheckIcon className="w-6 h-6 text-zinc-900" />
          </div>
          <p className="font-condensed text-xl font-bold text-zinc-900 uppercase tracking-tight">
            ¡Listo!
          </p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Te avisaremos por mail cuando tus fotos estén disponibles.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-2 text-yellow-500 font-bold text-sm hover:text-yellow-600 transition-colors"
          >
            ← Buscar otro dorsal
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-zinc-800 text-sm font-medium leading-relaxed">
              ¿Todavía no ves tus fotos?
            </p>
            <p className="text-slate-500 text-sm leading-relaxed">
              Estamos procesando las imágenes del Río Pinto en tiempo real. Dejanos tu email y te avisamos apenas estén listas.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
              placeholder="tu@email.com"
              required
              disabled={status === 'loading'}
              className="
                w-full px-4 py-3.5
                bg-white border border-slate-200 rounded-xl
                text-zinc-900 text-sm
                placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:border-yellow-400
                disabled:opacity-60
                transition-all duration-200
              "
            />

            {errorMsg && (
              <p className="text-xs text-red-500 text-left px-1">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="
                w-full py-3.5 rounded-xl
                bg-yellow-400 text-zinc-900 font-black text-sm tracking-wide
                hover:bg-yellow-300 active:scale-[0.98]
                disabled:opacity-70 disabled:cursor-not-allowed
                transition-all duration-150
                flex items-center justify-center gap-2
                min-h-[48px]
              "
            >
              {status === 'loading' ? (
                <>
                  <Spinner />
                  Registrando...
                </>
              ) : (
                'Avisame'
              )}
            </button>
          </form>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Buscar otro dorsal
          </Link>
        </>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
