import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly url?: string;
  private readonly publishableKey?: string;
  private readonly serviceRoleKey?: string;
  private authClientInstance?: SupabaseClient;
  private serviceClientInstance?: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>('SUPABASE_URL');
    this.publishableKey = this.config.get<string>('SUPABASE_PUBLISHABLE_KEY');
    this.serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
  }

  /**
   * Client used only to ask Supabase Auth to verify a caller-provided access
   * token. It never persists a session inside the API process.
   */
  get authClient(): SupabaseClient {
    if (!this.authClientInstance) {
      this.authClientInstance = createClient(
        this.requireConfig('SUPABASE_URL', this.url),
        this.requireConfig('SUPABASE_PUBLISHABLE_KEY', this.publishableKey),
        {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
        },
      );
    }

    return this.authClientInstance;
  }

  /**
   * Creates an isolated, non-persisting Auth client for login/registration.
   * A new instance prevents one API request from sharing session state with
   * another request handled by the same NestJS process.
   */
  createStatelessAuthClient(): SupabaseClient {
    return createClient(
      this.requireConfig('SUPABASE_URL', this.url),
      this.requireConfig('SUPABASE_PUBLISHABLE_KEY', this.publishableKey),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    ) as SupabaseClient;
  }

  /**
   * Trusted server-only client. The service-role key bypasses RLS, so this
   * client must never be exported to browser/mobile code.
   */
  get serviceClient(): SupabaseClient {
    if (!this.serviceClientInstance) {
      this.serviceClientInstance = createClient(
        this.requireConfig('SUPABASE_URL', this.url),
        this.requireConfig('SUPABASE_SERVICE_ROLE_KEY', this.serviceRoleKey),
        {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
        },
      );
    }

    return this.serviceClientInstance;
  }

  private requireConfig(name: string, value?: string): string {
    if (!value || value.startsWith('replace-with-')) {
      throw new ServiceUnavailableException(
        `${name} 尚未設定，請先建立 apps/api/.env。`,
      );
    }

    return value;
  }
}
