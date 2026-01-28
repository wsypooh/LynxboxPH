// src/handlers/signup/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { ZeptoMailService } from '../../lib/zeptomail';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface SignupRequest {
  name: string;
  email: string;
  source?: string;
  tags?: string[];
}

export interface SignupRecord {
  timestamp: string;
  name: string;
  email: string;
  source?: string;
  tags?: string[];
}

export class SignupHandler {
  private static s3Client = new S3Client();
  private static bucketName = process.env.S3_BUCKET_NAME;
  private static csvFileName = 'signups/signups.csv';

  static async signup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      let data: SignupRequest;

      // Handle both JSON and form-encoded data
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
      
      if (contentType.includes('application/json')) {
        // Parse JSON data
        data = JSON.parse(event.body);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse form-encoded data
        const params = new URLSearchParams(event.body);
        data = {
          name: params.get('name') || '',
          email: params.get('email') || '',
          source: params.get('source') || undefined,
          tags: params.get('tags') ? JSON.parse(params.get('tags')!) : undefined
        };
      } else {
        return ApiResponse.error('Unsupported content type', 400);
      }

      // Basic validation
      if (!data.name || !data.email) {
        return ApiResponse.error('Name and email are required', 400);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return ApiResponse.error('Invalid email format', 400);
      }

      // Validate name (basic validation)
      if (data.name.trim().length < 2) {
        return ApiResponse.error('Name must be at least 2 characters long', 400);
      }

      // Save signup to S3 CSV
      try {
        await this.saveSignupToCSV(data);
        console.log(`Signup saved to S3: ${data.email}`);
      } catch (s3Error) {
        console.error('Failed to save signup to S3:', s3Error);
        // Continue with email sending even if S3 fails
      }

      // Send welcome email via ZeptoMail
      const zeptoMailService = new ZeptoMailService();
      
      try {
        await zeptoMailService.sendWelcomeEmail(data.email, data.name);
        console.log(`Welcome email sent successfully to ${data.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue with the response even if email fails
        // In production, you might want to implement retry logic or queue the email
      }

      // Log the signup for analytics
      console.log(`New signup: ${data.name} (${data.email}) from source: ${data.source || 'unknown'}`);

      return ApiResponse.success({
        message: 'Successfully signed up for waiting list',
        name: data.name,
        email: data.email
      }, 201);

    } catch (error) {
      console.error('Error processing signup:', error);
      return ApiResponse.error('Failed to process signup', 500);
    }
  }

  private static async saveSignupToCSV(signupData: SignupRequest): Promise<void> {
    const timestamp = new Date().toISOString();
    const signupRecord: SignupRecord = {
      timestamp,
      name: signupData.name,
      email: signupData.email,
      source: signupData.source,
      tags: signupData.tags
    };

    try {
      // Try to get existing CSV file
      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.csvFileName
      });

      const existingFile = await this.s3Client.send(getObjectCommand);
      const existingContent = await this.streamToString(existingFile.Body as Readable);
      
      // Append new record to existing content
      const newLine = this.formatSignupAsCSV(signupRecord);
      const updatedContent = existingContent + newLine;

      // Save updated content back to S3
      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.csvFileName,
        Body: updatedContent,
        ContentType: 'text/csv',
        CacheControl: 'no-cache'
      });

      await this.s3Client.send(putObjectCommand);
      
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        // File doesn't exist, create new one with headers
        const headers = 'timestamp,name,email,source,tags\n';
        const newLine = this.formatSignupAsCSV(signupRecord);
        const content = headers + newLine;

        const putObjectCommand = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: this.csvFileName,
          Body: content,
          ContentType: 'text/csv',
          CacheControl: 'no-cache'
        });

        await this.s3Client.send(putObjectCommand);
      } else {
        throw error;
      }
    }
  }

  private static formatSignupAsCSV(record: SignupRecord): string {
    const escapeCSV = (field: any): string => {
      if (field === null || field === undefined) return '';
      const stringField = typeof field === 'string' ? field : JSON.stringify(field);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    return [
      escapeCSV(record.timestamp),
      escapeCSV(record.name),
      escapeCSV(record.email),
      escapeCSV(record.source),
      escapeCSV(record.tags)
    ].join(',') + '\n';
  }

  private static async streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }
}
