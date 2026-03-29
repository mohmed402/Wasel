/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase API route timeout in development
  // Note: maxDuration in route.js should also be set
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '{images.unsplash.com,img.freepik.com}',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig




