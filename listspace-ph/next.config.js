/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    // Disable image optimization when using static export + S3/CloudFront
    unoptimized: true,
  },
}

module.exports = nextConfig;
