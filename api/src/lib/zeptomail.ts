// src/lib/zeptomail.ts
import * as nodemailer from 'nodemailer';
import { SendMailClient } from "zeptomail";

export class ZeptoMailService {
  private transporter: nodemailer.Transporter;
  private templateClient: SendMailClient | null = null;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.zeptomail.com",
      port: 587,
      secure: false,
      auth: {
        user: "emailapikey",
        pass: process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY || ""
      }
    });

    // Initialize template client if template API key is provided
    const templateToken = process.env.ZEPTOMAIL_TEMPLATE_API_KEY;
    if (templateToken) {
      this.templateClient = new SendMailClient({
        url: "https://api.zeptomail.com/v1.1/email/template",
        token: templateToken
      });
    }
  }

  async sendWelcomeEmail(email: string, name: string, source?: string): Promise<void> {
    try {
      const apiKey = process.env.ZEPTOMAIL_API_KEY;
      
      if (!apiKey) {
        console.log('ZeptoMail API key not configured, skipping email send');
        return;
      }

      // Try template-based sending first if available, fallback to SMTP
      if (this.templateClient) {
        await this.sendWelcomeEmailWithTemplate(email, name, source);
      } else {
        await this.sendWelcomeEmailWithSMTP(email, name, source);
      }
      
    } catch (error) {
      console.error('ZeptoMail error:', error);
      throw error;
    }
  }

  private async sendWelcomeEmailWithSMTP(email: string, name: string, source?: string): Promise<void> {
    const emailContent = this.generateEmailContent(name, source);
    
    const mailOptions = {
      from: `"${process.env.ZEPTOMAIL_SENDER_NAME || 'Example Team'}" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: email,
      // commented this out to avoid sending BCC emails for every user, but you can uncomment it if you want to receive a copy of every email sent
      // bcc: process.env.ZEPTOMAIL_BCC_EMAIL || 'hello@lynxbox.ph',
      subject: 'Welcome to Lynxbox PH - Early Access Waiting List',
      html: emailContent.html,
      text: emailContent.text
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log('ZeptoMail SMTP email sent successfully:', info.messageId);
  }

  private async sendWelcomeEmailWithTemplate(email: string, name: string, source?: string): Promise<void> {
    if (!this.templateClient) {
      throw new Error('Template client not initialized');
    }

    // Get template key based on source using JSON mapping
    const templateMapping = process.env.ZEPTOMAIL_TEMPLATE_MAPPING;
    let templateKey: string;
    
    if (templateMapping) {
      try {
        const mapping = JSON.parse(templateMapping);
        templateKey = mapping[source || 'default'] || mapping['default'] || '';
      } catch (error) {
        console.error('Failed to parse ZEPTOMAIL_TEMPLATE_MAPPING:', error);
        templateKey = '';
      }
    } else {
      // Fallback to legacy single template key
      templateKey = process.env.ZEPTOMAIL_TEMPLATE_KEY || '';
    }

    if (!templateKey) {
      console.log(`Template key not configured for source: ${source}, falling back to SMTP`);
      await this.sendWelcomeEmailWithSMTP(email, name, source);
      return;
    }

    try {
      const resp = await this.templateClient.sendMailWithTemplate({
        template_key: templateKey,
        from: {
          address: process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph',
          name: process.env.ZEPTOMAIL_SENDER_NAME || 'Lynxbox PH'
        },
        to: [
          {
            email_address: {
              address: email,
              name: name
            }
          }
        ],
        merge_info: {
          name: name,
          email: email
        }
      });
      
      console.log('ZeptoMail template email sent successfully:', resp);
    } catch (error) {
      console.error('ZeptoMail template error:', error);
      // Fallback to SMTP if template fails
      console.log('Falling back to SMTP sending...');
      await this.sendWelcomeEmailWithSMTP(email, name, source);
    }
  }

  private generateEmailContent(name: string, source?: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Lynxbox PH</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0e2949; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .highlight { background-color: #4c5a6b; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏢 Lynxbox PH</div>
          <h1>Welcome to the Future of Property Management!</h1>
        </div>
        
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          
          <p>Thank you for joining our waiting list! We're excited to have you as an early adopter of Lynxbox PH, the premier digital listing and rental management platform for small commercial property owners in the Philippines.</p>
          
          <div class="highlight">
            <strong>🎉 You're on the list!</strong><br>
            You'll be among the first to know when we launch and get exclusive early access.
          </div>
          
          <h3>What to Expect:</h3>
          <ul>
            <li>📧 Regular updates on our development progress</li>
            <li>🚀 Early access to the platform before public launch</li>
            <li>💰 Special early-bird pricing and offers</li>
            <li>🎯 Priority support as a founding member</li>
          </ul>
          
          <p>Best regards,<br>The Lynxbox PH Team</p>
        </div>
        
        <div class="footer">
          <p>© 2024 Lynxbox PH. All rights reserved.</p>
          <p>Helping Small Commercial Landlords Go Digital</p>
        </div>
      </body>
      </html>
    `;

    const text = `Welcome to Lynxbox PH, ${name}!

Thank you for joining our waiting list! You'll be among the first to know when we launch and get exclusive early access.

What to Expect:
📧 Regular updates on our development progress
🚀 Early access to the platform before public launch
💰 Special early-bird pricing and offers
🎯 Priority support as a founding member

Best regards,
The Lynxbox PH Team
© 2024 Lynxbox PH. All rights reserved.
Helping Small Commercial Landlords Go Digital`;

    return { html, text };
  }

  async sendInternalNotification(data: {
    name: string;
    email: string;
    source?: string;
    tags?: string[];
  }): Promise<void> {
    const apiKey = process.env.ZEPTOMAIL_API_KEY;
    if (!apiKey) return;

    const phone = data.tags?.find(t => t.startsWith('phone:'))?.replace('phone:', '') || '—';
    const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    const sourceLabel = data.source || 'unknown';
    const subjectLabel = sourceLabel.charAt(0).toUpperCase() + sourceLabel.slice(1).replace(/-/g, ' ');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0e2949; color: white; padding: 20px 30px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          td:first-child { font-weight: 600; color: #0e2949; width: 140px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>🔔 New Signup — ${subjectLabel}</strong>
        </div>
        <div class="content">
          <p>A new signup was submitted on <strong>${timestamp}</strong>.</p>
          <table>
            <tr><td>Name</td><td>${data.name}</td></tr>
            <tr><td>Email</td><td>${data.email}</td></tr>
            <tr><td>Contact Number</td><td>${phone}</td></tr>
            <tr><td>Source</td><td>${sourceLabel}</td></tr>
            <tr><td>Tags</td><td>${data.tags?.join(', ') || '—'}</td></tr>
          </table>
        </div>
        <div class="footer">Lynxbox PH Internal Notification</div>
      </body>
      </html>
    `;

    console.log(`Sending internal notification to ${process.env.ZEPTOMAIL_INTERNAL_EMAIL || 'wsypooh@gmail.com'} for ${data.email}`);
    const info = await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: process.env.ZEPTOMAIL_INTERNAL_EMAIL || 'wsypooh@gmail.com',
      subject: `New Signup: ${subjectLabel} — ${data.name}`,
      html
    });
    console.log(`Internal notification sent for ${sourceLabel} signup from ${data.email}:`, info.messageId);
  }
}
