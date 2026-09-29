# RideRutgers

Verified peer-to-peer ridesharing for Rutgers students. Expo (React Native + TypeScript) app backed by Supabase (Postgres, Auth, Realtime). Runs on iOS and Android via Expo Go — no simulator or native build required for development.

## Features

- **.edu-verified sign-in** — email OTP restricted to `rutgers.edu` / `scarletmail.rutgers.edu`.
- **Ride Board** — drivers post specific, already-planned trips (not live/ad-hoc availability) with an estimated gas cost split; riders can also post open ride requests, and browse posted trips as a list or on a map.
- **Booking flow** — riders request to join a ride; drivers accept/decline; seats update automatically.
- **Live tracking** — while a ride is in progress, the driver can share live location, visible to the rider on a map in real time (Supabase Realtime).
- **In-ride chat** — simple messaging between a driver and their riders.
- **Driver verification** — students apply with license + vehicle info; only verified drivers can post ride offers. Reviewed manually (see below) — no in-app admin panel yet.
- **Ratings** — riders and drivers rate each other after a completed ride.
- **No in-app payments** — RideRutgers only shows a gas cost estimate. Riders and drivers settle up directly (Venmo, Zelle, cash, etc.); there's no payment processing or Rutgers commission built in.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations in `supabase/migrations/` in order (`0001_init.sql`, `0002_presence_and_documents.sql`, `0003_carpool_exemption_compliance.sql`) — they create all tables, row-level security policies, triggers, and the driver-documents storage bucket.
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

RideRutgers is designed to stay within New Jersey's informal-carpool exemption rather than operating like a Transportation Network Company (which would require a $1.5M commercial insurance policy and an MVC permit). That means two hard constraints, both enforced in the app itself, not just the pricing math:

- **Distance-only gas cost, never time-based.** Estimate = `(distance_miles / assumed_mpg) × price_per_gallon`, split evenly across everyone in the car (driver included) — e.g. a driver + 2 riders splits three ways. No per-minute component, no surge/dynamic pricing, no per-rider negotiated price. The `assumed_mpg` and `price_per_gallon` constants live in [`constants/pricing.ts`](constants/pricing.ts) — update them there if NJ gas prices move meaningfully. The split assumes the car fills up (driver + all posted seats); it's a fixed estimate shown at posting time, not recalculated live as individual seats fill.
- **Pre-planned trips only, never live/ad-hoc matching.** Drivers post a specific trip they were already planning to take (origin, destination, date/time) — there's no "I'm online and driving around right now" presence broadcast. Riders browse and request to join a specific posted trip. That's the legal line between a carpool and a TNC, separate from the pricing question.

This is shown to users as a gas cost estimate to settle up directly, not a charge.

## Google Maps API key (Android, production builds only)

`react-native-maps` is included in Expo Go on both platforms with zero setup — Android renders Google Maps out of the box during development. A Google Maps API key is only required when you build a real (non-Expo-Go) Android binary — via `eas build` or `expo run:android`. When you're ready for that:

1. Create a Google Cloud project, enable the **Maps SDK for Android**, and create an API key restricted to your app's package name (`edu.rutgers.riderutgers`) and SHA-1 fingerprint.
2. Put it in `.env` as `GOOGLE_MAPS_API_KEY=...` (already wired into `app.json`'s `react-native-maps` plugin config — not `EXPO_PUBLIC_`-prefixed, since it's a native-manifest value, not something that should ship inside the JS bundle).
3. Build: `eas build -p android` (or `npx expo run:android` locally, which needs Android Studio installed).

## Notes on scope / what's simplified

- **Location picking** uses tap-to-drop-a-pin on a map (with reverse geocoding for a label) instead of a full places-autocomplete search, so no Google Places API key is required.
- **Maps**: iOS uses Apple Maps by default (no key needed, no config). Android uses Google Maps; see above for the production-build key.
- **Driver review** is manual via the Supabase dashboard rather than an in-app admin panel — fine for a small pilot group.
- **No payments** — the app computes and displays a gas cost estimate only. There is no Stripe/payment SDK anywhere in this project by design.
