const PRODUCTION_REQUIRED_KEYS = [
  'CORS_ORIGINS',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MUX_TOKEN_ID',
  'MUX_TOKEN_SECRET',
  'MUX_WEBHOOK_SECRET',
  'MUX_CORS_ORIGIN',
  'MUX_MOBILE_CORS_ORIGIN',
] as const;

const PLACEHOLDER_MARKERS = [
  'replace-with',
  'changeme',
  'example',
  'your-',
] as const;

/**
 * Normalizes runtime configuration and fails fast when a production deploy is
 * missing a required secret or still points at local infrastructure.
 */
export function validateEnvironment(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const config = { ...raw };
  const nodeEnv = stringValue(config.NODE_ENV) ?? 'development';
  const port = parsePort(config.PORT ?? config.API_PORT ?? 3001);

  config.NODE_ENV = nodeEnv;
  config.PORT = port;
  config.API_PORT = port;
  config.API_HOST = stringValue(config.API_HOST) ?? '0.0.0.0';

  if (nodeEnv !== 'production') return config;

  for (const key of PRODUCTION_REQUIRED_KEYS) {
    requireProductionValue(config, key);
  }

  requireHttpsUrl(config, 'SUPABASE_URL');
  requireHttpsUrl(config, 'MUX_CORS_ORIGIN');
  requireProductionOrigins(config.CORS_ORIGINS);

  const mobileOrigin = requireProductionValue(config, 'MUX_MOBILE_CORS_ORIGIN');
  if (mobileOrigin !== '*') requireHttpsUrl(config, 'MUX_MOBILE_CORS_ORIGIN');

  return config;
}

function parsePort(value: unknown): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT/API_PORT 必須是 1 到 65535 的整數。');
  }
  return port;
}

function requireProductionOrigins(value: unknown) {
  const origins = stringValue(value)
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins?.length) {
    throw new Error('Production CORS_ORIGINS 至少需要一個 HTTPS origin。');
  }

  for (const origin of origins) {
    if (origin === '*' || !isProductionHttpsUrl(origin)) {
      throw new Error(
        `Production CORS_ORIGINS 不可使用 wildcard、localhost 或非 HTTPS URL：${origin}`,
      );
    }
  }
}

function requireHttpsUrl(config: Record<string, unknown>, key: string) {
  const value = requireProductionValue(config, key);
  if (!isProductionHttpsUrl(value)) {
    throw new Error(`${key} 在 production 必須是非 localhost 的 HTTPS URL。`);
  }
}

function isProductionHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1' &&
      url.hostname !== '::1'
    );
  } catch {
    return false;
  }
}

function requireProductionValue(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = stringValue(config[key]);
  if (
    !value ||
    PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker))
  ) {
    throw new Error(`Production 缺少有效的 ${key}。`);
  }
  return value;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}
