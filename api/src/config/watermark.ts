export interface WatermarkConfig {
  enabled: boolean;
  defaultOptions: {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number; // 0.0 to 1.0
    scale: number; // Scale factor relative to image size
    margin: number; // Margin in pixels
  };
  imageProcessing: {
    enabled: boolean;
    defaultAspectRatio: '4:3' | '16:9' | '1:1' | 'original';
    defaultWidth: number; // Default width for resizing
    quality: number; // JPEG quality 1-100
    format: 'jpeg' | 'png' | 'webp';
  };
}

export const watermarkConfig: WatermarkConfig = {
  enabled: process.env.WATERMARK_ENABLED !== 'false', // Enable by default
  defaultOptions: {
    position: (process.env.WATERMARK_POSITION as any) || 'bottom-right',
    opacity: parseFloat(process.env.WATERMARK_OPACITY || '0.7'),
    scale: parseFloat(process.env.WATERMARK_SCALE || '0.15'), // 15% of image width
    margin: parseInt(process.env.WATERMARK_MARGIN || '20')
  },
  imageProcessing: {
    enabled: process.env.IMAGE_PROCESSING_ENABLED !== 'false', // Enable by default
    defaultAspectRatio: (process.env.DEFAULT_ASPECT_RATIO as any) || '4:3',
    defaultWidth: parseInt(process.env.DEFAULT_IMAGE_WIDTH || '1200'),
    quality: parseInt(process.env.IMAGE_QUALITY || '85'),
    format: (process.env.IMAGE_FORMAT as any) || 'jpeg'
  }
};

console.log('=== WATERMARK CONFIG LOADED ===');
console.log('Watermark enabled:', watermarkConfig.enabled);
console.log('Watermark options:', watermarkConfig.defaultOptions);
console.log('Image processing enabled:', watermarkConfig.imageProcessing.enabled);
console.log('Image processing config:', watermarkConfig.imageProcessing);

// Helper function to get watermark options from environment or request
export function getWatermarkOptions(customOptions?: Partial<WatermarkConfig['defaultOptions']>) {
  return {
    ...watermarkConfig.defaultOptions,
    ...customOptions
  };
}
