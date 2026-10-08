const SCHEDULE_LINK = /\/s\/[A-Za-z0-9_-]+/;

/**
 * Share and organizer links (`scheduleshare://s/<id>`, `https://…/s/<id>/manage?key=…`) are not
 * routes in this app. Hand them to the home screen, which resolves them with the same parser as
 * the paste-a-link field.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (SCHEDULE_LINK.test(path)) return `/?link=${encodeURIComponent(path)}`;
    return path;
  } catch {
    return "/";
  }
}
