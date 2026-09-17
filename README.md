# RideRutgers

Verified peer-to-peer ridesharing for Rutgers students. Expo (React Native + TypeScript) app backed by Supabase (Postgres, Auth, Realtime). Runs on iOS and Android via Expo Go — no simulator or native build required for development.

## Features

- **.edu-verified sign-in** — email OTP restricted to `rutgers.edu` / `scarletmail.rutgers.edu`.
- **Ride Board** — drivers post ride offers with a flat-rate price estimate (`$1.50/mile` + `$1.20/minute`, $3 minimum); riders can also post open ride requests.
- **Booking flow** — riders request to join a ride; drivers accept/decline; seats update automatically.
- **Live tracking** — while a ride is in progress, the driver can share live location, visible to the rider on a map in real time (Supabase Realtime).
- **In-ride chat** — simple messaging between a driver and their riders.
- **Driver verification** — students apply with license + vehicle info; only verified drivers can post ride offers. Reviewed manually (see below) — no in-app admin panel yet.
- **Ratings** — riders and drivers rate each other after a completed ride.
- **No in-app payments** — RideRutgers only shows a price estimate. Riders and drivers settle up directly (Venmo, Zelle, cash, etc.); there's no payment processing or Rutgers commission built in.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — it creates all tables, row-level security policies, and triggers.
3. In **Authentication → Providers → Email**, make sure "Enable email OTP" is on (it is by default) — the app uses `signInWithOtp` + a 6-digit code, not magic links.
4. Copy your project's **URL** and **anon public key** from **Settings → API**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the previous step. Leave `GOOGLE_MAPS_API_KEY` blank for now — it's only needed for a production/EAS Android build, not for Expo Go testing (see below).

## 3. Run it on your phone via Expo Go

```bash
npm install
npx expo start
```

This prints a QR code in the terminal.

- **iOS**: open the Camera app and scan the QR code, or open it directly in the Expo Go app.
- **Android**: open the Expo Go app and use its built-in QR scanner.

Everything used in this app — `expo-router`, `expo-location`, `react-native-maps`, `@react-native-community/datetimepicker` — is supported inside Expo Go on both platforms, so no dev client or native build is needed to test the full flow (auth, ride board, booking, live tracking, chat).

The first verified driver has to be approved manually: after someone submits a driver application (in-app, Profile → Become a verified driver), open **Table editor → profiles** in the Supabase dashboard and set `is_driver_verified = true` and `driver_verification_status = 'approved'` for that user (also update the matching row in `driver_applications`). This manual process is intentional for a small pilot group, not a placeholder for something to build next.

## Pricing model

Estimate = `distance_miles × $1.50` + `estimated_minutes × $1.20`, with a $3 minimum. Trip duration is estimated from distance at an assumed 25 mph average (no directions/routing API is wired up), purely to compute the time-based portion of the estimate — it's not used for navigation. This is shown to users as an estimate to settle up directly, not a charge.

## Google Maps API key (Android, production builds only)

`react-native-maps` is included in Expo Go on both platforms with zero setup — Android renders Google Maps out of the box during development. A Google Maps API key is only required when you build a real (non-Expo-Go) Android binary — via `eas build` or `expo run:android`. When you're ready for that:

1. Create a Google Cloud project, enable the **Maps SDK for Android**, and create an API key restricted to your app's package name (`edu.rutgers.riderutgers`) and SHA-1 fingerprint.
2. Put it in `.env` as `GOOGLE_MAPS_API_KEY=...` (already wired into `app.json`'s `react-native-maps` plugin config — not `EXPO_PUBLIC_`-prefixed, since it's a native-manifest value, not something that should ship inside the JS bundle).
3. Build: `eas build -p android` (or `npx expo run:android` locally, which needs Android Studio installed).

## Notes on scope / what's simplified

- **Location picking** uses tap-to-drop-a-pin on a map (with reverse geocoding for a label) instead of a full places-autocomplete search, so no Google Places API key is required.
- **Maps**: iOS uses Apple Maps by default (no key needed, no config). Android uses Google Maps; see above for the production-build key.
- **Driver review** is manual via the Supabase dashboard rather than an in-app admin panel — fine for a small pilot group.
- **No payments** — the app computes and displays a price estimate only. There is no Stripe/payment SDK anywhere in this project by design.
