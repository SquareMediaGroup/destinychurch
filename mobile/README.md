# Destiny Church — mobile app

Native iOS/Android app (React Native + Expo, Expo Router). iOS-first. See the
scoping doc in [`docs/mobile-app-scope.md`](../docs/mobile-app-scope.md) and the
brand tokens in [`@destiny/shared`](../packages/shared/src/design/tokens.ts).

## Running it

This package is **intentionally isolated** from the repo's npm workspaces — it
keeps its own `node_modules` so React Native's dependency resolution can't clash
with the web app's React version. It consumes the shared package by source via
Metro (`metro.config.js`) and a TypeScript path alias (`tsconfig.json`).

```bash
cd mobile
npm install
# Reconcile native module versions to the Expo SDK (recommended after install):
npx expo install --fix
npm run ios        # or: npm run start, then press "i" for the iOS simulator
```

Requires the iOS Simulator (Xcode) or the Expo Go app on a device.

### Configuration

- `EXPO_PUBLIC_API_BASE_URL` — base URL of the app BFF. Defaults to
  `https://destinytees.uk` (production), so the Events tab works out of the box.
  Set it to your machine's LAN URL when developing the BFF locally.

## Structure

- `app/` — Expo Router routes. `(tabs)/` is the bottom-tab shell: Home, Sermons,
  Events, Give.
- `theme/` — maps `@destiny/shared` design tokens onto the RN theme (colours,
  fonts, spacing).
- Fonts: Roboto (body), Anton (homepage/hero display only), Playfair Display
  (serif accent), Arial (headers, system) — loaded via `@expo-google-fonts/*`.

## Status

Phase 1 scaffold: navigation shell, brand design system, and the Events tab
wired to the `/api/app/events` BFF route. Next: sermons/podcast feed + native
audio player, ChurchSuite WebView screens, then identity and group chat.
