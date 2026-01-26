import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsCommand, DeleteObjectsCommand, GetObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { parseUrl } from '@aws-sdk/url-parser';
import { formatUrl } from '@aws-sdk/util-format-url';
import { v4 as uuidv4 } from 'uuid';
import { ImageProcessingService } from './imageProcessing';
import { WatermarkOptions } from './watermark';

export interface UploadResult {
  url: string;
  key: string;
  contentType: string;
  size: number;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private imageProcessor: ImageProcessingService;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'lynxbox-ph-objects-dev-ap-southeast-1';
    this.imageProcessor = new ImageProcessingService();
  }

  /**
   * Uploads a file to S3
   * @param file File buffer to upload
   * @param fileName Original file name
   * @param contentType MIME type of the file
   * @param options Additional upload options
   * @returns UploadResult with URL, key, and metadata
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    options: {
      propertyId?: string;
      folder?: string;
      prefix?: string;
      acl?: ObjectCannedACL;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<UploadResult> {
    const { propertyId, folder = 'files', prefix = '', acl = 'private', metadata = {} } = options;
    
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const propertyFolder = propertyId ? `properties/${propertyId}` : 'common';
    const key = `${propertyFolder}/${folder}${prefix ? `/${prefix}` : ''}/${uuidv4()}${fileExtension ? `.${fileExtension}` : ''}`;
    

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        ACL: acl,
        Metadata: metadata,
        ContentLength: file.length,
      });

      await this.s3Client.send(command);
      
      // Return only the S3 key, not a URL
      return { 
        url: '', // Empty URL - we'll generate signed URLs on demand
        key, 
        contentType,
        size: file.length 
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * Uploads an image file with additional image-specific handling
   * This is a convenience method that wraps uploadFile with image-specific defaults
   */
  async getSignedUrl(key: string, operation: 'getObject' | 'putObject' = 'getObject', expiresIn: number = 3600): Promise<string> {
    try {
      let command;
      
      if (operation === 'getObject') {
        command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
      } else {
        command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
      }

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error(`Error generating signed URL for ${operation}:`, error);
      throw new Error(`Failed to generate signed URL for ${operation}`);
    }
  }

  async deleteImage(key: string): Promise<void> {
    
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    try {
      await this.s3Client.send(command);
    } catch (error) {
      throw error;
    }
  }

  async uploadImage(
    file: Buffer,
    fileName: string,
    contentType: string,
    propertyId?: string,
    watermarkOptions?: WatermarkOptions,
    skipProcessing: boolean = false
  ): Promise<UploadResult> {
    let processedFile = file;
    let finalContentType = contentType;

    // Process image if it's a supported format and processing is not skipped
    if (!skipProcessing && this.isImageContentType(contentType)) {
      try {
        
        // Validate image first
        const validation = await this.imageProcessor.validateImage(file);
        if (!validation.valid) {
          throw new Error(`Invalid image: ${validation.error}`);
        }

        // Process image with 4:3 resize and watermark
        const processedResult = await this.imageProcessor.processForPropertyUpload(
          file, 
          watermarkOptions
        );
        
        processedFile = processedResult.buffer;
        finalContentType = `image/${processedResult.format}`;
        
      } catch (error) {
        throw new Error(`Image processing failed: ${error}`);
      }
    }

    const result = await this.uploadFile(processedFile, fileName, finalContentType, {
      propertyId,
      folder: 'images',
      metadata: {
        'upload-type': 'image',
        'original-filename': fileName,
        'processed': (!skipProcessing && this.isImageContentType(contentType)).toString(),
        'original-size': file.length.toString(),
        'final-size': processedFile.length.toString()
      }
    });

    return result;
  }

  async deletePropertyImages(propertyId: string): Promise<void> {
    
    const prefix = `properties/${propertyId}/images/`;
    
    try {
      // List all objects in the property folder
      const listCommand = new ListObjectsCommand({
        Bucket: this.bucketName,
        Prefix: prefix
      });
      
      const listResult = await this.s3Client.send(listCommand);
      const objects = listResult.Contents || [];
      
      if (objects.length === 0) {
        return;
      }
      
      // Delete all objects
      const deleteKeys = objects.map(obj => ({ Key: obj.Key! }));
      
      if (deleteKeys.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: deleteKeys
          }
        });
        
        const deleteResult = await this.s3Client.send(deleteCommand);
        
        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.error(`Errors deleting images:`, deleteResult.Errors);
        }
      }
      
    } catch (error) {
      console.error(`Error deleting images for property ${propertyId}:`, error);
      throw new Error(`Failed to delete images for property ${propertyId}`);
    }
  }

  /**
   * Deletes an object from S3
   * @param key The S3 object key to delete
   * @returns Promise that resolves when the object is deleted
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting object from S3:', error);
      throw new Error('Failed to delete image from S3');
    }
  }

  async getPresignedUploadUrl(fileName: string, contentType: string, propertyId?: string): Promise<{ url: string; key: string }> {
    const fileExtension = fileName.split('.').pop();
    const propertyFolder = propertyId ? `properties/${propertyId}` : 'properties';
    const key = `${propertyFolder}/images/${uuidv4()}.${fileExtension}`;
    

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      return { url, key };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned upload URL');
    }
  }

  async getPresignedViewUrl(key: string, expiresIn: number = 3600): Promise<{ url: string }> {
    try {
      const url = await this.getSignedUrl(key, 'getObject', expiresIn);
      return { url };
    } catch (error) {
      console.error('Error generating presigned view URL:', error);
      throw new Error('Failed to generate presigned view URL');
    }
  }

  validateImageFile(fileName: string, contentType: string, size: number): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(contentType)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    if (size > maxSize) {
      throw new Error(`File size too large. Maximum size: 5MB`);
    }
  }

  /**
   * Helper method to check if content type is a supported image format
   */
  private isImageContentType(contentType: string): boolean {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return supportedTypes.includes(contentType);
  }
}
