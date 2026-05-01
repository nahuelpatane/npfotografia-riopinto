import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const { email, bib_number } = await req.json()

    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const bib = parseInt(String(bib_number), 10)
    if (!bib || bib <= 0) {
      return NextResponse.json({ error: 'Dorsal inválido' }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('notifications_signup')
      .insert({ email: String(email).trim().toLowerCase(), bib_number: bib })

    // 23505 = unique violation — ya registrado, tratamos como éxito
    if (error && error.code !== '23505') {
      console.error('notifications_signup insert error:', error.code, error.message)
      return NextResponse.json({ error: 'Error interno', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
