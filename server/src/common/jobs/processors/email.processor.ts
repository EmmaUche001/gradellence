import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJob>): Promise<any> {
    const { to, subject, template, data } = job.data;

    this.logger.log(`Sending email to ${to}, template: ${template}`);

    try {
      // Placeholder for email sending logic
      // In production, integrate with SendGrid, AWS SES, etc.
      this.logger.log(`Email sent successfully to ${to}`);
      
      return { success: true, to, template };
    } catch (error) {
      this.logger.error(
        `Email sending failed to ${to}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}