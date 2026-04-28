'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Photo } from '@/types'
import { calcPrice } from '@/lib/pricing'

export interface CartItem {
  photo: Photo
  bibNumber: number
}

interface CartContextValue {
  items: CartItem[]
  addToCart: (photo: Photo, bibNumber: number) => void
  removeFromCart: (photoId: string) => void
  isInCart: (photoId: string) => boolean
  clearCart: () => void
  totalPrice: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export { calcPrice } from '@/lib/pricing'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addToCart = useCallback((photo: Photo, bibNumber: number) => {
    setItems(prev =>
      prev.some(i => i.photo.id === photo.id) ? prev : [...prev, { photo, bibNumber }]
    )
  }, [])

  const removeFromCart = useCallback((photoId: string) => {
    setItems(prev => prev.filter(i => i.photo.id !== photoId))
  }, [])

  const isInCart = useCallback(
    (photoId: string) => items.some(i => i.photo.id === photoId),
    [items]
  )

  const clearCart = useCallback(() => setItems([]), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, isInCart, clearCart,
      totalPrice: calcPrice(items.length),
      isOpen, openCart, closeCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
