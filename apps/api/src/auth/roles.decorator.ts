import { SetMetadata } from '@nestjs/common';
import type { AppRole } from './auth-user';

export const ROLES_KEY = 'app-roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
