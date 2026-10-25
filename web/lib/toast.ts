/** Tiny event helpers so any component can show a toast or bump the cart count without a shared provider. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('rf-toast', { detail: message }))
}
export function notifyAdded(name: string) {
  toast(`${name} added to cart`)
  window.dispatchEvent(new Event('rf-bump'))
}
export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
