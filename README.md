# RideRutgers

![CI](https://github.com/ShravanKarthik6906/RideRutgers/actions/workflows/ci.yml/badge.svg)

A carpool board for Rutgers students: drivers post trips they were **already planning to make**, riders find and join one, and everyone splits the gas. Built with Expo (React Native + TypeScript) and Supabase (Postgres, Auth, Realtime, row-level security). Runs on a phone via Expo Go — no native build needed.

> Student project. Not affiliated with or endorsed by Rutgers University. See [Design intent & disclaimer](#design-intent--disclaimer).

## What makes it interesting

Most "rideshare" demos are an Uber clone. This one is deliberately constrained so it behaves like a carpool board, not an on-demand ride service — and those constraints are enforced in the database, not just hidden in the UI:

| Design decision | How it's enforced |
| --- | --- |
| Cost is a **distance-only gas split**, never a fare (no per-minute, no surge, no per-rider price) | One pure function, `estimateGasCostSplit` in [`lib/pricing.ts`](lib/pricing.ts); constants in [`constants/pricing.ts`](constants/pricing.ts); unit-tested |
| Drivers post **scheduled trips only** — no "I'm online now" presence | The live-presence table was removed (migration `0003`); trips require a departure time |
| A rider's request can **never be browsed by drivers** | Row-level security: requests are `select`-able only by their owner (migration `0004`); matched client-side against already-posted trips only ([`lib/matching.ts`](lib/matching.ts)) |
| Users can't **promote themselves** to verified driver or confirm their own booking | Column-level grants + a booking-transition trigger (migration `0005`), tested from an `authenticated` session in [`tests/rls.test.ts`](tests/rls.test.ts) |

## Features

- **Passwordless email sign-in** (tap the emailed link or type the code) restricted to `rutgers.edu` / `scarletmail.rutgers.edu` addresses (checked in the app; see limitations).
- **Ride Board** — browse upcoming posted trips as a list or on a map; post your own trip (verified drivers).
- **Find a ride** — search posted trips by route and time; if nothing matches, save a private request and the app keeps watching.
- **Booking** — riders request a seat, drivers accept/decline; per-trip chat; ratings after a completed trip.
- **Driver verification** — license + insurance photo upload to a private bucket, reviewed manually from the Supabase dashboard.
- **Safety** — SOS action and one-tap location share (native share sheet) during an active trip; in-trip live location while a ride you've booked is in progress.
- **No payments** — riders and drivers settle up directly; there is no payment SDK in this project.

## Design intent & disclaimer

This is a statement of what the app is designed to do, **not legal advice and not a claim of legal compliance.** It has **not** been reviewed by an attorney or by Rutgers Student Legal Services. Rules may differ for you and may change.

Background that motivated the design (verified against the statute text in October 2026; statutes change, so check current text):

- New Jersey regulates "transportation network companies" under the Transportation Network Company Safety and Regulatory Act, [P.L. 2017, c.26](https://pub.njleg.gov/bills/2016/PL17/26_.HTM) (N.J.S.A. 39:5H-1 et seq.).
- A TNC must get a permit from the Motor Vehicle Commission before operating (N.J.S.A. 39:5H-4; see the [MVC's TNC page](https://www.nj.gov/mvc/business/tnc.htm)), and during a prearranged ride the driver and/or TNC must carry primary auto liability coverage of at least $1,500,000 (N.J.S.A. 39:5H-10(c)).
- The Act says a "prearranged ride" does not include "ridesharing, as defined in R.S.39:1-1" (N.J.S.A. 39:5H-2). That definition (R.S. 39:1-1, as reproduced by [FindLaw](https://codes.findlaw.com/nj/title-39-motor-vehicles-and-traffic-regulation/nj-st-sect-39-1-1/)) covers transporting persons in a motor vehicle where it is "incidental to the purpose of the driver," and includes car pools and van pools.

The scheduled-trips-only and private-requests decisions are oriented around that "incidental to the driver's own purpose" idea: trips exist because a driver was already making them, never because a rider asked. Whether this app actually falls within that definition — including how a shared gas-cost estimate is treated — is an open question for a lawyer, not something this README answers.

## Tech stack

Expo SDK 57 · React Native 0.86 · expo-router · TypeScript (strict) · Supabase (Postgres, Auth, Realtime, Storage) · react-native-maps · Vitest + PGlite (tests) · ESLint · GitHub Actions.

## Repo layout

```
app/                    expo-router screens (auth, tabs, ride detail, post a ride)
components/             UI pieces; *.web.tsx are web fallbacks for native-only maps
constants/              pricing + matching constants — tune them in one place
lib/                    Supabase calls (api), pricing, matching (pure), auth
supabase/migrations/    0001–0005, applied in order
tests/                  pricing, matching, and row-level-security tests
```

## Run it

Prerequisites: Node 20.19+ / 22.13+ / 24.3+, a free [Supabase](https://supabase.com) project, and Expo Go on your phone.

```bash
git clone https://github.com/ShravanKarthik6906/RideRutgers.git
cd RideRutgers
npm install
cp .env.example .env     # then fill in your Supabase URL and anon key
```

1. **Database** — in the Supabase SQL editor, run the files in `supabase/migrations/` in order (`0001` … `0005`).
2. **Auth** — sign-in works by emailed code or link. For the code, edit **both** the *Confirm signup* and *Magic Link* templates (Authentication → Emails) to include `{{ .Token }}`: new users get the first, returning users the second. For the link, add the redirect URL(s) the app uses under Authentication → URL Configuration → Redirect URLs (`exp://**` for Expo Go, `riderutgers://**` for a standalone build). Email links are fiddly in Expo Go dev (especially via Chrome on iOS), so the code is the reliable path.
3. **Run** — `npx expo start`, then scan the QR code with your phone (Camera on iOS, Expo Go's scanner on Android).
4. **Approve a driver** — drivers are approved manually. After someone submits the in-app application, run in the SQL editor (this runs as the database owner, which clients can't do):

   ```sql
   update public.profiles
   set is_driver_verified = true, driver_verification_status = 'approved'
   where id = '<user uuid>';
   ```

Standalone Android builds need a Google Maps key: put `GOOGLE_MAPS_API_KEY` in `.env` (read by [`app.config.js`](app.config.js); not needed for Expo Go).

## Tests & CI

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, zero warnings allowed
npm test            # vitest: pricing, matching, RLS
```

The RLS suite runs the real migrations against an in-process Postgres (PGlite) and acts as a normal signed-in user — the same mechanism PostgREST uses (`set role authenticated` + JWT subject). It includes a *control* block proving the pre-`0005` exploits actually work, so the "blocked" assertions can't pass vacuously. CI runs all three on every push.

## Known limitations

- **Cost estimate is computed in the client** and stored; a modified client could post a different number. Server-side validation is a next step.
- **The split assumes a full car** and uses fixed placeholders (25 mpg, $3.30/gal) and straight-line distance, not live fuel prices or routing.
- **Seat counting is client-side and non-atomic**, and a cancelled confirmed booking doesn't release its seat.
- **Profiles are readable by every signed-in user** (including email/phone) so riders can see driver names and ratings; this should become a public view with only display fields.
- **Rating targets aren't validated** against the ride's participants.
- **The `.edu` check is client-side**; the Supabase project itself would accept other addresses via the API.
- **Matching runs in the app** over all upcoming trips — fine for a pilot, not for scale. There are no push notifications; "we'll keep watching" is in-app only.
- **RLS is tested against local Postgres with Supabase-compatible stubs**, not a hosted project; standalone (EAS) builds haven't been exercised.

## License

[MIT](LICENSE) © 2026 Shravan Karthik. App icons and splash art in `assets/` are Expo template placeholders.
