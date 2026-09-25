// src/lib/zeptomail.ts
import * as nodemailer from 'nodemailer';
import { SendMailClient } from "zeptomail";

export class ZeptoMailService {
  private transporter: nodemailer.Transporter;
  private templateClient: SendMailClient | null = null;

  constructor() {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY || '';
    console.log(`ZeptoMailService init: SMTP key present=${!!smtpKey}, sender=${process.env.ZEPTOMAIL_SENDER_EMAIL || '(default)'}`);

    this.transporter = nodemailer.createTransport({
      host: "smtp.zeptomail.com",
      port: 587,
      secure: false,
      auth: {
        user: "emailapikey",
        pass: smtpKey
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

  async sendInvoiceEmail(invoice: any, pdfBuffer: Buffer): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) {
      console.log('ZeptoMail not configured, skipping invoice email');
      return;
    }
    if (!invoice.contactEmail) {
      console.log('No contact email for tenant, skipping invoice email');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0e2949; color: white; padding: 25px 30px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .amount { background-color: #0e2949; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>${invoice.buildingName}</strong><br>
          <small>${invoice.buildingAddress} | Tel: ${invoice.buildingPhone}</small>
        </div>
        <div class="content">
          <p>Dear <strong>${invoice.lesseeName}</strong>,</p>
          <p>Please find attached your <strong>Statement of Account</strong> for:</p>
          <div class="amount">
            ${invoice.billingLabel}<br>
            <strong>Total Due: &#8369;${invoice.totalDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
          </div>
          <p>Invoice Number: <strong>${invoice.invoiceNumber}</strong></p>
          <p>Please refer to the attached PDF for the full breakdown of charges.</p>
          <p>If you have any questions, please contact your building administrator at <strong>${invoice.buildingPhone}</strong>.</p>
        </div>
        <div class="footer">
          <p>${invoice.buildingName} &mdash; Property Management</p>
        </div>
      </body>
      </html>
    `;

    const contactEmail = invoice.contactEmail;
    await this.transporter.sendMail({
      from: `"${invoice.buildingName}" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: contactEmail,
      subject: `Statement of Account - ${invoice.billingLabel} | ${invoice.invoiceNumber}`,
      html,
      attachments: [{
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });
    console.log(`Invoice email sent to ${contactEmail} for ${invoice.invoiceNumber}`);
  }

  async sendAccountInviteEmail(params: {
    toEmail: string;
    inviterEmail: string;
    role: string;
    temporaryPassword: string;
    signInUrl: string;
  }): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) {
      console.log('ZeptoMail not configured, skipping account invite email');
      return;
    }

    const { toEmail, inviterEmail, role, temporaryPassword, signInUrl } = params;
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0e2949; color: white; padding: 25px 30px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background-color: white; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px 20px; margin: 20px 0; font-family: monospace; }
          .button { display: inline-block; background-color: #0e2949; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>You've been invited to Lynxbox PH</strong>
        </div>
        <div class="content">
          <p><strong>${inviterEmail}</strong> has invited you to join their account as a <strong>${roleLabel}</strong>.</p>
          <p>Use these temporary credentials to sign in — you'll be asked to set your own password on first login:</p>
          <div class="credentials">
            Email: ${toEmail}<br>
            Temporary password: ${temporaryPassword}
          </div>
          <a class="button" href="${signInUrl}">Sign in to Lynxbox PH</a>
        </div>
        <div class="footer">
          <p>Lynxbox PH &mdash; Property Management</p>
        </div>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: `You've been invited to Lynxbox PH as a ${roleLabel}`,
      html,
    });
    console.log(`Account invite email sent to ${toEmail}`);
  }

