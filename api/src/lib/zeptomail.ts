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
      auth: {
        user: "emailapikey",
        pass: process.env.ZEPTOMAIL_API_KEY || ""
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

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      const apiKey = process.env.ZEPTOMAIL_API_KEY;
      
      if (!apiKey) {
        console.log('ZeptoMail API key not configured, skipping email send');
        return;
      }

      // Try template-based sending first if available, fallback to SMTP
      if (this.templateClient && process.env.ZEPTOMAIL_TEMPLATE_KEY) {
        await this.sendWelcomeEmailWithTemplate(email, name);
      } else {
        await this.sendWelcomeEmailWithSMTP(email, name);
      }
      
    } catch (error) {
      console.error('ZeptoMail error:', error);
      throw error;
    }
  }

  private async sendWelcomeEmailWithSMTP(email: string, name: string): Promise<void> {
    const emailContent = this.generateEmailContent(name);
    
    const mailOptions = {
      from: `"${process.env.ZEPTOMAIL_SENDER_NAME || 'Example Team'}" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: email,
      bcc: process.env.ZEPTOMAIL_BCC_EMAIL || 'hello@lynxbox.ph',
      subject: 'Welcome to Lynxbox PH - Early Access Waiting List',
      html: emailContent.html,
      text: emailContent.text
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log('ZeptoMail SMTP email sent successfully:', info.messageId);
  }

  private async sendWelcomeEmailWithTemplate(email: string, name: string): Promise<void> {
    if (!this.templateClient) {
      throw new Error('Template client not initialized');
    }

    const templateKey = process.env.ZEPTOMAIL_TEMPLATE_KEY;
    if (!templateKey) {
      throw new Error('Template key not configured');
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
        bcc: [
          {
            email_address: {
              address: process.env.ZEPTOMAIL_BCC_EMAIL || 'hello@lynxbox.ph',
              name: 'Lynxbox PH Team'
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
      await this.sendWelcomeEmailWithSMTP(email, name);
    }
  }

  private generateEmailContent(name: string) {
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
}
