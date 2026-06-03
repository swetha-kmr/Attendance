const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/Attendance',
  assetPrefix: '/Attendance/',

  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig