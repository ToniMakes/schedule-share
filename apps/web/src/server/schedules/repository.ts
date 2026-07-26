import {
  availabilitySlots,
  participants,
  schedules,
  type Database,
  type ScheduleStatus,
  type StoredDailyWindow
} from "@schedule-share/db";
import { and, asc, eq } from "drizzle-orm";

export interface CreateScheduleRecord {
  readonly publicId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timezone: string;
  readonly dateRangeStart: string;
  readonly dateRangeEnd: string;
  readonly slotMinutes: 15 | 30 | 60;
  readonly dailyWindows: readonly StoredDailyWindow[];
  readonly ownerKeyHash: string;
  readonly status: "open";
  readonly expiresAt: Date;
}

export interface CreatedScheduleRecord {
  readonly publicId: string;
  readonly title: string;
  readonly timezone: string;
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
}

export interface AvailabilitySlotRecord {
  readonly participantId: string;
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}

export interface CreateParticipantAvailabilitySlotRecord {
  readonly slotStartUtc: Date;
  readonly slotEndUtc: Date;
}

export interface CreateParticipantAvailabilityRecord {
  readonly scheduleId: string;
  readonly displayName: string;
  readonly editKeyHash: string;
  readonly availabilitySlots: readonly CreateParticipantAvailabilitySlotRecord[];
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
}

export interface ScheduleWithAvailabilityRecord {
  readonly schedule: ScheduleDetailRecord;
  readonly participants: readonly ParticipantRecord[];
  readonly availabilitySlots: readonly AvailabilitySlotRecord[];
}

export interface OwnerScheduleWithAvailabilityRecord {
  readonly schedule: OwnerScheduleDetailRecord;
  readonly participants: readonly ParticipantRecord[];
  readonly availabilitySlots: readonly AvailabilitySlotRecord[];
}

export interface ParticipantAvailabilityWithScheduleRecord {
  readonly schedule: ScheduleDetailRecord;
  readonly participant: ParticipantAvailabilityRecord;
}

export interface LockedScheduleRecord {
  readonly publicId: string;
  readonly status: "locked";
}

export interface ArchivedScheduleRecord {
  readonly publicId: string;
  readonly status: "archived";
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

export interface ArchiveScheduleRepository extends ReadOwnerScheduleRepository {
  archiveSchedule(scheduleId: string): Promise<ArchivedScheduleRecord | undefined>;
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
    ArchiveScheduleRepository {}

export class DrizzleScheduleRepository implements ScheduleRepository {
  constructor(private readonly database: Database) {}

  async createSchedule(record: CreateScheduleRecord): Promise<CreatedScheduleRecord> {
    const [created] = await this.database.insert(schedules).values(record).returning({
      publicId: schedules.publicId,
      title: schedules.title,
      timezone: schedules.timezone,
      status: schedules.status
    });

    if (created === undefined) {
      throw new Error("Failed to create schedule.");
    }

    return created;
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
        status: schedules.status
      })
      .from(schedules)
      .where(eq(schedules.publicId, publicId))
      .limit(1);

    if (schedule === undefined) {
      return undefined;
    }

    const [scheduleParticipants, scheduleAvailabilitySlots] = await Promise.all([
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
        .orderBy(asc(availabilitySlots.slotStartUtc), asc(availabilitySlots.slotEndUtc))
    ]);

    return {
      schedule,
      participants: scheduleParticipants,
      availabilitySlots: scheduleAvailabilitySlots
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
        status: schedules.status,
        ownerKeyHash: schedules.ownerKeyHash
      })
      .from(schedules)
      .where(eq(schedules.publicId, publicId))
      .limit(1);

    if (schedule === undefined) {
      return undefined;
    }

    const [scheduleParticipants, scheduleAvailabilitySlots] = await Promise.all([
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
        .orderBy(asc(availabilitySlots.slotStartUtc), asc(availabilitySlots.slotEndUtc))
    ]);

    return {
      schedule,
      participants: scheduleParticipants,
      availabilitySlots: scheduleAvailabilitySlots
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

    const participantSlots = await this.database
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
      .orderBy(asc(availabilitySlots.slotStartUtc), asc(availabilitySlots.slotEndUtc));

    return {
      schedule,
      participant: {
        ...participant,
        availableSlots: participantSlots
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
}
