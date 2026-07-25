# Verified forecast outcome resolution v1

Migration `008_forecast_outcome_resolution_v1.sql` adds the RLS-protected `forecast_resolvers` allowlist and immutable, one-row-per-event `forecast_outcomes`. Application roles have no direct table policies.

## Authorization and immutability

Only an authenticated `auth.uid()` present in the allowlist may resolve. The `resolve_forecast_event` security-definer RPC locks the event, then captures PostgreSQL `clock_timestamp()`. It derives resolver, time, source type and verified status server-side and atomically inserts the outcome and marks the event resolved. v1 has no update or delete RPC; late resolution after a window ends remains allowed.

Provision through trusted database administration only:

```sql
insert into public.forecast_resolvers(user_id, note)
values ('AUTH_USER_UUID', 'Primary forecast resolver')
on conflict (user_id) do nothing;
```

Replace `AUTH_USER_UUID` with a real `auth.users.id`. Never expose an admin or service-role key in frontend code.

## RPC contracts and public exposure

`get_forecast_resolution_workspace(input_event_id)` returns the complete event, ordered options, verified outcome, server timestamp, authorization/readiness flags, and a stable block reason. `resolve_forecast_event(...)` accepts only event, option, human-provided reference/note, and exact domain version. `get_forecast_workspace` preserves its v1 fields and adds a verified outcome only for a resolved event; it never exposes resolver identity or the allowlist.

## Deployment, smoke tests, and rollback

Apply prerequisites, migration 007, then migration 008. Provision a resolver afterward. Run `scripts/forecast-outcome-postgres-smoke.sql` in isolated PostgreSQL to cover RLS, denial, timing, validation, derived fields, atomic success, immutability, and safe public output. Also smoke-test both resolver and public screens with an authenticated allowlisted account.

Rollback before production use may drop the three RPC definitions and the two new tables, then restore migration 007's `get_forecast_workspace`. After outcomes exist, preserve/export them and use a reviewed forward migration instead. A migration committed to Git is not proof that it was deployed to live Supabase; migration 008 is not yet deployed.

## Non-goals

This version has no Brier Score, reputation, XP, rankings, leaderboards, consensus, participant counts, aggregates, AI/ML, scraping, automated source interpretation, or outcome editing/deletion.
