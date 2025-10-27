/** @type {import('next').NextConfig} */
const nextConfig = {
  // Generate a static export in the 'out' directory
  output: 'export',
  images: {
    // Disable image optimization when using static export + S3/CloudFront
    unoptimized: true,
  },
}

module.exports = nextConfig
