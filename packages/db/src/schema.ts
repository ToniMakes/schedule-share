import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";

export const scheduleStatusValues = ["open", "locked", "archived"] as const;
export const scheduleStatusEnum = pgEnum("schedule_status", scheduleStatusValues);
export const scheduleModeValues = ["availability_grid", "candidate_poll"] as const;
export const scheduleModeEnum = pgEnum("schedule_mode", scheduleModeValues);
export const candidateVoteResponseValues = ["available", "maybe", "unavailable"] as const;
export const candidateVoteResponseEnum = pgEnum(
  "candidate_vote_response",
  candidateVoteResponseValues
);

export type ScheduleStatus = (typeof scheduleStatusValues)[number];
export type ScheduleMode = (typeof scheduleModeValues)[number];
export type CandidateVoteResponse = (typeof candidateVoteResponseValues)[number];

export interface StoredDailyWindow {
  readonly daysOfWeek?: readonly number[];
  readonly startTime: string;
  readonly endTime: string;
}

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    publicId: text("public_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    timezone: text("timezone").notNull(),
    dateRangeStart: date("date_range_start").notNull(),
    dateRangeEnd: date("date_range_end").notNull(),
    slotMinutes: integer("slot_minutes").notNull(),
    dailyWindows: jsonb("daily_windows").$type<readonly StoredDailyWindow[]>().notNull(),
    scheduleMode: scheduleModeEnum("schedule_mode").default("availability_grid").notNull(),
    finalStartUtc: timestamp("final_start_utc", { withTimezone: true }),
    finalEndUtc: timestamp("final_end_utc", { withTimezone: true }),
    ownerKeyHash: text("owner_key_hash").notNull(),
    status: scheduleStatusEnum("status").default("open").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => [
    index("schedules_expires_at_idx").on(table.expiresAt),
    unique("schedules_public_id_unique").on(table.publicId),
    check("schedules_title_not_empty", sql`length(trim(${table.title})) > 0`),
    check("schedules_public_id_not_empty", sql`length(trim(${table.publicId})) > 0`),
    check("schedules_timezone_not_empty", sql`length(trim(${table.timezone})) > 0`),
    check("schedules_owner_key_hash_not_empty", sql`length(trim(${table.ownerKeyHash})) > 0`),
    check("schedules_date_range_valid", sql`${table.dateRangeStart} <= ${table.dateRangeEnd}`),
    check("schedules_slot_minutes_supported", sql`${table.slotMinutes} IN (15, 30, 60)`),
    check(
      "schedules_final_time_valid",
      sql`(${table.finalStartUtc} IS NULL AND ${table.finalEndUtc} IS NULL) OR (${table.finalStartUtc} IS NOT NULL AND ${table.finalEndUtc} IS NOT NULL AND ${table.finalStartUtc} < ${table.finalEndUtc})`
    )
  ]
);

export const candidateTimeOptions = pgTable(
  "candidate_time_options",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    label: text("label"),
    slotStartUtc: timestamp("slot_start_utc", { withTimezone: true }).notNull(),
    slotEndUtc: timestamp("slot_end_utc", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("candidate_time_options_schedule_id_idx").on(table.scheduleId),
    unique("candidate_time_options_schedule_slot_unique").on(
      table.scheduleId,
      table.slotStartUtc,
      table.slotEndUtc
    ),
    check(
      "candidate_time_options_label_not_empty",
      sql`${table.label} IS NULL OR length(trim(${table.label})) > 0`
    ),
    check("candidate_time_options_range_valid", sql`${table.slotStartUtc} < ${table.slotEndUtc}`)
  ]
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    editKeyHash: text("edit_key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("participants_schedule_id_idx").on(table.scheduleId),
    unique("participants_id_schedule_id_unique").on(table.id, table.scheduleId),
    check("participants_display_name_not_empty", sql`length(trim(${table.displayName})) > 0`),
    check("participants_edit_key_hash_not_empty", sql`length(trim(${table.editKeyHash})) > 0`)
  ]
);

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
    slotStartUtc: timestamp("slot_start_utc", { withTimezone: true }).notNull(),
    slotEndUtc: timestamp("slot_end_utc", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("availability_slots_schedule_slot_idx").on(
      table.scheduleId,
      table.slotStartUtc,
      table.slotEndUtc
    ),
    index("availability_slots_participant_id_idx").on(table.participantId),
    unique("availability_slots_participant_slot_unique").on(
      table.participantId,
      table.slotStartUtc,
      table.slotEndUtc
    ),
    foreignKey({
      columns: [table.participantId, table.scheduleId],
      foreignColumns: [participants.id, participants.scheduleId],
      name: "availability_slots_participant_schedule_fk"
    }).onDelete("cascade"),
    check("availability_slots_range_valid", sql`${table.slotStartUtc} < ${table.slotEndUtc}`)
  ]
);

export const candidateVotes = pgTable(
  "candidate_votes",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
    candidateTimeOptionId: uuid("candidate_time_option_id")
      .notNull()
      .references(() => candidateTimeOptions.id, { onDelete: "cascade" }),
    response: candidateVoteResponseEnum("response").notNull(),
    preferenceRank: integer("preference_rank"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("candidate_votes_schedule_id_idx").on(table.scheduleId),
    index("candidate_votes_participant_id_idx").on(table.participantId),
    index("candidate_votes_candidate_time_option_id_idx").on(table.candidateTimeOptionId),
    unique("candidate_votes_participant_option_unique").on(
      table.participantId,
      table.candidateTimeOptionId
    ),
    foreignKey({
      columns: [table.participantId, table.scheduleId],
      foreignColumns: [participants.id, participants.scheduleId],
      name: "candidate_votes_participant_schedule_fk"
    }).onDelete("cascade"),
    check(
      "candidate_votes_preference_rank_valid",
      sql`${table.preferenceRank} IS NULL OR (${table.preferenceRank} >= 1 AND ${table.preferenceRank} <= 50)`
    )
  ]
);

export const schedulesRelations = relations(schedules, ({ many }) => ({
  candidateTimeOptions: many(candidateTimeOptions),
  participants: many(participants),
  availabilitySlots: many(availabilitySlots),
  candidateVotes: many(candidateVotes)
}));

export const candidateTimeOptionsRelations = relations(candidateTimeOptions, ({ many, one }) => ({
  schedule: one(schedules, {
    fields: [candidateTimeOptions.scheduleId],
    references: [schedules.id]
  }),
  candidateVotes: many(candidateVotes)
}));

export const participantsRelations = relations(participants, ({ many, one }) => ({
  schedule: one(schedules, {
    fields: [participants.scheduleId],
    references: [schedules.id]
  }),
  availabilitySlots: many(availabilitySlots),
  candidateVotes: many(candidateVotes)
}));

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  schedule: one(schedules, {
    fields: [availabilitySlots.scheduleId],
    references: [schedules.id]
  }),
  participant: one(participants, {
    fields: [availabilitySlots.participantId, availabilitySlots.scheduleId],
    references: [participants.id, participants.scheduleId]
  })
}));

export const candidateVotesRelations = relations(candidateVotes, ({ one }) => ({
  schedule: one(schedules, {
    fields: [candidateVotes.scheduleId],
    references: [schedules.id]
  }),
  participant: one(participants, {
    fields: [candidateVotes.participantId, candidateVotes.scheduleId],
    references: [participants.id, participants.scheduleId]
  }),
  candidateTimeOption: one(candidateTimeOptions, {
    fields: [candidateVotes.candidateTimeOptionId],
    references: [candidateTimeOptions.id]
  })
}));
