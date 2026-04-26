'use client'

import { CartProvider } from '@/contexts/CartContext'
import CartDrawer from './CartDrawer'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  )
}
