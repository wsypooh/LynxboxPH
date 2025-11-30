import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadImageResult {
  url: string;
  key: string;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
    });
    // Use the correct bucket name for images
    this.bucketName = 'listspace-ph-images-dev-ap-southeast-1';
  }

  async uploadImage(file: Buffer, fileName: string, contentType: string): Promise<UploadImageResult> {
    const fileExtension = fileName.split('.').pop();
    const key = `properties/images/${uuidv4()}.${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

      return {
        url,
        key,
      };
    } catch (error) {
      console.error('Error uploading image to S3:', error);
      throw new Error('Failed to upload image to S3');
    }
  }

  async deleteImage(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      throw new Error('Failed to delete image from S3');
    }
  }

  async getPresignedUploadUrl(fileName: string, contentType: string): Promise<{ url: string; key: string }> {
    const fileExtension = fileName.split('.').pop();
    const key = `properties/images/${uuidv4()}.${fileExtension}`;

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

  async getPresignedViewUrl(key: string): Promise<{ url: string }> {
    try {
      // Return public URL since bucket is now public
      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;
      return { url };
    } catch (error) {
      console.error('Error generating public view URL:', error);
      throw new Error('Failed to generate public view URL');
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
}
