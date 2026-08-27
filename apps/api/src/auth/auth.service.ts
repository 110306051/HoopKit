import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { APP_ROLES, AppRole, AuthUser } from './auth-user';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Verifies the JWT against Supabase Auth on every protected API request.
   * This favors immediate revocation correctness for the first version.
   */
  async authenticate(accessToken: string): Promise<AuthUser> {
    const {
      data: { user },
      error,
    } = await this.supabase.authClient.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException('登入憑證無效或已過期。');
    }

    const { data: roleRow, error: roleError } =
      await this.supabase.serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (roleError) {
      throw new UnauthorizedException('無法讀取使用者權限。');
    }

    const role = this.isAppRole(roleRow?.role) ? roleRow.role : 'user';

    return {
      id: user.id,
      email: user.email ?? null,
      role,
      supabaseUser: user,
    };
  }

  async register(email: string, password: string, displayName: string) {
    const client = this.supabase.createStatelessAuthClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) throw new BadRequestException(error.message);

    return {
      user: data.user
        ? { id: data.user.id, email: data.user.email ?? null }
        : null,
      session: this.mapSession(data.session),
      requiresEmailConfirmation: Boolean(data.user && !data.session),
    };
  }

  async login(email: string, password: string) {
    const client = this.supabase.createStatelessAuthClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException(error?.message ?? '登入失敗。');
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? null },
      session: this.mapSession(data.session),
    };
  }

  async refresh(refreshToken: string) {
    const client = this.supabase.createStatelessAuthClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('登入狀態已過期，請重新登入。');
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? null },
      session: this.mapSession(data.session),
    };
  }

  private mapSession(
    session: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
    } | null,
  ) {
    if (!session) return null;
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
    };
  }

  private isAppRole(value: unknown): value is AppRole {
    return (
      typeof value === 'string' &&
      (APP_ROLES as readonly string[]).includes(value)
    );
  }
}
