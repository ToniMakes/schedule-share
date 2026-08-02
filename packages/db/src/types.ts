import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type {
  aiRecognitionAttempts,
  aiRecognitionCreditGrants,
  availabilitySlots,
  candidateTimeOptions,
  candidateVotes,
  participants,
  rewardedAdVerifications,
  schedules
} from "./schema";

export type ScheduleRecord = InferSelectModel<typeof schedules>;
export type NewScheduleRecord = InferInsertModel<typeof schedules>;

export type ParticipantRecord = InferSelectModel<typeof participants>;
export type NewParticipantRecord = InferInsertModel<typeof participants>;

export type AvailabilitySlotRecord = InferSelectModel<typeof availabilitySlots>;
export type NewAvailabilitySlotRecord = InferInsertModel<typeof availabilitySlots>;

export type CandidateTimeOptionRecord = InferSelectModel<typeof candidateTimeOptions>;
export type NewCandidateTimeOptionRecord = InferInsertModel<typeof candidateTimeOptions>;

export type CandidateVoteRecord = InferSelectModel<typeof candidateVotes>;
export type NewCandidateVoteRecord = InferInsertModel<typeof candidateVotes>;

export type AiRecognitionCreditGrantRecord = InferSelectModel<typeof aiRecognitionCreditGrants>;
export type NewAiRecognitionCreditGrantRecord = InferInsertModel<typeof aiRecognitionCreditGrants>;

export type AiRecognitionAttemptRecord = InferSelectModel<typeof aiRecognitionAttempts>;
export type NewAiRecognitionAttemptRecord = InferInsertModel<typeof aiRecognitionAttempts>;

export type RewardedAdVerificationRecord = InferSelectModel<typeof rewardedAdVerifications>;
export type NewRewardedAdVerificationRecord = InferInsertModel<typeof rewardedAdVerifications>;
