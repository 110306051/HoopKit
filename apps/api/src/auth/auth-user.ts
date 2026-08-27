import type { User } from '@supabase/supabase-js';

export const APP_ROLES = ['user', 'editor', 'admin'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string | null;
  role: AppRole;
  supabaseUser: User;
}
