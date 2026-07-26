export function buildAbsoluteUrl(
  baseUrl: string,
  pathname: string,
  query?: Record<string, string>
): string {
  const url = new URL(pathname, baseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function getRequestBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (host === null) {
    return url.origin;
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${protocol}://${host}`;
}
