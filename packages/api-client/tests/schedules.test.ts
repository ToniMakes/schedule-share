import { describe, expect, it } from "vitest";

import {
  ApiClientError,
  archiveSchedule,
  archiveScheduleRequestSchema,
  availabilityPreviewRequestSchema,
  availabilityPreviewResponseSchema,
  availabilityTemplateSchema,
  confirmFinalTime,
  confirmFinalTimeRequestSchema,
  createParticipantAvailability,
  createParticipantAvailabilityRequestSchema,
  createSchedule,
  createScheduleRequestSchema,
  getParticipantAvailability,
  getParticipantAvailabilityResponseSchema,
  getSchedule,
  getScheduleResponseSchema,
  lockSchedule,
  lockScheduleRequestSchema,
  previewAvailability,
  previewAvailabilityCsv,
  previewAvailabilityIcs,
  previewAvailabilityImage,
  updateParticipantAvailability,
  updateParticipantAvailabilityRequestSchema
} from "../src";

describe("createScheduleRequestSchema", () => {
  it("trims user-facing text and validates allowed slot sizes", () => {
    const parsed = createScheduleRequestSchema.parse({
      title: "  周末聚餐  ",
      description: "  找时间  ",
      timezone: "Australia/Sydney",
      dateRange: {
        start: "2026-08-01",
        end: "2026-08-07"
      },
      slotMinutes: 30,
      dailyWindows: [
        {
          daysOfWeek: [0, 6],
          startTime: "09:00",
          endTime: "12:00"
        }
      ]
    });

    expect(parsed.title).toBe("周末聚餐");
    expect(parsed.description).toBe("找时间");
    expect(parsed.scheduleMode).toBe("availability_grid");
    expect(parsed.slotMinutes).toBe(30);
  });

  it("accepts candidate poll schedules with explicit UTC windows", () => {
    const parsed = createScheduleRequestSchema.parse({
      title: "Project sync",
      timezone: "Australia/Sydney",
      scheduleMode: "candidate_poll",
      slotMinutes: 60,
      candidateWindows: [
        {
          label: "  Option A  ",
          startUtc: "2026-08-03T08:00:00.000Z",
          endUtc: "2026-08-03T09:00:00.000Z"
        }
      ]
    });

    expect(parsed).toMatchObject({
      scheduleMode: "candidate_poll",
      candidateWindows: [
        {
          label: "Option A",
          startUtc: "2026-08-03T08:00:00.000Z",
          endUtc: "2026-08-03T09:00:00.000Z"
        }
      ]
    });
  });

  it("rejects candidate poll schedules without candidate windows", () => {
    expect(() =>
      createScheduleRequestSchema.parse({
        title: "Project sync",
        timezone: "Australia/Sydney",
        scheduleMode: "candidate_poll",
        slotMinutes: 60
      })
    ).toThrow();
  });

  it("rejects reversed date ranges", () => {
    expect(() =>
      createScheduleRequestSchema.parse({
        title: "周末聚餐",
        timezone: "Australia/Sydney",
        dateRange: {
          start: "2026-08-07",
          end: "2026-08-01"
        },
        slotMinutes: 30,
        dailyWindows: [
          {
            startTime: "09:00",
            endTime: "12:00"
          }
        ]
      })
    ).toThrow();
  });
});

