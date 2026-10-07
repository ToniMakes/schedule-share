# schedule-share Mobile

Native Expo + React Native client for joining an existing schedule, selecting availability, submitting it to the existing API, and viewing the server's shared results.

## Run

From the repository root:

```sh
corepack pnpm install --ignore-scripts
Copy-Item apps/mobile/.env.example apps/mobile/.env
corepack pnpm --filter @schedule-share/mobile start
```

Open the QR code with Expo Go. For a physical device connecting to a local API, set `EXPO_PUBLIC_API_BASE_URL` to a URL reachable from that device (for example, the computer's LAN address). Do not use `localhost` from a phone.

`EXPO_PUBLIC_API_BASE_URL` defaults to the live schedule-share service when the example file is copied. The client requires a base URL for native API requests.

## Firebase (optional)

The app works without Firebase. Local profile, room list and drafts use AsyncStorage. If you want cloud sync for those user-side records:

1. Create a Firebase project on the free Spark plan.
2. Enable Anonymous sign-in and create a Firestore database.
3. Copy the Firebase Web app's public configuration values into `apps/mobile/.env`.
4. Deploy the repository's `firestore.rules` to that Firebase project.

The app stores profiles at `users/{uid}` and recent room metadata at `users/{uid}/rooms/{publicId}`. Firestore never stores shared schedules, availability, participant edit keys or API credentials. The API edit key is kept locally in Expo SecureStore so the user can update their own submission on this device. If Firestore is unavailable, the app uses local data and keeps the schedule API flow available.

## Checks

```sh
corepack pnpm --filter @schedule-share/mobile typecheck
corepack pnpm --filter @schedule-share/mobile test
corepack pnpm --filter @schedule-share/mobile test:rules
corepack pnpm dlx expo-doctor
```

The Firestore rules test starts the local Firestore Emulator. It uses only the demo project ID `demo-schedule-share` and does not connect to a configured Firebase project.

## Current limits

- Users join by share code or pasted link; opening share links directly is not wired up yet.
- The first mobile flow focuses on reading an existing schedule, submitting availability and viewing the existing API results. Schedule creation and organizer management are not part of this MVP.
- No Firebase configuration means the user's room list and profile stay on that device.
- Expo Go bundling does not prove device-specific timezone/DST behavior or touch performance. Those require a real phone and must be checked before describing them as verified.
