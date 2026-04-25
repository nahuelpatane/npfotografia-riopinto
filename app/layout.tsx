import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NPFotografía · Fotos de carrera',
  description: 'Encontrá tus fotos profesionales de la carrera de ciclismo. Buscá por número de dorsal.',
  openGraph: {
    title: 'NPFotografía · Fotos de carrera',
    description: 'Encontrá tus fotos profesionales. Ingresá tu número de dorsal.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
