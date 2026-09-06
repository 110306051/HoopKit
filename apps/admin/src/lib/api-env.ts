const LOCAL_API_BASE_URL = "http://127.0.0.1:3001/v1";

export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const value = (configured ?? LOCAL_API_BASE_URL).replace(/\/$/, "");

  if (
    process.env.NODE_ENV === "production" &&
    (!configured || !isPublicHttpsUrl(value))
  ) {
    throw new Error(
      "Production requires NEXT_PUBLIC_API_BASE_URL to be a public HTTPS URL.",
    );
  }

  return value;
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
