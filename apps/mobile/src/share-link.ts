export interface ParsedShareLink {
  readonly publicId: string;
  /** Present only for organizer links (`/s/:id/manage?key=...`). */
  readonly ownerKey?: string;
}

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{3,120}$/;

/**
 * Accepts a bare schedule code, a web share/manage link (optionally under /en or /zh),
 * or an app deep link such as `scheduleshare://s/abc123`.
 */
export function parseShareLink(input: string): ParsedShareLink | null {
  const value = input.trim();
  if (!value) return null;

  const pathMatch = value.match(/(?:\/s\/|schedule=)([A-Za-z0-9_-]+)/i);
  const publicId = pathMatch?.[1] ?? value;
  if (!PUBLIC_ID_PATTERN.test(publicId)) return null;

  const ownerKey = pathMatch && /\/manage(?:[/?#]|$)/i.test(value) ? readKey(value) : undefined;
  return ownerKey ? { publicId, ownerKey } : { publicId };
}

function readKey(value: string): string | undefined {
  const match = value.match(/[?&]key=([^&#]+)/);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}
