import { SetMetadata } from '@nestjs/common';
import { SUBSCRIPTION_LIMIT_KEY } from '../guards/subscription.guard';

export const MaxStudents = () =>
  SetMetadata(SUBSCRIPTION_LIMIT_KEY, { type: 'students' });

export const MaxUsers = () =>
  SetMetadata(SUBSCRIPTION_LIMIT_KEY, { type: 'users' });

export const MaxClasses = () =>
  SetMetadata(SUBSCRIPTION_LIMIT_KEY, { type: 'classes' });