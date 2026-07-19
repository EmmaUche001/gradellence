import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtParentAuthGuard extends AuthGuard('parent-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Parent authentication required');
    }
    if (user.type !== 'parent') {
      throw new UnauthorizedException('Invalid token type');
    }
    const request = context.switchToHttp().getRequest();
    request.user = user;
    return user;
  }
}
