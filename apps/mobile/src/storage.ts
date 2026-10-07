import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { CandidateVoteResponse } from "@schedule-share/api-client";

const PROFILE_KEY = "schedule-share.mobile.profile.v1";
const ROOMS_KEY = "schedule-share.mobile.rooms.v1";

export interface UserProfile {
  readonly displayName: string;
  readonly timezone: string;
}

export interface SavedRoom {
  readonly publicId: string;
  readonly title: string;
  readonly alias: string;
  readonly lastVisitedAt: string;
  readonly participantId?: string;
  readonly editKey?: string;
}

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadDraft(publicId: string): Promise<SavedDraft | null> {
  const raw = await AsyncStorage.getItem(draftKey(publicId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedDraft | AvailabilitySlotDraft[];
    return Array.isArray(parsed) ? { availableSlots: parsed } : parsed;
  } catch {
    return null;
  }
}

export async function saveDraft(
  publicId: string,
  availableSlots: readonly AvailabilitySlotDraft[],
  candidateVotes: Readonly<Record<string, CandidateVoteResponse>> = {}
): Promise<void> {
  await AsyncStorage.setItem(
    draftKey(publicId),
    JSON.stringify({ availableSlots, candidateVotes })
  );
}

export async function clearDraft(publicId: string): Promise<void> {
  await AsyncStorage.removeItem(draftKey(publicId));
}

export async function loadRooms(): Promise<SavedRoom[]> {
  const raw = await AsyncStorage.getItem(ROOMS_KEY);
  let rooms: Omit<SavedRoom, "editKey">[] = [];
  try {
    rooms = raw ? (JSON.parse(raw) as Omit<SavedRoom, "editKey">[]) : [];
  } catch {
    rooms = [];
  }
  return Promise.all(
    rooms.map(async (room) => {
      const editKey = await SecureStore.getItemAsync(editKeyName(room.publicId));
      return { ...room, ...(editKey ? { editKey } : {}) };
    })
  );
}

export async function saveRoom(room: SavedRoom): Promise<SavedRoom[]> {
  const existing = await loadRooms();
  const previous = existing.find((item) => item.publicId === room.publicId);
  const mergedRoom = {
    ...previous,
    ...room,
    ...(room.editKey || !previous?.editKey ? {} : { editKey: previous.editKey })
  };
  const withoutDuplicate = existing.filter((item) => item.publicId !== room.publicId);
  const next = [mergedRoom, ...withoutDuplicate].slice(0, 30);
  if (mergedRoom.editKey)
    await SecureStore.setItemAsync(editKeyName(room.publicId), mergedRoom.editKey);
  const metadata = next.map(({ editKey: _editKey, ...item }) => item);
  await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(metadata));
  return next;
}

function editKeyName(publicId: string): string {
  return `schedule-share.edit.${publicId}`;
}

function draftKey(publicId: string): string {
  return `schedule-share.draft.${publicId}`;
}

export interface AvailabilitySlotDraft {
  readonly startUtc: string;
  readonly endUtc: string;
}

export interface SavedDraft {
  readonly availableSlots: readonly AvailabilitySlotDraft[];
  readonly candidateVotes?: Readonly<Record<string, CandidateVoteResponse>>;
}
