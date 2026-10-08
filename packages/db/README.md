# Database package

`packages/db` contains the PostgreSQL schema, migrations, and data-access foundations.

## Boundaries

- Own table definitions, migrations, database types, and base repositories.
- Keep UI behavior and scheduling algorithms out of this package.
- Do not expose database-only fields directly in API responses.

The package uses Drizzle, Postgres, the `postgres` driver, and `drizzle-kit` migrations.

## Commands

```sh
corepack pnpm --filter @schedule-share/db db:generate
corepack pnpm --filter @schedule-share/db db:migrate
corepack pnpm --filter @schedule-share/db db:check
corepack pnpm --filter @schedule-share/db db:studio
```

These commands need `DATABASE_URL`. With a Neon pooled connection string, set `DATABASE_MIGRATION_URL` to a direct connection string for migrations. Scripts load the root `.env.local` and `.env`; see [docs/environment.md](../../docs/environment.md).

The root `corepack pnpm db:setup` command runs environment checks, migrations, and a schema check. For local Docker Postgres, use `corepack pnpm db:up`, `corepack pnpm db:migrate:local`, and `corepack pnpm db:down`.
