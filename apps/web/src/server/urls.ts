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

export interface RequestBaseUrlOptions {
  readonly appBaseUrl?: string;
}

export function getRequestBaseUrl(request: Request, options: RequestBaseUrlOptions = {}): string {
  const configuredBaseUrl = getConfiguredAppBaseUrl(options.appBaseUrl ?? process.env.APP_BASE_URL);

  if (configuredBaseUrl !== undefined) {
    return configuredBaseUrl;
  }

  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (host === null) {
    return url.origin;
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export function getConfiguredAppBaseUrl(rawValue: string | undefined): string | undefined {
  const value = rawValue?.trim() ?? "";

  if (value.length === 0) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_BASE_URL must be an http:// or https:// URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("APP_BASE_URL must be an http:// or https:// URL.");
  }

  return url.origin;
}
