import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
dotenv.config();

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly defaultFromEmail: string;
  private readonly defaultReplyTo: string;
  private readonly transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Get default sender configuration
    this.defaultFromEmail = this.configService.get('MAIL_FROM_ADDRESS') || 'noreply@yourdomain.com';
    this.defaultReplyTo = this.configService.get('MAIL_REPLY_TO') || 'your.email@gmail.com';

    // Get Gmail SMTP configuration
    const gmailUser = this.configService.get('GMAIL_USER');
    const gmailPassword = this.configService.get('GMAIL_PASSWORD'); // App Password

    if (!gmailUser || !gmailPassword) {
      throw new Error('Gmail credentials not found. Please check your GMAIL_USER and GMAIL_PASSWORD environment variables.');
    }

    // Create transporter with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      auth: {
        user: gmailUser,
        pass: gmailPassword, // Use App Password, not regular password
      },
      port: 587,
      secure: false, // true for 465, false for other ports
      tls: {
        rejectUnauthorized: false, // allow self-signed / untrusted certs
      },
    });

    this.logger.log('Initializing Nodemailer with Gmail SMTP for email sending');

    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Gmail SMTP connection verified successfully');
    } catch (error:any) {
      this.logger.error('Failed to verify Gmail SMTP connection:', error.message);
      throw error;
    }
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    const { to, subject, html, from = this.defaultFromEmail, text, replyTo = this.defaultReplyTo } = options;

    try {
      // Prepare the message for Nodemailer
      const mailOptions: nodemailer.SendMailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: html,
        text: text,
        replyTo: replyTo,
      };

      // Send the email
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully via Gmail SMTP. Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email via Gmail SMTP: ${error.message}`, error.stack);

      // Log additional error details if available
      if (error.response) {
        this.logger.error('SMTP error details:', error.response);
      }

      return false;
    }
  }

  /**
   * Generate a standardized email template
   */
  private generateEmailTemplate(title: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 15px;
        }
        .content {
          padding: 30px 20px;
        }
        .otp-code {
          display: inline-block;
          padding: 15px 25px;
          background-color: #f8f9fa;
          border: 2px dashed #007bff;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          letter-spacing: 3px;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .center {
          text-align: center;
        }
        .warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 12px;
          margin: 15px 0;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>If you did not request this email, please ignore it.</p>
          <p>© ${new Date().getFullYear()} Markets Map. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generatePasswordResetTemplate(title: string, content: string, buttonText: string, buttonUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .center {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
          <div class="center">
            <a href="${buttonUrl}" class="button" target="_blank">${buttonText}</a>
          </div>
        </div>
        <div class="footer">
          <p>If you did not request this email, please ignore it.</p>
          <p>© ${new Date().getFullYear()} Markets Map. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  async sendOTPEmail(email: string, otp: string): Promise<boolean> {
    const content = `
      <p>Thanks for signing up with Markets Map! Please use the following OTP to verify your email address.</p>
      <div class="center">
        <div class="otp-code">${otp}</div>
      </div>
      <div class="warning">
        <strong>Important:</strong> This OTP is valid for 5 minutes only. Do not share this code with anyone.
      </div>
      <p>Enter this code in the verification form to complete your registration.</p>
    `;

    const html = this.generateEmailTemplate('Email Verification - OTP', content);

    return this.sendMail({
      to: email,
      subject: 'Email Verification OTP - Markets Map',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const clientUrl = this.configService.get('CLIENT_URL') || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;

    const content = `
      <p>We received a request to reset your password for your Markets Map account.</p>
      <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
    `;

    const html = this.generatePasswordResetTemplate(
      'Reset Your Password',
      content,
      'Reset Password',
      resetUrl
    );

    return this.sendMail({
      to: email,
      subject: 'Password Reset Request - Markets Map',
      html,
    });
  }


  async sendBulkMail(emails: string[], subject: string, html: string, text?: string): Promise<boolean> {
    try {
      // Gmail has sending limits, so we'll send them individually
      // For production, consider using a queue system for large volumes
      const promises = emails.map(email => {
        const mailOptions: nodemailer.SendMailOptions = {
          from: this.defaultFromEmail,
          to: email,
          subject: subject,
          html: html,
          text: text,
          replyTo: this.defaultReplyTo,
        };

        return this.transporter.sendMail(mailOptions);
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      this.logger.log(`Bulk emails sent via Gmail SMTP. Successful: ${successful}, Failed: ${failed}`);

      // Log failed emails for debugging
      if (failed > 0) {
        const failedResults = results
          .filter((result, index) => result.status === 'rejected')
          .map((result, index) => ({
            email: emails[index],
            error: (result).reason
          }));

        this.logger.warn('Failed bulk email sends:', failedResults);
      }

      return failed === 0;
    } catch (error) {
      this.logger.error(`Error sending bulk emails via Gmail SMTP: ${error.message}`, error.stack);
      return false;
    }
  }

  async close(): Promise<void> {
   await  this.transporter.close();
    this.logger.log('Gmail SMTP connection closed');
  }
}