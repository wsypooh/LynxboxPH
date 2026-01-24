import sharp from 'sharp';
import { WatermarkService, WatermarkOptions } from './watermark';

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    aspectRatio: '4:3' | '16:9' | '1:1' | 'original';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    quality?: number; // 1-100
  };
  watermark?: WatermarkOptions;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number; // 1-100
}

export interface ProcessedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class ImageProcessingService {
  private watermarkService: WatermarkService;

  constructor() {
    this.watermarkService = new WatermarkService();
  }

  /**
   * Processes an image with resizing and watermarking
   * @param imageBuffer Input image buffer
   * @param options Processing options
   * @returns ProcessedImageResult with processed image buffer and metadata
   */
  async processImage(
    imageBuffer: Buffer, 
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    console.log('=== IMAGE PROCESSING START ===');
    console.log('Input buffer size:', imageBuffer.length);
    console.log('Processing options:', JSON.stringify(options, null, 2));

    try {
      let imageProcessor = sharp(imageBuffer);
      const metadata = await imageProcessor.metadata();
      
      console.log('Original image metadata:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size
      });

      // Apply resizing if specified
      if (options.resize) {
        imageProcessor = this.applyResizing(imageProcessor, metadata, options.resize);
      }

      // Apply watermark if specified
      if (options.watermark) {
        const processedBuffer = await imageProcessor.toBuffer();
        const watermarkedBuffer = await this.watermarkService.applyWatermark(
          processedBuffer, 
          options.watermark
        );
        imageProcessor = sharp(watermarkedBuffer);
      }

      // Apply final format and quality
      const finalFormat = options.format || 'jpeg';
      const finalQuality = options.quality || 85;

      if (finalFormat === 'jpeg') {
        imageProcessor = imageProcessor.jpeg({ quality: finalQuality, progressive: true });
      } else if (finalFormat === 'png') {
        imageProcessor = imageProcessor.png({ quality: finalQuality, progressive: true });
      } else if (finalFormat === 'webp') {
        imageProcessor = imageProcessor.webp({ quality: finalQuality });
      }

      const resultBuffer = await imageProcessor.toBuffer();
      const finalMetadata = await sharp(resultBuffer).metadata();

      console.log('=== IMAGE PROCESSING COMPLETE ===');
      console.log('Final image metadata:', {
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: finalMetadata.format,
        size: resultBuffer.length
      });

      return {
        buffer: resultBuffer,
        width: finalMetadata.width || 0,
        height: finalMetadata.height || 0,
        format: finalMetadata.format || finalFormat,
        size: resultBuffer.length
      };

    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${error}`);
    }
  }

  /**
   * Resizes image to 4:3 landscape aspect ratio with smart cropping
   */
  private applyResizing(
    imageProcessor: sharp.Sharp, 
    metadata: sharp.Metadata, 
    resizeOptions: ImageProcessingOptions['resize']
  ): sharp.Sharp {
    if (!resizeOptions) return imageProcessor;

    const { aspectRatio, width, height, fit = 'cover', quality = 85 } = resizeOptions;
    
    let targetWidth = width;
    let targetHeight = height;

    // Calculate dimensions based on aspect ratio
    if (aspectRatio === '4:3') {
      if (targetWidth && !targetHeight) {
        targetHeight = Math.round((targetWidth * 3) / 4);
      } else if (targetHeight && !targetWidth) {
        targetWidth = Math.round((targetHeight * 4) / 3);
      } else if (!targetWidth && !targetHeight) {
        // Default to 1200x900 for 4:3 landscape
        targetWidth = 1200;
        targetHeight = 900;
      }
    } else if (aspectRatio === '16:9') {
      if (targetWidth && !targetHeight) {
        targetHeight = Math.round((targetWidth * 9) / 16);
      } else if (targetHeight && !targetWidth) {
        targetWidth = Math.round((targetHeight * 16) / 9);
      } else if (!targetWidth && !targetHeight) {
        targetWidth = 1920;
        targetHeight = 1080;
      }
    } else if (aspectRatio === '1:1') {
      const size = targetWidth || targetHeight || 800;
      targetWidth = targetHeight = size;
    } else if (aspectRatio === 'original') {
      // Keep original dimensions, just apply quality settings
      return imageProcessor;
    }

    console.log('Resizing image:', {
      original: { width: metadata.width, height: metadata.height },
      target: { width: targetWidth, height: targetHeight },
      aspectRatio,
      fit
    });

    return imageProcessor.resize(targetWidth, targetHeight, {
      fit,
      position: 'center',
      withoutEnlargement: false
    });
  }

  /**
   * Convenience method to resize to 4:3 landscape and apply watermark
   */
  async processForPropertyUpload(
    imageBuffer: Buffer,
    watermarkOptions?: WatermarkOptions
  ): Promise<ProcessedImageResult> {
    return this.processImage(imageBuffer, {
      resize: {
        aspectRatio: '4:3',
        width: 1200, // Standard width for property images
        fit: 'cover',
        quality: 85
      },
      watermark: watermarkOptions || {
        position: 'bottom-right',
        opacity: 0.7,
        scale: 0.15
      },
      format: 'jpeg',
      quality: 85
    });
  }

  /**
   * Validates image format and dimensions
   */
  async validateImage(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        return { valid: false, error: 'Invalid image dimensions' };
      }
      
      if (metadata.width < 100 || metadata.height < 100) {
        return { valid: false, error: 'Image too small (minimum 100x100)' };
      }
      
      if (metadata.width > 5000 || metadata.height > 5000) {
        return { valid: false, error: 'Image too large (maximum 5000x5000)' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Image validation failed: ${error}` };
    }
  }
}
