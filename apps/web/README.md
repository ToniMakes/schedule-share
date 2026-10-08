# Web app

`apps/web` owns the web routes, forms, participant interactions, responsive layouts, and shared-result views.

## Boundaries

- Use `packages/api-client` for API requests and contracts.
- Use pure helpers from `packages/core` for local previews and presentation.
- Keep scheduling and availability rules out of UI components.
- Server-side database access goes through repositories in `src/server`; pages and client components do not depend on database tables.

## Main routes

- `/` — English home page.
- `/zh` — Chinese home page.
- `/new` and `/zh/new` — Create a schedule.
- `/s/[publicId]` — View a schedule, respond, and see shared results.
- `/s/[publicId]/manage` — Manage the schedule and review results.
- `/s/[publicId]/edit/[participantId]` — Update a participant response.

Run the web app from the repository root with `corepack pnpm dev:local` or `corepack pnpm dev`. See [docs/environment.md](../../docs/environment.md) for database and environment setup.
