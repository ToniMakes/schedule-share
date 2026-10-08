# API client package

`packages/api-client` contains the typed requests and contracts shared by the web and mobile apps.

## Boundaries

- Own API request functions and input/output types.
- Map API errors into client-friendly errors.
- Do not access the database or duplicate domain rules from `packages/core`.

## Main capabilities

- Create and read schedules.
- Submit, read, and update participant responses.
- Preview pasted text, images, ICS calendars, and CSV availability sources.
- Lock a schedule and confirm a final time.
- Validate request and response payloads with shared schemas.

Run package checks from the repository root with `corepack pnpm --filter @schedule-share/api-client typecheck` and `corepack pnpm --filter @schedule-share/api-client test`.
