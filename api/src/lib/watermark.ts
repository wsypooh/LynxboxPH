import sharp from 'sharp';

export interface WatermarkOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number; // 0.0 to 1.0
  scale?: number; // Scale factor relative to image size (0.1 = 10% of image width)
  margin?: number; // Margin in pixels
}

export class WatermarkService {
  private watermarkBuffer: Buffer | null = null;
  private defaultOptions: Required<WatermarkOptions> = {
    position: 'bottom-right',
    opacity: 0.7,
    scale: 0.15, // 15% of image width
    margin: 20
  };

  constructor() {
    console.log('=== WATERMARK SERVICE CONSTRUCTOR ===');
    // Initialize synchronously to avoid race conditions
    this.initializeWatermarkSync();
  }

  private initializeWatermarkSync(): void {
    console.log('=== INITIALIZING WATERMARK SYNC ===');
    try {
      // Create a simple text-based watermark logo synchronously
      this.watermarkBuffer = this.createTextWatermarkSync();
      console.log('Watermark initialized successfully, buffer size:', this.watermarkBuffer.length);
    } catch (error) {
      console.error('Failed to initialize watermark:', error);
    }
  }

  private createTextWatermarkSync(): Buffer {
    // Create a simple text watermark with Lynxbox PH branding
    const svg = `
      <svg width="120" height="30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="120" height="30" fill="white" opacity="0.7" rx="4"/>
        <text x="60" y="20" font-family="Arial, sans-serif" font-size="12" 
              text-anchor="middle" fill="#64748B">lynxbox.ph</text>
      </svg>
    `;

    return Buffer.from(svg);
  }

  async applyWatermark(imageBuffer: Buffer, options: WatermarkOptions = {}): Promise<Buffer> {
    console.log('=== WATERMARK APPLICATION START ===');
    console.log('Watermark service ready:', this.isReady());
    console.log('Watermark options:', options);
    console.log('Original image buffer size:', imageBuffer.length);
    
    if (!this.watermarkBuffer) {
      console.warn('Watermark not initialized, returning original image');
      return imageBuffer;
    }

    const opts = { ...this.defaultOptions, ...options };
    console.log('Final watermark options:', opts);

    try {
      // Get image dimensions
      const imageMetadata = await sharp(imageBuffer).metadata();
      const { width: imageWidth = 800, height: imageHeight = 600 } = imageMetadata;
      console.log('Original image dimensions:', { width: imageWidth, height: imageHeight });

      // Use fixed watermark sizing for consistency
      const watermarkWidth = 200; // Fixed 200px width (real estate standard)
      const watermarkHeight = 60; // Fixed 60px height (professional aspect ratio)
      
      console.log('Fixed watermark dimensions:', { width: watermarkWidth, height: watermarkHeight });

      // Process watermark
      console.log('Processing watermark buffer...');
      const watermark = await sharp(this.watermarkBuffer)
        .resize(watermarkWidth, watermarkHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png()
        .toBuffer();
      
      console.log('Watermark processed, buffer size:', watermark.length);

      // Calculate position
      const { left, top } = this.calculatePosition(
        imageWidth,
        imageHeight,
        watermarkWidth,
        watermarkHeight,
        opts.position,
        opts.margin
      );
      console.log('Watermark position calculated:', { left, top });

      // Apply watermark to image
      console.log('Applying watermark to image...');
      const result = await sharp(imageBuffer)
        .composite([{
          input: watermark,
          left,
          top,
          blend: 'over'
        }])
        .toBuffer();

      console.log('Watermark applied successfully, final buffer size:', result.length);
      return result;
    } catch (error) {
      console.error('Error applying watermark:', error);
      return imageBuffer; // Return original image if watermark fails
    }
  }

  private calculatePosition(
    imageWidth: number,
    imageHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    position: string,
    margin: number
  ): { left: number; top: number } {
    switch (position) {
      case 'top-left':
        return { left: margin, top: margin };
      case 'top-right':
        return { left: imageWidth - watermarkWidth - margin, top: margin };
      case 'bottom-left':
        return { left: margin, top: imageHeight - watermarkHeight - margin };
      case 'bottom-right':
        return { 
          left: imageWidth - watermarkWidth - margin, 
          top: imageHeight - watermarkHeight - margin 
        };
      case 'center':
        return { 
          left: Math.floor((imageWidth - watermarkWidth) / 2), 
          top: Math.floor((imageHeight - watermarkHeight) / 2) 
        };
      default:
        return { 
          left: imageWidth - watermarkWidth - margin, 
          top: imageHeight - watermarkHeight - margin 
        };
    }
  }

  // Method to update watermark with custom logo (for future use)
  async setCustomWatermark(logoBuffer: Buffer): Promise<void> {
    try {
      this.watermarkBuffer = logoBuffer;
      console.log('Custom watermark set successfully');
    } catch (error) {
      console.error('Failed to set custom watermark:', error);
      throw error;
    }
  }

  // Check if watermark is ready
  isReady(): boolean {
    return this.watermarkBuffer !== null;
  }
}
