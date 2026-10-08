import http from "node:http";

const rawSlots = [
  ["2026-10-11T22:00:00.000Z", "2026-10-11T22:30:00.000Z", "09:00", "09:30"],
  ["2026-10-11T22:30:00.000Z", "2026-10-11T23:00:00.000Z", "09:30", "10:00"],
  ["2026-10-11T23:00:00.000Z", "2026-10-11T23:30:00.000Z", "10:00", "10:30"],
  ["2026-10-11T23:30:00.000Z", "2026-10-12T00:00:00.000Z", "10:30", "11:00"],
  ["2026-10-12T00:00:00.000Z", "2026-10-12T00:30:00.000Z", "11:00", "11:30"],
  ["2026-10-12T00:30:00.000Z", "2026-10-12T01:00:00.000Z", "11:30", "12:00"]
];
const slots = rawSlots.map(([startUtc, endUtc, localStartTime, localEndTime]) => ({
  startUtc,
  endUtc,
  timezone: "Australia/Sydney",
  localStartDate: "2026-10-12",
  localEndDate: "2026-10-12",
  localStartTime,
  localEndTime
}));
const countMap = [1, 1, 1, 1, 1, 0];
const schedule = {
  publicId: "demo-mobile",
  title: "Demo: Find a time across time zones",
  timezone: "Australia/Sydney",
  scheduleMode: "availability_grid",
  status: "open",
  description: null,
  dateRange: { start: "2026-10-12", end: "2026-10-12" },
  slotMinutes: 30,
  dailyWindows: [{ daysOfWeek: [1], startTime: "09:00", endTime: "12:00" }],
  candidateWindows: [],
  finalTime: null
};
let participants = [{ id: "demo-lin", displayName: "Lin" }];
function makeResult(slot, index) {
  const count = participants.length > 1 && [1, 2, 4].includes(index) ? 2 : countMap[index];
  return {
    ...slot,
    availableParticipantCount: count,
    availableParticipantIds: count === 2 ? ["demo-lin", "demo-user"] : count ? ["demo-lin"] : [],
    isEveryoneAvailable: count === participants.length
  };
}
function response() {
  const slotResults = slots.map(makeResult);
  const everyoneAvailableBlocks =
    participants.length > 1
      ? [
          {
            ...slots[1],
            endUtc: slots[3].endUtc,
            localEndTime: "10:30",
            slotCount: 2,
            availableParticipantCount: 2,
            availableParticipantIds: ["demo-lin", "demo-user"]
          },
          {
            ...slots[4],
            slotCount: 1,
            availableParticipantCount: 2,
            availableParticipantIds: ["demo-lin", "demo-user"]
          }
        ]
      : [];
  return {
    schedule,
    participants,
    results: {
      totalParticipantCount: participants.length,
      slotResults,
      everyoneAvailableSlots: slotResults.filter((slot) => slot.isEveryoneAvailable),
      everyoneAvailableBlocks,
      rankedSlots: [...slotResults].sort(
        (a, b) => b.availableParticipantCount - a.availableParticipantCount
      )
    }
  };
}
const server = http.createServer(async (request, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return res.writeHead(204).end();
  if (request.url === "/api/schedules/demo-mobile" && request.method === "GET") {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify(response()));
  }
  if (request.url === "/api/schedules/demo-mobile/participants" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    participants = [participants[0], { id: "demo-user", displayName: input.displayName }];
    res.setHeader("content-type", "application/json");
    return res.end(
      JSON.stringify({
        participant: participants[1],
        editUrl: "http://localhost:8765/s/demo-mobile/edit/demo-user?key=demo-edit-key"
      })
    );
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }));
});
server.listen(8765, "::", () => process.stdout.write("Local English demo API ready on :8765\n"));
