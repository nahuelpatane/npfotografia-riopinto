import { NextResponse } from 'next/server'
import MercadoPagoConfig, { Preference } from 'mercadopago'
import { calcPrice } from '@/lib/pricing'
import type { CartItem } from '@/contexts/CartContext'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(req: Request) {
  try {
    const { items, bibNumber }: { items: CartItem[]; bibNumber: number } = await req.json()

    if (!items?.length || !bibNumber) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const totalPrice = calcPrice(items.length)
    const proto = req.headers.get('x-forwarded-proto') ?? 'http'
    const host = req.headers.get('host') ?? 'localhost:3000'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`

    const preference = new Preference(mp)
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'fotos-bundle',
            title: `${items.length} foto${items.length > 1 ? 's' : ''} – Dorsal #${bibNumber}`,
            quantity: 1,
            unit_price: totalPrice,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: `${baseUrl}/success`,
          failure: `${baseUrl}/buscar?bib=${bibNumber}`,
          pending: `${baseUrl}/buscar?bib=${bibNumber}`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        metadata: {
          bib_number: bibNumber,
          photo_ids: items.map((i) => i.photo.id),
          cloudinary_ids: items.map((i) => i.photo.cloudinary_public_id),
          total_amount: totalPrice,
        },
        statement_descriptor: 'NP FOTOGRAFIA',
      },
    })

    return NextResponse.json({ init_point: result.init_point })
  } catch (error) {
    console.error('[checkout]', error)
    return NextResponse.json({ error: 'Error al crear el pago' }, { status: 500 })
  }
}
