import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (user && user.schoolId) {
      // Set schoolId in request for easy access
      (req as any).schoolId = user.schoolId;
    }

    next();
  }
}
