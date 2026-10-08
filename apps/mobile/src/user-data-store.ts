import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth
} from "firebase/auth";
import * as firebaseAuth from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore
} from "firebase/firestore";
import type { SavedRoom, UserProfile } from "./storage";

export interface UserDataStore {
  readonly configured: boolean;
  saveProfile(profile: UserProfile): Promise<void>;
  saveRoom(room: SavedRoom): Promise<void>;
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => Boolean(value?.trim()));
type AuthDependencies = NonNullable<Parameters<typeof initializeAuth>[1]>;
// Firebase's generic public typings omit this React Native-only export; Metro
// resolves the package's `react-native` condition for the device bundle.
const reactNativeAuth = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => AuthDependencies["persistence"];
};
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let identityReady: Promise<string | null> | undefined;

if (hasFirebaseConfig) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    try {
      auth = initializeAuth(app, {
        persistence: reactNativeAuth.getReactNativePersistence(AsyncStorage)
      });
    } catch {
      auth = getAuth(app);
    }
    firestore = getFirestore(app);
    identityReady = ensureAnonymousIdentity(auth);
  } catch {
    app = undefined;
    auth = undefined;
    firestore = undefined;
  }
}

export const userDataStore: UserDataStore = {
  configured: hasFirebaseConfig && Boolean(auth && firestore),
  async saveProfile(profile) {
    const uid = await identityReady;
    if (!uid || !firestore) return;
    await setDoc(doc(firestore, "users", uid), profile, { merge: true });
  },
  async saveRoom(room) {
    const uid = await identityReady;
    if (!uid || !firestore) return;
    const {
      editKey: _editKey,
      ownerKey: _ownerKey,
      participantId: _participantId,
      ...safeRoom
    } = room;
    await setDoc(doc(firestore, "users", uid, "rooms", room.publicId), safeRoom, { merge: true });
  }
};

export async function restoreCloudData(): Promise<{
  profile: UserProfile | null;
  rooms: SavedRoom[];
}> {
  const uid = await identityReady;
  if (!uid || !firestore) return { profile: null, rooms: [] };
  const profileSnapshot = await getDoc(doc(firestore, "users", uid));
  const roomSnapshot = await getDocs(collection(firestore, "users", uid, "rooms"));
  const firstProfile = profileSnapshot.data();
  const rooms = roomSnapshot.docs.map((entry) => entry.data() as SavedRoom);
  return {
    profile: firstProfile
      ? {
          displayName: String(firstProfile.displayName ?? ""),
          timezone: String(firstProfile.timezone ?? "UTC")
        }
      : null,
    rooms
  };
}

async function ensureAnonymousIdentity(instance: Auth): Promise<string | null> {
  return new Promise((resolve) => {
    let unsubscribe: () => void = () => {};
    unsubscribe = onAuthStateChanged(
      instance,
      async (user) => {
        unsubscribe();
        if (user) {
          resolve(user.uid);
          return;
        }
        try {
          resolve((await signInAnonymously(instance)).user.uid);
        } catch {
          resolve(null);
        }
      },
      () => {
        unsubscribe();
        resolve(null);
      }
    );
  });
}
