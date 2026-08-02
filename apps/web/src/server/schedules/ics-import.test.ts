import { describe, expect, it } from "vitest";

import { parseIcsImportBusyBlocks } from "./ics-import";

describe("parseIcsImportBusyBlocks", () => {
  it("parses dated events with TZID into busy blocks", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:COMP101 lecture",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.9,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "COMP101 lecture",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.9
        }
      ]
    });
  });

  it("maps common Windows TZID aliases to IANA timezones", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Outlook lecture",
        "DTSTART;TZID=AUS Eastern Standard Time:20260801T093000",
        "DTEND;TZID=AUS Eastern Standard Time:20260801T103000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n"),
      "Australia/Perth"
    );

    expect(result).toMatchObject({
      confidence: 0.9,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Outlook lecture",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.9
        }
      ]
    });
  });

  it("parses VFREEBUSY periods into busy blocks", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VFREEBUSY",
        "FREEBUSY:20260731T233000Z/20260801T003000Z,20260801T013000Z/PT30M",
        "END:VFREEBUSY",
        "END:VCALENDAR"
      ].join("\r\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.9,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Calendar busy",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.9
        },
        {
          sourceLabel: "Calendar busy",
          localDate: "2026-08-01",
          startTime: "11:30",
          endTime: "12:00",
          timezone: "Australia/Sydney",
          confidence: 0.9
        }
      ]
    });
  });

  it("skips VFREEBUSY periods marked as free time", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VFREEBUSY",
        "COMMENT:Privacy export",
        "FREEBUSY;FBTYPE=FREE:20260731T220000Z/20260731T230000Z",
        "FREEBUSY;FBTYPE=BUSY-TENTATIVE:20260731T233000Z/20260801T000000Z",
        "END:VFREEBUSY",
        "END:VCALENDAR"
      ].join("\r\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toHaveLength(1);
    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "Privacy export",
      localDate: "2026-08-01",
      startTime: "09:30",
      endTime: "10:00",
      timezone: "Australia/Sydney"
    });
  });

  it("treats date-only events without DTEND as one-day busy blocks", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Public holiday",
        "DTSTART;VALUE=DATE:20260801",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "Public holiday",
      localDate: "2026-08-01",
      startTime: "00:00",
      endTime: "23:59"
    });
  });

  it("infers event end from second-level DURATION values", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Timed duration",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DURATION:PT1H30M30S",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "Timed duration",
      localDate: "2026-08-01",
      startTime: "09:30",
      endTime: "11:01"
    });
  });

  it("infers all-day event ranges from week DURATION values", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Conference week",
        "DTSTART;VALUE=DATE:20260801",
        "DURATION:P1W",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07"
    ]);
    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "Conference week",
      startTime: "00:00",
      endTime: "23:59"
    });
  });

  it("converts UTC event times into the selected timezone", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Work shift",
        "DTSTART:20260731T233000Z",
        "DTEND:20260801T003000Z",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks[0]).toMatchObject({
      localDate: "2026-08-01",
      startTime: "09:30",
      endTime: "10:30",
      timezone: "Australia/Sydney"
    });
  });

  it("adds extra occurrence dates from RDATE", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Extra studio",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RDATE;TZID=Australia/Sydney:20260803T093000,20260805T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-01",
      "2026-08-03",
      "2026-08-05"
    ]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Extra studio",
        startTime: "09:30",
        endTime: "10:30",
        timezone: "Australia/Sydney"
      },
      {
        sourceLabel: "Extra studio",
        startTime: "09:30",
        endTime: "10:30",
        timezone: "Australia/Sydney"
      },
      {
        sourceLabel: "Extra studio",
        startTime: "09:30",
        endTime: "10:30",
        timezone: "Australia/Sydney"
      }
    ]);
  });

  it("adds explicit RDATE period occurrences", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Extra period studio",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RDATE;VALUE=PERIOD;TZID=Australia/Sydney:20260803T110000/20260803T123000,20260805T090000/PT45M",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Extra period studio",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30",
        timezone: "Australia/Sydney"
      },
      {
        sourceLabel: "Extra period studio",
        localDate: "2026-08-03",
        startTime: "11:00",
        endTime: "12:30",
        timezone: "Australia/Sydney"
      },
      {
        sourceLabel: "Extra period studio",
        localDate: "2026-08-05",
        startTime: "09:00",
        endTime: "09:45",
        timezone: "Australia/Sydney"
      }
    ]);
  });

  it("applies EXDATE exclusions to RDATE period occurrences", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Extra period lab",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RDATE;VALUE=PERIOD;TZID=Australia/Sydney:20260803T110000/20260803T123000,20260805T090000/PT45M",
        "EXDATE;TZID=Australia/Sydney:20260803T110000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(
      result.busyBlocks.map((block) => `${block.localDate} ${block.startTime}-${block.endTime}`)
    ).toEqual(["2026-08-01 09:30-10:30", "2026-08-05 09:00-09:45"]);
  });

  it("applies EXDATE exclusions to RDATE occurrences", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Extra lab",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RDATE;TZID=Australia/Sydney:20260803T093000,20260805T093000",
        "EXDATE;TZID=Australia/Sydney:20260805T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual(["2026-08-01", "2026-08-03"]);
  });

  it("maps weekly RRULE events to weekday busy blocks", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Studio",
        "DTSTART;TZID=Australia/Sydney:20260803T180000",
        "DTEND;TZID=Australia/Sydney:20260803T190000",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Studio",
        dayOfWeek: 1,
        startTime: "18:00",
        endTime: "19:00"
      },
      {
        sourceLabel: "Studio",
        dayOfWeek: 3,
        startTime: "18:00",
        endTime: "19:00"
      }
    ]);
  });

  it("maps unbounded daily RRULE events to every weekday busy block", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Daily standup",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T100000",
        "RRULE:FREQ=DAILY",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toHaveLength(7);
    expect(result.busyBlocks.map((block) => block.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "Daily standup",
      startTime: "09:30",
      endTime: "10:00",
      timezone: "Australia/Sydney"
    });
  });

  it("expands daily RRULE COUNT and applies EXDATE exclusions", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Daily lab",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=DAILY;COUNT=4",
        "EXDATE;TZID=Australia/Sydney:20260802T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Daily lab",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Daily lab",
        localDate: "2026-08-03",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Daily lab",
        localDate: "2026-08-04",
        startTime: "09:30",
        endTime: "10:30"
      }
    ]);
  });

  it("applies RECURRENCE-ID cancellations to recurring events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:daily-lab@example.com",
        "SUMMARY:Daily lab",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=DAILY;COUNT=3",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:daily-lab@example.com",
        "RECURRENCE-ID;TZID=Australia/Sydney:20260802T093000",
        "STATUS:CANCELLED",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Daily lab",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Daily lab",
        localDate: "2026-08-03",
        startTime: "09:30",
        endTime: "10:30"
      }
    ]);
  });

  it("imports moved RECURRENCE-ID events and excludes their original occurrence", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:weekly-lab@example.com",
        "SUMMARY:Weekly lab",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=WEEKLY;COUNT=2",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:weekly-lab@example.com",
        "RECURRENCE-ID;TZID=Australia/Sydney:20260808T093000",
        "SUMMARY:Moved lab",
        "DTSTART;TZID=Australia/Sydney:20260808T110000",
        "DTEND;TZID=Australia/Sydney:20260808T120000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Weekly lab",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Moved lab",
        localDate: "2026-08-08",
        startTime: "11:00",
        endTime: "12:00"
      }
    ]);
  });

  it("expands daily RRULE INTERVAL through the schedule range buffer", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Every other day",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=DAILY;INTERVAL=2",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney",
      {
        scheduleDateRangeEnd: "2026-08-06",
        scheduleDateRangeStart: "2026-08-01"
      }
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-01",
      "2026-08-03",
      "2026-08-05",
      "2026-08-07"
    ]);
  });

  it("expands weekly RRULE COUNT and applies EXDATE exclusions", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Weekly lab",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=WEEKLY;COUNT=3",
        "EXDATE;TZID=Australia/Sydney:20260808T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Weekly lab",
        localDate: "2026-08-01",
        timezone: "Australia/Sydney",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Weekly lab",
        localDate: "2026-08-15",
        timezone: "Australia/Sydney",
        startTime: "09:30",
        endTime: "10:30"
      }
    ]);
  });

  it("applies EXDATE values with Windows TZID aliases", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Outlook weekly lab",
        "DTSTART;TZID=AUS Eastern Standard Time:20260801T093000",
        "DTEND;TZID=AUS Eastern Standard Time:20260801T103000",
        "RRULE:FREQ=WEEKLY;COUNT=3",
        "EXDATE;TZID=AUS Eastern Standard Time:20260808T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Perth"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Outlook weekly lab",
        localDate: "2026-08-01",
        timezone: "Australia/Sydney",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Outlook weekly lab",
        localDate: "2026-08-15",
        timezone: "Australia/Sydney",
        startTime: "09:30",
        endTime: "10:30"
      }
    ]);
  });

  it("stops weekly RRULE events at UNTIL", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Saturday studio",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=WEEKLY;UNTIL=20260808T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual(["2026-08-01", "2026-08-08"]);
  });

  it("expands monthly RRULE BYMONTHDAY and applies EXDATE exclusions", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Monthly review",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=MONTHLY;COUNT=4;BYMONTHDAY=1,15",
        "EXDATE;TZID=Australia/Sydney:20260915T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Monthly review",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Monthly review",
        localDate: "2026-08-15",
        startTime: "09:30",
        endTime: "10:30"
      },
      {
        sourceLabel: "Monthly review",
        localDate: "2026-09-01",
        startTime: "09:30",
        endTime: "10:30"
      }
    ]);
  });

  it("expands monthly RRULE BYMONTH and BYMONTHDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Seasonal studio",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=MONTHLY;COUNT=4;BYMONTH=8,12;BYMONTHDAY=10",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-10",
      "2026-12-10",
      "2027-08-10",
      "2027-12-10"
    ]);
  });

  it("expands monthly RRULE INTERVAL until the recurrence end", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Every other month",
        "DTSTART;TZID=Australia/Sydney:20260810T093000",
        "DTEND;TZID=Australia/Sydney:20260810T103000",
        "RRULE:FREQ=MONTHLY;INTERVAL=2;UNTIL=20261210T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-10",
      "2026-10-10",
      "2026-12-10"
    ]);
  });

  it("supports monthly RRULE events on the last day of the month", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Month end",
        "DTSTART;TZID=Australia/Sydney:20260131T170000",
        "DTEND;TZID=Australia/Sydney:20260131T180000",
        "RRULE:FREQ=MONTHLY;COUNT=3;BYMONTHDAY=-1",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31"
    ]);
  });

  it("expands monthly RRULE unnumbered BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:All Mondays",
        "DTSTART;TZID=Australia/Sydney:20260803T093000",
        "DTEND;TZID=Australia/Sydney:20260803T103000",
        "RRULE:FREQ=MONTHLY;COUNT=5;BYDAY=MO",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31"
    ]);
  });

  it("expands monthly RRULE BYSETPOS events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Month edge weekdays",
        "DTSTART;TZID=Australia/Sydney:20260803T093000",
        "DTEND;TZID=Australia/Sydney:20260803T103000",
        "RRULE:FREQ=MONTHLY;COUNT=4;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1,-1",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-03",
      "2026-08-31",
      "2026-09-01",
      "2026-09-30"
    ]);
  });

  it("expands monthly RRULE ordinal BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Second Tuesday planning",
        "DTSTART;TZID=Australia/Sydney:20260811T093000",
        "DTEND;TZID=Australia/Sydney:20260811T103000",
        "RRULE:FREQ=MONTHLY;COUNT=3;BYDAY=2TU",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-11",
      "2026-09-08",
      "2026-10-13"
    ]);
  });

  it("expands monthly RRULE BYMONTH and ordinal BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:September review",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=MONTHLY;COUNT=3;BYMONTH=9;BYDAY=1MO",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-09-07",
      "2027-09-06",
      "2028-09-04"
    ]);
  });

  it("expands monthly RRULE last weekday BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Last Friday wrap",
        "DTSTART;TZID=Australia/Sydney:20260828T170000",
        "DTEND;TZID=Australia/Sydney:20260828T180000",
        "RRULE:FREQ=MONTHLY;COUNT=3;BYDAY=-1FR",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-28",
      "2026-09-25",
      "2026-10-30"
    ]);
  });

  it("expands yearly RRULE events and applies EXDATE exclusions", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Annual planning",
        "DTSTART;TZID=Australia/Sydney:20260801T093000",
        "DTEND;TZID=Australia/Sydney:20260801T103000",
        "RRULE:FREQ=YEARLY;COUNT=3",
        "EXDATE;TZID=Australia/Sydney:20270801T093000",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual(["2026-08-01", "2028-08-01"]);
  });

  it("expands yearly RRULE BYMONTH and BYMONTHDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Semester checkpoints",
        "DTSTART;TZID=Australia/Sydney:20260810T093000",
        "DTEND;TZID=Australia/Sydney:20260810T103000",
        "RRULE:FREQ=YEARLY;COUNT=4;BYMONTH=8,12;BYMONTHDAY=10",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-10",
      "2026-12-10",
      "2027-08-10",
      "2027-12-10"
    ]);
  });

  it("skips invalid yearly RRULE dates without counting them", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Leap day",
        "DTSTART;TZID=Australia/Sydney:20240229T093000",
        "DTEND;TZID=Australia/Sydney:20240229T103000",
        "RRULE:FREQ=YEARLY;COUNT=2;BYMONTH=2;BYMONTHDAY=29",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual(["2024-02-29", "2028-02-29"]);
  });

  it("expands yearly RRULE ordinal BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:First Monday seminar",
        "DTSTART;TZID=Australia/Sydney:20260907T093000",
        "DTEND;TZID=Australia/Sydney:20260907T103000",
        "RRULE:FREQ=YEARLY;COUNT=3;BYMONTH=9;BYDAY=1MO",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-09-07",
      "2027-09-06",
      "2028-09-04"
    ]);
  });

  it("expands yearly RRULE last weekday BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Last Friday yearly wrap",
        "DTSTART;TZID=Australia/Sydney:20260529T170000",
        "DTEND;TZID=Australia/Sydney:20260529T180000",
        "RRULE:FREQ=YEARLY;COUNT=3;BYMONTH=5;BYDAY=-1FR",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-05-29",
      "2027-05-28",
      "2028-05-26"
    ]);
  });

  it("expands yearly RRULE BYSETPOS events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:First September weekday",
        "DTSTART;TZID=Australia/Sydney:20260901T093000",
        "DTEND;TZID=Australia/Sydney:20260901T103000",
        "RRULE:FREQ=YEARLY;COUNT=3;BYMONTH=9;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-09-01",
      "2027-09-01",
      "2028-09-01"
    ]);
  });

  it("expands yearly RRULE unnumbered BYDAY events", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:August Mondays",
        "DTSTART;TZID=Australia/Sydney:20260803T093000",
        "DTEND;TZID=Australia/Sydney:20260803T103000",
        "RRULE:FREQ=YEARLY;COUNT=4;BYMONTH=8;BYDAY=MO",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks.map((block) => block.localDate)).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24"
    ]);
  });

  it("expands yearly all-day RRULE events without DTEND", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Annual holiday",
        "DTSTART;VALUE=DATE:20260801",
        "RRULE:FREQ=YEARLY;COUNT=2",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.warnings).toEqual([]);
    expect(result.busyBlocks).toMatchObject([
      {
        sourceLabel: "Annual holiday",
        localDate: "2026-08-01",
        startTime: "00:00",
        endTime: "23:59"
      },
      {
        sourceLabel: "Annual holiday",
        localDate: "2027-08-01",
        startTime: "00:00",
        endTime: "23:59"
      }
    ]);
  });

  it("treats all-day events as full-day busy blocks", () => {
    const result = parseIcsImportBusyBlocks(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Exam day",
        "DTSTART;VALUE=DATE:20260801",
        "DTEND;VALUE=DATE:20260802",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "Exam day",
      localDate: "2026-08-01",
      startTime: "00:00",
      endTime: "23:59"
    });
  });
});
