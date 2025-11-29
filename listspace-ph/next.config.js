/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Disable image optimization when using static export + S3/CloudFront
    unoptimized: true,
  },
}

module.exports = nextConfig
