'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const bib = value.trim()
    const num = parseInt(bib, 10)

    if (!bib || isNaN(num) || num <= 0) {
      setError('Ingresá un número de dorsal válido')
      return
    }

    setError('')
    setLoading(true)
    router.push(`/buscar?bib=${num}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="relative flex items-center">
        <span className="absolute left-4 text-slate-400 pointer-events-none" aria-hidden="true">
          <SearchIcon className="w-5 h-5" />
        </span>

        <input
          id="bib-input"
          type="number"
          inputMode="numeric"
          min="1"
          max="99999"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError('')
          }}
          placeholder="Número de dorsal"
          disabled={loading}
          className="
            w-full pl-12 pr-4 py-4
            bg-white/10 border border-white/15
            rounded-2xl text-white text-lg font-semibold
            placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:border-yellow-400/40
            transition-all duration-200
            disabled:opacity-60
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          "
          aria-label="Número de dorsal"
          aria-describedby={error ? 'bib-error' : undefined}
          aria-invalid={!!error}
          autoComplete="off"
        />
      </div>

      {error && (
        <p id="bib-error" role="alert" className="text-xs text-red-400 px-1">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-4 rounded-2xl
          bg-yellow-400 text-zinc-900 font-black text-base tracking-wide
          hover:bg-yellow-300 active:scale-[0.98]
          transition-all duration-150
          cursor-pointer min-h-[56px]
          disabled:cursor-not-allowed disabled:opacity-80
          focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-900
          flex items-center justify-center gap-2
        "
      >
        {loading ? (
          <>
            <Spinner />
            Buscando...
          </>
        ) : (
          'Buscar fotos'
        )}
      </button>
    </form>
  )
}

function Spinner() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
