# Schedule Share

**Find a time that works for your group.** Schedule Share helps people compare availability across dates and time zones, then choose a time together.

[English](README.md) · [简体中文](README.zh-CN.md) · [Open the web app](https://schedule.tonimakes.com)

## How it works

1. Create a schedule with an availability grid or a set of time options.
2. Share the participant link. People can respond without creating an account.
3. Compare overlapping availability or poll results, then confirm a time.

The web app supports open availability grids, three-state voting on proposed times, optional prefill from pasted text, CSV/ICS files, or a weekly template, shared results, and calendar export. Dates and time ranges are interpreted in the schedule's time zone.

## Mobile app

The native Expo app supports joining schedules, submitting or updating responses, viewing results, creating schedules, and organizer actions such as locking, archiving, and confirming a final time. Join with a schedule code or paste a share link; opening ordinary web links directly in the installed app is not wired up yet. Physical-device validation was completed on 2026-10-08. See [apps/mobile/README.md](apps/mobile/README.md) for setup and current limits.

## Run locally

The web app requires Node.js, pnpm through Corepack, and Docker for the local Postgres setup.

```powershell
corepack pnpm install --ignore-scripts
corepack pnpm env:init
corepack pnpm db:up
corepack pnpm db:migrate:local
corepack pnpm dev:local
```

The web app runs at `http://localhost:3000`. See [docs/environment.md](docs/environment.md) for environment options and [docs/deployment.md](docs/deployment.md) for deployment checks.

## Repository layout

```text
apps/
  web/                 Next.js web app
  mobile/              Expo + React Native app
packages/
  core/                Shared time and availability logic
  db/                  PostgreSQL schema and data access
  api-client/          Typed API client and contracts
docs/                  Product, API, architecture, and operating docs
scripts/               Development and deployment utilities
```

## Project docs

- [Product scope](docs/product.md)
- [Architecture and module boundaries](docs/architecture.md)
- [API contracts](docs/api.md)
- [Local environment setup](docs/environment.md)
- [Project status and known limits](docs/project-status.md)

## Feedback

Use the in-app [feedback page](https://schedule.tonimakes.com/feedback) or see the [contact page](https://schedule.tonimakes.com/contact).
