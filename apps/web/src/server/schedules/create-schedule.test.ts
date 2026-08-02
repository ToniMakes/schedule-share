import { describe, expect, it } from "vitest";

import { HttpError } from "../errors";
import { createScheduleRecord } from "./create-schedule";
import type { CreateScheduleRecord, CreateScheduleRepository } from "./repository";

class FakeScheduleRepository implements CreateScheduleRepository {
  readonly records: CreateScheduleRecord[] = [];

  async createSchedule(record: CreateScheduleRecord) {
    this.records.push(record);

    return {
      publicId: record.publicId,
      title: record.title,
      timezone: record.timezone,
      scheduleMode: record.scheduleMode,
      status: record.status
    };
  }
}

describe("createScheduleRecord", () => {
  it("validates, persists, and returns share and owner links", async () => {
    const repository = new FakeScheduleRepository();

    const result = await createScheduleRecord(
      {
        title: "周末聚餐",
        description: "",
        timezone: "Australia/Sydney",
        scheduleMode: "availability_grid",
        dateRange: {
          start: "2026-08-01",
          end: "2026-08-01"
        },
        slotMinutes: 30,
        dailyWindows: [
          {
            startTime: "09:00",
            endTime: "10:00"
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        now: () => new Date("2026-07-25T00:00:00.000Z"),
        ownerKeyFactory: () => "owner-secret",
        publicIdFactory: () => "abc123",
        repository
      }
    );

    expect(result).toEqual({
      schedule: {
        publicId: "abc123",
        title: "周末聚餐",
        timezone: "Australia/Sydney",
        scheduleMode: "availability_grid",
        status: "open"
      },
      shareUrl: "https://example.com/s/abc123",
      ownerUrl: "https://example.com/s/abc123/manage?key=owner-secret"
    });
    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      publicId: "abc123",
      title: "周末聚餐",
      description: null,
      dateRangeStart: "2026-08-01",
      dateRangeEnd: "2026-08-01",
      scheduleMode: "availability_grid",
      candidateTimeOptions: [],
      ownerKeyHash: "A_ma0ruPRwq0prZd1R3Kj2PEo21Spmsi1wbBTb_sWYM"
    });
    expect(repository.records[0]!.expiresAt.toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });

  it("rejects a schedule that produces no selectable slots", async () => {
    const repository = new FakeScheduleRepository();

    await expect(
      createScheduleRecord(
        {
          title: "周末聚餐",
          timezone: "Australia/Sydney",
          scheduleMode: "availability_grid",
          dateRange: {
            start: "2026-08-02",
            end: "2026-08-02"
          },
          slotMinutes: 30,
          dailyWindows: [
            {
              daysOfWeek: [1],
              startTime: "09:00",
              endTime: "10:00"
            }
          ]
        },
        {
          baseUrl: "https://example.com",
          publicIdFactory: () => "abc123",
          ownerKeyFactory: () => "owner-secret",
          repository
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<HttpError>);
    expect(repository.records).toHaveLength(0);
  });

  it("persists candidate poll schedules with candidate time options", async () => {
    const repository = new FakeScheduleRepository();

    const result = await createScheduleRecord(
      {
        title: "Project sync",
        timezone: "Australia/Sydney",
        scheduleMode: "candidate_poll",
        slotMinutes: 60,
        candidateWindows: [
          {
            label: "Option A",
            startUtc: "2026-08-03T08:00:00.000Z",
            endUtc: "2026-08-03T09:00:00.000Z"
          },
          {
            label: "Option B",
            startUtc: "2026-08-04T09:00:00.000Z",
            endUtc: "2026-08-04T10:30:00.000Z"
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        now: () => new Date("2026-07-25T00:00:00.000Z"),
        ownerKeyFactory: () => "owner-secret",
        publicIdFactory: () => "candidate123",
        repository
      }
    );

    expect(result.schedule).toMatchObject({
      publicId: "candidate123",
      scheduleMode: "candidate_poll"
    });
    expect(repository.records[0]).toMatchObject({
      dailyWindows: [],
      dateRangeStart: "2026-08-03",
      dateRangeEnd: "2026-08-04",
      scheduleMode: "candidate_poll",
      candidateTimeOptions: [
        {
          label: "Option A",
          slotStartUtc: new Date("2026-08-03T08:00:00.000Z"),
          slotEndUtc: new Date("2026-08-03T09:00:00.000Z")
        },
        {
          label: "Option B",
          slotStartUtc: new Date("2026-08-04T09:00:00.000Z"),
          slotEndUtc: new Date("2026-08-04T10:30:00.000Z")
        }
      ]
    });
  });
});
