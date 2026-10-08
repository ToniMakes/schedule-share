import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { CandidateVoteResponse } from "@schedule-share/api-client";
import type { AppLanguage } from "./i18n";

const PROFILE_KEY = "schedule-share.mobile.profile.v1";
const ROOMS_KEY = "schedule-share.mobile.rooms.v1";
const LANGUAGE_KEY = "schedule-share.mobile.language.v1";

export async function loadLanguage(): Promise<AppLanguage> {
  return (await AsyncStorage.getItem(LANGUAGE_KEY)) === "zh" ? "zh" : "en";
}

export async function saveLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

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
  /** Organizer credential for schedules created or claimed on this device; never synced. */
  readonly ownerKey?: string;
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
  let rooms: Omit<SavedRoom, "editKey" | "ownerKey">[] = [];
  try {
    rooms = raw ? (JSON.parse(raw) as Omit<SavedRoom, "editKey" | "ownerKey">[]) : [];
  } catch {
    rooms = [];
  }
  return Promise.all(
    rooms.map(async (room) => {
      const [editKey, ownerKey] = await Promise.all([
        getSecret(editKeyName(room.publicId)),
        getSecret(ownerKeyName(room.publicId))
      ]);
      return {
        ...room,
        ...(editKey ? { editKey } : {}),
        ...(ownerKey ? { ownerKey } : {})
      };
    })
  );
}

export async function saveRoom(room: SavedRoom): Promise<SavedRoom[]> {
  const existing = await loadRooms();
  const previous = existing.find((item) => item.publicId === room.publicId);
  const mergedRoom = { ...previous, ...room };
  const withoutDuplicate = existing.filter((item) => item.publicId !== room.publicId);
  const next = [mergedRoom, ...withoutDuplicate].slice(0, 30);
  if (mergedRoom.editKey) await setSecret(editKeyName(room.publicId), mergedRoom.editKey);
  if (mergedRoom.ownerKey) await setSecret(ownerKeyName(room.publicId), mergedRoom.ownerKey);
  const metadata = next.map(({ editKey: _editKey, ownerKey: _ownerKey, ...item }) => item);
  await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(metadata));
  return next;
}

function editKeyName(publicId: string): string {
  return `schedule-share.edit.${publicId}`;
}

function ownerKeyName(publicId: string): string {
  return `schedule-share.owner.${publicId}`;
}

async function getSecret(name: string): Promise<string | null> {
  // SecureStore is native-only; web storage is for local preview/development.
  return Platform.OS === "web" ? AsyncStorage.getItem(name) : SecureStore.getItemAsync(name);
}

async function setSecret(name: string, value: string): Promise<void> {
  // Keep production iOS/Android credentials in the OS keychain/keystore.
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(name, value);
    return;
  }
  await SecureStore.setItemAsync(name, value);
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
