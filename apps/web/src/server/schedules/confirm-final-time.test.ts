import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { confirmFinalTime } from "./confirm-final-time";
import type {
  ConfirmedFinalTimeScheduleRecord,
  ConfirmFinalTimeRepository,
  OwnerScheduleWithAvailabilityRecord
} from "./repository";

class FakeConfirmFinalTimeRepository implements ConfirmFinalTimeRepository {
  readonly confirmed: Array<{
    readonly endUtc: Date;
    readonly scheduleId: string;
    readonly startUtc: Date;
  }> = [];

  constructor(private readonly record?: OwnerScheduleWithAvailabilityRecord) {}

  async getOwnerScheduleByPublicId(): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    return this.record;
  }

  async confirmFinalTime(
    scheduleId: string,
    finalTime: { readonly endUtc: Date; readonly startUtc: Date }
  ): Promise<ConfirmedFinalTimeScheduleRecord | undefined> {
    this.confirmed.push({
      scheduleId,
      startUtc: finalTime.startUtc,
      endUtc: finalTime.endUtc
    });

    return {
      publicId: this.record?.schedule.publicId ?? "abc123",
      status: "locked",
      finalStartUtc: finalTime.startUtc,
      finalEndUtc: finalTime.endUtc
    };
  }
}

describe("confirmFinalTime", () => {
  it("locks the schedule and stores an everyone-available block as final time", async () => {
    const repository = new FakeConfirmFinalTimeRepository(buildOwnerScheduleRecord());

    const result = await confirmFinalTime(
      "abc123",
      {
        ownerKey: "owner-secret",
        startUtc: "2026-07-31T23:00:00.000Z",
        endUtc: "2026-07-31T23:30:00.000Z"
      },
      { repository }
    );

    expect(result.schedule).toEqual({
      publicId: "abc123",
      status: "locked",
      finalTime: {
        startUtc: "2026-07-31T23:00:00.000Z",
        endUtc: "2026-07-31T23:30:00.000Z",
        timezone: "Australia/Sydney",
        localStartDate: "2026-08-01",
        localEndDate: "2026-08-01",
        localStartTime: "09:00",
        localEndTime: "09:30"
      }
    });
    expect(repository.confirmed).toEqual([
      {
        scheduleId: "schedule-1",
        startUtc: new Date("2026-07-31T23:00:00.000Z"),
        endUtc: new Date("2026-07-31T23:30:00.000Z")
      }
    ]);
  });

  it("stores a candidate poll option as final time even when not everyone is available", async () => {
    const repository = new FakeConfirmFinalTimeRepository(buildCandidatePollOwnerScheduleRecord());

    const result = await confirmFinalTime(
      "candidate123",
      {
        ownerKey: "owner-secret",
        startUtc: "2026-08-03T08:00:00.000Z",
        endUtc: "2026-08-03T09:00:00.000Z"
      },
      { repository }
    );

    expect(result.schedule).toMatchObject({
      publicId: "candidate123",
      status: "locked",
      finalTime: {
        startUtc: "2026-08-03T08:00:00.000Z",
        endUtc: "2026-08-03T09:00:00.000Z",
        timezone: "Australia/Sydney",
        localStartDate: "2026-08-03",
        localStartTime: "18:00",
        localEndTime: "19:00"
      }
    });
    expect(repository.confirmed).toEqual([
      {
        scheduleId: "schedule-1",
        startUtc: new Date("2026-08-03T08:00:00.000Z"),
        endUtc: new Date("2026-08-03T09:00:00.000Z")
      }
    ]);
  });

  it("rejects candidate poll final times that are not candidate options", async () => {
    const repository = new FakeConfirmFinalTimeRepository(buildCandidatePollOwnerScheduleRecord());

    await expect(
      confirmFinalTime(
        "candidate123",
        {
          ownerKey: "owner-secret",
          startUtc: "2026-08-05T08:00:00.000Z",
          endUtc: "2026-08-05T09:00:00.000Z"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.confirmed).toHaveLength(0);
  });

  it("rejects final times that are not everyone-available blocks", async () => {
    const repository = new FakeConfirmFinalTimeRepository(buildOwnerScheduleRecord());

    await expect(
      confirmFinalTime(
        "abc123",
        {
          ownerKey: "owner-secret",
          startUtc: "2026-07-31T23:30:00.000Z",
          endUtc: "2026-08-01T00:00:00.000Z"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.confirmed).toHaveLength(0);
  });

  it("rejects archived schedules", async () => {
    const repository = new FakeConfirmFinalTimeRepository(
      buildOwnerScheduleRecord({
        status: "archived"
      })
    );

    await expect(
      confirmFinalTime(
        "abc123",
        {
          ownerKey: "owner-secret",
          startUtc: "2026-07-31T23:00:00.000Z",
          endUtc: "2026-07-31T23:30:00.000Z"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "SCHEDULE_LOCKED",
      status: 409
    } satisfies Partial<HttpError>);
  });

  it("rejects invalid owner keys", async () => {
    const repository = new FakeConfirmFinalTimeRepository(buildOwnerScheduleRecord());

    await expect(
      confirmFinalTime(
        "abc123",
        {
          ownerKey: "wrong",
          startUtc: "2026-07-31T23:00:00.000Z",
          endUtc: "2026-07-31T23:30:00.000Z"
        },
        { repository }
      )
    ).rejects.toMatchObject({
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<HttpError>);
    expect(repository.confirmed).toHaveLength(0);
  });
});

function buildOwnerScheduleRecord(
  overrides: Partial<OwnerScheduleWithAvailabilityRecord["schedule"]> = {}
): OwnerScheduleWithAvailabilityRecord {
  return {
    schedule: {
      id: "schedule-1",
      publicId: "abc123",
      title: "Team dinner",
      description: null,
      timezone: "Australia/Sydney",
      dateRangeStart: "2026-08-01",
      dateRangeEnd: "2026-08-01",
      slotMinutes: 30,
      dailyWindows: [
        {
          startTime: "09:00",
          endTime: "10:00"
        }
      ],
      scheduleMode: "availability_grid",
      status: "open",
      ownerKeyHash: hashKey("owner-secret"),
      ...overrides
    },
    candidateTimeOptions: [],
    participants: [
      {
        id: "participant-1",
        displayName: "Ada"
      },
      {
        id: "participant-2",
        displayName: "Ben"
      }
    ],
    availabilitySlots: [
      {
        participantId: "participant-1",
        slotStartUtc: new Date("2026-07-31T23:00:00.000Z"),
        slotEndUtc: new Date("2026-07-31T23:30:00.000Z")
      },
      {
        participantId: "participant-2",
        slotStartUtc: new Date("2026-07-31T23:00:00.000Z"),
        slotEndUtc: new Date("2026-07-31T23:30:00.000Z")
      },
      {
        participantId: "participant-1",
        slotStartUtc: new Date("2026-07-31T23:30:00.000Z"),
        slotEndUtc: new Date("2026-08-01T00:00:00.000Z")
      }
    ]
  };
}

function buildCandidatePollOwnerScheduleRecord(): OwnerScheduleWithAvailabilityRecord {
  return {
    schedule: {
      id: "schedule-1",
      publicId: "candidate123",
      title: "Project sync",
      description: null,
      timezone: "Australia/Sydney",
      dateRangeStart: "2026-08-03",
      dateRangeEnd: "2026-08-03",
      slotMinutes: 60,
      dailyWindows: [],
      scheduleMode: "candidate_poll",
      status: "open",
      ownerKeyHash: hashKey("owner-secret")
    },
    candidateTimeOptions: [
      {
        id: "option-1",
        label: "Option A",
        slotStartUtc: new Date("2026-08-03T08:00:00.000Z"),
        slotEndUtc: new Date("2026-08-03T09:00:00.000Z")
      }
    ],
    participants: [
      {
        id: "participant-1",
        displayName: "Ada"
      },
      {
        id: "participant-2",
        displayName: "Ben"
      }
    ],
    availabilitySlots: [],
    candidateVotes: [
      {
        participantId: "participant-1",
        candidateTimeOptionId: "option-1",
        response: "available"
      },
      {
        participantId: "participant-2",
        candidateTimeOptionId: "option-1",
        response: "maybe"
      }
    ]
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
