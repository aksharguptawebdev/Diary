# Mobile development

The repository has two Android clients that connect to the same backend:

- `apps/mobile` is the Expo / React Native app. Use Expo Go for quick JS development, or generate its Android project and open it in Android Studio.
- `apps/android` is the existing native Kotlin / Jetpack Compose app. Open this directory directly in Android Studio.

## Expo Go

1. Install dependencies from the repository root with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_BASE_URL` to the backend URL reachable by the phone. Use your computer's LAN IP, not `localhost` or `10.0.2.2`, for a physical phone.
3. Start the backend, then run `pnpm dev:mobile` from the repository root.
4. Scan the QR code with an Expo Go build compatible with this project's Expo SDK (52).

Android Expo Go builds for older SDKs can be downloaded from [expo.dev/go](https://expo.dev/go). The Expo Go release from the Play Store may use a newer SDK and reject this project.

## Android Studio with the Expo app

Run `pnpm prebuild:mobile:android` from the repository root, then open `apps/mobile/android` in Android Studio. To start Metro and launch the generated app on an emulator, use `pnpm dev:mobile:android`.

The generated `apps/mobile/android` directory is ignored by Git and can be regenerated from the Expo config. The separately maintained native Kotlin project remains at `apps/android`.
