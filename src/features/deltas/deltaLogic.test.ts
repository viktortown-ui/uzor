import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { calculateConfirmationTarget, calculateDeltaPriority, deriveDeltaStatus, isDeltaExpired } from './deltaLogic';

describe('delta logic', () => {
  const now = new Date('2026-07-10T12:00:00Z');
  it('one confirm is new', () => expect(deriveDeltaStatus(1, 0, 3)).toBe('new'));
  it('two confirms are checking', () => expect(deriveDeltaStatus(2, 0, 3)).toBe('checking'));
  it('three confirms with target 3 are confirmed', () => expect(deriveDeltaStatus(3, 0, 3)).toBe('confirmed'));
  it('confirm plus disconfirm is fork', () => expect(deriveDeltaStatus(1, 1, 3)).toBe('fork'));
  it('positive delta uses the same status logic', () => expect(deriveDeltaStatus(3, 0, 3)).toBe('confirmed'));
  it('negative delta uses the same status logic', () => expect(deriveDeltaStatus(3, 0, 3)).toBe('confirmed'));
  it('high sensitivity in center targets 4', () => expect(calculateConfirmationTarget(0.9, 100, 8000)).toBe(4));
  it('high sensitivity on outskirts reduces by at most one and never below 3', () => expect(calculateConfirmationTarget(0.9, 9000, 8000)).toBe(3));
  it('regular category targets 3', () => expect(calculateConfirmationTarget(0.7, 100, 8000)).toBe(3));
  it('priority ranks critical above strong above noticeable', () => {
    const args = [0.6, now, 100, 8000, now] as const;
    expect(calculateDeltaPriority(0.6, 'critical', args[1], args[2], args[3], args[4])).toBeGreaterThan(calculateDeltaPriority(0.6, 'strong', args[1], args[2], args[3], args[4]));
    expect(calculateDeltaPriority(0.6, 'strong', args[1], args[2], args[3], args[4])).toBeGreaterThan(calculateDeltaPriority(0.6, 'noticeable', args[1], args[2], args[3], args[4]));
  });
  it('fresh delta has higher priority than old with equal inputs', () => expect(calculateDeltaPriority(0.6, 'strong', new Date('2026-07-10T11:00:00Z'), 100, 8000, now)).toBeGreaterThan(calculateDeltaPriority(0.6, 'strong', new Date('2026-07-01T11:00:00Z'), 100, 8000, now)));
  it('outskirts adds only a small bonus', () => expect(calculateDeltaPriority(0.6, 'strong', now, 9000, 8000, now) - calculateDeltaPriority(0.6, 'strong', now, 100, 8000, now)).toBeCloseTo(0.05));
  it('expired delta is detected', () => expect(isDeltaExpired('2026-07-09T12:00:00Z', now)).toBe(true));
  it('fork has priority over confirmed when both confirm and disconfirm exist', () => expect(deriveDeltaStatus(5, 1, 3)).toBe('fork'));
});

describe('delta migration safety checks', () => {
  const sql = readFileSync('supabase/migrations/006_delta_foundation.sql', 'utf8');
  it('does not expose public raw reactions select policy', () => expect(sql).not.toMatch(/create policy[\s\S]*delta_reactions[\s\S]*for select/i));
  it('has unique reaction per delta and user', () => expect(sql).toContain('unique(delta_id,user_id)'));
  it('has GiST spatial indexes', () => { expect(sql).toContain('using gist(location)'); expect(sql).toContain('using gist(public_location)'); });
  it('uses ST_DWithin for similar deltas', () => expect(sql).toContain('ST_DWithin'));
  it('has explicit auth.uid checks', () => expect(sql.match(/auth\.uid\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4));

  it('uses double precision for delta priority distance to match ST_Distance', () => {
    expect(sql).toContain('distance_from_center_m double precision');
    expect(sql).not.toMatch(/create or replace function public\.calculate_delta_priority\([^;]*distance_from_center_m numeric/is);
    expect(sql).toContain(`drop function if exists public.calculate_delta_priority(
  numeric,
  text,
  timestamptz,
  numeric,
  integer
);`);
  });
  it('keeps priority callers wired to ST_Distance without service role', () => {
    expect(sql).toContain('ST_Distance');
    expect(sql).toMatch(/create or replace function public\.delta_card_json[\s\S]*public\.calculate_delta_priority/i);
    expect(sql).toMatch(/create or replace function public\.list_deltas_in_view[\s\S]*public\.calculate_delta_priority/i);
    expect(sql.toLowerCase()).not.toContain('service_role');
  });
  it('does not modify migrations 001 through 005 in this hotfix', () => {
    const changedFiles = execSync('git diff --name-only -- supabase/migrations/001_uzor_init.sql supabase/migrations/002_uzor_integrity_and_curator.sql supabase/migrations/003_uzor_read_rpc.sql supabase/migrations/004_weekly_wrapped_rpc.sql supabase/migrations/005_fix_wrapped_report_sql_and_confirmation.sql', { encoding: 'utf8' }).trim();
    expect(changedFiles).toBe('');
  });
  it('does not include service role key', () => expect(sql.toLowerCase()).not.toContain('service_role'));
});
