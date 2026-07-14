import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

interface ParentJwtPayload {
  sub: string;
  email: string;
  schoolId: string;
  type: string;
}

@Injectable()
export class ParentJwtStrategy extends PassportStrategy(Strategy, 'parent-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: ParentJwtPayload) {
    if (payload.type !== 'parent') {
      throw new UnauthorizedException('Invalid token type');
    }

    const parent = await this.prisma.parent.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, schoolId: true, firstName: true, lastName: true, isActive: true },
    });

    if (!parent || !parent.isActive) {
      throw new UnauthorizedException('Parent not found or inactive');
    }

    return {
      id: parent.id,
      email: parent.email,
      schoolId: parent.schoolId,
      firstName: parent.firstName,
      lastName: parent.lastName,
      type: 'parent',
    };
  }
}