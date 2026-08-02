import { describe, expect, it } from "vitest";

import { parseCsvImportBusyBlocks } from "./csv-import";

describe("parseCsvImportBusyBlocks", () => {
  it("parses timetable-style CSV files into busy blocks", () => {
    const result = parseCsvImportBusyBlocks(
      ["Time,Sat", "09:00-10:00,COMP101", "10:00-11:00,free"].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "COMP101 (Sat 09:00-10:00)",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses timetable-style CSV files with copied merged date headers", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Time,2026-08-01,,2026-08-02,",
        ",Room A,Room B,Room A,Room B",
        "09:00-10:00,Opening,Workshop,free,Lab",
        "10:00-11:00,,Office hours,Class,"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Opening (2026-08-01 Room A 09:00-10:00)",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Workshop (2026-08-01 Room B 09:00-10:00)",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Lab (2026-08-02 Room B 09:00-10:00)",
          localDate: "2026-08-02",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Office hours (2026-08-01 Room B 10:00-11:00)",
          localDate: "2026-08-01",
          startTime: "10:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Class (2026-08-02 Room A 10:00-11:00)",
          localDate: "2026-08-02",
          startTime: "10:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses timetable-style CSV files with nested date and time headers", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Date,2026-08-03,2026-08-03,2026-08-04",
        "Time,09:00-10:00,10:00-11:00,09:00-10:00",
        "Activity,Briefing,,Lab"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Briefing (2026-08-03 09:00-10:00)",
          localDate: "2026-08-03",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Lab (2026-08-04 09:00-10:00)",
          localDate: "2026-08-04",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses timetable-style CSV files with split start and end header rows", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Date,2026-08-03,2026-08-03,2026-08-04",
        "Room,A,B,Lab",
        "Start,09:00,10:00,09:00",
        "End,10:00,11:00,10:00",
        "Activity,Briefing,,Practical"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Briefing (2026-08-03 A 09:00-10:00)",
          localDate: "2026-08-03",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Practical (2026-08-04 Lab 09:00-10:00)",
          localDate: "2026-08-04",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses side-by-side timetable CSV regions with separate time columns", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Time,Sat,Sun,Time,Sat,Sun",
        "09:00-10:00,Morning class,,18:00-19:00,,Night shift",
        "10:00-11:00,,Office,19:00-20:00,Study,"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Morning class (Sat 09:00-10:00)",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Night shift (Sun 18:00-19:00)",
          dayOfWeek: 0,
          startTime: "18:00",
          endTime: "19:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Office (Sun 10:00-11:00)",
          dayOfWeek: 0,
          startTime: "10:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "Study (Sat 19:00-20:00)",
          dayOfWeek: 6,
          startTime: "19:00",
          endTime: "20:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("ignores exported footer rows after timetable CSV data", () => {
    const result = parseCsvImportBusyBlocks(
      ["Time,Sat", "09:00-10:00,COMP101", "Generated by ShiftDesk", "Total hours,1"].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "COMP101 (Sat 09:00-10:00)",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("ignores schedule title and summary rows around row-oriented CSV data", () => {
    const result = parseCsvImportBusyBlocks(
      ["Schedule for Week 1", "Date,Time,Title", "2026-08-03,09:00-10:00,Seminar", "Summary"].join(
        "\n"
      ),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-03 09:00-10:00 Seminar",
          localDate: "2026-08-03",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses row-oriented shift CSV files into busy blocks", () => {
    const result = parseCsvImportBusyBlocks(
      ["Date,Start,End,Title", "2026-08-01,09:30,10:30,Work shift"].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:30-10:30 Work shift",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("skips exported title rows before row-oriented CSV headers", () => {
    const result = parseCsvImportBusyBlocks(
      ["Roster export,,,", "Date,Time,Title,Notes", "2026-08-01,09:00-10:00,Opening,Room A"].join(
        "\n"
      ),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:00-10:00 Opening Room A",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses row-oriented shift CSV files with a single time range column", () => {
    const result = parseCsvImportBusyBlocks(
      ["Date,Time,Title", "2026-08-01,09:30-10:30,Work shift"].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:30-10:30 Work shift",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("handles quoted cells with commas", () => {
    const result = parseCsvImportBusyBlocks(
      ["Date,Start,End,Title", '2026-08-01,09:30,10:30,"Lab, group A"'].join("\n"),
      "Australia/Sydney"
    );

    expect(result.busyBlocks[0]).toMatchObject({
      sourceLabel: "2026-08-01 09:30-10:30 Lab, group A",
      localDate: "2026-08-01",
      startTime: "09:30",
      endTime: "10:30"
    });
  });

  it("parses common exported roster headers", () => {
    const result = parseCsvImportBusyBlocks(
      ["Day of Week,Shift Start,Shift End,Activity", "Sat,09:00,10:00,Front desk"].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Sat 09:00-10:00 Front desk",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("parses common exported roster headers with a single time range column", () => {
    const result = parseCsvImportBusyBlocks(
      ["Day of Week,Time,Activity", "Sat,09:00-10:00,Front desk"].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Sat 09:00-10:00 Front desk",
          dayOfWeek: 6,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("maps row-oriented CSV period columns to the default class timetable", () => {
    const result = parseCsvImportBusyBlocks(
      ["Day of Week,Period,Activity", "Mon,1-2 periods,COMP101"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result).toMatchObject({
      confidence: 0.68,
      warnings: [
        "Class periods were interpreted using the default timetable; review if your school uses different period times."
      ],
      busyBlocks: [
        {
          sourceLabel: "Mon 1-2 periods COMP101",
          dayOfWeek: 1,
          startTime: "08:00",
          endTime: "09:40",
          timezone: "Asia/Shanghai",
          confidence: 0.75
        }
      ]
    });
  });

  it("maps bare numeric ranges in row-oriented CSV period columns to class periods", () => {
    const result = parseCsvImportBusyBlocks(
      ["Day of Week,Period,Activity", "Mon,1-2,COMP101"].join("\n"),
      "Asia/Shanghai"
    );

    expect(result).toMatchObject({
      confidence: 0.68,
      warnings: [
        "Class periods were interpreted using the default timetable; review if your school uses different period times."
      ],
      busyBlocks: [
        {
          sourceLabel: "Mon 1-2 periods COMP101",
          dayOfWeek: 1,
          startTime: "08:00",
          endTime: "09:40",
          timezone: "Asia/Shanghai",
          confidence: 0.75
        }
      ]
    });
  });

  it("uses custom class period timetable definitions in CSV files", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Period,Time",
        "Period 1,08:30-09:15",
        "Period 2,09:25-10:10",
        "Day of Week,Period,Activity",
        "Mon,1-2 periods,COMP101"
      ].join("\n"),
      "Asia/Shanghai"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Mon 1-2 periods COMP101",
          dayOfWeek: 1,
          startTime: "08:30",
          endTime: "10:10",
          timezone: "Asia/Shanghai",
          confidence: 0.75
        }
      ]
    });
  });

  it("uses bare numeric custom class period timetable definitions in CSV files", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Period,Time",
        "1,08:30-09:15",
        "2,09:25-10:10",
        "Day of Week,Period,Activity",
        "Mon,1-2,COMP101"
      ].join("\n"),
      "Asia/Shanghai"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "Mon 1-2 COMP101",
          dayOfWeek: 1,
          startTime: "08:30",
          endTime: "10:10",
          timezone: "Asia/Shanghai",
          confidence: 0.75
        }
      ]
    });
  });

  it("inherits blank merged date and time cells in row-oriented CSV files", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Date,Time,Title",
        "2026-08-01,09:00-10:00,Opening",
        ",10:00-11:00,Workshop",
        ",,Office hours"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:00-10:00 Opening",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "2026-08-01 10:00-11:00 Workshop",
          localDate: "2026-08-01",
          startTime: "10:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "2026-08-01 10:00-11:00 Office hours",
          localDate: "2026-08-01",
          startTime: "10:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("appends note-only continuation rows to the previous row-oriented CSV block", () => {
    const result = parseCsvImportBusyBlocks(
      [
        "Date,Time,Title,Notes",
        "2026-08-01,09:00-10:00,Opening,Room A",
        ",,,Bring laptop",
        ",10:00-11:00,Workshop,",
        ",,,Projector ready"
      ].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:00-10:00 Opening Room A Bring laptop",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        },
        {
          sourceLabel: "2026-08-01 10:00-11:00 Workshop Projector ready",
          localDate: "2026-08-01",
          startTime: "10:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("normalizes quoted multi-line row-oriented CSV notes into one label", () => {
    const result = parseCsvImportBusyBlocks(
      ["Date,Time,Title,Notes", '2026-08-01,09:00-10:00,Opening,"Room A\nBring laptop"'].join("\n"),
      "Australia/Sydney"
    );

    expect(result).toMatchObject({
      confidence: 0.75,
      warnings: [],
      busyBlocks: [
        {
          sourceLabel: "2026-08-01 09:00-10:00 Opening Room A Bring laptop",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "10:00",
          timezone: "Australia/Sydney",
          confidence: 0.75
        }
      ]
    });
  });

  it("returns warnings when no busy blocks can be parsed", () => {
    const result = parseCsvImportBusyBlocks("Name,Notes\nAda,No times here", "Australia/Sydney");

    expect(result.busyBlocks).toEqual([]);
    expect(result.warnings).toContain("No busy time blocks could be parsed from the CSV file.");
  });
});
