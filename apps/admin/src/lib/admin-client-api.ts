"use client";

import { adminApiRequest } from "@/lib/admin-api";
import { createClient } from "@/lib/supabase/client";

/**
 * Authenticated API helper for Client Components.
 * The browser receives only the user's access token, never the service-role key.
 */
export async function adminClientApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("登入已逾時，請重新登入。");
  }

  const result = await adminApiRequest<T>(path, session.access_token, init);
  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.data;
}
