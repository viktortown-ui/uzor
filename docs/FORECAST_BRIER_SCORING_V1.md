# Forecast Brier scoring and personal result v1

## Contract

This stage scores the probability assigned to the **selected option** as one binary claim. The exact formula is `Brier = (p - o)^2`: `p` is the stored probability and `o` is `1` if that selected option is the verified outcome, otherwise `0`. This is binary selected-option scoring—not multiclass Brier scoring. Lower is better: `0` is perfect and `1` is the maximum possible error.

The score must not be transformed into an “accuracy percentage”. In particular, `1 - Brier` has no such meaning in this contract. One result does not establish forecasting skill. Reputation would require a series of resolved forecasts and is not implemented here.

## Stored record and identity

`public.forecast_scores` stores the event, forecast, verified outcome and owner identifiers; the probability snapshot; binary observation; generated Brier value; authoritative scoring time; `brier-binary-v1`; and `forecast-domain-v1`. Its deterministic identity is:

`forecast_id + ':' + outcome_id + ':brier-binary-v1'`

There is one immutable score per forecast and one per event/user. Composite foreign keys prove that forecast, event, user and outcome belong together. Deleting a user may cascade their personal data; score relationships cannot silently delete a verified outcome or resolved event.

## Authoritative and atomic flow

The browser sends none of the score inputs. `resolve_forecast_event` locks and validates the event, records the verified outcome, resolves the event, selects all stored forecasts, derives `o`, snapshots `p`, and inserts scores using the same server timestamp. These operations are one PostgreSQL transaction. A score write failure raises `forecast_score_write_failed`, rolling back both the outcome and event transition. The existing RPC response shape does not expose participant or score counts.

Migration 009 also deterministically backfills forecasts attached to existing resolved events with verified outcomes. It uses `outcome.resolved_at` as `scored_at`, inserts only genuinely missing forecasts, and fails on malformed or conflicting relationships rather than concealing them.

## Personal privacy and RPC

RLS is enabled and no direct table policies exist. `anon` and `authenticated` are explicitly denied direct select, insert, update, and delete privileges. The security-definer workspace RPC returns only the caller-owned score joined to the exact personal forecast and verified outcome. Its score object omits `user_id`; anonymous callers and authenticated callers without a forecast receive `null`. There is no arbitrary-user, public, aggregate, update, or delete score RPC.

The workspace score contains only `id`, `event_id`, `forecast_id`, `outcome_id`, `forecast_probability`, `observed_binary_outcome`, `brier_score`, `scored_at`, `scoring_version`, and `domain_version`. The frontend rejects inconsistent identity, relationships, observations, versions, timestamps, or formula values; it never invents a missing score.

## Deployment and verification

Deploy in this order:

1. migration 007;
2. migration 008;
3. `009_forecast_brier_scoring_v1.sql`;
4. application code.

Migration 008 must be deployed before migration 009. A migration committed to Git is not proof of live deployment. The independent PostgreSQL 16 smoke job starts fresh, creates a pre-009 verified fixture, applies 007–009, verifies backfill, RLS and grants, exercises future RPC resolution, exact `0.04`/`0.64` calculations and boundary zero, deterministic identity, uniqueness, timestamps, atomic rollback and retry after a forced score-write failure, JSON omission, and a real anonymous role with a cleared authentication claim.

Rollback is application-first: revert the UI/API reader, then replace RPCs with their migration-008 definitions if necessary. Preserve score data for investigation; dropping migration 009 objects is a separately reviewed destructive operation, not an automatic rollback. Never roll migration files back by editing 007 or 008.

## Non-goals

This version adds no reputation, XP, levels, badges, streaks, achievements, ranking, leaderboard, public or aggregate scores, consensus, percentiles, calibration history, forecasting profile, prizes, AI/ML, or score editing/deletion. The next stage is **Personal forecast history and calibration foundation v1**.
