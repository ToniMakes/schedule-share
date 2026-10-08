import { describe, expect, it } from "vitest";
import {
  addDays,
  buildCreateScheduleRequest,
  createDefaultScheduleForm,
  isRealDate
} from "./schedule-form";

const base = createDefaultScheduleForm("Australia/Sydney", "2026-08-01");

describe("schedule form", () => {
  it("defaults to a week starting tomorrow", () => {
    expect(base.startDate).toBe("2026-08-02");
    expect(base.endDate).toBe("2026-08-08");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("validates real calendar dates", () => {
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2026-8-1")).toBe(false);
  });

  it("builds an availability grid request", () => {
    const result = buildCreateScheduleRequest({ ...base, title: " Dinner ", description: "" });
    expect(result).toMatchObject({
      ok: true,
      request: {
        title: "Dinner",
        scheduleMode: "availability_grid",
        dateRange: { start: "2026-08-02", end: "2026-08-08" },
        dailyWindows: [{ startTime: "09:00", endTime: "17:00" }]
      }
    });
  });

  it("reports the first form problem", () => {
    expect(buildCreateScheduleRequest(base)).toEqual({ ok: false, error: "createTitleRequired" });
    expect(buildCreateScheduleRequest({ ...base, title: "x", timezone: "Nope/Zone" })).toEqual({
      ok: false,
      error: "createTimezoneInvalid"
    });
    expect(buildCreateScheduleRequest({ ...base, title: "x", endDate: "2026-08-01" })).toEqual({
      ok: false,
      error: "createDateOrder"
    });
    expect(buildCreateScheduleRequest({ ...base, title: "x", windowEnd: "09:00" })).toEqual({
      ok: false,
      error: "createTimeInvalid"
    });
  });

  it("converts candidate times in the schedule time zone to UTC", () => {
    const result = buildCreateScheduleRequest({
      ...base,
      title: "Sync",
      mode: "candidate_poll",
      candidates: [{ date: "2026-08-03", startTime: "18:00", endTime: "19:00" }]
    });
    expect(result).toMatchObject({
      ok: true,
      request: {
        scheduleMode: "candidate_poll",
        candidateWindows: [
          { startUtc: "2026-08-03T08:00:00.000Z", endUtc: "2026-08-03T09:00:00.000Z" }
        ]
      }
    });
  });

  it("requires at least one candidate", () => {
    expect(
      buildCreateScheduleRequest({ ...base, title: "x", mode: "candidate_poll", candidates: [] })
    ).toEqual({ ok: false, error: "createCandidateRequired" });
  });
});
