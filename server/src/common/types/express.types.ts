import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  schoolId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}