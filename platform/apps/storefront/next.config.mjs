/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@maxseller/shared', '@maxseller/types', '@maxseller/validation'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: '127.0.0.1' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/:path*`,
      },
    ]
  },
}

export default nextConfig
