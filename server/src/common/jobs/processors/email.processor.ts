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

  constructor(private readonly configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')) || 587,
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async process(job: Job<EmailJob>): Promise<any> {
    const { to, subject, template, data } = job.data;

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
          <p>Hi ${data.firstName ? data.firstName : 'there'},</p>
          <p>Your teacher account has been created. Use the credentials below to log in:</p>
          <ul>
            <li>Email: ${data.email}</li>
            <li>Temporary password: <strong>${data.temporaryPassword}</strong></li>
          </ul>
          <p>You can log in here: <a href="${loginUrl}">${loginUrl}</a></p>
          <p>Please change your password after first login.</p>
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
