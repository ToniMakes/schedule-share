import {
  aiRecognitionAttempts,
  aiRecognitionCreditGrants,
  availabilitySlots,
  candidateTimeOptions as candidateTimeOptionsTable,
  candidateVotes as candidateVotesTable,
  participants,
  schedules,
  type CandidateVoteResponse,
  type Database,
  type ScheduleMode,
  type ScheduleStatus,
  type StoredDailyWindow
} from "@schedule-share/db";
import { and, asc, eq, inArray, lte, ne } from "drizzle-orm";

export interface CreateScheduleRecord {
  readonly publicId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timezone: string;
  readonly dateRangeStart: string;
  readonly dateRangeEnd: string;
  readonly slotMinutes: 15 | 30 | 60;
  readonly dailyWindows: readonly StoredDailyWindow[];
  readonly scheduleMode: ScheduleMode;
  readonly candidateTimeOptions: readonly CreateCandidateTimeOptionRecord[];
  readonly ownerKeyHash: string;
  readonly status: "open";
  readonly expiresAt: Date;
}

export interface CreatedScheduleRecord {
  readonly publicId: string;
  readonly title: string;
  readonly timezone: string;
  readonly scheduleMode: ScheduleMode;
  readonly status: ScheduleStatus;
}

export interface ScheduleDetailRecord {
  readonly id: string;
  readonly publicId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timezone: string;
  readonly dateRangeStart: string;
  readonly dateRangeEnd: string;
  readonly slotMinutes: number;
  readonly dailyWindows: readonly StoredDailyWindow[];
  readonly scheduleMode: ScheduleMode;
  readonly finalEndUtc?: Date | null;
  readonly finalStartUtc?: Date | null;
  readonly status: ScheduleStatus;
}

export interface OwnerScheduleDetailRecord extends ScheduleDetailRecord {
  readonly ownerKeyHash: string;
}

export interface ParticipantRecord {
  readonly id: string;
  readonly displayName: string;
}

export interface ParticipantAvailabilityRecord extends ParticipantRecord {
  readonly editKeyHash: string;
  readonly availableSlots: readonly CreateParticipantAvailabilitySlotRecord[];
  readonly candidateVotes?: readonly CreateParticipantCandidateVoteRecord[];
}

export interface AvailabilitySlotRecord {
  readonly participantId: string;
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}

export interface CandidateTimeOptionRecord {
  readonly id: string;
  readonly label: string | null;
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}

export interface CreateCandidateTimeOptionRecord {
  readonly label: string | null;
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}

export interface CreateParticipantAvailabilitySlotRecord {
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}

export interface CandidateVoteRecord {
  readonly participantId: string;
  readonly candidateTimeOptionId: string;
  readonly preferenceRank?: number | null;
  readonly response: CandidateVoteResponse;
}

export interface CreateParticipantCandidateVoteRecord {
  readonly candidateTimeOptionId: string;
  readonly preferenceRank?: number | null;
  readonly response: CandidateVoteResponse;
}

export interface CreateParticipantAvailabilityRecord {
  readonly scheduleId: string;
  readonly displayName: string;
  readonly editKeyHash: string;
  readonly availabilitySlots: readonly CreateParticipantAvailabilitySlotRecord[];
  readonly candidateVotes: readonly CreateParticipantCandidateVoteRecord[];
}

export interface CreatedParticipantAvailabilityRecord {
  readonly id: string;
  readonly displayName: string;
}

export interface UpdateParticipantAvailabilityRecord {
  readonly scheduleId: string;
  readonly participantId: string;
  readonly displayName: string;
  readonly availabilitySlots: readonly CreateParticipantAvailabilitySlotRecord[];
  readonly candidateVotes: readonly CreateParticipantCandidateVoteRecord[];
}

export interface ScheduleWithAvailabilityRecord {
  readonly schedule: ScheduleDetailRecord;
  readonly candidateTimeOptions: readonly CandidateTimeOptionRecord[];
  readonly participants: readonly ParticipantRecord[];
  readonly availabilitySlots: readonly AvailabilitySlotRecord[];
  readonly candidateVotes?: readonly CandidateVoteRecord[];
}

