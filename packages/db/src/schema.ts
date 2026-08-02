import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
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
export const aiRecognitionCreditSourceValues = [
  "free_quota",
  "rewarded_ad",
  "admin",
  "refund"
] as const;
export const aiRecognitionCreditSourceEnum = pgEnum(
  "ai_recognition_credit_source",
  aiRecognitionCreditSourceValues
);
export const aiRecognitionAttemptStatusValues = [
  "started",
  "succeeded",
  "low_confidence",
  "provider_unavailable",
  "failed",
  "refunded"
] as const;
export const aiRecognitionAttemptStatusEnum = pgEnum(
  "ai_recognition_attempt_status",
  aiRecognitionAttemptStatusValues
);
export const rewardedAdVerificationStatusValues = [
  "pending",
  "verified",
  "rejected",
  "duplicate"
] as const;
export const rewardedAdVerificationStatusEnum = pgEnum(
  "rewarded_ad_verification_status",
  rewardedAdVerificationStatusValues
);

export type ScheduleStatus = (typeof scheduleStatusValues)[number];
export type ScheduleMode = (typeof scheduleModeValues)[number];
export type CandidateVoteResponse = (typeof candidateVoteResponseValues)[number];
export type AiRecognitionCreditSource = (typeof aiRecognitionCreditSourceValues)[number];
export type AiRecognitionAttemptStatus = (typeof aiRecognitionAttemptStatusValues)[number];
export type RewardedAdVerificationStatus = (typeof rewardedAdVerificationStatusValues)[number];

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

export const aiRecognitionCreditGrants = pgTable(
  "ai_recognition_credit_grants",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    scopeType: text("scope_type").notNull(),
    scopeIdHash: text("scope_id_hash").notNull(),
    scheduleId: uuid("schedule_id").references(() => schedules.id, { onDelete: "cascade" }),
    source: aiRecognitionCreditSourceEnum("source").notNull(),
    provider: text("provider").notNull(),
    providerEventIdHash: text("provider_event_id_hash"),
    creditsGranted: integer("credits_granted").notNull(),
    creditsRemaining: integer("credits_remaining").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("ai_credit_grants_scope_idx").on(table.scopeType, table.scopeIdHash),
    index("ai_credit_grants_schedule_id_idx").on(table.scheduleId),
    index("ai_credit_grants_expires_at_idx").on(table.expiresAt),
    unique("ai_credit_grants_provider_event_unique").on(table.provider, table.providerEventIdHash),
    check("ai_credit_grants_scope_type_not_empty", sql`length(trim(${table.scopeType})) > 0`),
    check("ai_credit_grants_scope_id_hash_not_empty", sql`length(trim(${table.scopeIdHash})) > 0`),
    check("ai_credit_grants_provider_not_empty", sql`length(trim(${table.provider})) > 0`),
    check(
      "ai_credit_grants_event_hash_not_empty",
      sql`${table.providerEventIdHash} IS NULL OR length(trim(${table.providerEventIdHash})) > 0`
    ),
    check("ai_credit_grants_positive_credits", sql`${table.creditsGranted} > 0`),
    check(
      "ai_credit_grants_remaining_valid",
      sql`${table.creditsRemaining} >= 0 AND ${table.creditsRemaining} <= ${table.creditsGranted}`
    )
  ]
);

