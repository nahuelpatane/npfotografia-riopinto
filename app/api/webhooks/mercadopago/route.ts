import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import MercadoPagoConfig, { Payment } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isValidSignature(req: Request, ts: string, v1: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true
  const requestId = req.headers.get('x-request-id') ?? ''
  const dataId = new URL(req.url).searchParams.get('data.id') ?? ''
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  return expected === v1
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const xSignature = req.headers.get('x-signature') ?? ''
    const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? ''
    const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? ''

    if (!isValidSignature(req, ts, v1)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    const notification = JSON.parse(rawBody)

    if (notification.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = notification.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const paymentClient = new Payment(mp)
    const paymentData = await paymentClient.get({ id: paymentId })

    if (paymentData.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    const meta = paymentData.metadata as {
      bib_number: number
      photo_ids: string[]
      cloudinary_ids: string[]
      total_amount: number
    }

    await supabase.from('orders').upsert(
      {
        payment_id: String(paymentId),
        bib_number: meta.bib_number,
        photo_ids: meta.photo_ids,
        cloudinary_ids: meta.cloudinary_ids,
        total_amount: meta.total_amount,
        buyer_email: paymentData.payer?.email ?? null,
        status: 'approved',
      },
      { onConflict: 'payment_id' },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhook/mp]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
