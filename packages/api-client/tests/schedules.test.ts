import { describe, expect, it } from "vitest";

import {
  ApiClientError,
  archiveSchedule,
  archiveScheduleRequestSchema,
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
    expect(parsed.slotMinutes).toBe(30);
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
    expect(parsed.results.slotResults).toHaveLength(1);
    expect(parsed.results.everyoneAvailableBlocks[0]!.slotCount).toBe(1);
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
    isEveryoneAvailable: true
  };

  return {
    schedule: {
      publicId: "abc123",
      title: "Team dinner",
      description: null,
      timezone: "Australia/Sydney",
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
      ]
    },
    slots: [slot]
  };
}