export const aiRecognitionAttempts = pgTable(
  "ai_recognition_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id"),
    creditGrantId: uuid("credit_grant_id")
      .notNull()
      .references(() => aiRecognitionCreditGrants.id, { onDelete: "restrict" }),
    entryMethod: text("entry_method").default("image_import").notNull(),
    imageMimeType: text("image_mime_type").notNull(),
    imageByteSize: integer("image_byte_size").notNull(),
    model: text("model").notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }).notNull(),
    status: aiRecognitionAttemptStatusEnum("status").default("started").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("ai_recognition_attempts_schedule_id_idx").on(table.scheduleId),
    index("ai_recognition_attempts_participant_id_idx").on(table.participantId),
    index("ai_recognition_attempts_credit_grant_id_idx").on(table.creditGrantId),
    index("ai_recognition_attempts_created_at_idx").on(table.createdAt),
    foreignKey({
      columns: [table.participantId, table.scheduleId],
      foreignColumns: [participants.id, participants.scheduleId],
      name: "ai_recognition_attempts_participant_schedule_fk"
    }).onDelete("cascade"),
    check("ai_recognition_attempts_entry_method_valid", sql`${table.entryMethod} = 'image_import'`),
    check(
      "ai_recognition_attempts_mime_type_not_empty",
      sql`length(trim(${table.imageMimeType})) > 0`
    ),
    check("ai_recognition_attempts_byte_size_positive", sql`${table.imageByteSize} > 0`),
    check("ai_recognition_attempts_model_not_empty", sql`length(trim(${table.model})) > 0`),
    check("ai_recognition_attempts_cost_nonnegative", sql`${table.estimatedCostUsd} >= 0`)
  ]
);

export const rewardedAdVerifications = pgTable(
  "rewarded_ad_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    provider: text("provider").notNull(),
    adUnitId: text("ad_unit_id").notNull(),
    rewardEventIdHash: text("reward_event_id_hash").notNull(),
    scopeIdHash: text("scope_id_hash").notNull(),
    verificationStatus: rewardedAdVerificationStatusEnum("verification_status")
      .default("pending")
      .notNull(),
    grossRevenueUsd: numeric("gross_revenue_usd", { precision: 10, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("rewarded_ad_verifications_scope_idx").on(table.scopeIdHash),
    index("rewarded_ad_verifications_status_idx").on(table.verificationStatus),
    unique("rewarded_ad_verifications_event_unique").on(
      table.provider,
      table.adUnitId,
      table.rewardEventIdHash
    ),
    check("rewarded_ad_verifications_provider_not_empty", sql`length(trim(${table.provider})) > 0`),
    check("rewarded_ad_verifications_ad_unit_not_empty", sql`length(trim(${table.adUnitId})) > 0`),
    check(
      "rewarded_ad_verifications_event_hash_not_empty",
      sql`length(trim(${table.rewardEventIdHash})) > 0`
    ),
    check(
      "rewarded_ad_verifications_scope_hash_not_empty",
      sql`length(trim(${table.scopeIdHash})) > 0`
    ),
    check(
      "rewarded_ad_verifications_revenue_nonnegative",
      sql`${table.grossRevenueUsd} IS NULL OR ${table.grossRevenueUsd} >= 0`
    )
  ]
);

export const schedulesRelations = relations(schedules, ({ many }) => ({
  candidateTimeOptions: many(candidateTimeOptions),
  participants: many(participants),
  availabilitySlots: many(availabilitySlots),
  candidateVotes: many(candidateVotes),
  aiRecognitionCreditGrants: many(aiRecognitionCreditGrants),
  aiRecognitionAttempts: many(aiRecognitionAttempts)
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
  candidateVotes: many(candidateVotes),
  aiRecognitionAttempts: many(aiRecognitionAttempts)
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

export const aiRecognitionCreditGrantsRelations = relations(
  aiRecognitionCreditGrants,
  ({ many, one }) => ({
    schedule: one(schedules, {
      fields: [aiRecognitionCreditGrants.scheduleId],
      references: [schedules.id]
    }),
    attempts: many(aiRecognitionAttempts)
  })
);

export const aiRecognitionAttemptsRelations = relations(aiRecognitionAttempts, ({ one }) => ({
  schedule: one(schedules, {
    fields: [aiRecognitionAttempts.scheduleId],
    references: [schedules.id]
  }),
  participant: one(participants, {
    fields: [aiRecognitionAttempts.participantId, aiRecognitionAttempts.scheduleId],
    references: [participants.id, participants.scheduleId]
  }),
  creditGrant: one(aiRecognitionCreditGrants, {
    fields: [aiRecognitionAttempts.creditGrantId],
    references: [aiRecognitionCreditGrants.id]
  })
}));
