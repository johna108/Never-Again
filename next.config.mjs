/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'Strict-Transport-Security', value: 'max-age=63072000' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }] }]
  },
  async rewrites() {
    return [
      {
        source: '/:section(overview|ask|experience-memory|learned-playbook|evaluations|devops|staging|audit|demo)',
        destination: '/',
      },
    ]
  },
}

export default nextConfig
