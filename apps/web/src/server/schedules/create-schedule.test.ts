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
});
