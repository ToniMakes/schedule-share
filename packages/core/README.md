# Core package

`packages/core` contains pure scheduling and availability logic shared by the web and mobile apps.

## Responsibilities

- Generate time slots from schedule settings.
- Apply time-zone and daylight-saving rules.
- Calculate shared availability and rank time options.
- Validate domain inputs and normalize availability drafts.

The package must not access a database, call HTTP APIs, read browser APIs, or import React or platform UI components. Keep scheduling rules here instead of duplicating them in app components.

## Main functions

- `generateTimeSlots` creates standard UTC slots from a schedule configuration.
- `calculateAvailabilitySummary` counts available participants and finds shared or ranked times.
- `buildCandidatePollResults` ranks proposed times using availability, “if needed” responses, and preference ranks.
- `mergeAvailabilityBlocks` combines adjacent slots with the same available participants.
- `createCandidateTimeSlots` normalizes explicit UTC options for display in the schedule time zone.
- `createAvailabilityDraftFromBusyBlocks` and `createAvailabilityDraftFromAvailableSlots` create editable prefill drafts.

Run package checks from the repository root with `corepack pnpm --filter @schedule-share/core typecheck` and `corepack pnpm --filter @schedule-share/core test`.
