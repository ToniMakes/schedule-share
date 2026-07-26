import { loadRootEnv } from "./load-env.mjs";

loadRootEnv();

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const runId = new Date()
  .toISOString()
  .replaceAll(/[-:.TZ]/g, "")
  .slice(0, 14);

const createPayload = {
  title: `Smoke test ${runId}`,
  description: "End-to-end API smoke test",
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
};

await main();

async function main() {
  log(`Using ${baseUrl}`);

  const created = await requestJson("/api/schedules", {
    body: createPayload,
    expectedStatus: 201,
    method: "POST"
  });
  const publicId = created.schedule.publicId;
  const ownerKey = readQueryParam(created.ownerUrl, "key");

  assert(publicId.length > 0, "Created schedule response must include publicId.");
  assert(ownerKey.length > 0, "Created schedule response must include owner key.");
  log(`Created schedule ${publicId}`);

  const schedule = await requestJson(`/api/schedules/${encodeURIComponent(publicId)}`);
  assert(schedule.schedule.status === "open", "New schedule should be open.");
  assert(schedule.results.slotResults.length === 2, "Smoke schedule should generate two slots.");

  const firstSlot = schedule.results.slotResults[0];
  const secondSlot = schedule.results.slotResults[1];

  const participant = await requestJson(
    `/api/schedules/${encodeURIComponent(publicId)}/participants`,
    {
      body: {
        displayName: "Smoke Ada",
        availableSlots: [
          {
            startUtc: firstSlot.startUtc,
            endUtc: firstSlot.endUtc
          }
        ]
      },
      expectedStatus: 201,
      method: "POST"
    }
  );
  const participantId = participant.participant.id;
  const editKey = readQueryParam(participant.editUrl, "key");

  assert(participantId.length > 0, "Participant response must include id.");
  assert(editKey.length > 0, "Participant response must include edit key.");
  log(`Created participant ${participantId}`);

  const editView = await requestJson(
    `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
      participantId
    )}?${new URLSearchParams({ key: editKey }).toString()}`
  );
  assert(editView.participant.displayName === "Smoke Ada", "Edit view should return participant.");
  assert(
    editView.participant.availableSlots.length === 1,
    "Edit view should include selected slot."
  );

  const updated = await requestJson(
    `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
      participantId
    )}`,
    {
      body: {
        editKey,
        displayName: "Smoke Ada Updated",
        availableSlots: [
          {
            startUtc: secondSlot.startUtc,
            endUtc: secondSlot.endUtc
          }
        ]
      },
      method: "PUT"
    }
  );
  assert(
    updated.participant.displayName === "Smoke Ada Updated",
    "Updated participant should return the new display name."
  );
  log("Updated participant availability");

  const locked = await requestJson(`/api/schedules/${encodeURIComponent(publicId)}/lock`, {
    body: {
      ownerKey
    },
    method: "POST"
  });
  assert(locked.schedule.status === "locked", "Lock response should return locked status.");
  log("Locked schedule");

  await requestJson(`/api/schedules/${encodeURIComponent(publicId)}/participants`, {
    body: {
      displayName: "Late Smoke",
      availableSlots: []
    },
    expectedStatus: 409,
    method: "POST"
  });

  await requestJson(
    `/api/schedules/${encodeURIComponent(publicId)}/participants/${encodeURIComponent(
      participantId
    )}`,
    {
      body: {
        editKey,
        displayName: "Smoke Ada Too Late",
        availableSlots: []
      },
      expectedStatus: 409,
      method: "PUT"
    }
  );

  const finalSchedule = await requestJson(`/api/schedules/${encodeURIComponent(publicId)}`);
  assert(finalSchedule.schedule.status === "locked", "Public schedule should now be locked.");

  const archived = await requestJson(`/api/schedules/${encodeURIComponent(publicId)}/archive`, {
    body: {
      ownerKey
    },
    method: "POST"
  });
  assert(
    archived.schedule.status === "archived",
    "Archive response should return archived status."
  );
  log("Archived schedule");

  const archivedSchedule = await requestJson(`/api/schedules/${encodeURIComponent(publicId)}`);
  assert(
    archivedSchedule.schedule.status === "archived",
    "Public schedule should now be archived."
  );

  log("Smoke test passed");
}

async function requestJson(path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method ?? "GET",
    headers:
      options.body === undefined
        ? undefined
        : {
            "content-type": "application/json"
          },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const payload = await readJson(response);
  const expectedStatus = options.expectedStatus ?? 200;

  if (response.status !== expectedStatus) {
    throw new Error(
      `${options.method ?? "GET"} ${path} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(
        payload
      )}`
    );
  }

  return payload;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function readQueryParam(url, key) {
  return new URL(url).searchParams.get(key) ?? "";
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message) {
  console.log(`[smoke-api] ${message}`);
}
