import { validateEnvironment } from './environment';

const productionEnvironment = {
  NODE_ENV: 'production',
  PORT: '8080',
  CORS_ORIGINS: 'https://admin.hoopkit.app',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_valid',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_valid',
  MUX_TOKEN_ID: 'mux-token-id',
  MUX_TOKEN_SECRET: 'mux-token-secret',
  MUX_WEBHOOK_SECRET: 'mux-webhook-secret',
  MUX_CORS_ORIGIN: 'https://admin.hoopkit.app',
  MUX_MOBILE_CORS_ORIGIN: '*',
};

describe('validateEnvironment', () => {
  it('prefers the hosting provider PORT and normalizes it', () => {
    expect(validateEnvironment({ PORT: '4123', API_PORT: '3001' }).PORT).toBe(
      4123,
    );
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnvironment({ API_PORT: 'invalid' })).toThrow(
      'PORT/API_PORT',
    );
  });

  it('accepts a complete production environment', () => {
    expect(validateEnvironment(productionEnvironment).PORT).toBe(8080);
  });

  it('rejects missing production secrets', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        MUX_WEBHOOK_SECRET: '',
      }),
    ).toThrow('MUX_WEBHOOK_SECRET');
  });

  it('rejects localhost and wildcard API CORS in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        CORS_ORIGINS: 'http://localhost:3000,*',
      }),
    ).toThrow('CORS_ORIGINS');
  });
});
