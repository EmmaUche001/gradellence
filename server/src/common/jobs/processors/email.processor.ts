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