describe("createSchedule", () => {
  it("posts the create schedule request and parses the response", async () => {
    const responsePayload = {
      schedule: {
        publicId: "abc123",
        title: "周末聚餐",
        timezone: "Australia/Sydney",
        scheduleMode: "availability_grid",
        status: "open"
      },
      shareUrl: "https://example.com/s/abc123",
      ownerUrl: "https://example.com/s/abc123/manage?key=secret"
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await createSchedule(
      {
        title: "周末聚餐",
        timezone: "Australia/Sydney",
        dateRange: {
          start: "2026-08-01",
          end: "2026-08-07"
        },
        slotMinutes: 30,
        dailyWindows: [
          {
            startTime: "09:00",
            endTime: "12:00"
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 201,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("posts candidate poll create schedule requests", async () => {
    const responsePayload = {
      schedule: {
        publicId: "candidate123",
        title: "Project sync",
        timezone: "Australia/Sydney",
        scheduleMode: "candidate_poll",
        status: "open"
      },
      shareUrl: "https://example.com/s/candidate123",
      ownerUrl: "https://example.com/s/candidate123/manage?key=secret"
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await createSchedule(
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
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 201,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("maps API error responses to ApiClientError", async () => {
    await expect(
      createSchedule(
        {
          title: "周末聚餐",
          timezone: "Australia/Sydney",
          dateRange: {
            start: "2026-08-01",
            end: "2026-08-07"
          },
          slotMinutes: 30,
          dailyWindows: [
            {
              startTime: "09:00",
              endTime: "12:00"
            }
          ]
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid request body."
                }
              }),
              {
                status: 400
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "VALIDATION_ERROR",
      status: 400
    } satisfies Partial<ApiClientError>);
  });
});

describe("getScheduleResponseSchema", () => {
  it("parses schedule detail responses with availability results", () => {
    const parsed = getScheduleResponseSchema.parse(buildScheduleDetailResponse());

    expect(parsed.schedule.publicId).toBe("abc123");
    expect(parsed.schedule.finalTime).toBeNull();
    expect(parsed.results.slotResults).toHaveLength(1);
    expect(parsed.results.everyoneAvailableBlocks[0]!.slotCount).toBe(1);
  });

  it("parses schedule detail responses with a final time", () => {
    const response = buildScheduleDetailResponse();
    response.schedule.finalTime = {
      startUtc: "2026-07-31T23:00:00.000Z",
      endUtc: "2026-07-31T23:30:00.000Z",
      timezone: "Australia/Sydney",
      localStartDate: "2026-08-01",
      localEndDate: "2026-08-01",
      localStartTime: "09:00",
      localEndTime: "09:30"
    };

    const parsed = getScheduleResponseSchema.parse(response);

    expect(parsed.schedule.finalTime?.localStartTime).toBe("09:00");
  });
});

describe("getSchedule", () => {
  it("fetches schedule details and parses the response", async () => {
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];
    const payload = buildScheduleDetailResponse();

    const result = await getSchedule("abc 123", {
      baseUrl: "https://example.com",
      fetch: async (input, init) => {
        calls.push({ input, init });
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        });
      }
    });

    expect(result).toEqual(payload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc%20123");
    expect(calls[0]!.init).toBeUndefined();
  });

  it("maps get schedule API errors to ApiClientError", async () => {
    await expect(
      getSchedule("missing", {
        fetch: async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "SCHEDULE_NOT_FOUND",
                message: "Schedule not found."
              }
            }),
            {
              status: 404
            }
          )
      })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "SCHEDULE_NOT_FOUND",
      status: 404
    } satisfies Partial<ApiClientError>);
  });
});

describe("createParticipantAvailabilityRequestSchema", () => {
  it("trims display name and accepts an empty availability list", () => {
    const parsed = createParticipantAvailabilityRequestSchema.parse({
      displayName: "  Ada  ",
      availableSlots: []
    });

    expect(parsed).toEqual({
      displayName: "Ada",
      availableSlots: []
    });
  });

  it("accepts candidate poll votes and rejects duplicate candidate options", () => {
    const parsed = createParticipantAvailabilityRequestSchema.parse({
      displayName: "  Ada  ",
      candidateVotes: [
        {
          candidateTimeOptionId: " option-1 ",
          preferenceRank: 1,
          response: "available"
        },
        {
          candidateTimeOptionId: "option-2",
          preferenceRank: 2,
          response: "maybe"
        },
        {
          candidateTimeOptionId: "option-3",
          response: "unavailable"
        }
      ]
    });

    expect(parsed).toEqual({
      displayName: "Ada",
      availableSlots: [],
      candidateVotes: [
        {
          candidateTimeOptionId: "option-1",
          preferenceRank: 1,
          response: "available"
        },
        {
          candidateTimeOptionId: "option-2",
          preferenceRank: 2,
          response: "maybe"
        },
        {
          candidateTimeOptionId: "option-3",
          response: "unavailable"
        }
      ]
    });

    expect(() =>
      createParticipantAvailabilityRequestSchema.parse({
        displayName: "Ada",
        candidateVotes: [
          {
            candidateTimeOptionId: "option-1",
            response: "available"
          },
          {
            candidateTimeOptionId: "option-1",
            response: "maybe"
          }
        ]
      })
    ).toThrow();

    expect(() =>
      createParticipantAvailabilityRequestSchema.parse({
        displayName: "Ada",
        candidateVotes: [
          {
            candidateTimeOptionId: "option-1",
            preferenceRank: 1,
            response: "available"
          },
          {
            candidateTimeOptionId: "option-2",
            preferenceRank: 1,
            response: "maybe"
          }
        ]
      })
    ).toThrow();

    expect(() =>
      createParticipantAvailabilityRequestSchema.parse({
        displayName: "Ada",
        candidateVotes: [
          {
            candidateTimeOptionId: "option-1",
            preferenceRank: 1,
            response: "unavailable"
          }
        ]
      })
    ).toThrow();
  });

  it("rejects availability slots with reversed ranges", () => {
    expect(() =>
      createParticipantAvailabilityRequestSchema.parse({
        displayName: "Ada",
        availableSlots: [
          {
            startUtc: "2026-08-01T08:30:00.000Z",
            endUtc: "2026-08-01T08:00:00.000Z"
          }
        ]
      })
    ).toThrow();
  });
});

describe("createParticipantAvailability", () => {
  it("posts participant availability and parses the response", async () => {
    const responsePayload = {
      participant: {
        id: "participant-1",
        displayName: "Ada"
      },
      editUrl: "https://example.com/s/abc123/edit/participant-1?key=secret"
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await createParticipantAvailability(
      "abc123",
      {
        displayName: "Ada",
        availableSlots: [
          {
            startUtc: "2026-08-01T08:00:00.000Z",
            endUtc: "2026-08-01T08:30:00.000Z"
          }
        ]
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 201,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/participants");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("maps participant API errors to ApiClientError", async () => {
    await expect(
      createParticipantAvailability(
        "abc123",
        {
          displayName: "Ada",
          availableSlots: []
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "SCHEDULE_LOCKED",
                  message: "This schedule no longer accepts changes."
                }
              }),
              {
                status: 409
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "SCHEDULE_LOCKED",
      status: 409
    } satisfies Partial<ApiClientError>);
  });
});

describe("getParticipantAvailabilityResponseSchema", () => {
  it("parses participant edit responses", () => {
    const parsed = getParticipantAvailabilityResponseSchema.parse(
      buildParticipantAvailabilityResponse()
    );

    expect(parsed.participant.displayName).toBe("Ada");
    expect(parsed.participant.availableSlots).toHaveLength(1);
    expect(parsed.participant.candidateVotes).toHaveLength(1);
    expect(parsed.slots).toHaveLength(1);
  });
});

describe("getParticipantAvailability", () => {
  it("fetches participant availability with an edit key", async () => {
    const payload = buildParticipantAvailabilityResponse();
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await getParticipantAvailability("abc123", "participant 1", "edit secret", {
      baseUrl: "https://example.com",
      fetch: async (input, init) => {
        calls.push({ input, init });
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        });
      }
    });

    expect(result).toEqual(payload);
    expect(calls[0]!.input).toBe(
      "https://example.com/api/schedules/abc123/participants/participant%201?key=edit+secret"
    );
    expect(calls[0]!.init).toBeUndefined();
  });
});

describe("updateParticipantAvailabilityRequestSchema", () => {
  it("trims display name and requires an edit key", () => {
    const parsed = updateParticipantAvailabilityRequestSchema.parse({
      editKey: "secret",
      displayName: "  Ada  ",
      availableSlots: []
    });

    expect(parsed.displayName).toBe("Ada");
    expect(parsed.editKey).toBe("secret");
  });
});

describe("updateParticipantAvailability", () => {
  it("puts participant availability updates and parses the response", async () => {
    const responsePayload = {
      participant: {
        id: "participant-1",
        displayName: "Ada Lovelace"
      }
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await updateParticipantAvailability(
      "abc123",
      "participant-1",
      {
        editKey: "secret",
        displayName: "Ada Lovelace",
        availableSlots: []
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls[0]!.input).toBe(
      "https://example.com/api/schedules/abc123/participants/participant-1"
    );
    expect(calls[0]!.init?.method).toBe("PUT");
  });

  it("maps update errors to ApiClientError", async () => {
    await expect(
      updateParticipantAvailability(
        "abc123",
        "participant-1",
        {
          editKey: "wrong",
          displayName: "Ada",
          availableSlots: []
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "INVALID_EDIT_KEY",
                  message: "Participant edit key is invalid."
                }
              }),
              {
                status: 403
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "INVALID_EDIT_KEY",
      status: 403
    } satisfies Partial<ApiClientError>);
  });
});

describe("availabilityPreviewRequestSchema", () => {
  it("accepts text import source text and defaults busy interpretation", () => {
    const parsed = availabilityPreviewRequestSchema.parse({
      method: "text_import",
      sourceText: "Mon 09:00-11:00 COMP101",
      timezone: "Australia/Sydney"
    });

    expect(parsed).toEqual({
      method: "text_import",
      sourceText: "Mon 09:00-11:00 COMP101",
      timezone: "Australia/Sydney",
      interpretsAs: "busy"
    });
  });

  it("requires either source text or structured busy blocks", () => {
    expect(() =>
      availabilityPreviewRequestSchema.parse({
        method: "text_import",
        timezone: "Australia/Sydney"
      })
    ).toThrow();
  });

  it("accepts image import structured busy blocks", () => {
    const parsed = availabilityPreviewRequestSchema.parse({
      method: "image_import",
      timezone: "Australia/Sydney",
      busyBlocks: [
        {
          sourceLabel: "Shift",
          localDate: "2026-08-01",
          startTime: "09:00",
          endTime: "11:00",
          timezone: "Australia/Sydney"
        }
      ]
    });

    expect(parsed.method).toBe("image_import");
    expect(parsed.busyBlocks).toHaveLength(1);
    expect(parsed.interpretsAs).toBe("busy");
  });

  it("accepts ICS import structured busy blocks", () => {
    const parsed = availabilityPreviewRequestSchema.parse({
      method: "ics_import",
      timezone: "Australia/Sydney",
      busyBlocks: [
        {
          sourceLabel: "Calendar event",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney"
        }
      ]
    });

    expect(parsed.method).toBe("ics_import");
    expect(parsed.busyBlocks).toHaveLength(1);
    expect(parsed.interpretsAs).toBe("busy");
  });

  it("accepts CSV import structured busy blocks", () => {
    const parsed = availabilityPreviewRequestSchema.parse({
      method: "csv_import",
      timezone: "Australia/Sydney",
      busyBlocks: [
        {
          sourceLabel: "CSV shift",
          localDate: "2026-08-01",
          startTime: "09:30",
          endTime: "10:30",
          timezone: "Australia/Sydney"
        }
      ]
    });

    expect(parsed.method).toBe("csv_import");
    expect(parsed.busyBlocks).toHaveLength(1);
    expect(parsed.interpretsAs).toBe("busy");
  });

  it("rejects image import source text without structured blocks", () => {
    expect(() =>
      availabilityPreviewRequestSchema.parse({
        method: "image_import",
        sourceText: "Mon 09:00-11:00",
        timezone: "Australia/Sydney"
      })
    ).toThrow();
  });

  it("accepts template preview requests with weekly windows", () => {
    const parsed = availabilityPreviewRequestSchema.parse({
      method: "template",
      timezone: "Australia/Sydney",
      template: {
        name: "Evenings",
        timezone: "Australia/Sydney",
        weeklyWindows: [
          {
            dayOfWeek: 1,
            startTime: "18:00",
            endTime: "21:00"
          }
        ]
      }
    });

    expect(parsed).toMatchObject({
      method: "template",
      interpretsAs: "busy",
      template: {
        name: "Evenings",
        weeklyWindows: [
          {
            dayOfWeek: 1,
            startTime: "18:00",
            endTime: "21:00"
          }
        ]
      }
    });
  });

  it("rejects template preview requests without a template", () => {
    expect(() =>
      availabilityPreviewRequestSchema.parse({
        method: "template",
        timezone: "Australia/Sydney"
      })
    ).toThrow();
  });
});

describe("availabilityTemplateSchema", () => {
  it("validates weekly template windows", () => {
    const parsed = availabilityTemplateSchema.parse({
      name: "Weeknight study",
      timezone: "Australia/Sydney",
      weeklyWindows: [
        {
          dayOfWeek: 3,
          startTime: "18:00",
          endTime: "21:00"
        }
      ]
    });

    expect(parsed.weeklyWindows[0]!.dayOfWeek).toBe(3);
  });

  it("rejects empty or zero-length template windows", () => {
    expect(() =>
      availabilityTemplateSchema.parse({
        timezone: "Australia/Sydney",
        weeklyWindows: []
      })
    ).toThrow();

    expect(() =>
      availabilityTemplateSchema.parse({
        timezone: "Australia/Sydney",
        weeklyWindows: [
          {
            dayOfWeek: 3,
            startTime: "18:00",
            endTime: "18:00"
          }
        ]
      })
    ).toThrow();
  });
});

describe("availabilityPreviewResponseSchema", () => {
  it("parses availability draft preview responses", () => {
    const parsed = availabilityPreviewResponseSchema.parse({
      entryMethod: "text_import",
      busyBlocks: [
        {
          sourceLabel: "COMP101",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "11:00",
          timezone: "Australia/Sydney",
          confidence: 0.8
        }
      ],
      availableSlots: [
        {
          startUtc: "2026-08-01T08:00:00.000Z",
          endUtc: "2026-08-01T08:30:00.000Z"
        }
      ],
      warnings: [],
      confidence: 0.8
    });

    expect(parsed.entryMethod).toBe("text_import");
    expect(parsed.busyBlocks[0]!.sourceLabel).toBe("COMP101");
  });
});

describe("previewAvailability", () => {
  it("posts a text import preview request and parses the draft", async () => {
    const responsePayload = {
      entryMethod: "text_import",
      busyBlocks: [],
      availableSlots: [],
      warnings: ["No busy blocks were found; all generated schedule slots remain selected."]
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await previewAvailability(
      "abc123",
      {
        method: "text_import",
        sourceText: "Mon 09:00-11:00 COMP101",
        timezone: "Australia/Sydney"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/availability-preview");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("posts a template preview request and parses the draft", async () => {
    const responsePayload = {
      entryMethod: "template",
      busyBlocks: [],
      availableSlots: [
        {
          startUtc: "2026-08-01T08:00:00.000Z",
          endUtc: "2026-08-01T08:30:00.000Z"
        }
      ],
      warnings: []
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await previewAvailability(
      "abc123",
      {
        method: "template",
        timezone: "Australia/Sydney",
        template: {
          timezone: "Australia/Sydney",
          weeklyWindows: [
            {
              dayOfWeek: 6,
              startTime: "18:00",
              endTime: "21:00"
            }
          ]
        }
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/availability-preview");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("maps preview API errors to ApiClientError", async () => {
    await expect(
      previewAvailability(
        "abc123",
        {
          method: "text_import",
          sourceText: "Mon 09:00-11:00 COMP101",
          timezone: "Australia/Sydney"
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "UNSUPPORTED_ENTRY_METHOD",
                  message: "Unsupported availability entry method."
                }
              }),
              {
                status: 400
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "UNSUPPORTED_ENTRY_METHOD",
      status: 400
    } satisfies Partial<ApiClientError>);
  });
});

describe("previewAvailabilityImage", () => {
  it("posts a multipart image import preview request and parses the draft", async () => {
    const responsePayload = {
      entryMethod: "image_import",
      busyBlocks: [],
      availableSlots: [],
      warnings: ["Review image import before submitting."]
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await previewAvailabilityImage(
      "abc123",
      {
        file: new File([new Uint8Array([1, 2, 3])], "timetable.png", {
          type: "image/png"
        }),
        timezone: "Australia/Sydney"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/availability-preview");
    expect(calls[0]!.init?.method).toBe("POST");
    expect(calls[0]!.init?.body).toBeInstanceOf(FormData);
  });

  it("maps image preview API errors to ApiClientError", async () => {
    await expect(
      previewAvailabilityImage(
        "abc123",
        {
          file: new File([new Uint8Array([1])], "timetable.png", {
            type: "image/png"
          }),
          timezone: "Australia/Sydney"
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "IMPORT_PROVIDER_UNAVAILABLE",
                  message: "Image import provider is not configured."
                }
              }),
              {
                status: 503
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "IMPORT_PROVIDER_UNAVAILABLE",
      status: 503
    } satisfies Partial<ApiClientError>);
  });
});

describe("previewAvailabilityIcs", () => {
  it("posts a multipart ICS import preview request and parses the draft", async () => {
    const responsePayload = {
      entryMethod: "ics_import",
      busyBlocks: [],
      availableSlots: [],
      warnings: ["Review calendar import before submitting."]
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await previewAvailabilityIcs(
      "abc123",
      {
        file: new File(["BEGIN:VCALENDAR\nEND:VCALENDAR"], "calendar.ics", {
          type: "text/calendar"
        }),
        timezone: "Australia/Sydney"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/availability-preview");
    expect(calls[0]!.init?.method).toBe("POST");
    expect(calls[0]!.init?.body).toBeInstanceOf(FormData);
  });

  it("maps ICS preview API errors to ApiClientError", async () => {
    await expect(
      previewAvailabilityIcs(
        "abc123",
        {
          file: new File(["not calendar"], "calendar.txt", {
            type: "text/plain"
          }),
          timezone: "Australia/Sydney"
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "IMPORT_UNSUPPORTED_FILE_TYPE",
                  message: "ICS import supports .ics calendar files."
                }
              }),
              {
                status: 415
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "IMPORT_UNSUPPORTED_FILE_TYPE",
      status: 415
    } satisfies Partial<ApiClientError>);
  });
});

describe("previewAvailabilityCsv", () => {
  it("posts a multipart CSV import preview request and parses the draft", async () => {
    const responsePayload = {
      entryMethod: "csv_import",
      busyBlocks: [],
      availableSlots: [],
      warnings: ["Review CSV import before submitting."]
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await previewAvailabilityCsv(
      "abc123",
      {
        file: new File(["Date,Start,End,Title"], "schedule.csv", {
          type: "text/csv"
        }),
        timezone: "Australia/Sydney"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/availability-preview");
    expect(calls[0]!.init?.method).toBe("POST");
    expect(calls[0]!.init?.body).toBeInstanceOf(FormData);
  });

  it("maps CSV preview API errors to ApiClientError", async () => {
    await expect(
      previewAvailabilityCsv(
        "abc123",
        {
          file: new File(["not csv"], "schedule.txt", {
            type: "text/plain"
          }),
          timezone: "Australia/Sydney"
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "IMPORT_UNSUPPORTED_FILE_TYPE",
                  message: "CSV import supports .csv files."
                }
              }),
              {
                status: 415
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "IMPORT_UNSUPPORTED_FILE_TYPE",
      status: 415
    } satisfies Partial<ApiClientError>);
  });
});

describe("lockScheduleRequestSchema", () => {
  it("requires an owner key", () => {
    expect(lockScheduleRequestSchema.parse({ ownerKey: "owner-secret" })).toEqual({
      ownerKey: "owner-secret"
    });
    expect(() => lockScheduleRequestSchema.parse({ ownerKey: "" })).toThrow();
  });
});

describe("lockSchedule", () => {
  it("posts owner key and parses locked status", async () => {
    const responsePayload = {
      schedule: {
        publicId: "abc123",
        status: "locked"
      }
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await lockSchedule(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/lock");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("maps owner key errors to ApiClientError", async () => {
    await expect(
      lockSchedule(
        "abc123",
        {
          ownerKey: "wrong"
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "INVALID_OWNER_KEY",
                  message: "Owner key is invalid."
                }
              }),
              {
                status: 403
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<ApiClientError>);
  });
});

describe("confirmFinalTimeRequestSchema", () => {
  it("requires an owner key and valid UTC range", () => {
    expect(
      confirmFinalTimeRequestSchema.parse({
        ownerKey: "owner-secret",
        startUtc: "2026-07-31T23:00:00.000Z",
        endUtc: "2026-07-31T23:30:00.000Z"
      })
    ).toEqual({
      ownerKey: "owner-secret",
      startUtc: "2026-07-31T23:00:00.000Z",
      endUtc: "2026-07-31T23:30:00.000Z"
    });

    expect(() =>
      confirmFinalTimeRequestSchema.parse({
        ownerKey: "owner-secret",
        startUtc: "2026-07-31T23:30:00.000Z",
        endUtc: "2026-07-31T23:00:00.000Z"
      })
    ).toThrow();
  });
});

describe("confirmFinalTime", () => {
  it("posts final time and parses locked status", async () => {
    const responsePayload = {
      schedule: {
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
      }
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await confirmFinalTime(
      "abc123",
      {
        ownerKey: "owner-secret",
        startUtc: "2026-07-31T23:00:00.000Z",
        endUtc: "2026-07-31T23:30:00.000Z"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/final-time");
    expect(calls[0]!.init?.method).toBe("POST");
  });
});

describe("archiveScheduleRequestSchema", () => {
  it("requires an owner key", () => {
    expect(archiveScheduleRequestSchema.parse({ ownerKey: "owner-secret" })).toEqual({
      ownerKey: "owner-secret"
    });
    expect(() => archiveScheduleRequestSchema.parse({ ownerKey: "" })).toThrow();
  });
});

describe("archiveSchedule", () => {
  it("posts owner key and parses archived status", async () => {
    const responsePayload = {
      schedule: {
        publicId: "abc123",
        status: "archived"
      }
    };
    const calls: Array<{ readonly input: RequestInfo | URL; readonly init?: RequestInit }> = [];

    const result = await archiveSchedule(
      "abc123",
      {
        ownerKey: "owner-secret"
      },
      {
        baseUrl: "https://example.com",
        fetch: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          });
        }
      }
    );

    expect(result).toEqual(responsePayload);
    expect(calls[0]!.input).toBe("https://example.com/api/schedules/abc123/archive");
    expect(calls[0]!.init?.method).toBe("POST");
  });

  it("maps archive owner key errors to ApiClientError", async () => {
    await expect(
      archiveSchedule(
        "abc123",
        {
          ownerKey: "wrong"
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: "INVALID_OWNER_KEY",
                  message: "Owner key is invalid."
                }
              }),
              {
                status: 403
              }
            )
        }
      )
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "INVALID_OWNER_KEY",
      status: 403
    } satisfies Partial<ApiClientError>);
  });
});

function buildScheduleDetailResponse() {
  const slot = {
    startUtc: "2026-07-31T23:00:00.000Z",
    endUtc: "2026-07-31T23:30:00.000Z",
    timezone: "Australia/Sydney",
    localStartDate: "2026-08-01",
    localEndDate: "2026-08-01",
    localStartTime: "09:00",
    localEndTime: "09:30",
    availableParticipantCount: 1,
    availableParticipantIds: ["participant-1"],
    maybeParticipantCount: 0,
    maybeParticipantIds: [],
    isEveryoneAvailable: true
  };

  return {
    schedule: {
      publicId: "abc123",
      title: "Team dinner",
      description: null,
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
          endTime: "09:30"
        }
      ],
      candidateWindows: [],
      finalTime: null,
      status: "open"
    },
    participants: [
      {
        id: "participant-1",
        displayName: "Ada"
      }
    ],
    results: {
      totalParticipantCount: 1,
      slotResults: [slot],
      everyoneAvailableSlots: [slot],
      everyoneAvailableBlocks: [
        {
          startUtc: slot.startUtc,
          endUtc: slot.endUtc,
          timezone: slot.timezone,
          localStartDate: slot.localStartDate,
          localEndDate: slot.localEndDate,
          localStartTime: slot.localStartTime,
          localEndTime: slot.localEndTime,
          availableParticipantCount: slot.availableParticipantCount,
          availableParticipantIds: slot.availableParticipantIds,
          slotCount: 1
        }
      ],
      rankedSlots: [slot]
    }
  };
}

function buildParticipantAvailabilityResponse() {
  const schedule = buildScheduleDetailResponse().schedule;
  const slot = {
    startUtc: "2026-07-31T23:00:00.000Z",
    endUtc: "2026-07-31T23:30:00.000Z",
    timezone: "Australia/Sydney",
    localStartDate: "2026-08-01",
    localEndDate: "2026-08-01",
    localStartTime: "09:00",
    localEndTime: "09:30"
  };

  return {
    schedule,
    participant: {
      id: "participant-1",
      displayName: "Ada",
      availableSlots: [
        {
          startUtc: slot.startUtc,
          endUtc: slot.endUtc
        }
      ],
      candidateVotes: [
        {
          candidateTimeOptionId: "option-1",
          response: "maybe"
        }
      ]
    },
    slots: [slot]
  };
}
