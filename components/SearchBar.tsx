'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
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
    router.push(`/buscar?bib=${num}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="relative flex items-center">
        {/* Magnifier icon */}
        <span className="absolute left-4 text-gray-500 pointer-events-none" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
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
          className="
            w-full pl-12 pr-4 py-4
            bg-white/5 border border-white/10
            rounded-2xl text-white text-lg font-semibold
            placeholder:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:border-yellow-400/40
            transition-all duration-200
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
        className="
          w-full py-4 rounded-2xl
          bg-yellow-400 text-black font-black text-base tracking-wide
          hover:bg-yellow-300 active:scale-[0.98]
          transition-all duration-150
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
        "
      >
        Buscar fotos
      </button>
    </form>
  )
}
