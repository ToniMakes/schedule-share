import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { availabilitySlots, participants, schedules } from "./schema";

export type ScheduleRecord = InferSelectModel<typeof schedules>;
export type NewScheduleRecord = InferInsertModel<typeof schedules>;

export type ParticipantRecord = InferSelectModel<typeof participants>;
export type NewParticipantRecord = InferInsertModel<typeof participants>;

export type AvailabilitySlotRecord = InferSelectModel<typeof availabilitySlots>;
export type NewAvailabilitySlotRecord = InferInsertModel<typeof availabilitySlots>;
