# Forecast persistence and deadline locking v1

This document describes migration `007_forecast_persistence_deadline_v1.sql`. The migration is committed to Git; that fact alone **does not mean it has been deployed**.

## Schema and lifecycle

`forecast_events` stores the versioned event contract and exactly one timestamp or complete resolution window. `forecast_options` stores ordered event-owned choices. `user_forecasts` stores one current row per `(event_id, user_id)`, with a composite option foreign key, a probability in `0..1`, and at most 280 reasoning characters. The seeded `sandbox-demo-milk-price-2026-12-15` event and its catalogue/store/source are explicitly fictional.

Before closing, `submit_forecast` atomically inserts or updates the unique user/event row. An update changes the option, probability, reasoning, domain version and `updated_at`, while retaining the original `id` and `created_at`.

## RLS and RPC contracts

RLS is enabled on all three tables and no direct table policies are granted. Consequently clients cannot directly read, insert, update, or delete forecast records. `get_forecast_workspace(input_event_id text)` is executable by `anon` and `authenticated`; it returns the event/options, but returns a private forecast only for `auth.uid()`. `submit_forecast(input_event_id, input_option_id, input_probability, input_reasoning, input_domain_version)` is executable only by `authenticated`. Both are `security definer`, use a fixed search path, and unsafe default function execution is revoked. There are no aggregates or participant counts.

The read response includes server timestamp, authentication requirement, permission, lock state and reason. The write response includes the authoritative saved row, server timestamp, deadline, created/update indicator and lock state. Errors use stable machine codes.

## Server-clock rule

Only `clock_timestamp()` in PostgreSQL authorizes a write. The RPC accepts neither user ID nor client timestamps. `submit_forecast` first authenticates and acquires the event-row lock, and only then captures the timestamp used for `opens_at <= server_time < closes_at`; a lock wait therefore cannot leave the deadline check using stale time. Equality at `closes_at` is locked. Status is checked in addition to time. An old or modified browser therefore cannot override the deadline.

`get_forecast_workspace` is explicitly `VOLATILE`: it calls both `clock_timestamp()` and `auth.uid()`, so declaring it `STABLE` would misrepresent its time- and request-dependent result. The atomic upsert derives its created/update flag from the row version returned by the upsert itself rather than from a race-prone preliminary existence query.

## Demo and production

Unconfigured/demo mode retains the fixed-clock, explicitly non-persistent interaction and makes no Supabase call. Configured production mode loads the sandbox workspace, restores the authenticated user's row, and saves only through the RPC. Anonymous visitors can see the fictional event and are directed to `/join`. Forecast data is never written to localStorage, sessionStorage, IndexedDB, service-worker caches, or URLs.

## Deployment and smoke test

1. Deploy the existing prerequisite migrations in order, then `007_forecast_persistence_deadline_v1.sql`.
2. Configure the existing publishable Supabase client and production mode; never add a service-role key to the frontend.
3. Logged out, open `/forecast`, verify the event and `/join` action and verify saving is unavailable.
4. Log in, save 50%, reload and verify the same ID, creation time and values return.
5. Update the forecast before closing and verify ID/creation time remain stable while `updated_at` changes.
6. In a safe test database, set the deadline to the server present/past; verify both insert and update return `forecast_deadline_passed` and the row remains unchanged.

## Rollback

Roll back frontend use first. Then revoke/drop the two functions, and only after retaining/exporting any required user data drop `user_forecasts`, `forecast_options`, and `forecast_events` in that order. Do not alter Delta tables or RPCs.

## Non-goals

This version adds no outcome resolution, Brier Score UI, scoring, reputation, XP, ranking, leaderboard, public consensus, public participant count, aggregate, AI, or ML. The next intended stage is **Verified forecast outcome resolution v1**.
