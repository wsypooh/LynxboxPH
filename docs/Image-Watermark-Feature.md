# Image Watermark Feature

This document explains the watermark functionality that has been integrated into the ListSpace PH image upload system.

## Overview

All property images uploaded through the API will automatically be resized to 4:3 landscape aspect ratio and have a watermark applied to them. This ensures consistent image dimensions across the platform while protecting property images and providing brand visibility.

## Features

- **Automatic Watermarking**: Property images are watermarked automatically during upload
- **4:3 Horizontal Resizing**: All property images are automatically resized to 4:3 landscape aspect ratio (1200x900 default)
- **Smart Image Processing**: Intelligent cropping and resizing to maintain image quality
- **Configurable Options**: Position, opacity, size, and margin can be customized
- **Environment-based Configuration**: Easy to enable/disable and configure via environment variables
- **Graceful Fallback**: If processing fails, the original image is still uploaded
- **Performance Optimized**: Resizing and watermarking happen server-side before S3 upload

## Configuration

### Environment Variables

Add these to your `.env` file or AWS Lambda environment:

```bash
# Enable/disable watermark (default: true)
WATERMARK_ENABLED=true

# Watermark position (default: bottom-right)
# Options: top-left, top-right, bottom-left, bottom-right, center
WATERMARK_POSITION=bottom-right

# Watermark opacity (default: 0.7)
# Range: 0.0 to 1.0
WATERMARK_OPACITY=0.7

# Watermark scale relative to image width (default: 0.15)
# 0.15 = 15% of image width
WATERMARK_SCALE=0.15

# Watermark margin in pixels (default: 20)
WATERMARK_MARGIN=20
```

### Default Configuration

If no environment variables are set, the system uses these defaults:

- **Position**: Bottom-right corner
- **Opacity**: 70% transparent
- **Scale**: 15% of image width
- **Margin**: 20 pixels from edges

## Watermark Design

The current watermark is a text-based logo featuring:
- **listspace.ph** URL in gray
- White semi-transparent background
- Rounded corners

## 4:3 Landscape Resizing

### Resizing Specifications

All property images are automatically resized to maintain consistency across the platform:

- **Aspect Ratio**: 4:3 landscape (horizontal)
- **Default Dimensions**: 1200x900 pixels
- **Resize Method**: Smart cropping with 'cover' fit
- **Quality**: 85% JPEG compression
- **Position**: Center-focused cropping

### Supported Aspect Ratios

The image processing service supports multiple aspect ratios:

- **4:3**: Default for property images (1200x900)
- **16:9**: Widescreen format (1920x1080)
- **1:1**: Square format (800x800)
- **Original**: Maintains original dimensions

### Smart Cropping

- Uses Sharp's 'cover' fit for intelligent cropping
- Maintains image quality while fitting target dimensions
- Center-focused positioning to preserve important content
- Prevents image distortion by maintaining aspect ratio

## Implementation Details

### Files Modified/Created

1. **`/api/src/lib/watermark.ts`** - Watermark service implementation
2. **`/api/src/lib/imageProcessing.ts`** - Image processing service with 4:3 resizing
3. **`/api/src/lib/s3.ts`** - Updated S3 service with image processing and watermark integration
4. **`/api/src/config/watermark.ts`** - Configuration management
5. **`/api/src/handlers/properties/handler.ts`** - Updated property handlers
6. **`/api/package.json`** - Added Sharp dependency

### How It Works

1. **Upload Request**: Client uploads image via API
2. **Validation**: Image is validated (type, size, dimensions, etc.)
3. **4:3 Resizing**: Image is resized to 4:3 landscape aspect ratio (1200x900 default) with smart cropping
4. **Watermark Application**: Watermark is applied using Sharp library
5. **S3 Upload**: Processed image is uploaded to S3
6. **Metadata**: Processing status and dimensions are stored in S3 object metadata

### Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

## API Integration

The image processing (4:3 resizing + watermark) is automatically applied to images uploaded through:

- **Property Creation**: `POST /api/properties`
- **Property Update**: `PUT /api/properties/{id}`
- **Direct Image Upload**: `POST /api/properties/{id}/images`

### Image Processing Pipeline

All property images go through the `processForPropertyUpload()` method which:

1. **Resizes** to 4:3 landscape (1200x900 default)
2. **Applies watermark** with configured options
3. **Optimizes** for web (JPEG, 85% quality)
4. **Validates** image dimensions and quality

## Custom Watermark

To use a custom logo instead of the text-based watermark:

1. Update the `WatermarkService.createTextWatermark()` method
2. Or load your logo from S3/local file
3. Ensure it has transparent background for best results

## Performance Considerations

- **Processing Time**: Adds ~200-800ms per image depending on size and processing steps
- **Memory Usage**: Temporary increase during resizing and watermarking
- **File Size**: Processed images are optimized for web (typically smaller than originals)
- **Benefits**: 
  - Consistent image dimensions across the platform
  - No client-side processing required
  - Better user experience with uniform image sizes
  - Reduced storage costs due to optimization

## Troubleshooting

### Common Issues

1. **Processing Failed**
   - Check `WATERMARK_ENABLED` environment variable
   - Verify Sharp library is installed
   - Check logs for image processing errors
   - Ensure image dimensions are within limits (100x100 to 5000x5000)

2. **Image Not Resized to 4:3**
   - Verify the image is being uploaded through property endpoints
   - Check that `processForPropertyUpload()` method is being called
   - Ensure image format is supported (JPEG, PNG, WebP)

3. **Memory Issues**
   - Large images may cause memory spikes during processing
   - Consider implementing image size limits
   - Monitor Lambda memory usage

4. **Performance Impact**
   - Monitor API response times
   - Consider async processing for bulk uploads
   - Implement caching if needed


## Future Enhancements

- **Custom Logo Upload**: Allow users to upload custom watermarks
- **Multiple Aspect Ratios**: Support for different aspect ratios per property type
- **Advanced Resizing Options**: Configurable dimensions and cropping strategies
- **Multiple Watermarks**: Support for different watermarks per property type
- **Animated Watermarks**: Support for GIF watermarks
- **Batch Processing**: Queue-based processing for bulk uploads
- **Watermark Templates**: Predefined watermark styles
- **Image Quality Settings**: Per-property-type quality optimization

## Security

- Image processing and watermarking happen server-side
- Original images are not stored without processing
- No sensitive information in processing metadata
- Input validation prevents malicious uploads
- Image dimension limits prevent processing abuse
- Memory usage monitoring prevents DoS attacks
