import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { exportOwnerScheduleCsv, exportOwnerScheduleIcs } from "./export-owner-schedule";
import type {
  OwnerScheduleWithAvailabilityRecord,
  ReadOwnerScheduleRepository
} from "./repository";

class FakeOwnerScheduleRepository implements ReadOwnerScheduleRepository {
  constructor(private readonly record?: OwnerScheduleWithAvailabilityRecord) {}

  async getOwnerScheduleByPublicId(): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    return this.record;
  }
}

describe("exportOwnerScheduleCsv", () => {
  it("exports owner schedule results as CSV", async () => {
    const result = await exportOwnerScheduleCsv("abc123", "owner-secret", {
      repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
    });

    expect(result.filename).toBe("schedule-abc123-results.csv");
    expect(result.content).toContain("日程标题,Team dinner");
    expect(result.content).toContain("全员可用连续时间段");
    expect(result.content).toContain('2026-08-01,09:00,09:30,1,2,2,"Ada; Ben, Jr."""');
    expect(result.content).toContain("2026-08-01,09:30,10:00,1,2,否,Ada");
    expect(result.content).toContain('"Ben, Jr."""');
  });

  it("rejects an invalid owner key", async () => {
    await expect(
      exportOwnerScheduleCsv("abc123", "wrong", {
        repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
      })
    ).rejects.toMatchObject({
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<HttpError>);
  });

  it("exports candidate poll maybe votes as CSV", async () => {
    const result = await exportOwnerScheduleCsv("candidate123", "owner-secret", {
      repository: new FakeOwnerScheduleRepository(buildCandidateOwnerScheduleRecord())
    });

    expect(result.content).toContain("候选投票结果");
    expect(result.content).toContain(
      "候选,日期,开始时间,结束时间,可用人数,也许人数,首选人数,平均偏好顺位,总人数,可用参与者,也许参与者,首选参与者,不方便或未选"
    );
    expect(result.content).toContain(
      "Option A,2026-08-03,18:00,19:00,1,1,1,1.5,3,Ada,Grace,Ada,Lin"
    );
  });

  it("exports everyone-available blocks as an ICS calendar", async () => {
    const result = await exportOwnerScheduleIcs("abc123", "owner-secret", {
      repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
    });

    expect(result.filename).toBe("schedule-abc123-available-times.ics");
    expect(result.content).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(result.content).toContain("PRODID:-//Schedule Share//Available Times Export//EN");
    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(result.content).toContain("UID:schedule-abc123-available-0@schedule-share.local");
    expect(result.content).toContain("DTSTART:20260731T230000Z");
    expect(result.content).toContain("DTEND:20260731T233000Z");
    expect(result.content).toContain("SUMMARY:Available: Team dinner");
    expect(result.content).toContain('DESCRIPTION:All available participants: Ada\\; Ben\\, Jr."');
    expect(result.content).toContain("TRANSP:TRANSPARENT");
    expect(result.content).not.toContain("DTSTART:20260731T233000Z");
    expect(result.content.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("exports a selected everyone-available block as an ICS calendar", async () => {
    const result = await exportOwnerScheduleIcs(
      "abc123",
      "owner-secret",
      {
        repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
      },
      {
        endUtc: "2026-07-31T23:30:00.000Z",
        startUtc: "2026-07-31T23:00:00.000Z"
      }
    );

    expect(result.filename).toBe("schedule-abc123-available-20260731T230000Z.ics");
    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(result.content).toContain("DTSTART:20260731T230000Z");
    expect(result.content).toContain("DTEND:20260731T233000Z");
  });

  it("exports a confirmed final time as an opaque ICS calendar", async () => {
    const result = await exportOwnerScheduleIcs(
      "candidate123",
      "owner-secret",
      {
        repository: new FakeOwnerScheduleRepository(buildConfirmedCandidateOwnerScheduleRecord())
      },
      {
        target: "final-time"
      }
    );

    expect(result.filename).toBe("schedule-candidate123-final-20260803T080000Z.ics");
    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(result.content).toContain(
      "UID:schedule-candidate123-final-20260803T080000Z@schedule-share.local"
    );
    expect(result.content).toContain("DTSTART:20260803T080000Z");
    expect(result.content).toContain("DTEND:20260803T090000Z");
    expect(result.content).toContain("SUMMARY:Final: Project sync");
    expect(result.content).toContain("DESCRIPTION:Confirmed final time.");
    expect(result.content).toContain("TRANSP:OPAQUE");
    expect(result.content).not.toContain("TRANSP:TRANSPARENT");
  });

  it("rejects final time ICS export before final time is confirmed", async () => {
    await expect(
      exportOwnerScheduleIcs(
        "candidate123",
        "owner-secret",
        {
          repository: new FakeOwnerScheduleRepository(buildCandidateOwnerScheduleRecord())
        },
        {
          target: "final-time"
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
  });

  it("rejects unsupported ICS export targets", async () => {
    await expect(
      exportOwnerScheduleIcs(
        "abc123",
        "owner-secret",
        {
          repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
        },
        {
          target: "agenda"
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
  });

  it("rejects final time ICS export with a selected range", async () => {
    await expect(
      exportOwnerScheduleIcs(
        "candidate123",
        "owner-secret",
        {
          repository: new FakeOwnerScheduleRepository(buildConfirmedCandidateOwnerScheduleRecord())
        },
        {
          endUtc: "2026-08-03T09:00:00.000Z",
          startUtc: "2026-08-03T08:00:00.000Z",
          target: "final-time"
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
  });

  it("rejects selected ICS ranges that are not everyone-available blocks", async () => {
    await expect(
      exportOwnerScheduleIcs(
        "abc123",
        "owner-secret",
        {
          repository: new FakeOwnerScheduleRepository(buildOwnerScheduleRecord())
        },
        {
          endUtc: "2026-08-01T00:00:00.000Z",
          startUtc: "2026-07-31T23:30:00.000Z"
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
  });
});

function buildOwnerScheduleRecord(): OwnerScheduleWithAvailabilityRecord {
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
      ownerKeyHash: hashKey("owner-secret")
    },
    candidateTimeOptions: [],
    participants: [
      {
        id: "participant-1",
        displayName: "Ada"
      },
      {
        id: "participant-2",
        displayName: 'Ben, Jr."'
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

function buildConfirmedCandidateOwnerScheduleRecord(): OwnerScheduleWithAvailabilityRecord {
  const record = buildCandidateOwnerScheduleRecord();

  return {
    ...record,
    schedule: {
      ...record.schedule,
      finalStartUtc: new Date("2026-08-03T08:00:00.000Z"),
      finalEndUtc: new Date("2026-08-03T09:00:00.000Z"),
      status: "locked"
    }
  };
}

function buildCandidateOwnerScheduleRecord(): OwnerScheduleWithAvailabilityRecord {
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
        displayName: "Grace"
      },
      {
        id: "participant-3",
        displayName: "Lin"
      }
    ],
    availabilitySlots: [],
    candidateVotes: [
      {
        participantId: "participant-1",
        candidateTimeOptionId: "option-1",
        preferenceRank: 1,
        response: "available"
      },
      {
        participantId: "participant-2",
        candidateTimeOptionId: "option-1",
        preferenceRank: 2,
        response: "maybe"
      },
      {
        participantId: "participant-3",
        candidateTimeOptionId: "option-1",
        response: "unavailable"
      }
    ]
  };
}

function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}
