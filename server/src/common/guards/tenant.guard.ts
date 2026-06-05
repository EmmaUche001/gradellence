import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin can access all tenants
    if (user.roles?.includes('SUPER_ADMIN')) {
      return true;
    }

    // Check if user has a schoolId
    if (!user.schoolId) {
      throw new ForbiddenException('User is not associated with any school');
    }

    // Set schoolId in request for downstream use
    request.schoolId = user.schoolId;

    return true;
  }
}