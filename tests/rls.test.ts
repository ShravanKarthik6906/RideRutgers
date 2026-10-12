/// <reference types="node" />
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Exercises the real migrations in supabase/migrations against an in-process
// Postgres (PGlite), acting as a normal signed-in user the same way PostgREST
// does: `set role authenticated` plus the caller's JWT subject in a GUC.
// Supabase-managed pieces our SQL depends on (auth.uid(), auth.users, the
// storage schema, the realtime publication, the API roles) are stubbed below.
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean default false);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text,
    name text
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1]
  $$;

  create publication supabase_realtime;

  grant usage on schema auth, storage to anon, authenticated;
  grant select, insert, update on storage.objects to authenticated;
`;

const ALICE = '00000000-0000-0000-0000-00000000000a'; // rider
const BOB = '00000000-0000-0000-0000-00000000000b'; // verified driver
const CAROL = '00000000-0000-0000-0000-00000000000c'; // unrelated user
const DAVE = '00000000-0000-0000-0000-00000000000d'; // auth user whose profile row was removed

async function buildDb(upToMigration: number): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    if (parseInt(file.slice(0, 4), 10) > upToMigration) break;
    // pgcrypto isn't needed here: gen_random_uuid() is built into Postgres 13+.
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').replace(
      /create extension if not exists "pgcrypto";/gi,
      ''
    );
    await db.exec(sql);
  }

  await db.exec(`
    insert into auth.users (id, email) values
      ('${ALICE}', 'alice@scarletmail.rutgers.edu'),
      ('${BOB}', 'bob@scarletmail.rutgers.edu'),
      ('${CAROL}', 'carol@scarletmail.rutgers.edu'),
      ('${DAVE}', 'dave@scarletmail.rutgers.edu');
    delete from public.profiles where id = '${DAVE}';
    update public.profiles set full_name = 'Alice' where id = '${ALICE}';
    update public.profiles set full_name = 'Bob', is_driver_verified = true,
      driver_verification_status = 'approved' where id = '${BOB}';
    insert into public.rides (id, driver_id, origin_label, origin_lat, origin_lng,
      destination_label, destination_lat, destination_lng, distance_miles,
      departure_time, seats_total, seats_available, cost_per_person)
    values ('00000000-0000-0000-0000-0000000000f1', '${BOB}', 'A', 40.5, -74.4,
      'B', 40.7, -74.2, 20, now() + interval '1 day', 3, 3, 4.00);
  `);
  return db;
}

type Attempt = { ok: boolean; error?: string; affected?: number; rows?: any[] };

// One statement as a signed-in user, in its own transaction (so a failure
// doesn't poison the next attempt).
async function as(db: PGlite, uid: string, sql: string): Promise<Attempt> {
  await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${uid}', true);`);
  try {
    const res = await db.query(sql);
    await db.exec('commit');
    return { ok: true, affected: res.affectedRows, rows: res.rows };
  } catch (e) {
    await db.exec('rollback');
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function admin(db: PGlite, sql: string) {
  return (await db.query<any>(sql)).rows;
}

const RIDE = '00000000-0000-0000-0000-0000000000f1';

describe('control: before 0005 (migrations 0001–0004) the exploits work', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb(4);
  });
  afterAll(async () => db.close());

  it('a rider can mark themself a verified driver with a rating of their choosing', async () => {
    const res = await as(
      db,
      ALICE,
      `update public.profiles set is_driver_verified = true, driver_verification_status = 'approved',
         rating_avg = 5, rating_count = 999 where id = '${ALICE}'`
    );
    expect(res.ok).toBe(true);
    const [row] = await admin(db, `select is_driver_verified, rating_count from public.profiles where id = '${ALICE}'`);
    expect(row.is_driver_verified).toBe(true);
    expect(row.rating_count).toBe(999);
  });

  it('a user with no profile row can insert one that is already a verified driver', async () => {
    const res = await as(
      db,
      DAVE,
      `insert into public.profiles (id, email, is_driver_verified, driver_verification_status)
       values ('${DAVE}', 'dave@scarletmail.rutgers.edu', true, 'approved')`
    );
    expect(res.ok).toBe(true);
  });

  it('a rider can insert their own booking as already confirmed', async () => {
    const res = await as(
      db,
      CAROL,
      `insert into public.bookings (ride_id, rider_id, status) values ('${RIDE}', '${CAROL}', 'confirmed')`
    );
    expect(res.ok).toBe(true);
  });

  it('a rider can confirm their own pending booking', async () => {
    await admin(db, `insert into public.bookings (ride_id, rider_id) values ('${RIDE}', '${BOB}')`);
    const res = await as(
      db,
      BOB,
      `update public.bookings set status = 'confirmed' where ride_id = '${RIDE}' and rider_id = '${BOB}'`
    );
    expect(res.ok).toBe(true);
  });

  it('re-uploading a driver document (upsert) silently updates nothing', async () => {
    await as(db, ALICE, `insert into storage.objects (bucket_id, name) values ('driver-documents', '${ALICE}/license.jpg')`);
    const res = await as(
      db,
      ALICE,
      `update storage.objects set name = '${ALICE}/license.jpg' where bucket_id = 'driver-documents' and name = '${ALICE}/license.jpg'`
    );
    expect(res.affected).toBe(0);
  });
});

