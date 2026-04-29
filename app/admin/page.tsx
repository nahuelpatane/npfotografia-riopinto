import { createClient } from '@supabase/supabase-js'

interface Order {
  id: string
  payment_id: string
  bib_number: number
  photo_ids: string[]
  cloudinary_ids: string[]
  total_amount: number
  buyer_email: string | null
  status: string
  created_at: string
}

interface Props {
  searchParams: Promise<{ key?: string }>
}

export default async function AdminPage({ searchParams }: Props) {
  const { key } = await searchParams
  const secret = process.env.ADMIN_SECRET

  // Env var not configured
  if (!secret) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="text-center">
          <p className="text-red-500 font-medium">ADMIN_SECRET no está configurado.</p>
          <p className="text-zinc-400 text-sm mt-1">Agregá la variable de entorno y reiniciá el servidor.</p>
        </div>
      </main>
    )
  }

  // No key provided → show login form
  if (!key) {
    return <LoginForm error={false} />
  }

  // Wrong key → show form with error
  if (key !== secret) {
    return <LoginForm error={true} />
  }

  // ── Authenticated ──────────────────────────────────────────────────────────

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <p className="text-red-500">Error al cargar órdenes: {error.message}</p>
      </main>
    )
  }

  const rows = (orders ?? []) as Order[]

  const totalRevenue = rows.reduce((s, o) => s + Number(o.total_amount), 0)
  const totalPhotos = rows.reduce((s, o) => s + (o.cloudinary_ids?.length ?? 0), 0)
  const uniqueEmails = new Set(rows.map(o => o.buyer_email).filter(Boolean)).size
  const uniqueBibs = new Set(rows.map(o => o.bib_number)).size

  return (
    <main className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Panel de ventas</h1>
          <p className="text-zinc-400 text-sm mt-1">NP Fotografía — {rows.length} pedidos en total</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard label="Ingresos totales" value={`$${totalRevenue.toLocaleString('es-AR')}`} sub="ARS" />
          <StatCard label="Pedidos" value={String(rows.length)} sub="pagos aprobados" />
          <StatCard label="Fotos vendidas" value={String(totalPhotos)} sub="imágenes" />
          <StatCard label="Clientes únicos" value={String(uniqueEmails || uniqueBibs)} sub={uniqueEmails ? 'emails distintos' : 'dorsales distintos'} />
        </div>

        {/* Orders table */}
        {rows.length === 0 ? (
          <p className="text-center text-zinc-400 py-16">Todavía no hay pedidos.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-4 py-3 font-semibold text-zinc-500 whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500">Dorsal</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500">Fotos</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 whitespace-nowrap">Monto</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500">Email</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500">Estado</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 whitespace-nowrap">ID pago</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order, i) => (
                    <tr
                      key={order.id}
                      className={`border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${i % 2 === 0 ? '' : 'bg-zinc-50/50'}`}
                    >
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800">
                        #{order.bib_number}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {order.cloudinary_ids?.length ?? 0} foto{(order.cloudinary_ids?.length ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-800 whitespace-nowrap">
                        ${Number(order.total_amount).toLocaleString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[160px] truncate">
                        {order.buyer_email ?? <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {order.status === 'approved' ? 'Aprobado' : order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs whitespace-nowrap">
                        {order.payment_id.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-zinc-300 mt-8">
          /admin — solo para uso interno
        </p>
      </div>
    </main>
  )
}

function LoginForm({ error }: { error: boolean }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-zinc-900">Panel de admin</h1>
          <p className="text-zinc-400 text-sm mt-1">NP Fotografía</p>
        </div>
        <form method="get" action="/admin" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="key" className="text-sm font-medium text-zinc-700">Clave de acceso</label>
            <input
              id="key"
              name="key"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">Clave incorrecta. Intentá de nuevo.</p>
          )}
          <button
            type="submit"
            className="w-full bg-zinc-900 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 leading-none">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{sub}</p>
    </div>
  )
}
