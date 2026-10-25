import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

// Security headers on every page. A strict Content-Security-Policy is left out on purpose: Razorpay's checkout
// loads scripts and frames from its own domains and a wrong policy would break paying. See docs/DECISIONS.md.
const headers = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { qualities: [75, 85], formats: ['image/webp'] },
  // put the page title and description in <head> for every visitor, not streamed in later (better for search and link previews)
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: '/:path*', headers }]
  },
}

export default nextConfig
