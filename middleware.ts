import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter: 40 requests / 60s per IP.
// Works per-edge-worker instance. Good enough for basic abuse prevention;
// for multi-region / serverless scale add Upstash Redis.
const hits = new Map<string, { count: number; resetAt: number }>()

const LIMIT = 40
const WINDOW_MS = 60_000

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export function middleware(request: NextRequest) {
  const ip = getIp(request)
  const now = Date.now()

  // Purge expired entries to prevent unbounded memory growth
  if (hits.size > 5000) {
    for (const [key, val] of hits) {
      if (now > val.resetAt) hits.delete(key)
    }
  }

  const record = hits.get(ip)

  if (!record || now > record.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return NextResponse.next()
  }

  record.count++

  if (record.count > LIMIT) {
    return new NextResponse('Demasiadas solicitudes. Intentá de nuevo en un minuto.', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '60',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/buscar',
}
