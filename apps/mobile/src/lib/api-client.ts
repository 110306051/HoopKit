import { Platform } from "react-native";

const localBase =
  Platform.OS === "android"
    ? "http://10.0.2.2:3001/v1"
    : "http://127.0.0.1:3001/v1";

const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (
  !__DEV__ &&
  (!configuredBase || /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(configuredBase))
) {
  throw new Error(
    "Production build requires a public EXPO_PUBLIC_API_BASE_URL.",
  );
}

export const API_BASE_URL = (configuredBase ?? localBase).replace(/\/$/, "");

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "無法連線到 HoopKit API，請確認 API 已啟動與 EXPO_PUBLIC_API_BASE_URL 設定。",
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join("、")
      : body?.message;
    throw new Error(message ?? `API 回應 HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}
