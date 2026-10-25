'use client'
import { useEffect } from 'react'
import { mergeCartIntoAccount, saveCartIfSignedIn, useCustomer } from '@/lib/session'

/** Invisible. On load, a signed in customer's browser cart and saved cart are combined; later changes are saved. */
export function CartSync() {
  const customer = useCustomer()
  const id = customer?.id
  useEffect(() => {
    if (!id) return
    let timer: ReturnType<typeof setTimeout>
    let cleanup = () => {}
    void mergeCartIntoAccount().then(() => {
      const on = () => { clearTimeout(timer); timer = setTimeout(saveCartIfSignedIn, 600) }
      window.addEventListener('rf-cart', on)
      cleanup = () => window.removeEventListener('rf-cart', on)
    })
    return () => { clearTimeout(timer); cleanup() }
  }, [id])
  return null
}
