import { getApiBaseUrl } from "@/lib/api-env";

type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

export async function adminApiRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message = Array.isArray(errorBody?.message)
        ? errorBody.message.join("、")
        : errorBody?.message;

      return {
        ok: false,
        status: response.status,
        message: message ?? `API 回傳 ${response.status}`,
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      status: 503,
      message: "無法連線 HoopKit API，請確認 apps/api 已啟動。",
    };
  }
}
