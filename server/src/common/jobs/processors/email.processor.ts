import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;
  private readonly smtpConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    super();

    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.smtpConfigured = !!(host && user && pass);

    if (!this.smtpConfigured) {
      this.logger.warn(
        '⚠️  SMTP not configured — emails will be skipped. ' +
        'Set SMTP_HOST, SMTP_USER, SMTP_PASS in your .env to enable email delivery.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get('SMTP_PORT')) || 587,
      secure: false,         // false = STARTTLS (required by Resend)
      requireTLS: true,      // enforce TLS upgrade
      auth: { user, pass },
    });
  }

  async process(job: Job<EmailJob>): Promise<any> {
    const { to, subject, template, data } = job.data;

    if (!this.smtpConfigured) {
      this.logger.warn(
        `Email skipped (SMTP not configured): to=${to}, template=${template}. ` +
        `Configure SMTP credentials in .env to send real emails.`,
      );
      return { success: false, skipped: true, reason: 'smtp_not_configured' };
    }

    this.logger.log(`Sending email to ${to}, template: ${template}`);

    try {
      let html = '';
      const frontend = this.configService.get('FRONTEND_URL') || '';

      if (template === 'verify-email') {
        const verifyLink = `${frontend}/verify-email?token=${encodeURIComponent(data.token)}`;
        html = `
          <p>Hi ${data.firstName ? data.firstName : 'there'},</p>
          <p>Please verify your email by clicking the link below:</p>
          <p><a href="${verifyLink}">Verify your email</a></p>
        `;
      } else if (template === 'reset-password') {
        const resetLink = `${frontend}/reset-password?token=${encodeURIComponent(data.token)}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a56db;">Reset Your Password</h2>
            <p>Hi ${data.firstName ? data.firstName : 'there'},</p>
            <p>We received a request to reset your GRADELLENCE password. Click the button below to set a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}"
                 style="background-color: #1a56db; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${resetLink}</p>
            <p><strong>This link expires in 1 hour.</strong></p>
            <p>If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 12px;">GRADELLENCE School Result Management System</p>
          </div>
        `;
      } else if (template === 'teacher-credentials') {
        const loginUrl = data.loginUrl || frontend;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              <div style="text-align: center; margin-bottom: 28px;">
                <div style="background: #2563EB; border-radius: 12px; width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                  <span style="color: white; font-size: 22px;">🎓</span>
                </div>
                <h1 style="color: #111827; font-size: 22px; margin: 0;">Welcome to Gradellence</h1>
                <p style="color: #6b7280; font-size: 14px; margin: 6px 0 0;">Your teacher account is ready</p>
              </div>

              <p style="color: #374151; font-size: 15px;">Hi ${data.firstName || 'there'},</p>
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Your staff account has been created. Use the credentials below to log in to the school portal.
              </p>

              <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; padding: 6px 0; width: 140px;">Email</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">${data.email}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; padding: 6px 0;">Temporary Password</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600; font-family: monospace; letter-spacing: 1px;">${data.temporaryPassword}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginUrl}"
                   style="background: #2563EB; color: #ffffff; padding: 12px 28px; border-radius: 8px;
                          text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
                  Log In to Dashboard
                </a>
              </div>

              <p style="color: #ef4444; font-size: 13px; background: #fef2f2; border-radius: 6px; padding: 10px 14px;">
                ⚠️ Please change your password immediately after your first login.
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                GRADELLENCE — School Result Management System<br/>
                This is an automated message. Do not reply to this email.
              </p>
            </div>
          </div>
        `;
      } else {
        html = `<p>${subject}</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
      }

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return { success: true, to, template };
    } catch (error) {
      this.logger.error(
        `Email sending failed to ${job.data.to}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
