# Schedule Share mobile app

The native Expo app lets participants join an existing schedule, mark their availability or vote on proposed times, submit or update a response, and view the shared results. Organizers can also create schedules, share invitations, lock or archive a schedule, and confirm a final time. It uses the same schedule service as the web app.

The app opens in English and includes an English / 中文 switch. The selected language is saved on this device.

The participant flow includes quick date navigation, visible three-state voting, a persistent submit action, local draft recovery, and shared result summaries. Motion feedback respects the device’s reduced-motion setting.

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

- Join with a share code or paste a link. Opening ordinary web share links directly in the installed app is not wired up yet.
- Without Firebase configuration, the user's schedule list and profile stay on that device.
- The create, manage, deep-link, touch, keyboard, large-font and Sydney daylight-saving checks have been run on an Android 16 emulator with Expo Go. iOS and physical-phone validation are still pending.
