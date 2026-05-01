import Navbar from '@/components/Navbar'

export default function BuscarLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar showBack light />

      <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-9 w-48 bg-slate-200 rounded animate-pulse mb-1.5" />
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* Photo grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/2] rounded-xl bg-slate-200 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        {/* Hint text */}
        <p className="mt-8 text-center text-sm text-slate-400 animate-pulse">
          Buscando tus fotos...
        </p>
      </div>
    </main>
  )
}
