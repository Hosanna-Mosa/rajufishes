import type { MetadataRoute } from 'next'

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/cart', '/checkout', '/orders', '/sign-in', '/track'] }],
    sitemap: `${site}/sitemap.xml`,
  }
}