describe('after 0005 (all migrations): the same attempts are blocked', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb(99);
  });
  afterAll(async () => db.close());

  describe('profiles', () => {
    it('cannot self-verify as a driver', async () => {
      const res = await as(
        db,
        ALICE,
        `update public.profiles set is_driver_verified = true, driver_verification_status = 'approved' where id = '${ALICE}'`
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/permission denied/i);
      const [row] = await admin(db, `select is_driver_verified, driver_verification_status from public.profiles where id = '${ALICE}'`);
      expect(row.is_driver_verified).toBe(false);
      expect(row.driver_verification_status).toBe('none');
    });

    it('cannot set their own rating', async () => {
      const res = await as(db, ALICE, `update public.profiles set rating_avg = 5, rating_count = 999 where id = '${ALICE}'`);
      expect(res.ok).toBe(false);
      const [row] = await admin(db, `select rating_count from public.profiles where id = '${ALICE}'`);
      expect(row.rating_count).toBe(0);
    });

    it('cannot rewrite their email or id', async () => {
      const res = await as(db, ALICE, `update public.profiles set email = 'x@y.z' where id = '${ALICE}'`);
      expect(res.ok).toBe(false);
    });

    it('can still edit their own name and phone', async () => {
      const res = await as(db, ALICE, `update public.profiles set full_name = 'Alice R', phone = '555' where id = '${ALICE}'`);
      expect(res.ok).toBe(true);
      expect(res.affected).toBe(1);
    });

    it("cannot edit someone else's profile", async () => {
      const res = await as(db, ALICE, `update public.profiles set full_name = 'Hacked' where id = '${CAROL}'`);
      expect(res.affected).toBe(0);
    });

    it('cannot insert a profile row directly (profiles come from the signup trigger)', async () => {
      const res = await as(
        db,
        DAVE,
        `insert into public.profiles (id, email, is_driver_verified, driver_verification_status)
         values ('${DAVE}', 'dave@scarletmail.rutgers.edu', true, 'approved')`
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/permission denied/i);
      const rows = await admin(db, `select 1 from public.profiles where id = '${DAVE}'`);
      expect(rows).toHaveLength(0);
    });

    it('an admin (dashboard / service role) can still approve a driver', async () => {
      await admin(db, `update public.profiles set is_driver_verified = true, driver_verification_status = 'approved' where id = '${CAROL}'`);
      const [row] = await admin(db, `select is_driver_verified from public.profiles where id = '${CAROL}'`);
      expect(row.is_driver_verified).toBe(true);
      await admin(db, `update public.profiles set is_driver_verified = false, driver_verification_status = 'none' where id = '${CAROL}'`);
    });
  });

  describe('driver applications', () => {
    it('cannot be submitted already approved', async () => {
      const res = await as(
        db,
        ALICE,
        `insert into public.driver_applications (user_id, license_number, vehicle_make, vehicle_model, vehicle_plate, status)
         values ('${ALICE}', 'L1', 'Honda', 'Civic', 'ABC123', 'approved')`
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/row-level security/i);
    });

    it('a pending application flips the profile to pending server-side', async () => {
      const res = await as(
        db,
        ALICE,
        `insert into public.driver_applications (user_id, license_number, vehicle_make, vehicle_model, vehicle_plate)
         values ('${ALICE}', 'L1', 'Honda', 'Civic', 'ABC123')`
      );
      expect(res.ok).toBe(true);
      const [row] = await admin(db, `select driver_verification_status, is_driver_verified from public.profiles where id = '${ALICE}'`);
      expect(row.driver_verification_status).toBe('pending');
      expect(row.is_driver_verified).toBe(false);
    });

    it('an unverified user still cannot post a ride', async () => {
      const res = await as(
        db,
        ALICE,
        `insert into public.rides (driver_id, origin_label, origin_lat, origin_lng, destination_label,
           destination_lat, destination_lng, distance_miles, departure_time, seats_total, seats_available, cost_per_person)
         values ('${ALICE}', 'A', 1, 1, 'B', 2, 2, 5, now() + interval '1 day', 3, 3, 1)`
      );
      expect(res.ok).toBe(false);
    });
  });

  describe('bookings', () => {
    it('a rider can request a spot (pending)', async () => {
      const res = await as(db, ALICE, `insert into public.bookings (ride_id, rider_id) values ('${RIDE}', '${ALICE}')`);
      expect(res.ok).toBe(true);
    });

    it('a rider cannot insert a booking as confirmed', async () => {
      const res = await as(
        db,
        CAROL,
        `insert into public.bookings (ride_id, rider_id, status) values ('${RIDE}', '${CAROL}', 'confirmed')`
      );
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/row-level security/i);
    });

    it('a rider cannot confirm their own booking', async () => {
      const res = await as(db, ALICE, `update public.bookings set status = 'confirmed' where rider_id = '${ALICE}'`);
      expect(res.ok).toBe(false);
      const [row] = await admin(db, `select status from public.bookings where rider_id = '${ALICE}'`);
      expect(row.status).toBe('pending');
    });

    it('a rider cannot change the seats or ride on their booking', async () => {
      const res = await as(db, ALICE, `update public.bookings set seats_booked = 4 where rider_id = '${ALICE}'`);
      expect(res.ok).toBe(false);
    });

    it('an unrelated user cannot touch the booking', async () => {
      const res = await as(db, CAROL, `update public.bookings set status = 'cancelled' where rider_id = '${ALICE}'`);
      expect(res.affected).toBe(0);
    });

    it("the ride's driver can confirm it", async () => {
      const res = await as(db, BOB, `update public.bookings set status = 'confirmed' where rider_id = '${ALICE}'`);
      expect(res.ok).toBe(true);
      expect(res.affected).toBe(1);
    });

    it('the rider can then cancel their own spot', async () => {
      const res = await as(db, ALICE, `update public.bookings set status = 'cancelled' where rider_id = '${ALICE}'`);
      expect(res.ok).toBe(true);
      expect(res.affected).toBe(1);
    });
  });

  describe('completing a ride unlocks ratings', () => {
    it('a rider can rate the driver only after the driver completes their booking', async () => {
      const book = await as(db, CAROL, `insert into public.bookings (ride_id, rider_id) values ('${RIDE}', '${CAROL}')`);
      expect(book.ok).toBe(true);
      const confirm = await as(db, BOB, `update public.bookings set status = 'confirmed' where rider_id = '${CAROL}'`);
      expect(confirm.ok).toBe(true);

      const rate = `insert into public.ratings (ride_id, rater_id, ratee_id, stars) values ('${RIDE}', '${CAROL}', '${BOB}', 5)`;
      expect((await as(db, CAROL, rate)).ok).toBe(false);

      const complete = await as(db, BOB, `update public.bookings set status = 'completed' where rider_id = '${CAROL}'`);
      expect(complete.ok).toBe(true);
      expect((await as(db, CAROL, rate)).ok).toBe(true);
    });
  });

  describe('ride requests are private to the rider who posted them', () => {
    it('only the owner can see a request', async () => {
      const insert = await as(
        db,
        ALICE,
        `insert into public.ride_requests (rider_id, origin_label, origin_lat, origin_lng, destination_label,
           destination_lat, destination_lng, requested_time)
         values ('${ALICE}', 'A', 40.5, -74.4, 'B', 40.7, -74.2, now() + interval '1 day')`
      );
      expect(insert.ok).toBe(true);

      const owner = await as(db, ALICE, `select id from public.ride_requests`);
      expect(owner.rows).toHaveLength(1);
      const driver = await as(db, BOB, `select id from public.ride_requests`);
      expect(driver.rows).toHaveLength(0);
      const other = await as(db, CAROL, `select id from public.ride_requests`);
      expect(other.rows).toHaveLength(0);
    });
  });

  describe('driver documents', () => {
    it('can upload to and replace files in their own folder only', async () => {
      const own = await as(db, ALICE, `insert into storage.objects (bucket_id, name) values ('driver-documents', '${ALICE}/insurance.jpg')`);
      expect(own.ok).toBe(true);
      const replace = await as(
        db,
        ALICE,
        `update storage.objects set name = '${ALICE}/insurance.jpg' where bucket_id = 'driver-documents' and name = '${ALICE}/insurance.jpg'`
      );
      expect(replace.affected).toBe(1);
      const other = await as(db, ALICE, `insert into storage.objects (bucket_id, name) values ('driver-documents', '${BOB}/license.jpg')`);
      expect(other.ok).toBe(false);
    });
  });
});
