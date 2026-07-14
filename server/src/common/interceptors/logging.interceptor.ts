import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly winstonAvailable: boolean;

  constructor() {
    this.winstonAvailable = process.env.NODE_ENV !== 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, ip } = request;
    const requestId = uuidv4();
    request['requestId'] = requestId;

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${duration}ms`,
            requestId,
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `${method} ${url} ${response.statusCode} - ${duration}ms - ${error.message}`,
            error.stack,
            requestId,
          );
        },
      }),
    );
  }
}