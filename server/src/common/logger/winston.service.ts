import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logColors: Record<string, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'gray',
};

winston.addColors(logColors);

@Injectable()
export class WinstonService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize({ all: true }),
          winston.format.printf(({ level, message, timestamp, context }) => {
            const ctx = context ? `[${context}]` : '';
            return `${timestamp} ${level} ${ctx}: ${message}`;
          }),
        ),
      }),
    ];

    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      );
    }

    transports.push(
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    );

    this.logger = winston.createLogger({ transports });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.debug(message, { context });
  }
}
