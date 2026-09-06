export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !url ||
    !publishableKey ||
    publishableKey.startsWith("replace-with-") ||
    (process.env.NODE_ENV === "production" && !isPublicHttpsUrl(url))
  ) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY，請建立 apps/admin/.env.local。",
    );
  }

  return { url, publishableKey };
}

function isPublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