export interface OwnerScheduleWithAvailabilityRecord {
  readonly schedule: OwnerScheduleDetailRecord;
  readonly candidateTimeOptions: readonly CandidateTimeOptionRecord[];
  readonly participants: readonly ParticipantRecord[];
  readonly availabilitySlots: readonly AvailabilitySlotRecord[];
  readonly candidateVotes?: readonly CandidateVoteRecord[];
}

export interface ParticipantAvailabilityWithScheduleRecord {
  readonly schedule: ScheduleDetailRecord;
  readonly candidateTimeOptions: readonly CandidateTimeOptionRecord[];
  readonly participant: ParticipantAvailabilityRecord;
}

export interface LockedScheduleRecord {
  readonly publicId: string;
  readonly status: "locked";
}

export interface ConfirmedFinalTimeScheduleRecord {
  readonly finalEndUtc: Date;
  readonly finalStartUtc: Date;
  readonly publicId: string;
  readonly status: "locked";
}

export interface ArchivedScheduleRecord {
  readonly publicId: string;
  readonly status: "archived";
}

export interface ScheduleMaintenanceMutationResult {
  readonly count: number;
}

export interface CreateScheduleRepository {
  createSchedule(record: CreateScheduleRecord): Promise<CreatedScheduleRecord>;
}

export interface ReadScheduleRepository {
  getScheduleByPublicId(publicId: string): Promise<ScheduleWithAvailabilityRecord | undefined>;
}

export interface ReadOwnerScheduleRepository {
  getOwnerScheduleByPublicId(
    publicId: string
  ): Promise<OwnerScheduleWithAvailabilityRecord | undefined>;
}

export interface CreateParticipantAvailabilityRepository extends ReadScheduleRepository {
  createParticipantAvailability(
    record: CreateParticipantAvailabilityRecord
  ): Promise<CreatedParticipantAvailabilityRecord>;
}

export interface ReadParticipantAvailabilityRepository {
  getParticipantAvailabilityByPublicId(
    publicId: string,
    participantId: string
  ): Promise<ParticipantAvailabilityWithScheduleRecord | undefined>;
}

export interface UpdateParticipantAvailabilityRepository extends ReadParticipantAvailabilityRepository {
  updateParticipantAvailability(
    record: UpdateParticipantAvailabilityRecord
  ): Promise<ParticipantRecord | undefined>;
}

export interface LockScheduleRepository extends ReadOwnerScheduleRepository {
  lockSchedule(scheduleId: string): Promise<LockedScheduleRecord | undefined>;
}

export interface ConfirmFinalTimeRepository extends ReadOwnerScheduleRepository {
  confirmFinalTime(
    scheduleId: string,
    finalTime: { readonly endUtc: Date; readonly startUtc: Date }
  ): Promise<ConfirmedFinalTimeScheduleRecord | undefined>;
}

export interface ArchiveScheduleRepository extends ReadOwnerScheduleRepository {
  archiveSchedule(scheduleId: string): Promise<ArchivedScheduleRecord | undefined>;
}

export interface ScheduleMaintenanceRepository {
  archiveExpiredSchedules(input: {
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
    readonly now: Date;
  }): Promise<ScheduleMaintenanceMutationResult>;
  hardDeleteArchivedSchedules(input: {
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
  }): Promise<ScheduleMaintenanceMutationResult>;
}

export interface ScheduleRepository
  extends
    CreateScheduleRepository,
    ReadScheduleRepository,
    CreateParticipantAvailabilityRepository,
    ReadParticipantAvailabilityRepository,
    UpdateParticipantAvailabilityRepository,
    ReadOwnerScheduleRepository,
    LockScheduleRepository,
    ConfirmFinalTimeRepository,
    ArchiveScheduleRepository,
    ScheduleMaintenanceRepository {}

export class DrizzleScheduleRepository implements ScheduleRepository {
  constructor(private readonly database: Database) {}

