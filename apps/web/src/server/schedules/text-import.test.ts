import { describe, expect, it } from "vitest";

import { parseTextImportBusyBlocks } from "./text-import";

describe("parseTextImportBusyBlocks", () => {
  it("parses English weekdays with shorthand hour ranges and repeated context", () => {
    const result = parseTextImportBusyBlocks("Mon 9-11 COMP101, 14-16 Lab", "Australia/Sydney");

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon 9-11 COMP101",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "14-16 Lab",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("normalizes list and status prefixes in pasted free text", () => {
    const result = parseTextImportBusyBlocks(
      ["- Busy: Mon 9-11 COMP101", "2. blocked: 14-16 Lab", "• 忙碌：周三 18:00-19:00 排班"].join(
        "\n"
      ),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon 9-11 COMP101",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "14-16 Lab",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "周三 18:00-19:00 排班",
        dayOfWeek: 3,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps date context with comma-separated free-text times", () => {
    const result = parseTextImportBusyBlocks(
      ["Mon, 9-11 COMP101, 14-16 Lab", "Monday, Aug 3, 6pm-7pm Dinner"].join("\n"),
      "Australia/Sydney",
      { defaultYear: 2026 }
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon, 9-11 COMP101",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "14-16 Lab",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Monday, Aug 3, 6pm-7pm Dinner",
        localDate: "2026-08-03",
        dayOfWeek: 1,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses conversational English time ranges with to", () => {
    const result = parseTextImportBusyBlocks(
      ["Meeting from 9 to 11 on Monday; 14 to 16 Lab", "Wed from 6pm to 7pm Shift"].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Meeting from 9 to 11 on Monday",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "14 to 16 Lab",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Wed from 6pm to 7pm Shift",
        dayOfWeek: 3,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses conversational English time ranges with between and and", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Meeting between 9 and 11 on Monday; between 14 and 16 Lab",
        "Wed between 6 and 7pm Shift"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Meeting between 9 and 11 on Monday",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "between 14 and 16 Lab",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Wed between 6 and 7pm Shift",
        dayOfWeek: 3,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("infers the start meridiem from the end of short English ranges", () => {
    const result = parseTextImportBusyBlocks(
      ["Mon 6 to 7pm Dinner; 9-11am Standup", "Wed 11-12pm Brunch"].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon 6 to 7pm Dinner",
        dayOfWeek: 1,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "9-11am Standup",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Wed 11-12pm Brunch",
        dayOfWeek: 3,
        startTime: "11:00",
        endTime: "12:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses conversational English time ranges with until and till", () => {
    const result = parseTextImportBusyBlocks(
      ["Mon from 9am until 11am Class; 2pm till 4pm Lab", "Wed 6pm until 7pm Shift"].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon from 9am until 11am Class",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "2pm till 4pm Lab",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Wed 6pm until 7pm Shift",
        dayOfWeek: 3,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses start times with explicit durations", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Mon 9am for 2 hours Lecture; Tue 14:30 for 90 min Lab",
        "周三 下午2点 1.5小时 排班",
        "Thu 10am for 1 hour 30 min Workshop"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon 9am for 2 hours Lecture",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Tue 14:30 for 90 min Lab",
        dayOfWeek: 2,
        startTime: "14:30",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "周三 下午2点 1.5小时 排班",
        dayOfWeek: 3,
        startTime: "14:00",
        endTime: "15:30",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Thu 10am for 1 hour 30 min Workshop",
        dayOfWeek: 4,
        startTime: "10:00",
        endTime: "11:30",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses noon and midnight time words", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Mon noon-1pm Lunch; Tue midnight to 1am Maintenance",
        "Wed between 11am and noon Review",
        "Thu noon for 1 hour Break"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Mon noon-1pm Lunch",
        dayOfWeek: 1,
        startTime: "12:00",
        endTime: "13:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Tue midnight to 1am Maintenance",
        dayOfWeek: 2,
        startTime: "00:00",
        endTime: "01:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Wed between 11am and noon Review",
        dayOfWeek: 3,
        startTime: "11:00",
        endTime: "12:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "Thu noon for 1 hour Break",
        dayOfWeek: 4,
        startTime: "12:00",
        endTime: "13:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses meridiem time ranges and slash dates using the schedule year", () => {
    const result = parseTextImportBusyBlocks("8/1 9am-10:30am Work", "Australia/Sydney", {
      defaultYear: 2026
    });

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "8/1 9am-10:30am Work",
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:30",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
  });

  it("parses English month dates using the schedule year", () => {
    const result = parseTextImportBusyBlocks(
      ["Aug 3, 9am-10:30am Work", "3 Aug, 14:00-16:00 Lab", "September 4, 2026 6pm-7pm Shift"].join(
        "\n"
      ),
      "Australia/Sydney",
      {
        defaultYear: 2026
      }
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Aug 3, 9am-10:30am Work",
        localDate: "2026-08-03",
        startTime: "09:00",
        endTime: "10:30",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "3 Aug, 14:00-16:00 Lab",
        localDate: "2026-08-03",
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      },
      {
        sourceLabel: "September 4, 2026 6pm-7pm Shift",
        localDate: "2026-09-04",
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses Chinese dates and Chinese time separators", () => {
    const result = parseTextImportBusyBlocks("8月1日 9点30-11点 排班", "Asia/Shanghai", {
      defaultYear: 2026
    });

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "8月1日 9点30-11点 排班",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "11:00",
        timezone: "Asia/Shanghai",
        confidence: 0.65
      }
    ]);
  });

  it("parses Chinese meridiem and bare o'clock ranges", () => {
    const result = parseTextImportBusyBlocks(
      "周三 下午2点-4点 Lab；周四 9点-11点 排班",
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "周三 下午2点-4点 Lab",
        dayOfWeek: 3,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Asia/Shanghai",
        confidence: 0.65
      },
      {
        sourceLabel: "周四 9点-11点 排班",
        dayOfWeek: 4,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Asia/Shanghai",
        confidence: 0.65
      }
    ]);
  });

  it("parses dotted time ranges without treating ISO dates as time ranges", () => {
    const result = parseTextImportBusyBlocks("2026-08-01 14.00-16.00 Lab", "Asia/Shanghai");

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-01 14.00-16.00 Lab",
        localDate: "2026-08-01",
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Asia/Shanghai",
        confidence: 0.65
      }
    ]);
  });

  it("keeps warning when month-day input has no default year", () => {
    const result = parseTextImportBusyBlocks("8/1 9-11 Work", "Australia/Sydney");

    expect(result.busyBlocks).toHaveLength(0);
    expect(result.warnings).toContain('Could not find a date or weekday in "8/1 9-11 Work".');
  });

  it("parses tab-separated timetable cells with weekday headers", () => {
    const result = parseTextImportBusyBlocks(
      ["时间\t周一\t周二\t周三", "09:00-11:00\tCOMP101\t\tLab", "14:00-16:00\t-\tShift\t休息"].join(
        "\n"
      ),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "COMP101 (周一 09:00-11:00)",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Lab (周三 09:00-11:00)",
        dayOfWeek: 3,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Shift (周二 14:00-16:00)",
        dayOfWeek: 2,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses comma-separated timetable cells with weekday headers", () => {
    const result = parseTextImportBusyBlocks(
      ["Time,Sat,Sun", "09:00-10:00,COMP101,free", "10:00-11:00,,Work"].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "COMP101 (Sat 09:00-10:00)",
        dayOfWeek: 6,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Work (Sun 10:00-11:00)",
        dayOfWeek: 0,
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses timetable cells under copied merged date headers", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Time\t2026-08-01\t\t2026-08-02\t",
        "\tRoom A\tRoom B\tRoom A\tRoom B",
        "09:00-10:00\tOpening\tWorkshop\tfree\tLab",
        "10:00-11:00\t\tOffice hours\tClass\t"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Opening (2026-08-01 Room A 09:00-10:00)",
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Workshop (2026-08-01 Room B 09:00-10:00)",
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Lab (2026-08-02 Room B 09:00-10:00)",
        localDate: "2026-08-02",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Office hours (2026-08-01 Room B 10:00-11:00)",
        localDate: "2026-08-01",
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Class (2026-08-02 Room A 10:00-11:00)",
        localDate: "2026-08-02",
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses timetable cells under nested weekday and time headers", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Day\tMon\tMon\tTue",
        "Time\t09:00-10:00\t10:00-11:00\t09:00-10:00",
        "Course\tCOMP101\t\tLab"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "COMP101 (Mon 09:00-10:00)",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Lab (Tue 09:00-10:00)",
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses timetable cells under split start and end header rows", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Date\t2026-08-03\t2026-08-03\t2026-08-04",
        "Room\tA\tB\tLab",
        "Start\t09:00\t10:00\t09:00",
        "End\t10:00\t11:00\t10:00",
        "Activity\tBriefing\t\tPractical"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Briefing (2026-08-03 A 09:00-10:00)",
        localDate: "2026-08-03",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Practical (2026-08-04 Lab 09:00-10:00)",
        localDate: "2026-08-04",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses side-by-side timetable regions with separate time columns", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Time\tSat\tSun\tTime\tSat\tSun",
        "09:00-10:00\tMorning class\t\t18:00-19:00\t\tNight shift",
        "10:00-11:00\t\tOffice\t19:00-20:00\tStudy\t"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Morning class (Sat 09:00-10:00)",
        dayOfWeek: 6,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Night shift (Sun 18:00-19:00)",
        dayOfWeek: 0,
        startTime: "18:00",
        endTime: "19:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Office (Sun 10:00-11:00)",
        dayOfWeek: 0,
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Study (Sat 19:00-20:00)",
        dayOfWeek: 6,
        startTime: "19:00",
        endTime: "20:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("ignores exported footer notes after pasted timetable tables", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Time,Sat",
        "09:00-10:00,COMP101",
        "Generated by ShiftDesk",
        "Total hours,1",
        "Page 1 of 1"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "COMP101 (Sat 09:00-10:00)",
        dayOfWeek: 6,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("ignores schedule title and summary notes around pasted roster tables", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Schedule for Week 1",
        "Date,Time,Title",
        "2026-08-03,09:00-10:00,Seminar",
        "Summary",
        "Printed from Scheduler"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-03 09:00-10:00 Seminar",
        localDate: "2026-08-03",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses row-oriented pasted roster tables", () => {
    const result = parseTextImportBusyBlocks(
      ["Start Date,Start Time,End Time,Subject", '2026-08-01,09:30,10:30,"Lab, group A"'].join(
        "\n"
      ),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-01 09:30-10:30 Lab, group A",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("skips exported title rows before row-oriented pasted roster headers", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Roster export\t\t\t",
        "Date\tTime\tTitle\tNotes",
        "2026-08-01\t09:00-10:00\tOpening\tRoom A"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-01 09:00-10:00 Opening Room A",
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses row-oriented tables with a single time range column", () => {
    const result = parseTextImportBusyBlocks(
      ["Date,Time,Title", "2026-08-01,09:30-10:30,Work shift"].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-01 09:30-10:30 Work shift",
        localDate: "2026-08-01",
        startTime: "09:30",
        endTime: "10:30",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses row-oriented weekday tables with a single time range column", () => {
    const result = parseTextImportBusyBlocks(
      ["Day,Time,Activity", "Thu,2pm-4pm,Tutorial"].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Thu 2pm-4pm Tutorial",
        dayOfWeek: 4,
        startTime: "14:00",
        endTime: "16:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("inherits blank merged date and time cells in row-oriented pasted tables", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Date,Time,Title",
        "2026-08-01,09:00-10:00,Opening",
        ",10:00-11:00,Workshop",
        ",,Office hours"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-01 09:00-10:00 Opening",
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "2026-08-01 10:00-11:00 Workshop",
        localDate: "2026-08-01",
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "2026-08-01 10:00-11:00 Office hours",
        localDate: "2026-08-01",
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("appends note-only continuation rows to the previous row-oriented pasted block", () => {
    const result = parseTextImportBusyBlocks(
      [
        "Date,Time,Title,Notes",
        "2026-08-01,09:00-10:00,Opening,Room A",
        ",,,Bring laptop",
        ",10:00-11:00,Workshop,",
        ",,,Projector ready"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "2026-08-01 09:00-10:00 Opening Room A Bring laptop",
        localDate: "2026-08-01",
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "2026-08-01 10:00-11:00 Workshop Projector ready",
        localDate: "2026-08-01",
        startTime: "10:00",
        endTime: "11:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses markdown-style timetable cells with date headers", () => {
    const result = parseTextImportBusyBlocks(
      ["| 8/1 周一 | 8/2 周二 |", "| --- | --- |", "| 09:00-10:00 | Work | Class |"].join("\n"),
      "Australia/Sydney",
      { defaultYear: 2026 }
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "Work (8/1 周一 09:00-10:00)",
        localDate: "2026-08-01",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      },
      {
        sourceLabel: "Class (8/2 周二 09:00-10:00)",
        localDate: "2026-08-02",
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "10:00",
        timezone: "Australia/Sydney",
        confidence: 0.7
      }
    ]);
  });

  it("uses explicit clock times beside course periods in pasted tables", () => {
    const result = parseTextImportBusyBlocks(
      ["节次\t时间\t周一", "第1-2节\t08:00-09:40\t高数"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "高数 (周一 08:00-09:40)",
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "09:40",
        timezone: "Asia/Shanghai",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("maps course periods without explicit clock times to the default timetable", () => {
    const result = parseTextImportBusyBlocks("周一 第1-2节 高数", "Asia/Shanghai");

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "周一 第1-2节 高数",
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "09:40",
        timezone: "Asia/Shanghai",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([
      "Class periods were interpreted using the default timetable; review if your school uses different period times."
    ]);
  });

  it("uses custom class period timetable definitions in free text", () => {
    const result = parseTextImportBusyBlocks(
      ["第1节 08:30-09:15", "第2节 09:25-10:10", "周一 第1-2节 高数"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "周一 第1-2节 高数",
        dayOfWeek: 1,
        startTime: "08:30",
        endTime: "10:10",
        timezone: "Asia/Shanghai",
        confidence: 0.65
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("maps course period rows in pasted timetable tables", () => {
    const result = parseTextImportBusyBlocks(
      ["节次\t周一", "第3-4节\t物理"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "物理 (周一 第3-4节)",
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "11:40",
        timezone: "Asia/Shanghai",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([
      "Class periods were interpreted using the default timetable; review if your school uses different period times."
    ]);
  });

  it("maps bare numeric ranges in course period table columns to class periods", () => {
    const result = parseTextImportBusyBlocks(
      ["节次\t周一", "3-4\t物理"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "物理 (周一 3-4)",
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "11:40",
        timezone: "Asia/Shanghai",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([
      "Class periods were interpreted using the default timetable; review if your school uses different period times."
    ]);
  });

  it("uses custom class period timetable definitions in pasted timetable tables", () => {
    const result = parseTextImportBusyBlocks(
      ["第1节\t08:30-09:15", "第2节\t09:25-10:10", "节次\t周一", "第1-2节\t高数"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "高数 (周一 第1-2节)",
        dayOfWeek: 1,
        startTime: "08:30",
        endTime: "10:10",
        timezone: "Asia/Shanghai",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("uses bare numeric custom class period timetable definitions", () => {
    const result = parseTextImportBusyBlocks(
      ["1\t08:30-09:15", "2\t09:25-10:10", "节次\t周一", "1-2\t高数"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result.busyBlocks).toEqual([
      {
        sourceLabel: "高数 (周一 1-2)",
        dayOfWeek: 1,
        startTime: "08:30",
        endTime: "10:10",
        timezone: "Asia/Shanghai",
        confidence: 0.7
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("warns when no busy blocks can be parsed", () => {
    const result = parseTextImportBusyBlocks("COMP101 lecture sometime", "Australia/Sydney");

    expect(result.busyBlocks).toEqual([]);
    expect(result.warnings).toEqual([
      'Could not find a time range in "COMP101 lecture sometime".',
      "No busy time blocks could be parsed from the pasted text."
    ]);
  });
});