  // docs/Payments-and-Subscription-Plan.md — subscription lifecycle emails. Same
  // inline-HTML-via-SMTP style as the methods above, no template needed for these.
  private wrapSimpleEmail(heading: string, bodyHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0e2949; color: white; padding: 25px 30px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #0e2949; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header"><strong>${heading}</strong></div>
        <div class="content">${bodyHtml}</div>
        <div class="footer"><p>Lynxbox PH &mdash; Property Management</p></div>
      </body>
      </html>
    `;
  }

  async sendTrialEndingSoonEmail(toEmail: string, plan: string, daysLeft: number): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) return;

    const html = this.wrapSimpleEmail(
      'Your Lynxbox PH trial is ending soon',
      `<p>Your ${daysLeft}-day trial of the <strong>${plan}</strong> plan ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.</p>
       <p>Submit your payment before then to keep your current plan — otherwise your account will automatically move to the Free plan.</p>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/billing">Manage Billing</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: `Your Lynxbox PH trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      html,
    });
  }

  // docs/Payments-and-Subscription-Plan.md — gives active (non-trial) subscribers a
  // heads-up before their period ends, so they have a reason to use early/stacked
  // renewal instead of only ever finding out via the after-the-fact past-due email.
  async sendRenewalDueSoonEmail(toEmail: string, plan: string, daysLeft: number, periodEnd: string): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) return;

    const formattedDate = new Date(periodEnd).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = this.wrapSimpleEmail(
      'Your Lynxbox PH plan renews soon',
      `<p>Your <strong>${plan}</strong> plan renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}, on <strong>${formattedDate}</strong>.</p>
       <p>You can submit your renewal payment anytime before then — paying early extends your current period rather than replacing it, so you won't lose any paid days.</p>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/billing">Submit Payment</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: `Your Lynxbox PH plan renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      html,
    });
  }

  // `reason` distinguishes an automatic lapse (cron: trial expired, or 14 days past due
  // with no payment) from a customer's own voluntary downgrade — the two need different
  // opening lines ("since we didn't receive a payment" is wrong/alarming for someone who
  // just chose to switch plans themselves).
  async sendDowngradedToFreeEmail(toEmail: string, reason: 'lapsed' | 'voluntary' = 'lapsed'): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) return;

    const openingLine = reason === 'voluntary'
      ? `<p>As requested, your account has been moved to the <strong>Free</strong> plan.</p>`
      : `<p>Since we didn't receive a payment, your account has been moved to the <strong>Free</strong> plan.</p>`;

    const html = this.wrapSimpleEmail(
      'Your Lynxbox PH account moved to the Free plan',
      `${openingLine}
       <p>Your data is safe — nothing was deleted. Some property listings beyond the Free plan's limit have been temporarily unlisted, and you can pick which ones to re-list if you upgrade again.</p>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/billing">View Plans</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: 'Your Lynxbox PH account moved to the Free plan',
      html,
    });
  }

  async sendPaymentPastDueEmail(toEmail: string, plan: string): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) return;

    const html = this.wrapSimpleEmail(
      'Payment due on your Lynxbox PH account',
      `<p>Your payment for the <strong>${plan}</strong> plan is now due. Your account has limited access until payment is verified — new invoices and property listings can't be created, and your active listings are temporarily hidden from public search.</p>
       <p>Submit your payment within 14 days to avoid being moved to the Free plan.</p>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/billing">Submit Payment</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: 'Payment due on your Lynxbox PH account',
      html,
    });
  }

  async sendPaymentVerifiedEmail(toEmail: string, plan: string, periodEnd: string): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) return;

    const formattedDate = new Date(periodEnd).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = this.wrapSimpleEmail(
      'Your Lynxbox PH payment was verified',
      `<p>Your payment has been verified and your <strong>${plan}</strong> plan is now active until <strong>${formattedDate}</strong>.</p>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/billing">View Billing</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: 'Your Lynxbox PH payment was verified',
      html,
    });
  }

  async sendPaymentRejectedEmail(toEmail: string, reason: string): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) return;

    const html = this.wrapSimpleEmail(
      'Your Lynxbox PH payment submission needs attention',
      `<p>We couldn't verify your recent payment submission:</p>
       <p style="font-style: italic;">"${reason}"</p>
       <p>Please review and resubmit with corrected details.</p>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/billing">Resubmit Payment</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: toEmail,
      subject: 'Your Lynxbox PH payment submission needs attention',
      html,
    });
  }

  // Contact Us / Support page — one-way notification to the internal support inbox, no
  // confirmation email back to the submitter (matches the plain "send an email" scope
  // this was built for; add sendContactFormConfirmationEmail later if that's ever needed).
  async sendContactFormEmail(data: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): Promise<void> {
    const smtpKey = process.env.ZEPTOMAIL_SMTP_KEY || process.env.ZEPTOMAIL_API_KEY;
    if (!smtpKey) {
      console.log('ZeptoMail not configured, skipping contact form email');
      return;
    }

    const subjectLabel = data.subject?.trim() || 'General Inquiry';
    const html = this.wrapSimpleEmail(
      `New Contact Form Submission: ${subjectLabel}`,
      `<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
         <tr><td style="padding: 8px; font-weight: 600;">Name</td><td style="padding: 8px;">${data.name}</td></tr>
         <tr><td style="padding: 8px; font-weight: 600;">Email</td><td style="padding: 8px;">${data.email}</td></tr>
         <tr><td style="padding: 8px; font-weight: 600;">Subject</td><td style="padding: 8px;">${subjectLabel}</td></tr>
       </table>
       <p style="margin-top: 16px; font-weight: 600;">Message</p>
       <p style="white-space: pre-wrap;">${data.message}</p>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: process.env.ZEPTOMAIL_INTERNAL_EMAIL || 'wsypooh@gmail.com',
      replyTo: data.email,
      subject: `Contact Form: ${subjectLabel} — ${data.name}`,
      html,
    });
    console.log(`Contact form email sent for ${data.email}`);
  }

  async sendNewPaymentSubmissionAdminNotification(data: {
    accountId: string;
    accountEmail: string | null;
    plan: string;
    billingCycle: string;
    amountClaimed: number;
    method: string;
  }): Promise<void> {
    const apiKey = process.env.ZEPTOMAIL_API_KEY;
    if (!apiKey) return;

    const html = this.wrapSimpleEmail(
      'New payment submission awaiting verification',
      `<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
         <tr><td style="padding: 8px; font-weight: 600;">Account</td><td style="padding: 8px;">${data.accountEmail || data.accountId}</td></tr>
         <tr><td style="padding: 8px; font-weight: 600;">Requested plan</td><td style="padding: 8px;">${data.plan} (${data.billingCycle})</td></tr>
         <tr><td style="padding: 8px; font-weight: 600;">Method</td><td style="padding: 8px;">${data.method}</td></tr>
         <tr><td style="padding: 8px; font-weight: 600;">Amount claimed</td><td style="padding: 8px;">&#8369;${data.amountClaimed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
       </table>
       <a class="button" href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/platform-admin/payments">Review Submission</a>`
    );

    await this.transporter.sendMail({
      from: `"Lynxbox PH" <${process.env.ZEPTOMAIL_SENDER_EMAIL || 'noreply@lynxbox.ph'}>`,
      to: process.env.ZEPTOMAIL_INTERNAL_EMAIL || 'wsypooh@gmail.com',
      subject: `New payment submission — ${data.accountEmail || data.accountId}`,
      html,
    });
  }
}