  async createSchedule(record: CreateScheduleRecord): Promise<CreatedScheduleRecord> {
    return await this.database.transaction(async (transaction) => {
      const { candidateTimeOptions, ...scheduleRecord } = record;
      const [created] = await transaction.insert(schedules).values(scheduleRecord).returning({
        id: schedules.id,
        publicId: schedules.publicId,
        title: schedules.title,
        timezone: schedules.timezone,
        scheduleMode: schedules.scheduleMode,
        status: schedules.status
      });

      if (created === undefined) {
        throw new Error("Failed to create schedule.");
      }

      if (candidateTimeOptions.length > 0) {
        await transaction.insert(candidateTimeOptionsTable).values(
          candidateTimeOptions.map((option) => ({
            scheduleId: created.id,
            ...option
          }))
        );
      }

      return {
        publicId: created.publicId,
        title: created.title,
        timezone: created.timezone,
        scheduleMode: created.scheduleMode,
        status: created.status
      };
    });
  }

  async getScheduleByPublicId(
    publicId: string
  ): Promise<ScheduleWithAvailabilityRecord | undefined> {
    const [schedule] = await this.database
      .select({
        id: schedules.id,
        publicId: schedules.publicId,
        title: schedules.title,
        description: schedules.description,
        timezone: schedules.timezone,
        dateRangeStart: schedules.dateRangeStart,
        dateRangeEnd: schedules.dateRangeEnd,
        slotMinutes: schedules.slotMinutes,
        dailyWindows: schedules.dailyWindows,
        scheduleMode: schedules.scheduleMode,
        finalStartUtc: schedules.finalStartUtc,
        finalEndUtc: schedules.finalEndUtc,
        status: schedules.status
      })
      .from(schedules)
      .where(eq(schedules.publicId, publicId))
      .limit(1);

    if (schedule === undefined) {
      return undefined;
    }

    const [
      scheduleCandidateOptions,
      scheduleParticipants,
      scheduleAvailabilitySlots,
      scheduleCandidateVotes
    ] = await Promise.all([
      this.database
        .select({
          id: candidateTimeOptionsTable.id,
          label: candidateTimeOptionsTable.label,
          slotStartUtc: candidateTimeOptionsTable.slotStartUtc,
          slotEndUtc: candidateTimeOptionsTable.slotEndUtc
        })
        .from(candidateTimeOptionsTable)
        .where(eq(candidateTimeOptionsTable.scheduleId, schedule.id))
        .orderBy(
          asc(candidateTimeOptionsTable.slotStartUtc),
          asc(candidateTimeOptionsTable.slotEndUtc)
        ),
      this.database
        .select({
          id: participants.id,
          displayName: participants.displayName
        })
        .from(participants)
        .where(eq(participants.scheduleId, schedule.id))
        .orderBy(asc(participants.createdAt), asc(participants.displayName)),
      this.database
        .select({
          participantId: availabilitySlots.participantId,
          slotStartUtc: availabilitySlots.slotStartUtc,
          slotEndUtc: availabilitySlots.slotEndUtc
        })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.scheduleId, schedule.id))
        .orderBy(asc(availabilitySlots.slotStartUtc), asc(availabilitySlots.slotEndUtc)),
      this.database
        .select({
          participantId: candidateVotesTable.participantId,
          candidateTimeOptionId: candidateVotesTable.candidateTimeOptionId,
          preferenceRank: candidateVotesTable.preferenceRank,
          response: candidateVotesTable.response
        })
        .from(candidateVotesTable)
        .where(eq(candidateVotesTable.scheduleId, schedule.id))
        .orderBy(
          asc(candidateVotesTable.participantId),
          asc(candidateVotesTable.candidateTimeOptionId)
        )
    ]);

    return {
      schedule,
      candidateTimeOptions: scheduleCandidateOptions,
      participants: scheduleParticipants,
      availabilitySlots: scheduleAvailabilitySlots,
      candidateVotes: scheduleCandidateVotes
    };
  }

  async getOwnerScheduleByPublicId(
    publicId: string
  ): Promise<OwnerScheduleWithAvailabilityRecord | undefined> {
    const [schedule] = await this.database
      .select({
        id: schedules.id,
        publicId: schedules.publicId,
        title: schedules.title,
        description: schedules.description,
        timezone: schedules.timezone,
        dateRangeStart: schedules.dateRangeStart,
        dateRangeEnd: schedules.dateRangeEnd,
        slotMinutes: schedules.slotMinutes,
        dailyWindows: schedules.dailyWindows,
        scheduleMode: schedules.scheduleMode,
        finalStartUtc: schedules.finalStartUtc,
        finalEndUtc: schedules.finalEndUtc,
        status: schedules.status,
        ownerKeyHash: schedules.ownerKeyHash
      })
      .from(schedules)
      .where(eq(schedules.publicId, publicId))
      .limit(1);

    if (schedule === undefined) {
      return undefined;
    }

    const [
      scheduleCandidateOptions,
      scheduleParticipants,
      scheduleAvailabilitySlots,
      scheduleCandidateVotes
    ] = await Promise.all([
      this.database
        .select({
          id: candidateTimeOptionsTable.id,
          label: candidateTimeOptionsTable.label,
          slotStartUtc: candidateTimeOptionsTable.slotStartUtc,
          slotEndUtc: candidateTimeOptionsTable.slotEndUtc
        })
        .from(candidateTimeOptionsTable)
        .where(eq(candidateTimeOptionsTable.scheduleId, schedule.id))
        .orderBy(
          asc(candidateTimeOptionsTable.slotStartUtc),
          asc(candidateTimeOptionsTable.slotEndUtc)
        ),
      this.database
        .select({
          id: participants.id,
          displayName: participants.displayName
        })
        .from(participants)
        .where(eq(participants.scheduleId, schedule.id))
        .orderBy(asc(participants.createdAt), asc(participants.displayName)),
      this.database
        .select({
          participantId: availabilitySlots.participantId,
          slotStartUtc: availabilitySlots.slotStartUtc,
          slotEndUtc: availabilitySlots.slotEndUtc
        })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.scheduleId, schedule.id))
        .orderBy(asc(availabilitySlots.slotStartUtc), asc(availabilitySlots.slotEndUtc)),
      this.database
        .select({
          participantId: candidateVotesTable.participantId,
          candidateTimeOptionId: candidateVotesTable.candidateTimeOptionId,
          preferenceRank: candidateVotesTable.preferenceRank,
          response: candidateVotesTable.response
        })
        .from(candidateVotesTable)
        .where(eq(candidateVotesTable.scheduleId, schedule.id))
        .orderBy(
          asc(candidateVotesTable.participantId),
          asc(candidateVotesTable.candidateTimeOptionId)
        )
    ]);

    return {
      schedule,
      candidateTimeOptions: scheduleCandidateOptions,
      participants: scheduleParticipants,
      availabilitySlots: scheduleAvailabilitySlots,
      candidateVotes: scheduleCandidateVotes
    };
  }

  async createParticipantAvailability(
    record: CreateParticipantAvailabilityRecord
  ): Promise<CreatedParticipantAvailabilityRecord> {
    return await this.database.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(participants)
        .values({
          scheduleId: record.scheduleId,
          displayName: record.displayName,
          editKeyHash: record.editKeyHash
        })
        .returning({
          id: participants.id,
          displayName: participants.displayName
        });

      if (created === undefined) {
        throw new Error("Failed to create participant.");
      }

      if (record.availabilitySlots.length > 0) {
        await transaction.insert(availabilitySlots).values(
          record.availabilitySlots.map((slot) => ({
            scheduleId: record.scheduleId,
            participantId: created.id,
            slotStartUtc: slot.slotStartUtc,
            slotEndUtc: slot.slotEndUtc
          }))
        );
      }

      if (record.candidateVotes.length > 0) {
        await transaction.insert(candidateVotesTable).values(
          record.candidateVotes.map((vote) => ({
            scheduleId: record.scheduleId,
            participantId: created.id,
            candidateTimeOptionId: vote.candidateTimeOptionId,
            preferenceRank: vote.preferenceRank ?? null,
            response: vote.response
          }))
        );
      }

      return created;
    });
  }

  async getParticipantAvailabilityByPublicId(
    publicId: string,
    participantId: string
  ): Promise<ParticipantAvailabilityWithScheduleRecord | undefined> {
    const [schedule] = await this.database
      .select({
        id: schedules.id,
        publicId: schedules.publicId,
        title: schedules.title,
        description: schedules.description,
        timezone: schedules.timezone,
        dateRangeStart: schedules.dateRangeStart,
        dateRangeEnd: schedules.dateRangeEnd,
        slotMinutes: schedules.slotMinutes,
        dailyWindows: schedules.dailyWindows,
        scheduleMode: schedules.scheduleMode,
        finalStartUtc: schedules.finalStartUtc,
        finalEndUtc: schedules.finalEndUtc,
        status: schedules.status
      })
      .from(schedules)
      .where(eq(schedules.publicId, publicId))
      .limit(1);

    if (schedule === undefined) {
      return undefined;
    }

    const [participant] = await this.database
      .select({
        id: participants.id,
        displayName: participants.displayName,
        editKeyHash: participants.editKeyHash
      })
      .from(participants)
      .where(and(eq(participants.scheduleId, schedule.id), eq(participants.id, participantId)))
      .limit(1);

    if (participant === undefined) {
      return undefined;
    }

    const [scheduleCandidateOptions, participantSlots, participantCandidateVotes] =
      await Promise.all([
        this.database
          .select({
            id: candidateTimeOptionsTable.id,
            label: candidateTimeOptionsTable.label,
            slotStartUtc: candidateTimeOptionsTable.slotStartUtc,
            slotEndUtc: candidateTimeOptionsTable.slotEndUtc
          })
          .from(candidateTimeOptionsTable)
          .where(eq(candidateTimeOptionsTable.scheduleId, schedule.id))
          .orderBy(
            asc(candidateTimeOptionsTable.slotStartUtc),
            asc(candidateTimeOptionsTable.slotEndUtc)
          ),
        this.database
          .select({
            slotStartUtc: availabilitySlots.slotStartUtc,
            slotEndUtc: availabilitySlots.slotEndUtc
          })
          .from(availabilitySlots)
          .where(
            and(
              eq(availabilitySlots.scheduleId, schedule.id),
              eq(availabilitySlots.participantId, participantId)
            )
          )
          .orderBy(asc(availabilitySlots.slotStartUtc), asc(availabilitySlots.slotEndUtc)),
        this.database
          .select({
            candidateTimeOptionId: candidateVotesTable.candidateTimeOptionId,
            preferenceRank: candidateVotesTable.preferenceRank,
            response: candidateVotesTable.response
          })
          .from(candidateVotesTable)
          .where(
            and(
              eq(candidateVotesTable.scheduleId, schedule.id),
              eq(candidateVotesTable.participantId, participantId)
            )
          )
          .orderBy(asc(candidateVotesTable.candidateTimeOptionId))
      ]);

    return {
      schedule,
      candidateTimeOptions: scheduleCandidateOptions,
      participant: {
        ...participant,
        availableSlots: participantSlots,
        candidateVotes: participantCandidateVotes
      }
    };
  }

  async updateParticipantAvailability(
    record: UpdateParticipantAvailabilityRecord
  ): Promise<ParticipantRecord | undefined> {
    return await this.database.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(participants)
        .set({
          displayName: record.displayName,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(participants.scheduleId, record.scheduleId),
            eq(participants.id, record.participantId)
          )
        )
        .returning({
          id: participants.id,
          displayName: participants.displayName
        });

      if (updated === undefined) {
        return undefined;
      }

      await transaction
        .delete(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.scheduleId, record.scheduleId),
            eq(availabilitySlots.participantId, record.participantId)
          )
        );

      await transaction
        .delete(candidateVotesTable)
        .where(
          and(
            eq(candidateVotesTable.scheduleId, record.scheduleId),
            eq(candidateVotesTable.participantId, record.participantId)
          )
        );

      if (record.availabilitySlots.length > 0) {
        await transaction.insert(availabilitySlots).values(
          record.availabilitySlots.map((slot) => ({
            scheduleId: record.scheduleId,
            participantId: record.participantId,
            slotStartUtc: slot.slotStartUtc,
            slotEndUtc: slot.slotEndUtc
          }))
        );
      }

      if (record.candidateVotes.length > 0) {
        await transaction.insert(candidateVotesTable).values(
          record.candidateVotes.map((vote) => ({
            scheduleId: record.scheduleId,
            participantId: record.participantId,
            candidateTimeOptionId: vote.candidateTimeOptionId,
            preferenceRank: vote.preferenceRank ?? null,
            response: vote.response
          }))
        );
      }

      return updated;
    });
  }

  async lockSchedule(scheduleId: string): Promise<LockedScheduleRecord | undefined> {
    const [updated] = await this.database
      .update(schedules)
      .set({
        status: "locked",
        updatedAt: new Date()
      })
      .where(eq(schedules.id, scheduleId))
      .returning({
        publicId: schedules.publicId,
        status: schedules.status
      });

    if (updated === undefined) {
      return undefined;
    }

    return {
      publicId: updated.publicId,
      status: "locked"
    };
  }

  async confirmFinalTime(
    scheduleId: string,
    finalTime: { readonly endUtc: Date; readonly startUtc: Date }
  ): Promise<ConfirmedFinalTimeScheduleRecord | undefined> {
    const [updated] = await this.database
      .update(schedules)
      .set({
        finalStartUtc: finalTime.startUtc,
        finalEndUtc: finalTime.endUtc,
        status: "locked",
        updatedAt: new Date()
      })
      .where(eq(schedules.id, scheduleId))
      .returning({
        publicId: schedules.publicId,
        finalStartUtc: schedules.finalStartUtc,
        finalEndUtc: schedules.finalEndUtc,
        status: schedules.status
      });

    if (updated === undefined || updated.finalStartUtc === null || updated.finalEndUtc === null) {
      return undefined;
    }

    return {
      publicId: updated.publicId,
      finalStartUtc: updated.finalStartUtc,
      finalEndUtc: updated.finalEndUtc,
      status: "locked"
    };
  }

  async archiveSchedule(scheduleId: string): Promise<ArchivedScheduleRecord | undefined> {
    const [updated] = await this.database
      .update(schedules)
      .set({
        status: "archived",
        updatedAt: new Date()
      })
      .where(eq(schedules.id, scheduleId))
      .returning({
        publicId: schedules.publicId,
        status: schedules.status
      });

    if (updated === undefined) {
      return undefined;
    }

    return {
      publicId: updated.publicId,
      status: "archived"
    };
  }

  async archiveExpiredSchedules(input: {
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
    readonly now: Date;
  }): Promise<ScheduleMaintenanceMutationResult> {
    const expiredSchedules = await this.database
      .select({
        id: schedules.id
      })
      .from(schedules)
      .where(
        and(ne(schedules.status, "archived"), lte(schedules.expiresAt, input.expiresAtOrBefore))
      )
      .orderBy(asc(schedules.expiresAt), asc(schedules.createdAt))
      .limit(input.limit);

    const scheduleIds = expiredSchedules.map((schedule) => schedule.id);

    if (scheduleIds.length === 0) {
      return { count: 0 };
    }

    const archived = await this.database
      .update(schedules)
      .set({
        status: "archived",
        updatedAt: input.now
      })
      .where(and(inArray(schedules.id, scheduleIds), ne(schedules.status, "archived")))
      .returning({
        id: schedules.id
      });

    return { count: archived.length };
  }

  async hardDeleteArchivedSchedules(input: {
    readonly expiresAtOrBefore: Date;
    readonly limit: number;
  }): Promise<ScheduleMaintenanceMutationResult> {
    return await this.database.transaction(async (transaction) => {
      const expiredArchivedSchedules = await transaction
        .select({
          id: schedules.id
        })
        .from(schedules)
        .where(
          and(eq(schedules.status, "archived"), lte(schedules.expiresAt, input.expiresAtOrBefore))
        )
        .orderBy(asc(schedules.expiresAt), asc(schedules.createdAt))
        .limit(input.limit);

      const scheduleIds = expiredArchivedSchedules.map((schedule) => schedule.id);

      if (scheduleIds.length === 0) {
        return { count: 0 };
      }

      await transaction
        .delete(aiRecognitionAttempts)
        .where(inArray(aiRecognitionAttempts.scheduleId, scheduleIds));

      await transaction
        .delete(aiRecognitionCreditGrants)
        .where(inArray(aiRecognitionCreditGrants.scheduleId, scheduleIds));

      const deleted = await transaction
        .delete(schedules)
        .where(and(eq(schedules.status, "archived"), inArray(schedules.id, scheduleIds)))
        .returning({
          id: schedules.id
        });

      return { count: deleted.length };
    });
  }
}
