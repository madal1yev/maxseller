import type { MetadataRoute } from 'next'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/products',
    '/categories',
    '/search',
    '/about',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
    '/refund',
    '/login',
    '/register',
  ]

  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE}${route || '/'}`,
      lastModified: new Date(),
      changeFrequency: (route === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
      priority: route === '' ? 1 : route.startsWith('/product') || route === '/products' ? 0.9 : 0.6,
    })),
  ]
}
