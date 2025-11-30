/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    // Disable image optimization when using static export + S3/CloudFront
    unoptimized: true,
  },
}

// Copy .env file to out directory after build
const fs = require('fs');
const path = require('path');

module.exports = {
  ...nextConfig,
  // Hook into the build process to copy .env file
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // This runs on the client build
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.done.tap('CopyEnvFile', () => {
            const envPath = path.join(process.cwd(), '.env');
            const outPath = path.join(process.cwd(), 'out', '.env');
            
            if (fs.existsSync(envPath)) {
              fs.copyFileSync(envPath, outPath);
              console.log('✓ Copied .env to out directory');
            }
          });
        },
      });
    }
    return config;
  },
}
